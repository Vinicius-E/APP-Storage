import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../axios';
import { AreaDTO, AreaPageResponse, AreaUpsertRequest } from '../types/Area';

type SpringPageResponse<T> = {
  content?: T[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

type ListAreasParams = {
  page: number;
  size: number;
  search?: string;
};

const SEARCH_FETCH_SIZE = 1000;

type AreaResponseShape = Partial<AreaDTO> & {
  nome?: string;
  descricao?: string;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
  dataCriacao?: string;
  dataAtualizacao?: string;
};

const AREA_COLLECTION_ENDPOINTS = ['/api/areas', '/api/setores'];
const AREA_STORAGE_KEY = '@storage-system/mock-areas';

let forceMockMode = false;
let cachedAreas: AreaDTO[] | null = null;

function createDefaultAreaSeed(): AreaDTO[] {
  const now = new Date().toISOString();
  return [
    {
      id: 1,
      name: 'Area Principal',
      description: 'Estrutura padrao inicial do armazem.',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

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

  return (
    message.includes('no static resource') ||
    message.includes('/api/areas') ||
    message.includes('/api/setores')
  );
}

function sanitizeArea(raw: AreaResponseShape): AreaDTO {
  const name = String(raw.name ?? raw.nome ?? '').trim();
  const description = raw.description ?? raw.descricao;
  const createdAt = raw.createdAt ?? raw.created_at ?? raw.dataCriacao;
  const updatedAt = raw.updatedAt ?? raw.updated_at ?? raw.dataAtualizacao;

  return {
    id: Number(raw.id ?? 0),
    name,
    description: description?.toString().trim() || undefined,
    active: raw.active ?? raw.ativo ?? true,
    createdAt: createdAt?.toString() || undefined,
    updatedAt: updatedAt?.toString() || undefined,
  };
}

function normalizeSearchText(value?: string | null): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesAreaSearch(area: AreaDTO, search?: string): boolean {
  const normalizedSearch = normalizeSearchText(search);

  if (!normalizedSearch) {
    return true;
  }

  const haystack = normalizeSearchText([area.name, area.description ?? ''].join(' '));
  return haystack.includes(normalizedSearch);
}

function paginateAreas(
  areas: AreaDTO[],
  page: number,
  size: number
): AreaPageResponse<AreaDTO> {
  const start = page * size;
  const items = areas.slice(start, start + size);

  return {
    items,
    page,
    size,
    totalItems: areas.length,
    totalPages: areas.length === 0 ? 0 : Math.ceil(areas.length / size),
  };
}

function normalizePageResponse(
  raw: unknown,
  requestedPage: number,
  requestedSize: number
): AreaPageResponse<AreaDTO> {
  if (raw && typeof raw === 'object' && Array.isArray((raw as AreaPageResponse<AreaDTO>).items)) {
    const response = raw as AreaPageResponse<AreaDTO>;

    return {
      items: response.items.map((item) => sanitizeArea(item)),
      page: Number.isFinite(response.page) ? Math.max(response.page, 0) : requestedPage,
      size: Number.isFinite(response.size) ? Math.max(response.size, 1) : requestedSize,
      totalItems: Number.isFinite(response.totalItems) ? Math.max(response.totalItems, 0) : 0,
      totalPages: Number.isFinite(response.totalPages) ? Math.max(response.totalPages, 0) : 0,
    };
  }

  if (raw && typeof raw === 'object' && Array.isArray((raw as SpringPageResponse<AreaDTO>).content)) {
    const response = raw as SpringPageResponse<AreaDTO>;

    return {
      items: (response.content ?? []).map((item) => sanitizeArea(item)),
      page: Number.isFinite(response.number) ? Math.max(response.number ?? 0, 0) : requestedPage,
      size: Number.isFinite(response.size) ? Math.max(response.size ?? requestedSize, 1) : requestedSize,
      totalItems: Number.isFinite(response.totalElements)
        ? Math.max(response.totalElements ?? 0, 0)
        : 0,
      totalPages: Number.isFinite(response.totalPages)
        ? Math.max(response.totalPages ?? 0, 0)
        : 0,
    };
  }

  if (Array.isArray(raw)) {
    const items = raw.map((item) => sanitizeArea(item as AreaResponseShape));
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

async function loadMockAreas(): Promise<AreaDTO[]> {
  if (cachedAreas) {
    return cachedAreas.map((area) => ({ ...area }));
  }

  try {
    const raw = await AsyncStorage.getItem(AREA_STORAGE_KEY);
    if (!raw) {
      const seeded = createDefaultAreaSeed();
      cachedAreas = seeded;
      await AsyncStorage.setItem(AREA_STORAGE_KEY, JSON.stringify(seeded));
      return seeded.map((area) => ({ ...area }));
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachedAreas = parsed.map((item) => sanitizeArea(item as AreaResponseShape));
    } else {
      cachedAreas = createDefaultAreaSeed();
      await AsyncStorage.setItem(AREA_STORAGE_KEY, JSON.stringify(cachedAreas));
    }
  } catch {
    cachedAreas = createDefaultAreaSeed();
  }

  return cachedAreas.map((area) => ({ ...area }));
}

async function saveMockAreas(areas: AreaDTO[]): Promise<void> {
  cachedAreas = areas.map((area) => sanitizeArea(area));
  await AsyncStorage.setItem(AREA_STORAGE_KEY, JSON.stringify(cachedAreas));
}

function sanitizeUpsertPayload(payload: AreaUpsertRequest): AreaUpsertRequest {
  return {
    nome: payload.nome.trim(),
    descricao: payload.descricao?.trim() || undefined,
    ativo: payload.ativo !== false,
  };
}

function buildAreaDetailEndpoints(id: number): string[] {
  return [`/api/areas/${id}`, `/api/setores/${id}`];
}

function buildActivateEndpoints(id: number): string[] {
  return [
    `/api/areas/${id}/activate`,
    `/api/areas/${id}/ativar`,
    `/api/setores/${id}/activate`,
    `/api/setores/${id}/ativar`,
  ];
}

function buildInactivateEndpoints(id: number): string[] {
  return [
    `/api/areas/${id}/inactivate`,
    `/api/areas/${id}/inativar`,
    `/api/setores/${id}/inactivate`,
    `/api/setores/${id}/inativar`,
  ];
}

async function listMockAreas({
  page,
  size,
  search,
}: ListAreasParams): Promise<AreaPageResponse<AreaDTO>> {
  const areas = await loadMockAreas();
  const filtered = areas.filter((area) => matchesAreaSearch(area, search));
  return paginateAreas(filtered, page, size);
}

async function createMockArea(payload: AreaUpsertRequest): Promise<AreaDTO> {
  const areas = await loadMockAreas();
  const normalized = sanitizeUpsertPayload(payload);
  const duplicate = areas.some(
    (area) => area.name.trim().toLowerCase() === normalized.nome.trim().toLowerCase()
  );

  if (duplicate) {
    throw new Error('Já existe um setor com esse nome.');
  }

  const now = new Date().toISOString();
  const nextId = areas.reduce((maxValue, area) => Math.max(maxValue, area.id), 0) + 1;

  const created: AreaDTO = {
    id: nextId,
    name: normalized.nome,
    description: normalized.descricao,
    active: normalized.ativo !== false,
    createdAt: now,
    updatedAt: now,
  };

  await saveMockAreas([created, ...areas]);
  return created;
}

async function updateMockArea(id: number, payload: AreaUpsertRequest): Promise<AreaDTO> {
  const areas = await loadMockAreas();
  const index = areas.findIndex((area) => area.id === id);

  if (index < 0) {
    throw new Error('Setor não encontrado.');
  }

  const normalized = sanitizeUpsertPayload(payload);
  const duplicate = areas.some(
    (area) =>
      area.id !== id && area.name.trim().toLowerCase() === normalized.nome.trim().toLowerCase()
  );

  if (duplicate) {
    throw new Error('Já existe um setor com esse nome.');
  }

  const nextAreas = [...areas];
  nextAreas[index] = {
    ...nextAreas[index],
    name: normalized.nome,
    description: normalized.descricao,
    active: normalized.ativo !== false,
    updatedAt: new Date().toISOString(),
  };

  await saveMockAreas(nextAreas);
  return nextAreas[index];
}

async function updateMockAreaStatus(id: number, active: boolean): Promise<void> {
  const areas = await loadMockAreas();
  const index = areas.findIndex((area) => area.id === id);

  if (index < 0) {
    throw new Error('Setor não encontrado.');
  }

  const nextAreas = [...areas];
  nextAreas[index] = {
    ...nextAreas[index],
    active,
    updatedAt: new Date().toISOString(),
  };

  await saveMockAreas(nextAreas);
}

export async function listAreas({
  page,
  size,
  search,
}: ListAreasParams): Promise<AreaPageResponse<AreaDTO>> {
  const normalizedSearch = search?.trim() ?? '';

  if (!forceMockMode) {
    const response = await runAgainstAvailableEndpoint(AREA_COLLECTION_ENDPOINTS, async (path) => {
      const requestPage = normalizedSearch ? 0 : page;
      const requestSize = normalizedSearch ? Math.max(size, SEARCH_FETCH_SIZE) : size;
      const httpResponse = await API.get(path, {
        params: {
          page: requestPage,
          size: requestSize,
          ...(normalizedSearch
            ? {
                search: normalizedSearch,
                nome: normalizedSearch,
                name: normalizedSearch,
              }
            : {}),
        },
      });

      const normalizedResponse = normalizePageResponse(httpResponse.data, requestPage, requestSize);

      if (!normalizedSearch) {
        return normalizedResponse;
      }

      const filteredItems = normalizedResponse.items.filter((area) =>
        matchesAreaSearch(area, normalizedSearch)
      );

      return paginateAreas(filteredItems, page, size);
    });

    if (response) {
      return response;
    }
  }

  return listMockAreas({ page, size, search });
}

export async function createArea(payload: AreaUpsertRequest): Promise<AreaDTO> {
  if (!forceMockMode) {
    const response = await runAgainstAvailableEndpoint(AREA_COLLECTION_ENDPOINTS, async (path) => {
      const httpResponse = await API.post<AreaDTO>(path, sanitizeUpsertPayload(payload));
      return sanitizeArea(httpResponse.data);
    });

    if (response) {
      return response;
    }
  }

  return createMockArea(payload);
}

export async function updateArea(id: number, payload: AreaUpsertRequest): Promise<AreaDTO> {
  if (!forceMockMode) {
    const response = await runAgainstAvailableEndpoint(buildAreaDetailEndpoints(id), async (path) => {
      const httpResponse = await API.put<AreaDTO>(path, sanitizeUpsertPayload(payload));
      return sanitizeArea(httpResponse.data);
    });

    if (response) {
      return response;
    }
  }

  return updateMockArea(id, payload);
}

export async function activateArea(id: number): Promise<void> {
  if (!forceMockMode) {
    const response = await runAgainstAvailableEndpoint(buildActivateEndpoints(id), async (path) => {
      await API.patch(path);
      return true;
    });

    if (response) {
      return;
    }
  }

  await updateMockAreaStatus(id, true);
}

export async function inactivateArea(id: number): Promise<void> {
  if (!forceMockMode) {
    const response = await runAgainstAvailableEndpoint(buildInactivateEndpoints(id), async (path) => {
      await API.patch(path);
      return true;
    });

    if (response) {
      return;
    }
  }

  await updateMockAreaStatus(id, false);
}
