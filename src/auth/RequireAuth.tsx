// src/auth/RequireAuth.tsx
import React, { useEffect } from 'react';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [isAuthenticated, navigation]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
