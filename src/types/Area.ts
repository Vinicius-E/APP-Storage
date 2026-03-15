export type AreaDTO = {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AreaUpsertRequest = {
  nome: string;
  descricao?: string;
  ativo?: boolean;
};

export type AreaPageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};
