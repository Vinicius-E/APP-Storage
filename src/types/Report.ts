export type ReportPaginationDTO = {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

export type ReportChartPointDTO = {
  label: string;
  value: number;
  formattedValue: string;
  color?: string | null;
};

export type ProductsReportFilterDTO = {
  nome: string;
  codigoSistemaWester: string;
  descricao: string;
  cor: string;
  ativo: boolean | null;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  page: number;
  size: number;
};

export type ProductReportItemDTO = {
  id: number;
  codigoSistemaWester: string;
  nomeModelo: string;
  cor: string;
  descricao: string;
  ativo: boolean;
  quantidadeTotalEmEstoque: number;
};

export type ProductsReportSummaryDTO = {
  totalProdutos: number;
  totalProdutosAtivos: number;
  totalProdutosInativos: number;
  quantidadeTotalEmEstoque: number;
};

export type ProductsReportResponseDTO = {
  generatedAt: string;
  summary: ProductsReportSummaryDTO;
  pagination: ReportPaginationDTO;
  items: ProductReportItemDTO[];
  statusChart: ReportChartPointDTO[];
  colorChart: ReportChartPointDTO[];
  usageChart: ReportChartPointDTO[];
};

export type StocksReportFilterDTO = {
  area: string;
  fileira: string;
  grade: string;
  nivel: string;
  ativo: boolean | null;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  page: number;
  size: number;
};

export type StockReportItemDTO = {
  areaId: number;
  areaNome: string;
  areaDescricao: string;
  ativo: boolean;
  totalFileiras: number;
  totalGrades: number;
  totalNiveis: number;
  niveisOcupados: number;
  totalItensEstoque: number;
  quantidadeTotal: number;
  ocupacaoPercentual: number;
};

export type StocksReportSummaryDTO = {
  totalAreas: number;
  totalAreasAtivas: number;
  totalFileiras: number;
  totalGrades: number;
  totalNiveis: number;
  totalItensEstoque: number;
  quantidadeTotalArmazenada: number;
};

export type StocksReportResponseDTO = {
  generatedAt: string;
  summary: StocksReportSummaryDTO;
  pagination: ReportPaginationDTO;
  items: StockReportItemDTO[];
  quantityByAreaChart: ReportChartPointDTO[];
  occupancyByAreaChart: ReportChartPointDTO[];
  quantityByFileiraChart: ReportChartPointDTO[];
};

export type StockItemsReportFilterDTO = {
  produto: string;
  codigoSistemaWester: string;
  area: string;
  fileira: string;
  grade: string;
  nivel: string;
  statusItem: string;
  dataInicio: string;
  dataFim: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  page: number;
  size: number;
};

export type StockItemReportItemDTO = {
  itemEstoqueId: number;
  produtoId: number | null;
  produtoNomeModelo: string;
  codigoSistemaWester: string;
  areaNome: string;
  fileira: string;
  grade: string;
  nivel: string;
  quantidade: number;
  statusItem: string;
  dataAtualizacao: string | null;
};

export type StockItemsReportSummaryDTO = {
  totalItensEstoque: number;
  quantidadeTotalArmazenada: number;
  totalProdutosUnicos: number;
  totalAreasComItens: number;
};

export type StockItemsReportResponseDTO = {
  generatedAt: string;
  summary: StockItemsReportSummaryDTO;
  pagination: ReportPaginationDTO;
  items: StockItemReportItemDTO[];
  topProductsChart: ReportChartPointDTO[];
  quantityByAreaChart: ReportChartPointDTO[];
  quantityByLocationChart: ReportChartPointDTO[];
};

export type MovementHistoryReportFilterDTO = {
  produto: string;
  codigoSistemaWester: string;
  area: string;
  usuario: string;
  tipoOperacao: string;
  dataInicio: string;
  dataFim: string;
  sortDirection: 'asc' | 'desc';
  page: number;
  size: number;
};

export type MovementHistoryReportItemDTO = {
  id: number;
  timestamp: string | null;
  tipoOperacao: string;
  usuarioNome: string;
  usuarioLogin: string;
  produtoNomeModelo: string;
  codigoSistemaWester: string;
  areaNome: string;
  fileira: string;
  grade: string;
  nivel: string;
  quantidadeAlterada: number | null;
  quantidadeAnterior: number | null;
  quantidadeNova: number | null;
  detalhesAlteracao: string;
};

export type MovementHistoryReportSummaryDTO = {
  totalMovimentacoes: number;
  totalEntradas: number;
  totalSaidas: number;
  totalAjustes: number;
  totalMovimentacoesInternas: number;
  totalResequenciamentos: number;
  quantidadeMovimentadaTotal: number;
};

export type MovementHistoryReportResponseDTO = {
  generatedAt: string;
  summary: MovementHistoryReportSummaryDTO;
  pagination: ReportPaginationDTO;
  items: MovementHistoryReportItemDTO[];
  typeChart: ReportChartPointDTO[];
  periodChart: ReportChartPointDTO[];
  productChart: ReportChartPointDTO[];
  areaChart: ReportChartPointDTO[];
  userChart: ReportChartPointDTO[];
};
