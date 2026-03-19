import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import AppEmptyState from '../../components/AppEmptyState';
import AppLoadingState from '../../components/AppLoadingState';
import { useThemeContext } from '../../theme/ThemeContext';
import { ReportChartPointDTO } from '../../types/Report';

export type SelectOption = {
  value: string;
  label: string;
};

export const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: '10', label: '10 / página' },
  { value: '20', label: '20 / página' },
  { value: '50', label: '50 / página' },
];

export const SORT_DIRECTION_OPTIONS: SelectOption[] = [
  { value: 'desc', label: 'Decrescente' },
  { value: 'asc', label: 'Crescente' },
];

export function withAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const hexAlpha = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');

  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const expanded = color.replace(
      /^#(.)(.)(.)$/i,
      (_match, red: string, green: string, blue: string) =>
        `#${red}${red}${green}${green}${blue}${blue}`
    );
    return `${expanded}${hexAlpha}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return `${color}${hexAlpha}`;
  }

  return color;
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('pt-BR');
}

export function formatNumber(value?: number | null): string {
  return new Intl.NumberFormat('pt-BR').format(value ?? 0);
}

export function formatBooleanStatus(value: boolean): string {
  return value ? 'Ativo' : 'Inativo';
}

export function normalizeFilterValue(value?: string | null): string {
  return String(value ?? '').trim();
}

export function buildAppliedFilters(
  filters: Array<{ label: string; value?: string | null }>
): Array<{ label: string; value: string }> {
  return filters
    .map((filter) => ({
      label: filter.label,
      value: normalizeFilterValue(filter.value),
    }))
    .filter((filter) => filter.value.length > 0);
}

export function SectionState({
  loading,
  error,
  emptyTitle,
  emptyDescription,
  loadingMessage,
  onRetry,
}: {
  loading: boolean;
  error: string;
  emptyTitle: string;
  emptyDescription: string;
  loadingMessage: string;
  onRetry: () => void;
}) {
  if (loading) {
    return <AppLoadingState message={loadingMessage} style={styles.stateBlock} />;
  }

  if (error) {
    return (
      <AppEmptyState
        title="Não foi possível carregar o relatório"
        description={error}
        icon="alert-circle-outline"
        tone="error"
        onRetry={onRetry}
        style={styles.stateBlock}
      />
    );
  }

  return (
    <AppEmptyState
      title={emptyTitle}
      description={emptyDescription}
      icon="chart-box-outline"
      tipo="semResultado"
      style={styles.stateBlock}
    />
  );
}

export function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { theme } = useThemeContext();
  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.onSurfaceVariant;

  return (
    <Surface
      style={[
        styles.metricCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
      elevation={0}
    >
      <Text style={[styles.metricLabel, { color: textSecondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.colors.text }]}>{value}</Text>
    </Surface>
  );
}

export function ChartCard({
  title,
  points,
}: {
  title: string;
  points: ReportChartPointDTO[];
}) {
  const { theme } = useThemeContext();
  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.onSurfaceVariant;
  const visiblePoints = points.filter((point) => point.value > 0).slice(0, 6);
  const maxValue = Math.max(...visiblePoints.map((point) => point.value), 1);

  return (
    <Surface
      style={[
        styles.chartCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
      elevation={0}
    >
      <Text style={[styles.chartTitle, { color: theme.colors.text }]}>{title}</Text>

      {visiblePoints.length === 0 ? (
        <Text style={[styles.chartEmptyText, { color: textSecondary }]}>
          Sem dados suficientes para exibir este gráfico.
        </Text>
      ) : (
        visiblePoints.map((point) => {
          const widthPercent = Math.max((point.value / maxValue) * 100, 4);
          const barColor = point.color ?? theme.colors.primary;

          return (
            <View key={`${title}-${point.label}`} style={styles.chartRow}>
              <View style={styles.chartRowHeader}>
                <Text
                  numberOfLines={1}
                  style={[styles.chartLabel, { color: theme.colors.text }]}
                >
                  {point.label}
                </Text>
                <Text style={[styles.chartValue, { color: textSecondary }]}>
                  {point.formattedValue}
                </Text>
              </View>
              <View
                style={[
                  styles.chartTrack,
                  { backgroundColor: withAlpha(theme.colors.primary, 0.1) },
                ]}
              >
                <View
                  style={[
                    styles.chartBar,
                    {
                      width: `${widthPercent}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })
      )}
    </Surface>
  );
}

export function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useThemeContext();
  const webStyle =
    Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          transitionProperty: 'transform, background-color, border-color, opacity',
          transitionDuration: '160ms',
          transitionTimingFunction: 'ease-out',
        } as any)
      : null;

  return (
    <Pressable
      onPress={onPress}
      style={(state: any) => [
        styles.tabButton,
        webStyle,
        {
          backgroundColor: active
            ? withAlpha(theme.colors.primary, 0.14)
            : state.hovered || state.pressed
              ? withAlpha(theme.colors.primary, 0.08)
              : theme.colors.surface,
          borderColor: active ? theme.colors.primary : theme.colors.outline,
          opacity: state.pressed ? 0.96 : 1,
          transform: [{ translateY: state.hovered ? -1 : 0 }],
        },
      ]}
    >
      <Text
        style={[
          styles.tabButtonText,
          { color: active ? theme.colors.primary : theme.colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stateBlock: {
    minHeight: 220,
    justifyContent: 'center',
  },
  metricCard: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  chartCard: {
    flex: 1,
    minWidth: 260,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  chartEmptyText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  chartRow: {
    gap: 6,
  },
  chartRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  chartLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  chartValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    borderRadius: 999,
  },
  tabButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
