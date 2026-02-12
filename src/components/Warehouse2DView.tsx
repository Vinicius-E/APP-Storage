import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemeContext } from '../theme/ThemeContext';
import QuantityStepper from './QuantityStepper';
import { AddGradeNivelButton } from './AddGradeNivelButton';
import { AddFileiraButton } from './AddFileiraButton';
import { ActionIconButton } from './IconActionButton';
import { API } from '../../axios';
import { AuthProvider } from '../auth/AuthContext';
import { useWarehouseSearch } from '../search/WarehouseSearchContext';

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

type CreatedNivel = { id: number; identificador: string; ordem?: number };
type CreatedGrade = { id: number; identificador: string; ordem?: number };

const IS_WEB = Platform.OS === 'web';

type SelectedGradeCtx = {
  fileiraId: number;
  gradeId?: number;
  label: string;

  nextNivelIdentificador: string;
  nextNivelOrdem: number;

  nextGradeIdentificador?: string;
  nextGradeOrdem?: number;
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

export default function Warehouse2DView() {
  const { width: screenWidth } = useWindowDimensions();
  const [fileiras, setFileiras] = useState<Fileira[]>([]);
  const [creatingFileira, setCreatingFileira] = useState(false);
  const [expandedGrades, setExpandedGrades] = useState<number[]>([]);
  const [expandedFileiras, setExpandedFileiras] = useState<number[]>([]);
  const [hoverFileira, setHoverFileira] = useState<Record<number, boolean>>({});
  const [hoverGrade, setHoverGrade] = useState<Record<number, boolean>>({});
  const [hoverNivel, setHoverNivel] = useState<Record<number, boolean>>({});
  const [activeGradeId, setActiveGradeId] = useState<number | null>(null);

  const [creatingGradeId, setCreatingGradeId] = useState<number | null>(null);
  const [removingGradeId, setRemovingGradeId] = useState<number | null>(null);
  const [resequenceNivelId, setResequenceNivelId] = useState<number | null>(null);

  const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);
  const [pendingRemoveNivel, setPendingRemoveNivel] = useState<{
    id: number;
    label: string;
  } | null>(null);

  const [productModalVisible, setProductModalVisible] = useState(false);
  const [selectedNivelCtx, setSelectedNivelCtx] = useState<{
    fileiraId: number;
    gradeId: number;
    nivelId: number;
    label: string;
    nivel: Nivel;
  } | null>(null);

  const [itemLoading, setItemLoading] = useState(false);
  const [itemEstoque, setItemEstoque] = useState<ItemEstoque | null>(null);

  const [editQuantidade, setEditQuantidade] = useState<number>(1);
  const [editCodigo, setEditCodigo] = useState<string>('');
  const [editCor, setEditCor] = useState<string>('');
  const [editNomeModelo, setEditNomeModelo] = useState<string>('');
  const [editDescricao, setEditDescricao] = useState<string>('');

  const [confirmSaveVisible, setConfirmSaveVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [selectedGradeCtx, setSelectedGradeCtx] = useState<SelectedGradeCtx | null>(null);

  const [addLoading, setAddLoading] = useState(false);
  const [addQuantidade, setAddQuantidade] = useState<number>(1);
  const [addCodigo, setAddCodigo] = useState<string>('');
  const [addCor, setAddCor] = useState<string>('');
  const [addNomeModelo, setAddNomeModelo] = useState<string>('');
  const [addDescricao, setAddDescricao] = useState<string>('');

  const [addGradeModalVisible, setAddGradeModalVisible] = useState(false);
  const [selectedFileiraCtx, setSelectedFileiraCtx] = useState<{
    fileiraId: number;
    fileiraIdentificador: string;
    label: string;
    suggestedGradeIdentificador: string;
    suggestedGradeOrdem: number;
  } | null>(null);

  const [addGradeLoading, setAddGradeLoading] = useState(false);
  const [addGradeQuantidade, setAddGradeQuantidade] = useState<number>(1);
  const [addGradeCodigo, setAddGradeCodigo] = useState<string>('');
  const [addGradeCor, setAddGradeCor] = useState<string>('');
  const [addGradeNomeModelo, setAddGradeNomeModelo] = useState<string>('');
  const [addGradeDescricao, setAddGradeDescricao] = useState<string>('');
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // ✅ SEARCH (HEADER)
  const { searchText, setSearchText } = useWarehouseSearch();
  const [searchOpen, setSearchOpen] = useState(false);
  //const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [searchResultsVisible, setSearchResultsVisible] = useState(false);
  const [focusedNivelId, setFocusedNivelId] = useState<number | null>(null);
  const searchInputRef = useRef<TextInput | null>(null);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setSuccessVisible(true);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorVisible(true);
  };

  const extractErrorMessage = (error: any, fallback: string) => {
    const apiMsg =
      error?.response?.data?.message ??
      error?.response?.data?.error ??
      error?.response?.data ??
      error?.message;

    const msg = String(apiMsg ?? '').trim();
    return msg !== '' ? msg : fallback;
  };

  const { theme } = useThemeContext();
  const colors = theme.colors;
  const successColor = '#2E7D32';
  const errorColor = '#C62828';

  const baseGradeWidth = 110;
  const perNivelWidth = 96;

  const AREA_ID = 1;

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

  const openAddItemModalForNewGrade = (fileira: Fileira) => {
    const nextGrade = computeNextGradeForFileira(fileira);
    const label = `Inserir item - Fileira ${fileira.identificador} - Grade ${nextGrade.identificador} - Nível N1`;

    setSelectedGradeCtx({
      fileiraId: fileira.id,
      gradeId: undefined,
      label,
      nextNivelIdentificador: 'N1',
      nextNivelOrdem: 1,
      nextGradeIdentificador: nextGrade.identificador,
      nextGradeOrdem: nextGrade.ordem,
    });

    setAddQuantidade(1);
    setAddCodigo('');
    setAddCor('');
    setAddNomeModelo('');
    setAddDescricao('');
    setAddItemModalVisible(true);
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

  const fetchAllData = async () => {
    try {
      const res = await API.get<EstoquePosicao[]>(`/estoque/posicoes/area/${AREA_ID}`);
      const rows = res.data ?? [];

      const fileiraMap = new Map<number, Fileira>();

      for (const r of rows) {
        if (!fileiraMap.has(r.fileiraId)) {
          fileiraMap.set(r.fileiraId, {
            id: r.fileiraId,
            identificador: r.fileiraIdentificador,
            grades: [],
          });
        }

        const fileira = fileiraMap.get(r.fileiraId)!;

        if (r.gradeId == null) {
          continue;
        }

        let grade = fileira.grades.find((g) => g.id === r.gradeId);
        if (!grade) {
          grade = {
            id: r.gradeId,
            identificador: r.gradeIdentificador ?? '',
            ordem: (r as any).gradeOrdem,
            niveis: [],
          };
          fileira.grades.push(grade);
        }

        if (r.nivelId == null) {
          continue;
        }

        const produtoNormalizado: Produto | null =
          r.produto ??
          (r.produtoId
            ? {
                id: r.produtoId,
                codigoSistemaWester: (r.codigoSistemaWester ?? '').toString(),
                nomeModelo: (r.nomeModelo ?? '').toString(),
                cor: (r.cor ?? '').toString(),
                descricao: (r.descricao ?? '').toString(),
              }
            : null);

        const produtoNomeModeloNormalizado =
          (produtoNormalizado?.nomeModelo ?? '').trim() !== ''
            ? produtoNormalizado?.nomeModelo
            : undefined;

        grade.niveis.push({
          id: r.nivelId,
          identificador: r.nivelIdentificador,
          ordem: r.nivelOrdem,
          itemEstoqueId: r.itemEstoqueId ?? null,
          quantidade: typeof r.quantidade === 'number' ? r.quantidade : 0,
          produto: produtoNormalizado,
          produtoNomeModelo: produtoNomeModeloNormalizado,
        });
      }

      const fileirasOrdenadas = Array.from(fileiraMap.values()).map((f) => ({
        ...f,
        grades: f.grades
          .sort((a, b) => parseGradeOrder(a) - parseGradeOrder(b))
          .map((g) => ({
            ...g,
            niveis: [...g.niveis].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
          })),
      }));

      setFileiras(fileirasOrdenadas);
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data ?? 'Não foi possível carregar o mapa do estoque.');
    }
  };

  useEffect(() => {
    void fetchAllData();
  }, []);

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

  const criarNivel = async (_fileiraId: number, grade: Grade) => {
    const { identificador, ordem } = computeNextNivelForGrade(grade);
    setCreatingGradeId(grade.id);

    try {
      await API.post(`/niveis/grade/${grade.id}`, {
        identificador,
        ordem,
        grade: { id: grade.id },
      });

      await fetchAllData();
      setExpandedGrades((prev) => (prev.includes(grade.id) ? prev : [...prev, grade.id]));
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data ?? 'Não foi possível criar o nível.');
    } finally {
      setCreatingGradeId(null);
    }
  };

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
  ) => {
    setResequenceNivelId(nivelId);

    try {
      const temItem = (nivel.itemEstoqueId ?? null) !== null;

      if (temItem) {
        let deleteOk = false;

        try {
          await API.delete(`/itens-estoque/nivel/${nivelId}`);
          deleteOk = true;
        } catch (errorDelete: any) {
          const status = errorDelete?.response?.status;

          if (status !== 404 && status !== 405) {
            throw errorDelete;
          }
        }

        if (!deleteOk) {
          const nomeModelo =
            (nivel.produto?.nomeModelo ?? nivel.produtoNomeModelo ?? '').trim() !== ''
              ? (nivel.produto?.nomeModelo ?? nivel.produtoNomeModelo ?? '').trim()
              : 'SEM_NOME';

          const cor =
            (nivel.produto?.cor ?? '').trim() !== ''
              ? (nivel.produto?.cor ?? '').trim()
              : 'SEM_COR';

          const codigoSistemaWester = (nivel.produto?.codigoSistemaWester ?? '').toString();
          const descricao = (nivel.produto?.descricao ?? '').toString();

          await API.put(`/itens-estoque/nivel/${nivelId}`, {
            quantidade: 0,
            produto: {
              codigoSistemaWester,
              cor,
              nomeModelo,
              descricao,
            },
          });
        }
      }

      const res = await API.delete<any>(`/niveis/${nivelId}/resequence`);
      const dto = res?.data;

      if (dto && typeof dto.gradeId === 'number' && Array.isArray(dto.niveis)) {
        resequenceGradeLocal(fileiraId, gradeId, dto.niveis);
      } else {
        await fetchAllData();
      }

      setExpandedFileiras((prev) => (prev.includes(fileiraId) ? prev : [...prev, fileiraId]));
      setExpandedGrades((prev) => (prev.includes(gradeId) ? prev : [...prev, gradeId]));
      setActiveGradeId(gradeId);
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.response?.data ?? 'Não foi possível remover/resequenciar o nível.'
      );
    } finally {
      setResequenceNivelId(null);
    }
  };

  const openConfirmRemoveNivel = (nivel: Nivel, fileira: Fileira, grade: Grade) => {
    const label = `Fileira ${fileira.identificador} - Grade ${grade.identificador} - Nível ${nivel.identificador}`;
    setPendingRemoveNivel({ id: nivel.id, label });

    setSelectedNivelCtx({
      fileiraId: fileira.id,
      gradeId: grade.id,
      nivelId: nivel.id,
      label,
      nivel,
    });

    setConfirmRemoveVisible(true);
  };

  const closeConfirmRemoveNivel = () => {
    setConfirmRemoveVisible(false);
    setPendingRemoveNivel(null);
  };

  const confirmRemoveNivel = async () => {
    if (!selectedNivelCtx?.nivel) {
      closeConfirmRemoveNivel();
      return;
    }

    await deleteAndResequenceLocal(
      selectedNivelCtx.fileiraId,
      selectedNivelCtx.gradeId,
      selectedNivelCtx.nivelId,
      selectedNivelCtx.nivel
    );

    closeConfirmRemoveNivel();
  };

  const handleGradePress = (grade: Grade) => {
    const isCurrentlyExpanded = expandedGrades.includes(grade.id);
    setActiveGradeId(isCurrentlyExpanded ? null : grade.id);
    toggleGradeExpand(grade);
  };

  const resetProductForm = () => {
    setItemEstoque(null);
    setEditQuantidade(1);
    setEditCodigo('');
    setEditCor('');
    setEditNomeModelo('');
    setEditDescricao('');
  };

  const closeProductModal = () => {
    setProductModalVisible(false);
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
      const res = await API.get<any>(`/itens-estoque/nivel/${nivelId}`);
      const dto = normalizeItemEstoqueResponse(res.data);

      if (!dto) {
        resetProductForm();
        return;
      }

      setItemEstoque(dto);

      setEditQuantidade(typeof dto.quantidade === 'number' ? dto.quantidade : 1);
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
    const label = `Fileira ${fileira.identificador} - Grade ${grade.identificador} - Nível ${nivel.identificador}`;

    setSelectedNivelCtx({
      fileiraId: fileira.id,
      gradeId: grade.id,
      nivelId: nivel.id,
      label,
      nivel,
    });

    resetProductForm();
    setProductModalVisible(true);
  };

  useEffect(() => {
    if (!productModalVisible || !selectedNivelCtx) {
      return;
    }
    void loadItemEstoque(selectedNivelCtx.nivelId);
  }, [productModalVisible, selectedNivelCtx, loadItemEstoque]);

  const isDirty = useMemo(() => {
    if (!itemEstoque) {
      return (
        editQuantidade !== 1 ||
        editCodigo.trim() !== '' ||
        editCor.trim() !== '' ||
        editNomeModelo.trim() !== '' ||
        editDescricao.trim() !== ''
      );
    }

    const baseQtd = typeof itemEstoque.quantidade === 'number' ? itemEstoque.quantidade : 0;
    const baseNomeModelo = itemEstoque.produtoNomeModelo ?? '';
    const baseCodigo = itemEstoque.produtoCodigoWester ?? '';
    const baseCor = itemEstoque.produtoCor ?? '';
    const baseDescricao = itemEstoque.produtoDescricao ?? '';

    return (
      baseQtd !== editQuantidade ||
      baseNomeModelo !== editNomeModelo ||
      baseCodigo !== editCodigo ||
      baseCor !== editCor ||
      baseDescricao !== editDescricao
    );
  }, [itemEstoque, editQuantidade, editCodigo, editCor, editNomeModelo, editDescricao]);

  const openConfirmSave = () => {
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

  const addNivelWithItemLocal = (
    fileiraId: number,
    gradeId: number,
    createdNivel: CreatedNivel,
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

            const nomeModelo = (dto.produtoNomeModelo ?? '').toString();
            const cor = (dto.produtoCor ?? '').toString();
            const codigoSistemaWester = (dto.produtoCodigoWester ?? '').toString();

            const newNivel: Nivel = {
              id: createdNivel.id,
              identificador: createdNivel.identificador,
              ordem: createdNivel.ordem,
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

            const merged = [...grade.niveis, newNivel].sort(
              (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
            );
            return { ...grade, niveis: merged };
          }),
        };
      });
    });
  };

  const addGradeWithNivelAndItemLocal = (
    fileiraId: number,
    createdGrade: CreatedGrade,
    createdNivel: CreatedNivel,
    dto: ItemEstoque
  ) => {
    setFileiras((prev) => {
      return prev.map((fileira) => {
        if (fileira.id !== fileiraId) {
          return fileira;
        }

        const nomeModelo = (dto.produtoNomeModelo ?? '').toString();
        const cor = (dto.produtoCor ?? '').toString();
        const codigoSistemaWester = (dto.produtoCodigoWester ?? '').toString();

        const nivel: Nivel = {
          id: createdNivel.id,
          identificador: createdNivel.identificador,
          ordem: createdNivel.ordem,
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

        const newGrade: Grade = {
          id: createdGrade.id,
          identificador: createdGrade.identificador,
          ordem: createdGrade.ordem,
          niveis: [nivel],
        };

        const mergedGrades = [...fileira.grades, newGrade].sort(
          (a, b) => parseGradeOrder(a) - parseGradeOrder(b)
        );
        return { ...fileira, grades: mergedGrades };
      });
    });
  };

  const openAddItemModalForGrade = (fileira: Fileira, grade: Grade) => {
    const next = computeNextNivelForGrade(grade);
    const label = `Inserir item - Fileira ${fileira.identificador} - Grade ${grade.identificador} - Nível ${next.identificador}`;

    setSelectedGradeCtx({
      fileiraId: fileira.id,
      gradeId: grade.id,
      label,
      nextNivelIdentificador: next.identificador,
      nextNivelOrdem: next.ordem,
    });

    setAddQuantidade(1);
    setAddCodigo('');
    setAddCor('');
    setAddNomeModelo('');
    setAddDescricao('');
    setAddItemModalVisible(true);
  };

  const closeAddItemModal = () => {
    setAddItemModalVisible(false);
    setSelectedGradeCtx(null);
    setAddLoading(false);
  };

  const saveAddItem = async () => {
    if (!selectedGradeCtx) {
      closeAddItemModal();
      return;
    }

    if (addNomeModelo.trim() === '') {
      showError('Informe o nome/modelo.');
      return;
    }

    if (addQuantidade <= 0) {
      showError('Quantidade 0 é tratada pela API como remoção de nível. Use valor maior que zero.');
      return;
    }

    setAddLoading(true);

    try {
      let targetGradeId: number | null = selectedGradeCtx.gradeId ?? null;

      if (!targetGradeId) {
        const gradePayload = {
          identificador: selectedGradeCtx.nextGradeIdentificador,
          ordem: selectedGradeCtx.nextGradeOrdem,
        };

        const createdGradeRes = await API.post<any>(
          `/grades/fileira/${selectedGradeCtx.fileiraId}`,
          gradePayload
        );

        const createdGradeId = createdGradeRes?.data?.id;
        if (typeof createdGradeId !== 'number') {
          throw new Error('Não foi possível identificar a nova grade criada.');
        }

        targetGradeId = createdGradeId;
      }

      const nivelPayload = {
        identificador: selectedGradeCtx.nextNivelIdentificador,
        ordem: selectedGradeCtx.nextNivelOrdem,
        grade: { id: targetGradeId },
      };

      const createdNivelRes = await API.post<any>(`/niveis/grade/${targetGradeId}`, nivelPayload);

      const createdNivelId = createdNivelRes?.data?.id;
      if (typeof createdNivelId !== 'number') {
        throw new Error('Não foi possível identificar o novo nível criado.');
      }

      const createdNivel: CreatedNivel = {
        id: createdNivelId,
        identificador:
          createdNivelRes?.data?.identificador ?? selectedGradeCtx.nextNivelIdentificador,
        ordem:
          typeof createdNivelRes?.data?.ordem === 'number'
            ? createdNivelRes.data.ordem
            : selectedGradeCtx.nextNivelOrdem,
      };

      const itemPayload = {
        quantidade: addQuantidade,
        produto: {
          codigoSistemaWester: addCodigo,
          cor: addCor,
          nomeModelo: addNomeModelo,
          descricao: addDescricao,
        },
      };

      const itemRes = await API.put<any>(`/itens-estoque/nivel/${createdNivel.id}`, itemPayload);
      const updated = normalizeItemEstoqueResponse(itemRes.data);

      if (!updated) {
        throw new Error('Resposta inválida ao salvar o item.');
      }

      setExpandedFileiras((prev) =>
        prev.includes(selectedGradeCtx.fileiraId) ? prev : [...prev, selectedGradeCtx.fileiraId]
      );
      setExpandedGrades((prev) =>
        prev.includes(targetGradeId!) ? prev : [...prev, targetGradeId!]
      );
      setActiveGradeId(targetGradeId!);

      if (!selectedGradeCtx.gradeId) {
        setFileiras((prev) => {
          return prev.map((f) => {
            if (f.id !== selectedGradeCtx.fileiraId) {
              return f;
            }

            const newGradeIdentificador = selectedGradeCtx.nextGradeIdentificador ?? 'NEW';
            const newGradeOrdem = selectedGradeCtx.nextGradeOrdem ?? 0;

            const alreadyExists = f.grades.some((g) => g.id === targetGradeId);
            if (alreadyExists) {
              return f;
            }

            const newGrade: Grade = {
              id: targetGradeId!,
              identificador: newGradeIdentificador,
              ordem: newGradeOrdem,
              niveis: [],
            };

            const mergedGrades = [...f.grades, newGrade].sort(
              (a, b) => parseGradeOrder(a) - parseGradeOrder(b)
            );
            return { ...f, grades: mergedGrades };
          });
        });
      }

      addNivelWithItemLocal(selectedGradeCtx.fileiraId, targetGradeId!, createdNivel, updated);

      closeAddItemModal();
      showSuccess(`Produto inserido com sucesso em ${selectedGradeCtx.label}`);
    } catch (error: any) {
      const msg = extractErrorMessage(error, 'Não foi possível inserir o item na grade.');
      showError(msg);
    } finally {
      setAddLoading(false);
    }
  };

  const saveEdits = async () => {
    if (!selectedNivelCtx) {
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
      const payload = {
        quantidade: editQuantidade,
        produto: {
          codigoSistemaWester: editCodigo,
          cor: editCor,
          nomeModelo: editNomeModelo,
          descricao: editDescricao,
        },
      };

      const res = await API.put<any>(`/itens-estoque/nivel/${selectedNivelCtx.nivelId}`, payload);
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

  const openAddGradeModalForFileira = (fileira: Fileira) => {
    const next = computeNextGradeForFileira(fileira);
    const label = `Inserir item - Fileira ${fileira.identificador} - Grade ${next.identificador} - Nível N1`;

    setSelectedFileiraCtx({
      fileiraId: fileira.id,
      fileiraIdentificador: fileira.identificador,
      label,
      suggestedGradeIdentificador: next.identificador,
      suggestedGradeOrdem: next.ordem,
    });

    setAddGradeQuantidade(1);
    setAddGradeCodigo('');
    setAddGradeCor('');
    setAddGradeNomeModelo('');
    setAddGradeDescricao('');
    setAddGradeModalVisible(true);
  };

  const closeAddGradeModal = () => {
    setAddGradeModalVisible(false);
    setSelectedFileiraCtx(null);
    setAddGradeLoading(false);
  };

  const createGradeWithRetry = async (
    fileiraId: number,
    startOrdem: number,
    startIdentificador: string
  ) => {
    let ordem = startOrdem;
    let identificador = startIdentificador;

    for (let i = 0; i < 25; i++) {
      try {
        const res = await API.post<any>(`/grades/fileira/${fileiraId}`, { identificador, ordem });
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
          identificador = `${selectedFileiraCtx?.fileiraIdentificador ?? ''}${ordem}`;
          continue;
        }
        throw error;
      }
    }

    throw new Error('Não foi possível criar a grade (muitas tentativas).');
  };

  const saveAddGrade = async () => {
    if (!selectedFileiraCtx) {
      closeAddGradeModal();
      return;
    }

    if (addGradeNomeModelo.trim() === '') {
      showError('Informe o nome/modelo.');
      return;
    }

    if (addGradeQuantidade <= 0) {
      showError('Quantidade 0 é tratada pela API como remoção de nível. Use valor maior que zero.');
      return;
    }

    setAddGradeLoading(true);

    try {
      const createdGrade = await createGradeWithRetry(
        selectedFileiraCtx.fileiraId,
        selectedFileiraCtx.suggestedGradeOrdem,
        selectedFileiraCtx.suggestedGradeIdentificador
      );

      const createNivelPayload = {
        identificador: 'N1',
        ordem: 1,
        grade: { id: createdGrade.id },
      };

      const nivelRes = await API.post<any>(`/niveis/grade/${createdGrade.id}`, createNivelPayload);
      const nivelData = nivelRes?.data;

      if (!nivelData || typeof nivelData.id !== 'number') {
        throw new Error('Não foi possível criar o N1 da nova grade.');
      }

      const createdNivel: CreatedNivel = {
        id: nivelData.id,
        identificador: nivelData.identificador ?? 'N1',
        ordem: typeof nivelData.ordem === 'number' ? nivelData.ordem : 1,
      };

      const itemPayload = {
        quantidade: addGradeQuantidade,
        produto: {
          codigoSistemaWester: addGradeCodigo,
          cor: addGradeCor,
          nomeModelo: addGradeNomeModelo,
          descricao: addGradeDescricao,
        },
      };

      const itemRes = await API.put<any>(`/itens-estoque/nivel/${createdNivel.id}`, itemPayload);
      const updated = normalizeItemEstoqueResponse(itemRes.data);

      if (!updated) {
        throw new Error('Resposta inválida ao salvar o item.');
      }

      setExpandedFileiras((prev) =>
        prev.includes(selectedFileiraCtx.fileiraId) ? prev : [...prev, selectedFileiraCtx.fileiraId]
      );
      setExpandedGrades((prev) =>
        prev.includes(createdGrade.id) ? prev : [...prev, createdGrade.id]
      );
      setActiveGradeId(createdGrade.id);

      addGradeWithNivelAndItemLocal(
        selectedFileiraCtx.fileiraId,
        createdGrade,
        createdNivel,
        updated
      );

      closeAddGradeModal();
      showSuccess(`Produto inserido com sucesso em ${selectedFileiraCtx.label}`);
    } catch (error: any) {
      const msg = extractErrorMessage(error, 'Erro ao criar Grade.');
      showError(msg);
    } finally {
      setAddGradeLoading(false);
    }
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
    if (creatingFileira) {
      return;
    }

    setCreatingFileira(true);

    try {
      const next = computeNextFileira(fileiras);

      const res = await API.post(`/fileiras/area/${AREA_ID}`, {
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

  // ✅ SEARCH helpers
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
  const HEADER_SEARCH_BREAKPOINT = 900;
  const showInlineSearchHelper = IS_WEB && screenWidth < HEADER_SEARCH_BREAKPOINT;

  useEffect(() => {
    if (
      !IS_WEB ||
      typeof document === 'undefined' ||
      screenWidth < HEADER_SEARCH_BREAKPOINT
    ) {
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

          const label = `Fileira ${f.identificador} - Grade ${g.identificador} - Nível ${n.identificador}`;

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
    if (!searchEnabled) {
      showError('Digite ao menos 3 caracteres para pesquisar.');
      return;
    }
    setSearchResultsVisible(true);
  };

  const focusOnResult = (r: SearchResult) => {
    setExpandedFileiras((prev) => (prev.includes(r.fileiraId) ? prev : [...prev, r.fileiraId]));
    setExpandedGrades((prev) => (prev.includes(r.gradeId) ? prev : [...prev, r.gradeId]));
    setActiveGradeId(r.gradeId);

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
              placeholder="Buscar (min. 3 chars): nome, código, cor, descrição"
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
                  { borderColor: colors.outline, backgroundColor: colors.surface },
                ]}
              >
                <MaterialCommunityIcons name="magnify" size={17} color={colors.primary} />
                <TextInput
                  ref={(r) => {
                    searchInputRef.current = r;
                  }}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Buscar (min. 3 chars): nome, código, cor, descrição"
                  placeholderTextColor={`${colors.primary}88`}
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
                    style={({ pressed, hovered }) => [
                      styles.searchIconBtn,
                      hovered && { backgroundColor: colors.surfaceVariant },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <AntDesign name="close" size={16} color={colors.primary} />
                  </Pressable>
                ) : null}
              </View>

              <Pressable
                onPress={submitSearch}
                style={({ pressed, hovered }) => [
                  styles.webSearchIconButtonCompact,
                  { borderColor: colors.primary },
                  hovered && { backgroundColor: colors.surfaceVariant },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <MaterialCommunityIcons name="magnify" size={20} color={colors.primary} />
              </Pressable>
            </View>

            <Text style={[styles.webSearchHintCompact, { color: colors.primary }]}>
              {searchEnabled
                ? `${searchResults.length} resultado(s)`
                : 'Digite ao menos 3 caracteres'}
            </Text>
          </View>
        ) : null}

        {IS_WEB ? (
          <View style={[styles.webScroller, { backgroundColor: colors.background }]}>
            <View style={styles.webContent}>
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
                    onHoverIn={() => setHoverFileira((prev) => ({ ...prev, [fileira.id]: true }))}
                    onHoverOut={() => setHoverFileira((prev) => ({ ...prev, [fileira.id]: false }))}
                    style={[
                      styles.fileiraContainer,
                      { backgroundColor: colors.surface, borderColor: colors.outline },
                      shouldShowFileiraHover && [
                        styles.fileiraHover,
                        { borderColor: colors.primary, shadowColor: colors.primary },
                      ],
                    ]}
                  >
                    <Pressable
                      onPress={() => toggleFileiraExpand(fileira)}
                      style={({ pressed }) => [styles.fileiraHeader, pressed && { opacity: 0.7 }]}
                    >
                      <Text
                        style={[
                          styles.fileiraTitle,
                          { color: colors.text },
                          (fileiraExpanded || shouldShowFileiraHover) && { color: colors.primary },
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

                      const niveisToShow = expanded
                        ? grade.niveis
                        : grade.niveis.filter(
                            (n) =>
                              n.identificador === 'N1' ||
                              (searchEnabled && matchedNivelIds.has(n.id))
                          );

                      const uniqueNiveisToShow = (() => {
                        const seen = new Set<number>();
                        const list: Nivel[] = [];
                        for (const n of niveisToShow) {
                          if (!seen.has(n.id)) {
                            seen.add(n.id);
                            list.push(n);
                          }
                        }
                        return list.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
                      })();

                      const hasAnyNivel = uniqueNiveisToShow.length > 0;
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
                              onPress={() => handleGradePress(grade)}
                              onHoverIn={() => {
                                setHoverGrade((prev) => ({ ...prev, [grade.id]: true }));
                                setHoverFileira((prev) => ({ ...prev, [fileira.id]: false }));
                              }}
                              onHoverOut={() =>
                                setHoverGrade((prev) => ({ ...prev, [grade.id]: false }))
                              }
                              style={({ pressed }) => [
                                styles.gradeContainer,
                                { backgroundColor: colors.surface, borderColor: colors.outline },
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
                                    style={[
                                      styles.gradeTitle,
                                      { color: colors.text },
                                      (isGradeHovered || isActiveGrade) && {
                                        color: colors.primary,
                                      },
                                    ]}
                                  >
                                    Grade {grade.identificador}
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
                                        openAddItemModalForGrade(fileira, grade);
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
                                      typeof nivel.quantidade === 'number' ? nivel.quantidade : 0;
                                    const produtoExibido = (nivel.produtoNomeModelo ?? '').trim();

                                    const onlyOneNivelInGrade = grade.niveis.length <= 1;
                                    const isRemovingThisNivel = resequenceNivelId === nivel.id;
                                    const disableRemoveNivelButton =
                                      onlyOneNivelInGrade || isRemovingThisNivel;

                                    const isMatch = searchEnabled && matchedNivelIds.has(nivel.id);
                                    const shouldDim = searchEnabled && !isMatch;

                                    return (
                                      <Pressable
                                        key={nivel.id}
                                        id={`nivel-${nivel.id}` as any}
                                        onPress={() => handleNivelClick(fileira, grade, nivel)}
                                        onHoverIn={() => {
                                          setHoverNivel((prev) => ({ ...prev, [nivel.id]: true }));
                                          setHoverFileira((prev) => ({
                                            ...prev,
                                            [fileira.id]: false,
                                          }));
                                        }}
                                        onHoverOut={() =>
                                          setHoverNivel((prev) => ({ ...prev, [nivel.id]: false }))
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

                                        <Text
                                          style={[
                                            styles.nivelText,
                                            { color: colors.text },
                                            isNivelHovered && { color: colors.primary },
                                          ]}
                                        >
                                          {nivel.identificador}
                                        </Text>

                                        {produtoExibido !== '' ? (
                                          <Text
                                            style={[
                                              styles.produto,
                                              { color: colors.text },
                                              isNivelHovered && { color: colors.primary },
                                            ]}
                                            numberOfLines={2}
                                          >
                                            {produtoExibido}
                                          </Text>
                                        ) : null}

                                        <Text
                                          style={[
                                            styles.qtd,
                                            { color: colors.text },
                                            isNivelHovered && { color: colors.primary },
                                          ]}
                                        >
                                          Qtd: {quantidadeExibida}
                                        </Text>
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
                      onPress={() => openAddGradeModalForFileira(fileira)}
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
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              backgroundColor: colors.background,
              paddingBottom: 16,
            }}
            nestedScrollEnabled
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fileirasRow}
              nestedScrollEnabled
            >
              {fileiras.map((fileira) => {
                const fileiraExpanded = expandedFileiras.includes(fileira.id);
                const isFileiraHovered = !!hoverFileira[fileira.id];

                return (
                  <View
                    key={fileira.id}
                    style={[
                      styles.fileiraContainer,
                      { backgroundColor: colors.surface, borderColor: colors.outline },
                    ]}
                  >
                    <Pressable
                      onPress={() => toggleFileiraExpand(fileira)}
                      onHoverIn={() => setHoverFileira((prev) => ({ ...prev, [fileira.id]: true }))}
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

                      const niveisToShow = expanded
                        ? grade.niveis
                        : grade.niveis.filter(
                            (n) =>
                              n.identificador === 'N1' ||
                              (searchEnabled && matchedNivelIds.has(n.id))
                          );

                      const uniqueNiveisToShow = (() => {
                        const seen = new Set<number>();
                        const list: Nivel[] = [];
                        for (const n of niveisToShow) {
                          if (!seen.has(n.id)) {
                            seen.add(n.id);
                            list.push(n);
                          }
                        }
                        return list.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
                      })();

                      if (uniqueNiveisToShow.length === 0) {
                        return null;
                      }

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
                              onPress={() => handleGradePress(grade)}
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
                                    style={[
                                      styles.gradeTitle,
                                      { color: colors.text },
                                      (isGradeHovered || isActiveGrade) && {
                                        color: colors.primary,
                                      },
                                    ]}
                                  >
                                    Grade {grade.identificador}
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
                                      openAddItemModalForGrade(fileira, grade);
                                    }}
                                    style={[styles.addButton, { borderColor: colors.outline }]}
                                  >
                                    <AntDesign name="plus" size={16} color={colors.primary} />
                                  </Pressable>

                                  <Pressable
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      criarNivel(fileira.id, grade);
                                    }}
                                    disabled={creatingGradeId === grade.id}
                                    style={[
                                      styles.addButton,
                                      { borderColor: colors.outline },
                                      creatingGradeId === grade.id && { opacity: 0.6 },
                                    ]}
                                  >
                                    {creatingGradeId === grade.id ? (
                                      <ActivityIndicator size="small" color={colors.primary} />
                                    ) : (
                                      <AntDesign
                                        name="pluscircleo"
                                        size={16}
                                        color={colors.primary}
                                      />
                                    )}
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
                                {uniqueNiveisToShow.map((nivel) => {
                                  const isNivelHovered = !!hoverNivel[nivel.id];
                                  const quantidadeExibida =
                                    typeof nivel.quantidade === 'number' ? nivel.quantidade : 0;
                                  const produtoExibido = (nivel.produtoNomeModelo ?? '').trim();

                                  const isMatch = searchEnabled && matchedNivelIds.has(nivel.id);
                                  const shouldDim = searchEnabled && !isMatch;

                                  return (
                                    <Pressable
                                      key={nivel.id}
                                      onPress={() => handleNivelClick(fileira, grade, nivel)}
                                      onHoverIn={() =>
                                        setHoverNivel((prev) => ({ ...prev, [nivel.id]: true }))
                                      }
                                      onHoverOut={() =>
                                        setHoverNivel((prev) => ({ ...prev, [nivel.id]: false }))
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
                                      <Pressable
                                        onPress={(e) => {
                                          e.stopPropagation();
                                          openConfirmRemoveNivel(nivel, fileira, grade);
                                        }}
                                        style={[
                                          styles.nivelRemoveButton,
                                          {
                                            borderColor: colors.outline,
                                            backgroundColor: colors.surface,
                                          },
                                        ]}
                                      >
                                        {resequenceNivelId === nivel.id ? (
                                          <ActivityIndicator size="small" color={colors.primary} />
                                        ) : (
                                          <AntDesign
                                            name="minus"
                                            size={14}
                                            color={colors.primary}
                                          />
                                        )}
                                      </Pressable>

                                      <Text
                                        style={[
                                          styles.nivelText,
                                          { color: colors.text },
                                          isNivelHovered && { color: colors.primary },
                                        ]}
                                      >
                                        {nivel.identificador}
                                      </Text>

                                      {produtoExibido !== '' ? (
                                        <Text style={styles.produto}>{produtoExibido}</Text>
                                      ) : null}
                                      <Text style={styles.qtd}>Qtd: {quantidadeExibida}</Text>
                                    </Pressable>
                                  );
                                })}
                              </View>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}

                    <Pressable
                      onPress={() => openAddItemModalForNewGrade(fileira)}
                      style={[styles.addGradeButton, { borderColor: colors.primary }]}
                    >
                      <AntDesign name="plus" size={22} color={colors.primary} />
                    </Pressable>
                  </View>
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
            </ScrollView>
          </ScrollView>
        )}

        {/* SEARCH RESULTS MODAL */}
        <Modal visible={searchResultsVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View
              style={[
                styles.searchResultsContainer,
                { backgroundColor: colors.surface, borderColor: colors.outline },
              ]}
            >
              <View style={styles.searchResultsHeader}>
                <Text style={[styles.searchResultsTitle, { color: colors.primary }]}>
                  Resultados
                </Text>
                <Pressable
                  onPress={() => setSearchResultsVisible(false)}
                  style={({ pressed }) => [styles.searchIconBtn, pressed && { opacity: 0.7 }]}
                >
                  <AntDesign name="close" size={18} color={colors.primary} />
                </Pressable>
              </View>

              <Text style={[styles.searchResultsSubtitle, { color: colors.primary }]}>
                {searchEnabled
                  ? `${searchResults.length} encontrado(s) para "${debouncedSearchText.trim()}"`
                  : 'Digite ao menos 3 caracteres'}
              </Text>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {searchResults.length === 0 ? (
                  <View style={{ paddingVertical: 18 }}>
                    <Text style={[styles.searchEmpty, { color: colors.primary }]}>
                      Nenhum resultado.
                    </Text>
                  </View>
                ) : (
                  searchResults.map((r) => {
                    return (
                      <Pressable
                        key={r.nivelId}
                        onPress={() => focusOnResult(r)}
                        style={({ pressed }) => [
                          styles.searchRow,
                          { borderColor: colors.outline, backgroundColor: colors.background },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.searchRowTitle, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {r.nomeModelo !== '' ? r.nomeModelo : '(Sem nome)'}{' '}
                            {r.codigo !== '' ? `(${r.codigo})` : ''}
                          </Text>
                          <Text
                            style={[styles.searchRowMeta, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {r.label}
                          </Text>
                          <Text
                            style={[styles.searchRowMeta, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {r.cor !== '' ? `Cor: ${r.cor}` : 'Cor: -'}{' '}
                            {r.descricao !== '' ? ` • ${r.descricao}` : ''}
                          </Text>
                        </View>

                        <View style={styles.searchRowRight}>
                          <Text style={[styles.searchRowQty, { color: colors.primary }]}>
                            {r.quantidade}
                          </Text>
                          <AntDesign name="caretright" size={16} color={colors.primary} />
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>

              <View style={styles.searchResultsActions}>
                <Pressable
                  onPress={() => setSearchResultsVisible(false)}
                  style={[styles.confirmButton, { borderColor: colors.outline }]}
                >
                  <Text style={[styles.confirmButtonText, { color: colors.text }]}>Fechar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal confirmar remover nível */}
        <Modal visible={confirmRemoveVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View
              style={[
                styles.confirmContainer,
                { backgroundColor: colors.surface, borderColor: colors.outline },
              ]}
            >
              <Text style={[styles.confirmTitle, { color: colors.text }]}>Remover nível?</Text>

              <Text style={[styles.confirmMessage, { color: colors.text }]}>
                {pendingRemoveNivel?.label ?? 'Nível selecionado'}
              </Text>

              <Text style={[styles.confirmWarn, { color: colors.text }]}>
                Esta ação irá remover o nível e resequenciar os demais.
              </Text>

              <View style={styles.confirmActions}>
                <Pressable
                  onPress={closeConfirmRemoveNivel}
                  style={[styles.confirmButton, { borderColor: colors.outline }]}
                >
                  <Text style={[styles.confirmButtonText, { color: colors.text }]}>Cancelar</Text>
                </Pressable>

                <Pressable
                  onPress={confirmRemoveNivel}
                  style={[
                    styles.confirmButton,
                    { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  disabled={!!resequenceNivelId}
                >
                  {resequenceNivelId ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.confirmButtonText, { color: '#fff' }]}>Remover</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal editar produto do nível */}
        <Modal visible={productModalVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View
              style={[
                styles.productModalContainer,
                { backgroundColor: colors.surface, borderColor: colors.outline },
              ]}
            >
              <Text
                style={[styles.productTitle, { color: colors.primary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedNivelCtx?.label ?? 'Produto'}
              </Text>

              {itemLoading ? (
                <View style={{ paddingVertical: 18 }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <>
                  <View style={[styles.formRow]}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Nome</Text>
                    <TextInput
                      value={editNomeModelo}
                      onChangeText={setEditNomeModelo}
                      placeholder="Nome / Modelo"
                      placeholderTextColor="#888"
                      style={[styles.input, { color: colors.text, borderColor: colors.outline }]}
                    />
                  </View>

                  <View style={[styles.formRow]}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Quantidade</Text>
                    <QuantityStepper
                      value={editQuantidade}
                      onChange={setEditQuantidade}
                      min={1}
                      max={999999}
                      step={1}
                      borderColor={colors.outline}
                      textColor={colors.text}
                      primaryColor={colors.primary}
                      backgroundColor={colors.surface}
                    />
                  </View>

                  <View style={[styles.formRow]}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Código Wester</Text>
                    <TextInput
                      value={editCodigo}
                      editable
                      placeholder="Código Wester"
                      placeholderTextColor="#888"
                      disableFullscreenUI
                      style={[styles.input, { color: colors.text, borderColor: colors.outline }]}
                      onChangeText={setEditCodigo}
                    />
                  </View>

                  <View style={[styles.formRow]}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Cor</Text>
                    <TextInput
                      value={editCor}
                      onChangeText={setEditCor}
                      placeholder="Cor"
                      placeholderTextColor="#888"
                      style={[styles.input, { color: colors.text, borderColor: colors.outline }]}
                    />
                  </View>

                  <View style={[styles.formRow]}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Descrição</Text>
                    <TextInput
                      value={editDescricao}
                      onChangeText={setEditDescricao}
                      placeholder="Descrição"
                      placeholderTextColor="#888"
                      multiline
                      style={[styles.textArea, { color: colors.text, borderColor: colors.outline }]}
                    />
                  </View>

                  <View style={styles.productActions}>
                    <Pressable
                      onPress={closeProductModal}
                      style={[styles.actionButton, { borderColor: colors.outline }]}
                    >
                      <Text style={[styles.actionText, { color: colors.text }]}>Fechar</Text>
                    </Pressable>

                    <Pressable
                      onPress={openConfirmSave}
                      disabled={!isDirty || saving}
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                          opacity: !isDirty || saving ? 0.6 : 1,
                        },
                      ]}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.actionText, { color: '#fff' }]}>Salvar</Text>
                      )}
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Confirm salvar (edição) */}
        <Modal visible={confirmSaveVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View
              style={[
                styles.confirmContainer,
                { backgroundColor: colors.surface, borderColor: colors.outline },
              ]}
            >
              <Text style={[styles.confirmTitle, { color: colors.text }]}>Salvar alterações?</Text>

              <Text style={[styles.confirmMessage, { color: colors.text }]}>
                Você tem certeza que deseja salvar as alterações deste produto?
              </Text>

              <View style={styles.confirmActions}>
                <Pressable
                  onPress={closeConfirmSave}
                  style={[styles.confirmButton, { borderColor: colors.outline }]}
                >
                  <Text style={[styles.confirmButtonText, { color: colors.text }]}>Cancelar</Text>
                </Pressable>

                <Pressable
                  onPress={saveEdits}
                  style={[
                    styles.confirmButton,
                    { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.confirmButtonText, { color: '#fff' }]}>Salvar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal adicionar item via + da grade */}
        <Modal visible={addItemModalVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View
              style={[
                styles.productModalContainer,
                { backgroundColor: colors.surface, borderColor: colors.outline },
              ]}
            >
              <Text style={[styles.productTitle, { color: colors.primary }]} numberOfLines={2}>
                {selectedGradeCtx?.label ?? 'Inserir item'}
              </Text>

              <View style={[styles.formRow]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Nome/Modelo</Text>
                <TextInput
                  value={addNomeModelo}
                  onChangeText={setAddNomeModelo}
                  placeholder="Nome / Modelo"
                  placeholderTextColor="#888"
                  style={[styles.input, { color: colors.text, borderColor: colors.outline }]}
                />
              </View>

              <View style={[styles.formRow]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Quantidade</Text>
                <QuantityStepper
                  value={addQuantidade}
                  onChange={setAddQuantidade}
                  min={1}
                  max={999999}
                  step={1}
                  borderColor={colors.outline}
                  textColor={colors.text}
                  primaryColor={colors.primary}
                  backgroundColor={colors.surface}
                />
              </View>

              <View style={[styles.formRow]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Código Wester</Text>
                <TextInput
                  value={addCodigo}
                  onChangeText={setAddCodigo}
                  placeholder="Código Wester"
                  placeholderTextColor="#888"
                  style={[styles.input, { color: colors.text, borderColor: colors.outline }]}
                />
              </View>

              <View style={[styles.formRow]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Cor</Text>
                <TextInput
                  value={addCor}
                  onChangeText={setAddCor}
                  placeholder="Cor"
                  placeholderTextColor="#888"
                  style={[styles.input, { color: colors.text, borderColor: colors.outline }]}
                />
              </View>

              <View style={[styles.formRow]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Descrição</Text>
                <TextInput
                  value={addDescricao}
                  onChangeText={setAddDescricao}
                  placeholder="Descrição"
                  placeholderTextColor="#888"
                  multiline
                  style={[styles.textArea, { color: colors.text, borderColor: colors.outline }]}
                />
              </View>

              <View style={styles.productActions}>
                <Pressable
                  onPress={closeAddItemModal}
                  style={[styles.actionButton, { borderColor: colors.outline }]}
                >
                  <Text style={[styles.actionText, { color: colors.text }]}>Cancelar</Text>
                </Pressable>

                <Pressable
                  onPress={saveAddItem}
                  disabled={addLoading}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      opacity: addLoading ? 0.6 : 1,
                    },
                  ]}
                >
                  {addLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.actionText, { color: '#fff' }]}>Salvar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ✅ Modal adicionar grade via + da fileira */}
        <Modal visible={addGradeModalVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View
              style={[
                styles.productModalContainer,
                { backgroundColor: colors.surface, borderColor: colors.outline },
              ]}
            >
              <Text style={[styles.productTitle, { color: colors.primary }]} numberOfLines={2}>
                {selectedFileiraCtx?.label ?? 'Inserir item'}
              </Text>

              <View style={[styles.formRow]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Nome / Modelo</Text>
                <TextInput
                  value={addGradeNomeModelo}
                  onChangeText={setAddGradeNomeModelo}
                  placeholder="Nome / Modelo"
                  placeholderTextColor="#888"
                  style={[styles.input, { color: colors.text, borderColor: colors.outline }]}
                />
              </View>

              <View style={[styles.formRow]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Quantidade</Text>
                <QuantityStepper
                  value={addGradeQuantidade}
                  onChange={setAddGradeQuantidade}
                  min={1}
                  max={999999}
                  step={1}
                  borderColor={colors.outline}
                  textColor={colors.text}
                  primaryColor={colors.primary}
                  backgroundColor={colors.surface}
                />
              </View>

              <View style={[styles.formRow]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Código Wester</Text>
                <TextInput
                  value={addGradeCodigo}
                  onChangeText={setAddGradeCodigo}
                  placeholder="Código Wester"
                  placeholderTextColor="#888"
                  style={[styles.input, { color: colors.text, borderColor: colors.outline }]}
                />
              </View>

              <View style={[styles.formRow]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Cor</Text>
                <TextInput
                  value={addGradeCor}
                  onChangeText={setAddGradeCor}
                  placeholder="Cor"
                  placeholderTextColor="#888"
                  style={[styles.input, { color: colors.text, borderColor: colors.outline }]}
                />
              </View>

              <View style={[styles.formRow]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Descrição</Text>
                <TextInput
                  value={addGradeDescricao}
                  onChangeText={setAddGradeDescricao}
                  placeholder="Descrição"
                  placeholderTextColor="#888"
                  multiline
                  style={[styles.textArea, { color: colors.text, borderColor: colors.outline }]}
                />
              </View>

              <View style={styles.productActions}>
                <Pressable
                  onPress={closeAddGradeModal}
                  style={[styles.actionButton, { borderColor: colors.outline }]}
                >
                  <Text style={[styles.actionText, { color: colors.text }]}>Cancelar</Text>
                </Pressable>

                <Pressable
                  onPress={saveAddGrade}
                  disabled={addGradeLoading}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      opacity: addGradeLoading ? 0.6 : 1,
                    },
                  ]}
                >
                  {addGradeLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.actionText, { color: '#fff' }]}>Salvar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de sucesso */}
        <Modal visible={successVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View
              style={[
                styles.confirmContainer,
                styles.feedbackContainer,
                { backgroundColor: colors.surface, borderColor: successColor },
              ]}
            >
              <Text style={[styles.confirmTitle, styles.feedbackTitle, { color: successColor }]}>
                Sucesso
              </Text>
              <Text style={[styles.confirmMessage, styles.feedbackMessage, { color: colors.text }]}>
                {successMessage}
              </Text>

              <View style={styles.confirmActions}>
                <Pressable
                  onPress={() => setSuccessVisible(false)}
                  style={[
                    styles.confirmButton,
                    styles.feedbackButton,
                    { backgroundColor: successColor, borderColor: successColor },
                  ]}
                >
                  <Text style={[styles.confirmButtonText, { color: '#fff' }]}>OK</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de erro */}
        <Modal visible={errorVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View
              style={[
                styles.confirmContainer,
                styles.feedbackContainer,
                { backgroundColor: colors.surface, borderColor: errorColor },
              ]}
            >
              <Text style={[styles.confirmTitle, styles.feedbackTitle, { color: errorColor }]}>
                Erro
              </Text>

              <Text style={[styles.confirmMessage, styles.feedbackMessage, { color: colors.text }]}>
                {errorMessage}
              </Text>

              <View style={styles.confirmActions}>
                <Pressable
                  onPress={() => setErrorVisible(false)}
                  style={[
                    styles.confirmButton,
                    styles.feedbackButton,
                    { backgroundColor: errorColor, borderColor: errorColor },
                  ]}
                >
                  <Text style={[styles.confirmButtonText, { color: '#fff' }]}>OK</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

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
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontWeight: '700',
    fontSize: 13,
  },

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
    borderBottomWidth: 1,
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

  webScroller: {
    flex: 1,
    overflow: 'auto',
  },

  webContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },

  verticalContent: {
    flexGrow: 1,
    paddingVertical: 12,
    paddingBottom: 24,
  },

  fileirasRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },

  fileiraContainer: {
    borderRadius: 12,
    marginHorizontal: 8,
    padding: 12,
    elevation: 3,
    borderWidth: 1,
    flexShrink: 0,
    flexGrow: 0,
    overflow: 'hidden',
    display: 'flex',
    gap: 8,

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
        transform: [{ scale: 1.01 }],
        boxShadow: '0 10px 22px rgba(0,0,0,0.12)',
      } as any)
    : ({
        shadowOpacity: 0.22,
        shadowRadius: 7,
        elevation: 6,
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
    minWidth: 110,
    borderRadius: 10,
    padding: 9,
    borderWidth: 1,
    alignSelf: 'flex-start',
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

  gradeTitle: { fontSize: 16, fontWeight: 600 },

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
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 6,
  },

  nivelBox: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    position: 'relative',
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

  nivelText: { fontWeight: 'bold' },
  produto: { fontSize: 14, textAlign: 'center', fontWeight: 600 },
  qtd: { fontSize: 12, color: '#333', fontWeight: 600 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  confirmContainer: {
    width: '90%',
    maxWidth: 520,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
  },

  confirmTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  confirmMessage: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  confirmWarn: { fontSize: 13, opacity: 0.85, marginBottom: 14 },

  feedbackContainer: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
  },

  feedbackTitle: {
    marginBottom: 12,
  },

  feedbackMessage: {
    fontWeight: '500',
    marginBottom: 12,
  },

  feedbackButton: {
    minWidth: 92,
    paddingHorizontal: 24,
    borderRadius: 12,
  },

  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },

  confirmButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmButtonText: { fontWeight: '700' },

  productModalContainer: {
    width: '92%',
    maxWidth: 560,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
  },

  productTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: 0.4,
    marginBottom: 12,
    textAlign: 'center',
    opacity: 0.92,
  },

  formRow: {
    paddingVertical: 5,
    gap: 8,
  },

  formLabel: { fontWeight: '700', fontSize: 13 },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 70,
    textAlignVertical: 'top',
  },

  productActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },

  actionButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionText: { fontWeight: '800' },

  gradeWrapper: {
    width: '100%',
    overflow: IS_WEB ? 'visible' : 'hidden',
  },

  gradeInner: {
    flexGrow: 0,
    flexShrink: 0,
  },

  addGradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
  },

  addGradeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  nivelRemoveButtonDisabled: {
    opacity: 0.35,
  },

  addFileiraButton: {
    width: 136,
    height: 230,
    borderRadius: 12,
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

  searchResultsContainer: {
    width: '92%',
    maxWidth: 720,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },

  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },

  searchResultsTitle: {
    fontSize: 18,
    fontWeight: '900',
  },

  searchResultsSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.92,
    marginBottom: 10,
  },

  searchRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  searchRowTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },

  searchRowMeta: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.9,
  },

  searchRowRight: {
    minWidth: 56,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },

  searchRowQty: {
    fontSize: 16,
    fontWeight: '900',
  },

  searchEmpty: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    opacity: 0.9,
  },

  searchResultsActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
});
