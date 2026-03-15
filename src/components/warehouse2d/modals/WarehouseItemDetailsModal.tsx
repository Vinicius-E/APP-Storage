import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import ModalFrame from './ModalFrame';

type WarehouseItemDetails = {
  nomeModelo: string;
  codigo: string;
  cor: string;
  descricao: string;
  quantidade: number;
};

type WarehouseItemDetailsModalProps = {
  visible: boolean;
  title: string;
  details: WarehouseItemDetails;
  empty: boolean;
  loading?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onMoveStock?: () => void;
  onAddProduct?: () => void;
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

export default function WarehouseItemDetailsModal({
  visible,
  title,
  details,
  empty,
  loading = false,
  onClose,
  onEdit,
  onMoveStock,
  onAddProduct,
  primaryColor,
  surfaceColor,
  outlineColor,
  textColor,
  secondaryTextColor,
}: WarehouseItemDetailsModalProps) {
  const secondaryColor = secondaryTextColor ?? `${textColor}99`;

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
      <Text style={[styles.title, { color: primaryColor }]} numberOfLines={2}>
        {title}
      </Text>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : empty ? (
        <>
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: surfaceColor,
                borderColor: outlineColor,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: textColor }]}>Nivel vazio</Text>
            <Text style={[styles.emptyDescription, { color: secondaryColor }]}>
              Este nivel nao possui produto vinculado no momento.
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.actionButton, { borderColor: outlineColor }]}>
              <Text style={[styles.actionText, { color: textColor }]}>Fechar</Text>
            </Pressable>

            {onAddProduct ? (
              <Pressable
                onPress={onAddProduct}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                  },
                ]}
              >
                <Text style={[styles.actionText, { color: '#fff' }]}>Adicionar produto</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={[styles.label, { color: secondaryColor }]}>Nome / Modelo</Text>
              <Text style={[styles.valueTitle, { color: textColor }]}>{renderValue(details.nomeModelo)}</Text>
            </View>

            <View style={styles.metaGrid}>
              <View style={styles.metaColumn}>
                <Text style={[styles.label, { color: secondaryColor }]}>Codigo Wester</Text>
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
                    {renderValue(details.codigo)}
                  </Text>
                </View>
              </View>

              <View style={styles.metaColumn}>
                <Text style={[styles.label, { color: secondaryColor }]}>Cor</Text>
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
                    {renderValue(details.cor)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: secondaryColor }]}>Descricao</Text>
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
                  {renderValue(details.descricao)}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: secondaryColor }]}>Quantidade atual</Text>
              <View
                style={[
                  styles.readOnlyField,
                  {
                    backgroundColor: surfaceColor,
                    borderColor: outlineColor,
                  },
                ]}
              >
                <Text style={[styles.quantityValue, { color: textColor }]}>
                  {Number.isFinite(details.quantidade) ? details.quantidade : 0}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsWrap}>
            <View style={styles.actions}>
              <Pressable
                onPress={onClose}
                style={[styles.actionButton, { borderColor: outlineColor }]}
              >
                <Text style={[styles.actionText, { color: textColor }]}>Fechar</Text>
              </Pressable>

              {onMoveStock ? (
                <Pressable
                  onPress={onMoveStock}
                  style={[styles.actionButton, { borderColor: outlineColor }]}
                >
                  <Text style={[styles.actionText, { color: textColor }]}>Movimentar estoque</Text>
                </Pressable>
              ) : null}

              {onEdit ? (
                <Pressable
                  onPress={onEdit}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: primaryColor,
                      borderColor: primaryColor,
                    },
                  ]}
                >
                  <Text style={[styles.actionText, { color: '#fff' }]}>Editar</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </>
      )}
    </ModalFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '92%',
    maxWidth: 620,
    maxHeight: '88%',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: 0.3,
    marginBottom: 14,
    textAlign: 'center',
  },
  loadingWrap: {
    paddingVertical: 24,
  },
  content: {
    gap: 14,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  valueTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metaColumn: {
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
  quantityValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  emptyState: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  actionsWrap: {
    marginTop: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontWeight: '800',
  },
});
