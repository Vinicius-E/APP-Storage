import { API } from '../axios';
import {
  StockLevelItemDTO,
  StockMovementRecentDTO,
  StockMovementRequestDTO,
  StockMovementResponseDTO,
} from '../types/StockMovement';

export async function createStockMovement(
  payload: StockMovementRequestDTO
): Promise<StockMovementResponseDTO> {
  const response = await API.post<StockMovementResponseDTO>('/api/movimentacoes', payload);
  return response.data;
}

export async function listRecentStockMovements(
  limite = 10
): Promise<StockMovementRecentDTO[]> {
  const response = await API.get<StockMovementRecentDTO[]>('/api/movimentacoes/recentes', {
    params: { limite },
  });
  return Array.isArray(response.data) ? response.data : [];
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
