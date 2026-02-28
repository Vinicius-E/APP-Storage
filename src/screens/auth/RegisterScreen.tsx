import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import AlertDialog from '../../components/AlertDialog';
import AuthCard from '../../components/AuthCard';
import AuthInputField from '../../components/AuthInputField';
import AuthPrimaryButton from '../../components/AuthPrimaryButton';
import AuthSecondaryLink from '../../components/AuthSecondaryLink';
import { registerUser } from '../../services/authService';
import { useThemeContext } from '../../theme/ThemeContext';

const MIN_PASSWORD_LENGTH = 6;

export default function RegisterScreen() {
  const { width, height } = useWindowDimensions();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<{
    nome: boolean;
    email: boolean;
    senha: boolean;
    confirmarSenha: boolean;
  }>({
    nome: false,
    email: false,
    senha: false,
    confirmarSenha: false,
  });
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMsg, setDialogMsg] = useState('');
  const [dialogType, setDialogType] = useState<'success' | 'error' | 'warning'>('success');

  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { theme } = useThemeContext();
  const isCompact = width < 420;
  const isShortViewport = height < 760;
  const nomeValue = nome.trim();
  const emailValue = email.trim();
  const nomeValid = useMemo(() => nomeValue.length >= 2, [nomeValue]);
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue), [emailValue]);
  const senhaValid = useMemo(() => senha.trim().length >= MIN_PASSWORD_LENGTH, [senha]);
  const confirmacaoValida = useMemo(
    () => confirmarSenha.trim().length >= MIN_PASSWORD_LENGTH && confirmarSenha === senha,
    [confirmarSenha, senha]
  );
  const canSubmit = nomeValid && emailValid && senhaValid && confirmacaoValida && !loading;

  const nomeError = touched.nome && !nomeValid ? 'Informe seu nome.' : undefined;
  const emailError = touched.email && !emailValid ? 'Informe um email valido.' : undefined;
  const senhaError =
    touched.senha && !senhaValid
      ? `A senha deve ter no minimo ${MIN_PASSWORD_LENGTH} caracteres.`
      : undefined;
  const confirmarSenhaError =
    touched.confirmarSenha && !confirmacaoValida ? 'As senhas devem ser iguais.' : undefined;

  const openDialog = (type: 'success' | 'error' | 'warning', message: string) => {
    setDialogType(type);
    setDialogMsg(message);
    setDialogVisible(true);
  };

  const handleRegister = async () => {
    setTouched({
      nome: true,
      email: true,
      senha: true,
      confirmarSenha: true,
    });

    if (loading || !nomeValid || !emailValid || !senhaValid || !confirmacaoValida) {
      return;
    }

    try {
      setLoading(true);
      await registerUser({ login: emailValue, nome: nomeValue, senha });
      openDialog('success', 'Conta criada com sucesso!');
      setTimeout(() => navigation.navigate('Login'), 1200);
    } catch (error) {
      openDialog('error', 'Erro ao registrar. Tente novamente.');
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
        contentContainerStyle={[
          styles.scrollContent,
          {
            justifyContent: isShortViewport ? 'flex-start' : 'center',
            paddingHorizontal: isCompact ? 14 : 20,
            paddingVertical: isShortViewport ? 18 : 28,
          },
        ]}
      >
        <AuthCard badge="Wester Estoque">
          <View
            style={[
              styles.form,
              {
                marginTop: isCompact ? 20 : 24,
                gap: isCompact ? 14 : 16,
              },
            ]}
          >
            <AuthInputField
              label="Nome"
              icon="account-outline"
              value={nome}
              onChangeText={setNome}
              onBlur={() => setTouched((prev) => ({ ...prev, nome: true }))}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="name"
              placeholder="Seu nome"
              returnKeyType="next"
              errorText={nomeError}
            />

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
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="Crie uma senha"
              secureTextEntry={!showPassword}
              showPasswordToggle
              isPasswordVisible={showPassword}
              onTogglePasswordVisibility={() => setShowPassword((current) => !current)}
              returnKeyType="next"
              errorText={senhaError}
            />

            <AuthInputField
              label="Confirmar senha"
              icon="lock-check-outline"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              onBlur={() => setTouched((prev) => ({ ...prev, confirmarSenha: true }))}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="Repita sua senha"
              secureTextEntry={!showConfirmPassword}
              showPasswordToggle
              isPasswordVisible={showConfirmPassword}
              onTogglePasswordVisibility={() => setShowConfirmPassword((current) => !current)}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              errorText={confirmarSenhaError}
            />
          </View>

          <AuthPrimaryButton
            label="Criar conta"
            onPress={handleRegister}
            loading={loading}
            disabled={!canSubmit}
          />

          <AuthSecondaryLink label="Ja tenho conta" onPress={() => navigation.navigate('Login')} />
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
