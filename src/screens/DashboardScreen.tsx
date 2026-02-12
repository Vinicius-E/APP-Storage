// DashboardScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import AntDesign from '@expo/vector-icons/AntDesign';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeContext } from '../theme/ThemeContext';
import { API } from '../../axios';

type StockRow = {
  id: string;
  produto: string;
  fileira: string;
  grade: string;
  status: 'Disponivel' | 'Reservado' | 'Baixo';
  quantidade: number;
};

type EstoquePosicao = {
  areaId: number;

  fileiraId: number;
  fileiraIdentificador: string;

  gradeId?: number | null;
  gradeIdentificador?: string | null;

  nivelId?: number | null;
  nivelIdentificador?: string | null;

  itemEstoqueId?: number | null;
  quantidade: number;

  produtoId?: number | null;
  codigoSistemaWester?: string | null;
  nomeModelo?: string | null;
  cor?: string | null;
  descricao?: string | null;

  produto?: {
    id: number;
    codigoSistemaWester: string;
    cor: string;
    descricao: string;
    nomeModelo: string;
  } | null;
};

const STATUS_COLOR: Record<StockRow['status'], string> = {
  Disponivel: '#2E7D32',
  Reservado: '#E67E22',
  Baixo: '#C62828',
};

const AREA_ID = 1;

