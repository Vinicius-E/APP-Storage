import React, { useMemo, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import AlertDialog from '../../components/AlertDialog';
import AppTextInput from '../../components/AppTextInput';
import { registerUser } from '../../services/authService';
import { useThemeContext } from '../../theme/ThemeContext';

export default function RegisterScreen() {
  const [login, setLogin] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [touched, setTouched] = useState<{ login: boolean; nome: boolean; senha: boolean }>({
    login: false,
    nome: false,
    senha: false,
  });

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMsg, setDialogMsg] = useState('');
  const [dialogType, setDialogType] = useState<'success' | 'error' | 'warning'>('success');

  const navigation = useNavigation<any>();
  const { theme } = useThemeContext();
  const colors = theme.colors as typeof theme.colors & {
    secondaryContainer?: string;
    onSecondaryContainer?: string;
  };

  const emailValid = useMemo(() => {
    const value = login.trim();
    if (!value) {
      return false;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }, [login]);

  const nomeValid = useMemo(() => nome.trim().length >= 2, [nome]);
  const senhaValid = useMemo(() => senha.trim().length >= 6, [senha]);
  const canSubmit = emailValid && nomeValid && senhaValid && !loading;
  const registerButtonColor = canSubmit
    ? theme.colors.primary
    : colors.secondaryContainer ?? '#EED9BC';
  const registerTextColor = canSubmit
    ? theme.colors.onPrimary
    : colors.onSecondaryContainer ?? '#5E3B14';

  const handleRegister = async () => {
    setTouched({ login: true, nome: true, senha: true });

    if (!canSubmit) {
      if (!emailValid) {
        setDialogMsg('Informe um email válido.');
        setDialogType('warning');
        setDialogVisible(true);
        return;
      }
      if (!nomeValid) {
        setDialogMsg('Informe seu nome.');
        setDialogType('warning');
        setDialogVisible(true);
        return;
      }
      if (!senhaValid) {
        setDialogMsg('A senha deve ter pelo menos 6 caracteres.');
        setDialogType('warning');
        setDialogVisible(true);
        return;
      }
      return;
    }

    try {
      setLoading(true);
      await registerUser({ login: login.trim(), nome: nome.trim(), senha });

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
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Preencha seus dados para continuar
        </Text>

        <AppTextInput
          label="Email"
          value={login}
          onChangeText={setLogin}
          onBlur={() => setTouched((p) => ({ ...p, login: true }))}
          autoComplete="email"
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.input}
          keyboardType="email-address"
          returnKeyType="next"
          left={<TextInput.Icon icon="email-outline" />}
          error={touched.login && !emailValid}
        />

        <AppTextInput
          label="Nome"
          value={nome}
          onChangeText={setNome}
          onBlur={() => setTouched((p) => ({ ...p, nome: true }))}
          autoComplete="name"
          autoCorrect={false}
          autoCapitalize="words"
          style={styles.input}
          returnKeyType="next"
          left={<TextInput.Icon icon="account-outline" />}
          error={touched.nome && !nomeValid}
        />

        <AppTextInput
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          onBlur={() => setTouched((p) => ({ ...p, senha: true }))}
          secureTextEntry={!showPassword}
          autoComplete="password"
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onPress={() => setShowPassword((s) => !s)}
              forceTextInputFocus={false}
            />
          }
          error={touched.senha && !senhaValid}
        />

        <Button
          mode="contained"
          loading={loading}
          onPress={handleRegister}
          disabled={!canSubmit}
          style={styles.button}
          buttonColor={registerButtonColor}
          contentStyle={styles.buttonContent}
          textColor={registerTextColor}
          labelStyle={styles.buttonLabel}
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
  },

  button: {
    marginTop: 8,
    borderRadius: 12,
    justifyContent: 'center',
  },

  buttonContent: {
    height: 48,
  },

  buttonLabel: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  link: {
    marginTop: 14,
    textAlign: 'center',
    fontWeight: '700',
  },
});
