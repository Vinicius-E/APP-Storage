import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import QuantityStepper from '../../QuantityStepper';
import ModalFrame from './ModalFrame';

type WarehouseItemFormValues = {
  nomeModelo: string;
  quantidade: number;
  codigo: string;
  cor: string;
  descricao: string;
};

type WarehouseItemFormModalProps = {
  visible: boolean;
  title: string;
  values: WarehouseItemFormValues;
  onChangeNomeModelo: (value: string) => void;
  onChangeQuantidade: (value: number) => void;
  onChangeCodigo: (value: string) => void;
  onChangeCor: (value: string) => void;
  onChangeDescricao: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
  submitLoading?: boolean;
  submitDisabled?: boolean;
  closeLabel?: string;
  submitLabel?: string;
  nomeLabel?: string;
  titleNumberOfLines?: number;
  primaryColor: string;
  surfaceColor: string;
  outlineColor: string;
  textColor: string;
};

export default function WarehouseItemFormModal({
  visible,
  title,
  values,
  onChangeNomeModelo,
  onChangeQuantidade,
  onChangeCodigo,
  onChangeCor,
  onChangeDescricao,
  onClose,
  onSubmit,
  loading = false,
  submitLoading = false,
  submitDisabled = false,
  closeLabel = 'Cancelar',
  submitLabel = 'Salvar',
  nomeLabel = 'Nome / Modelo',
  titleNumberOfLines = 2,
  primaryColor,
  surfaceColor,
  outlineColor,
  textColor,
}: WarehouseItemFormModalProps) {
  return (
    <ModalFrame
      visible={visible}
      onRequestClose={onClose}
      containerStyle={[
        styles.container,
        {
          backgroundColor: surfaceColor,
          borderColor: outlineColor,
        },
      ]}
    >
      <Text style={[styles.title, { color: primaryColor }]} numberOfLines={titleNumberOfLines}>
        {title}
      </Text>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
        <>
          <View style={styles.formRow}>
            <Text style={[styles.formLabel, { color: textColor }]}>{nomeLabel}</Text>
            <TextInput
              value={values.nomeModelo}
              onChangeText={onChangeNomeModelo}
              placeholder="Nome / Modelo"
              placeholderTextColor="#888"
              style={[styles.input, { color: textColor, borderColor: outlineColor }]}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={[styles.formLabel, { color: textColor }]}>Quantidade</Text>
            <QuantityStepper
              value={values.quantidade}
              onChange={onChangeQuantidade}
              min={1}
              max={999999}
              step={1}
              borderColor={outlineColor}
              textColor={textColor}
              primaryColor={primaryColor}
              backgroundColor={surfaceColor}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={[styles.formLabel, { color: textColor }]}>Código Wester</Text>
            <TextInput
              value={values.codigo}
              onChangeText={onChangeCodigo}
              placeholder="Código Wester"
              placeholderTextColor="#888"
              disableFullscreenUI
              style={[styles.input, { color: textColor, borderColor: outlineColor }]}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={[styles.formLabel, { color: textColor }]}>Cor</Text>
            <TextInput
              value={values.cor}
              onChangeText={onChangeCor}
              placeholder="Cor"
              placeholderTextColor="#888"
              style={[styles.input, { color: textColor, borderColor: outlineColor }]}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={[styles.formLabel, { color: textColor }]}>Descrição</Text>
            <TextInput
              value={values.descricao}
              onChangeText={onChangeDescricao}
              placeholder="Descrição"
              placeholderTextColor="#888"
              multiline
              style={[styles.textArea, { color: textColor, borderColor: outlineColor }]}
            />
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.actionButton, { borderColor: outlineColor }]}>
              <Text style={[styles.actionText, { color: textColor }]}>{closeLabel}</Text>
            </Pressable>

            <Pressable
              onPress={onSubmit}
              disabled={submitDisabled || submitLoading}
              style={[
                styles.actionButton,
                {
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                  opacity: submitDisabled || submitLoading ? 0.6 : 1,
                },
              ]}
            >
              {submitLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.actionText, { color: '#fff' }]}>{submitLabel}</Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </ModalFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '92%',
    maxWidth: 560,
    maxHeight: '88%',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: 0.4,
    marginBottom: 12,
    textAlign: 'center',
    opacity: 0.92,
  },
  loadingWrap: {
    paddingVertical: 18,
  },
  formRow: {
    paddingVertical: 5,
    gap: 8,
  },
  formLabel: { fontWeight: '700', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  actionButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontWeight: '800' },
});
