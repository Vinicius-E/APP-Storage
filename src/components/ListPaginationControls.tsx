import React from 'react';
import { StyleProp, TextStyle, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import ListActionButton from './ListActionButton';
import listScreenStyles from '../styles/listScreen';

type ListPaginationControlsProps = {
  summary: string;
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  compact?: boolean;
  noWrap?: boolean;
  textColor: string;
  textSecondary: string;
  style?: StyleProp<ViewStyle>;
  controlsStyle?: StyleProp<ViewStyle>;
  summaryStyle?: StyleProp<TextStyle>;
};

export default function ListPaginationControls({
  summary,
  page,
  totalPages,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
  compact = false,
  noWrap = false,
  textColor,
  textSecondary,
  style,
  controlsStyle,
  summaryStyle,
}: ListPaginationControlsProps) {
  const totalPagesLabel = Math.max(totalPages, 1);
  const currentPageLabel = Math.min(page + 1, totalPagesLabel);

  return (
    <View
      style={[
        listScreenStyles.paginationGroup,
        compact ? listScreenStyles.paginationGroupCompact : null,
        style,
      ]}
    >
      <Text
        style={[
          listScreenStyles.paginationSummaryText,
          { color: textSecondary },
          summaryStyle,
        ]}
      >
        {summary}
      </Text>

      <View
        style={[
          listScreenStyles.paginationControls,
          noWrap ? listScreenStyles.paginationControlsNoWrap : null,
          controlsStyle,
        ]}
      >
        <ListActionButton
          label="Anterior"
          icon="chevron-left"
          onPress={onPrevious}
          disabled={previousDisabled}
          compact
        />

        <Text style={[listScreenStyles.paginationPageLabel, { color: textColor }]}>
          Página {currentPageLabel} de {totalPagesLabel}
        </Text>

        <ListActionButton
          label="Próxima"
          icon="chevron-right"
          onPress={onNext}
          disabled={nextDisabled}
          compact
        />
      </View>
    </View>
  );
}
