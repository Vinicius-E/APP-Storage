import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../axios';
import { PageResponse, Product, ProductStatusFilter, ProductUpsertRequest } from '../types/Product';

type ListProductsParams = {
  page: number;
  size: number;
  search?: string;
  status: ProductStatusFilter;
};

type SpringPageResponse<T> = {
  content?: T[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

type ProductResponseShape = Partial<Product> & {
  id?: number | string | null;
  productId?: number | string | null;
  produtoId?: number | string | null;
  codigo?: string | null;
  code?: string | null;
  sku?: string | null;
  codigoSistemaWester?: string | null;
  produtoCodigoWester?: string | null;
  nome?: string | null;
  name?: string | null;
  product_name?: string | null;
  productName?: string | null;
  nomeModelo?: string | null;
  produtoNomeModelo?: string | null;
  descricao?: string | null;
  description?: string | null;
  marca?: string | null;
  brand?: string | null;
  brand_name?: string | null;
  fabricante?: string | null;
  manufacturer?: string | null;
  categoria?: string | null;
  category?: string | null;
  category_name?: string | null;
  tipo?: string | null;
  tipoProduto?: string | null;
  cor?: string | null;
  color?: string | null;
  ativo?: boolean | string | number | null;
  active?: boolean | string | number | null;
  enabled?: boolean | string | number | null;
  status?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  dataCriacao?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  dataAtualizacao?: string | null;
};

const PRODUCT_CANONICAL_COLLECTION_ENDPOINT = '/api/products';
const PRODUCT_LEGACY_COLLECTION_ENDPOINT = '/api/produtos';
const PRODUCT_COLLECTION_ENDPOINTS = [
  PRODUCT_CANONICAL_COLLECTION_ENDPOINT,
  PRODUCT_LEGACY_COLLECTION_ENDPOINT,
];
const PRODUCT_MUTATION_COLLECTION_ENDPOINT = PRODUCT_CANONICAL_COLLECTION_ENDPOINT;
const MOCK_STORAGE_KEY = '@storage-system/mock-products';
const SEARCH_FETCH_SIZE = 1000;

let forceMockMode = false;
let cachedMockProducts: Product[] | null = null;

function extractErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
}

function extractErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return '';
  }

  const responseData = (error as { response?: { data?: unknown } }).response?.data;
  if (typeof responseData === 'string') {
    return responseData;
  }

  if (responseData && typeof responseData === 'object') {
    const message = (responseData as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  const directMessage = (error as { message?: unknown }).message;
  return typeof directMessage === 'string' ? directMessage : '';
}

function isRouteUnavailableError(error: unknown): boolean {
  const status = extractErrorStatus(error);
  const message = extractErrorMessage(error).toLowerCase();

  if (status === 404) {
    return true;
  }

  return message.includes('no static resource') || message.includes('cannot ') && message.includes('/api/prod');
}

function isBrokenProductCollectionFallbackError(path: string, error: unknown): boolean {
  const status = extractErrorStatus(error);
  const message = extractErrorMessage(error).toLowerCase();

  if (path !== PRODUCT_CANONICAL_COLLECTION_ENDPOINT) {
    return false;
  }

  if (status !== 500) {
    return false;
  }

  return (
    message.includes('status') ||
    message.includes('enum') ||
    message.includes('ativo') ||
    message.includes('inativo') ||
    message.includes('/api/products')
  );
}

function buildProductDetailEndpoint(id: number): string {
  return `${PRODUCT_CANONICAL_COLLECTION_ENDPOINT}/${id}`;
}

function buildActivateEndpoints(id: number): string[] {
  return [
    `${PRODUCT_CANONICAL_COLLECTION_ENDPOINT}/${id}/activate`,
    `${PRODUCT_LEGACY_COLLECTION_ENDPOINT}/${id}/activate`,
    `${PRODUCT_LEGACY_COLLECTION_ENDPOINT}/${id}/ativar`,
  ];
}

function buildInactivateEndpoints(id: number): string[] {
  return [
    `${PRODUCT_CANONICAL_COLLECTION_ENDPOINT}/${id}/inactivate`,
    `${PRODUCT_LEGACY_COLLECTION_ENDPOINT}/${id}/inactivate`,
    `${PRODUCT_LEGACY_COLLECTION_ENDPOINT}/${id}/inativar`,
  ];
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value == null) {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized !== '') {
      return normalized;
    }
  }

  return undefined;
}

