import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setApiAuthToken } from '../axios';
import { loginUsuario } from '../services/usuarioApi';

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_USER_KEY = 'authUser';

type AuthUser = {
  id: number;
  login: string;
  nome: string;
  perfil: string;
  token: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  isRestoring: boolean;
  user: AuthUser | null;
  signIn: (login: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
  restore: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function safeParseAuthUser(raw: string | null): Omit<AuthUser, 'token'> | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (
      typeof parsed.id === 'number' &&
      typeof parsed.login === 'string' &&
      typeof parsed.nome === 'string' &&
      typeof parsed.perfil === 'string'
    ) {
      return {
        id: parsed.id,
        login: parsed.login,
        nome: parsed.nome,
        perfil: parsed.perfil,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const signOut = useCallback(async () => {
    setApiAuthToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
  }, []);

  const restore = useCallback(async () => {
    setIsRestoring(true);

    try {
      const [[, token], [, rawUser]] = await AsyncStorage.multiGet([AUTH_TOKEN_KEY, AUTH_USER_KEY]);

      if (!token) {
        setApiAuthToken(null);
        setUser(null);
        return;
      }

      setApiAuthToken(token);

      const parsedUser = safeParseAuthUser(rawUser);
      if (parsedUser) {
        setUser({
          ...parsedUser,
          token,
        });
      } else {
        setUser({
          id: 0,
          login: '',
          nome: '',
          perfil: '',
          token,
        });
      }
    } catch (error) {
      console.error('Falha ao restaurar sessao:', error);
      setApiAuthToken(null);
      setUser(null);
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const signIn = useCallback(async (login: string, senha: string) => {
    const response = await loginUsuario({
      login: login.trim(),
      senha,
    });

    if (!response.token) {
      throw new Error('Credenciais invalidas.');
    }

    const authUser: AuthUser = {
      id: typeof response.id === 'number' ? response.id : 0,
      login: response.login,
      nome: response.nome,
      perfil: response.perfil,
      token: response.token,
    };

    setApiAuthToken(authUser.token);
    setUser(authUser);

    await AsyncStorage.multiSet([
      [AUTH_TOKEN_KEY, authUser.token],
      [
        AUTH_USER_KEY,
        JSON.stringify({
          id: authUser.id,
          login: authUser.login,
          nome: authUser.nome,
          perfil: authUser.perfil,
        }),
      ],
    ]);
  }, []);

  useEffect(() => {
    void restore();
  }, [restore]);

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated: Boolean(user?.token),
      isRestoring,
      user,
      signIn,
      signOut,
      restore,
    }),
    [isRestoring, restore, signIn, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};
