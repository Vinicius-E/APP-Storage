import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import AlertDialog from '../../components/AlertDialog';
import { loginUsuario } from '../../services/authService';

export default function LoginScreen() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMsg, setDialogMsg] = useState('');
  const [dialogType, setDialogType] = useState<'success' | 'error' | 'warning'>('success');

  const navigation = useNavigation<any>();

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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Armazém - Login</Text>

        <TextInput
          label="Email"
          value={login}
          onChangeText={setLogin}
          mode="flat"
          underlineColor="transparent"
          style={styles.input}
          activeUnderlineColor="#a98400"
          textColor="#000"
          selectionColor="#a98400"
          outlineColor="transparent"
          theme={{
            colors: {
              primary: '#a98400',
              onSurfaceVariant: '#a98400',
              background: '#e8f0ff',
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
          style={styles.input}
          activeUnderlineColor="#a98400"
          textColor="#000"
          selectionColor="#a98400"
          theme={{
            colors: {
              primary: '#a98400',
              onSurfaceVariant: '#a98400',
              background: '#e8f0ff',
            },
          }}
        />

        <Button mode="contained" onPress={handleLogin} style={styles.button} textColor="#fff">
          Entrar
        </Button>

        {/* LINK PARA LOGIN */}
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Não tem conta? Criar</Text>
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
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },

  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbdbdb',
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 25,
    color: '#a98400',
  },

  input: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#e8f0ff', // o azul clarinho igual ao print
  },

  button: {
    marginTop: 10,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: '#a98400',
  },

  link: {
    marginTop: 16,
    textAlign: 'center',
    color: '#a98400',
    fontWeight: '600',
  },
});
