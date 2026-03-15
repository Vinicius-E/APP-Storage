import { Platform, StyleSheet } from 'react-native';

const IS_WEB = Platform.OS === 'web';

const listScreenStyles = StyleSheet.create({
  toolbarSurface: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 16,
    overflow: 'visible',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  toolbarSurfaceRaised: {
    zIndex: 220,
    elevation: 10,
  },
  toolbarSurfaceDesktop: {
    borderRadius: 24,
    padding: 20,
    gap: 18,
  },
  toolbarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    overflow: 'visible',
  },
  toolbarTopCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  searchFieldWrap: {
    flex: 1,
    minWidth: 0,
  },
  toolbarActions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  toolbarActionsCompact: {
    width: '100%',
    marginLeft: 0,
    justifyContent: 'flex-start',
  },
  toolbarBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    overflow: 'visible',
  },
  toolbarBottomCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  filtersRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'visible',
    position: 'relative',
    zIndex: 40,
    flexWrap: IS_WEB ? 'nowrap' : 'wrap',
  },
  filtersRowCompact: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  paginationGroup: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  paginationGroupCompact: {
    width: '100%',
    marginLeft: 0,
    alignItems: 'stretch',
  },
  paginationSummaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  paginationControlsNoWrap: {
    flexWrap: 'nowrap',
    gap: 10,
  },
  paginationPageLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
});

export default listScreenStyles;
