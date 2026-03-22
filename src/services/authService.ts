import { RegisterPayload } from '../models/AuthModel';
import { authenticateUser } from './authApi';
import { criarUsuario, UsuarioResponseDTO } from './usuarioApi';

export async function authenticate(
  login: string,
  senha: string
): Promise<UsuarioResponseDTO | null> {
  try {
    return await authenticateUser({ login, senha });
  } catch (error) {
    console.error('Erro ao autenticar:', error);
    return null;
  }
}

export async function registerUser(data: RegisterPayload): Promise<void> {
  await criarUsuario({
    login: data.login,
    nome: data.nome,
    senha: data.senha,
    perfil: 'CONSULTOR',
  });
}
