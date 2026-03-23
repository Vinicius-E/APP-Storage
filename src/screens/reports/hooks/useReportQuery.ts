import { useCallback, useEffect, useRef, useState } from 'react';

type BaseReportFilter = {
  page: number;
  size: number;
};

type UseReportQueryOptions<TFilter extends BaseReportFilter, TResponse> = {
  initialFilter: TFilter;
  fetcher: (filter: TFilter) => Promise<TResponse>;
  autoFetch?: boolean;
};

export function useReportQuery<TFilter extends BaseReportFilter, TResponse>({
  initialFilter,
  fetcher,
  autoFetch = true,
}: UseReportQueryOptions<TFilter, TResponse>) {
  const initialFilterRef = useRef(initialFilter);
  const fetcherRef = useRef(fetcher);
  const requestIdRef = useRef(0);
  const [filters, setFilters] = useState<TFilter>(initialFilter);
  const [query, setQuery] = useState<TFilter>(initialFilter);
  const [data, setData] = useState<TResponse | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [hasFetchedOnce, setHasFetchedOnce] = useState(autoFetch);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

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
        const response = await fetcherRef.current(targetQuery);

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
    []
  );

  useEffect(() => {
    if (!hasFetchedOnce) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    void fetchData(query);
  }, [fetchData, hasFetchedOnce, query]);

  const updateFilter = useCallback((partial: Partial<TFilter>) => {
    setFilters((current) => ({
      ...current,
      ...partial,
    }));
  }, []);

  const applyFilters = useCallback(() => {
    setHasFetchedOnce(true);
    setFilters((current) => {
      const nextQuery = {
        ...current,
        page: 0,
      };
      setQuery(nextQuery);
      return nextQuery;
    });
  }, []);

  const resetFilters = useCallback((options?: { fetch?: boolean }) => {
    const shouldFetch = options?.fetch ?? autoFetch;
    const resetValue = initialFilterRef.current;
    setFilters(resetValue);
    setQuery(resetValue);
    setError('');

    if (!shouldFetch) {
      setHasFetchedOnce(false);
      setData(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setHasFetchedOnce(true);
  }, [autoFetch]);

  const updatePage = useCallback((page: number) => {
    setFilters((current) => {
      const nextQuery = {
        ...current,
        page: Math.max(page, 0),
      };
      if (hasFetchedOnce) {
        setQuery(nextQuery);
      }
      return nextQuery;
    });
  }, [hasFetchedOnce]);

  const updatePageSize = useCallback((size: number) => {
    setFilters((current) => {
      const nextQuery = {
        ...current,
        size,
        page: 0,
      };
      if (hasFetchedOnce) {
        setQuery(nextQuery);
      }
      return nextQuery;
    });
  }, [hasFetchedOnce]);

  const refetch = useCallback(async () => {
    if (!hasFetchedOnce) {
      return;
    }
    await fetchData(query, true);
  }, [fetchData, hasFetchedOnce, query]);

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
    hasFetchedOnce,
  };
}
