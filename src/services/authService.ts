import axios from "axios";
import {
  LoginResponse,
  RegisterPayload,
  UsuarioResponse,
} from "../models/AuthModel";

const API = axios.create({
  //baseURL: 'http://189.114.218.34/api', // ou 'http://192.168.x.x:8080/api' no celular
  baseURL: "http://localhost:8080/api",
});

export async function loginUsuario(
  login: string,
  senha: string
): Promise<UsuarioResponse | null> {
  try {
    const response = await API.post<UsuarioResponse>("/usuarios/login", {
      login,
      senha,
    });

    return response.data;
  } catch (error: any) {
    console.error(
      "Erro ao autenticar:",
      error?.response?.data || error.message
    );
    return null;
  }
}

export async function registerUser(data: RegisterPayload): Promise<void> {
  await API.post("/usuarios", data);
}
