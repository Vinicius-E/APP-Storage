import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import AlertDialog from '../../components/AlertDialog';
import { loginUsuario } from '../../services/authService';
import { useThemeContext } from '../../theme/ThemeContext';

export default function LoginScreen() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMsg, setDialogMsg] = useState('');
  const [dialogType, setDialogType] = useState<'success' | 'error' | 'warning'>('success');

  const navigation = useNavigation<any>();
  const { theme } = useThemeContext();

  const handleLogin = async () => {
    try {
      const usuario = await loginUsuario(login, senha);

      if (!usuario || !usuario.token) {
        throw new Error('Usuário inválido');
      }

      await AsyncStorage.setItem('authToken', usuario.token);

      setDialogMsg(`Bem-vindo, ${usuario.nome}`);
      setDialogType('success');
      setDialogVisible(true);

      setTimeout(() => navigation.navigate('Warehouse'), 1000);
    } catch (error) {
      setDialogMsg('Login inválido ou erro de conexão');
      setDialogType('error');
      setDialogVisible(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.primary }]}>Armazém - Login</Text>

        <TextInput
          label="Email"
          value={login}
          onChangeText={setLogin}
          mode="flat"
          underlineColor="transparent"
          style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
          activeUnderlineColor={theme.colors.primary}
          textColor={theme.colors.text}
          selectionColor={theme.colors.primary}
          outlineColor="transparent"
          theme={{
            colors: {
              primary: theme.colors.primary,
              onSurfaceVariant: theme.colors.primary,
              background: theme.colors.surfaceVariant,
            },
          }}
        />

        <TextInput
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          mode="flat"
          underlineColor="transparent"
          secureTextEntry
          style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
          activeUnderlineColor={theme.colors.primary}
          textColor={theme.colors.text}
          selectionColor={theme.colors.primary}
          theme={{
            colors: {
              primary: theme.colors.primary,
              onSurfaceVariant: theme.colors.primary,
              background: theme.colors.surfaceVariant,
            },
          }}
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          textColor={theme.colors.onPrimary}
        >
          Entrar
        </Button>

        {/* LINK PARA LOGIN */}
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={[styles.link, { color: theme.colors.primary }]}>Não tem conta? Criar</Text>
        </Pressable>
      </View>

      <AlertDialog
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        message={dialogMsg}
        type={dialogType}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },

  card: {
    width: '100%',
    maxWidth: 420,
    padding: 28,
    borderRadius: 18,
    borderWidth: 1,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 25,
  },

  input: {
    marginBottom: 16,
    borderRadius: 8,
  },

  button: {
    marginTop: 10,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
  },

  link: {
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
});
