import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { listAreas } from '../services/areaApi';
import { AreaDTO } from '../types/Area';

type AreaContextValue = {
  areas: AreaDTO[];
  selectedAreaId: number | null;
  selectedAreaName: string;
  selectedArea: AreaDTO | null;
  isLoading: boolean;
  refreshAreas: () => Promise<void>;
  selectAreaById: (areaId: number) => Promise<void>;
};

const AREA_STORAGE_KEY = '@storage-system/selected-area-id';
const AreaContext = createContext<AreaContextValue | null>(null);

export function AreaProvider({ children }: { children: React.ReactNode }) {
  const [areas, setAreas] = useState<AreaDTO[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySelection = useCallback(
    async (nextAreas: AreaDTO[], preferredAreaId?: number | null) => {
      const activeAreas = nextAreas.filter((area) => area.active !== false);
      const targetId = preferredAreaId ?? selectedAreaId;
      const matched =
        activeAreas.find((area) => area.id === targetId) ??
        activeAreas[0] ??
        nextAreas.find((area) => area.id === targetId) ??
        nextAreas[0] ??
        null;

      const nextSelectedId = matched?.id ?? null;
      setSelectedAreaId(nextSelectedId);

      if (nextSelectedId === null) {
        await AsyncStorage.removeItem(AREA_STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(AREA_STORAGE_KEY, String(nextSelectedId));
      }
    },
    [selectedAreaId]
  );

  const refreshAreas = useCallback(async () => {
    setIsLoading(true);

    try {
      const savedAreaIdRaw = await AsyncStorage.getItem(AREA_STORAGE_KEY);
      const savedAreaId =
        savedAreaIdRaw && !Number.isNaN(Number(savedAreaIdRaw)) ? Number(savedAreaIdRaw) : null;

      const response = await listAreas({
        page: 0,
        size: 100,
      });

      const nextAreas = Array.isArray(response.items) ? response.items : [];
      setAreas(nextAreas);
      await applySelection(nextAreas, savedAreaId);
    } finally {
      setIsLoading(false);
    }
  }, [applySelection]);

  const selectAreaById = useCallback(
    async (areaId: number) => {
      const target = areas.find((area) => area.id === areaId && area.active !== false);
      if (!target) {
        return;
      }

      setSelectedAreaId(target.id);
      await AsyncStorage.setItem(AREA_STORAGE_KEY, String(target.id));
    },
    [areas]
  );

  useEffect(() => {
    void refreshAreas();
  }, [refreshAreas]);

  const selectedArea = useMemo(
    () => areas.find((area) => area.id === selectedAreaId) ?? null,
    [areas, selectedAreaId]
  );

  const value = useMemo<AreaContextValue>(
    () => ({
      areas,
      selectedAreaId,
      selectedAreaName: selectedArea?.name ?? '',
      selectedArea,
      isLoading,
      refreshAreas,
      selectAreaById,
    }),
    [areas, isLoading, refreshAreas, selectAreaById, selectedArea, selectedAreaId]
  );

  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>;
}

export function useAreaContext() {
  const context = useContext(AreaContext);

  if (!context) {
    throw new Error('useAreaContext must be used within AreaProvider');
  }

  return context;
}
