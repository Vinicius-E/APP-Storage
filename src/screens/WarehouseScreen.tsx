// src/screens/WarehouseScreen.tsx
import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthGuard } from '../hooks/useAuthGuard';
import Warehouse2DView from '../components/Warehouse2DView';
import { useThemeContext } from '../theme/ThemeContext';

export default function WarehouseScreen() {
  useAuthGuard();

  const navigation = useNavigation<any>();
  const { theme } = useThemeContext();

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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.heading, { color: theme.colors.text }]}>Bem-vindo ao Armazém!</Text>
      <Warehouse2DView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
});