function normalizeActiveValue(raw: ProductResponseShape): boolean {
  const candidates = [raw.ativo, raw.active, raw.enabled, raw.status];

  for (const candidate of candidates) {
    if (typeof candidate === 'boolean') {
      return candidate;
    }

    if (typeof candidate === 'number') {
      return candidate !== 0;
    }

    if (typeof candidate === 'string') {
      const normalized = candidate.trim().toUpperCase();

      if (['ATIVO', 'ACTIVE', 'ATIVADO', 'ENABLED', 'TRUE', '1', 'SIM', 'YES'].includes(normalized)) {
        return true;
      }

      if (['INATIVO', 'INACTIVE', 'INATIVADO', 'DISABLED', 'FALSE', '0', 'NAO', 'NO'].includes(normalized)) {
        return false;
      }
    }
  }

  return true;
}

function sanitizeProduct(product: ProductResponseShape): Product {
  const codigoSistemaWester = firstText(
    product.codigo,
    product.code,
    product.sku,
    product.codigoSistemaWester,
    product.produtoCodigoWester
  );
  const nomeModelo = firstText(
    product.nome,
    product.name,
    product.product_name,
    product.productName,
    product.nomeModelo,
    product.produtoNomeModelo
  );
  const cor = firstText(product.cor, product.color);
  const codigo = codigoSistemaWester;
  const nome = nomeModelo;
  const descricao = firstText(product.descricao, product.description);
  const marca = firstText(
    product.marca,
    product.brand,
    product.brand_name,
    product.fabricante,
    product.manufacturer
  );
  const categoria = firstText(
    product.categoria,
    product.category,
    product.category_name,
    product.tipo,
    product.tipoProduto
  );
  const createdAt = firstText(product.createdAt, product.created_at, product.dataCriacao);
  const updatedAt = firstText(product.updatedAt, product.updated_at, product.dataAtualizacao);

  return {
    id: Number(product.id ?? product.productId ?? product.produtoId ?? 0),
    codigo: codigo ?? '',
    nome: nome ?? '',
    codigoSistemaWester,
    nomeModelo,
    cor,
    descricao,
    marca,
    categoria,
    ativo: normalizeActiveValue(product),
    createdAt,
    updatedAt,
  };
}

function normalizeSearchText(value?: string | null): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesProductSearch(product: Product, search?: string): boolean {
  const normalizedSearch = normalizeSearchText(search);

  if (!normalizedSearch) {
    return true;
  }

  const haystack = normalizeSearchText(
    [
      product.codigoSistemaWester,
      product.codigo,
      product.nomeModelo,
      product.nome,
      product.cor,
      product.descricao,
    ].join(' ')
  );

  return haystack.includes(normalizedSearch);
}

function matchesProductStatus(product: Product, status: ProductStatusFilter): boolean {
  if (status === 'ATIVO') {
    return product.ativo;
  }

  if (status === 'INATIVO') {
    return !product.ativo;
  }

  return true;
}

function paginateProducts(
  products: Product[],
  page: number,
  size: number
): PageResponse<Product> {
  const start = page * size;
  const items = products.slice(start, start + size);

  return {
    items,
    page,
    size,
    totalItems: products.length,
    totalPages: products.length === 0 ? 0 : Math.ceil(products.length / size),
  };
}

function normalizePageResponse(
  raw: unknown,
  requestedPage: number,
  requestedSize: number
): PageResponse<Product> {
  if (raw && typeof raw === 'object' && Array.isArray((raw as PageResponse<ProductResponseShape>).items)) {
    const pageResponse = raw as PageResponse<ProductResponseShape>;

    return {
      items: pageResponse.items.map(sanitizeProduct),
      page: Number.isFinite(pageResponse.page) ? Math.max(pageResponse.page, 0) : requestedPage,
      size: Number.isFinite(pageResponse.size) ? Math.max(pageResponse.size, 1) : requestedSize,
      totalItems: Number.isFinite(pageResponse.totalItems) ? Math.max(pageResponse.totalItems, 0) : 0,
      totalPages: Number.isFinite(pageResponse.totalPages) ? Math.max(pageResponse.totalPages, 0) : 0,
    };
  }

  if (raw && typeof raw === 'object' && Array.isArray((raw as SpringPageResponse<ProductResponseShape>).content)) {
    const springResponse = raw as SpringPageResponse<ProductResponseShape>;

    return {
      items: (springResponse.content ?? []).map(sanitizeProduct),
      page: Number.isFinite(springResponse.number) ? Math.max(springResponse.number ?? 0, 0) : requestedPage,
      size: Number.isFinite(springResponse.size) ? Math.max(springResponse.size ?? requestedSize, 1) : requestedSize,
      totalItems: Number.isFinite(springResponse.totalElements)
        ? Math.max(springResponse.totalElements ?? 0, 0)
        : 0,
      totalPages: Number.isFinite(springResponse.totalPages)
        ? Math.max(springResponse.totalPages ?? 0, 0)
        : 0,
    };
  }

  if (Array.isArray(raw)) {
    const items = raw.map((item) => sanitizeProduct(item as ProductResponseShape));
    const totalItems = items.length;

    return {
      items,
      page: requestedPage,
      size: requestedSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / requestedSize),
    };
  }

  return {
    items: [],
    page: requestedPage,
    size: requestedSize,
    totalItems: 0,
    totalPages: 0,
  };
}

