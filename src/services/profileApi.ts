import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../axios';
import { getDefaultProfilesSeed } from '../security/permissions';
import { ProfileDTO, ProfileUpsertRequest } from '../types/ProfileDTO';

type PageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

type ListProfilesParams = {
  page: number;
  size: number;
  search?: string;
};

type SpringPageResponse<T> = {
  content?: T[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
};

const PROFILE_COLLECTION_ENDPOINTS = ['/api/profiles', '/api/perfis'];
const PROFILE_STORAGE_KEY = '@storage-system/mock-profiles';

let forceMockMode = false;
let cachedProfiles: ProfileDTO[] | null = null;

function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .trim();
}

function resolveDefaultProfile(raw: {
  code?: string;
  description?: string;
  type?: string;
}): ProfileDTO {
  const defaults = getDefaultProfilesSeed();
  const codeToken = normalizeToken(String(raw.code ?? ''));
  const descriptionToken = normalizeToken(String(raw.description ?? ''));
  const typeToken = normalizeToken(String(raw.type ?? ''));

  if (codeToken.includes('ADMIN') || descriptionToken.includes('ADMIN')) {
    return defaults[0];
  }

  if (
    codeToken.includes('CONSULTOR') ||
    codeToken.includes('LEITURA') ||
    descriptionToken.includes('CONSULTOR') ||
    descriptionToken.includes('LEITURA') ||
    typeToken.includes('READ_ONLY') ||
    typeToken.includes('READONLY')
  ) {
    return defaults[2];
  }

  return defaults[1];
}

function normalizeAllowedScreens(raw: unknown, fallback: ProfileDTO['allowedScreens']) {
  if (Array.isArray(raw)) {
    const values = raw.filter(
      (item): item is ProfileDTO['allowedScreens'][number] => typeof item === 'string'
    );

    if (values.length > 0) {
      return [...new Set(values)];
    }
  }

  if (typeof raw === 'string' && raw.trim()) {
    const values = raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean) as ProfileDTO['allowedScreens'];

    if (values.length > 0) {
      return [...new Set(values)];
    }
  }

  return [...fallback];
}

function generateProfileCode(description: string): string {
  return normalizeToken(description);
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
    message.includes('/api/profiles') ||
    message.includes('/api/perfis')
  );
}

function buildProfileDetailEndpoints(id: number): string[] {
  return [`/api/profiles/${id}`, `/api/perfis/${id}`];
}

function buildActivateEndpoints(id: number): string[] {
  return [
    `/api/profiles/${id}/activate`,
    `/api/profiles/${id}/ativar`,
    `/api/perfis/${id}/activate`,
    `/api/perfis/${id}/ativar`,
  ];
}

function buildInactivateEndpoints(id: number): string[] {
  return [
    `/api/profiles/${id}/inactivate`,
    `/api/profiles/${id}/inativar`,
    `/api/perfis/${id}/inactivate`,
    `/api/perfis/${id}/inativar`,
  ];
}

function sanitizeProfile(raw: Partial<ProfileDTO> & Record<string, unknown>): ProfileDTO {
  const fallbackProfile = resolveDefaultProfile({
    code:
      typeof raw.code === 'string'
        ? raw.code
        : typeof raw.codigo === 'string'
          ? raw.codigo
          : undefined,
    description:
      typeof raw.description === 'string'
        ? raw.description
        : typeof raw.descricao === 'string'
          ? raw.descricao
          : undefined,
    type:
      typeof raw.type === 'string'
        ? raw.type
        : typeof raw.tipoAcesso === 'string'
          ? raw.tipoAcesso
          : undefined,
  });
  const rawCode =
    typeof raw.code === 'string'
      ? raw.code
      : typeof raw.codigo === 'string'
        ? raw.codigo
        : fallbackProfile.code;
  const rawDescription =
    typeof raw.description === 'string'
      ? raw.description
      : typeof raw.descricao === 'string'
        ? raw.descricao
        : fallbackProfile.description;
  const normalizedCode = generateProfileCode(rawCode || rawDescription || fallbackProfile.code);
  const resolvedType =
    raw.type === 'READ_ONLY' || raw.type === 'FULL_ACCESS'
      ? raw.type
      : raw.tipoAcesso === 'READ_ONLY' || raw.tipoAcesso === 'FULL_ACCESS'
        ? raw.tipoAcesso
        : fallbackProfile.type;
  const resolvedDescription =
    normalizedCode === 'CONSULTOR' && normalizeToken(rawDescription) === 'LEITURA'
      ? fallbackProfile.description
      : String(rawDescription ?? fallbackProfile.description).trim() || fallbackProfile.description;

  return {
    id: Number(raw.id ?? 0),
    code: normalizedCode || fallbackProfile.code,
    type: resolvedType,
    description: resolvedDescription,
    allowedScreens: normalizeAllowedScreens(
      raw.allowedScreens ?? raw.telasPermitidas,
      fallbackProfile.allowedScreens
    ),
    active: raw.active !== false && raw.ativo !== false,
    createdAt:
      (typeof raw.createdAt === 'string' ? raw.createdAt : undefined) ??
      (typeof raw.criadoEm === 'string' ? raw.criadoEm : undefined),
    updatedAt:
      (typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined) ??
      (typeof raw.atualizadoEm === 'string' ? raw.atualizadoEm : undefined),
  };
}

