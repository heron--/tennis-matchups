import { createContext, useContext } from 'react';
import type { AppStateHandle } from './useAppState';

export const AppContext = createContext<AppStateHandle | null>(null);

export function useApp(): AppStateHandle {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppContext.Provider');
  return ctx;
}
