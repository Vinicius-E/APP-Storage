export interface UsuarioResponse {
  token: string;
  id: number | null;
  login: string;
  nome: string;
  perfil: string;
}


export interface LoginRequest {
  login: string;
  nome: string;
}
  
export interface LoginResponse {
  token: string;
  usuario: {
    id: number;
    login: string;
    nome: string;
    perfil: string;
  };
}

export interface RegisterPayload {
  login: string;
  nome: string;
  senha: string;
}

