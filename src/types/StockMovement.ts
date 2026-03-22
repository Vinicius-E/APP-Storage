import { AreaDTO } from './Area';
import { Product } from './Product';

export type StockMovementType = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA' | 'AJUSTE';

export type StockMovementRequestDTO = {
  tipoMovimentacao: StockMovementType;
  produtoId?: number;
  nivelId?: number;
  nivelOrigemId?: number;
  nivelDestinoId?: number;
  quantidade?: number;
  quantidadeAjustada?: number;
  quantidadeDiferenca?: number;
  motivo?: string;
  observacao?: string;
};

export type StockMovementResponseDTO = {
  historicoMovimentacaoId: number;
  registradoEm: string;
  tipoMovimentacao: StockMovementType;
  produtoId: number;
  produtoNomeModelo: string;
  produtoCodigoSistemaWester?: string | null;
  itemEstoqueId?: number | null;
  nivelId?: number | null;
  nivelOrigemId?: number | null;
  nivelDestinoId?: number | null;
  nivelLabel?: string | null;
  nivelOrigemLabel?: string | null;
  nivelDestinoLabel?: string | null;
  quantidadeMovimentada: number;
  quantidadeAnterior: number;
  quantidadeNova: number;
  motivo?: string | null;
  observacao?: string | null;
  detalhesAlteracao: string;
};

export type StockMovementRecentDTO = {
  id: number;
  timestamp: string;
  tipoMovimentacao: string;
  produtoNomeModelo?: string | null;
  quantidadeMovimentada?: number | null;
  produtoCodigoSistemaWester?: string | null;
  usuarioNome?: string | null;
  detalhesAlteracao?: string | null;
};

export type StockMovementInitialContextDTO = {
  areas: AreaDTO[];
  products: Product[];
  recentMovements: StockMovementRecentDTO[];
};

export type StockLevelItemDTO = {
  id: number;
  nivelId: number;
  nivelIdentificador?: string | null;
  produtoId?: number | null;
  produtoCodigoWester?: string | null;
  produtoNomeModelo?: string | null;
  produtoCor?: string | null;
  produtoDescricao?: string | null;
  quantidade: number;
  dataAtualizacao?: string | null;
};

export type StockMovementLevelDTO = {
  id: number;
  identificador: string;
};

export type StockMovementGradeDTO = {
  id: number;
  identificador: string;
  niveis: StockMovementLevelDTO[];
};

export type StockMovementFileiraDTO = {
  id: number;
  identificador: string;
  grades: StockMovementGradeDTO[];
};
