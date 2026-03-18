import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox, Text } from 'react-native-paper';
import AppTextInput from '../../../components/AppTextInput';
import FormModalFrame from '../../../components/FormModalFrame';
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
  ativo: boolean;
};

type TouchedState = Record<keyof FormState, boolean>;

const EMPTY_FORM: FormState = {
  codigo: '',
  nomeModelo: '',
  cor: '',
  descricao: '',
  ativo: true,
};

const EMPTY_TOUCHED: TouchedState = {
  codigo: false,
  nomeModelo: false,
  cor: false,
  descricao: false,
  ativo: false,
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
    ativo: product.ativo !== false,
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
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState<TouchedState>(EMPTY_TOUCHED);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setForm(toFormState(initialProduct));
    setTouched(EMPTY_TOUCHED);
  }, [initialProduct, visible]);

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

  const toggleActive = () => {
    if (saving) {
      return;
    }

    setForm((current) => ({
      ...current,
      ativo: !current.ativo,
    }));
  };

  const handleSubmit = async () => {
    setTouched({
      codigo: true,
      nomeModelo: true,
      cor: true,
      descricao: true,
      ativo: true,
    });

    if (!isValid || saving) {
      return;
    }

    await onSubmit({
      codigo: codigoValue,
      nomeModelo: nomeModeloValue,
      cor: corValue,
      descricao: form.descricao.trim() || undefined,
      ativo: mode === 'edit' ? form.ativo : true,
    });
  };

  return (
    <FormModalFrame
      visible={visible}
      saving={saving}
      title={mode === 'create' ? 'Novo produto' : 'Editar produto'}
      subtitle={
        mode === 'create'
          ? 'Preencha os dados para cadastrar um novo produto.'
          : 'Atualize os dados do produto selecionado.'
      }
      primaryActionLabel={mode === 'create' ? 'Criar produto' : 'Salvar alterações'}
      primaryActionDisabled={!isValid || saving}
      primaryActionLoading={saving}
      onDismiss={onDismiss}
      onPrimaryPress={() => {
        void handleSubmit();
      }}
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
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.nomeModelo}</Text>
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
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.cor}</Text>
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

        {mode === 'edit' ? (
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.colors.primary }]}>Status</Text>

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: form.ativo }}
              disabled={saving}
              onPress={toggleActive}
              style={({ pressed }) => [
                styles.statusRow,
                {
                  borderColor: theme.colors.outline,
                  backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
                  opacity: saving ? 0.55 : 1,
                },
              ]}
            >
              <Checkbox
                status={form.ativo ? 'checked' : 'unchecked'}
                onPress={toggleActive}
                disabled={saving}
                color={theme.colors.primary}
              />

              <View style={styles.statusTextWrap}>
                <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                  {form.ativo ? 'Produto ativo' : 'Produto inativo'}
                </Text>
                <Text style={[styles.statusDescription, { color: theme.colors.onSurfaceVariant }]}>
                  {form.ativo
                    ? 'Mantém o produto disponível nas listagens e fluxos de seleção.'
                    : 'Mantém o produto salvo, mas marcado como inativo na aplicação.'}
                </Text>
              </View>
            </Pressable>
          </View>
        ) : null}
      </View>
    </FormModalFrame>
  );
}

const styles = StyleSheet.create({
  formGrid: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusRow: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  statusDescription: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
});
