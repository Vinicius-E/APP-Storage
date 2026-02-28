import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  Button,
  IconButton,
  Modal,
  Portal,
  Snackbar,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { DatePickerModal, pt, registerTranslation } from 'react-native-paper-dates';
import AppEmptyState from '../components/AppEmptyState';
import AppLoadingState from '../components/AppLoadingState';
import AppTextInput from '../components/AppTextInput';
import { API_STATE_MESSAGES, getApiEmptyCopy } from '../constants/apiStateMessages';
import {
  HistoricoMovimentacaoFilterRequestDTO,
  HistoricoMovimentacaoResponseDTO,
  buscarHistoricoPorId,
  filtrarHistorico,
  listarHistorico,
} from '../services/historicoApi';
import { useThemeContext } from '../theme/ThemeContext';

type QuickType =
  | ''
  | 'ENTRADA'
  | 'SAIDA'
  | 'MOVIMENTACAO'
  | 'AJUSTE_QUANTIDADE'
  | 'RESEQUENCIAMENTO';
type OperationTone = {
  bg: string;
  border: string;
  text: string;
  softText: string;
};
type QuantityInfo = {
  anterior: number;
  nova: number;
  delta: number;
};
type LocationParts = {
  fileira: string;
  grade: string;
  nivel: string;
};
type LocationByNivelId = Record<number, LocationParts>;
type GradeLocation = {
  fileira: string;
  grade: string;
};
type GradeById = Record<number, GradeLocation>;
type FileiraById = Record<number, string>;
type ItemLocationById = Record<number, LocationParts>;
type MinuteNivelLocationByKey = Record<string, LocationParts>;
const PAGE_SIZE = 20;
const QUICK_FILTERS: Array<{ label: string; value: QuickType }> = [
  { label: 'Todos', value: '' },
  { label: 'Entrada', value: 'ENTRADA' },
  { label: 'Saída', value: 'SAIDA' },
  //{ label: 'Movimentação', value: 'MOVIMENTACAO' },
  { label: 'Ajuste', value: 'AJUSTE_QUANTIDADE' },
  { label: 'Resequenciamento', value: 'RESEQUENCIAMENTO' },
];
registerTranslation('pt-BR', pt);

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? '').toString().trim();
}

function hasLocation(parts: Partial<LocationParts>): boolean {
  return Boolean(
    normalizeLabel(parts.fileira) || normalizeLabel(parts.grade) || normalizeLabel(parts.nivel)
  );
}

function formatLocation(parts: Partial<LocationParts>): string {
  const fileira = normalizeLabel(parts.fileira) || '-';
  const grade = normalizeLabel(parts.grade) || '-';
  const nivel = normalizeLabel(parts.nivel) || '-';
  return `Fileira ${fileira} / Grade ${grade} / Nível ${nivel}`;
}

function formatKnownLocation(parts: Partial<LocationParts>): string {
  const fileira = normalizeLabel(parts.fileira);
  const grade = normalizeLabel(parts.grade);
  const nivel = normalizeLabel(parts.nivel);

  const tokens: string[] = [];
  if (fileira) tokens.push(`Fileira ${fileira}`);
  if (grade) tokens.push(`Grade ${grade}`);
  if (nivel) tokens.push(`Nível ${nivel}`);
  return tokens.join(' / ');
}

function hasFullLocation(parts: Partial<LocationParts>): boolean {
  return Boolean(
    normalizeLabel(parts.fileira) && normalizeLabel(parts.grade) && normalizeLabel(parts.nivel)
  );
}

function mapByNivelId(
  nivelId: number | null | undefined,
  locationByNivelId: LocationByNivelId
): LocationParts | undefined {
  if (typeof nivelId !== 'number') {
    return undefined;
  }
  return locationByNivelId[nivelId];
}

function mapByGradeId(
  gradeId: number | null | undefined,
  gradeById: GradeById
): GradeLocation | undefined {
  if (typeof gradeId !== 'number') {
    return undefined;
  }
  return gradeById[gradeId];
}

function mapByFileiraId(
  fileiraId: number | null | undefined,
  fileiraById: FileiraById
): string | undefined {
  if (typeof fileiraId !== 'number') {
    return undefined;
  }
  return fileiraById[fileiraId];
}

function cleanExtractedToken(value: string | undefined): string {
  return normalizeLabel(value).replace(/[.,;:)\]]+$/g, '');
}

function parseLocationFromDetails(details: string | null | undefined): Partial<LocationParts> {
  const content = normalizeLabel(details);
  if (!content) {
    return {};
  }

  const fileiraMatch = content.match(/fileira\s+([A-Za-z0-9-]+)/i);
  const gradeMatch = content.match(/grade\s+([A-Za-z0-9-]+)/i);
  const nivelMatch = content.match(/n[íi]vel\s+([A-Za-z0-9-]+)/i);

  return {
    fileira: cleanExtractedToken(fileiraMatch?.[1]),
    grade: cleanExtractedToken(gradeMatch?.[1]),
    nivel: cleanExtractedToken(nivelMatch?.[1]),
  };
}