async function runAgainstAvailableEndpoint<T>(
  paths: string[],
  request: (path: string) => Promise<T>
): Promise<T | null> {
  let sawUnavailableRoute = false;

  for (const path of paths) {
    try {
      return await request(path);
    } catch (error) {
      if (isRouteUnavailableError(error)) {
        sawUnavailableRoute = true;
        continue;
      }

      throw error;
    }
  }

  if (sawUnavailableRoute) {
    forceMockMode = true;
    return null;
  }

  return null;
}

async function loadMockProducts(): Promise<Product[]> {
  if (cachedMockProducts) {
    return cachedMockProducts.map((product) => ({ ...product }));
  }

  try {
    const raw = await AsyncStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) {
      cachedMockProducts = [];
      return [];
    }

    const parsed = JSON.parse(raw);
    cachedMockProducts = Array.isArray(parsed)
      ? parsed.map((item) => sanitizeProduct(item as Product))
      : [];
  } catch {
    cachedMockProducts = [];
  }

  return cachedMockProducts.map((product) => ({ ...product }));
}

async function saveMockProducts(products: Product[]): Promise<void> {
  cachedMockProducts = products.map((product) => sanitizeProduct(product));
  await AsyncStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(cachedMockProducts));
}

function sanitizeUpsertPayload(payload: ProductUpsertRequest): ProductUpsertRequest {
  return {
    codigo: payload.codigo.trim(),
    nomeModelo: payload.nomeModelo.trim(),
    cor: payload.cor.trim(),
    descricao: payload.descricao?.trim() || undefined,
    ativo: typeof payload.ativo === 'boolean' ? payload.ativo : undefined,
  };
}

function buildBackendUpsertPayload(payload: ProductUpsertRequest): {
  codigo?: string;
  nomeModelo: string;
  cor: string;
  descricao?: string;
  ativo?: boolean;
} {
  const normalizedPayload = sanitizeUpsertPayload(payload);

  return {
    ...(normalizedPayload.codigo ? { codigo: normalizedPayload.codigo } : {}),
    nomeModelo: normalizedPayload.nomeModelo,
    cor: normalizedPayload.cor,
    ...(normalizedPayload.descricao ? { descricao: normalizedPayload.descricao } : {}),
    ...(typeof normalizedPayload.ativo === 'boolean' ? { ativo: normalizedPayload.ativo } : {}),
  };
}

async function listMockProducts({
  page,
  size,
  search,
  status,
}: ListProductsParams): Promise<PageResponse<Product>> {
  const products = await loadMockProducts();

  const filtered = products
    .filter((product) => {
      if (status === 'ATIVO' && !product.ativo) {
        return false;
      }

      if (status === 'INATIVO' && product.ativo) {
        return false;
      }

      return matchesProductSearch(product, search);
    })
    .sort((left, right) => {
      const leftTime = new Date(left.updatedAt ?? left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.updatedAt ?? right.createdAt ?? 0).getTime();
      return rightTime - leftTime;
    });

  const start = page * size;
  const items = filtered.slice(start, start + size);

  return {
    items,
    page,
    size,
    totalItems: filtered.length,
    totalPages: filtered.length === 0 ? 0 : Math.ceil(filtered.length / size),
  };
}

async function createMockProduct(payload: ProductUpsertRequest): Promise<Product> {
  const products = await loadMockProducts();
  const normalizedPayload = sanitizeUpsertPayload(payload);
  const now = new Date().toISOString();
  const nextId = products.reduce((maxValue, product) => Math.max(maxValue, product.id), 0) + 1;

  const created: Product = {
    id: nextId,
    codigo: normalizedPayload.codigo,
    nome: normalizedPayload.nomeModelo,
    codigoSistemaWester: normalizedPayload.codigo || undefined,
    nomeModelo: normalizedPayload.nomeModelo,
    cor: normalizedPayload.cor,
    descricao: normalizedPayload.descricao,
    ativo: normalizedPayload.ativo !== false,
    createdAt: now,
    updatedAt: now,
  };

  await saveMockProducts([created, ...products]);
  return created;
}

