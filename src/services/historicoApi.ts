import { API } from '../axios';

export interface HistoricoMovimentacaoResponseDTO {
  id: number;
  timestamp: string;
  tipoOperacao: string;
  usuarioId: number | null;
  usuarioLogin: string | null;
  usuarioNome: string | null;
  produtoId: number | null;
  produtoNomeModelo: string | null;
  produtoDescricao: string | null;
  produtoCor: string | null;
  produtoCodigoSistemaWester: string | null;
  itemEstoqueId: number | null;
  fileiraId?: number | null;
  fileiraIdentificador?: string | null;
  gradeId?: number | null;
  gradeIdentificador?: string | null;
  nivelId: number | null;
  nivelIdentificador: string | null;
  fileiraOrigemId?: number | null;
  fileiraOrigemIdentificador?: string | null;
  gradeOrigemId?: number | null;
  gradeOrigemIdentificador?: string | null;
  nivelOrigemId: number | null;
  nivelOrigemIdentificador: string | null;
  fileiraDestinoId?: number | null;
  fileiraDestinoIdentificador?: string | null;
  gradeDestinoId?: number | null;
  gradeDestinoIdentificador?: string | null;
  nivelDestinoId: number | null;
  nivelDestinoIdentificador: string | null;
  quantidadeAlterada: number | null;
  quantidadeAnterior: number | null;
  quantidadeNova: number | null;
  detalhesAlteracao: string | null;
}

export interface HistoricoMovimentacaoFilterRequestDTO {
  dataInicio?: string;
  dataFim?: string;
  tipoOperacao?: string;
  usuarioId?: number;
  produtoId?: number;
  nivelId?: number;
  textoLivre?: string;
}

export interface SliceResponse<T> {
  content: T[];
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  totalElements?: number;
  totalPages?: number;
}

export async function listarHistorico(
  page = 0,
  size = 20
): Promise<SliceResponse<HistoricoMovimentacaoResponseDTO>> {
  const response = await API.get<SliceResponse<HistoricoMovimentacaoResponseDTO>>(
    '/api/historico-movimentacao',
    { params: { page, size } }
  );
  return response.data;
}

export async function filtrarHistorico(
  filterDto: HistoricoMovimentacaoFilterRequestDTO,
  page = 0,
  size = 20
): Promise<SliceResponse<HistoricoMovimentacaoResponseDTO>> {
  const response = await API.post<SliceResponse<HistoricoMovimentacaoResponseDTO>>(
    '/api/historico-movimentacao/filter',
    filterDto,
    { params: { page, size } }
  );
  return response.data;
}

export async function buscarHistoricoPorId(id: number): Promise<HistoricoMovimentacaoResponseDTO> {
  const response = await API.get<HistoricoMovimentacaoResponseDTO>(`/api/historico-movimentacao/${id}`);
  return response.data;
}
