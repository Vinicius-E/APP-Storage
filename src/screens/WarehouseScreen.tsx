// src/screens/WarehouseScreen.tsx
import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthGuard } from '../hooks/useAuthGuard';
import Warehouse2DView from '../components/Warehouse2DView';

export default function WarehouseScreen() {
  useAuthGuard();

  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      const checkAuth = async () => {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          navigation.navigate('Login');
        }
      };
      checkAuth();
    }, [])
  );

  return (
    <View style={{ padding: 20 }}>
      <Text>Bem-vindo ao Armazém!</Text>
      <Warehouse2DView />
    </View>
  );
}
