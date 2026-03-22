import { API } from '../axios';

export type StockItemDTO = {
  itemEstoqueId: number;
  areaId: number | null;
  areaNome: string | null;
  fileiraId: number | null;
  fileiraIdentificador: string | null;
  gradeId: number | null;
  gradeIdentificador: string | null;
  nivelId: number | null;
  nivelIdentificador: string | null;
  nivelOrdem: number | null;
  produtoId: number | null;
  codigoSistemaWester: string | null;
  nomeModelo: string | null;
  descricao: string | null;
  cor: string | null;
  produtoAtivo: boolean;
  estoqueMinimo: number | null;
  estoqueMaximo: number | null;
  quantidade: number;
};

export type StockItemPageResponse = {
  content: StockItemDTO[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ListStockItemsParams = {
  page: number;
  size: number;
  areaId?: number | null;
  filtro?: string;
  sort?: string;
};

type RawStockItemShape = Partial<StockItemDTO> & {
  itemEstoqueId?: number | string | null;
  areaId?: number | string | null;
  areaNome?: string | null;
  fileiraId?: number | string | null;
  fileiraIdentificador?: string | null;
  gradeId?: number | string | null;
  gradeIdentificador?: string | null;
  nivelId?: number | string | null;
  nivelIdentificador?: string | null;
  nivelOrdem?: number | string | null;
  produtoId?: number | string | null;
  codigoSistemaWester?: string | null;
  nomeModelo?: string | null;
  descricao?: string | null;
  cor?: string | null;
  produtoAtivo?: boolean | string | number | null;
  estoqueMinimo?: number | string | null;
  estoqueMaximo?: number | string | null;
  quantidade?: number | string | null;
};

type RawStockItemPageShape = {
  content?: RawStockItemShape[];
  items?: RawStockItemShape[];
  page?: number | string | null;
  number?: number | string | null;
  size?: number | string | null;
  totalElements?: number | string | null;
  totalItems?: number | string | null;
  totalPages?: number | string | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function toBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();

    if (['TRUE', '1', 'ATIVO', 'ACTIVE', 'SIM', 'YES'].includes(normalized)) {
      return true;
    }

    if (['FALSE', '0', 'INATIVO', 'INACTIVE', 'NAO', 'NO'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function sanitizeStockItem(raw: RawStockItemShape): StockItemDTO {
  return {
    itemEstoqueId: Math.max(toNumber(raw.itemEstoqueId) ?? 0, 0),
    areaId: toNumber(raw.areaId),
    areaNome: toText(raw.areaNome),
    fileiraId: toNumber(raw.fileiraId),
    fileiraIdentificador: toText(raw.fileiraIdentificador),
    gradeId: toNumber(raw.gradeId),
    gradeIdentificador: toText(raw.gradeIdentificador),
    nivelId: toNumber(raw.nivelId),
    nivelIdentificador: toText(raw.nivelIdentificador),
    nivelOrdem: toNumber(raw.nivelOrdem),
    produtoId: toNumber(raw.produtoId),
    codigoSistemaWester: toText(raw.codigoSistemaWester),
    nomeModelo: toText(raw.nomeModelo),
    descricao: toText(raw.descricao),
    cor: toText(raw.cor),
    produtoAtivo: toBoolean(raw.produtoAtivo, true),
    estoqueMinimo: toNumber(raw.estoqueMinimo),
    estoqueMaximo: toNumber(raw.estoqueMaximo),
    quantidade: Math.max(toNumber(raw.quantidade) ?? 0, 0),
  };
}

function normalizePageResponse(
  raw: unknown,
  requestedPage: number,
  requestedSize: number
): StockItemPageResponse {
  if (raw && typeof raw === 'object') {
    const pageResponse = raw as RawStockItemPageShape;
    const content = Array.isArray(pageResponse.content)
      ? pageResponse.content
      : Array.isArray(pageResponse.items)
        ? pageResponse.items
        : null;

    if (content) {
      const page = Math.max(toNumber(pageResponse.page ?? pageResponse.number) ?? requestedPage, 0);
      const size = Math.max(toNumber(pageResponse.size) ?? requestedSize, 1);
      const totalElements = Math.max(
        toNumber(pageResponse.totalElements ?? pageResponse.totalItems) ?? content.length,
        0
      );
      const totalPages =
        Math.max(toNumber(pageResponse.totalPages) ?? 0, 0) ||
        (totalElements === 0 ? 0 : Math.ceil(totalElements / size));

      return {
        content: content.map((item) => sanitizeStockItem(item)),
        page,
        size,
        totalElements,
        totalPages,
      };
    }
  }

  if (Array.isArray(raw)) {
    const content = raw.map((item) => sanitizeStockItem(item as RawStockItemShape));

    return {
      content,
      page: requestedPage,
      size: requestedSize,
      totalElements: content.length,
      totalPages: content.length === 0 ? 0 : Math.ceil(content.length / requestedSize),
    };
  }

  return {
    content: [],
    page: requestedPage,
    size: requestedSize,
    totalElements: 0,
    totalPages: 0,
  };
}

export async function listStockItems({
  page,
  size,
  areaId,
  filtro,
  sort,
}: ListStockItemsParams): Promise<StockItemPageResponse> {
  const response = await API.get('/api/estoque/itens', {
    params: {
      page,
      size,
      ...(areaId != null ? { areaId } : {}),
      ...(filtro ? { filtro } : {}),
      ...(sort ? { sort } : {}),
    },
  });

  return normalizePageResponse(response.data, page, size);
}

export async function listAllStockItems(
  params: Omit<ListStockItemsParams, 'page' | 'size'> & { size?: number }
): Promise<StockItemDTO[]> {
  const requestedSize = Math.max(params.size ?? 200, 1);
  const items: StockItemDTO[] = [];
  let currentPage = 0;
  let totalPages = 1;

  while (currentPage < totalPages) {
    const response = await listStockItems({
      ...params,
      page: currentPage,
      size: requestedSize,
    });

    items.push(...response.content);

    totalPages =
      response.totalPages > 0
        ? response.totalPages
        : response.totalElements > 0
          ? Math.ceil(response.totalElements / Math.max(response.size, 1))
          : 0;

    currentPage += 1;
  }

  return items;
}
