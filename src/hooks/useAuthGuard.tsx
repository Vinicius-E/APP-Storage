// src/hooks/useAuthGuard.ts
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

export function useAuthGuard() {
  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      const verify = async () => {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) navigation.navigate('Login');
      };
      verify();
    }, [])
  );
}
