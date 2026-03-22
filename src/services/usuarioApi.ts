import { API } from '../axios';

export interface UsuarioResponseDTO {
  id: number;
  login: string;
  nome: string;
  perfil: string;
  ativo: boolean;
  token?: string;
}

export interface UsuarioRequestDTO {
  login: string;
  nome: string;
  perfil: string;
  senha: string;
}

export interface UsuarioUpdateRequest {
  login: string;
  nome: string;
  perfil: string;
}

export interface UsuarioPerfilDisponivelDTO {
  id: number;
  code: string;
  description: string;
  type: 'READ_ONLY' | 'FULL_ACCESS';
  active: boolean;
}

export interface UsuarioChangePasswordRequestDTO {
  senhaAtual: string;
  novaSenha: string;
  confirmarNovaSenha: string;
}

export interface UsuarioStatusUpdateRequestDTO {
  ativo: boolean;
}

export async function listarUsuarios(): Promise<UsuarioResponseDTO[]> {
  const response = await API.get<UsuarioResponseDTO[]>('/api/usuarios');
  return Array.isArray(response.data) ? response.data : [];
}

export async function listarPerfisAtivosUsuario(): Promise<UsuarioPerfilDisponivelDTO[]> {
  const response = await API.get<UsuarioPerfilDisponivelDTO[]>('/api/perfis/ativos');
  return Array.isArray(response.data) ? response.data : [];
}

export async function criarUsuario(dto: UsuarioRequestDTO): Promise<UsuarioResponseDTO> {
  const response = await API.post<UsuarioResponseDTO>('/api/usuarios', dto);
  return response.data;
}

export async function atualizarUsuario(
  id: number,
  dto: UsuarioUpdateRequest
): Promise<UsuarioResponseDTO> {
  const response = await API.put<UsuarioResponseDTO>(`/api/usuarios/id/${id}`, dto);
  return response.data;
}

export async function deletarUsuario(id: number): Promise<void> {
  await API.delete(`/api/usuarios/id/${id}`);
}

export async function alterarSenhaUsuario(
  id: number,
  dto: UsuarioChangePasswordRequestDTO
): Promise<void> {
  await API.post(`/api/usuarios/id/${id}/alterar-senha`, dto);
}

export async function atualizarStatusUsuario(
  id: number,
  ativo: boolean
): Promise<UsuarioResponseDTO> {
  const payload: UsuarioStatusUpdateRequestDTO = { ativo };
  const response = await API.patch<UsuarioResponseDTO>(`/api/usuarios/id/${id}/status`, payload);
  return response.data;
}
