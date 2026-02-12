import React, { createContext, useContext, useMemo, useState } from 'react';

type WarehouseSearchContextValue = {
  searchOpen: boolean;
  searchText: string;
  setSearchOpen: (value: boolean) => void;
  setSearchText: (value: string) => void;
  clear: () => void;
  toggle: () => void;

  searchAppliedText: string;
};

const WarehouseSearchContext = createContext<WarehouseSearchContextValue | null>(null);

export const WarehouseSearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchAppliedText, setSearchAppliedText] = useState('');

  const value = useMemo<WarehouseSearchContextValue>(() => {
    const clear = () => {
      setSearchText('');
      setSearchAppliedText('');
      setSearchOpen(false);
    };

    const toggle = () => {
      setSearchOpen((prev) => {
        const next = !prev;
        if (!next) {
          setSearchText('');
          setSearchAppliedText('');
        }
        return next;
      });
    };

    const apply = (text: string) => {
      const t = text.trim();
      if (t.length < 3) {
        setSearchAppliedText('');
        return;
      }
      setSearchAppliedText(t);
    };

    return {
      searchOpen,
      searchText,
      setSearchOpen,
      setSearchText: (text: string) => {
        setSearchText(text);
        apply(text);
      },
      clear,
      toggle,
      searchAppliedText,
    };
  }, [searchOpen, searchText, searchAppliedText]);

  return (
    <WarehouseSearchContext.Provider value={value}>{children}</WarehouseSearchContext.Provider>
  );
};

export const useWarehouseSearch = () => {
  const ctx = useContext(WarehouseSearchContext);
  if (!ctx) {
    throw new Error('useWarehouseSearch must be used within WarehouseSearchProvider');
  }
  return ctx;
};
