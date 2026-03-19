import { useCallback, useEffect, useRef, useState } from 'react';

type BaseReportFilter = {
  page: number;
  size: number;
};

type UseReportQueryOptions<TFilter extends BaseReportFilter, TResponse> = {
  initialFilter: TFilter;
  fetcher: (filter: TFilter) => Promise<TResponse>;
};

export function useReportQuery<TFilter extends BaseReportFilter, TResponse>({
  initialFilter,
  fetcher,
}: UseReportQueryOptions<TFilter, TResponse>) {
  const initialFilterRef = useRef(initialFilter);
  const requestIdRef = useRef(0);
  const [filters, setFilters] = useState<TFilter>(initialFilter);
  const [query, setQuery] = useState<TFilter>(initialFilter);
  const [data, setData] = useState<TResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(
    async (targetQuery: TFilter, refresh = false) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const response = await fetcher(targetQuery);

        if (requestIdRef.current !== requestId) {
          return;
        }

        setData(response);
      } catch (requestError) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar relatório.');
      } finally {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetcher]
  );

  useEffect(() => {
    void fetchData(query);
  }, [fetchData, query]);

  const updateFilter = useCallback((partial: Partial<TFilter>) => {
    setFilters((current) => ({
      ...current,
      ...partial,
    }));
  }, []);

  const applyFilters = useCallback(() => {
    setFilters((current) => {
      const nextQuery = {
        ...current,
        page: 0,
      };
      setQuery(nextQuery);
      return nextQuery;
    });
  }, []);

  const resetFilters = useCallback(() => {
    const resetValue = initialFilterRef.current;
    setFilters(resetValue);
    setQuery(resetValue);
  }, []);

  const updatePage = useCallback((page: number) => {
    setFilters((current) => {
      const nextQuery = {
        ...current,
        page: Math.max(page, 0),
      };
      setQuery(nextQuery);
      return nextQuery;
    });
  }, []);

  const updatePageSize = useCallback((size: number) => {
    setFilters((current) => {
      const nextQuery = {
        ...current,
        size,
        page: 0,
      };
      setQuery(nextQuery);
      return nextQuery;
    });
  }, []);

  const refetch = useCallback(async () => {
    await fetchData(query, true);
  }, [fetchData, query]);

  return {
    filters,
    query,
    data,
    loading,
    refreshing,
    error,
    updateFilter,
    applyFilters,
    resetFilters,
    updatePage,
    updatePageSize,
    refetch,
  };
}
