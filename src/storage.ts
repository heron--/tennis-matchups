import type { AppState } from './types';

const STORAGE_KEY = 'tennis-matchups-state';

const DEFAULT_STATE: AppState = {
  players: [],
  matches: [],
  tournaments: [],
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    // Basic shape validation
    if (
      Array.isArray(parsed.players) &&
      Array.isArray(parsed.matches) &&
      Array.isArray(parsed.tournaments)
    ) {
      return parsed as AppState;
    }
    return DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function encodeState(state: AppState): string {
  return btoa(encodeURIComponent(JSON.stringify(state)));
}

export function decodeState(encoded: string): AppState | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(json);
    if (
      Array.isArray(parsed.players) &&
      Array.isArray(parsed.matches) &&
      Array.isArray(parsed.tournaments)
    ) {
      return parsed as AppState;
    }
    return null;
  } catch {
    return null;
  }
}

export { DEFAULT_STATE };
