import { API } from '../axios';
import { AreaDTO } from '../types/Area';
import { Product } from '../types/Product';
import {
  StockMovementFileiraDTO,
  StockMovementGradeDTO,
  StockMovementInitialContextDTO,
  StockLevelItemDTO,
  StockMovementRecentDTO,
  StockMovementRequestDTO,
  StockMovementResponseDTO,
} from '../types/StockMovement';

type StockMovementAreaOptionResponseDTO = {
  id: number;
  nome: string;
};

type StockMovementProductOptionResponseDTO = {
  id: number;
  codigoSistemaWester?: string | null;
  nomeModelo?: string | null;
};

type StockMovementInitialContextResponseDTO = {
  produtos?: StockMovementProductOptionResponseDTO[];
  areas?: StockMovementAreaOptionResponseDTO[];
  movimentacoesRecentes?: StockMovementRecentDTO[];
};

type StockMovementAreaStructureRowDTO = {
  fileiraId: number;
  fileiraIdentificador: string;
  gradeId: number;
  gradeIdentificador: string;
  nivelId: number;
  nivelIdentificador: string;
  nivelOrdem?: number | null;
};

const INITIAL_CONTEXT_CACHE_TTL_MS = 30_000;

let cachedInitialContext:
  | { value: StockMovementInitialContextDTO; cachedAt: number }
  | null = null;
let initialContextRequest: Promise<StockMovementInitialContextDTO> | null = null;
const areaStructureCache = new Map<number, StockMovementFileiraDTO[]>();
const areaStructureRequests = new Map<number, Promise<StockMovementFileiraDTO[]>>();

function cloneRecentMovements(items: StockMovementRecentDTO[]): StockMovementRecentDTO[] {
  return items.map((item) => ({ ...item }));
}

function cloneInitialContext(
  context: StockMovementInitialContextDTO
): StockMovementInitialContextDTO {
  return {
    areas: context.areas.map((area) => ({ ...area })),
    products: context.products.map((product) => ({ ...product })),
    recentMovements: cloneRecentMovements(context.recentMovements),
  };
}

function cloneAreaStructure(
  fileiras: StockMovementFileiraDTO[]
): StockMovementFileiraDTO[] {
  return fileiras.map((fileira) => ({
    ...fileira,
    grades: fileira.grades.map((grade) => ({
      ...grade,
      niveis: grade.niveis.map((nivel) => ({ ...nivel })),
    })),
  }));
}

function mapAreaOptionToArea(area: StockMovementAreaOptionResponseDTO): AreaDTO {
  return {
    id: area.id,
    name: area.nome,
    description: area.nome,
    active: true,
  };
}

function mapProductOptionToProduct(product: StockMovementProductOptionResponseDTO): Product {
  const codigoSistemaWester = product.codigoSistemaWester?.trim() || undefined;
  const nomeModelo = product.nomeModelo?.trim() || undefined;

  return {
    id: product.id,
    codigo: codigoSistemaWester ?? '',
    nome: nomeModelo ?? '',
    codigoSistemaWester,
    nomeModelo,
    ativo: true,
  };
}

function buildAreaStructure(
  rows: StockMovementAreaStructureRowDTO[]
): StockMovementFileiraDTO[] {
  const fileiraMap = new Map<
    number,
    StockMovementFileiraDTO & { gradeMap: Map<number, StockMovementGradeDTO> }
  >();

  rows.forEach((row) => {
    const existingFileira = fileiraMap.get(row.fileiraId);
    const fileira =
      existingFileira ??
      {
        id: row.fileiraId,
        identificador: row.fileiraIdentificador,
        grades: [],
        gradeMap: new Map<number, StockMovementGradeDTO>(),
      };

    if (!existingFileira) {
      fileiraMap.set(row.fileiraId, fileira);
    }

    const existingGrade = fileira.gradeMap.get(row.gradeId);
    const grade =
      existingGrade ??
      {
        id: row.gradeId,
        identificador: row.gradeIdentificador,
        niveis: [],
      };

    if (!existingGrade) {
      fileira.gradeMap.set(row.gradeId, grade);
      fileira.grades.push(grade);
    }

    if (!grade.niveis.some((nivel) => nivel.id === row.nivelId)) {
      grade.niveis.push({
        id: row.nivelId,
        identificador: row.nivelIdentificador,
      });
    }
  });

  return Array.from(fileiraMap.values())
    .map((fileira) => ({
      id: fileira.id,
      identificador: fileira.identificador,
      grades: fileira.grades
        .map((grade) => ({
          ...grade,
          niveis: [...grade.niveis].sort((left, right) =>
            left.identificador.localeCompare(right.identificador, 'pt-BR', {
              numeric: true,
              sensitivity: 'base',
            })
          ),
        }))
        .sort((left, right) =>
          left.identificador.localeCompare(right.identificador, 'pt-BR', {
            numeric: true,
            sensitivity: 'base',
          })
        ),
    }))
    .sort((left, right) =>
      left.identificador.localeCompare(right.identificador, 'pt-BR', {
        numeric: true,
        sensitivity: 'base',
      })
    );
}

