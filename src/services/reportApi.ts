import { API } from '../axios';
import {
  MovementHistoryReportFilterDTO,
  MovementHistoryReportResponseDTO,
  ProductsReportFilterDTO,
  ProductsReportResponseDTO,
  StockItemsReportFilterDTO,
  StockItemsReportResponseDTO,
  StocksReportFilterDTO,
  StocksReportResponseDTO,
} from '../types/Report';

export async function fetchProductsReport(
  payload: ProductsReportFilterDTO
): Promise<ProductsReportResponseDTO> {
  const response = await API.post<ProductsReportResponseDTO>('/api/relatorios/produtos', payload);
  return response.data;
}

export async function fetchStocksReport(
  payload: StocksReportFilterDTO
): Promise<StocksReportResponseDTO> {
  const response = await API.post<StocksReportResponseDTO>('/api/relatorios/estoques', payload);
  return response.data;
}

export async function fetchStockItemsReport(
  payload: StockItemsReportFilterDTO
): Promise<StockItemsReportResponseDTO> {
  const response = await API.post<StockItemsReportResponseDTO>('/api/relatorios/itens-estoque', payload);
  return response.data;
}

export async function fetchMovementHistoryReport(
  payload: MovementHistoryReportFilterDTO
): Promise<MovementHistoryReportResponseDTO> {
  const response = await API.post<MovementHistoryReportResponseDTO>(
    '/api/relatorios/historico-movimentacao',
    payload
  );
  return response.data;
}