function normalizePageResponse(
  raw: unknown,
  requestedPage: number,
  requestedSize: number
): PageResponse<ProfileDTO> {
  if (raw && typeof raw === 'object' && Array.isArray((raw as PageResponse<ProfileDTO>).items)) {
    const response = raw as PageResponse<ProfileDTO>;

    return {
      items: response.items.map((item) => sanitizeProfile(item)),
      page: Number.isFinite(response.page) ? Math.max(response.page, 0) : requestedPage,
      size: Number.isFinite(response.size) ? Math.max(response.size, 1) : requestedSize,
      totalItems: Number.isFinite(response.totalItems) ? Math.max(response.totalItems, 0) : 0,
      totalPages: Number.isFinite(response.totalPages) ? Math.max(response.totalPages, 0) : 0,
    };
  }

  if (raw && typeof raw === 'object' && Array.isArray((raw as SpringPageResponse<ProfileDTO>).content)) {
    const response = raw as SpringPageResponse<ProfileDTO>;

    return {
      items: (response.content ?? []).map((item) => sanitizeProfile(item)),
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
    const items = raw.map((item) => sanitizeProfile(item as Partial<ProfileDTO>));
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

async function loadMockProfiles(): Promise<ProfileDTO[]> {
  if (cachedProfiles) {
    return cachedProfiles.map((profile) => ({
      ...profile,
      allowedScreens: [...profile.allowedScreens],
    }));
  }

  try {
    const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      const seeded = getDefaultProfilesSeed();
      cachedProfiles = seeded;
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(seeded));
      return seeded.map((profile) => ({ ...profile, allowedScreens: [...profile.allowedScreens] }));
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachedProfiles = parsed.map((item) =>
        sanitizeProfile(item as Partial<ProfileDTO> & Record<string, unknown>)
      );
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cachedProfiles));
    } else {
      cachedProfiles = getDefaultProfilesSeed();
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cachedProfiles));
    }
  } catch {
    cachedProfiles = getDefaultProfilesSeed();
  }

  return cachedProfiles.map((profile) => ({
    ...profile,
    allowedScreens: [...profile.allowedScreens],
  }));
}

async function saveMockProfiles(profiles: ProfileDTO[]): Promise<void> {
  cachedProfiles = profiles.map((profile) => sanitizeProfile(profile));
  await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(cachedProfiles));
}

function sanitizeUpsertPayload(payload: ProfileUpsertRequest): ProfileUpsertRequest {
  return {
    type: payload.type === 'READ_ONLY' ? 'READ_ONLY' : 'FULL_ACCESS',
    description: payload.description.trim(),
    allowedScreens: [...new Set(payload.allowedScreens)],
    active: payload.active !== false,
  };
}

