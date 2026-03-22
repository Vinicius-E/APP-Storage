export type ProductStatusFilter = 'ATIVO' | 'INATIVO' | 'TODOS';

export type Product = {
  id: number;
  codigo: string;
  nome: string;
  codigoSistemaWester?: string;
  nomeModelo?: string;
  cor?: string;
  descricao?: string;
  marca?: string;
  categoria?: string;
  ativo: boolean;
  estoqueMinimo?: number | null;
  estoqueMaximo?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductUpsertRequest = {
  codigo: string;
  nomeModelo: string;
  cor: string;
  descricao?: string;
  ativo?: boolean;
  estoqueMinimo?: number | null;
  estoqueMaximo?: number | null;
};

export type PageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};
