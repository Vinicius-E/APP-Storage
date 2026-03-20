export type StockAlertType =
  | 'SEM_ESTOQUE'
  | 'ABAIXO_MINIMO'
  | 'ACIMA_MAXIMO'
  | 'SEM_MOVIMENTACAO';

export type StockAlertSeverity = 'ALTA' | 'MEDIA' | 'BAIXA';

export type StockAlertFilterDTO = {
  tipoAlerta?: StockAlertType | '';
  textoLivre?: string;
  codigoWester?: string;
  areaId?: number;
  criticidade?: StockAlertSeverity | '';
  produtoAtivo?: boolean;
  diasSemMovimentacao?: number;
  ordenarPor?: 'criticidade' | 'produto' | 'quantidade' | 'ultima_movimentacao' | 'tipo';
  direcaoOrdenacao?: 'asc' | 'desc';
  pagina?: number;
  tamanhoPagina?: number;
};

export type StockAlertItemDTO = {
  tipoAlerta: StockAlertType;
  criticidade: StockAlertSeverity;
  mensagem: string;
  produtoId: number;
  produtoNomeModelo: string;
  produtoCodigoSistemaWester?: string | null;
  produtoCor?: string | null;
  produtoAtivo: boolean;
  quantidadeTotal: number;
  estoqueMinimo?: number | null;
  estoqueMaximo?: number | null;
  areaId?: number | null;
  areaNome?: string | null;
  itemEstoqueId?: number | null;
  nivelId?: number | null;
  localizacaoResumo?: string | null;
  ultimaMovimentacaoEm?: string | null;
  diasSemMovimentacao?: number | null;
};

export type StockAlertSummaryDTO = {
  totalAlertas: number;
  produtosSemEstoque: number;
  produtosAbaixoMinimo: number;
  produtosAcimaMaximo: number;
  produtosSemMovimentacao: number;
  criticidadeAlta: number;
  criticidadeMedia: number;
  criticidadeBaixa: number;
};

export type StockAlertResponseDTO = {
  itens: StockAlertItemDTO[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
  resumo: StockAlertSummaryDTO;
};
