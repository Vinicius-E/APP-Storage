import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox, Menu, Text } from 'react-native-paper';
import AppTextInput from '../../../components/AppTextInput';
import FormModalFrame from '../../../components/FormModalFrame';
import { SCREEN_LABELS } from '../../../security/permissions';
import { useThemeContext } from '../../../theme/ThemeContext';
import {
  ProfileDTO,
  ProfileType,
  ProfileUpsertRequest,
  ScreenKey,
} from '../../../types/ProfileDTO';

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
  'ALERTS',
  'MOVEMENTS',
  'REPORTS',
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

  const descriptionValue = form.description.trim();
  const descriptionError =
    touchedDescription && !descriptionValue ? 'Informe a descrição do perfil.' : '';
  const allowedScreensError =
    touchedDescription && form.allowedScreens.length === 0 ? 'Selecione pelo menos uma tela.' : '';
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
    <FormModalFrame
      visible={visible}
      saving={saving}
      title={mode === 'create' ? 'Novo perfil' : 'Editar perfil'}
      subtitle="Configure o tipo e as telas permitidas para este perfil."
      primaryActionLabel={mode === 'create' ? 'Criar perfil' : 'Salvar alterações'}
      primaryActionDisabled={!isValid || saving || !canSubmit}
      primaryActionLoading={saving}
      onDismiss={onDismiss}
      onPrimaryPress={() => {
        void handleSubmit();
      }}
    >
      <View style={styles.formGrid}>
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
                <Text style={[styles.selectValue, { color: theme.colors.text }]}>
                  {typeLabel}
                </Text>{' '}
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
            label="Descrição *"
            value={form.description}
            onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
            onBlur={() => setTouchedDescription(true)}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={80}
            accessibilityLabel="Campo descrição do perfil"
          />
          {descriptionError ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {descriptionError}
            </Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.colors.primary }]}>
            Telas permitidas *
          </Text>

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
});