export default function DashboardScreen() {
  const { theme } = useThemeContext();
  const { width } = useWindowDimensions();

  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<keyof StockRow>('produto');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [summary, setSummary] = useState({
    fileiras: 0,
    grades: 0,
    itens: 0,
    vazios: 0,
  });

  const isWide = width >= 900;

  const getAuthHeaders = useCallback(async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  }, []);

  const computeStatus = (quantidade: number): StockRow['status'] => {
    if (quantidade <= 10) {
      return 'Baixo';
    }
    return 'Disponivel';
  };

  const normalizeProdutoNome = (pos: EstoquePosicao): string => {
    const nome = (pos.produto?.nomeModelo ?? pos.nomeModelo ?? '').toString().trim();
    if (nome !== '') {
      return nome;
    }
    const codigo = (pos.produto?.codigoSistemaWester ?? pos.codigoSistemaWester ?? '')
      .toString()
      .trim();
    if (codigo !== '') {
      return codigo;
    }
    return 'Sem produto';
  };

  const normalizeGradeIdentificador = (pos: EstoquePosicao): string => {
    const grade = (pos.gradeIdentificador ?? '').toString().trim();
    if (grade !== '') {
      return grade;
    }
    return '-';
  };

  const normalizeFileiraIdentificador = (pos: EstoquePosicao): string => {
    const fileira = (pos.fileiraIdentificador ?? '').toString().trim();
    if (fileira !== '') {
      return fileira;
    }
    return '-';
  };

  const loadDashboard = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const headers = await getAuthHeaders();
        const res = await API.get<EstoquePosicao[]>(`/estoque/posicoes/area/${AREA_ID}`, {
          headers,
        });

        const data = Array.isArray(res.data) ? res.data : [];

        const fileiraIds = new Set<number>();
        const gradeIds = new Set<number>();
        let itens = 0;
        let vazios = 0;

        for (const p of data) {
          if (typeof p.fileiraId === 'number') {
            fileiraIds.add(p.fileiraId);
          }
          if (typeof p.gradeId === 'number') {
            gradeIds.add(p.gradeId);
          }

          const qtd = typeof p.quantidade === 'number' ? p.quantidade : 0;

          if ((p.itemEstoqueId ?? null) === null && qtd === 0) {
            vazios += 1;
          }

          if (qtd > 0) {
            itens += qtd;
          }
        }

        const grouped = new Map<
          string,
          {
            produto: string;
            quantidade: number;
            fileira: string;
            grade: string;
          }
        >();

        for (const p of data) {
          const qtd = typeof p.quantidade === 'number' ? p.quantidade : 0;
          const produtoNome = normalizeProdutoNome(p);

          if (produtoNome === 'Sem produto') {
            continue;
          }
          if (qtd <= 0) {
            continue;
          }

          const fileira = normalizeFileiraIdentificador(p);
          const grade = normalizeGradeIdentificador(p);

          const key = `${produtoNome}__${fileira}__${grade}`;
          const current = grouped.get(key);

          if (!current) {
            grouped.set(key, {
              produto: produtoNome,
              quantidade: qtd,
              fileira,
              grade,
            });
          } else {
            grouped.set(key, {
              ...current,
              quantidade: current.quantidade + qtd,
            });
          }
        }

        const mappedRows: StockRow[] = Array.from(grouped.values()).map((g) => {
          return {
            id: `${g.fileira}-${g.grade}-${g.produto}`.replace(/\s+/g, '_'),
            produto: g.produto,
            fileira: g.fileira,
            grade: g.grade,
            status: computeStatus(g.quantidade),
            quantidade: g.quantidade,
          };
        });

        setRows(mappedRows);
        setSummary({
          fileiras: fileiraIds.size,
          grades: gradeIds.size,
          itens,
          vazios,
        });
      } catch (e: any) {
        setRows([]);
        setSummary({ fileiras: 0, grades: 0, itens: 0, vazios: 0 });
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [getAuthHeaders]
  );

  useEffect(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  const SUMMARY_CARDS = useMemo(() => {
    return [
      { label: 'Fileiras', value: String(summary.fileiras) },
      { label: 'Grades', value: String(summary.grades) },
      { label: 'Itens', value: String(summary.itens) },
      { label: 'Vazios', value: String(summary.vazios) },
    ];
  }, [summary]);

  const filteredRows = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) {
      return rows;
    }
    return rows.filter((row) => {
      const haystack = [
        row.id,
        row.produto,
        row.fileira,
        row.grade,
        row.status,
        String(row.quantidade),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [filter, rows]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      if (aValue === bValue) {
        return 0;
      }
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
    return sorted;
  }, [filteredRows, sortBy, sortDirection]);

  const pagedRows = useMemo(() => {
    const start = page * itemsPerPage;
    return sortedRows.slice(start, start + itemsPerPage);
  }, [sortedRows, page, itemsPerPage]);

  const totalItems = sortedRows.length;
  const rangeStart = totalItems === 0 ? 0 : page * itemsPerPage + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min((page + 1) * itemsPerPage, totalItems);

  const handleSort = (column: keyof StockRow) => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.cardsRow}>
        {SUMMARY_CARDS.map((card) => (
          <View
            key={card.label}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                shadowColor: theme.colors.text,
              },
            ]}
          >
            <Text style={[styles.cardValue, { color: theme.colors.text }]}>{card.value}</Text>
            <Text
              style={[
                styles.cardLabel,
                { color: (theme.colors as any).textSecondary ?? theme.colors.text },
              ]}
            >
              {card.label}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.tableCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
        ]}
      >
        <View style={styles.tableHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Itens de estoque
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                { color: (theme.colors as any).textSecondary ?? theme.colors.text },
              ]}
            >
              {totalItems} itens no total
            </Text>
          </View>

          <Button
            mode="contained"
            icon="plus"
            onPress={() => {}}
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            textColor={theme.colors.onPrimary}
          >
            Cadastrar produto
          </Button>
        </View>

        <View style={styles.filtersRow}>
          <TextInput
            mode="flat"
            label="Filtrar por produto, fileira, grade"
            value={filter}
            onChangeText={(value) => {
              setFilter(value);
              setPage(0);
            }}
            style={[styles.filterInput, { backgroundColor: theme.colors.surfaceVariant }]}
            underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            textColor={theme.colors.text}
            left={<TextInput.Icon icon="magnify" />}
            theme={{
              colors: {
                primary: theme.colors.primary,
                onSurfaceVariant: (theme.colors as any).textSecondary ?? theme.colors.text,
                background: theme.colors.surfaceVariant,
              },
            }}
          />

          <View style={styles.sortRow}>
            <Text
              style={[
                styles.sortLabel,
                { color: (theme.colors as any).textSecondary ?? theme.colors.text },
              ]}
            >
              Ordenar:
            </Text>
            {(['produto', 'quantidade', 'status'] as Array<keyof StockRow>).map((col) => (
              <Chip
                key={col}
                onPress={() => handleSort(col)}
                style={[
                  styles.sortChip,
                  {
                    backgroundColor:
                      sortBy === col ? theme.colors.primary : theme.colors.surfaceVariant,
                  },
                ]}
                textStyle={{
                  color: sortBy === col ? theme.colors.onPrimary : theme.colors.text,
                  fontWeight: '600',
                }}
              >
                {col === 'produto' ? 'Produto' : col === 'quantidade' ? 'Qtd.' : 'Status'}
                {sortBy === col ? ` ${sortDirection === 'asc' ? '↑' : '↓'}` : ''}
              </Chip>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
              style={{
                marginTop: 10,
                color: (theme.colors as any).textSecondary ?? theme.colors.text,
                fontWeight: '700',
              }}
            >
              Carregando dados reais...
            </Text>
          </View>
        ) : (
          <>
            {isWide && (
              <View style={[styles.listHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
                <Text
                  style={[
                    styles.listHeaderText,
                    styles.flex2,
                    { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                  ]}
                >
                  Produto
                </Text>
                <Text
                  style={[
                    styles.listHeaderText,
                    styles.flex1,
                    { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                  ]}
                >
                  Local
                </Text>
                <Text
                  style={[
                    styles.listHeaderText,
                    styles.flex1,
                    { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                  ]}
                >
                  Status
                </Text>
                <Text
                  style={[
                    styles.listHeaderText,
                    styles.flex1,
                    { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                  ]}
                >
                  Qtd.
                </Text>
              </View>
            )}

            <View style={styles.list}>
              {pagedRows.map((row) => (
                <View
                  key={row.id}
                  style={[
                    styles.stockCard,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <View style={styles.stockTopRow}>
                    <View style={styles.flex2}>
                      <Text style={[styles.stockTitle, { color: theme.colors.text }]}>
                        {row.produto}
                      </Text>
                      {!isWide && (
                        <Text
                          style={[
                            styles.stockSubtitle,
                            { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                          ]}
                        >
                          Fileira {row.fileira} • Grade {row.grade}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.stockQty, { color: theme.colors.text }]}>
                      {row.quantidade}
                    </Text>
                  </View>

                  {isWide && (
                    <View style={styles.stockWideRow}>
                      <Text
                        style={[
                          styles.stockMeta,
                          styles.flex1,
                          { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                        ]}
                      >
                        Fileira {row.fileira} / Grade {row.grade}
                      </Text>
                      <Text
                        style={[
                          styles.stockMeta,
                          styles.flex1,
                          { color: STATUS_COLOR[row.status] },
                        ]}
                      >
                        {row.status}
                      </Text>
                      <Text
                        style={[
                          styles.stockMeta,
                          styles.flex1,
                          { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                        ]}
                      >
                        {row.quantidade} un.
                      </Text>
                    </View>
                  )}

                  {!isWide && (
                    <View style={styles.stockMetaRow}>
                      <Chip
                        compact
                        style={[
                          styles.statusChip,
                          { backgroundColor: `${STATUS_COLOR[row.status]}22` },
                        ]}
                        textStyle={{ color: STATUS_COLOR[row.status] }}
                      >
                        {row.status}
                      </Chip>
                      <Text
                        style={[
                          styles.stockMeta,
                          { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                        ]}
                      >
                        {row.quantidade} un.
                      </Text>
                    </View>
                  )}
                </View>
              ))}

              {pagedRows.length === 0 ? (
                <View style={styles.emptyBox}>
                  <AntDesign
                    name="inbox"
                    size={28}
                    color={(theme.colors as any).textSecondary ?? theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.emptyText,
                      { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                    ]}
                  >
                    Nenhum item encontrado.
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.paginationRow}>
              <Text
                style={[
                  styles.paginationLabel,
                  { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                ]}
              >
                {rangeStart}-{rangeEnd} de {totalItems}
              </Text>

              <View style={styles.paginationControls}>
                <Button
                  mode="outlined"
                  onPress={() => setPage((prev) => Math.max(0, prev - 1))}
                  disabled={page === 0}
                  compact
                >
                  Anterior
                </Button>

                <Button
                  mode="outlined"
                  onPress={() =>
                    setPage((prev) => Math.min(prev + 1, Math.ceil(totalItems / itemsPerPage) - 1))
                  }
                  disabled={rangeEnd >= totalItems}
                  compact
                >
                  Proximo
                </Button>

                <View style={styles.itemsPerPage}>
                  {[5, 8, 10].map((size) => (
                    <Chip
                      key={size}
                      compact
                      onPress={() => {
                        setItemsPerPage(size);
                        setPage(0);
                      }}
                      style={[
                        styles.pageChip,
                        {
                          backgroundColor:
                            itemsPerPage === size
                              ? theme.colors.primary
                              : theme.colors.surfaceVariant,
                        },
                      ]}
                      textStyle={{
                        color: itemsPerPage === size ? theme.colors.onPrimary : theme.colors.text,
                      }}
                    >
                      {size}
                    </Chip>
                  ))}
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 20 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 160,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  cardValue: { fontSize: 22, fontWeight: '800' },
  cardLabel: { marginTop: 6, fontSize: 12, fontWeight: '600' },
  tableCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  tableHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  sectionSubtitle: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  primaryButton: { borderRadius: 10, height: 40, justifyContent: 'center' },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  filterInput: { flexGrow: 1, minWidth: 220, borderRadius: 10, overflow: 'hidden' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  sortLabel: { fontSize: 12, fontWeight: '700' },
  sortChip: { borderRadius: 999 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  listHeaderText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  list: { gap: 12, marginTop: 10 },
  stockCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  stockTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stockWideRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 },
  stockMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  stockTitle: { fontSize: 16, fontWeight: '800' },
  stockSubtitle: { marginTop: 4, fontSize: 12 },
  stockMeta: { fontSize: 12, fontWeight: '600' },
  stockQty: { fontSize: 18, fontWeight: '800' },
  statusChip: { borderRadius: 999 },
  paginationRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  paginationLabel: { fontSize: 12, fontWeight: '600' },
  paginationControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  itemsPerPage: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  pageChip: { borderRadius: 999 },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  loadingBox: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontWeight: '700' },
});