function parseRemovedItemIdFromDetails(details: string | null | undefined): number | undefined {
  const content = normalizeLabel(details);
  if (!content) {
    return undefined;
  }
  const match = content.match(/item\s+removido\s+id:\s*(\d+)/i);
  if (!match) {
    return undefined;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toMinuteNivelKey(
  timestamp: string | null | undefined,
  nivel: string | null | undefined
): string {
  const nivelLabel = normalizeLabel(nivel).toUpperCase();
  if (!timestamp || !nivelLabel) {
    return '';
  }
  const direct = timestamp.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  if (direct?.[1]) {
    return `${direct[1]}|${nivelLabel}`;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}|${nivelLabel}`;
}

function mergeLocationValues(
  existing: LocationParts | undefined,
  incoming: Partial<LocationParts>
): LocationParts {
  return {
    fileira: normalizeLabel(existing?.fileira) || normalizeLabel(incoming.fileira),
    grade: normalizeLabel(existing?.grade) || normalizeLabel(incoming.grade),
    nivel: normalizeLabel(existing?.nivel) || normalizeLabel(incoming.nivel),
  };
}

function mergeLocationForReference(
  mapped: LocationByNivelId,
  mappedGradeById: GradeById,
  mappedFileiraById: FileiraById,
  reference: {
    fileiraId?: number | null;
    gradeId?: number | null;
    nivelId?: number | null;
    fileira?: string | null;
    grade?: string | null;
    nivel?: string | null;
  }
): void {
  const fileiraLabel = normalizeLabel(reference.fileira);
  const gradeLabel = normalizeLabel(reference.grade);
  const nivelLabel = normalizeLabel(reference.nivel);

  if (typeof reference.fileiraId === 'number') {
    mappedFileiraById[reference.fileiraId] =
      normalizeLabel(mappedFileiraById[reference.fileiraId]) || fileiraLabel;
  }
  const fileiraFromId =
    typeof reference.fileiraId === 'number'
      ? normalizeLabel(mappedFileiraById[reference.fileiraId])
      : '';

  if (typeof reference.gradeId === 'number') {
    const existingGrade = mappedGradeById[reference.gradeId];
    mappedGradeById[reference.gradeId] = {
      fileira: normalizeLabel(existingGrade?.fileira) || fileiraLabel || fileiraFromId,
      grade: normalizeLabel(existingGrade?.grade) || gradeLabel,
    };
  }
  const gradeFromId =
    typeof reference.gradeId === 'number' ? mappedGradeById[reference.gradeId] : undefined;

  if (typeof reference.nivelId === 'number') {
    const existingLevel = mapped[reference.nivelId];
    mapped[reference.nivelId] = {
      fileira:
        normalizeLabel(existingLevel?.fileira) ||
        fileiraLabel ||
        normalizeLabel(gradeFromId?.fileira) ||
        fileiraFromId,
      grade:
        normalizeLabel(existingLevel?.grade) || gradeLabel || normalizeLabel(gradeFromId?.grade),
      nivel: normalizeLabel(existingLevel?.nivel) || nivelLabel,
    };
  }
}

function resolveLocationFromReference(
  reference: {
    fileiraId?: number | null;
    gradeId?: number | null;
    nivelId?: number | null;
    fileira?: string | null;
    grade?: string | null;
    nivel?: string | null;
  },
  mapped: LocationByNivelId,
  mappedGradeById: GradeById,
  mappedFileiraById: FileiraById
): LocationParts {
  const mappedLevel = typeof reference.nivelId === 'number' ? mapped[reference.nivelId] : undefined;
  const mappedGrade =
    typeof reference.gradeId === 'number' ? mappedGradeById[reference.gradeId] : undefined;
  const mappedFileira =
    typeof reference.fileiraId === 'number'
      ? normalizeLabel(mappedFileiraById[reference.fileiraId])
      : '';

  return {
    fileira:
      normalizeLabel(reference.fileira) ||
      normalizeLabel(mappedLevel?.fileira) ||
      normalizeLabel(mappedGrade?.fileira) ||
      mappedFileira,
    grade:
      normalizeLabel(reference.grade) ||
      normalizeLabel(mappedLevel?.grade) ||
      normalizeLabel(mappedGrade?.grade),
    nivel: normalizeLabel(reference.nivel) || normalizeLabel(mappedLevel?.nivel),
  };
}

function mergeLocationMapsFromHistoryItem(
  item: HistoricoMovimentacaoResponseDTO,
  mapped: LocationByNivelId,
  mappedGradeById: GradeById,
  mappedFileiraById: FileiraById,
  mappedItemById: ItemLocationById,
  mappedMinuteNivel: MinuteNivelLocationByKey
): void {
  const parsedFromDetails = parseLocationFromDetails(item.detalhesAlteracao);
  const currentRef = {
    fileiraId: item.fileiraId,
    gradeId: item.gradeId,
    nivelId: item.nivelId,
    fileira: item.fileiraIdentificador ?? parsedFromDetails.fileira,
    grade: item.gradeIdentificador ?? parsedFromDetails.grade,
    nivel: item.nivelIdentificador ?? parsedFromDetails.nivel,
  };
  const originRef = {
    fileiraId: item.fileiraOrigemId,
    gradeId: item.gradeOrigemId,
    nivelId: item.nivelOrigemId,
    fileira: item.fileiraOrigemIdentificador ?? parsedFromDetails.fileira,
    grade: item.gradeOrigemIdentificador ?? parsedFromDetails.grade,
    nivel: item.nivelOrigemIdentificador ?? parsedFromDetails.nivel,
  };
  const destinationRef = {
    fileiraId: item.fileiraDestinoId,
    gradeId: item.gradeDestinoId,
    nivelId: item.nivelDestinoId,
    fileira: item.fileiraDestinoIdentificador ?? parsedFromDetails.fileira,
    grade: item.gradeDestinoIdentificador ?? parsedFromDetails.grade,
    nivel: item.nivelDestinoIdentificador ?? parsedFromDetails.nivel,
  };

  mergeLocationForReference(mapped, mappedGradeById, mappedFileiraById, currentRef);
  mergeLocationForReference(mapped, mappedGradeById, mappedFileiraById, originRef);
  mergeLocationForReference(mapped, mappedGradeById, mappedFileiraById, destinationRef);

  const resolvedCurrent = resolveLocationFromReference(
    currentRef,
    mapped,
    mappedGradeById,
    mappedFileiraById
  );
  const resolvedOrigin = resolveLocationFromReference(
    originRef,
    mapped,
    mappedGradeById,
    mappedFileiraById
  );
  const resolvedDestination = resolveLocationFromReference(
    destinationRef,
    mapped,
    mappedGradeById,
    mappedFileiraById
  );

  if (typeof item.itemEstoqueId === 'number') {
    const current = mappedItemById[item.itemEstoqueId];
    mappedItemById[item.itemEstoqueId] = mergeLocationValues(
      current,
      hasLocation(resolvedCurrent)
        ? resolvedCurrent
        : hasLocation(resolvedOrigin)
          ? resolvedOrigin
          : resolvedDestination
    );
  }

  const removedItemId = parseRemovedItemIdFromDetails(item.detalhesAlteracao);
  if (typeof removedItemId === 'number') {
    const current = mappedItemById[removedItemId];
    mappedItemById[removedItemId] = mergeLocationValues(
      current,
      hasLocation(resolvedCurrent)
        ? resolvedCurrent
        : hasLocation(resolvedOrigin)
          ? resolvedOrigin
          : resolvedDestination
    );
  }

  const detailMinuteKey = toMinuteNivelKey(item.timestamp, parsedFromDetails.nivel);
  if (
    detailMinuteKey &&
    normalizeLabel(parsedFromDetails.fileira) &&
    normalizeLabel(parsedFromDetails.grade) &&
    normalizeLabel(parsedFromDetails.nivel)
  ) {
    mappedMinuteNivel[detailMinuteKey] = mergeLocationValues(mappedMinuteNivel[detailMinuteKey], {
      fileira: parsedFromDetails.fileira,
      grade: parsedFromDetails.grade,
      nivel: parsedFromDetails.nivel,
    });
  }

  const currentMinuteKey = toMinuteNivelKey(item.timestamp, resolvedCurrent.nivel);
  if (currentMinuteKey && hasFullLocation(resolvedCurrent)) {
    mappedMinuteNivel[currentMinuteKey] = mergeLocationValues(
      mappedMinuteNivel[currentMinuteKey],
      resolvedCurrent
    );
  }
}

function toIsoDate(date: Date | undefined): string {
  if (!date) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDisplayDate(date: Date | undefined): string {
  if (!date) {
    return '';
  }
  return date.toLocaleDateString('pt-BR');
}

function toShortDisplayDate(date: Date | undefined): string {
  if (!date) {
    return '';
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function dateRangeLabel(startDate: Date | undefined, endDate: Date | undefined): string {
  if (startDate && endDate) {
    return `${toDisplayDate(startDate)} até ${toDisplayDate(endDate)}`;
  }
  if (startDate) {
    return `${toDisplayDate(startDate)} até ...`;
  }
  return 'Selecionar período';
}

function dateRangeLabelCompact(startDate: Date | undefined, endDate: Date | undefined): string {
  if (startDate && endDate) {
    return `${toShortDisplayDate(startDate)} até ${toShortDisplayDate(endDate)}`;
  }
  if (startDate) {
    return `Início: ${toShortDisplayDate(startDate)}`;
  }
  return 'Selecionar período';
}

function hasActiveFilters(filter: HistoricoMovimentacaoFilterRequestDTO): boolean {
  return Boolean(
    (filter.textoLivre && filter.textoLivre.trim()) ||
    (filter.tipoOperacao && filter.tipoOperacao.trim()) ||
    (filter.dataInicio && filter.dataInicio.trim()) ||
    (filter.dataFim && filter.dataFim.trim()) ||
    filter.usuarioId ||
    filter.produtoId ||
    filter.nivelId
  );
}

function fmtDate(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return '—';
  }
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) {
    return timestamp;
  }
  return d.toLocaleString('pt-BR');
}

function opLabel(tipoOperacao: string | null | undefined): string {
  const key = (tipoOperacao ?? '').toUpperCase();
  if (key === 'ENTRADA') return 'Entrada de estoque';
  if (key === 'SAIDA') return 'Saída de estoque';
  //if (key === 'MOVIMENTACAO') return 'Movimentação interna';
  if (key === 'AJUSTE_QUANTIDADE') return 'Ajuste de quantidade';
  if (key === 'RESEQUENCIAMENTO') return 'Reposicionamento automático';
  return key || 'Operação';
}

function normalizeOperation(tipoOperacao: string | null | undefined): string {
  return (tipoOperacao ?? '').toUpperCase();
}

function operationTone(tipoOperacao: string | null | undefined): OperationTone {
  const key = normalizeOperation(tipoOperacao);

  if (key === 'ENTRADA') {
    return {
      bg: '#E7F7ED',
      border: '#BFE6CE',
      text: '#1F7A3A',
      softText: '#2B8A46',
    };
  }

  if (key === 'SAIDA') {
    return {
      bg: '#FDECEC',
      border: '#F5C3C1',
      text: '#B3261E',
      softText: '#9F2018',
    };
  }

  if (key === 'MOVIMENTACAO') {
    return {
      bg: '#EAF1FF',
      border: '#CAD9FF',
      text: '#2751A3',
      softText: '#22488F',
    };
  }

  if (key === 'AJUSTE_QUANTIDADE') {
    return {
      bg: '#FFF3E2',
      border: '#F1D5AC',
      text: '#9A5A00',
      softText: '#835000',
    };
  }

  if (key === 'RESEQUENCIAMENTO') {
    return {
      bg: '#FFF6DF',
      border: '#ECD29E',
      text: '#9C5B17',
      softText: '#855015',
    };
  }

  return {
    bg: '#F1E6D8',
    border: '#DCC4A8',
    text: '#6E4420',
    softText: '#6E4420',
  };
}

function opAbbr(tipoOperacao: string | null | undefined): string {
  const key = (tipoOperacao ?? '').toUpperCase();
  if (key === 'ENTRADA') return 'EN';
  if (key === 'SAIDA') return 'SA';
  if (key === 'MOVIMENTACAO') return 'MV';
  if (key === 'AJUSTE_QUANTIDADE') return 'AJ';
  if (key === 'RESEQUENCIAMENTO') return 'RS';
  return 'OP';
}

function getQuantityInfo(item: HistoricoMovimentacaoResponseDTO): QuantityInfo {
  const anterior = Number(item.quantidadeAnterior ?? 0);
  const nova = Number(item.quantidadeNova ?? 0);
  return { anterior, nova, delta: nova - anterior };
}

function quantityFlowLabel(item: HistoricoMovimentacaoResponseDTO): string {
  const { anterior, nova } = getQuantityInfo(item);
  return `${anterior} → ${nova} un.`;
}

function qtyDetail(item: HistoricoMovimentacaoResponseDTO): string {
  const { delta } = getQuantityInfo(item);
  const op = normalizeOperation(item.tipoOperacao);
  const origem = item.nivelOrigemIdentificador ?? '';
  const destino = item.nivelDestinoIdentificador ?? '';

  if (op === 'MOVIMENTACAO') {
    if (origem && destino) {
      return `Realocado de ${origem} para ${destino}.`;
    }
    return 'Realocado internamente.';
  }

  if (op === 'RESEQUENCIAMENTO') {
    if (origem && destino) {
      return `Realocado automaticamente: ${origem} → ${destino}.`;
    }
    return 'Reposicionamento automático concluído.';
  }

  if (op === 'ENTRADA') {
    return delta > 0 ? `Adicionado ${delta} un.` : 'Entrada registrada.';
  }

  if (op === 'SAIDA') {
    return delta < 0 ? `Removido ${Math.abs(delta)} un.` : 'Saída registrada.';
  }

  if (op === 'AJUSTE_QUANTIDADE') {
    if (delta > 0) {
      return `Ajuste positivo: +${delta} un.`;
    }
    if (delta < 0) {
      return `Ajuste negativo: -${Math.abs(delta)} un.`;
    }
    return 'Ajuste sem mudança líquida.';
  }

  if (delta > 0) {
    return `Adicionado ${delta} un.`;
  }
  if (delta < 0) {
    return `Removido ${Math.abs(delta)} un.`;
  }
  return 'Sem alteração líquida.';
}

function locationLabel(
  item: HistoricoMovimentacaoResponseDTO,
  locationByNivelId: LocationByNivelId,
  gradeById: GradeById,
  fileiraById: FileiraById,
  itemLocationById: ItemLocationById,
  minuteNivelLocationByKey: MinuteNivelLocationByKey
): string {
  const operation = normalizeOperation(item.tipoOperacao);
  const parsedFromDetails = parseLocationFromDetails(item.detalhesAlteracao);
  const removedItemId = parseRemovedItemIdFromDetails(item.detalhesAlteracao);
  const mappedByItemId =
    typeof item.itemEstoqueId === 'number' ? itemLocationById[item.itemEstoqueId] : undefined;
  const mappedByRemovedItemId =
    typeof removedItemId === 'number' ? itemLocationById[removedItemId] : undefined;
  const mappedByMinuteNivel =
    minuteNivelLocationByKey[toMinuteNivelKey(item.timestamp, parsedFromDetails.nivel)];
  const mappedCurrent = mapByNivelId(item.nivelId, locationByNivelId);
  const mappedOrigin = mapByNivelId(item.nivelOrigemId, locationByNivelId);
  const mappedDestination = mapByNivelId(item.nivelDestinoId, locationByNivelId);
  const mappedCurrentGrade = mapByGradeId(item.gradeId, gradeById);
  const mappedOriginGrade = mapByGradeId(item.gradeOrigemId, gradeById);
  const mappedDestinationGrade = mapByGradeId(item.gradeDestinoId, gradeById);
  const mappedCurrentFileira = mapByFileiraId(item.fileiraId, fileiraById);
  const mappedOriginFileira = mapByFileiraId(item.fileiraOrigemId, fileiraById);
  const mappedDestinationFileira = mapByFileiraId(item.fileiraDestinoId, fileiraById);
  const hasOriginReference = Boolean(
    item.nivelOrigemId ||
    normalizeLabel(item.nivelOrigemIdentificador) ||
    item.gradeOrigemId ||
    normalizeLabel(item.gradeOrigemIdentificador) ||
    item.fileiraOrigemId ||
    normalizeLabel(item.fileiraOrigemIdentificador)
  );
  const hasDestinationReference = Boolean(
    item.nivelDestinoId ||
    normalizeLabel(item.nivelDestinoIdentificador) ||
    item.gradeDestinoId ||
    normalizeLabel(item.gradeDestinoIdentificador) ||
    item.fileiraDestinoId ||
    normalizeLabel(item.fileiraDestinoIdentificador)
  );

  const current = {
    fileira:
      normalizeLabel(item.fileiraIdentificador) ||
      normalizeLabel(mappedCurrent?.fileira) ||
      normalizeLabel(mappedCurrentGrade?.fileira) ||
      normalizeLabel(mappedCurrentFileira) ||
      normalizeLabel(mappedByItemId?.fileira) ||
      normalizeLabel(mappedByRemovedItemId?.fileira) ||
      normalizeLabel(mappedByMinuteNivel?.fileira) ||
      normalizeLabel(parsedFromDetails.fileira),
    grade:
      normalizeLabel(item.gradeIdentificador) ||
      normalizeLabel(mappedCurrent?.grade) ||
      normalizeLabel(mappedCurrentGrade?.grade) ||
      normalizeLabel(mappedByItemId?.grade) ||
      normalizeLabel(mappedByRemovedItemId?.grade) ||
      normalizeLabel(mappedByMinuteNivel?.grade) ||
      normalizeLabel(parsedFromDetails.grade),
    nivel:
      normalizeLabel(item.nivelIdentificador) ||
      normalizeLabel(mappedCurrent?.nivel) ||
      normalizeLabel(mappedByItemId?.nivel) ||
      normalizeLabel(mappedByRemovedItemId?.nivel) ||
      normalizeLabel(mappedByMinuteNivel?.nivel) ||
      normalizeLabel(parsedFromDetails.nivel),
  };

  const origin = {
    fileira:
      normalizeLabel(item.fileiraOrigemIdentificador) ||
      normalizeLabel(mappedOrigin?.fileira) ||
      normalizeLabel(mappedOriginGrade?.fileira) ||
      normalizeLabel(mappedOriginFileira),
    grade:
      normalizeLabel(item.gradeOrigemIdentificador) ||
      normalizeLabel(mappedOrigin?.grade) ||
      normalizeLabel(mappedOriginGrade?.grade),
    nivel: normalizeLabel(item.nivelOrigemIdentificador) || normalizeLabel(mappedOrigin?.nivel),
  };

  const destination = {
    fileira:
      normalizeLabel(item.fileiraDestinoIdentificador) ||
      normalizeLabel(mappedDestination?.fileira) ||
      normalizeLabel(mappedDestinationGrade?.fileira) ||
      normalizeLabel(mappedDestinationFileira),
    grade:
      normalizeLabel(item.gradeDestinoIdentificador) ||
      normalizeLabel(mappedDestination?.grade) ||
      normalizeLabel(mappedDestinationGrade?.grade),
    nivel:
      normalizeLabel(item.nivelDestinoIdentificador) || normalizeLabel(mappedDestination?.nivel),
  };

  const canShowRoute =
    (operation === 'MOVIMENTACAO' || operation === 'RESEQUENCIAMENTO') &&
    hasOriginReference &&
    hasDestinationReference &&
    hasFullLocation(origin) &&
    hasFullLocation(destination);

  if (canShowRoute) {
    return `${formatKnownLocation(origin)} → ${formatKnownLocation(destination)}`;
  }
  if (hasLocation(current)) {
    return formatKnownLocation(current);
  }
  if (hasLocation(origin)) {
    return `Origem: ${formatKnownLocation(origin)}`;
  }
  if (hasLocation(destination)) {
    return `Destino: ${formatKnownLocation(destination)}`;
  }
  return 'Localização não informada';
}

export default function HistoryScreen() {
  const { theme } = useThemeContext();
  const { width } = useWindowDimensions();
  const isCompact = width < 820;
  const isCompactDatePicker = width < 560;
  const colors = theme.colors as typeof theme.colors & { textSecondary?: string };
  const textSecondary = colors.textSecondary ?? theme.colors.onSurfaceVariant;

  const [search, setSearch] = useState('');
  const [operationFilter, setOperationFilter] = useState<QuickType>('');
  const [isOperationDropdownOpen, setIsOperationDropdownOpen] = useState(false);
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = useState(false);
  const [compactDateStep, setCompactDateStep] = useState<'start' | 'end'>('start');
  const [rangeStartDate, setRangeStartDate] = useState<Date | undefined>(undefined);
  const [rangeEndDate, setRangeEndDate] = useState<Date | undefined>(undefined);
  const [items, setItems] = useState<HistoricoMovimentacaoResponseDTO[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<HistoricoMovimentacaoResponseDTO | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [locationByNivelId, setLocationByNivelId] = useState<LocationByNivelId>({});
  const [gradeById, setGradeById] = useState<GradeById>({});
  const [fileiraById, setFileiraById] = useState<FileiraById>({});
  const [itemLocationById, setItemLocationById] = useState<ItemLocationById>({});
  const [minuteNivelLocationByKey, setMinuteNivelLocationByKey] =
    useState<MinuteNivelLocationByKey>({});
  const [appliedFilterDto, setAppliedFilterDto] = useState<HistoricoMovimentacaoFilterRequestDTO>(
    {}
  );
  const locationByNivelIdRef = useRef<LocationByNivelId>({});
  const gradeByIdRef = useRef<GradeById>({});
  const fileiraByIdRef = useRef<FileiraById>({});
  const itemLocationByIdRef = useRef<ItemLocationById>({});
  const minuteNivelLocationByKeyRef = useRef<MinuteNivelLocationByKey>({});
  const filterDtoRef = useRef<HistoricoMovimentacaoFilterRequestDTO>({});

  const selectedDateRangeLabel = useMemo(
    () => dateRangeLabel(rangeStartDate, rangeEndDate),
    [rangeEndDate, rangeStartDate]
  );
  const selectedDateRangeLabelCompact = useMemo(
    () => dateRangeLabelCompact(rangeStartDate, rangeEndDate),
    [rangeEndDate, rangeStartDate]
  );
  const selectedOperationLabel = useMemo(
    () =>
      QUICK_FILTERS.find((option) => option.value === operationFilter)?.label ??
      QUICK_FILTERS[0].label,
    [operationFilter]
  );

  const filterDto = useMemo<HistoricoMovimentacaoFilterRequestDTO>(() => {
    const dto: HistoricoMovimentacaoFilterRequestDTO = {};
    if (search.trim()) dto.textoLivre = search.trim();
    if (operationFilter) dto.tipoOperacao = operationFilter;
    if (rangeStartDate) dto.dataInicio = toIsoDate(rangeStartDate);
    if (rangeEndDate) dto.dataFim = toIsoDate(rangeEndDate);
    return dto;
  }, [operationFilter, rangeEndDate, rangeStartDate, search]);

  const hasFilters = useMemo(() => hasActiveFilters(appliedFilterDto), [appliedFilterDto]);
  const historyEmptyCopy = useMemo(() => getApiEmptyCopy('history', hasFilters), [hasFilters]);

  const commitLocationMaps = useCallback(
    (
      nextByNivel: LocationByNivelId,
      nextByGrade: GradeById,
      nextByFileira: FileiraById,
      nextByItem: ItemLocationById,
      nextByMinuteNivel: MinuteNivelLocationByKey
    ) => {
      locationByNivelIdRef.current = nextByNivel;
      gradeByIdRef.current = nextByGrade;
      fileiraByIdRef.current = nextByFileira;
      itemLocationByIdRef.current = nextByItem;
      minuteNivelLocationByKeyRef.current = nextByMinuteNivel;
      setLocationByNivelId(nextByNivel);
      setGradeById(nextByGrade);
      setFileiraById(nextByFileira);
      setItemLocationById(nextByItem);
      setMinuteNivelLocationByKey(nextByMinuteNivel);
    },
    []
  );

  const mergeLocationHintsFromRows = useCallback(
    (rows: HistoricoMovimentacaoResponseDTO[]) => {
      if (!rows.length) {
        return;
      }

      const nextByNivel = { ...locationByNivelIdRef.current };
      const nextByGrade = { ...gradeByIdRef.current };
      const nextByFileira = { ...fileiraByIdRef.current };
      const nextByItem = { ...itemLocationByIdRef.current };
      const nextByMinuteNivel = { ...minuteNivelLocationByKeyRef.current };

      for (const row of rows) {
        mergeLocationMapsFromHistoryItem(
          row,
          nextByNivel,
          nextByGrade,
          nextByFileira,
          nextByItem,
          nextByMinuteNivel
        );
      }

      commitLocationMaps(nextByNivel, nextByGrade, nextByFileira, nextByItem, nextByMinuteNivel);
    },
    [commitLocationMaps]
  );

  const fetchPage = useCallback(
    async (
      targetPage: number,
      append: boolean,
      trigger: 'initial' | 'refresh' | 'more' = 'initial',
      forcedFilter?: HistoricoMovimentacaoFilterRequestDTO
    ) => {
      if (trigger === 'initial') setLoading(true);
      if (trigger === 'refresh') setRefreshing(true);
      if (trigger === 'more') setLoadingMore(true);
      if (!append) setErrorMessage('');

      try {
        const effectiveFilter = forcedFilter ?? filterDtoRef.current;
        const response = hasActiveFilters(effectiveFilter)
          ? await filtrarHistorico(effectiveFilter, targetPage, PAGE_SIZE)
          : await listarHistorico(targetPage, PAGE_SIZE);

        const content = Array.isArray(response.content) ? response.content : [];
        mergeLocationHintsFromRows(content);
        setItems((prev) => (append ? [...prev, ...content] : content));
        setPage(response.number ?? targetPage);
        setHasMore(Boolean(!response.last));
      } catch (error: any) {
        const fallback = API_STATE_MESSAGES.history.error.description;
        const backendMessage =
          typeof error?.response?.data === 'string'
            ? error.response.data
            : (error?.response?.data?.message ?? '');
        const resolvedMessage = backendMessage || fallback;

        if (append) {
          setSnackbarMessage(resolvedMessage);
        } else {
          setErrorMessage(resolvedMessage);
          setItems([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [mergeLocationHintsFromRows]
  );

  const loadFirstPage = useCallback(
    async (forcedFilter?: HistoricoMovimentacaoFilterRequestDTO) => {
      if (forcedFilter) {
        filterDtoRef.current = forcedFilter;
        setAppliedFilterDto(forcedFilter);
      }
      setItems([]);
      setLoading(true);
      setErrorMessage('');
      setPage(0);
      setHasMore(true);
      await fetchPage(0, false, 'initial', forcedFilter);
    },
    [fetchPage]
  );

  const handleApplyFilters = useCallback(async () => {
    setIsOperationDropdownOpen(false);
    setIsApplyingFilters(true);

    try {
      await loadFirstPage(filterDto);
    } finally {
      setIsApplyingFilters(false);
    }
  }, [filterDto, loadFirstPage]);

  const openDatePicker = useCallback(() => {
    if (isCompactDatePicker) {
      setCompactDateStep('start');
    }
    setIsDateRangePickerOpen(true);
  }, [isCompactDatePicker]);

  const dismissDatePicker = useCallback(() => {
    setIsDateRangePickerOpen(false);
    setCompactDateStep('start');
  }, []);

  const handleCompactDateConfirm = useCallback(
    ({ date }: { date: Date | undefined }) => {
      setIsDateRangePickerOpen(false);

      if (compactDateStep === 'start') {
        const nextStart = date ?? undefined;
        setRangeStartDate(nextStart);

        if (!nextStart) {
          setRangeEndDate(undefined);
          setCompactDateStep('start');
          return;
        }

        if (rangeEndDate && rangeEndDate < nextStart) {
          setRangeEndDate(undefined);
        }

        setCompactDateStep('end');
        setTimeout(() => {
          setIsDateRangePickerOpen(true);
        }, 0);
        return;
      }

      const nextEnd = date ?? undefined;
      if (!nextEnd) {
        setRangeEndDate(undefined);
        setCompactDateStep('start');
        return;
      }

      if (rangeStartDate && nextEnd < rangeStartDate) {
        setRangeStartDate(nextEnd);
        setRangeEndDate(rangeStartDate);
      } else {
        setRangeEndDate(nextEnd);
      }

      setCompactDateStep('start');
    },
    [compactDateStep, rangeEndDate, rangeStartDate]
  );

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
    }, [loadFirstPage])
  );

  const clearFilters = useCallback(async () => {
    setSearch('');
    setOperationFilter('');
    setIsOperationDropdownOpen(false);
    setRangeStartDate(undefined);
    setRangeEndDate(undefined);
    const emptyFilter: HistoricoMovimentacaoFilterRequestDTO = {};
    filterDtoRef.current = emptyFilter;
    await loadFirstPage(emptyFilter);
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    await fetchPage(page + 1, true, 'more');
  }, [fetchPage, hasMore, loading, loadingMore, page]);

  const openDetails = useCallback(
    async (id: number) => {
      setDetailLoading(true);
      try {
        const detail = await buscarHistoricoPorId(id);
        mergeLocationHintsFromRows([detail]);
        setSelected(detail);
      } catch (error: any) {
        const fallback = 'Não foi possível carregar os detalhes.';
        const backendMessage =
          typeof error?.response?.data === 'string'
            ? error.response.data
            : (error?.response?.data?.message ?? '');
        setSnackbarMessage(backendMessage || fallback);
      } finally {
        setDetailLoading(false);
      }
    },
    [mergeLocationHintsFromRows]
  );

  const renderItem = ({ item }: { item: HistoricoMovimentacaoResponseDTO }) => {
    const tone = operationTone(item.tipoOperacao);
    const flowLabel = quantityFlowLabel(item);
    const detailLabel = qtyDetail(item);

    return (
      <View style={styles.frame}>
        <Surface
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
          elevation={0}
        >
          <View style={[styles.top, isCompact && styles.topCompact]}>
            <View style={[styles.leftArea, isCompact && styles.leftAreaCompact]}>
              <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                <Text style={[styles.badgeText, { color: tone.text }]}>
                  {opAbbr(item.tipoOperacao)}
                </Text>
              </View>
              <View style={styles.meta}>
                <Text style={[styles.date, { color: textSecondary }]}>
                  {fmtDate(item.timestamp)}
                </Text>
                <Text style={[styles.name, { color: theme.colors.text }]}>
                  {item.produtoNomeModelo ?? 'Produto não informado'}
                </Text>
                <Text style={[styles.info, { color: textSecondary }]}>
                  Usuário: {item.usuarioNome ?? item.usuarioLogin ?? 'Não identificado'}
                </Text>
                <Text style={[styles.info, { color: textSecondary }]}>
                  {locationLabel(
                    item,
                    locationByNivelId,
                    gradeById,
                    fileiraById,
                    itemLocationById,
                    minuteNivelLocationByKey
                  )}
                </Text>
              </View>
            </View>

            <View style={[styles.rightPanel, isCompact && styles.rightPanelCompact]}>
              <View
                style={[
                  styles.operationTag,
                  isCompact && styles.operationTagCompact,
                  { backgroundColor: tone.bg, borderColor: tone.border },
                ]}
              >
                <Text style={[styles.operationTagText, { color: tone.text }]}>
                  {opLabel(item.tipoOperacao)}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.metricsRow, isCompact && styles.metricsRowCompact]}>
            <View style={[styles.metricBox, { borderColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.metricLabel, { color: textSecondary }]}>Quantidade</Text>
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>{flowLabel}</Text>
            </View>
            <View
              style={[
                styles.metricBox,
                styles.metricHighlight,
                { backgroundColor: tone.bg, borderColor: tone.border },
              ]}
            >
              <Text style={[styles.metricHint, { color: tone.text }]}>{detailLabel}</Text>
            </View>
            <Button
              mode="outlined"
              icon="text-box-search-outline"
              onPress={() => void openDetails(item.id)}
              accessibilityLabel={`action-historico-detalhes-${item.id}`}
              contentStyle={styles.detailsButtonContent}
              style={[styles.detailsButton, isCompact && styles.detailsButtonCompact]}
            >
              Ver detalhes
            </Button>
          </View>
        </Surface>
      </View>
    );
  };

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        removeClippedSubviews={false}
        ListHeaderComponentStyle={
          isOperationDropdownOpen ? styles.historyHeaderRaised : styles.historyHeaderBase
        }
        onScrollBeginDrag={() => setIsOperationDropdownOpen(false)}
        onEndReachedThreshold={0.3}
        onEndReached={() => void loadMore()}
        ListHeaderComponent={
          <View style={[styles.frame, styles.headerFrame]}>
            <Surface
              style={[
                styles.section,
                isOperationDropdownOpen && styles.sectionRaised,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
              ]}
              elevation={0}
            >
              <AppTextInput
                label="Buscar no histórico"
                value={search}
                onChangeText={(value) => {
                  setSearch(value);
                  setIsOperationDropdownOpen(false);
                }}
                left={<TextInput.Icon icon="magnify" />}
                style={styles.input}
              />

              <View style={styles.filtersStack}>
                <View style={[styles.filtersRow, isCompact && styles.filtersRowCompact]}>
                  <View
                    style={[
                      styles.operationDropdownWrap,
                      isCompact && styles.operationDropdownWrapCompact,
                      isOperationDropdownOpen && styles.operationDropdownWrapOpen,
                    ]}
                  >
                    <Text style={[styles.filterLabel, { color: theme.colors.primary }]}>
                      Status
                    </Text>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="action-historico-tipo-toggle"
                      accessibilityState={{ expanded: isOperationDropdownOpen }}
                      onPress={() => setIsOperationDropdownOpen((prev) => !prev)}
                      style={(state) => {
                        const pressed = Boolean(state.pressed);
                        const isHovered = Boolean((state as any).hovered);
                        const active = isOperationDropdownOpen || isHovered || pressed;

                        return [
                          styles.operationDropdownTrigger,
                          Platform.OS === 'web' ? styles.interactiveWeb : null,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                            borderColor: active ? theme.colors.primary : theme.colors.outline,
                            shadowColor: theme.colors.primary,
                            shadowOpacity: active ? 0.12 : 0.04,
                            shadowRadius: active ? 14 : 8,
                            shadowOffset: { width: 0, height: active ? 8 : 4 },
                            elevation: active ? 3 : 1,
                            opacity: pressed ? 0.96 : 1,
                            transform: [{ translateY: isHovered ? -1 : 0 }],
                          },
                        ];
                      }}
                    >
                      {(state) => {
                        const pressed = Boolean(state.pressed);
                        const isHovered = Boolean((state as any).hovered);
                        const active = isOperationDropdownOpen || isHovered || pressed;
                        const triggerTextColor = active ? theme.colors.primary : theme.colors.text;

                        return (
                          <>
                            <Text
                              style={[styles.operationDropdownValue, { color: triggerTextColor }]}
                            >
                              {selectedOperationLabel}
                            </Text>
                            <MaterialCommunityIcons
                              name={isOperationDropdownOpen ? 'chevron-up' : 'chevron-down'}
                              size={18}
                              color={theme.colors.primary}
                            />
                          </>
                        );
                      }}
                    </Pressable>

                    {isOperationDropdownOpen ? (
                      <View
                        style={[
                          styles.operationDropdownMenu,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.outline,
                            shadowColor: theme.colors.primary,
                          },
                        ]}
                      >
                        {QUICK_FILTERS.map((opt) => {
                          const selected = operationFilter === opt.value;

                          return (
                            <Pressable
                              key={opt.value || 'todos'}
                              accessibilityRole="button"
                              accessibilityLabel={`action-historico-tipo-${(
                                opt.value || 'todos'
                              ).toLowerCase()}`}
                              accessibilityState={{ selected }}
                              onPress={() => {
                                setOperationFilter(opt.value);
                                setIsOperationDropdownOpen(false);
                              }}
                              style={(state) => {
                                const pressed = Boolean(state.pressed);
                                const isHovered = Boolean((state as any).hovered);
                                const active = selected || isHovered || pressed;

                                return [
                                  styles.operationDropdownOption,
                                  Platform.OS === 'web' ? styles.interactiveWeb : null,
                                  {
                                    backgroundColor: active
                                      ? theme.colors.surfaceVariant
                                      : 'transparent',
                                    borderColor: active
                                      ? theme.colors.primary
                                      : theme.colors.outline,
                                    opacity: pressed ? 0.96 : 1,
                                    transform: [{ translateY: isHovered ? -1 : 0 }],
                                  },
                                ];
                              }}
                            >
                              <Text
                                style={[
                                  styles.operationDropdownOptionText,
                                  {
                                    color: selected ? theme.colors.primary : theme.colors.text,
                                  },
                                ]}
                              >
                                {opt.label}
                              </Text>
                              {selected ? (
                                <MaterialCommunityIcons
                                  name="check"
                                  size={16}
                                  color={theme.colors.primary}
                                />
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>

                  <View style={[styles.rangeRow, isCompact && styles.rangeRowCompact]}>
                    <Text style={[styles.filterLabel, { color: theme.colors.primary }]}>
                      Período
                    </Text>

                    <Pressable
                      onPress={() => {
                        setIsOperationDropdownOpen(false);
                        openDatePicker();
                      }}
                      accessibilityLabel="action-historico-periodo"
                      accessibilityRole="button"
                      style={(state) => {
                        const pressed = Boolean(state.pressed);
                        const isHovered = Boolean((state as any).hovered);
                        const active = isHovered || pressed;

                        return [
                          styles.periodTrigger,
                          isCompact && styles.periodTriggerCompact,
                          Platform.OS === 'web' ? styles.interactiveWeb : null,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                            borderColor: active ? theme.colors.primary : theme.colors.outline,
                            shadowColor: theme.colors.primary,
                            shadowOpacity: active ? 0.12 : 0.04,
                            shadowRadius: active ? 14 : 8,
                            shadowOffset: { width: 0, height: active ? 8 : 4 },
                            elevation: active ? 3 : 1,
                            opacity: pressed ? 0.96 : 1,
                            transform: [{ translateY: isHovered ? -1 : 0 }],
                          },
                        ];
                      }}
                    >
                      {(state) => {
                        const pressed = Boolean(state.pressed);
                        const isHovered = Boolean((state as any).hovered);
                        const active = isHovered || pressed;
                        const contentColor = active ? theme.colors.primary : theme.colors.text;

                        return (
                          <>
                            <MaterialCommunityIcons
                              name="calendar-range"
                              size={16}
                              color={contentColor}
                            />
                            <Text style={[styles.periodTriggerValue, { color: contentColor }]}>
                              {isCompact ? selectedDateRangeLabelCompact : selectedDateRangeLabel}
                            </Text>
                          </>
                        );
                      }}
                    </Pressable>
                  </View>

                  <View style={[styles.filtersFooter, isCompact && styles.filtersFooterCompact]}>
                    <View style={[styles.headerActions, isCompact && styles.headerActionsCompact]}>
                      <Pressable
                        onPress={() => void clearFilters()}
                        accessibilityLabel="action-historico-limpar"
                        accessibilityRole="button"
                        style={(state) => {
                          const pressed = Boolean(state.pressed);
                          const isHovered = Boolean((state as any).hovered);
                          const active = isHovered || pressed;

                          return [
                            styles.clearActionButton,
                            isCompact && styles.headerActionButtonCompact,
                            Platform.OS === 'web' ? styles.interactiveWeb : null,
                            {
                              backgroundColor: theme.colors.surface,
                              borderColor: active ? theme.colors.primary : theme.colors.outline,
                              shadowColor: theme.colors.primary,
                              shadowOpacity: active ? 0.1 : 0.03,
                              shadowRadius: active ? 12 : 6,
                              shadowOffset: { width: 0, height: active ? 8 : 4 },
                              elevation: active ? 2 : 1,
                              opacity: pressed ? 0.96 : 1,
                              transform: [{ translateY: isHovered ? -1 : 0 }],
                            },
                          ];
                        }}
                      >
                        {(state) => {
                          const pressed = Boolean(state.pressed);
                          const isHovered = Boolean((state as any).hovered);
                          const active = isHovered || pressed;

                          return (
                            <Text
                              style={[
                                styles.clearActionText,
                                { color: active ? theme.colors.primary : theme.colors.text },
                              ]}
                            >
                              Limpar
                            </Text>
                          );
                        }}
                      </Pressable>
                      <Pressable
                        onPress={() => void handleApplyFilters()}
                        accessibilityLabel="action-historico-aplicar"
                        accessibilityRole="button"
                        disabled={isApplyingFilters}
                        style={(state) => {
                          const pressed = Boolean(state.pressed);
                          const isHovered = Boolean((state as any).hovered);
                          const active = isHovered || pressed;

                          return [
                            styles.filterActionButton,
                            isCompact && styles.headerActionButtonCompact,
                            Platform.OS === 'web' ? styles.interactiveWeb : null,
                            {
                              backgroundColor: theme.colors.surface,
                              borderColor: active ? theme.colors.primary : theme.colors.outline,
                              shadowColor: theme.colors.primary,
                              shadowOpacity: active ? 0.1 : 0.03,
                              shadowRadius: active ? 12 : 6,
                              shadowOffset: { width: 0, height: active ? 8 : 4 },
                              elevation: active ? 2 : 1,
                              opacity: isApplyingFilters ? 0.72 : pressed ? 0.96 : 1,
                              transform: [{ translateY: isHovered ? -1 : 0 }],
                            },
                          ];
                        }}
                      >
                        {(state) => {
                          const pressed = Boolean(state.pressed);
                          const isHovered = Boolean((state as any).hovered);
                          const active = isHovered || pressed;
                          const contentColor = active ? theme.colors.primary : theme.colors.text;

                          return (
                            <>
                              {isApplyingFilters ? (
                                <MaterialCommunityIcons
                                  name="loading"
                                  size={18}
                                  color={theme.colors.primary}
                                />
                              ) : (
                                <MaterialCommunityIcons
                                  name="magnify"
                                  size={18}
                                  color={active ? theme.colors.primary : theme.colors.primary}
                                />
                              )}
                              <Text
                                style={[
                                  styles.filterActionText,
                                  { color: contentColor },
                                ]}
                              >
                                Filtrar
                              </Text>
                            </>
                          );
                        }}
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            </Surface>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.frame}>
              <Surface
                style={[
                  styles.empty,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                elevation={0}
              >
                <AppLoadingState message="Carregando histórico..." style={styles.loadingCard} />
              </Surface>
            </View>
          ) : errorMessage ? (
            <View style={styles.frame}>
              <Surface
                style={[
                  styles.empty,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                elevation={0}
              >
                <AppEmptyState
                  title={API_STATE_MESSAGES.history.error.title}
                  description={errorMessage}
                  icon="alert-circle-outline"
                  tone="error"
                />
              </Surface>
            </View>
          ) : (
            <View style={styles.frame}>
              <Surface
                style={[
                  styles.empty,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                elevation={0}
              >
                <AppEmptyState
                  title={historyEmptyCopy.title}
                  description={historyEmptyCopy.description}
                  icon="history"
                />
              </Surface>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {loadingMore ? (
              <AppLoadingState
                message="Carregando mais..."
                variant="inline"
                style={styles.inlineLoading}
              />
            ) : null}
            {!loading && !loadingMore && items.length > 0 && !hasMore ? (
              <Text style={[styles.info, { color: textSecondary }]}>Fim do histórico</Text>
            ) : null}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchPage(0, false, 'refresh')}
          />
        }
      />

      {isCompactDatePicker ? (
        <DatePickerModal
          key={`history-compact-${compactDateStep}-${isDateRangePickerOpen ? 'open' : 'closed'}`}
          locale="pt-BR"
          mode="single"
          visible={isDateRangePickerOpen}
          onDismiss={dismissDatePicker}
          date={compactDateStep === 'start' ? rangeStartDate : rangeEndDate}
          onConfirm={handleCompactDateConfirm}
          saveLabel={compactDateStep === 'start' ? 'Próximo' : 'Confirmar'}
          label={compactDateStep === 'start' ? 'Selecionar início' : 'Selecionar fim'}
          presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
          disableStatusBarPadding
          allowEditing={false}
          inputEnabled={false}
        />
      ) : (
        <DatePickerModal
          key={`history-range-${isDateRangePickerOpen ? 'open' : 'closed'}`}
          locale="pt-BR"
          mode="range"
          visible={isDateRangePickerOpen}
          onDismiss={() => setIsDateRangePickerOpen(false)}
          startDate={rangeStartDate}
          endDate={rangeEndDate}
          onConfirm={({ startDate, endDate }) => {
            setIsDateRangePickerOpen(false);
            setRangeStartDate(startDate ?? undefined);
            setRangeEndDate(endDate ?? undefined);
          }}
          saveLabel="Confirmar"
          label="Selecionar período"
          startLabel="Início"
          endLabel="Fim"
          presentationStyle="overFullScreen"
          disableStatusBarPadding
          allowEditing={false}
          inputEnabled={false}
        />
      )}

      <Portal>
        <Modal
          visible={selected !== null || detailLoading}
          onDismiss={() => {
            setSelected(null);
            setDetailLoading(false);
          }}
          contentContainerStyle={styles.modalFrame}
        >
          <View
            style={[
              styles.modal,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
            ]}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {detailLoading ? (
                <AppLoadingState message="Carregando detalhes..." style={styles.loadingCard} />
              ) : (
                <>
                  <View style={[styles.modalHeader, isCompact && styles.modalHeaderCompact]}>
                    <View style={styles.modalTitleRow}>
                      <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                        Detalhes da movimentação
                      </Text>
                      <IconButton
                        icon="close"
                        size={20}
                        onPress={() => setSelected(null)}
                        iconColor={theme.colors.primary}
                        accessibilityLabel="action-historico-fechar-detalhes"
                        style={[
                          styles.modalCloseButton,
                          { borderColor: theme.colors.outlineVariant },
                        ]}
                      />
                    </View>
                    {selected ? (
                      <View
                        style={[
                          styles.operationTag,
                          styles.modalOperationTag,
                          {
                            backgroundColor: operationTone(selected.tipoOperacao).bg,
                            borderColor: operationTone(selected.tipoOperacao).border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.operationTagText,
                            { color: operationTone(selected.tipoOperacao).text },
                          ]}
                        >
                          {opLabel(selected.tipoOperacao)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.date, { color: textSecondary }]}>
                    Registrado em {fmtDate(selected?.timestamp)}
                  </Text>
                  {selected ? (
                    <View
                      style={[
                        styles.summaryBox,
                        {
                          backgroundColor: operationTone(selected.tipoOperacao).bg,
                          borderColor: operationTone(selected.tipoOperacao).border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.summaryTitle,
                          { color: operationTone(selected.tipoOperacao).text },
                        ]}
                      >
                        {qtyDetail(selected)}
                      </Text>
                      <Text
                        style={[
                          styles.summarySub,
                          { color: operationTone(selected.tipoOperacao).softText },
                        ]}
                      >
                        Quantidade: {quantityFlowLabel(selected)}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.detailGrid, isCompact && styles.detailGridCompact]}>
                    <View style={[styles.detailCard, { borderColor: theme.colors.outlineVariant }]}>
                      <Text style={[styles.detailLabel, { color: textSecondary }]}>Produto</Text>
                      <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                        {selected?.produtoNomeModelo ?? 'Não informado'}
                      </Text>
                    </View>
                    <View style={[styles.detailCard, { borderColor: theme.colors.outlineVariant }]}>
                      <Text style={[styles.detailLabel, { color: textSecondary }]}>Usuário</Text>
                      <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                        {selected?.usuarioNome ?? selected?.usuarioLogin ?? 'Não identificado'}
                      </Text>
                    </View>
                    <View style={[styles.detailCard, { borderColor: theme.colors.outlineVariant }]}>
                      <Text style={[styles.detailLabel, { color: textSecondary }]}>
                        Localização
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                        {selected
                          ? locationLabel(
                              selected,
                              locationByNivelId,
                              gradeById,
                              fileiraById,
                              itemLocationById,
                              minuteNivelLocationByKey
                            )
                          : 'Fileira - / Grade - / Nível -'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>
                    Detalhes técnicos
                  </Text>
                  <View
                    style={[styles.detailTextBox, { borderColor: theme.colors.outlineVariant }]}
                  >
                    <Text style={[styles.details, { color: textSecondary }]}>
                      {selected?.detalhesAlteracao?.trim()
                        ? selected.detalhesAlteracao.trim()
                        : 'Sem detalhes adicionais.'}
                    </Text>
                  </View>
                  <View style={styles.actions}>
                    <Button mode="contained" onPress={() => setSelected(null)}>
                      Fechar
                    </Button>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </Modal>
      </Portal>

      <Snackbar
        visible={Boolean(snackbarMessage)}
        onDismiss={() => setSnackbarMessage('')}
        duration={3200}
      >
        {snackbarMessage}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 28 },
  frame: { width: '100%' },
  historyHeaderBase: { zIndex: 1, position: 'relative' },
  historyHeaderRaised: { zIndex: 220, position: 'relative' },
  headerFrame: { gap: 12, overflow: 'visible', position: 'relative' },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    overflow: 'visible',
    position: 'relative',
  },
  sectionRaised: { zIndex: 240, elevation: 10 },
  input: { marginBottom: 8 },
  filtersStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 8,
    overflow: 'visible',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    overflow: 'visible',
    position: 'relative',
    zIndex: 40,
  },
  filtersRowCompact: { flexDirection: 'column', alignItems: 'stretch' },
  operationDropdownWrap: {
    width: 240,
    minWidth: 200,
    maxWidth: 320,
    flexShrink: 0,
    position: 'relative',
    zIndex: 80,
    overflow: 'visible',
  },
  operationDropdownWrapCompact: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
  },
  operationDropdownWrapOpen: {
    zIndex: 320,
    elevation: 18,
  },
  filterLabel: {
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  operationDropdownTrigger: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  operationDropdownValue: { fontSize: 14, fontWeight: '700' },
  operationDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    gap: 6,
    zIndex: 420,
    elevation: 22,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  operationDropdownOption: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  operationDropdownOptionText: { fontSize: 14, fontWeight: '700' },
  filtersFooter: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'flex-end',
    gap: 8,
    justifyContent: 'flex-end',
    marginLeft: 'auto',
    position: 'relative',
    zIndex: 20,
  },
  filtersFooterCompact: { alignItems: 'stretch', width: '100%', marginLeft: 0 },
  rangeRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 0,
    width: 320,
    minWidth: 220,
    maxWidth: 320,
    flexShrink: 0,
  },
  rangeRowCompact: { width: '100%', minWidth: 0, maxWidth: '100%', flexShrink: 1 },
  periodTrigger: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodTriggerCompact: { width: '100%' },
  periodTriggerValue: { fontSize: 14, fontWeight: '700' },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 8,
    marginLeft: 'auto',
  },
  headerActionsCompact: { marginLeft: 0, width: '100%' },
  headerActionButton: { minWidth: 96 },
  clearActionButton: {
    minWidth: 96,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearActionText: { fontSize: 14, fontWeight: '700' },
  filterActionButton: {
    minWidth: 112,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  filterActionText: { fontSize: 14, fontWeight: '700' },
  headerActionButtonCompact: { flex: 1, minWidth: 0 },
  interactiveWeb:
    Platform.OS === 'web'
      ? ({
          transitionProperty:
            'transform, box-shadow, background-color, border-color, opacity, color',
          transitionDuration: '160ms',
          transitionTimingFunction: 'ease-out',
          cursor: 'pointer',
        } as any)
      : ({} as any),
  actions: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center' },
  topCompact: { flexDirection: 'column', alignItems: 'stretch' },
  leftArea: { flexDirection: 'row', gap: 10, flex: 1, display: 'flex', alignItems: 'center' },
  leftAreaCompact: { width: '100%', alignItems: 'flex-start' },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 14, fontWeight: '800' },
  meta: { flex: 1, gap: 3, minWidth: 0 },
  rightPanel: { alignItems: 'flex-end', justifyContent: 'center', gap: 10, flexShrink: 0 },
  rightPanelCompact: { width: '100%', alignItems: 'flex-start' },
  operationTag: {
    borderWidth: 1,
    borderRadius: 14,
    height: 38,
    paddingHorizontal: 14,
    paddingVertical: 0,
    alignSelf: 'flex-end',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  operationTagCompact: {
    alignSelf: 'flex-start',
    minHeight: 38,
    height: 'auto',
    maxWidth: '100%',
    paddingVertical: 8,
  },
  operationTagText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  date: { fontSize: 12, fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '800' },
  info: { fontSize: 13, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricsRowCompact: { flexDirection: 'column', alignItems: 'stretch' },
  metricBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 52,
    justifyContent: 'center',
  },
  metricHighlight: { minWidth: 220, flex: 1 },
  metricLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  metricValue: { fontSize: 16, fontWeight: '800' },
  metricHint: { fontSize: 14, fontWeight: '800' },
  detailsButton: { borderRadius: 999 },
  detailsButtonCompact: { width: '100%' },
  detailsButtonContent: { height: 38 },
  empty: { borderRadius: 14, borderWidth: 1, padding: 16, alignItems: 'center', gap: 6 },
  loadingCard: { minHeight: 132 },
  footer: { paddingVertical: 8, alignItems: 'center', gap: 6 },
  inlineLoading: { minHeight: 32 },
  modalFrame: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  modal: {
    borderRadius: 18,
    borderWidth: 1,
    maxHeight: '90%',
    maxWidth: 860,
    alignSelf: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  modalScroll: { maxHeight: '100%' },
  modalScrollContent: {
    padding: 16,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  modalHeaderCompact: { flexDirection: 'column', alignItems: 'flex-start' },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalCloseButton: {
    margin: 0,
    borderWidth: 1,
    borderRadius: 999,
  },
  modalOperationTag: { alignSelf: 'flex-start' },
  summaryBox: {
    width: '100%',
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  summaryTitle: { fontSize: 15, fontWeight: '800' },
  summarySub: { fontSize: 13, fontWeight: '700' },
  detailGrid: { width: '100%', flexDirection: 'column', gap: 10 },
  detailGridCompact: { flexDirection: 'column' },
  detailCard: {
    width: '100%',
    alignSelf: 'stretch',
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  detailLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  detailValue: { fontSize: 17, fontWeight: '800' },
  detailTextBox: {
    width: '100%',
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  details: { fontSize: 14, lineHeight: 22, fontWeight: '600' },
});
