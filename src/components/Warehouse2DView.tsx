import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  PanResponder,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAreaContext } from '../areas/AreaContext';
import { useThemeContext } from '../theme/ThemeContext';
import { AddGradeNivelButton } from './AddGradeNivelButton';
import { AddFileiraButton } from './AddFileiraButton';
import { ActionIconButton } from './IconActionButton';
import AppEmptyState from './AppEmptyState';
import AppLoadingState from './AppLoadingState';
import { API } from '../axios';
import { AuthProvider } from '../auth/AuthContext';
import { API_STATE_MESSAGES } from '../constants/apiStateMessages';
import { getUserFacingErrorMessage } from '../utils/userFacingError';
import { useWarehouseSearch } from '../search/WarehouseSearchContext';
import { listProducts } from '../services/productApi';
import {
  buildStockItemUpsertPayload,
  createEmptyLevelInGrade,
  createLevelWithProductInGrade,
} from '../services/warehouseLevelApi';
import { Product as CatalogProduct } from '../types/Product';
import AddGradeLevelDecisionModal from './warehouse2d/modals/AddGradeLevelDecisionModal';
import AreaDropdownSelector from './warehouse2d/AreaDropdownSelector';
import ConfirmActionModal from './warehouse2d/modals/ConfirmActionModal';
import FeedbackModal from './warehouse2d/modals/FeedbackModal';
import RemoveLevelDecisionModal from './warehouse2d/modals/RemoveLevelDecisionModal';
import SearchResultsModal from './warehouse2d/modals/SearchResultsModal';
import SelectGradeProductModal from './warehouse2d/modals/SelectGradeProductModal';
import WarehouseItemDetailsModal from './warehouse2d/modals/WarehouseItemDetailsModal';
import WarehouseItemFormModal from './warehouse2d/modals/WarehouseItemFormModal';
import { useResponsiveViewport } from '../hooks/useResponsiveViewport';

interface Produto {
  id: number;
  codigoSistemaWester: string;
  cor: string;
  descricao: string;
  nomeModelo: string;
}

interface Nivel {
  id: number;
  identificador: string;
  ordem?: number;

  itemEstoqueId?: number | null;
  quantidade?: number;

  produtoNomeModelo?: string;
  produto?: Produto | null;
}

interface Grade {
  id: number;
  identificador: string;
  niveis: Nivel[];
  ordem?: number;
}

interface Fileira {
  id: number;
  identificador: string;
  grades: Grade[];
}

interface EstoquePosicao {
  areaId: number;

  fileiraId: number;
  fileiraIdentificador: string;

  gradeId: number;
  gradeIdentificador: string;
  gradeOrdem?: number;

  nivelId: number;
  nivelIdentificador: string;
  nivelOrdem?: number;

  itemEstoqueId?: number | null;
  quantidade: number;

  produtoId?: number | null;
  codigoSistemaWester?: string | null;
  nomeModelo?: string | null;
  cor?: string | null;
  descricao?: string | null;

  produto?: Produto | null;
}

interface ItemEstoque {
  id: number;
  nivelId: number;
  nivelIdentificador?: string | null;
  nivelCompletoIdentificador?: string | null;

  produtoId?: number | null;
  produtoCodigoWester?: string | null;
  produtoNomeModelo?: string | null;
  produtoCor?: string | null;
  produtoDescricao?: string | null;

  quantidade: number;
  dataAtualizacao?: string | null;
}

type CreatedGrade = { id: number; identificador: string; ordem?: number };

const IS_WEB = Platform.OS === 'web';
const MIN_WAREHOUSE_SCALE = 0.65;
const MAX_WAREHOUSE_SCALE = 2;
const WAREHOUSE_ZOOM_STEP = 0.15;
const MOBILE_WAREHOUSE_PADDING = 12;
const MOBILE_WAREHOUSE_BOTTOM_PADDING = 16;
const MOBILE_ZOOM_BUTTON_SIZE = 46;
const MOBILE_PAN_THRESHOLD = 4;

type PendingStructureCreationCtx = {
  kind: 'level' | 'grade';
  fileiraId: number;
  fileiraIdentificador: string;
  gradeId?: number;
  gradeIdentificador: string;
  gradeOrdem?: number;
  label: string;
  nextNivelIdentificador: string;
  nextNivelOrdem: number;
};

type SearchResult = {
  nivelId: number;
  gradeId: number;
  fileiraId: number;
  fileiraIdentificador: string;
  gradeIdentificador: string;
  nivelIdentificador: string;

  nomeModelo: string;
  codigo: string;
  cor: string;
  descricao: string;
  quantidade: number;

  label: string;
};

