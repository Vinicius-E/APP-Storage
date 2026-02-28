import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { useAuth } from '../../auth/AuthContext';
import AlertDialog from '../../components/AlertDialog';
import AuthCard from '../../components/AuthCard';
import AuthInputField from '../../components/AuthInputField';
import AuthPrimaryButton from '../../components/AuthPrimaryButton';
import AuthSecondaryLink from '../../components/AuthSecondaryLink';
import { useThemeContext } from '../../theme/ThemeContext';

type DialogType = 'success' | 'error' | 'warning';

const MIN_PASSWORD_LENGTH = 6;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<{ email: boolean; senha: boolean }>({
    email: false,
    senha: false,
  });
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMsg, setDialogMsg] = useState('');
  const [dialogType, setDialogType] = useState<DialogType>('success');

  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { theme } = useThemeContext();
  const { signIn } = useAuth();

  const emailValue = email.trim();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue), [emailValue]);
  const senhaValid = useMemo(() => senha.trim().length >= MIN_PASSWORD_LENGTH, [senha]);
  const canSubmit = emailValid && senhaValid && !loading;

  const emailError = touched.email && !emailValid ? 'Informe um email valido.' : undefined;
  const senhaError =
    touched.senha && !senhaValid
      ? `A senha deve ter no minimo ${MIN_PASSWORD_LENGTH} caracteres.`
      : undefined;

  const openDialog = (type: DialogType, message: string) => {
    setDialogType(type);
    setDialogMsg(message);
    setDialogVisible(true);
  };

  const resolveLoginError = (error: unknown): string => {
    if (error instanceof AxiosError) {
      if (error.response?.status === 400 || error.response?.status === 401) {
        return 'Email ou senha invalidos.';
      }

      return 'Nao foi possivel conectar ao servidor. Tente novamente.';
    }

    return 'Falha ao autenticar. Confira suas credenciais.';
  };

  const handleLogin = async () => {
    setTouched({ email: true, senha: true });

    if (loading || !emailValid || !senhaValid) {
      return;
    }

    try {
      setLoading(true);
      await signIn(emailValue, senha);
      openDialog('success', 'Login realizado com sucesso.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    } catch (error) {
      openDialog('error', resolveLoginError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.page, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AuthCard badge="Wester Estoque">
          <View style={styles.form}>
            <AuthInputField
              label="Email"
              icon="email-outline"
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              placeholder="seu@email.com"
              returnKeyType="next"
              errorText={emailError}
            />

            <AuthInputField
              label="Senha"
              icon="lock-outline"
              value={senha}
              onChangeText={setSenha}
              onBlur={() => setTouched((prev) => ({ ...prev, senha: true }))}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              placeholder="Sua senha"
              secureTextEntry={!showPassword}
              showPasswordToggle
              isPasswordVisible={showPassword}
              onTogglePasswordVisibility={() => setShowPassword((current) => !current)}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              errorText={senhaError}
            />
          </View>

          <AuthPrimaryButton
            label="Entrar"
            onPress={handleLogin}
            loading={loading}
            disabled={!canSubmit}
          />

          <AuthSecondaryLink label="Criar conta" onPress={() => navigation.navigate('Register')} />
        </AuthCard>
      </ScrollView>

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
  page: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  form: {
    marginTop: 24,
    gap: 16,
  },
});