export function invalidateStockMovementInitialContextCache(): void {
  cachedInitialContext = null;
  initialContextRequest = null;
}

export function invalidateStockMovementAreaStructureCache(areaId?: number): void {
  if (typeof areaId === 'number') {
    areaStructureCache.delete(areaId);
    areaStructureRequests.delete(areaId);
    return;
  }

  areaStructureCache.clear();
  areaStructureRequests.clear();
}

export async function fetchStockMovementInitialContext(options?: {
  forceRefresh?: boolean;
}): Promise<StockMovementInitialContextDTO> {
  const forceRefresh = options?.forceRefresh === true;
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedInitialContext &&
    now - cachedInitialContext.cachedAt < INITIAL_CONTEXT_CACHE_TTL_MS
  ) {
    return cloneInitialContext(cachedInitialContext.value);
  }

  if (!forceRefresh && initialContextRequest) {
    return initialContextRequest.then((context) => cloneInitialContext(context));
  }

  initialContextRequest = API.get<StockMovementInitialContextResponseDTO>(
    '/api/movimentacoes/contexto-inicial'
  )
    .then((response) => {
      const context: StockMovementInitialContextDTO = {
        areas: Array.isArray(response.data?.areas)
          ? response.data.areas.map(mapAreaOptionToArea)
          : [],
        products: Array.isArray(response.data?.produtos)
          ? response.data.produtos.map(mapProductOptionToProduct)
          : [],
        recentMovements: Array.isArray(response.data?.movimentacoesRecentes)
          ? cloneRecentMovements(response.data.movimentacoesRecentes)
          : [],
      };

      cachedInitialContext = {
        value: cloneInitialContext(context),
        cachedAt: Date.now(),
      };

      return context;
    })
    .finally(() => {
      initialContextRequest = null;
    });

  return initialContextRequest.then((context) => cloneInitialContext(context));
}

export async function fetchStockMovementAreaStructure(
  areaId: number,
  options?: { forceRefresh?: boolean }
): Promise<StockMovementFileiraDTO[]> {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && areaStructureCache.has(areaId)) {
    return cloneAreaStructure(areaStructureCache.get(areaId) ?? []);
  }

  if (!forceRefresh && areaStructureRequests.has(areaId)) {
    const currentRequest = areaStructureRequests.get(areaId);
    return currentRequest
      ? currentRequest.then((fileiras) => cloneAreaStructure(fileiras))
      : [];
  }

  const request = API.get<StockMovementAreaStructureRowDTO[]>(
    `/api/estoque/posicoes/area/${areaId}`,
    {
      validateStatus: (status) => status === 200 || status === 404,
    }
  )
    .then((response) => {
      const rows = response.status === 404 || !Array.isArray(response.data) ? [] : response.data;
      const structure = buildAreaStructure(rows);
      areaStructureCache.set(areaId, cloneAreaStructure(structure));
      return structure;
    })
    .finally(() => {
      areaStructureRequests.delete(areaId);
    });

  areaStructureRequests.set(areaId, request);
  return request.then((fileiras) => cloneAreaStructure(fileiras));
}

export async function createStockMovement(
  payload: StockMovementRequestDTO
): Promise<StockMovementResponseDTO> {
  const response = await API.post<StockMovementResponseDTO>('/api/movimentacoes', payload);
  invalidateStockMovementInitialContextCache();
  invalidateStockMovementAreaStructureCache();
  return response.data;
}

export async function listRecentStockMovements(
  limite = 10
): Promise<StockMovementRecentDTO[]> {
  const response = await API.get<StockMovementRecentDTO[]>('/api/movimentacoes/recentes', {
    params: { limite },
  });
  const items = Array.isArray(response.data) ? response.data : [];

  if (cachedInitialContext) {
    cachedInitialContext = {
      value: {
        ...cachedInitialContext.value,
        recentMovements: cloneRecentMovements(items),
      },
      cachedAt: cachedInitialContext.cachedAt,
    };
  }

  return items;
}

export async function fetchStockItemByLevel(
  nivelId: number
): Promise<StockLevelItemDTO | null> {
  const response = await API.get<StockLevelItemDTO | null>(`/api/itens-estoque/nivel/${nivelId}`, {
    validateStatus: (status) => status === 200 || status === 204,
  });

  if (response.status === 204 || !response.data) {
    return null;
  }

  return response.data;
}
