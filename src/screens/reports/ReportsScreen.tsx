import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import AlertDialog from '../../components/AlertDialog';
import { useAppScreenScrollableLayout } from '../../hooks/useAppScreenScrollableLayout';
import { useThemeContext } from '../../theme/ThemeContext';
import ProductsReportTab from './components/ProductsReportTab';
import StocksReportTab from './components/StocksReportTab';
import StockItemsReportTab from './components/StockItemsReportTab';
import MovementHistoryReportTab from './components/MovementHistoryReportTab';
import { TabButton } from './reportShared';

type ReportsTabKey =
  | 'products'
  | 'stocks'
  | 'stockItems'
  | 'movementHistory';

type FeedbackState = {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
};

const TAB_LABELS: Record<ReportsTabKey, string> = {
  products: 'Produtos',
  stocks: 'Estoques',
  stockItems: 'Itens de estoque',
  movementHistory: 'Histórico',
};

export default function ReportsScreen() {
  const { theme } = useThemeContext();
  const pageBackground =
    (theme.colors as typeof theme.colors & { pageBackground?: string }).pageBackground ??
    theme.colors.background;
  const { width } = useWindowDimensions();
  const reportsScrollableLayout = useAppScreenScrollableLayout(16);
  const isCompact = width < 980;
  const [activeTab, setActiveTab] = useState<ReportsTabKey>('products');
  const [feedback, setFeedback] = useState<FeedbackState>({
    visible: false,
    message: '',
    type: 'success',
  });

  const handleFeedback = (type: FeedbackState['type'], message: string) => {
    setFeedback({
      visible: true,
      type,
      message,
    });
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'stocks':
        return <StocksReportTab isCompact={isCompact} onFeedback={handleFeedback} />;
      case 'stockItems':
        return <StockItemsReportTab isCompact={isCompact} onFeedback={handleFeedback} />;
      case 'movementHistory':
        return <MovementHistoryReportTab isCompact={isCompact} onFeedback={handleFeedback} />;
      case 'products':
      default:
        return <ProductsReportTab isCompact={isCompact} onFeedback={handleFeedback} />;
    }
  };

  return (
    <>
      <View style={[styles.root, { backgroundColor: pageBackground }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            reportsScrollableLayout.contentContainerStyle,
          ]}
          {...reportsScrollableLayout.scrollViewProps}
        >
          <Surface
            style={[
              styles.headerCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
            elevation={0}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerTextWrap}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Relatórios</Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  Consolide indicadores, filtros avançados, gráficos e exportação PDF no mesmo fluxo.
                </Text>
              </View>
            </View>

            <View style={styles.tabsWrap}>
              {(Object.keys(TAB_LABELS) as ReportsTabKey[]).map((tabKey) => (
                <TabButton
                  key={tabKey}
                  label={TAB_LABELS[tabKey]}
                  active={activeTab === tabKey}
                  onPress={() => setActiveTab(tabKey)}
                />
              ))}
            </View>
          </Surface>

          {renderActiveTab()}
        </ScrollView>
      </View>

      <AlertDialog
        visible={feedback.visible}
        message={feedback.message}
        type={feedback.type}
        onDismiss={() => setFeedback((current) => ({ ...current, visible: false }))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 18,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  tabsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
