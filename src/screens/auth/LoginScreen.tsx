import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { AxiosError } from 'axios';
import { Button, Text, TextInput } from 'react-native-paper';
import { useAuth } from '../../auth/AuthContext';
import AlertDialog from '../../components/AlertDialog';
import AppTextInput from '../../components/AppTextInput';
import { useThemeContext } from '../../theme/ThemeContext';

type DialogType = 'success' | 'error' | 'warning';

export default function LoginScreen() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<{ login: boolean; senha: boolean }>({
    login: false,
    senha: false,
  });
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMsg, setDialogMsg] = useState('');
  const [dialogType, setDialogType] = useState<DialogType>('success');

  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { theme } = useThemeContext();
  const { signIn } = useAuth();
  const colors = theme.colors as typeof theme.colors & { textSecondary?: string };

  const loginValid = useMemo(() => login.trim().length >= 3, [login]);
  const senhaValid = useMemo(() => senha.trim().length >= 6, [senha]);
  const canSubmit = loginValid && senhaValid && !loading;

  const openDialog = (type: DialogType, message: string) => {
    setDialogType(type);
    setDialogMsg(message);
    setDialogVisible(true);
  };

  const resolveLoginError = (error: unknown): string => {
    if (error instanceof AxiosError) {
      if (error.response?.status === 401 || error.response?.status === 400) {
        return 'Login ou senha inválidos.';
      }
      return 'Não foi possível conectar ao servidor. Tente novamente.';
    }
    return 'Falha ao autenticar. Confira suas credenciais.';
  };

  const handleLogin = async () => {
    setTouched({ login: true, senha: true });

    if (!canSubmit) {
      if (!loginValid) {
        openDialog('warning', 'Informe seu login.');
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
      await signIn(login.trim(), senha);
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
        <Text style={[styles.subtitle, { color: colors.textSecondary ?? theme.colors.onSurfaceVariant }]}>
          Entre com suas credenciais
        </Text>

        <AppTextInput
          label="Email / Login"
          value={login}
          onChangeText={setLogin}
          onBlur={() => setTouched((prev) => ({ ...prev, login: true }))}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          left={<TextInput.Icon icon="email-outline" />}
          error={touched.login && !loginValid}
          style={styles.input}
        />

        <AppTextInput
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          onBlur={() => setTouched((prev) => ({ ...prev, senha: true }))}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onPress={() => setShowPassword((state) => !state)}
              forceTextInputFocus={false}
            />
          }
          error={touched.senha && !senhaValid}
          style={styles.input}
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
    width: '100%',
    alignSelf: 'stretch',
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
