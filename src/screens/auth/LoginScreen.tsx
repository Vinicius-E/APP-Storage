import React, { useMemo, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import AlertDialog from '../../components/AlertDialog';
import { loginUsuario } from '../../services/authService';
import { useThemeContext } from '../../theme/ThemeContext';
import { useAuth } from '../../auth/AuthContext';

type DialogType = 'success' | 'error' | 'warning';

export default function LoginScreen() {
  const [login, setLogin] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [touched, setTouched] = useState<{ login: boolean; senha: boolean }>({
    login: false,
    senha: false,
  });

  const [dialogVisible, setDialogVisible] = useState<boolean>(false);
  const [dialogMsg, setDialogMsg] = useState<string>('');
  const [dialogType, setDialogType] = useState<DialogType>('success');

  const navigation = useNavigation<any>();
  const { theme } = useThemeContext();
  const { login: setAuth } = useAuth();

  const emailValid = useMemo(() => {
    const value = login.trim();
    if (!value) {
      return false;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }, [login]);

  const senhaValid = useMemo(() => senha.trim().length >= 6, [senha]);
  const canSubmit = emailValid && senhaValid && !loading;

  const openDialog = (type: DialogType, message: string) => {
    setDialogType(type);
    setDialogMsg(message);
    setDialogVisible(true);
  };

  const handleLogin = async () => {
    setTouched({ login: true, senha: true });

    if (!canSubmit) {
      if (!emailValid) {
        openDialog('warning', 'Informe um email válido.');
        return;
      }
      if (!senhaValid) {
        openDialog('warning', 'A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      return;
    }

    try {
      setLoading(true);

      const usuario = await loginUsuario(login.trim(), senha);
      if (!usuario || !usuario.token) {
        openDialog('error', 'Usuário inválido.');
        return;
      }

      await AsyncStorage.setItem('authToken', usuario.token);
      setAuth();

      openDialog('success', `Bem-vindo, ${usuario.nome}`);
      setTimeout(() => navigation.navigate('Dashboard'), 800);
    } catch (error) {
      openDialog('error', 'Login inválido ou erro de conexão');
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
        <Text style={[styles.title, { color: theme.colors.primary }]}>Armazém</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Entre com suas credenciais
        </Text>

        <TextInput
          label="Email"
          value={login}
          onChangeText={setLogin}
          onBlur={() => setTouched((p) => ({ ...p, login: true }))}
          mode="flat"
          underlineColor="transparent"
          style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
          activeUnderlineColor={theme.colors.primary}
          textColor={theme.colors.text}
          selectionColor={theme.colors.primary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          left={<TextInput.Icon icon="email-outline" />}
          theme={{
            colors: {
              primary: theme.colors.primary,
              onSurfaceVariant: theme.colors.textSecondary,
              background: theme.colors.surfaceVariant,
            },
          }}
          error={touched.login && !emailValid}
        />

        <TextInput
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          onBlur={() => setTouched((p) => ({ ...p, senha: true }))}
          mode="flat"
          underlineColor="transparent"
          secureTextEntry={!showPassword}
          style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
          activeUnderlineColor={theme.colors.primary}
          textColor={theme.colors.text}
          selectionColor={theme.colors.primary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onPress={() => setShowPassword((s) => !s)}
              forceTextInputFocus={false}
            />
          }
          theme={{
            colors: {
              primary: theme.colors.primary,
              onSurfaceVariant: theme.colors.textSecondary,
              background: theme.colors.surfaceVariant,
            },
          }}
          error={touched.senha && !senhaValid}
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={!canSubmit}
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          contentStyle={styles.buttonContent}
          textColor={theme.colors.onPrimary}
        >
          Entrar
        </Button>

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
    paddingHorizontal: 28,
    paddingTop: 26,
    paddingBottom: 20,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
  },

  input: {
    marginBottom: 14,
    borderRadius: 10,
    overflow: 'hidden',
  },

  button: {
    marginTop: 8,
    borderRadius: 12,
    justifyContent: 'center',
  },

  buttonContent: {
    height: 48,
  },

  link: {
    marginTop: 14,
    textAlign: 'center',
    fontWeight: '700',
  },
});
