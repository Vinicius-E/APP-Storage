import React, { useMemo, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { width, height } = useWindowDimensions();
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
  const [navigateAfterDialog, setNavigateAfterDialog] = useState(false);

  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { theme } = useThemeContext();
  const { signIn } = useAuth();
  const isCompact = width < 420;
  const isShortViewport = height < 760;

  const emailValue = email.trim();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue), [emailValue]);
  const senhaValid = useMemo(() => senha.trim().length >= MIN_PASSWORD_LENGTH, [senha]);
  const canSubmit = emailValid && senhaValid && !loading;

  const emailError = touched.email && !emailValid ? 'Informe um email valido.' : undefined;
  const senhaError =
    touched.senha && !senhaValid
      ? `A senha deve ter no minimo ${MIN_PASSWORD_LENGTH} caracteres.`
      : undefined;

  const openDialog = (type: DialogType, message: string, shouldNavigateAfterDismiss = false) => {
    setDialogType(type);
    setDialogMsg(message);
    setNavigateAfterDialog(shouldNavigateAfterDismiss);
    setDialogVisible(true);
  };

  const handleDialogDismiss = () => {
    const shouldNavigate = dialogType === 'success' && navigateAfterDialog;

    setDialogVisible(false);
    setNavigateAfterDialog(false);

    if (shouldNavigate) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    }
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
      const authUser = await signIn(emailValue, senha);
      const displayName = authUser.nome?.trim() || authUser.login?.trim() || emailValue;
      openDialog('success', `Bem-vindo, ${displayName}!`, true);
    } catch (error) {
      openDialog('error', resolveLoginError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={[styles.page, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderBottomColor: theme.colors.outline,
            },
          ]}
        >
          <Pressable
            onPress={() => (navigation as any).toggleDrawer?.()}
            style={styles.headerMenuButton}
            hitSlop={10}
          >
            <MaterialCommunityIcons name="menu" size={24} color={theme.colors.primary} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>Login</Text>
        </View>

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

            <AuthSecondaryLink
              label="Criar conta"
              onPress={() => navigation.navigate('Criar conta')}
            />
          </AuthCard>
        </ScrollView>

        <AlertDialog
          visible={dialogVisible}
          onDismiss={handleDialogDismiss}
          message={dialogMsg}
          type={dialogType}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
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
