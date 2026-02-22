import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import ModalFrame from './ModalFrame';

export type SearchResultItem = {
  nivelId: number;
  nomeModelo: string;
  codigo: string;
  cor: string;
  descricao: string;
  quantidade: number;
  label: string;
};

type SearchResultsModalProps = {
  visible: boolean;
  searchEnabled: boolean;
  query: string;
  results: SearchResultItem[];
  surfaceColor: string;
  outlineColor: string;
  backgroundColor: string;
  primaryColor: string;
  textColor: string;
  onClose: () => void;
  onSelect: (result: SearchResultItem) => void;
};

export default function SearchResultsModal({
  visible,
  searchEnabled,
  query,
  results,
  surfaceColor,
  outlineColor,
  backgroundColor,
  primaryColor,
  textColor,
  onClose,
  onSelect,
}: SearchResultsModalProps) {
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
      <View style={styles.header}>
        <Text style={[styles.title, { color: primaryColor }]}>Resultados</Text>
        <Pressable onPress={onClose} style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}>
          <AntDesign name="close" size={18} color={primaryColor} />
        </Pressable>
      </View>

      {searchEnabled ? (
        <Text style={[styles.subtitle, { color: primaryColor }]}>
          {`${results.length} encontrado(s) para "${query.trim()}"`}
        </Text>
      ) : null}

      <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
        {results.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: primaryColor }]}>Nenhum resultado.</Text>
          </View>
        ) : (
          results.map((result) => (
            <Pressable
              key={result.nivelId}
              onPress={() => onSelect(result)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: outlineColor, backgroundColor },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={styles.rowBody}>
                <Text style={[styles.rowTitle, { color: textColor }]} numberOfLines={1}>
                  {result.nomeModelo !== '' ? result.nomeModelo : '(Sem nome)'}{' '}
                  {result.codigo !== '' ? `(${result.codigo})` : ''}
                </Text>
                <Text style={[styles.rowMeta, { color: textColor }]} numberOfLines={1}>
                  {result.label}
                </Text>
                <Text style={[styles.rowMeta, { color: textColor }]} numberOfLines={1}>
                  {result.cor !== '' ? `Cor: ${result.cor}` : 'Cor: -'}{' '}
                  {result.descricao !== '' ? ` - ${result.descricao}` : ''}
                </Text>
              </View>

              <View style={styles.rowRight}>
                <Text style={[styles.rowQty, { color: primaryColor }]}>{result.quantidade}</Text>
                <AntDesign name="caret-right" size={16} color={primaryColor} />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable onPress={onClose} style={[styles.button, { borderColor: outlineColor }]}>
          <Text style={[styles.buttonText, { color: textColor }]}>Fechar</Text>
        </Pressable>
      </View>
    </ModalFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '92%',
    maxWidth: 720,
    maxHeight: '88%',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.92,
    marginBottom: 10,
  },
  iconButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsList: {
    maxHeight: 420,
  },
  emptyWrap: {
    paddingVertical: 18,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    opacity: 0.9,
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  rowMeta: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.9,
  },
  rowRight: {
    minWidth: 56,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  rowQty: {
    fontSize: 16,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '700',
  },
});
