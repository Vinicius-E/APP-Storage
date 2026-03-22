import { API } from '../axios';
import { StockAlertFilterDTO, StockAlertResponseDTO } from '../types/StockAlert';

export async function fetchStockAlerts(
  payload: StockAlertFilterDTO
): Promise<StockAlertResponseDTO> {
  const response = await API.post<StockAlertResponseDTO>('/api/alertas-estoque', payload);
  return response.data;
}
