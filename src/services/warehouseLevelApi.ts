import { API } from '../axios';

export type GradeLevelDraft = {
  identificador: string;
  ordem: number;
};

export type StockItemProductReference = {
  id?: number | null;
  codigo?: string | null;
  codigoSistemaWester?: string | null;
  nome?: string | null;
  nomeModelo?: string | null;
  cor?: string | null;
  descricao?: string | null;
};

export type StockItemUpsertRequest = {
  produto: StockItemProductReference;
  quantidade: number;
};

type ItemEstoqueUpsertPayload = {
  quantidade: number;
  produto: {
    id?: number;
    codigoSistemaWester: string;
    nomeModelo: string;
    cor: string;
    descricao: string;
  };
};

function normalizeDraft(draft: GradeLevelDraft): GradeLevelDraft {
  const identificador = String(draft.identificador ?? '').trim();
  const ordem = Number(draft.ordem);

  if (identificador === '') {
    throw new Error('Nao foi possivel determinar o identificador do novo nivel.');
  }

  if (!Number.isFinite(ordem)) {
    throw new Error('Nao foi possivel determinar a ordem do novo nivel.');
  }

  return {
    identificador,
    ordem,
  };
}

function normalizeProductPayload(
  payload: StockItemUpsertRequest
): ItemEstoqueUpsertPayload {
  const produtoId = Number(payload.produto?.id);
  const quantidade = Number(payload.quantidade);
  const codigoSistemaWester = String(
    payload.produto?.codigoSistemaWester ?? payload.produto?.codigo ?? ''
  ).trim();
  const nomeModelo = String(payload.produto?.nomeModelo ?? payload.produto?.nome ?? '').trim();
  const cor = String(payload.produto?.cor ?? '').trim();
  const descricao = String(payload.produto?.descricao ?? '').trim();

  if (!Number.isFinite(produtoId) || produtoId <= 0) {
    throw new Error('Selecione um produto ativo para continuar.');
  }

  if (nomeModelo === '') {
    throw new Error('O produto selecionado nao possui Nome/Modelo valido.');
  }

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new Error('Informe uma quantidade inteira maior que zero.');
  }

  return {
    produto: {
      id: produtoId,
      codigoSistemaWester,
      nomeModelo,
      cor,
      descricao,
    },
    quantidade,
  };
}

export function buildStockItemUpsertPayload(
  payload: StockItemUpsertRequest
): ItemEstoqueUpsertPayload {
  return normalizeProductPayload(payload);
}

function buildLevelPayload(gradeId: number, draft: GradeLevelDraft) {
  return {
    identificador: draft.identificador,
    ordem: draft.ordem,
    grade: { id: gradeId },
  };
}

function extractEntityId(data: unknown): number | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const rawId = (data as { id?: unknown }).id;

  if (typeof rawId === 'number' && Number.isFinite(rawId)) {
    return rawId;
  }

  if (typeof rawId === 'string') {
    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

async function rollbackCreatedLevel(nivelId: number | null): Promise<void> {
  if (nivelId == null) {
    return;
  }

  try {
    await API.delete(`/api/niveis/${nivelId}/resequence`);
  } catch {
    // Ignore rollback failure. The original error is more relevant to the caller.
  }
}

async function createLevel(
  gradeId: number,
  draft: GradeLevelDraft
): Promise<{ data: unknown; nivelId: number | null }> {
  const normalizedDraft = normalizeDraft(draft);
  const response = await API.post(`/api/niveis/grade/${gradeId}`, buildLevelPayload(gradeId, normalizedDraft));

  return {
    data: response.data,
    nivelId: extractEntityId(response.data),
  };
}

export async function createEmptyLevelInGrade(
  gradeId: number,
  draft: GradeLevelDraft
): Promise<unknown> {
  const createdLevel = await createLevel(gradeId, draft);
  return createdLevel.data;
}

export async function createLevelWithProductInGrade(
  gradeId: number,
  draft: GradeLevelDraft,
  payload: StockItemUpsertRequest
): Promise<unknown> {
  const normalizedPayload = buildStockItemUpsertPayload(payload);
  const createdLevel = await createLevel(gradeId, draft);

  if (createdLevel.nivelId == null) {
    throw new Error('Nao foi possivel identificar o nivel criado.');
  }

  try {
    await API.put(
      `/api/itens-estoque/nivel/${createdLevel.nivelId}`,
      normalizedPayload
    );
    return createdLevel.data;
  } catch (error) {
    await rollbackCreatedLevel(createdLevel.nivelId);
    throw error;
  }
}
