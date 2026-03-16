import { API, type ApiRequestOptions } from '../axios';
import type { UsuarioResponseDTO } from './usuarioApi';

export type AuthLoginRequestDTO = {
  login: string;
  senha: string;
};

const LOGIN_REQUEST_OPTIONS: ApiRequestOptions = {
  skipAuth: true,
};

export async function authenticateUser(
  payload: AuthLoginRequestDTO
): Promise<UsuarioResponseDTO> {
  const response = await API.post<UsuarioResponseDTO>(
    '/api/auth/login',
    payload,
    LOGIN_REQUEST_OPTIONS
  );

  return response.data;
}

export async function getAuthenticatedUser(): Promise<UsuarioResponseDTO> {
  const response = await API.get<UsuarioResponseDTO>('/api/auth/me');
  return response.data;
}
