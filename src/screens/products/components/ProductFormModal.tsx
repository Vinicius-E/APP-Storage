import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button, Modal, Portal, Surface, Text } from 'react-native-paper';
import AppTextInput from '../../../components/AppTextInput';
import { useThemeContext } from '../../../theme/ThemeContext';
import { Product, ProductUpsertRequest } from '../../../types/Product';

type ProductFormModalProps = {
  visible: boolean;
  mode: 'create' | 'edit';
  initialProduct?: Product | null;
  saving: boolean;
  onDismiss: () => void;
  onSubmit: (payload: ProductUpsertRequest) => Promise<void> | void;
};

type FormState = {
  codigo: string;
  nomeModelo: string;
  cor: string;
  descricao: string;
};

type TouchedState = Record<keyof FormState, boolean>;

const EMPTY_FORM: FormState = {
  codigo: '',
  nomeModelo: '',
  cor: '',
  descricao: '',
};

const EMPTY_TOUCHED: TouchedState = {
  codigo: false,
  nomeModelo: false,
  cor: false,
  descricao: false,
};

function toFormState(product?: Product | null): FormState {
  if (!product) {
    return EMPTY_FORM;
  }

  return {
    codigo: product.codigoSistemaWester ?? product.codigo ?? '',
    nomeModelo: product.nomeModelo ?? product.nome ?? '',
    cor: product.cor ?? '',
    descricao: product.descricao ?? '',
  };
}

export default function ProductFormModal({
  visible,
  mode,
  initialProduct,
  saving,
  onDismiss,
  onSubmit,
}: ProductFormModalProps) {
  const { theme } = useThemeContext();
  const { width, height } = useWindowDimensions();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState<TouchedState>(EMPTY_TOUCHED);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setForm(toFormState(initialProduct));
    setTouched(EMPTY_TOUCHED);
  }, [initialProduct, visible]);

  const isCompact = width < 720;
  const modalWidth = Math.min(width - (isCompact ? 20 : 48), isCompact ? 560 : 760);
  const modalMaxHeight = Math.max(360, height * 0.88);
  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.onSurfaceVariant;

  const codigoValue = form.codigo.trim();
  const nomeModeloValue = form.nomeModelo.trim();
  const corValue = form.cor.trim();

  const errors = useMemo(
    () => ({
      nomeModelo:
        touched.nomeModelo && !nomeModeloValue ? 'Informe o nome/modelo do produto.' : '',
      cor: touched.cor && !corValue ? 'Informe a cor do produto.' : '',
    }),
    [corValue, nomeModeloValue, touched.cor, touched.nomeModelo]
  );

  const isValid = nomeModeloValue.length > 0 && corValue.length > 0;

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const touchField = (field: keyof FormState) => {
    setTouched((current) => ({
      ...current,
      [field]: true,
    }));
  };

  const handleSubmit = async () => {
    setTouched({
      codigo: true,
      nomeModelo: true,
      cor: true,
      descricao: true,
    });

    if (!isValid || saving) {
      return;
    }

    await onSubmit({
      codigo: codigoValue,
      nomeModelo: nomeModeloValue,
      cor: corValue,
      descricao: form.descricao.trim() || undefined,
    });
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={saving ? undefined : onDismiss}
        contentContainerStyle={styles.modalOuter}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Surface
            style={[
              styles.modalSurface,
              {
                width: modalWidth,
                maxHeight: modalMaxHeight,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerTextWrap}>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  {mode === 'create' ? 'Novo produto' : 'Editar produto'}
                </Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>
                  {mode === 'create'
                    ? 'Preencha os dados para cadastrar um novo produto.'
                    : 'Atualize os dados do produto selecionado.'}
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Fechar modal de produto"
                disabled={saving}
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: pressed ? theme.colors.surfaceVariant : 'transparent',
                    opacity: saving ? 0.45 : 1,
                  },
                ]}
              >
                <Text style={[styles.closeButtonText, { color: theme.colors.primary }]}>Fechar</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={[
                styles.formContent,
                { paddingBottom: isCompact ? 18 : 22 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGrid}>
                <View style={styles.fieldGroup}>
                  <AppTextInput
                    label="Código"
                    value={form.codigo}
                    onChangeText={(value) => updateField('codigo', value)}
                    onBlur={() => touchField('codigo')}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={60}
                    accessibilityLabel="Campo código do produto"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <AppTextInput
                    label="Nome *"
                    value={form.nomeModelo}
                    onChangeText={(value) => updateField('nomeModelo', value)}
                    onBlur={() => touchField('nomeModelo')}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={120}
                    accessibilityLabel="Campo nome do produto"
                  />
                  {errors.nomeModelo ? (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>
                      {errors.nomeModelo}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.fieldGroup}>
                  <AppTextInput
                    label="Cor *"
                    value={form.cor}
                    onChangeText={(value) => updateField('cor', value)}
                    onBlur={() => touchField('cor')}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={100}
                    accessibilityLabel="Campo cor do produto"
                  />
                  {errors.cor ? (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>
                      {errors.cor}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.fieldGroup}>
                  <AppTextInput
                    label="Descrição"
                    value={form.descricao}
                    onChangeText={(value) => updateField('descricao', value)}
                    onBlur={() => touchField('descricao')}
                    multiline
                    numberOfLines={3}
                    accessibilityLabel="Campo descrição do produto"
                  />
                </View>
              </View>
            </ScrollView>

            <View
              style={[
                styles.actions,
                isCompact ? styles.actionsCompact : null,
                { borderTopColor: theme.colors.outline },
              ]}
            >
              <Button
                mode="text"
                onPress={onDismiss}
                disabled={saving}
                contentStyle={styles.secondaryButtonContent}
                labelStyle={{ color: theme.colors.primary, fontWeight: '800' }}
              >
                Cancelar
              </Button>

              <Button
                mode="contained"
                onPress={handleSubmit}
                disabled={!isValid || saving}
                loading={saving}
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
                contentStyle={styles.primaryButtonContent}
                labelStyle={styles.primaryButtonLabel}
              >
                {mode === 'create' ? 'Criar produto' : 'Salvar alterações'}
              </Button>
            </View>
          </Surface>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  modalSurface: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeButton: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  formScroll: {
    flexGrow: 0,
  },
  formContent: {
    paddingHorizontal: 20,
  },
  formGrid: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  actions: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionsCompact: {
    flexDirection: 'column-reverse',
    alignItems: 'stretch',
  },
  secondaryButtonContent: {
    minHeight: 46,
    paddingHorizontal: 8,
  },
  primaryButtonContent: {
    minHeight: 48,
    paddingHorizontal: 10,
  },
  primaryButtonLabel: {
    fontWeight: '800',
  },
});
