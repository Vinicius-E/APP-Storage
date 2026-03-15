import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableStateCallbackType,
} from 'react-native';
import ModalFrame from './ModalFrame';
import { Product } from '../../../types/Product';

type HoverablePressableState = PressableStateCallbackType & { hovered?: boolean };

type SelectGradeProductModalProps = {
  visible: boolean;
  title: string;
  search: string;
  quantity: string;
  products: Product[];
  selectedProductId: number | null;
  showQuantityField?: boolean;
  confirmLabel?: string;
  loading?: boolean;
  confirming?: boolean;
  validationMessage?: string | null;
  confirmDisabled?: boolean;
  onSearchChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onSelectProduct: (productId: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  primaryColor: string;
  surfaceColor: string;
  surfaceVariantColor: string;
  outlineColor: string;
  textColor: string;
  secondaryTextColor: string;
};

const IS_WEB = Platform.OS === 'web';

export default function SelectGradeProductModal({
  visible,
  title,
  search,
  quantity,
  products,
  selectedProductId,
  showQuantityField = true,
  confirmLabel = 'Confirmar',
  loading = false,
  confirming = false,
  validationMessage = null,
  confirmDisabled = false,
  onSearchChange,
  onQuantityChange,
  onSelectProduct,
  onClose,
  onConfirm,
  primaryColor,
  surfaceColor,
  surfaceVariantColor,
  outlineColor,
  textColor,
  secondaryTextColor,
}: SelectGradeProductModalProps) {
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
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>

      <View style={styles.searchWrap}>
        <Text style={[styles.label, { color: primaryColor }]}>Produto</Text>
        <View
          style={[
            styles.searchInputWrap,
            {
              backgroundColor: surfaceVariantColor,
              borderColor: outlineColor,
            },
          ]}
        >
          <MaterialCommunityIcons name="magnify" size={18} color={primaryColor} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Filtrar por nome ou Código Wester"
            placeholderTextColor={`${primaryColor}88`}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.searchInput, IS_WEB ? styles.searchInputWeb : null, { color: textColor }]}
          />
        </View>
      </View>

      {showQuantityField ? (
        <View style={styles.searchWrap}>
          <Text style={[styles.label, { color: primaryColor }]}>Quantidade</Text>
          <View
            style={[
              styles.searchInputWrap,
              {
                backgroundColor: surfaceVariantColor,
                borderColor: outlineColor,
              },
            ]}
          >
            <MaterialCommunityIcons name="counter" size={18} color={primaryColor} />
            <TextInput
              value={quantity}
              onChangeText={onQuantityChange}
              placeholder="Informe a quantidade"
              placeholderTextColor={`${primaryColor}88`}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.searchInput, IS_WEB ? styles.searchInputWeb : null, { color: textColor }]}
            />
          </View>
          {validationMessage ? (
            <Text style={[styles.validationText, { color: '#C62828' }]}>{validationMessage}</Text>
          ) : null}
        </View>
      ) : validationMessage ? (
        <Text style={[styles.validationText, styles.validationStandalone, { color: '#C62828' }]}>
          {validationMessage}
        </Text>
      ) : null}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
        ) : products.length === 0 ? (
          <View style={styles.stateWrap}>
            <Text style={[styles.emptyText, { color: secondaryTextColor }]}>
              Nenhum produto ativo encontrado para o filtro informado.
            </Text>
          </View>
        ) : (
          products.map((product) => {
            const selected = selectedProductId === product.id;

            return (
              <Pressable
                key={product.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Selecionar produto ${product.nome}`}
                onPress={() => onSelectProduct(product.id)}
                style={(state) => {
                  const pressed = Boolean(state.pressed);
                  const hovered = Boolean((state as HoverablePressableState).hovered);
                  const active = selected || hovered || pressed;

                  return [
                    styles.option,
                    IS_WEB ? styles.interactiveWeb : null,
                    {
                      backgroundColor: active ? surfaceVariantColor : 'transparent',
                      borderColor: active ? primaryColor : outlineColor,
                      opacity: pressed ? 0.96 : 1,
                      transform: [{ translateY: hovered ? -1 : 0 }],
                    },
                  ];
                }}
              >
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: selected ? primaryColor : textColor }]}>
                    {product.nome}
                  </Text>
                  <Text style={[styles.optionMeta, { color: secondaryTextColor }]}>
                    {product.codigo || '—'}
                  </Text>
                </View>

                {selected ? (
                  <MaterialCommunityIcons name="check" size={18} color={primaryColor} />
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          onPress={onClose}
          disabled={confirming}
          style={[styles.actionButton, { borderColor: outlineColor, opacity: confirming ? 0.6 : 1 }]}
        >
          <Text style={[styles.actionText, { color: textColor }]}>Cancelar</Text>
        </Pressable>

        <Pressable
          onPress={onConfirm}
          disabled={confirmDisabled || confirming}
          style={[
            styles.actionButton,
            {
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              opacity: confirmDisabled || confirming ? 0.6 : 1,
            },
          ]}
        >
          {confirming ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={[styles.actionText, { color: '#ffffff' }]}>{confirmLabel}</Text>
          )}
        </Pressable>
      </View>
    </ModalFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '92%',
    maxWidth: 620,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  searchWrap: {
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  searchInputWrap: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  searchInputWeb:
    IS_WEB
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          borderWidth: 0,
          backgroundColor: 'transparent',
        } as any)
      : ({} as any),
  list: {
    maxHeight: 320,
  },
  listContent: {
    gap: 8,
    paddingRight: 4,
  },
  stateWrap: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  validationText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  validationStandalone: {
    marginBottom: 12,
  },
  option: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    minWidth: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
  },
  interactiveWeb:
    IS_WEB
      ? ({
          transitionProperty: 'transform, box-shadow, background-color, border-color, opacity',
          transitionDuration: '160ms',
          transitionTimingFunction: 'ease-out',
          cursor: 'pointer',
        } as any)
      : ({} as any),
});
