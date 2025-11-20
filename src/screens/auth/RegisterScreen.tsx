import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import AlertDialog from '../../components/AlertDialog';
import { registerUser } from '../../services/authService';
import { useThemeContext } from '../../theme/ThemeContext';

export default function RegisterScreen() {
  const [login, setLogin] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMsg, setDialogMsg] = useState('');
  const [dialogType, setDialogType] = useState<'success' | 'error' | 'warning'>('success');

  const navigation = useNavigation<any>();
  const { theme } = useThemeContext();

  const handleRegister = async () => {
    if (!login || !nome || !senha) {
      setDialogMsg('Preencha todos os campos.');
      setDialogType('warning');
      setDialogVisible(true);
      return;
    }

    try {
      setLoading(true);
      await registerUser({ login, nome, senha });

      setDialogMsg('Conta criada com sucesso!');
      setDialogType('success');
      setDialogVisible(true);

      setTimeout(() => navigation.navigate('Login'), 1200);
    } catch (error) {
      setDialogMsg('Erro ao registrar. Tente novamente.');
      setDialogType('error');
      setDialogVisible(true);
    } finally {
      setLoading(false);
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
        <Text style={[styles.title, { color: theme.colors.primary }]}>Criar Conta</Text>

        <TextInput
          label="Login"
          value={login}
          onChangeText={setLogin}
          mode="flat"
          placeholder=" "
          underlineColor="transparent"
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
          style={[styles.input]}
          activeUnderlineColor={theme.colors.primary}
          textColor={theme.colors.text}
          selectionColor={theme.colors.primary}
          theme={{ colors: { background: '#e8f0ff', primary: theme.colors.primary } }}
        />

        <TextInput
          label="Nome"
          value={nome}
          onChangeText={setNome}
          mode="flat"
          placeholder=" "
          underlineColor="transparent"
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
          style={[styles.input]}
          activeUnderlineColor={theme.colors.primary}
          textColor={theme.colors.text}
          selectionColor={theme.colors.primary}
          theme={{ colors: { background: '#e8f0ff', primary: theme.colors.primary } }}
        />

        <TextInput
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          mode="flat"
          placeholder=" "
          underlineColor="transparent"
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
          style={[styles.input]}
          activeUnderlineColor={theme.colors.primary}
          textColor={theme.colors.text}
          selectionColor={theme.colors.primary}
          theme={{ colors: { background: '#e8f0ff', primary: theme.colors.primary } }}
        />

        <Button
          mode="contained"
          loading={loading}
          onPress={handleRegister}
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          textColor={theme.colors.onPrimary}
        >
          Registrar
        </Button>

        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.link, { color: theme.colors.primary }]}>Já tem conta? Entrar</Text>
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
    backgroundColor: '#e8f0ff',
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