async function updateMockProduct(id: number, payload: ProductUpsertRequest): Promise<Product> {
  const products = await loadMockProducts();
  const index = products.findIndex((product) => product.id === id);

  if (index < 0) {
    throw new Error('Produto não encontrado.');
  }

  const normalizedPayload = sanitizeUpsertPayload(payload);
  const current = products[index];
  const updated: Product = {
    ...current,
    codigo: normalizedPayload.codigo,
    codigoSistemaWester: normalizedPayload.codigo || undefined,
    nome: normalizedPayload.nomeModelo,
    nomeModelo: normalizedPayload.nomeModelo,
    cor: normalizedPayload.cor,
    descricao: normalizedPayload.descricao,
    ativo: typeof normalizedPayload.ativo === 'boolean' ? normalizedPayload.ativo : current.ativo,
    updatedAt: new Date().toISOString(),
  };

  const nextProducts = [...products];
  nextProducts[index] = updated;
  await saveMockProducts(nextProducts);
  return updated;
}

async function updateMockProductStatus(id: number, ativo: boolean): Promise<void> {
  const products = await loadMockProducts();
  const index = products.findIndex((product) => product.id === id);

  if (index < 0) {
    throw new Error('Produto não encontrado.');
  }

  const nextProducts = [...products];
  nextProducts[index] = {
    ...nextProducts[index],
    ativo,
    updatedAt: new Date().toISOString(),
  };

  await saveMockProducts(nextProducts);
}

export async function listProducts({
  page,
  size,
  search,
  status,
}: ListProductsParams): Promise<PageResponse<Product>> {
  if (!forceMockMode) {
    const normalizedSearch = search?.trim() ?? '';
    const hasSearch = normalizedSearch.length > 0;
    const requestedPage = hasSearch ? 0 : page;
    const requestedSize = hasSearch ? Math.max(size, SEARCH_FETCH_SIZE) : size;

    for (const path of PRODUCT_COLLECTION_ENDPOINTS) {
      try {
        const httpResponse = await API.get(path, {
          params: {
            page: requestedPage,
            size: requestedSize,
            status,
            ...(hasSearch
              ? {
                  search: normalizedSearch,
                  nome: normalizedSearch,
                  name: normalizedSearch,
                  codigo: normalizedSearch,
                  codigoSistemaWester: normalizedSearch,
                  cor: normalizedSearch,
                  descricao: normalizedSearch,
                }
              : {}),
          },
        });

        const response = normalizePageResponse(httpResponse.data, requestedPage, requestedSize);
        const isRawArrayResponse = Array.isArray(httpResponse.data);

        if (isRawArrayResponse) {
          const filteredItems = response.items.filter(
            (product) =>
              matchesProductStatus(product, status) &&
              (!hasSearch || matchesProductSearch(product, normalizedSearch))
          );

          return paginateProducts(filteredItems, page, size);
        }

        if (!hasSearch) {
          return response;
        }

        const filteredItems = response.items.filter((product) =>
          matchesProductSearch(product, normalizedSearch)
        );

        return paginateProducts(filteredItems, page, size);
      } catch (error) {
        if (isRouteUnavailableError(error) || isBrokenProductCollectionFallbackError(path, error)) {
          continue;
        }

        throw error;
      }
    }
  }

  return listMockProducts({ page, size, search, status });
}

export async function createProduct(payload: ProductUpsertRequest): Promise<Product> {
  if (!forceMockMode) {
    const httpResponse = await API.post<Product>(
      PRODUCT_MUTATION_COLLECTION_ENDPOINT,
      buildBackendUpsertPayload(payload)
    );
    return sanitizeProduct(httpResponse.data);
  }

  return createMockProduct(payload);
}

export async function updateProduct(id: number, payload: ProductUpsertRequest): Promise<Product> {
  if (!forceMockMode) {
    const httpResponse = await API.put<Product>(
      buildProductDetailEndpoint(id),
      buildBackendUpsertPayload(payload)
    );
    return sanitizeProduct(httpResponse.data);
  }

  return updateMockProduct(id, payload);
}

export async function activateProduct(id: number): Promise<void> {
  if (!forceMockMode) {
    const response = await runAgainstAvailableEndpoint(buildActivateEndpoints(id), async (path) => {
      await API.patch(path);
      return true;
    });

    if (response) {
      return;
    }
  }

  await updateMockProductStatus(id, true);
}

export async function inactivateProduct(id: number): Promise<void> {
  if (!forceMockMode) {
    const response = await runAgainstAvailableEndpoint(buildInactivateEndpoints(id), async (path) => {
      await API.patch(path);
      return true;
    });

    if (response) {
      return;
    }
  }

  await updateMockProductStatus(id, false);
}