type NivelSelectionCtx = {
  fileiraId: number;
  gradeId: number;
  nivelId: number;
  label: string;
  nivel: Nivel;
};

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTouchDistance(touches: readonly any[]) {
  if (!touches || touches.length < 2) {
    return 0;
  }

  const [firstTouch, secondTouch] = touches;
  const deltaX = Number(secondTouch?.pageX ?? 0) - Number(firstTouch?.pageX ?? 0);
  const deltaY = Number(secondTouch?.pageY ?? 0) - Number(firstTouch?.pageY ?? 0);

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function computeDefaultWarehouseScale(
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number
) {
  if (viewportWidth <= 0 || viewportHeight <= 0 || contentWidth <= 0 || contentHeight <= 0) {
    return 1;
  }

  const safeViewportWidth = Math.max(viewportWidth - MOBILE_WAREHOUSE_PADDING * 2, 1);
  const safeViewportHeight = Math.max(viewportHeight - MOBILE_WAREHOUSE_BOTTOM_PADDING * 3, 1);
  const fitScale = Math.min(safeViewportWidth / contentWidth, safeViewportHeight / contentHeight, 1);

  return clampValue(fitScale, MIN_WAREHOUSE_SCALE, 1);
}

export default function Warehouse2DView() {
  const safeAreaInsets = useSafeAreaInsets();
  const {
    width: screenWidth,
    height: screenHeight,
    isMobileViewport,
  } = useResponsiveViewport();
  const [fileiras, setFileiras] = useState<Fileira[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [creatingFileira, setCreatingFileira] = useState(false);
  const [selectedMobileFileiraId, setSelectedMobileFileiraId] = useState<number | null>(null);
  const [expandedGrades, setExpandedGrades] = useState<number[]>([]);
  const [expandedFileiras, setExpandedFileiras] = useState<number[]>([]);
  const [hoverFileira, setHoverFileira] = useState<Record<number, boolean>>({});
  const [hoverGrade, setHoverGrade] = useState<Record<number, boolean>>({});
  const [hoverNivel, setHoverNivel] = useState<Record<number, boolean>>({});
  const [activeGradeId, setActiveGradeId] = useState<number | null>(null);

  const [removingGradeId, setRemovingGradeId] = useState<number | null>(null);
  const [resequenceNivelId, setResequenceNivelId] = useState<number | null>(null);

  const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);
  const [pendingRemoveNivel, setPendingRemoveNivel] = useState<NivelSelectionCtx | null>(null);
  const [pendingRemoveDecision, setPendingRemoveDecision] = useState<
    'item-only' | 'item-and-level' | null
  >(null);

  const [productModalVisible, setProductModalVisible] = useState(false);
  const [productEditModalVisible, setProductEditModalVisible] = useState(false);
  const [editProductPickerVisible, setEditProductPickerVisible] = useState(false);
  const [selectedNivelCtx, setSelectedNivelCtx] = useState<NivelSelectionCtx | null>(null);
  const [productModalOrigin, setProductModalOrigin] = useState<'details' | 'direct' | null>(null);
  const [editProductPickerReturnMode, setEditProductPickerReturnMode] = useState<
    'form' | 'close' | null
  >(null);

  const [itemLoading, setItemLoading] = useState(false);
  const [itemEstoque, setItemEstoque] = useState<ItemEstoque | null>(null);

  const [editQuantidade, setEditQuantidade] = useState<number>(1);
  const [editProductId, setEditProductId] = useState<number | null>(null);
  const [pendingEditProductId, setPendingEditProductId] = useState<number | null>(null);
  const [editCodigo, setEditCodigo] = useState<string>('');
  const [editCor, setEditCor] = useState<string>('');
  const [editNomeModelo, setEditNomeModelo] = useState<string>('');
  const [editDescricao, setEditDescricao] = useState<string>('');

  const [confirmSaveVisible, setConfirmSaveVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pendingStructureCtx, setPendingStructureCtx] =
    useState<PendingStructureCreationCtx | null>(null);
  const [addLevelDecisionVisible, setAddLevelDecisionVisible] = useState(false);
  const [selectGradeProductVisible, setSelectGradeProductVisible] = useState(false);
  const [structureCreationLoading, setStructureCreationLoading] = useState(false);
  const [activeProductsLoading, setActiveProductsLoading] = useState(false);
  const [activeProducts, setActiveProducts] = useState<CatalogProduct[]>([]);
  const [productFilter, setProductFilter] = useState('');
  const [editProductFilter, setEditProductFilter] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productQuantityInput, setProductQuantityInput] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // ? SEARCH (HEADER)
  const { searchText, setSearchText } = useWarehouseSearch();
  const [searchOpen, setSearchOpen] = useState(false);
  //const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [searchResultsVisible, setSearchResultsVisible] = useState(false);
  const [focusedNivelId, setFocusedNivelId] = useState<number | null>(null);
  const shouldUseMobileWarehouseLayout = isMobileViewport;
  const shouldUseWideNativeWarehouseLayout = !IS_WEB && !shouldUseMobileWarehouseLayout;
  const shouldUseWideWebWarehouseLayout = IS_WEB && !shouldUseMobileWarehouseLayout;
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const searchInputRef = useRef<TextInput | null>(null);
  const [warehouseZoomScale, setWarehouseZoomScale] = useState(1);
  const [warehousePanX, setWarehousePanX] = useState(0);
  const [warehousePanY, setWarehousePanY] = useState(0);
  const [warehouseViewportSize, setWarehouseViewportSize] = useState({ width: 0, height: 0 });
  const [warehouseContentSize, setWarehouseContentSize] = useState({ width: 0, height: 0 });
  const [warehouseZoomInitialized, setWarehouseZoomInitialized] = useState(false);
  const warehouseZoomScaleRef = useRef(1);
  const warehousePanRef = useRef({ x: 0, y: 0 });
  const warehouseGestureRef = useRef({
    mode: 'idle' as 'idle' | 'pan' | 'pinch',
    startScale: 1,
    startPanX: 0,
    startPanY: 0,
    startDistance: 0,
    baseDx: 0,
    baseDy: 0,
  });

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setSuccessVisible(true);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorVisible(true);
  };

  const extractErrorMessage = (error: any, fallback: string) => {
    return getUserFacingErrorMessage(error, fallback);
  };

  const normalizeErrorText = (value: any) =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const isItemEstoqueNotFoundError = (error: any) => {
    const status = error?.response?.status;
    const message = extractErrorMessage(error, '');
    const normalized = normalizeErrorText(message);

    if (status === 404) {
      return true;
    }

    if (status === 400) {
      return (
        normalized.includes('itemestoque nao encontrado') ||
        normalized.includes('item estoque nao encontrado')
      );
    }

    return (
      normalized.includes('itemestoque nao encontrado') ||
      normalized.includes('item estoque nao encontrado')
    );
  };

  const { theme } = useThemeContext();
  const { areas, selectedAreaId, isLoading: areaLoading, selectAreaById } = useAreaContext();
  const colors = theme.colors;
  const successColor = '#2E7D32';
  const errorColor = '#C62828';

  const baseGradeWidth = IS_WEB ? 140 : 160;
  const perNivelWidth = IS_WEB ? 116 : 136;
  const currentAreaId = useMemo(
    () => selectedAreaId ?? areas.find((area) => area.active !== false)?.id ?? null,
    [areas, selectedAreaId]
  );
  const selectedMobileFileira = useMemo(() => {
    if (fileiras.length === 0) {
      return null;
    }

    return fileiras.find((fileira) => fileira.id === selectedMobileFileiraId) ?? fileiras[0];
  }, [fileiras, selectedMobileFileiraId]);
  const defaultWarehouseScale = useMemo(
    () =>
      computeDefaultWarehouseScale(
        warehouseViewportSize.width,
        warehouseViewportSize.height,
        warehouseContentSize.width,
        warehouseContentSize.height
      ),
    [warehouseContentSize.height, warehouseContentSize.width, warehouseViewportSize.height, warehouseViewportSize.width]
  );

  const clampWarehouseTransform = useCallback(
    (nextScale: number, nextPanX: number, nextPanY: number) => {
      const scale = clampValue(nextScale, MIN_WAREHOUSE_SCALE, MAX_WAREHOUSE_SCALE);

      if (
        warehouseViewportSize.width <= 0 ||
        warehouseViewportSize.height <= 0 ||
        warehouseContentSize.width <= 0 ||
        warehouseContentSize.height <= 0
      ) {
        return { scale, panX: 0, panY: 0 };
      }

      const scaledWidth = warehouseContentSize.width * scale;
      const scaledHeight = warehouseContentSize.height * scale;
      const maxPanX = Math.max(0, (scaledWidth - warehouseViewportSize.width) / 2);
      const maxPanY = Math.max(0, (scaledHeight - warehouseViewportSize.height) / 2);

      return {
        scale,
        panX: maxPanX > 0 ? clampValue(nextPanX, -maxPanX, maxPanX) : 0,
        panY: maxPanY > 0 ? clampValue(nextPanY, -maxPanY, maxPanY) : 0,
      };
    },
    [
      warehouseContentSize.height,
      warehouseContentSize.width,
      warehouseViewportSize.height,
      warehouseViewportSize.width,
    ]
  );

  const applyWarehouseTransform = useCallback(
    (nextScale: number, nextPanX: number, nextPanY: number) => {
      const nextTransform = clampWarehouseTransform(nextScale, nextPanX, nextPanY);

      warehouseZoomScaleRef.current = nextTransform.scale;
      warehousePanRef.current = { x: nextTransform.panX, y: nextTransform.panY };

      setWarehouseZoomScale((current) =>
        Math.abs(current - nextTransform.scale) > 0.001 ? nextTransform.scale : current
      );
      setWarehousePanX((current) =>
        Math.abs(current - nextTransform.panX) > 0.5 ? nextTransform.panX : current
      );
      setWarehousePanY((current) =>
        Math.abs(current - nextTransform.panY) > 0.5 ? nextTransform.panY : current
      );

      return nextTransform;
    },
    [clampWarehouseTransform]
  );

  const canPanWarehouseAtScale = useCallback(
    (scale: number) => {
      if (
        warehouseViewportSize.width <= 0 ||
        warehouseViewportSize.height <= 0 ||
        warehouseContentSize.width <= 0 ||
        warehouseContentSize.height <= 0
      ) {
        return false;
      }

      return (
        warehouseContentSize.width * scale > warehouseViewportSize.width + 1 ||
        warehouseContentSize.height * scale > warehouseViewportSize.height + 1
      );
    },
    [
      warehouseContentSize.height,
      warehouseContentSize.width,
      warehouseViewportSize.height,
      warehouseViewportSize.width,
    ]
  );

  const resetWarehouseViewport = useCallback(() => {
    applyWarehouseTransform(defaultWarehouseScale, 0, 0);
  }, [applyWarehouseTransform, defaultWarehouseScale]);

  const handleWarehouseZoomIn = useCallback(() => {
    applyWarehouseTransform(
      warehouseZoomScaleRef.current + WAREHOUSE_ZOOM_STEP,
      warehousePanRef.current.x,
      warehousePanRef.current.y
    );
  }, [applyWarehouseTransform]);

  const handleWarehouseZoomOut = useCallback(() => {
    applyWarehouseTransform(
      warehouseZoomScaleRef.current - WAREHOUSE_ZOOM_STEP,
      warehousePanRef.current.x,
      warehousePanRef.current.y
    );
  }, [applyWarehouseTransform]);

  const warehousePanResponder = useMemo(() => {
    if (!shouldUseWideNativeWarehouseLayout) {
      return null;
    }

    return PanResponder.create({
      onStartShouldSetPanResponder: (event) => event.nativeEvent.touches.length >= 2,
      onStartShouldSetPanResponderCapture: (event) => event.nativeEvent.touches.length >= 2,
      onMoveShouldSetPanResponder: (event, gestureState) => {
        if (event.nativeEvent.touches.length >= 2) {
          return true;
        }

        return (
          canPanWarehouseAtScale(warehouseZoomScaleRef.current) &&
          (Math.abs(gestureState.dx) > MOBILE_PAN_THRESHOLD ||
            Math.abs(gestureState.dy) > MOBILE_PAN_THRESHOLD)
        );
      },
      onMoveShouldSetPanResponderCapture: (event, gestureState) => {
        if (event.nativeEvent.touches.length >= 2) {
          return true;
        }

        return (
          canPanWarehouseAtScale(warehouseZoomScaleRef.current) &&
          (Math.abs(gestureState.dx) > MOBILE_PAN_THRESHOLD ||
            Math.abs(gestureState.dy) > MOBILE_PAN_THRESHOLD)
        );
      },
      onPanResponderGrant: (event) => {
        const touches = event.nativeEvent.touches;

        warehouseGestureRef.current.startScale = warehouseZoomScaleRef.current;
        warehouseGestureRef.current.startPanX = warehousePanRef.current.x;
        warehouseGestureRef.current.startPanY = warehousePanRef.current.y;
        warehouseGestureRef.current.baseDx = 0;
        warehouseGestureRef.current.baseDy = 0;

        if (touches.length >= 2) {
          warehouseGestureRef.current.mode = 'pinch';
          warehouseGestureRef.current.startDistance = getTouchDistance(touches);
          return;
        }

        warehouseGestureRef.current.mode = 'pan';
        warehouseGestureRef.current.startDistance = 0;
      },
      onPanResponderMove: (event, gestureState) => {
        const touches = event.nativeEvent.touches;

        if (touches.length >= 2) {
          const distance = getTouchDistance(touches);
          if (distance <= 0) {
            return;
          }

          if (warehouseGestureRef.current.mode !== 'pinch') {
            warehouseGestureRef.current.mode = 'pinch';
            warehouseGestureRef.current.startScale = warehouseZoomScaleRef.current;
            warehouseGestureRef.current.startDistance = distance;
          }

          if (warehouseGestureRef.current.startDistance <= 0) {
            warehouseGestureRef.current.startDistance = distance;
          }

          const nextScale =
            warehouseGestureRef.current.startScale *
            (distance / warehouseGestureRef.current.startDistance);

          applyWarehouseTransform(
            nextScale,
            warehousePanRef.current.x,
            warehousePanRef.current.y
          );
          return;
        }

        if (!canPanWarehouseAtScale(warehouseZoomScaleRef.current)) {
          return;
        }

        if (warehouseGestureRef.current.mode !== 'pan') {
          warehouseGestureRef.current.mode = 'pan';
          warehouseGestureRef.current.startPanX = warehousePanRef.current.x;
          warehouseGestureRef.current.startPanY = warehousePanRef.current.y;
          warehouseGestureRef.current.baseDx = gestureState.dx;
          warehouseGestureRef.current.baseDy = gestureState.dy;
        }

        applyWarehouseTransform(
          warehouseZoomScaleRef.current,
          warehouseGestureRef.current.startPanX +
            (gestureState.dx - warehouseGestureRef.current.baseDx),
          warehouseGestureRef.current.startPanY +
            (gestureState.dy - warehouseGestureRef.current.baseDy)
        );
      },
      onPanResponderRelease: () => {
        warehouseGestureRef.current.mode = 'idle';
      },
      onPanResponderTerminate: () => {
        warehouseGestureRef.current.mode = 'idle';
      },
      onPanResponderTerminationRequest: () => false,
    });
  }, [applyWarehouseTransform, canPanWarehouseAtScale, shouldUseWideNativeWarehouseLayout]);

  useEffect(() => {
    warehouseZoomScaleRef.current = warehouseZoomScale;
  }, [warehouseZoomScale]);

  useEffect(() => {
    warehousePanRef.current = { x: warehousePanX, y: warehousePanY };
  }, [warehousePanX, warehousePanY]);

  useEffect(() => {
    setWarehouseZoomInitialized(false);
  }, [currentAreaId, screenHeight, screenWidth, shouldUseWideNativeWarehouseLayout]);

  useEffect(() => {
    if (
      !shouldUseWideNativeWarehouseLayout ||
      warehouseZoomInitialized ||
      warehouseViewportSize.width <= 0 ||
      warehouseViewportSize.height <= 0 ||
      warehouseContentSize.width <= 0 ||
      warehouseContentSize.height <= 0
    ) {
      return;
    }

    resetWarehouseViewport();
    setWarehouseZoomInitialized(true);
  }, [
    resetWarehouseViewport,
    warehouseContentSize.height,
    warehouseContentSize.width,
    warehouseViewportSize.height,
    warehouseViewportSize.width,
    shouldUseWideNativeWarehouseLayout,
    warehouseZoomInitialized,
  ]);

  useEffect(() => {
    if (
      !shouldUseWideNativeWarehouseLayout ||
      !warehouseZoomInitialized ||
      warehouseViewportSize.width <= 0 ||
      warehouseViewportSize.height <= 0 ||
      warehouseContentSize.width <= 0 ||
      warehouseContentSize.height <= 0
    ) {
      return;
    }

    applyWarehouseTransform(
      warehouseZoomScaleRef.current,
      warehousePanRef.current.x,
      warehousePanRef.current.y
    );
  }, [
    applyWarehouseTransform,
    warehouseContentSize.height,
    warehouseContentSize.width,
    warehouseViewportSize.height,
    warehouseViewportSize.width,
    shouldUseWideNativeWarehouseLayout,
    warehouseZoomInitialized,
  ]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const safeLayoutAnimation = () => {
    if (!IS_WEB) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  };

  const parseNivelOrder = (nivel: Nivel) => {
    if (typeof nivel.ordem === 'number') {
      return nivel.ordem;
    }
    const num = parseInt(nivel.identificador.replace(/\D/g, ''), 10);
    return Number.isNaN(num) ? 0 : num;
  };

  const parseGradeOrder = (grade: Grade) => {
    if (typeof grade.ordem === 'number') {
      return grade.ordem;
    }
    const num = parseInt(grade.identificador.replace(/\D/g, ''), 10);
    return Number.isNaN(num) ? 0 : num;
  };

  const computeNextNivelForGrade = (grade: Grade) => {
    const numericIds = grade.niveis
      .map((n) => parseInt(n.identificador.replace(/\D/g, ''), 10))
      .filter((n) => !Number.isNaN(n));

    const maxExisting = numericIds.length > 0 ? Math.max(...numericIds) : 0;
    const nextNumber = maxExisting + 1;

    return { identificador: `N${nextNumber}`, ordem: nextNumber };
  };

  const getNivelProductDisplay = (nivel: Nivel) => {
    const nomeModelo = String(nivel.produto?.nomeModelo ?? nivel.produtoNomeModelo ?? '').trim();

    if (nomeModelo !== '') {
      return {
        text: nomeModelo,
        empty: false,
      };
    }

    return {
      text: 'Adicionar Produto',
      empty: true,
    };
  };

  const getGradeDisplayIdentificador = (identificador: string) => {
    const normalized = String(identificador ?? '').trim();
    const letters = normalized.match(/[A-Za-z]+/g)?.join('').toUpperCase() ?? '';
    return letters !== '' ? letters : normalized;
  };

  const formatGradeLabel = (identificador: string) =>
    `Grade ${getGradeDisplayIdentificador(identificador)}`;

  const normalizeWarehouseRow = (rawRow: any, areaId: number): EstoquePosicao => {
    const produtoBruto = rawRow?.produto ?? null;
    const produtoIdBruto = rawRow?.produtoId;
    const produtoId =
      typeof produtoIdBruto === 'number'
        ? produtoIdBruto
        : Number.isFinite(Number(produtoIdBruto))
          ? Number(produtoIdBruto)
          : null;
    const nomeModelo = rawRow?.nomeModelo ?? produtoBruto?.nomeModelo ?? null;
    const codigoSistemaWester =
      rawRow?.codigoSistemaWester ?? produtoBruto?.codigoSistemaWester ?? null;
    const cor = rawRow?.cor ?? produtoBruto?.cor ?? null;
    const descricao = rawRow?.descricao ?? produtoBruto?.descricao ?? null;
    const hasProdutoData =
      produtoId != null ||
      [nomeModelo, codigoSistemaWester, cor, descricao].some(
        (value) => String(value ?? '').trim() !== ''
      );

    const produto: Produto | null = hasProdutoData
      ? {
          id: produtoId ?? 0,
          codigoSistemaWester: String(codigoSistemaWester ?? ''),
          nomeModelo: String(nomeModelo ?? ''),
          cor: String(cor ?? ''),
          descricao: String(descricao ?? ''),
        }
      : null;

    return {
      areaId,
      fileiraId: Number(rawRow?.fileiraId ?? 0),
      fileiraIdentificador: String(rawRow?.fileiraIdentificador ?? ''),
      gradeId: Number(rawRow?.gradeId ?? 0),
      gradeIdentificador: String(rawRow?.gradeIdentificador ?? ''),
      gradeOrdem:
        typeof rawRow?.gradeOrdem === 'number'
          ? rawRow.gradeOrdem
          : Number.isFinite(Number(rawRow?.gradeOrdem))
            ? Number(rawRow.gradeOrdem)
            : undefined,
      nivelId: Number(rawRow?.nivelId ?? 0),
      nivelIdentificador: String(rawRow?.nivelIdentificador ?? ''),
      nivelOrdem:
        typeof rawRow?.nivelOrdem === 'number'
          ? rawRow.nivelOrdem
          : Number.isFinite(Number(rawRow?.nivelOrdem))
            ? Number(rawRow.nivelOrdem)
            : undefined,
      itemEstoqueId:
        typeof rawRow?.itemEstoqueId === 'number'
          ? rawRow.itemEstoqueId
          : Number.isFinite(Number(rawRow?.itemEstoqueId))
            ? Number(rawRow.itemEstoqueId)
            : (rawRow?.itemEstoqueId ?? null),
      quantidade:
        typeof rawRow?.quantidade === 'number'
          ? rawRow.quantidade
          : Number.isFinite(Number(rawRow?.quantidade))
            ? Number(rawRow.quantidade)
            : 0,
      produtoId,
      codigoSistemaWester,
      nomeModelo,
      cor,
      descricao,
      produto,
    };
  };

  const normalizeWarehouseRows = (raw: any, areaId: number): EstoquePosicao[] => {
    if (Array.isArray(raw)) {
      return raw.map((row) => normalizeWarehouseRow(row, areaId));
    }

    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.fileiras)) {
      return [];
    }

    const rows: EstoquePosicao[] = [];

    raw.fileiras.forEach((fileira: any) => {
      const fileiraId = Number(fileira?.id ?? 0);
      const fileiraIdentificador = String(fileira?.identificador ?? '');

      const grades = Array.isArray(fileira?.grades) ? fileira.grades : [];
      grades.forEach((grade: any) => {
        const gradeId = Number(grade?.id ?? 0);
        const gradeIdentificador = String(grade?.identificador ?? '');
        const gradeOrdem = typeof grade?.ordem === 'number' ? grade.ordem : undefined;
        const niveis = Array.isArray(grade?.niveis) ? grade.niveis : [];

        niveis.forEach((nivel: any) => {
          rows.push(
            normalizeWarehouseRow(
              {
                fileiraId,
                fileiraIdentificador,
                gradeId,
                gradeIdentificador,
                gradeOrdem,
                nivelId: nivel?.id,
                nivelIdentificador: nivel?.identificador,
                nivelOrdem: nivel?.ordem,
                itemEstoqueId: nivel?.itemEstoqueId,
                quantidade: nivel?.quantidade,
                produtoId: nivel?.produto?.id,
                codigoSistemaWester: nivel?.produto?.codigoSistemaWester,
                nomeModelo: nivel?.produto?.nomeModelo ?? nivel?.produtoNomeModelo,
                cor: nivel?.produto?.cor,
                descricao: nivel?.produto?.descricao,
                produto: nivel?.produto ?? null,
              },
              areaId
            )
          );
        });
      });
    });

    return rows;
  };

  const buildWarehouseStructure = (rows: EstoquePosicao[]): Fileira[] => {
    const fileiraMap = new Map<number, Fileira & { gradesMap: Map<number, Grade> }>();

    rows.forEach((row) => {
      if (!fileiraMap.has(row.fileiraId)) {
        fileiraMap.set(row.fileiraId, {
          id: row.fileiraId,
          identificador: row.fileiraIdentificador,
          grades: [],
          gradesMap: new Map<number, Grade>(),
        });
      }

      const fileira = fileiraMap.get(row.fileiraId)!;

      if (row.gradeId == null) {
        return;
      }

      if (!fileira.gradesMap.has(row.gradeId)) {
        const grade: Grade = {
          id: row.gradeId,
          identificador: row.gradeIdentificador ?? '',
          ordem: row.gradeOrdem,
          niveis: [],
        };
        fileira.gradesMap.set(row.gradeId, grade);
        fileira.grades.push(grade);
      }

      if (row.nivelId == null) {
        return;
      }

      const grade = fileira.gradesMap.get(row.gradeId)!;
      const produtoNormalizado = row.produto;
      const produtoNomeModeloNormalizado =
        String(row.nomeModelo ?? produtoNormalizado?.nomeModelo ?? '').trim() !== ''
          ? String(row.nomeModelo ?? produtoNormalizado?.nomeModelo ?? '')
          : undefined;

      grade.niveis.push({
        id: row.nivelId,
        identificador: row.nivelIdentificador,
        ordem: row.nivelOrdem,
        itemEstoqueId: row.itemEstoqueId ?? null,
        quantidade: typeof row.quantidade === 'number' ? row.quantidade : 0,
        produto: produtoNormalizado,
        produtoNomeModelo: produtoNomeModeloNormalizado,
      });
    });

    return Array.from(fileiraMap.values()).map(({ gradesMap: _gradesMap, ...fileira }) => ({
      ...fileira,
      grades: fileira.grades
        .sort((a, b) => parseGradeOrder(a) - parseGradeOrder(b))
        .map((grade) => ({
          ...grade,
          niveis: [...grade.niveis].sort((a, b) => parseNivelOrder(a) - parseNivelOrder(b)),
        })),
    }));
  };

  const getVisibleNiveisForGrade = (
    grade: Grade,
    expanded: boolean,
    searchEnabledForGrade: boolean,
    matchedIds: Set<number>
  ) => {
    const orderedNiveis = [...grade.niveis].sort((a, b) => parseNivelOrder(a) - parseNivelOrder(b));

    if (expanded) {
      return orderedNiveis;
    }

    const previewNivel = orderedNiveis[0] ? [orderedNiveis[0]] : [];
    if (!searchEnabledForGrade) {
      return previewNivel;
    }

    const matchedNiveis = orderedNiveis.filter((nivel) => matchedIds.has(nivel.id));
    const deduped = new Map<number, Nivel>();

    [...previewNivel, ...matchedNiveis].forEach((nivel) => {
      deduped.set(nivel.id, nivel);
    });

    return Array.from(deduped.values()).sort((a, b) => parseNivelOrder(a) - parseNivelOrder(b));
  };

  const loadWarehouseRows = async (areaId: number): Promise<EstoquePosicao[]> => {
    try {
      const response = await API.get<EstoquePosicao[]>(`/api/estoque/posicoes/area/${areaId}`);
      return normalizeWarehouseRows(response.data, areaId);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return [];
      }

      throw error;
    }
  };

  const fetchAllData = async (
    showInitialLoader = false,
    targetAreaId: number | null = currentAreaId
  ): Promise<EstoquePosicao[] | null> => {
    if (showInitialLoader) {
      setInitialLoading(true);
    }

    try {
      if (!targetAreaId) {
        setFileiras([]);
        return [];
      }

      const rows = await loadWarehouseRows(targetAreaId);

      setFileiras(buildWarehouseStructure(rows));
      return rows;
    } catch (error: any) {
      Alert.alert('Erro', extractErrorMessage(error, 'Não foi possível carregar o mapa do estoque.'));
      return null;
    } finally {
      if (showInitialLoader) {
        setInitialLoading(false);
      }
    }
  };

  useEffect(() => {
    if (areaLoading && !currentAreaId) {
      return;
    }

    setExpandedGrades([]);
    setExpandedFileiras([]);
    setActiveGradeId(null);
    setSelectedMobileFileiraId(null);
    setFocusedNivelId(null);
    setSearchResultsVisible(false);
    void fetchAllData(true, currentAreaId);
  }, [areaLoading, currentAreaId]);

  useEffect(() => {
    if (fileiras.length === 0) {
      if (selectedMobileFileiraId !== null) {
        setSelectedMobileFileiraId(null);
      }
      return;
    }

    const hasSelectedFileira = fileiras.some((fileira) => fileira.id === selectedMobileFileiraId);

    if (!hasSelectedFileira) {
      setSelectedMobileFileiraId(fileiras[0].id);
    }
  }, [fileiras, selectedMobileFileiraId]);

  const toggleGradeExpand = (grade: Grade) => {
    safeLayoutAnimation();
    const isExpanding = !expandedGrades.includes(grade.id);

    setExpandedGrades((prev) => {
      if (isExpanding) {
        return [...prev, grade.id];
      }
      return prev.filter((id) => id !== grade.id);
    });
  };

  const toggleFileiraExpand = (fileira: Fileira) => {
    safeLayoutAnimation();
    const isExpanding = !expandedFileiras.includes(fileira.id);

    setExpandedFileiras((prev) => {
      if (isExpanding) {
        return [...prev, fileira.id];
      }
      return prev.filter((id) => id !== fileira.id);
    });

    fileira.grades.forEach((grade) => {
      const expanded = expandedGrades.includes(grade.id);
      if (isExpanding && !expanded) {
        toggleGradeExpand(grade);
      }
      if (!isExpanding && expanded) {
        toggleGradeExpand(grade);
      }
    });

    setActiveGradeId(null);
  };

  const handleMobileFileiraSelection = useCallback((fileiraId: number) => {
    setSelectedMobileFileiraId((currentFileiraId) => {
      return currentFileiraId === fileiraId ? currentFileiraId : fileiraId;
    });
    setExpandedGrades([]);
    setActiveGradeId(null);
    setExpandedFileiras((previousFileiras) => {
      return previousFileiras.includes(fileiraId)
        ? previousFileiras
        : [...previousFileiras, fileiraId];
    });
  }, []);

  const focusStructureContextForCurrentLayout = useCallback(
    (fileiraId: number, gradeId: number) => {
      setExpandedFileiras((previousFileiras) => {
        return previousFileiras.includes(fileiraId)
          ? previousFileiras
          : [...previousFileiras, fileiraId];
      });

      if (shouldUseMobileWarehouseLayout) {
        setSelectedMobileFileiraId(fileiraId);
        setExpandedGrades([gradeId]);
      } else {
        setExpandedGrades((previousGrades) => {
          return previousGrades.includes(gradeId)
            ? previousGrades
            : [...previousGrades, gradeId];
        });
      }

      setActiveGradeId(gradeId);
    },
    [shouldUseMobileWarehouseLayout]
  );

  const buildNivelSelectionCtx = useCallback(
    (fileira: Fileira, grade: Grade, nivel: Nivel): NivelSelectionCtx => ({
      fileiraId: fileira.id,
      gradeId: grade.id,
      nivelId: nivel.id,
      label: `Fileira ${fileira.identificador} - ${formatGradeLabel(grade.identificador)} - Nível ${nivel.identificador}`,
      nivel,
    }),
    []
  );

  const nivelHasLinkedItem = useCallback((nivel: Nivel) => {
    const productName = String(nivel.produto?.nomeModelo ?? nivel.produtoNomeModelo ?? '').trim();
    return productName !== '';
  }, []);

  const removerUltimoNivel = async (fileiraId: number, grade: Grade) => {
    if (grade.niveis.length <= 1) {
      Alert.alert('Aviso', 'Não é possível remover o último nível da grade.');
      return;
    }

    const alvo = grade.niveis.reduce((prev, curr) => {
      return parseNivelOrder(curr) >= parseNivelOrder(prev) ? curr : prev;
    });

    await deleteAndResequenceLocal(fileiraId, grade.id, alvo.id, alvo);
  };

  const deleteAndResequenceLocal = async (
    fileiraId: number,
    gradeId: number,
    nivelId: number,
    nivel: Nivel
  ): Promise<boolean> => {
    setResequenceNivelId(nivelId);

    try {
      const temItem = (nivel.itemEstoqueId ?? null) !== null;

      if (temItem) {
        try {
          await API.delete(`/api/itens-estoque/nivel/${nivelId}`);
        } catch (errorDelete: any) {
          const status = errorDelete?.response?.status;

          if (!isItemEstoqueNotFoundError(errorDelete) && status !== 405) {
            throw errorDelete;
          }
        }
      }

      let dto: any = null;
      try {
        const res = await API.delete<any>(`/api/niveis/${nivelId}/resequence`);
        dto = res?.data;
      } catch (resequenceError: any) {
        if (resequenceError?.response?.status === 404) {
          await fetchAllData();
          focusStructureContextForCurrentLayout(fileiraId, gradeId);
          showSuccess(`Nível ${nivel.identificador} já havia sido removido. Lista sincronizada.`);
          return true;
        }
        throw resequenceError;
      }

      if (dto && typeof dto.gradeId === 'number' && Array.isArray(dto.niveis)) {
        resequenceGradeLocal(fileiraId, gradeId, dto.niveis);
      }
      await fetchAllData();

      focusStructureContextForCurrentLayout(fileiraId, gradeId);
      showSuccess(`Nível ${nivel.identificador} removido com sucesso. Grade atualizada.`);
      return true;
    } catch (error: any) {
      if (isItemEstoqueNotFoundError(error)) {
        const rows = await fetchAllData();
        const nivelAindaExiste =
          Array.isArray(rows) && rows.some((r) => Number(r?.nivelId) === Number(nivelId));

        if (!nivelAindaExiste) {
          showSuccess(`Nível ${nivel.identificador} já estava removido. Lista sincronizada.`);
          return true;
        }
      }

      const message = extractErrorMessage(error, 'Não foi possível remover/resequenciar o nível.');
      showError(message);
      try {
        await fetchAllData();
      } catch (_syncError) {
        // ignora erro de sincronização secundária
      }
      return false;
    } finally {
      setResequenceNivelId(null);
    }
  };

  const removeOnlyItemFromNivelLocal = async (
    fileiraId: number,
    gradeId: number,
    nivelId: number,
    nivel: Nivel
  ): Promise<boolean> => {
    setResequenceNivelId(nivelId);

    try {
      const temItem = nivelHasLinkedItem(nivel);

      if (!temItem) {
        await fetchAllData();
        focusStructureContextForCurrentLayout(fileiraId, gradeId);
        showSuccess(`Nível ${nivel.identificador} já estava vazio. Estrutura sincronizada.`);
        return true;
      }

      try {
        await API.delete(`/api/itens-estoque/nivel/${nivelId}`);
      } catch (errorDelete: any) {
        const status = errorDelete?.response?.status;

        if (!isItemEstoqueNotFoundError(errorDelete) && status !== 405) {
          throw errorDelete;
        }
      }

      await fetchAllData();
      focusStructureContextForCurrentLayout(fileiraId, gradeId);
      showSuccess(`Produto removido do nível ${nivel.identificador}.`);
      return true;
    } catch (error: any) {
      const message = extractErrorMessage(error, 'Não foi possível remover o produto do nível.');
      showError(message);
      try {
        await fetchAllData();
      } catch (_syncError) {
        // ignora erro de sincronização secundária
      }
      return false;
    } finally {
      setResequenceNivelId(null);
    }
  };

  const openConfirmRemoveNivel = (nivel: Nivel, fileira: Fileira, grade: Grade) => {
    const nextCtx = buildNivelSelectionCtx(fileira, grade, nivel);
    setPendingRemoveNivel(nextCtx);
    setPendingRemoveDecision(nivelHasLinkedItem(nivel) ? 'item-only' : 'item-and-level');

    setConfirmRemoveVisible(true);
  };

  const closeConfirmRemoveNivel = () => {
    setConfirmRemoveVisible(false);
    setPendingRemoveNivel(null);
    setPendingRemoveDecision(null);
  };

  const confirmRemoveNivel = async () => {
    if (!pendingRemoveNivel?.nivel || pendingRemoveDecision == null) {
      closeConfirmRemoveNivel();
      return;
    }

    const removed =
      pendingRemoveDecision === 'item-only'
        ? await removeOnlyItemFromNivelLocal(
            pendingRemoveNivel.fileiraId,
            pendingRemoveNivel.gradeId,
            pendingRemoveNivel.nivelId,
            pendingRemoveNivel.nivel
          )
        : await deleteAndResequenceLocal(
            pendingRemoveNivel.fileiraId,
            pendingRemoveNivel.gradeId,
            pendingRemoveNivel.nivelId,
            pendingRemoveNivel.nivel
          );

    closeConfirmRemoveNivel();
    if (
      removed &&
      selectedNivelCtx?.nivelId === pendingRemoveNivel.nivelId &&
      (productModalVisible || productEditModalVisible || editProductPickerVisible)
    ) {
      closeProductModal();
    }
  };

  const handleGradePress = (grade: Grade) => {
    const isCurrentlyExpanded = expandedGrades.includes(grade.id);

    if (shouldUseMobileWarehouseLayout) {
      safeLayoutAnimation();
      setExpandedGrades(isCurrentlyExpanded ? [] : [grade.id]);
      setActiveGradeId(isCurrentlyExpanded ? null : grade.id);
      return;
    }

    setActiveGradeId(isCurrentlyExpanded ? null : grade.id);
    toggleGradeExpand(grade);
  };

  const resetProductForm = () => {
    setItemEstoque(null);
    setEditQuantidade(1);
    setEditProductId(null);
    setPendingEditProductId(null);
    setEditCodigo('');
    setEditCor('');
    setEditNomeModelo('');
    setEditDescricao('');
    setEditProductFilter('');
  };

  const closeProductModal = () => {
    setProductModalVisible(false);
    setProductEditModalVisible(false);
    setEditProductPickerVisible(false);
    setConfirmSaveVisible(false);
    setProductModalOrigin(null);
    setEditProductPickerReturnMode(null);
    setSelectedNivelCtx(null);
    resetProductForm();
  };

  const normalizeItemEstoqueResponse = (data: any): ItemEstoque | null => {
    if (!data) {
      return null;
    }
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return null;
      }
      return data[0] as ItemEstoque;
    }
    return data as ItemEstoque;
  };

  const loadItemEstoque = useCallback(async (nivelId: number) => {
    setItemLoading(true);

    try {
      const res = await API.get<any>(`/api/itens-estoque/nivel/${nivelId}`);
      const dto = normalizeItemEstoqueResponse(res.data);

      if (!dto) {
        resetProductForm();
        return;
      }

      setItemEstoque(dto);

      setEditQuantidade(typeof dto.quantidade === 'number' ? dto.quantidade : 1);
      setEditProductId(dto.produtoId ?? null);
      setEditCodigo(dto.produtoCodigoWester ?? '');
      setEditCor(dto.produtoCor ?? '');
      setEditNomeModelo(dto.produtoNomeModelo ?? '');
      setEditDescricao(dto.produtoDescricao ?? '');
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 404 || status === 204) {
        resetProductForm();
      } else {
        Alert.alert(
          'Erro',
          error?.response?.data ?? 'Não foi possível carregar os dados do produto.'
        );
      }
    } finally {
      setItemLoading(false);
    }
  }, []);

  const handleNivelClick = (fileira: Fileira, grade: Grade, nivel: Nivel) => {
    const nextCtx = buildNivelSelectionCtx(fileira, grade, nivel);

    setSelectedNivelCtx(nextCtx);
    resetProductForm();

    if (!nivelHasLinkedItem(nivel)) {
      setProductModalOrigin('direct');
      setProductModalVisible(false);
      setProductEditModalVisible(true);
      setItemLoading(false);
      setEditProductFilter('');
      setPendingEditProductId(null);
      setEditProductPickerVisible(false);
      setEditProductPickerReturnMode(null);
      setConfirmSaveVisible(false);
      return;
    }

    setProductModalOrigin('details');
    setProductModalVisible(true);
  };

  useEffect(() => {
    if (!selectedNivelCtx) {
      return;
    }

    if (!nivelHasLinkedItem(selectedNivelCtx.nivel)) {
      resetProductForm();
      setItemLoading(false);
      return;
    }

    void loadItemEstoque(selectedNivelCtx.nivelId);
  }, [loadItemEstoque, nivelHasLinkedItem, selectedNivelCtx]);

  const currentNivelItemDetails = useMemo(() => {
    const fallbackProduto = selectedNivelCtx?.nivel.produto ?? null;
    const nomeModelo = String(
      itemEstoque?.produtoNomeModelo ?? fallbackProduto?.nomeModelo ?? ''
    ).trim();
    const codigo = String(
      itemEstoque?.produtoCodigoWester ?? fallbackProduto?.codigoSistemaWester ?? ''
    ).trim();
    const cor = String(itemEstoque?.produtoCor ?? fallbackProduto?.cor ?? '').trim();
    const descricao = String(itemEstoque?.produtoDescricao ?? fallbackProduto?.descricao ?? '').trim();
    const hasLinkedProduct = nomeModelo !== '';
    const quantidadeBase =
      typeof itemEstoque?.quantidade === 'number'
        ? itemEstoque.quantidade
        : typeof selectedNivelCtx?.nivel.quantidade === 'number'
          ? selectedNivelCtx.nivel.quantidade
          : 0;

    return {
      produtoId: hasLinkedProduct ? itemEstoque?.produtoId ?? fallbackProduto?.id ?? null : null,
      nomeModelo: hasLinkedProduct ? nomeModelo : '',
      codigo: hasLinkedProduct ? codigo : '',
      cor: hasLinkedProduct ? cor : '',
      descricao: hasLinkedProduct ? descricao : '',
      quantidade: quantidadeBase,
    };
  }, [itemEstoque, selectedNivelCtx]);

  const nivelHasLinkedProduct = useMemo(
    () =>
      selectedNivelCtx ? nivelHasLinkedItem(selectedNivelCtx.nivel) : currentNivelItemDetails.nomeModelo !== '',
    [currentNivelItemDetails.nomeModelo, nivelHasLinkedItem, selectedNivelCtx]
  );
  const selectedNivelIsEmpty = useMemo(
    () => (selectedNivelCtx ? !nivelHasLinkedItem(selectedNivelCtx.nivel) : false),
    [nivelHasLinkedItem, selectedNivelCtx]
  );

  useEffect(() => {
    if (!selectedNivelCtx || productModalOrigin !== 'direct' || !selectedNivelIsEmpty) {
      return;
    }

    if (productModalVisible) {
      setProductModalVisible(false);
    }

    if (!productEditModalVisible) {
      setProductEditModalVisible(true);
    }

    setItemLoading(false);
  }, [
    productEditModalVisible,
    productModalOrigin,
    productModalVisible,
    selectedNivelCtx,
    selectedNivelIsEmpty,
  ]);

  const syncEditFormWithCurrentItem = useCallback(() => {
    setEditProductId(currentNivelItemDetails.produtoId ?? null);
    setEditQuantidade(currentNivelItemDetails.quantidade > 0 ? currentNivelItemDetails.quantidade : 1);
    setEditCodigo(currentNivelItemDetails.codigo);
    setEditCor(currentNivelItemDetails.cor);
    setEditNomeModelo(currentNivelItemDetails.nomeModelo);
    setEditDescricao(currentNivelItemDetails.descricao);
  }, [currentNivelItemDetails]);

  const openProductEditModal = useCallback(() => {
    if (!selectedNivelCtx) {
      return;
    }

    syncEditFormWithCurrentItem();
    setProductModalVisible(false);
    setEditProductPickerVisible(false);
    setPendingEditProductId(null);
    setProductEditModalVisible(true);
    setConfirmSaveVisible(false);
  }, [selectedNivelCtx, syncEditFormWithCurrentItem]);

  const closeProductEditModal = () => {
    if (saving) {
      return;
    }

    setEditProductPickerVisible(false);
    setPendingEditProductId(null);
    setProductEditModalVisible(false);

    if (productModalOrigin === 'details' && selectedNivelCtx) {
      setProductModalVisible(true);
      return;
    }

    closeProductModal();
  };

  const isDirty = useMemo(() => {
    const baseQtd = currentNivelItemDetails.quantidade > 0 ? currentNivelItemDetails.quantidade : 1;
    const baseProductId = currentNivelItemDetails.produtoId ?? null;
    const baseNomeModelo = currentNivelItemDetails.nomeModelo;
    const baseCodigo = currentNivelItemDetails.codigo;
    const baseCor = currentNivelItemDetails.cor;
    const baseDescricao = currentNivelItemDetails.descricao;

    return (
      baseQtd !== editQuantidade ||
      baseProductId !== (editProductId ?? null) ||
      baseNomeModelo !== editNomeModelo ||
      baseCodigo !== editCodigo ||
      baseCor !== editCor ||
      baseDescricao !== editDescricao
    );
  }, [
    currentNivelItemDetails,
    editCodigo,
    editCor,
    editDescricao,
    editNomeModelo,
    editProductId,
    editQuantidade,
  ]);

  const openConfirmSave = () => {
    if (editProductId == null) {
      showError('Selecione um produto existente antes de salvar.');
      return;
    }

    if (!isDirty) {
      Alert.alert('Aviso', 'Nenhuma alteração para salvar.');
      return;
    }
    setConfirmSaveVisible(true);
  };

  const closeConfirmSave = () => {
    setConfirmSaveVisible(false);
  };

  const applyLocalNivelUpdate = (
    fileiraId: number,
    gradeId: number,
    nivelId: number,
    dto: ItemEstoque
  ) => {
    setFileiras((prev) => {
      return prev.map((fileira) => {
        if (fileira.id !== fileiraId) {
          return fileira;
        }

        return {
          ...fileira,
          grades: fileira.grades.map((grade) => {
            if (grade.id !== gradeId) {
              return grade;
            }

            return {
              ...grade,
              niveis: grade.niveis.map((nivel) => {
                if (nivel.id !== nivelId) {
                  return nivel;
                }

                const nomeModelo = (dto.produtoNomeModelo ?? '').toString();
                const cor = (dto.produtoCor ?? '').toString();
                const codigoSistemaWester = (dto.produtoCodigoWester ?? '').toString();

                return {
                  ...nivel,
                  quantidade: typeof dto.quantidade === 'number' ? dto.quantidade : 0,
                  itemEstoqueId: dto.id ?? null,
                  produtoNomeModelo: nomeModelo.trim() !== '' ? nomeModelo : undefined,
                  produto: dto.produtoId
                    ? {
                        id: dto.produtoId,
                        nomeModelo: nomeModelo,
                        cor: cor,
                        codigoSistemaWester: codigoSistemaWester,
                        descricao: dto.produtoDescricao ?? '',
                      }
                    : null,
                };
              }),
            };
          }),
        };
      });
    });
  };

  const loadActiveProducts = useCallback(async () => {
    setActiveProductsLoading(true);

    try {
      const response = await listProducts({
        page: 0,
        size: 500,
        status: 'ATIVO',
        search: '',
      });

      setActiveProducts(
        Array.isArray(response.items) ? response.items.filter((item) => item.ativo) : []
      );
    } catch (error: any) {
      const message = extractErrorMessage(error, 'Não foi possível carregar os produtos ativos.');
      showError(message);
    } finally {
      setActiveProductsLoading(false);
    }
  }, []);

  const filteredActiveProducts = useMemo(() => {
    const normalizedQuery = productFilter.trim().toLowerCase();

    if (normalizedQuery === '') {
      return activeProducts;
    }

    return activeProducts.filter((product) => {
      const haystack = [product.nome, product.codigo].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeProducts, productFilter]);

  const filteredEditProducts = useMemo(() => {
    const normalizedQuery = editProductFilter.trim().toLowerCase();

    if (normalizedQuery === '') {
      return activeProducts;
    }

    return activeProducts.filter((product) => {
      const haystack = [product.nome, product.codigo].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeProducts, editProductFilter]);

  const selectedCatalogProduct = useMemo(
    () => activeProducts.find((product) => product.id === selectedProductId) ?? null,
    [activeProducts, selectedProductId]
  );

  const selectedEditCatalogProduct = useMemo(
    () => activeProducts.find((product) => product.id === pendingEditProductId) ?? null,
    [activeProducts, pendingEditProductId]
  );

  const parsedProductQuantity = useMemo(() => {
    const normalized = productQuantityInput.trim();

    if (normalized === '' || !/^\d+$/.test(normalized)) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [productQuantityInput]);

  const addLevelProductValidationMessage = useMemo(() => {
    const normalizedQuantity = productQuantityInput.trim();
    const normalizedProductName = String(
      selectedCatalogProduct?.nomeModelo ?? selectedCatalogProduct?.nome ?? ''
    ).trim();

    if (
      selectedCatalogProduct == null ||
      normalizedQuantity === '' ||
      !/^\d+$/.test(normalizedQuantity) ||
      parsedProductQuantity == null
    ) {
      return 'Selecione um produto e informe a quantidade.';
    }

    if (normalizedProductName === '') {
      return 'O produto selecionado não possui Nome/Modelo válido.';
    }

    return null;
  }, [parsedProductQuantity, productQuantityInput, selectedCatalogProduct]);

  const isAddLevelProductSubmitDisabled =
    structureCreationLoading || selectedCatalogProduct == null || parsedProductQuantity == null;

  const editProductSelectionValidationMessage =
    pendingEditProductId == null ? 'Selecione um produto para continuar.' : null;

  const applyCatalogProductToEditForm = useCallback((product: CatalogProduct) => {
    setEditProductId(product.id);
    setEditCodigo(product.codigoSistemaWester ?? product.codigo ?? '');
    setEditCor(product.cor ?? '');
    setEditNomeModelo(product.nomeModelo ?? product.nome ?? '');
    setEditDescricao(product.descricao ?? '');
  }, []);

  const openCreateStructureModal = (ctx: PendingStructureCreationCtx) => {
    setPendingStructureCtx(ctx);
    setSelectedProductId(null);
    setProductQuantityInput('');
    setProductFilter('');
    setAddLevelDecisionVisible(true);
  };

  const resetAddLevelFlow = () => {
    setAddLevelDecisionVisible(false);
    setSelectGradeProductVisible(false);
    setPendingStructureCtx(null);
    setSelectedProductId(null);
    setProductQuantityInput('');
    setProductFilter('');
  };

  const openAddLevelDecisionForGrade = (fileira: Fileira, grade: Grade) => {
    const next = computeNextNivelForGrade(grade);
    const label = `Fileira ${fileira.identificador} - ${formatGradeLabel(grade.identificador)} - Nível ${next.identificador}`;

    openCreateStructureModal({
      kind: 'level',
      fileiraId: fileira.id,
      fileiraIdentificador: fileira.identificador,
      gradeId: grade.id,
      gradeIdentificador: grade.identificador,
      label,
      nextNivelIdentificador: next.identificador,
      nextNivelOrdem: next.ordem,
    });
  };

  const closeAddLevelDecision = () => {
    if (structureCreationLoading) {
      return;
    }

    resetAddLevelFlow();
  };

  const openSelectGradeProductModal = async () => {
    setAddLevelDecisionVisible(false);
    setSelectedProductId(null);
    setProductQuantityInput('');
    setProductFilter('');
    setSelectGradeProductVisible(true);
    await loadActiveProducts();
  };

  const closeSelectGradeProductModal = () => {
    if (structureCreationLoading) {
      return;
    }

    resetAddLevelFlow();
  };

  const openEditProductPickerModal = async () => {
    setProductEditModalVisible(false);
    setEditProductFilter('');
    setPendingEditProductId(editProductId);
    setEditProductPickerReturnMode('form');
    await loadActiveProducts();
    setEditProductPickerVisible(true);
  };

  const closeEditProductPickerModal = () => {
    if (saving) {
      return;
    }

    setEditProductPickerVisible(false);
    setPendingEditProductId(null);
    if (editProductPickerReturnMode === 'form') {
      setEditProductPickerReturnMode(null);
      setProductEditModalVisible(true);
      return;
    }

    closeProductModal();
  };

  const confirmEditProductSelection = () => {
    if (selectedEditCatalogProduct == null) {
      return;
    }

    applyCatalogProductToEditForm(selectedEditCatalogProduct);
    setEditProductPickerVisible(false);
    setPendingEditProductId(null);
    setEditProductPickerReturnMode(null);
    setProductEditModalVisible(true);
  };

  const resolveTargetGradeForCreation = async (
    ctx: PendingStructureCreationCtx
  ): Promise<CreatedGrade | { id: number; identificador: string; ordem?: number }> => {
    if (ctx.kind === 'level') {
      if (typeof ctx.gradeId !== 'number') {
        throw new Error('Nao foi possivel identificar a grade selecionada.');
      }

      return {
        id: ctx.gradeId,
        identificador: ctx.gradeIdentificador,
        ordem: ctx.gradeOrdem,
      };
    }

    return createGradeWithRetry(
      ctx.fileiraId,
      ctx.fileiraIdentificador,
      ctx.gradeOrdem ?? 1,
      ctx.gradeIdentificador
    );
  };

  const submitStructureCreation = async (
    payload: { modo: 'vazio' } | { modo: 'produto'; produto: CatalogProduct; quantidade: number }
  ) => {
    if (!pendingStructureCtx) {
      resetAddLevelFlow();
      return;
    }

    setStructureCreationLoading(true);

    try {
      const levelDraft = {
        identificador: pendingStructureCtx.nextNivelIdentificador,
        ordem: pendingStructureCtx.nextNivelOrdem,
      };

      const targetGrade = await resolveTargetGradeForCreation(pendingStructureCtx);

      if (payload.modo === 'vazio') {
        await createEmptyLevelInGrade(targetGrade.id, levelDraft);
      } else {
        await createLevelWithProductInGrade(targetGrade.id, levelDraft, {
          produto: payload.produto,
          quantidade: payload.quantidade,
        });
      }

      await fetchAllData();

      focusStructureContextForCurrentLayout(pendingStructureCtx.fileiraId, targetGrade.id);

      const successMessage =
        pendingStructureCtx.kind === 'grade'
          ? payload.modo === 'produto'
            ? `${formatGradeLabel(targetGrade.identificador)} criada com ${pendingStructureCtx.nextNivelIdentificador} e produto vinculado.`
            : `${formatGradeLabel(targetGrade.identificador)} criada com ${pendingStructureCtx.nextNivelIdentificador} vazio.`
          : payload.modo === 'produto'
            ? `Nível ${pendingStructureCtx.nextNivelIdentificador} criado com produto vinculado.`
            : `Nível ${pendingStructureCtx.nextNivelIdentificador} criado sem produto.`;

      resetAddLevelFlow();
      showSuccess(successMessage);
    } catch (error: any) {
      const fallbackMessage =
        pendingStructureCtx.kind === 'grade'
          ? 'Não foi possível criar a grade.'
          : 'Não foi possível adicionar o nível à grade.';
      const message = extractErrorMessage(error, fallbackMessage);
      showError(message);
    } finally {
      setStructureCreationLoading(false);
    }
  };

  const confirmAddLevelWithoutProduct = () => {
    if (structureCreationLoading) {
      return;
    }

    void submitStructureCreation({ modo: 'vazio' });
  };

  const confirmAddLevelWithSelectedProduct = () => {
    if (structureCreationLoading) {
      return;
    }

    if (
      addLevelProductValidationMessage ||
      selectedCatalogProduct == null ||
      parsedProductQuantity == null
    ) {
      return;
    }

    void submitStructureCreation({
      modo: 'produto',
      produto: selectedCatalogProduct,
      quantidade: parsedProductQuantity,
    });
  };

  const saveEdits = async () => {
    if (!selectedNivelCtx) {
      closeConfirmSave();
      return;
    }

    if (editProductId == null) {
      showError('Selecione um produto existente antes de salvar.');
      closeConfirmSave();
      return;
    }

    if (editQuantidade <= 0) {
      showError('Quantidade 0 é tratada pela API como remoção de nível. Use valor maior que zero.');
      closeConfirmSave();
      return;
    }

    setSaving(true);

    try {
      const payload = buildStockItemUpsertPayload({
        quantidade: editQuantidade,
        produto: {
          id: editProductId,
          codigoSistemaWester: editCodigo,
          cor: editCor,
          nomeModelo: editNomeModelo,
          descricao: editDescricao,
        },
      });

      const res = await API.put<any>(
        `/api/itens-estoque/nivel/${selectedNivelCtx.nivelId}`,
        payload
      );
      const updated = normalizeItemEstoqueResponse(res.data);

      if (!updated) {
        throw new Error('Resposta inválida ao salvar.');
      }

      setItemEstoque(updated);

      applyLocalNivelUpdate(
        selectedNivelCtx.fileiraId,
        selectedNivelCtx.gradeId,
        selectedNivelCtx.nivelId,
        updated
      );

      closeConfirmSave();
      closeProductModal();

      showSuccess(`Dados salvos com sucesso em ${selectedNivelCtx.label}`);
    } catch (error: any) {
      const msg = extractErrorMessage(error, 'Não foi possível salvar as alterações.');
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const computeNextGradeForFileira = (fileira: Fileira) => {
    const numericIds = fileira.grades
      .map((g) => parseInt(g.identificador.replace(/\D/g, ''), 10))
      .filter((n) => !Number.isNaN(n));

    const maxExisting = numericIds.length > 0 ? Math.max(...numericIds) : 0;
    const nextNumber = maxExisting + 1;

    return {
      identificador: `${fileira.identificador}${nextNumber}`,
      ordem: nextNumber,
    };
  };

  const openAddGradeDecisionForFileira = (fileira: Fileira) => {
    const next = computeNextGradeForFileira(fileira);
    const label = `Fileira ${fileira.identificador} - ${formatGradeLabel(next.identificador)} - Nível N1`;

    openCreateStructureModal({
      kind: 'grade',
      fileiraId: fileira.id,
      fileiraIdentificador: fileira.identificador,
      gradeIdentificador: next.identificador,
      gradeOrdem: next.ordem,
      label,
      nextNivelIdentificador: 'N1',
      nextNivelOrdem: 1,
    });
  };

  const createGradeWithRetry = async (
    fileiraId: number,
    fileiraIdentificador: string,
    startOrdem: number,
    startIdentificador: string
  ) => {
    let ordem = startOrdem;
    let identificador = startIdentificador;

    for (let i = 0; i < 25; i++) {
      try {
        const res = await API.post<any>(`/api/grades/fileira/${fileiraId}`, {
          identificador,
          ordem,
        });
        const data = res?.data;

        if (data && typeof data.id === 'number') {
          return {
            id: data.id as number,
            identificador: (data.identificador ?? identificador) as string,
            ordem: typeof data.ordem === 'number' ? (data.ordem as number) : ordem,
          } as CreatedGrade;
        }

        return { id: -1, identificador, ordem } as CreatedGrade;
      } catch (error: any) {
        const msg = String(error?.response?.data ?? error?.message ?? '');
        if (msg.toLowerCase().includes('identificador') && msg.toLowerCase().includes('existe')) {
          ordem = ordem + 1;
          identificador = `${fileiraIdentificador}${ordem}`;
          continue;
        }
        throw error;
      }
    }

    throw new Error('Não foi possível criar a grade (muitas tentativas).');
  };

  const parseFileiraOrder = (fileira: Fileira) => {
    const num = parseInt(String(fileira.identificador ?? '').replace(/\D/g, ''), 10);
    return Number.isNaN(num) ? 0 : num;
  };

  const extractAlpha = (value: string): string => {
    const match = value.match(/[A-Z]+$/i);
    return match ? match[0].toUpperCase() : '';
  };

  const alphaToNumber = (alpha: string): number => {
    let result = 0;

    for (let i = 0; i < alpha.length; i++) {
      result = result * 26 + (alpha.charCodeAt(i) - 64);
    }

    return result;
  };

  const numberToAlpha = (num: number): string => {
    let result = '';

    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }

    return result;
  };

  const computeNextFileira = (list: Fileira[]) => {
    const maxAlphaValue = list
      .map((f) => extractAlpha(String(f.identificador ?? '')))
      .filter((v) => v !== '')
      .map(alphaToNumber)
      .reduce((max, cur) => Math.max(max, cur), 0);

    const nextValue = maxAlphaValue + 1;

    return {
      identificador: numberToAlpha(nextValue),
      ordem: nextValue,
    };
  };

  const addNewFileira = async () => {
    if (creatingFileira || !currentAreaId) {
      return;
    }

    setCreatingFileira(true);

    try {
      const next = computeNextFileira(fileiras);
      const res = await API.post(`/api/fileiras/area/${currentAreaId}`, {
        identificador: next.identificador,
        ordem: next.ordem,
      });

      const createdId = res?.data?.id;
      if (typeof createdId !== 'number') {
        throw new Error('Não foi possível identificar a nova fileira criada.');
      }

      const newFileira: Fileira = {
        id: createdId,
        identificador: res?.data?.identificador ?? next.identificador,
        grades: [],
      };

      setFileiras((prev) => {
        const merged = [...prev, newFileira].sort(
          (a, b) => parseFileiraOrder(a) - parseFileiraOrder(b)
        );
        return merged;
      });

      setExpandedFileiras((prev) => (prev.includes(createdId) ? prev : [...prev, createdId]));
      setSelectedMobileFileiraId(createdId);
      setExpandedGrades([]);
      setActiveGradeId(null);
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.response?.data ?? error?.message ?? 'Não foi possível criar a fileira.'
      );
    } finally {
      setCreatingFileira(false);
    }
  };

  const resequenceGradeLocal = (
    fileiraId: number,
    gradeId: number,
    niveis: { id: number; identificador: string; ordem?: number }[]
  ) => {
    setFileiras((prev) => {
      return prev.map((fileira) => {
        if (fileira.id !== fileiraId) {
          return fileira;
        }

        return {
          ...fileira,
          grades: fileira.grades.map((grade) => {
            if (grade.id !== gradeId) {
              return grade;
            }

            const merged = niveis
              .map((n) => ({
                id: n.id,
                identificador: n.identificador,
                ordem: typeof n.ordem === 'number' ? n.ordem : undefined,
                itemEstoqueId: grade.niveis.find((x) => x.id === n.id)?.itemEstoqueId ?? null,
                quantidade: grade.niveis.find((x) => x.id === n.id)?.quantidade ?? 0,
                produtoNomeModelo: grade.niveis.find((x) => x.id === n.id)?.produtoNomeModelo,
                produto: grade.niveis.find((x) => x.id === n.id)?.produto ?? null,
              }))
              .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

            return { ...grade, niveis: merged };
          }),
        };
      });
    });
  };

  // ? SEARCH helpers
  const normalizeSearchText = (value: string) => {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 320);

    return () => clearTimeout(t);
  }, [searchText]);

  const normalizedQuery = useMemo(
    () => normalizeSearchText(debouncedSearchText),
    [debouncedSearchText]
  );
  const searchEnabled = normalizedQuery.length >= 3;
  const HEADER_SEARCH_BREAKPOINT = 760;
  const showInlineSearchHelper = IS_WEB && screenWidth < HEADER_SEARCH_BREAKPOINT;
  const isTightSearchViewport = IS_WEB && screenWidth < 440;
  const compactSearchPlaceholder = isTightSearchViewport
    ? 'Nome, código, cor ou descrição'
    : 'Digite nome, código, cor ou descrição (mín. 3 caracteres)';

  useEffect(() => {
    if (!IS_WEB || typeof document === 'undefined' || screenWidth < HEADER_SEARCH_BREAKPOINT) {
      return;
    }

    const applyTopSearchMaxWidth = () => {
      const input = document.querySelector(
        'input[placeholder*="Buscar produto"], input[placeholder*="Pesquisar produto"]'
      ) as HTMLInputElement | null;

      if (!input) {
        return;
      }

      const container = input.parentElement as HTMLElement | null;
      if (!container) {
        return;
      }

      container.style.maxWidth = '40%';
      container.style.width = '40%';
      container.style.flex = '0 1 40%';

      const parent = container.parentElement as HTMLElement | null;
      if (parent) {
        parent.style.justifyContent = 'flex-end';
      }

      input.style.width = '100%';
      input.style.minWidth = '0';
    };

    applyTopSearchMaxWidth();
    const t1 = setTimeout(applyTopSearchMaxWidth, 90);
    const t2 = setTimeout(applyTopSearchMaxWidth, 260);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [screenWidth, searchText]);

  const matchedNivelIds = useMemo(() => {
    const ids = new Set<number>();

    if (!searchEnabled) {
      return ids;
    }

    for (const f of fileiras) {
      for (const g of f.grades) {
        for (const n of g.niveis) {
          const nome = (n.produto?.nomeModelo ?? n.produtoNomeModelo ?? '').toString();
          const codigo = (n.produto?.codigoSistemaWester ?? '').toString();
          const cor = (n.produto?.cor ?? '').toString();
          const descricao = (n.produto?.descricao ?? '').toString();

          const hay = normalizeSearchText(`${nome} ${codigo} ${cor} ${descricao}`);
          if (hay.includes(normalizedQuery)) {
            ids.add(n.id);
          }
        }
      }
    }

    return ids;
  }, [fileiras, normalizedQuery, searchEnabled]);

  const searchResults = useMemo((): SearchResult[] => {
    if (!searchEnabled) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const f of fileiras) {
      for (const g of f.grades) {
        for (const n of g.niveis) {
          if (!matchedNivelIds.has(n.id)) {
            continue;
          }

          const nome = (n.produto?.nomeModelo ?? n.produtoNomeModelo ?? '').toString().trim();
          const codigo = (n.produto?.codigoSistemaWester ?? '').toString().trim();
          const cor = (n.produto?.cor ?? '').toString().trim();
          const descricao = (n.produto?.descricao ?? '').toString().trim();
          const qtd = typeof n.quantidade === 'number' ? n.quantidade : 0;

          const label = `Fileira ${f.identificador} - ${formatGradeLabel(g.identificador)} - Nível ${n.identificador}`;

          results.push({
            nivelId: n.id,
            gradeId: g.id,
            fileiraId: f.id,
            fileiraIdentificador: f.identificador,
            gradeIdentificador: g.identificador,
            nivelIdentificador: n.identificador,
            nomeModelo: nome,
            codigo: codigo,
            cor: cor,
            descricao: descricao,
            quantidade: qtd,
            label,
          });
        }
      }
    }

    results.sort((a, b) => {
      const an = normalizeSearchText(a.nomeModelo);
      const bn = normalizeSearchText(b.nomeModelo);
      if (an < bn) {
        return -1;
      }
      if (an > bn) {
        return 1;
      }
      return a.label.localeCompare(b.label);
    });

    return results.slice(0, 200);
  }, [fileiras, matchedNivelIds, searchEnabled]);

  const closeSearch = () => {
    setSearchOpen(false);
    // setSearchText('');
    setDebouncedSearchText('');
    setSearchResultsVisible(false);
    setFocusedNivelId(null);
    setHoverNivel({});
  };

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => {
      try {
        searchInputRef.current?.focus?.();
      } catch {
        // ignore
      }
    }, 0);
  };

  const submitSearch = () => {
    const instantQuery = normalizeSearchText(searchText);
    if (instantQuery.length < 3) {
      showError('Digite ao menos 3 caracteres para pesquisar.');
      return;
    }
    if (instantQuery !== normalizedQuery) {
      setDebouncedSearchText(searchText);
    }
    setSearchResultsVisible(true);
  };

  const focusOnResult = (r: SearchResult) => {
    focusStructureContextForCurrentLayout(r.fileiraId, r.gradeId);

    setHoverNivel((prev) => ({ ...prev, [r.nivelId]: true }));
    setFocusedNivelId(r.nivelId);
    setSearchResultsVisible(false);

    if (IS_WEB) {
      setTimeout(() => {
        const el = document.getElementById(`nivel-${r.nivelId}`);
        if (el && typeof (el as any).scrollIntoView === 'function') {
          (el as any).scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 60);
    }

    setTimeout(() => {
      setHoverNivel((prev) => {
        const next = { ...prev };
        delete next[r.nivelId];
        return next;
      });
    }, 2200);
  };

  useEffect(() => {
    if (!searchOpen) {
      return;
    }
    if (IS_WEB) {
      const onKey = (e: any) => {
        if (e?.key === 'Escape') {
          closeSearch();
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [searchOpen]);

  /*   const HeaderBar = (
    <View
      style={[
        styles.headerBar,
        { backgroundColor: colors.background, borderColor: colors.outline },
      ]}
    >
      <Text style={[styles.headerTitle, { color: colors.text }]}>Armazém</Text>

      <View style={styles.headerRight}>
        {searchOpen ? (
          <View
            style={[
              styles.searchBox,
              { borderColor: colors.outline, backgroundColor: colors.surface },
            ]}
          >
            <AntDesign name="search" size={16} color={colors.text} />
            <TextInput
              ref={(r) => {
                searchInputRef.current = r;
              }}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Busque por nome do produto, código, cor ou descrição (mínimo 3 caracteres)"
              placeholderTextColor="#888"
              style={[styles.searchInput, { color: colors.text }]}
              autoCorrect={false}
              autoCapitalize="none"
              onSubmitEditing={submitSearch}
              returnKeyType="search"
            />
            {searchText.trim() !== '' ? (
              <Pressable
                onPress={() => {
                  setSearchText('');
                  setDebouncedSearchText('');
                  setHoverNivel({});
                  setFocusedNivelId(null);
                  setSearchResultsVisible(false);
                }}
                style={({ pressed }) => [styles.searchIconBtn, pressed && { opacity: 0.7 }]}
              >
                <AntDesign name="close" size={16} color={colors.text} />
              </Pressable>
            ) : null}

            <Pressable
              onPress={closeSearch}
              style={({ pressed }) => [styles.searchIconBtn, pressed && { opacity: 0.7 }]}
            >
              <AntDesign name="caretup" size={16} color={colors.text} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={openSearch}
            style={({ pressed }) => [styles.searchPill, pressed && { opacity: 0.7 }]}
          >
            <AntDesign name="search" size={18} color={colors.primary} />
            <Text style={[styles.searchPillText, { color: colors.primary }]}>Buscar</Text>
          </Pressable>
        )}

        {searchEnabled ? (
          <Pressable
            onPress={submitSearch}
            style={({ pressed }) => [
              styles.searchCount,
              { backgroundColor: colors.surface, borderColor: colors.outline },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.searchCountText, { color: colors.text }]}>
              {searchResults.length}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  ); */

  return (
    <AuthProvider>
      <View style={[styles.root, { backgroundColor: colors.background }, styles.hoverFileira]}>
        {/*  {HeaderBar}
         */}
        {showInlineSearchHelper ? (
          <View
            style={[
              styles.webSearchBar,
              styles.webSearchBarCompact,
              { backgroundColor: colors.surface, borderColor: colors.outline },
            ]}
          >
            <View style={styles.webSearchRowCompact}>
              <View
                style={[
                  styles.searchBox,
                  styles.searchBoxCompact,
                  isTightSearchViewport && styles.searchBoxCompactTight,
                  {
                    borderColor: searchInputFocused ? colors.primary : colors.outline,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Pesquisar produtos no armazém"
                  onPress={submitSearch}
                  style={(state: any) => [
                    styles.searchIconBtn,
                    state?.hovered && { backgroundColor: colors.surfaceVariant },
                    state?.pressed && { opacity: 0.75 },
                  ]}
                >
                  <MaterialCommunityIcons name="magnify" size={17} color={colors.primary} />
                </Pressable>
                <TextInput
                  ref={(r) => {
                    searchInputRef.current = r;
                  }}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder={compactSearchPlaceholder}
                  placeholderTextColor={`${colors.primary}88`}
                  style={[
                    styles.searchInput,
                    isTightSearchViewport && styles.searchInputTight,
                    IS_WEB && styles.searchInputWeb,
                    { color: colors.text },
                  ]}
                  autoCorrect={false}
                  autoCapitalize="none"
                  onSubmitEditing={submitSearch}
                  returnKeyType="search"
                  onFocus={() => setSearchInputFocused(true)}
                  onBlur={() => setSearchInputFocused(false)}
                />
                {searchText.trim() !== '' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Limpar busca"
                    onPress={() => {
                      setSearchText('');
                      setDebouncedSearchText('');
                      setHoverNivel({});
                      setFocusedNivelId(null);
                      setSearchResultsVisible(false);
                    }}
                    style={(state: any) => [
                      styles.searchIconBtn,
                      state?.hovered && { backgroundColor: colors.surfaceVariant },
                      state?.pressed && { opacity: 0.7 },
                    ]}
                  >
                    <AntDesign name="close" size={16} color={colors.primary} />
                  </Pressable>
                ) : null}
              </View>
            </View>
            {searchEnabled ? (
              <Text style={[styles.webSearchHintCompact, { color: colors.primary }]}>
                {`${searchResults.length} resultado(s)`}
              </Text>
            ) : null}
          </View>
        ) : null}

        {initialLoading ? (
          <View style={styles.initialLoadingWrap}>
            <AppLoadingState
              message="Carregando mapa do armazém..."
              style={styles.initialLoadingState}
            />
          </View>
        ) : (
          <>
            <AreaDropdownSelector
              areas={areas}
              selectedAreaId={currentAreaId}
              loading={areaLoading}
              onSelect={(nextAreaId) => {
                void selectAreaById(nextAreaId);
              }}
            />

            {shouldUseWideWebWarehouseLayout ? (
              <View style={styles.webWorkspace}>
                <View style={[styles.webScroller, { backgroundColor: colors.background }]}>
                  <View style={styles.webContent}>
                  {fileiras.length === 0 ? (
                    <View
                      style={[
                        styles.emptyStateCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.outline,
                        },
                      ]}
                    >
                      <AppEmptyState
                        title={API_STATE_MESSAGES.warehouse.empty.default.title}
                        description={API_STATE_MESSAGES.warehouse.empty.default.description}
                        icon="warehouse"
                        tipo="vazio"
                      />
                    </View>
                  ) : null}

                  {fileiras.map((fileira) => {
                    const fileiraExpanded = expandedFileiras.includes(fileira.id);
                    const isFileiraHovered = !!hoverFileira[fileira.id];

                    const isAnyChildHovered = fileira.grades.some((g) => {
                      if (hoverGrade[g.id]) {
                        return true;
                      }
                      return g.niveis.some((n) => hoverNivel[n.id]);
                    });

                    const shouldShowFileiraHover =
                      (fileiraExpanded || isFileiraHovered) && !isAnyChildHovered;

                    return (
                      <Pressable
                        key={fileira.id}
                        onPress={() => toggleFileiraExpand(fileira)}
                        onHoverIn={() =>
                          setHoverFileira((prev) => ({ ...prev, [fileira.id]: true }))
                        }
                        onHoverOut={() =>
                          setHoverFileira((prev) => ({ ...prev, [fileira.id]: false }))
                        }
                        style={[
                          styles.fileiraContainer,
                          { backgroundColor: colors.surface, borderColor: colors.outline },
                          shouldShowFileiraHover && [
                            styles.fileiraHover,
                            {
                              backgroundColor: 'rgba(165, 94, 32, 0.03)',
                              shadowColor: '#000000',
                            },
                          ],
                        ]}
                      >
                        <Pressable
                          onPress={(event) => {
                            event.stopPropagation();
                            toggleFileiraExpand(fileira);
                          }}
                          style={({ pressed }) => [
                            styles.fileiraHeader,
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.fileiraTitle,
                              { color: colors.text },
                              (fileiraExpanded || shouldShowFileiraHover) && {
                                color: colors.primary,
                              },
                            ]}
                          >
                            Fileira {fileira.identificador}
                          </Text>

                          <AntDesign
                            name={fileiraExpanded ? 'caret-left' : 'caret-right'}
                            size={22}
                            color={
                              fileiraExpanded
                                ? colors.primary
                                : shouldShowFileiraHover
                                  ? colors.primary
                                  : colors.text
                            }
                            style={shouldShowFileiraHover ? styles.iconHover : undefined}
                          />
                        </Pressable>

                        {fileira.grades.map((grade) => {
                          const expanded = expandedGrades.includes(grade.id);
                          const isGradeHovered = !!hoverGrade[grade.id];
                          const isActiveGrade = activeGradeId === grade.id;

                          const uniqueNiveisToShow = getVisibleNiveisForGrade(
                            grade,
                            expanded,
                            searchEnabled,
                            matchedNivelIds
                          );
                          const hasAnyNivel = grade.niveis.length > 0;
                          const countForWidth = expanded
                            ? grade.niveis.length
                            : uniqueNiveisToShow.length;
                          const width =
                            countForWidth <= 1
                              ? baseGradeWidth
                              : baseGradeWidth + Math.max(0, countForWidth - 1) * perNivelWidth;

                          return (
                              <View key={grade.id} style={styles.gradeWrapper}>
                                <View style={[styles.gradeInner, { width }]}>
                                  <Pressable
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      handleGradePress(grade);
                                    }}
                                    onHoverIn={() => {
                                      setHoverGrade((prev) => ({ ...prev, [grade.id]: true }));
                                      setHoverFileira((prev) => ({ ...prev, [fileira.id]: false }));
                                  }}
                                  onHoverOut={() =>
                                    setHoverGrade((prev) => ({ ...prev, [grade.id]: false }))
                                  }
                                  style={({ pressed }) => [
                                    styles.gradeContainer,
                                    {
                                      backgroundColor: colors.surface,
                                      borderColor: colors.outline,
                                    },
                                    (isGradeHovered || isActiveGrade) && [
                                      styles.gradeHover,
                                      { borderColor: colors.primary, shadowColor: colors.primary },
                                    ],
                                    pressed && { opacity: 0.8 },
                                  ]}
                                >
                                  <View style={styles.gradeHeader}>
                                    <View style={styles.gradeHeaderTop}>
                                      <Text
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        style={[
                                          styles.gradeTitle,
                                          { color: colors.text },
                                          (isGradeHovered || isActiveGrade) && {
                                            color: colors.primary,
                                          },
                                        ]}
                                      >
                                        {formatGradeLabel(grade.identificador)}
                                      </Text>

                                      <AntDesign
                                        name={expanded ? 'caret-left' : 'caret-right'}
                                        size={20}
                                        color={
                                          expanded && isActiveGrade
                                            ? colors.primary
                                            : isGradeHovered
                                              ? colors.primary
                                              : colors.text
                                        }
                                        style={isGradeHovered ? styles.iconHover : undefined}
                                      />
                                    </View>

                                    <View style={styles.gradeControls}>
                                      <View
                                        onStartShouldSetResponder={() => true}
                                        onResponderRelease={(e) => (e as any).stopPropagation?.()}
                                      >
                                        <ActionIconButton
                                          iconName="plus"
                                          size="medium"
                                          borderColor={colors.outline}
                                          backgroundColor={colors.surface}
                                          iconColor={colors.primary}
                                          primaryColor={colors.primary}
                                          onPress={() => {
                                            openAddLevelDecisionForGrade(fileira, grade);
                                          }}
                                          style={styles.addButton}
                                        />
                                      </View>

                                      {removingGradeId === grade.id ? (
                                        <View
                                          style={[
                                            styles.addButton,
                                            { borderColor: colors.outline, opacity: 0.5 },
                                          ]}
                                        >
                                          <ActivityIndicator size="small" color={colors.primary} />
                                        </View>
                                      ) : (
                                        <ActionIconButton
                                          iconName="minus"
                                          size="medium"
                                          buttonSize={{ width: 28, height: 28 }}
                                          disabled={
                                            removingGradeId === grade.id || grade.niveis.length <= 1
                                          }
                                          loading={removingGradeId === grade.id}
                                          borderColor={colors.outline}
                                          backgroundColor={colors.surface}
                                          iconColor={colors.primary}
                                          primaryColor={colors.primary}
                                          onPress={() => {
                                            removerUltimoNivel(fileira.id, grade);
                                          }}
                                        />
                                      )}
                                    </View>
                                  </View>

                                  <View style={styles.niveisRow}>
                                    {hasAnyNivel ? (
                                      uniqueNiveisToShow.map((nivel) => {
                                        const isNivelHovered = !!hoverNivel[nivel.id];
                                        const quantidadeExibida =
                                          typeof nivel.quantidade === 'number'
                                            ? nivel.quantidade
                                            : 0;
                                        const produtoDisplay = getNivelProductDisplay(nivel);
                                        const produtoExibido = produtoDisplay.text;
                                        const nivelSemProduto = produtoDisplay.empty;

                                        const onlyOneNivelInGrade = grade.niveis.length <= 1;
                                        const isRemovingThisNivel = resequenceNivelId === nivel.id;
                                        const disableRemoveNivelButton =
                                          onlyOneNivelInGrade || isRemovingThisNivel;

                                        const isMatch =
                                          searchEnabled && matchedNivelIds.has(nivel.id);
                                        const shouldDim = searchEnabled && !isMatch;

                                        return (
                                          <Pressable
                                            key={nivel.id}
                                            id={`nivel-${nivel.id}` as any}
                                            onPress={() => handleNivelClick(fileira, grade, nivel)}
                                            onHoverIn={() => {
                                              setHoverNivel((prev) => ({
                                                ...prev,
                                                [nivel.id]: true,
                                              }));
                                              setHoverFileira((prev) => ({
                                                ...prev,
                                                [fileira.id]: false,
                                              }));
                                            }}
                                            onHoverOut={() =>
                                              setHoverNivel((prev) => ({
                                                ...prev,
                                                [nivel.id]: false,
                                              }))
                                            }
                                            style={[
                                              styles.nivelBox,
                                              {
                                                backgroundColor: colors.surface,
                                                borderColor: colors.outline,
                                              },
                                              isNivelHovered && [
                                                styles.nivelHover,
                                                {
                                                  borderColor: colors.primary,
                                                  shadowColor: colors.primary,
                                                },
                                              ],
                                              isMatch && [
                                                styles.nivelMatch,
                                                { borderColor: colors.primary },
                                              ],
                                              shouldDim && styles.nivelDim,
                                            ]}
                                          >
                                            <ActionIconButton
                                              iconName="minus"
                                              size="small"
                                              disabled={disableRemoveNivelButton}
                                              loading={isRemovingThisNivel}
                                              borderColor={colors.outline}
                                              backgroundColor={colors.surface}
                                              iconColor={colors.primary}
                                              primaryColor={colors.primary}
                                              onPress={() => {
                                                if (disableRemoveNivelButton) {
                                                  return;
                                                }
                                                openConfirmRemoveNivel(nivel, fileira, grade);
                                              }}
                                              style={[
                                                styles.nivelRemoveButton,
                                                disableRemoveNivelButton &&
                                                  styles.nivelRemoveButtonDisabled,
                                              ]}
                                            />

                                            <View style={styles.nivelContent}>
                                              <Text
                                                style={[
                                                  styles.nivelText,
                                                  { color: colors.text },
                                                  isNivelHovered && { color: colors.primary },
                                                ]}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                              >
                                                {nivel.identificador}
                                              </Text>

                                              <View style={styles.nivelProdutoSlot}>
                                                <Text
                                                  style={[
                                                    styles.produto,
                                                    nivelSemProduto
                                                      ? styles.produtoVazio
                                                      : { color: colors.text },
                                                    !nivelSemProduto &&
                                                      isNivelHovered && { color: colors.primary },
                                                  ]}
                                                  numberOfLines={2}
                                                  ellipsizeMode="tail"
                                                >
                                                  {produtoExibido}
                                                </Text>
                                              </View>

                                              <Text
                                                style={[
                                                  styles.qtd,
                                                  { color: colors.text },
                                                  isNivelHovered && { color: colors.primary },
                                                ]}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                              >
                                                Qtd: {quantidadeExibida}
                                              </Text>
                                            </View>
                                          </Pressable>
                                        );
                                      })
                                    ) : (
                                      <View
                                        style={[
                                          styles.nivelBox,
                                          { borderStyle: 'dashed', borderColor: colors.outline },
                                        ]}
                                      >
                                        <Text style={[styles.nivelText, { color: colors.text }]}>
                                          SEM NÍVEIS
                                        </Text>
                                        <Text style={[styles.qtd, { color: colors.text }]}>
                                          Clique no +
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </Pressable>
                              </View>
                            </View>
                          );
                        })}

                        <AddGradeNivelButton
                          onPress={() => openAddGradeDecisionForFileira(fileira)}
                          borderColor={colors.primary}
                          primaryColor={colors.primary}
                        />
                      </Pressable>
                    );
                  })}

                  <AddFileiraButton
                    onPress={addNewFileira}
                    primaryColor={colors.primary}
                    creating={creatingFileira}
                  />
                  <View style={{ width: 24, height: 24 }} />
                  </View>
                </View>
              </View>
            ) : shouldUseMobileWarehouseLayout ? (
              <View style={[styles.mobileWorkspace, { backgroundColor: colors.background }]}>
                <ScrollView
                  style={styles.mobileLayoutScroll}
                  contentContainerStyle={[
                    styles.mobileLayoutContent,
                    { paddingBottom: safeAreaInsets.bottom + 24 },
                  ]}
                  contentInsetAdjustmentBehavior="automatic"
                  automaticallyAdjustContentInsets
                  automaticallyAdjustsScrollIndicatorInsets
                  showsVerticalScrollIndicator={false}
                  scrollIndicatorInsets={{
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: safeAreaInsets.bottom + 24,
                  }}
                >
                  {fileiras.length === 0 ? (
                    <View style={styles.mobileEmptyStateWrap}>
                      <View
                        style={[
                          styles.emptyStateCardMobile,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.outline,
                          },
                        ]}
                      >
                        <AppEmptyState
                          title={API_STATE_MESSAGES.warehouse.empty.default.title}
                          description={API_STATE_MESSAGES.warehouse.empty.default.description}
                          icon="warehouse"
                          tipo="vazio"
                        />
                      </View>

                      <Pressable
                        onPress={addNewFileira}
                        disabled={creatingFileira}
                        style={({ pressed }) => [
                          styles.mobileAddStructureButton,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.primary,
                            opacity: creatingFileira ? 0.6 : pressed ? 0.82 : 1,
                          },
                        ]}
                      >
                        {creatingFileira ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <AntDesign name="plus" size={18} color={colors.primary} />
                        )}
                        <Text
                          style={[
                            styles.mobileAddStructureButtonText,
                            { color: colors.primary },
                          ]}
                        >
                          Adicionar primeira fileira
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      <View style={styles.mobileFileiraSelectorSection}>
                        <Text style={[styles.mobileSectionLabel, { color: colors.text }]}>
                          Navegue por fileira
                        </Text>

                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentInsetAdjustmentBehavior="automatic"
                          automaticallyAdjustContentInsets
                          contentContainerStyle={styles.mobileFileiraChipList}
                        >
                          {fileiras.map((fileira) => {
                            const isSelectedFileira = selectedMobileFileira?.id === fileira.id;

                            return (
                              <Pressable
                                key={fileira.id}
                                onPress={() => handleMobileFileiraSelection(fileira.id)}
                                style={({ pressed }) => [
                                  styles.mobileFileiraChip,
                                  {
                                    backgroundColor: isSelectedFileira
                                      ? colors.primary
                                      : colors.surface,
                                    borderColor: isSelectedFileira
                                      ? colors.primary
                                      : colors.outline,
                                    opacity: pressed ? 0.84 : 1,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.mobileFileiraChipText,
                                    {
                                      color: isSelectedFileira
                                        ? colors.background
                                        : colors.text,
                                    },
                                  ]}
                                >
                                  {`Fileira ${fileira.identificador}`}
                                </Text>
                              </Pressable>
                            );
                          })}

                          <Pressable
                            onPress={addNewFileira}
                            disabled={creatingFileira}
                            style={({ pressed }) => [
                              styles.mobileAddFileiraChip,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.primary,
                                opacity: creatingFileira ? 0.6 : pressed ? 0.82 : 1,
                              },
                            ]}
                          >
                            {creatingFileira ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <>
                                <AntDesign name="plus" size={16} color={colors.primary} />
                                <Text
                                  style={[
                                    styles.mobileAddFileiraChipText,
                                    { color: colors.primary },
                                  ]}
                                >
                                  Nova fileira
                                </Text>
                              </>
                            )}
                          </Pressable>
                        </ScrollView>
                      </View>

                      {selectedMobileFileira ? (
                        <View
                          style={[
                            styles.mobileFileiraPanel,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.outline,
                            },
                          ]}
                        >
                          <View style={styles.mobileFileiraPanelHeader}>
                            <View style={styles.mobileFileiraPanelHeaderText}>
                              <Text
                                style={[
                                  styles.mobileFileiraPanelEyebrow,
                                  { color: colors.primary },
                                ]}
                              >
                                Fileira ativa
                              </Text>
                              <Text
                                style={[
                                  styles.mobileFileiraPanelTitle,
                                  { color: colors.text },
                                ]}
                              >
                                {`Fileira ${selectedMobileFileira.identificador}`}
                              </Text>
                              <Text
                                style={[
                                  styles.mobileFileiraPanelMeta,
                                  { color: colors.text },
                                ]}
                              >
                                {`${selectedMobileFileira.grades.length} grade(s) cadastrada(s)`}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.mobileGradeAccordionList}>
                            {selectedMobileFileira.grades.map((grade) => {
                              const gradeExpanded = expandedGrades.includes(grade.id);
                              const gradeIsActive = activeGradeId === grade.id;
                              const orderedNiveis = [...grade.niveis].sort(
                                (firstNivel, secondNivel) =>
                                  parseNivelOrder(firstNivel) - parseNivelOrder(secondNivel)
                              );
                              const matchedNiveisCount = orderedNiveis.filter((nivel) =>
                                matchedNivelIds.has(nivel.id)
                              ).length;
                              const canRemoveGradeLevel =
                                removingGradeId !== grade.id && orderedNiveis.length > 1;

                              return (
                                <View key={grade.id} style={styles.mobileGradeAccordionItem}>
                                  <Pressable
                                    onPress={() => handleGradePress(grade)}
                                    style={({ pressed }) => [
                                      styles.mobileGradeAccordionHeader,
                                      {
                                        backgroundColor: colors.surface,
                                        borderColor:
                                          gradeExpanded || gradeIsActive
                                            ? colors.primary
                                            : colors.outline,
                                        opacity: pressed ? 0.88 : 1,
                                      },
                                    ]}
                                  >
                                    <View style={styles.mobileGradeAccordionHeaderText}>
                                      <View style={styles.mobileGradeAccordionTitleRow}>
                                        <Text
                                          numberOfLines={1}
                                          ellipsizeMode="tail"
                                          style={[
                                            styles.mobileGradeAccordionTitle,
                                            {
                                              color:
                                                gradeExpanded || gradeIsActive
                                                  ? colors.primary
                                                  : colors.text,
                                            },
                                          ]}
                                        >
                                          {formatGradeLabel(grade.identificador)}
                                        </Text>

                                        <View
                                          style={[
                                            styles.mobileGradeCountBadge,
                                            {
                                              backgroundColor: colors.surfaceVariant,
                                              borderColor: colors.outline,
                                            },
                                          ]}
                                        >
                                          <Text
                                            style={[
                                              styles.mobileGradeCountBadgeText,
                                              { color: colors.text },
                                            ]}
                                          >
                                            {`${orderedNiveis.length} nível(is)`}
                                          </Text>
                                        </View>
                                      </View>

                                      <Text
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        style={[
                                          styles.mobileGradeAccordionSummary,
                                          { color: colors.text },
                                        ]}
                                      >
                                        {searchEnabled && matchedNiveisCount > 0
                                          ? `${matchedNiveisCount} resultado(s) nesta grade`
                                          : gradeExpanded
                                            ? 'Toque em um nível para abrir os detalhes.'
                                            : 'Toque para expandir esta grade.'}
                                      </Text>
                                    </View>

                                    <View style={styles.mobileGradeAccordionHeaderActions}>
                                      <ActionIconButton
                                        iconName="plus"
                                        size="medium"
                                        buttonSize={{ width: 42, height: 42 }}
                                        borderColor={colors.outline}
                                        backgroundColor={colors.surface}
                                        iconColor={colors.primary}
                                        primaryColor={colors.primary}
                                        stopPropagation
                                        onPress={() => {
                                          openAddLevelDecisionForGrade(
                                            selectedMobileFileira,
                                            grade
                                          );
                                        }}
                                      />

                                      <ActionIconButton
                                        iconName="minus"
                                        size="medium"
                                        buttonSize={{ width: 42, height: 42 }}
                                        borderColor={colors.outline}
                                        backgroundColor={colors.surface}
                                        iconColor={colors.primary}
                                        primaryColor={colors.primary}
                                        stopPropagation
                                        disabled={!canRemoveGradeLevel}
                                        loading={removingGradeId === grade.id}
                                        onPress={() => {
                                          removerUltimoNivel(selectedMobileFileira.id, grade);
                                        }}
                                      />

                                      <View
                                        style={[
                                          styles.mobileGradeAccordionCaret,
                                          { borderColor: colors.outline },
                                        ]}
                                      >
                                        <AntDesign
                                          name={gradeExpanded ? 'caret-up' : 'caret-down'}
                                          size={16}
                                          color={
                                            gradeExpanded || gradeIsActive
                                              ? colors.primary
                                              : colors.text
                                          }
                                        />
                                      </View>
                                    </View>
                                  </Pressable>

                                  {gradeExpanded ? (
                                    <View
                                      style={[
                                        styles.mobileGradeAccordionBody,
                                        {
                                          backgroundColor: colors.surface,
                                          borderColor: colors.outline,
                                        },
                                      ]}
                                    >
                                      {orderedNiveis.length > 0 ? (
                                        orderedNiveis.map((nivel) => {
                                          const quantidadeExibida =
                                            typeof nivel.quantidade === 'number'
                                              ? nivel.quantidade
                                              : 0;
                                          const produtoDisplay = getNivelProductDisplay(nivel);
                                          const productCode = String(
                                            nivel.produto?.codigoSistemaWester ?? ''
                                          ).trim();
                                          const nivelSemProduto = produtoDisplay.empty;
                                          const isNivelMatched =
                                            searchEnabled && matchedNivelIds.has(nivel.id);
                                          const shouldDimNivel =
                                            searchEnabled && !isNivelMatched;
                                          const onlyOneNivelInGrade =
                                            orderedNiveis.length <= 1;
                                          const isRemovingThisNivel =
                                            resequenceNivelId === nivel.id;
                                          const disableRemoveNivelButton =
                                            onlyOneNivelInGrade || isRemovingThisNivel;

                                          return (
                                            <Pressable
                                              key={nivel.id}
                                              id={`nivel-${nivel.id}` as any}
                                              onPress={() =>
                                                handleNivelClick(
                                                  selectedMobileFileira,
                                                  grade,
                                                  nivel
                                                )
                                              }
                                              style={({ pressed }) => [
                                                styles.mobileNivelCard,
                                                {
                                                  backgroundColor: colors.surface,
                                                  borderColor: isNivelMatched
                                                    ? colors.primary
                                                    : colors.outline,
                                                  opacity: shouldDimNivel
                                                    ? 0.46
                                                    : pressed
                                                      ? 0.84
                                                      : 1,
                                                },
                                              ]}
                                            >
                                              <View style={styles.mobileNivelHeaderRow}>
                                                <View
                                                  style={[
                                                    styles.mobileNivelBadge,
                                                    {
                                                      backgroundColor:
                                                        colors.surfaceVariant,
                                                      borderColor: colors.outline,
                                                    },
                                                  ]}
                                                >
                                                  <Text
                                                    style={[
                                                      styles.mobileNivelBadgeText,
                                                      { color: colors.text },
                                                    ]}
                                                  >
                                                    {`Nível ${nivel.identificador}`}
                                                  </Text>
                                                </View>

                                                <View
                                                  style={
                                                    styles.mobileNivelHeaderActions
                                                  }
                                                >
                                                  <View
                                                    style={[
                                                      styles.mobileNivelQuantityBadge,
                                                      {
                                                        backgroundColor:
                                                          colors.surfaceVariant,
                                                        borderColor: colors.outline,
                                                      },
                                                    ]}
                                                  >
                                                    <Text
                                                      style={[
                                                        styles.mobileNivelQuantityLabel,
                                                        { color: colors.text },
                                                      ]}
                                                    >
                                                      Qtd
                                                    </Text>
                                                    <Text
                                                      style={[
                                                        styles.mobileNivelQuantityValue,
                                                        { color: colors.text },
                                                      ]}
                                                    >
                                                      {quantidadeExibida}
                                                    </Text>
                                                  </View>

                                                  <ActionIconButton
                                                    iconName="minus"
                                                    size="medium"
                                                    buttonSize={{ width: 40, height: 40 }}
                                                    borderColor={colors.outline}
                                                    backgroundColor={colors.surface}
                                                    iconColor={colors.primary}
                                                    primaryColor={colors.primary}
                                                    stopPropagation
                                                    disabled={disableRemoveNivelButton}
                                                    loading={isRemovingThisNivel}
                                                    onPress={() => {
                                                      if (disableRemoveNivelButton) {
                                                        return;
                                                      }

                                                      openConfirmRemoveNivel(
                                                        nivel,
                                                        selectedMobileFileira,
                                                        grade
                                                      );
                                                    }}
                                                  />
                                                </View>
                                              </View>

                                              <Text
                                                numberOfLines={2}
                                                ellipsizeMode="tail"
                                                style={[
                                                  styles.mobileNivelProductName,
                                                  {
                                                    color: nivelSemProduto
                                                      ? colors.primary
                                                      : colors.text,
                                                  },
                                                ]}
                                              >
                                                {produtoDisplay.text}
                                              </Text>

                                              <Text
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                                style={[
                                                  styles.mobileNivelSecondaryText,
                                                  { color: colors.text },
                                                ]}
                                              >
                                                {!nivelSemProduto && productCode !== ''
                                                  ? `CDG_WESTER ${productCode}`
                                                  : 'Toque para adicionar ou editar o produto.'}
                                              </Text>
                                            </Pressable>
                                          );
                                        })
                                      ) : (
                                        <View
                                          style={[
                                            styles.mobileEmptyGradeState,
                                            {
                                              backgroundColor: colors.surface,
                                              borderColor: colors.outline,
                                            },
                                          ]}
                                        >
                                          <Text
                                            style={[
                                              styles.mobileEmptyGradeStateTitle,
                                              { color: colors.text },
                                            ]}
                                          >
                                            Sem níveis cadastrados
                                          </Text>
                                          <Text
                                            style={[
                                              styles.mobileEmptyGradeStateText,
                                              { color: colors.text },
                                            ]}
                                          >
                                            Use o botão + da grade para criar o primeiro nível.
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                  ) : null}
                                </View>
                              );
                            })}
                          </View>

                          <Pressable
                            onPress={() => openAddGradeDecisionForFileira(selectedMobileFileira)}
                            style={({ pressed }) => [
                              styles.mobileAddStructureButton,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.primary,
                                opacity: pressed ? 0.82 : 1,
                              },
                            ]}
                          >
                            <AntDesign name="plus" size={18} color={colors.primary} />
                            <Text
                              style={[
                                styles.mobileAddStructureButtonText,
                                { color: colors.primary },
                              ]}
                            >
                              Adicionar grade nesta fileira
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </>
                  )}
                </ScrollView>
              </View>
            ) : (
              <View style={[styles.mobileWorkspace, { backgroundColor: colors.background }]}>
                <View
                  style={[styles.mobileZoomViewport, { backgroundColor: colors.background }]}
                  onLayout={(event) => {
                    const { width, height } = event.nativeEvent.layout;
                    setWarehouseViewportSize((current) =>
                      current.width === width && current.height === height
                        ? current
                        : { width, height }
                    );
                  }}
                  {...(warehousePanResponder?.panHandlers ?? {})}
                >
                  <View
                    style={[
                      styles.mobileZoomCanvas,
                      { paddingBottom: MOBILE_WAREHOUSE_BOTTOM_PADDING + safeAreaInsets.bottom },
                    ]}
                  >
                    <View
                      style={[
                        styles.mobileZoomTransform,
                        {
                          transform: [
                            { scale: warehouseZoomScale },
                            { translateX: warehousePanX },
                            { translateY: warehousePanY },
                          ],
                        },
                      ]}
                    >
                      <View
                        onLayout={(event) => {
                          const { width, height } = event.nativeEvent.layout;
                          setWarehouseContentSize((current) =>
                            current.width === width && current.height === height
                              ? current
                              : { width, height }
                          );
                        }}
                        style={styles.fileirasRowZoom}
                      >
                {fileiras.length === 0 ? (
                  <View
                    style={[
                      styles.emptyStateCardMobile,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.outline,
                      },
                    ]}
                  >
                    <AppEmptyState
                      title={API_STATE_MESSAGES.warehouse.empty.default.title}
                      description={API_STATE_MESSAGES.warehouse.empty.default.description}
                      icon="warehouse"
                      tipo="vazio"
                    />
                  </View>
                ) : null}

                {fileiras.map((fileira) => {
                  const fileiraExpanded = expandedFileiras.includes(fileira.id);
                  const isFileiraHovered = !!hoverFileira[fileira.id];

                  return (
                    <Pressable
                      key={fileira.id}
                      onPress={() => toggleFileiraExpand(fileira)}
                      style={[
                        styles.fileiraContainer,
                        { backgroundColor: colors.surface, borderColor: colors.outline },
                      ]}
                    >
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          toggleFileiraExpand(fileira);
                        }}
                        onHoverIn={() =>
                          setHoverFileira((prev) => ({ ...prev, [fileira.id]: true }))
                        }
                        onHoverOut={() =>
                          setHoverFileira((prev) => ({ ...prev, [fileira.id]: false }))
                        }
                        style={({ pressed }) => [
                          styles.fileiraHeader,
                          isFileiraHovered && styles.hoverFileira,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.fileiraTitle,
                            { color: colors.text },
                            (fileiraExpanded || isFileiraHovered) && { color: colors.primary },
                          ]}
                        >
                          Fileira {fileira.identificador}
                        </Text>

                        <AntDesign
                          name={fileiraExpanded ? 'caret-left' : 'caret-right'}
                          size={22}
                          color={
                            fileiraExpanded
                              ? colors.primary
                              : isFileiraHovered
                                ? colors.primary
                                : colors.text
                          }
                          style={isFileiraHovered ? styles.iconHover : undefined}
                        />
                      </Pressable>

                      {fileira.grades.map((grade) => {
                        const expanded = expandedGrades.includes(grade.id);
                        const isGradeHovered = !!hoverGrade[grade.id];
                        const isActiveGrade = activeGradeId === grade.id;

                        const uniqueNiveisToShow = getVisibleNiveisForGrade(
                          grade,
                          expanded,
                          searchEnabled,
                          matchedNivelIds
                        );
                        const hasAnyNivel = grade.niveis.length > 0;

                        const countForWidth = expanded
                          ? grade.niveis.length
                          : uniqueNiveisToShow.length;
                        const width =
                          countForWidth <= 1
                            ? baseGradeWidth
                            : baseGradeWidth + Math.max(0, countForWidth - 1) * perNivelWidth;

                        return (
                          <View key={grade.id} style={styles.gradeWrapper}>
                            <View style={[styles.gradeInner, { width }]}>
                              <Pressable
                                onPress={(event) => {
                                  event.stopPropagation();
                                  handleGradePress(grade);
                                }}
                                onHoverIn={() =>
                                  setHoverGrade((prev) => ({ ...prev, [grade.id]: true }))
                                }
                                onHoverOut={() =>
                                  setHoverGrade((prev) => ({ ...prev, [grade.id]: false }))
                                }
                                style={({ pressed }) => [
                                  styles.gradeContainer,
                                  { backgroundColor: colors.surface, borderColor: colors.outline },
                                  (isGradeHovered || isActiveGrade) && [
                                    styles.gradeActive,
                                    { borderColor: colors.primary, shadowColor: colors.primary },
                                  ],
                                  pressed && { opacity: 0.8 },
                                ]}
                              >
                                <View style={styles.gradeHeader}>
                                  <View style={styles.gradeHeaderTop}>
                                    <Text
                                      numberOfLines={1}
                                      ellipsizeMode="tail"
                                      style={[
                                        styles.gradeTitle,
                                        { color: colors.text },
                                        (isGradeHovered || isActiveGrade) && {
                                          color: colors.primary,
                                        },
                                      ]}
                                    >
                                      {formatGradeLabel(grade.identificador)}
                                    </Text>

                                    <AntDesign
                                      name={expanded ? 'caret-left' : 'caret-right'}
                                      size={20}
                                      color={
                                        expanded && isActiveGrade
                                          ? colors.primary
                                          : isGradeHovered
                                            ? colors.primary
                                            : colors.text
                                      }
                                      style={isGradeHovered ? styles.iconHover : undefined}
                                    />
                                  </View>

                                  <View style={styles.gradeControls}>
                                    <Pressable
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        openAddLevelDecisionForGrade(fileira, grade);
                                      }}
                                      style={[styles.addButton, { borderColor: colors.outline }]}
                                    >
                                      <AntDesign name="plus" size={16} color={colors.primary} />
                                    </Pressable>

                                    <Pressable
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        removerUltimoNivel(fileira.id, grade);
                                      }}
                                      disabled={
                                        removingGradeId === grade.id || grade.niveis.length <= 1
                                      }
                                      style={[
                                        styles.addButton,
                                        { borderColor: colors.outline },
                                        (removingGradeId === grade.id ||
                                          grade.niveis.length <= 1) && { opacity: 0.5 },
                                      ]}
                                    >
                                      {removingGradeId === grade.id ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                      ) : (
                                        <AntDesign name="minus" size={16} color={colors.primary} />
                                      )}
                                    </Pressable>
                                  </View>
                                </View>

                                <View style={styles.niveisRow}>
                                  {hasAnyNivel ? (
                                    uniqueNiveisToShow.map((nivel) => {
                                      const isNivelHovered = !!hoverNivel[nivel.id];
                                      const quantidadeExibida =
                                        typeof nivel.quantidade === 'number' ? nivel.quantidade : 0;
                                      const produtoDisplay = getNivelProductDisplay(nivel);
                                      const produtoExibido = produtoDisplay.text;
                                      const nivelSemProduto = produtoDisplay.empty;

                                      const isMatch =
                                        searchEnabled && matchedNivelIds.has(nivel.id);
                                      const shouldDim = searchEnabled && !isMatch;

                                      return (
                                        <Pressable
                                          key={nivel.id}
                                          onPress={() => handleNivelClick(fileira, grade, nivel)}
                                          onHoverIn={() =>
                                            setHoverNivel((prev) => ({ ...prev, [nivel.id]: true }))
                                          }
                                          onHoverOut={() =>
                                            setHoverNivel((prev) => ({
                                              ...prev,
                                              [nivel.id]: false,
                                            }))
                                          }
                                          style={[
                                            styles.nivelBox,
                                            {
                                              backgroundColor: colors.surface,
                                              borderColor: colors.outline,
                                            },
                                            isNivelHovered && [
                                              styles.nivelHover,
                                              {
                                                borderColor: colors.primary,
                                                shadowColor: colors.primary,
                                              },
                                            ],
                                            isMatch && [
                                              styles.nivelMatch,
                                              { borderColor: colors.primary },
                                            ],
                                            shouldDim && styles.nivelDim,
                                          ]}
                                        >
                                          <ActionIconButton
                                            iconName="minus"
                                            size="small"
                                            disabled={resequenceNivelId === nivel.id}
                                            loading={resequenceNivelId === nivel.id}
                                            borderColor={colors.outline}
                                            backgroundColor={colors.surface}
                                            iconColor={colors.primary}
                                            primaryColor={colors.primary}
                                            stopPropagation
                                            onPress={() => {
                                              openConfirmRemoveNivel(nivel, fileira, grade);
                                            }}
                                            style={styles.nivelRemoveButton}
                                          />

                                          <View style={styles.nivelContent}>
                                            <Text
                                              style={[
                                                styles.nivelText,
                                                { color: colors.text },
                                                isNivelHovered && { color: colors.primary },
                                              ]}
                                              numberOfLines={1}
                                              ellipsizeMode="tail"
                                            >
                                              {nivel.identificador}
                                            </Text>

                                            <View style={styles.nivelProdutoSlot}>
                                              <Text
                                                style={[
                                                  styles.produto,
                                                  nivelSemProduto
                                                    ? styles.produtoVazio
                                                    : { color: colors.text },
                                                  !nivelSemProduto &&
                                                    isNivelHovered && { color: colors.primary },
                                                ]}
                                                numberOfLines={2}
                                                ellipsizeMode="tail"
                                              >
                                                {produtoExibido}
                                              </Text>
                                            </View>

                                            <Text
                                              style={[
                                                styles.qtd,
                                                { color: colors.text },
                                                isNivelHovered && { color: colors.primary },
                                              ]}
                                              numberOfLines={1}
                                              ellipsizeMode="tail"
                                            >
                                              Qtd: {quantidadeExibida}
                                            </Text>
                                          </View>
                                        </Pressable>
                                      );
                                    })
                                  ) : (
                                    <View
                                      style={[
                                        styles.nivelBox,
                                        { borderStyle: 'dashed', borderColor: colors.outline },
                                      ]}
                                    >
                                      <View
                                        style={[
                                          styles.nivelContent,
                                          styles.nivelPlaceholderContent,
                                        ]}
                                      >
                                        <Text
                                          style={[styles.nivelText, { color: colors.text }]}
                                          numberOfLines={1}
                                          ellipsizeMode="tail"
                                        >
                                          SEM NÍVEIS
                                        </Text>
                                        <Text
                                          style={[styles.qtd, { color: colors.text }]}
                                          numberOfLines={1}
                                          ellipsizeMode="tail"
                                        >
                                          Clique no +
                                        </Text>
                                      </View>
                                    </View>
                                  )}
                                </View>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}

                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          openAddGradeDecisionForFileira(fileira);
                        }}
                        style={[styles.addGradeButton, { borderColor: colors.primary }]}
                      >
                        <AntDesign name="plus" size={22} color={colors.primary} />
                      </Pressable>
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={addNewFileira}
                  disabled={creatingFileira}
                  style={[
                    styles.addFileiraButton,
                    { borderColor: colors.primary, opacity: creatingFileira ? 0.6 : 1 },
                  ]}
                >
                  {creatingFileira ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <AntDesign name="plus" size={26} color={colors.primary} />
                  )}
                  <Text style={[styles.addFileiraButtonText, { color: colors.primary }]}>
                    Adicionar Fileira
                  </Text>
                </Pressable>
                      </View>
                    </View>
                  </View>

                  <View
                    pointerEvents="box-none"
                    style={[
                      styles.mobileZoomControls,
                      { bottom: 14 + safeAreaInsets.bottom },
                    ]}
                  >
                    <Pressable
                      onPress={handleWarehouseZoomIn}
                      disabled={warehouseZoomScale >= MAX_WAREHOUSE_SCALE - 0.01}
                      style={({ pressed }) => [
                        styles.mobileZoomButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.outline,
                          opacity:
                            warehouseZoomScale >= MAX_WAREHOUSE_SCALE - 0.01
                              ? 0.5
                              : pressed
                                ? 0.84
                                : 1,
                        },
                      ]}
                    >
                      <AntDesign name="plus" size={20} color={colors.primary} />
                    </Pressable>

                    <Pressable
                      onPress={handleWarehouseZoomOut}
                      disabled={warehouseZoomScale <= MIN_WAREHOUSE_SCALE + 0.01}
                      style={({ pressed }) => [
                        styles.mobileZoomButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.outline,
                          opacity:
                            warehouseZoomScale <= MIN_WAREHOUSE_SCALE + 0.01
                              ? 0.5
                              : pressed
                                ? 0.84
                                : 1,
                        },
                      ]}
                    >
                      <AntDesign name="minus" size={20} color={colors.primary} />
                    </Pressable>

                    <Pressable
                      onPress={resetWarehouseViewport}
                      disabled={
                        Math.abs(warehouseZoomScale - defaultWarehouseScale) < 0.01 &&
                        Math.abs(warehousePanX) < 1 &&
                        Math.abs(warehousePanY) < 1
                      }
                      style={({ pressed }) => [
                        styles.mobileZoomButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.outline,
                          opacity:
                            Math.abs(warehouseZoomScale - defaultWarehouseScale) < 0.01 &&
                            Math.abs(warehousePanX) < 1 &&
                            Math.abs(warehousePanY) < 1
                              ? 0.5
                              : pressed
                                ? 0.84
                                : 1,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="fit-to-screen-outline"
                        size={20}
                        color={colors.primary}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        <SearchResultsModal
          visible={searchResultsVisible}
          searchEnabled={searchEnabled}
          query={debouncedSearchText}
          results={searchResults}
          surfaceColor={colors.surface}
          outlineColor={colors.outline}
          backgroundColor={colors.background}
          primaryColor={colors.primary}
          textColor={colors.text}
          onClose={() => setSearchResultsVisible(false)}
          onSelect={focusOnResult}
        />

        <RemoveLevelDecisionModal
          visible={confirmRemoveVisible}
          targetLabel={pendingRemoveNivel?.label ?? 'Nível selecionado'}
          selectedDecision={pendingRemoveDecision}
          onSelectDecision={setPendingRemoveDecision}
          loading={Boolean(resequenceNivelId)}
          primaryColor={colors.primary}
          surfaceColor={colors.surface}
          surfaceVariantColor={colors.surfaceVariant}
          outlineColor={colors.outline}
          textColor={colors.text}
          secondaryTextColor={colors.onSurfaceVariant}
          onCancel={closeConfirmRemoveNivel}
          onConfirm={confirmRemoveNivel}
        />

        <WarehouseItemDetailsModal
          visible={productModalVisible && productModalOrigin !== 'direct' && nivelHasLinkedProduct}
          title={selectedNivelCtx?.label ?? 'Produto'}
          details={{
            nomeModelo: currentNivelItemDetails.nomeModelo,
            quantidade: currentNivelItemDetails.quantidade,
            codigo: currentNivelItemDetails.codigo,
            cor: currentNivelItemDetails.cor,
            descricao: currentNivelItemDetails.descricao,
          }}
          empty={!nivelHasLinkedProduct}
          loading={itemLoading}
          onClose={closeProductModal}
          onEdit={nivelHasLinkedProduct ? openProductEditModal : undefined}
          onAddProduct={!nivelHasLinkedProduct ? openProductEditModal : undefined}
          primaryColor={colors.primary}
          surfaceColor={colors.surface}
          outlineColor={colors.outline}
          textColor={colors.text}
          secondaryTextColor={colors.onSurfaceVariant}
        />

        <WarehouseItemFormModal
          visible={productEditModalVisible || (productModalOrigin === 'direct' && selectedNivelIsEmpty)}
          title={selectedNivelCtx?.label ?? 'Editar produto'}
          values={{
            nomeModelo: editNomeModelo,
            quantidade: editQuantidade,
            codigo: editCodigo,
            cor: editCor,
            descricao: editDescricao,
          }}
          onChangeQuantidade={setEditQuantidade}
          onSelectProduct={() => {
            void openEditProductPickerModal();
          }}
          onClose={closeProductEditModal}
          onSubmit={openConfirmSave}
          loading={productModalOrigin === 'details' ? itemLoading : false}
          submitLoading={saving}
          submitDisabled={!isDirty || saving || editProductId == null}
          closeLabel="Voltar"
          submitLabel="Salvar"
          titleNumberOfLines={1}
          primaryColor={colors.primary}
          surfaceColor={colors.surface}
          outlineColor={colors.outline}
          textColor={colors.text}
          secondaryTextColor={colors.onSurfaceVariant}
        />

        <ConfirmActionModal
          visible={confirmSaveVisible}
          title="Salvar alterações?"
          message="Você tem certeza que deseja salvar as alterações deste produto?"
          confirmText="Salvar"
          surfaceColor={colors.surface}
          outlineColor={colors.outline}
          textColor={colors.text}
          confirmColor={colors.primary}
          confirmLoading={saving}
          confirmDisabled={saving}
          onCancel={closeConfirmSave}
          onConfirm={saveEdits}
        />

        <AddGradeLevelDecisionModal
          visible={addLevelDecisionVisible}
          title="Deseja adicionar produto à grade?"
          message={
            pendingStructureCtx
              ? `Escolha como deseja criar ${pendingStructureCtx.label}.`
              : 'Escolha como deseja criar o novo nível.'
          }
          loading={structureCreationLoading}
          onCancel={closeAddLevelDecision}
          onConfirmWithProduct={() => {
            void openSelectGradeProductModal();
          }}
          onConfirmWithoutProduct={confirmAddLevelWithoutProduct}
          primaryColor={colors.primary}
          surfaceColor={colors.surface}
          outlineColor={colors.outline}
          textColor={colors.text}
        />

        <SelectGradeProductModal
          visible={selectGradeProductVisible}
          title={pendingStructureCtx?.label ?? 'Selecionar produto'}
          search={productFilter}
          quantity={productQuantityInput}
          products={filteredActiveProducts}
          selectedProductId={selectedProductId}
          loading={activeProductsLoading}
          confirming={structureCreationLoading}
          validationMessage={addLevelProductValidationMessage}
          confirmDisabled={isAddLevelProductSubmitDisabled}
          onSearchChange={setProductFilter}
          onQuantityChange={(value) => {
            setProductQuantityInput(value.replace(/[^\d]/g, ''));
          }}
          onSelectProduct={setSelectedProductId}
          onClose={closeSelectGradeProductModal}
          onConfirm={confirmAddLevelWithSelectedProduct}
          primaryColor={colors.primary}
          surfaceColor={colors.surface}
          surfaceVariantColor={colors.surfaceVariant}
          outlineColor={colors.outline}
          textColor={colors.text}
          secondaryTextColor={colors.onSurfaceVariant}
        />

        <SelectGradeProductModal
          visible={editProductPickerVisible}
          title={selectedNivelCtx?.label ?? 'Selecionar produto'}
          search={editProductFilter}
          quantity=""
          products={filteredEditProducts}
          selectedProductId={pendingEditProductId}
          showQuantityField={false}
          confirmLabel="Selecionar"
          loading={activeProductsLoading}
          validationMessage={editProductSelectionValidationMessage}
          confirmDisabled={pendingEditProductId == null}
          onSearchChange={setEditProductFilter}
          onQuantityChange={() => {}}
          onSelectProduct={setPendingEditProductId}
          onClose={closeEditProductPickerModal}
          onConfirm={confirmEditProductSelection}
          primaryColor={colors.primary}
          surfaceColor={colors.surface}
          surfaceVariantColor={colors.surfaceVariant}
          outlineColor={colors.outline}
          textColor={colors.text}
          secondaryTextColor={colors.onSurfaceVariant}
        />

        <FeedbackModal
          visible={successVisible}
          title="Sucesso"
          message={successMessage}
          accentColor={successColor}
          surfaceColor={colors.surface}
          textColor={colors.text}
          onClose={() => setSuccessVisible(false)}
          messageNumberOfLines={1}
        />

        <FeedbackModal
          visible={errorVisible}
          title="Erro"
          message={errorMessage}
          accentColor={errorColor}
          surfaceColor={colors.surface}
          textColor={colors.text}
          onClose={() => setErrorVisible(false)}
        />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  mobileWorkspace: {
    flex: 1,
    minHeight: 0,
    paddingTop: 8,
  },
  mobileLayoutScroll: {
    flex: 1,
    minHeight: 0,
  },
  mobileLayoutContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingBottom: 28,
    gap: 14,
  },
  mobileEmptyStateWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 14,
    paddingTop: 18,
  },
  mobileFileiraSelectorSection: {
    gap: 10,
    paddingTop: 12,
  },
  mobileSectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  mobileFileiraChipList: {
    gap: 8,
    paddingRight: 6,
  },
  mobileFileiraChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileFileiraChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  mobileAddFileiraChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mobileAddFileiraChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  mobileFileiraPanel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  mobileFileiraPanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  mobileFileiraPanelHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  mobileFileiraPanelEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  mobileFileiraPanelTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  mobileFileiraPanelMeta: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.82,
  },
  mobileGradeAccordionList: {
    gap: 10,
  },
  mobileGradeAccordionItem: {
    gap: 8,
  },
  mobileGradeAccordionHeader: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileGradeAccordionHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  mobileGradeAccordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileGradeAccordionTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    fontWeight: '800',
  },
  mobileGradeAccordionSummary: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.78,
  },
  mobileGradeCountBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mobileGradeCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  mobileGradeAccordionHeaderActions: {
    alignItems: 'center',
    gap: 8,
  },
  mobileGradeAccordionCaret: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileGradeAccordionBody: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  mobileNivelCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  mobileNivelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  mobileNivelBadge: {
    flexShrink: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mobileNivelBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  mobileNivelHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  mobileNivelQuantityBadge: {
    minWidth: 62,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  mobileNivelQuantityLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  mobileNivelQuantityValue: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  mobileNivelProductName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  mobileNivelSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.76,
  },
  mobileEmptyGradeState: {
    borderWidth: 1,
    borderRadius: 14,
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    paddingVertical: 18,
    gap: 6,
  },
  mobileEmptyGradeStateTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  mobileEmptyGradeStateText: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.8,
  },
  mobileAddStructureButton: {
    minHeight: 48,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mobileAddStructureButtonText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  mobileZoomViewport: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  mobileZoomCanvas: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: MOBILE_WAREHOUSE_PADDING,
    paddingBottom: MOBILE_WAREHOUSE_BOTTOM_PADDING,
  },
  mobileZoomTransform: {
    flexGrow: 0,
    flexShrink: 0,
  },
  mobileZoomControls: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    alignItems: 'stretch',
    gap: 10,
    zIndex: 5,
  },
  mobileZoomButton: {
    width: MOBILE_ZOOM_BUTTON_SIZE,
    height: MOBILE_ZOOM_BUTTON_SIZE,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  initialLoadingWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  initialLoadingState: {
    minHeight: 220,
  },

  headerBar: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },

  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },

  searchPillText: {
    fontWeight: '900',
    fontSize: 13,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 360,
    maxWidth: 560,
    flexShrink: 1,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontWeight: '700',
    fontSize: 13,
  },

  searchInputWeb: IS_WEB
    ? ({
        outlineStyle: 'none',
        outlineWidth: 0,
        borderWidth: 0,
        backgroundColor: 'transparent',
      } as any)
    : ({} as any),

  searchIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchCount: {
    minWidth: 36,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  searchCountText: {
    fontWeight: '900',
    fontSize: 13,
  },

  webSearchBar: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  webSearchBarCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },

  searchBoxCompact: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    minHeight: 38,
    paddingVertical: 7,
  },

  searchBoxCompactTight: {
    paddingHorizontal: 8,
    gap: 6,
  },

  searchInputTight: {
    fontSize: 12,
    fontWeight: '600',
  },

  webSearchRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  webSearchIconButtonCompact: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  webSearchButtonText: {
    fontWeight: '900',
    fontSize: 13,
  },

  webSearchHintCompact: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.78,
    paddingHorizontal: 2,
  },

  webSearchHint: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.85,
  },

  webWorkspace: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    ...(IS_WEB
      ? ({
          backgroundImage:
            'linear-gradient(rgba(139,105,20,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(139,105,20,0.035) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        } as any)
      : null),
  },

  webScroller: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: 'auto' as any,
    ...(IS_WEB
      ? ({
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        } as any)
      : null),
  },

  webContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    gap: 8,
    margin: 0,
    padding: 0,
  },

  emptyStateCard: {
    width: 320,
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 18,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },

  webSearchIconButtonCompactTight: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },

  verticalContent: {
    flexGrow: 1,
    paddingVertical: 12,
    paddingBottom: 24,
    ...(IS_WEB
      ? ({
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        } as any)
      : null),
  },

  fileirasRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    gap: 8,
    margin: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  fileirasRowZoom: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    margin: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 28,
    alignSelf: 'flex-start',
  },

  emptyStateCardMobile: {
    width: 280,
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 18,
    justifyContent: 'center',
  },

  fileiraContainer: {
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    borderWidth: 1,
    flexShrink: 0,
    flexGrow: 0,
    minWidth: IS_WEB ? 0 : 160,
    overflow: 'hidden',
    display: 'flex',
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },

    ...(IS_WEB
      ? ({
          transitionProperty: 'transform, box-shadow, background-color, border-color',
          transitionDuration: '120ms',
          transitionTimingFunction: 'ease-out',
        } as any)
      : null),
  },

  fileiraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  fileiraHover: IS_WEB
    ? ({
        boxShadow: '0 8px 18px rgba(0,0,0,0.10)',
      } as any)
    : ({
        shadowOpacity: 0.16,
        shadowRadius: 6,
        elevation: 4,
      } as any),

  hoverFileira: {},
  fileiraTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  iconHover: { transform: [{ scale: 1.2 }] },

  gradeAnimated: {
    overflow: 'visible',
    marginBottom: 12,
  },

  gradeContainer: {
    width: '100%',
    minWidth: 140,
    minHeight: 170,
    borderRadius: 10,
    padding: 9,
    borderWidth: 1,
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  gradeExpanded: {
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 2,
  },

  gradeHover: {
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,

    ...(IS_WEB
      ? ({
          transform: [{ scale: 1.03 }],
          boxShadow: '0 6px 14px rgba(0,0,0,0.12)',
        } as any)
      : null),
  },

  gradeActive: {
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },

  gradeHeader: { width: '100%', flexDirection: 'column', gap: 6 },

  gradeHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  gradeTitle: {
    fontSize: IS_WEB ? 16 : 13,
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,

    ...(IS_WEB
      ? ({
          whiteSpace: 'nowrap',
        } as any)
      : null),
  },

  gradeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
    marginTop: 2,
  },

  addButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },

  niveisRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 6,
  },

  nivelBox: {
    width: IS_WEB ? 110 : 130,
    height: 104,
    minHeight: 104,
    maxHeight: 104,
    minWidth: IS_WEB ? 110 : 130,
    maxWidth: IS_WEB ? 110 : 130,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    borderRadius: 8,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  nivelMatch: {
    borderWidth: 2,
  },

  nivelDim: {
    opacity: 0.28,
  },

  nivelRemoveButton: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },

  nivelHover: {
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,

    ...(IS_WEB
      ? ({
          transform: [{ scale: 1.04 }],
          boxShadow: '0 5px 12px rgba(0,0,0,0.14)',
        } as any)
      : null),
  },

  nivelContent: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  nivelPlaceholderContent: {
    justifyContent: 'center',
    gap: 4,
    paddingTop: 0,
  },
  nivelProdutoSlot: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    minHeight: 34,
    maxHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  nivelText: {
    width: '100%',
    textAlign: 'center',
    fontWeight: 'bold',
    paddingHorizontal: 16,
  },
  produto: {
    width: '100%',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: 600,
    overflow: 'hidden',
  },
  produtoVazio: {
    color: '#999999',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  qtd: {
    width: '100%',
    fontSize: 12,
    color: '#333',
    fontWeight: 600,
    textAlign: 'center',
  },

  gradeWrapper: {
    width: '100%',
    overflow: IS_WEB ? 'visible' : 'hidden',
  },

  gradeInner: {
    flexGrow: 0,
    flexShrink: 0,
  },

  addGradeButton: {
    width: '100%',
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    alignSelf: 'stretch',
  },

  nivelRemoveButtonDisabled: {
    opacity: 0.35,
  },

  addFileiraButton: {
    width: 164,
    minWidth: 164,
    height: 230,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },

  addFileiraButtonText: {
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
});
