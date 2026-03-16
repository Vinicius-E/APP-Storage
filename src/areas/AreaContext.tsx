import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { listAreas } from '../services/areaApi';
import { AreaDTO } from '../types/Area';

type AreaContextValue = {
  areas: AreaDTO[];
  selectedAreaId: number | null;
  selectedAreaName: string;
  isLoading: boolean;
  refreshAreas: (preferredAreaId?: number | null) => Promise<void>;
  selectAreaById: (areaId: number) => Promise<void>;
  selectArea: (area: AreaDTO | null) => Promise<void>;
};

const SELECTED_AREA_STORAGE_KEY = '@storage-system/selected-area-id';
const AreaContext = createContext<AreaContextValue | null>(null);

function resolveDefaultArea(areas: AreaDTO[], preferredAreaId?: number | null): AreaDTO | null {
  if (areas.length === 0) {
    return null;
  }

  if (preferredAreaId != null) {
    const preferredActiveArea = areas.find(
      (area) => area.id === preferredAreaId && area.active !== false
    );
    if (preferredActiveArea) {
      return preferredActiveArea;
    }

    const preferredArea = areas.find((area) => area.id === preferredAreaId);
    if (preferredArea) {
      return preferredArea;
    }
  }

  return areas.find((area) => area.active !== false) ?? areas[0] ?? null;
}

export function AreaProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isRestoring } = useAuth();
  const [areas, setAreas] = useState<AreaDTO[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [selectedAreaName, setSelectedAreaName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const persistSelection = useCallback(async (area: AreaDTO | null) => {
    if (!area) {
      await AsyncStorage.removeItem(SELECTED_AREA_STORAGE_KEY);
      setSelectedAreaId(null);
      setSelectedAreaName('');
      return;
    }

    await AsyncStorage.setItem(SELECTED_AREA_STORAGE_KEY, String(area.id));
    setSelectedAreaId(area.id);
    setSelectedAreaName(area.name);
  }, []);

  const selectArea = useCallback(
    async (area: AreaDTO | null) => {
      await persistSelection(area);
    },
    [persistSelection]
  );

  const clearAreaState = useCallback(async () => {
    setAreas([]);
    await persistSelection(null);
  }, [persistSelection]);

  const selectAreaById = useCallback(
    async (areaId: number) => {
      const area = areas.find((item) => item.id === areaId) ?? null;

      await persistSelection(area);
    },
    [areas, persistSelection]
  );

  const refreshAreas = useCallback(
    async (preferredAreaId?: number | null) => {
      if (!isAuthenticated) {
        await clearAreaState();
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const response = await listAreas({ page: 0, size: 100 });
        const nextAreas = Array.isArray(response.items) ? response.items : [];
        setAreas(nextAreas);

        const nextSelected = resolveDefaultArea(nextAreas, preferredAreaId ?? selectedAreaId);
        await persistSelection(nextSelected);
      } catch (error) {
        await clearAreaState();
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [clearAreaState, isAuthenticated, persistSelection, selectedAreaId]
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (isRestoring) {
        return;
      }

      if (!isAuthenticated) {
        await clearAreaState();
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      try {
        const storedIdRaw = await AsyncStorage.getItem(SELECTED_AREA_STORAGE_KEY);
        const storedId = storedIdRaw != null ? Number(storedIdRaw) : null;
        const preferredAreaId = Number.isFinite(storedId) ? storedId : null;

        const response = await listAreas({ page: 0, size: 100 });
        if (cancelled) {
          return;
        }

        const nextAreas = Array.isArray(response.items) ? response.items : [];
        setAreas(nextAreas);

        const nextSelected = resolveDefaultArea(nextAreas, preferredAreaId);
        await persistSelection(nextSelected);
      } catch (error) {
        if (!cancelled) {
          await clearAreaState();
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [clearAreaState, isAuthenticated, isRestoring, persistSelection]);

  const value = useMemo<AreaContextValue>(
    () => ({
      areas,
      selectedAreaId,
      selectedAreaName,
      isLoading,
      refreshAreas,
      selectAreaById,
      selectArea,
    }),
    [areas, isLoading, refreshAreas, selectArea, selectAreaById, selectedAreaId, selectedAreaName]
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