async function listMockProfiles({
  page,
  size,
  search,
}: ListProfilesParams): Promise<PageResponse<ProfileDTO>> {
  const profiles = await loadMockProfiles();
  const normalizedSearch = (search ?? '').trim().toLowerCase();

  const filtered = profiles.filter((profile) => {
    if (!normalizedSearch) {
      return true;
    }

    return profile.description.toLowerCase().includes(normalizedSearch);
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

async function createMockProfile(payload: ProfileUpsertRequest): Promise<ProfileDTO> {
  const profiles = await loadMockProfiles();
  const normalized = sanitizeUpsertPayload(payload);
  const now = new Date().toISOString();
  const nextId = profiles.reduce((maxValue, profile) => Math.max(maxValue, profile.id), 0) + 1;

  const created: ProfileDTO = {
    id: nextId,
    code: generateProfileCode(normalized.description),
    type: normalized.type,
    description: normalized.description,
    allowedScreens: normalized.allowedScreens,
    active: normalized.active !== false,
    createdAt: now,
    updatedAt: now,
  };

  await saveMockProfiles([created, ...profiles]);
  return created;
}

async function updateMockProfile(id: number, payload: ProfileUpsertRequest): Promise<ProfileDTO> {
  const profiles = await loadMockProfiles();
  const index = profiles.findIndex((profile) => profile.id === id);

  if (index < 0) {
    throw new Error('Perfil nao encontrado.');
  }

  const normalized = sanitizeUpsertPayload(payload);
  const nextProfiles = [...profiles];
  nextProfiles[index] = {
    ...nextProfiles[index],
    type: normalized.type,
    description: normalized.description,
    allowedScreens: normalized.allowedScreens,
    active: normalized.active !== false,
    updatedAt: new Date().toISOString(),
  };

  await saveMockProfiles(nextProfiles);
  return nextProfiles[index];
}

async function updateMockProfileStatus(id: number, active: boolean): Promise<void> {
  const profiles = await loadMockProfiles();
  const index = profiles.findIndex((profile) => profile.id === id);

  if (index < 0) {
    throw new Error('Perfil nao encontrado.');
  }

  const nextProfiles = [...profiles];
  nextProfiles[index] = {
    ...nextProfiles[index],
    active,
    updatedAt: new Date().toISOString(),
  };

  await saveMockProfiles(nextProfiles);
}

export async function listProfiles({
  page,
  size,
  search,
}: ListProfilesParams): Promise<PageResponse<ProfileDTO>> {
  if (!forceMockMode) {
    const response = await runAgainstAvailableEndpoint(PROFILE_COLLECTION_ENDPOINTS, async (path) => {
      const httpResponse = await API.get(path, {
        params: {
          page,
          size,
          ...(search?.trim() ? { search: search.trim() } : {}),
        },
      });

      return normalizePageResponse(httpResponse.data, page, size);
    });

    if (response) {
      return response;
    }
  }

  return listMockProfiles({ page, size, search });
}

export async function createProfile(payload: ProfileUpsertRequest): Promise<ProfileDTO> {
  if (!forceMockMode) {
    const response = await runAgainstAvailableEndpoint(PROFILE_COLLECTION_ENDPOINTS, async (path) => {
      const httpResponse = await API.post<ProfileDTO>(path, payload);
      return sanitizeProfile(httpResponse.data);
    });

    if (response) {
      return response;
    }
  }

  return createMockProfile(payload);
}

export async function updateProfile(id: number, payload: ProfileUpsertRequest): Promise<ProfileDTO> {
  if (!forceMockMode) {
    const response = await runAgainstAvailableEndpoint(buildProfileDetailEndpoints(id), async (path) => {
      const httpResponse = await API.put<ProfileDTO>(path, payload);
      return sanitizeProfile(httpResponse.data);
    });

    if (response) {
      return response;
    }
  }

  return updateMockProfile(id, payload);
}

export async function activateProfile(id: number): Promise<void> {
  if (!forceMockMode) {
    const response = await runAgainstAvailableEndpoint(buildActivateEndpoints(id), async (path) => {
      await API.patch(path);
      return true;
    });

    if (response) {
      return;
    }
  }

  await updateMockProfileStatus(id, true);
}

export async function inactivateProfile(id: number): Promise<void> {
  if (!forceMockMode) {
    const response = await runAgainstAvailableEndpoint(buildInactivateEndpoints(id), async (path) => {
      await API.patch(path);
      return true;
    });

    if (response) {
      return;
    }
  }

  await updateMockProfileStatus(id, false);
}
