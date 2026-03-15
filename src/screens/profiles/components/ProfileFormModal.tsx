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
import { Button, Checkbox, Menu, Modal, Portal, Surface, Text } from 'react-native-paper';
import AppTextInput from '../../../components/AppTextInput';
import { SCREEN_LABELS } from '../../../security/permissions';
import { useThemeContext } from '../../../theme/ThemeContext';
import { ProfileDTO, ProfileType, ProfileUpsertRequest, ScreenKey } from '../../../types/ProfileDTO';

type ProfileFormModalProps = {
  visible: boolean;
  mode: 'create' | 'edit';
  initialProfile?: ProfileDTO | null;
  saving: boolean;
  canSubmit: boolean;
  onDismiss: () => void;
  onSubmit: (payload: ProfileUpsertRequest) => Promise<void> | void;
};

type FormState = {
  type: ProfileType;
  description: string;
  allowedScreens: ScreenKey[];
};

const SCREEN_OPTIONS: ScreenKey[] = [
  'DASHBOARD',
  'WAREHOUSE',
  'PRODUCTS',
  'USERS',
  'HISTORY',
  'PROFILES',
];

const EMPTY_FORM: FormState = {
  type: 'FULL_ACCESS',
  description: '',
  allowedScreens: [],
};

function toFormState(profile?: ProfileDTO | null): FormState {
  if (!profile) {
    return EMPTY_FORM;
  }

  return {
    type: profile.type,
    description: profile.description,
    allowedScreens: [...profile.allowedScreens],
  };
}

export default function ProfileFormModal({
  visible,
  mode,
  initialProfile,
  saving,
  canSubmit,
  onDismiss,
  onSubmit,
}: ProfileFormModalProps) {
  const { theme } = useThemeContext();
  const { width, height } = useWindowDimensions();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touchedDescription, setTouchedDescription] = useState(false);
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setForm(toFormState(initialProfile));
    setTouchedDescription(false);
    setTypeMenuVisible(false);
  }, [initialProfile, visible]);

  const isCompact = width < 720;
  const modalWidth = Math.min(width - (isCompact ? 20 : 48), isCompact ? 560 : 760);
  const modalMaxHeight = Math.max(360, height * 0.88);
  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.onSurfaceVariant;
  const descriptionValue = form.description.trim();
  const descriptionError =
    touchedDescription && !descriptionValue ? 'Informe a descricao do perfil.' : '';
  const allowedScreensError =
    touchedDescription && form.allowedScreens.length === 0
      ? 'Selecione pelo menos uma tela.'
      : '';
  const isValid = descriptionValue.length > 0 && form.allowedScreens.length > 0;

  const typeLabel = useMemo(
    () => (form.type === 'READ_ONLY' ? 'Leitura' : 'Acesso total'),
    [form.type]
  );

  const toggleScreen = (screenKey: ScreenKey) => {
    setForm((current) => {
      const exists = current.allowedScreens.includes(screenKey);

      return {
        ...current,
        allowedScreens: exists
          ? current.allowedScreens.filter((item) => item !== screenKey)
          : [...current.allowedScreens, screenKey],
      };
    });
  };

  const handleSubmit = async () => {
    setTouchedDescription(true);

    if (!isValid || saving || !canSubmit) {
      return;
    }

    await onSubmit({
      type: form.type,
      description: descriptionValue,
      allowedScreens: form.allowedScreens,
      active: initialProfile?.active !== false,
    });
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={saving ? undefined : onDismiss} contentContainerStyle={styles.modalOuter}>
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
                  {mode === 'create' ? 'Novo perfil' : 'Editar perfil'}
                </Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>
                  Configure o tipo e as telas permitidas para este perfil.
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Fechar modal de perfil"
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
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.colors.primary }]}>Tipo *</Text>
                <Menu
                  visible={typeMenuVisible}
                  onDismiss={() => setTypeMenuVisible(false)}
                  anchor={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Selecionar tipo de perfil"
                      disabled={!canSubmit || saving}
                      onPress={() => setTypeMenuVisible(true)}
                      style={({ pressed }) => [
                        styles.selectTrigger,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor:
                            typeMenuVisible || pressed ? theme.colors.primary : theme.colors.outline,
                          opacity: !canSubmit || saving ? 0.55 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.selectValue, { color: theme.colors.text }]}>{typeLabel}</Text>
                      <Text style={[styles.selectChevron, { color: theme.colors.primary }]}>
                        {typeMenuVisible ? '˄' : '˅'}
                      </Text>
                    </Pressable>
                  }
                  contentStyle={{
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.outline,
                  }}
                >
                  <Menu.Item
                    onPress={() => {
                      setTypeMenuVisible(false);
                      setForm((current) => ({ ...current, type: 'FULL_ACCESS' }));
                    }}
                    title="Acesso total"
                    leadingIcon={form.type === 'FULL_ACCESS' ? 'check' : undefined}
                  />
                  <Menu.Item
                    onPress={() => {
                      setTypeMenuVisible(false);
                      setForm((current) => ({ ...current, type: 'READ_ONLY' }));
                    }}
                    title="Leitura"
                    leadingIcon={form.type === 'READ_ONLY' ? 'check' : undefined}
                  />
                </Menu>
              </View>

              <View style={styles.fieldGroup}>
                <AppTextInput
                  label="Descricao *"
                  value={form.description}
                  onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
                  onBlur={() => setTouchedDescription(true)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={80}
                  accessibilityLabel="Campo descricao do perfil"
                />
                {descriptionError ? (
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>{descriptionError}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.colors.primary }]}>Telas permitidas *</Text>

                <View
                  style={[
                    styles.checkboxList,
                    {
                      borderColor: theme.colors.outline,
                      backgroundColor: theme.colors.surfaceVariant,
                    },
                  ]}
                >
                  {SCREEN_OPTIONS.map((screenKey) => {
                    const checked = form.allowedScreens.includes(screenKey);

                    return (
                      <Pressable
                        key={screenKey}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                        disabled={!canSubmit || saving}
                        onPress={() => toggleScreen(screenKey)}
                        style={({ pressed }) => [
                          styles.checkboxRow,
                          {
                            backgroundColor: pressed ? theme.colors.surface : 'transparent',
                            opacity: !canSubmit || saving ? 0.55 : 1,
                          },
                        ]}
                      >
                        <Checkbox
                          status={checked ? 'checked' : 'unchecked'}
                          onPress={() => toggleScreen(screenKey)}
                          disabled={!canSubmit || saving}
                          color={theme.colors.primary}
                        />
                        <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                          {SCREEN_LABELS[screenKey]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {allowedScreensError ? (
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>
                    {allowedScreensError}
                  </Text>
                ) : null}
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
                disabled={!isValid || saving || !canSubmit}
                loading={saving}
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
                contentStyle={styles.primaryButtonContent}
                labelStyle={styles.primaryButtonLabel}
              >
                {mode === 'create' ? 'Criar perfil' : 'Salvar alteracoes'}
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
    paddingBottom: 20,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  selectTrigger: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
  },
  selectChevron: {
    fontSize: 18,
    fontWeight: '800',
  },
  checkboxList: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
  },
  checkboxRow: {
    minHeight: 46,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
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
