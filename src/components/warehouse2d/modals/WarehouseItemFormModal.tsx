import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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
  onChangeQuantidade: (value: number) => void;
  onSelectProduct: () => void;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
  submitLoading?: boolean;
  submitDisabled?: boolean;
  closeLabel?: string;
  submitLabel?: string;
  productActionLabel?: string;
  titleNumberOfLines?: number;
  primaryColor: string;
  surfaceColor: string;
  outlineColor: string;
  textColor: string;
  secondaryTextColor?: string;
};

function renderValue(value: string, fallback = 'Nao informado') {
  const normalized = value.trim();
  return normalized !== '' ? normalized : fallback;
}

export default function WarehouseItemFormModal({
  visible,
  title,
  values,
  onChangeQuantidade,
  onSelectProduct,
  onClose,
  onSubmit,
  loading = false,
  submitLoading = false,
  submitDisabled = false,
  closeLabel = 'Cancelar',
  submitLabel = 'Salvar',
  productActionLabel,
  titleNumberOfLines = 2,
  primaryColor,
  surfaceColor,
  outlineColor,
  textColor,
  secondaryTextColor,
}: WarehouseItemFormModalProps) {
  const secondaryColor = secondaryTextColor ?? `${textColor}99`;
  const hasSelectedProduct = values.nomeModelo.trim() !== '';
  const resolvedProductActionLabel =
    productActionLabel ?? (hasSelectedProduct ? 'Trocar produto' : 'Selecionar produto');

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
            <Text style={[styles.formLabel, { color: textColor }]}>Produto vinculado</Text>

            <View
              style={[
                styles.productCard,
                {
                  backgroundColor: surfaceColor,
                  borderColor: outlineColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.productTitle,
                  { color: hasSelectedProduct ? textColor : secondaryColor },
                  !hasSelectedProduct && styles.productTitleEmpty,
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {hasSelectedProduct ? values.nomeModelo : 'Nenhum produto selecionado'}
              </Text>

              <Pressable
                onPress={onSelectProduct}
                style={[
                  styles.productPickerButton,
                  {
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}10`,
                  },
                ]}
              >
                <Text style={[styles.productPickerText, { color: primaryColor }]}>
                  {resolvedProductActionLabel}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.detailColumn}>
              <Text style={[styles.formLabel, { color: textColor }]}>Codigo Wester</Text>
              <View
                style={[
                  styles.readOnlyField,
                  {
                    backgroundColor: surfaceColor,
                    borderColor: outlineColor,
                  },
                ]}
              >
                <Text style={[styles.readOnlyValue, { color: textColor }]} numberOfLines={2}>
                  {renderValue(values.codigo)}
                </Text>
              </View>
            </View>

            <View style={styles.detailColumn}>
              <Text style={[styles.formLabel, { color: textColor }]}>Cor</Text>
              <View
                style={[
                  styles.readOnlyField,
                  {
                    backgroundColor: surfaceColor,
                    borderColor: outlineColor,
                  },
                ]}
              >
                <Text style={[styles.readOnlyValue, { color: textColor }]} numberOfLines={2}>
                  {renderValue(values.cor)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.formRow}>
            <Text style={[styles.formLabel, { color: textColor }]}>Descricao</Text>
            <View
              style={[
                styles.readOnlyField,
                styles.descriptionField,
                {
                  backgroundColor: surfaceColor,
                  borderColor: outlineColor,
                },
              ]}
            >
              <Text
                style={[styles.readOnlyValue, styles.descriptionValue, { color: textColor }]}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                {renderValue(values.descricao)}
              </Text>
            </View>
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
    maxWidth: 580,
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
  formLabel: {
    fontWeight: '700',
    fontSize: 13,
  },
  productCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  productTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  productTitleEmpty: {
    fontStyle: 'italic',
    fontWeight: '600',
  },
  productPickerButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  productPickerText: {
    fontSize: 13,
    fontWeight: '800',
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  detailColumn: {
    flex: 1,
    gap: 8,
  },
  readOnlyField: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  readOnlyValue: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  descriptionField: {
    minHeight: 84,
    justifyContent: 'flex-start',
  },
  descriptionValue: {
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontWeight: '800',
  },
});
