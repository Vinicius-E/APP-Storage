import { API } from '../../axios';
import { RegisterPayload, UsuarioResponse } from '../models/AuthModel';

export async function loginUsuario(login: string, senha: string): Promise<UsuarioResponse | null> {
  try {
    const response = await API.post<UsuarioResponse>('/usuarios/login', {
      login,
      senha,
    });

    return response.data;
  } catch (error: any) {
    console.error('Erro ao autenticar:', error?.response?.data || error.message);
    return null;
  }
}

export async function registerUser(data: RegisterPayload): Promise<void> {
  await API.post('/usuarios', data);
}
