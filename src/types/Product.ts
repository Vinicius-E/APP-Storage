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
  createdAt?: string;
  updatedAt?: string;
};

export type ProductUpsertRequest = {
  codigo: string;
  nomeModelo: string;
  cor: string;
  descricao?: string;
  ativo?: boolean;
};

export type PageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};
