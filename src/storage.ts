import type { AppState } from './types';

const STORAGE_KEY = 'tennis-matchups-state';

const DEFAULT_STATE: AppState = {
  players: [],
  matches: [],
  tournaments: [],
  calibrationSessions: [],
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
      // Migrate: default missing calibrationSessions for existing users
      if (!Array.isArray(parsed.calibrationSessions)) {
        parsed.calibrationSessions = [];
      }
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

function uint8ToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8(b64: string): ArrayBuffer {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

export async function encodeState(state: AppState): Promise<string> {
  const json = JSON.stringify(state);
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate'));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  return 'c:' + uint8ToBase64Url(compressed);
}

export async function decodeState(encoded: string): Promise<AppState | null> {
  try {
    let json: string;

    if (encoded.startsWith('c:')) {
      // Compressed format
      const compressed = base64UrlToUint8(encoded.slice(2));
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate'));
      json = new TextDecoder().decode(await new Response(stream).arrayBuffer());
    } else {
      // Legacy format: btoa(encodeURIComponent(json))
      json = decodeURIComponent(atob(encoded));
    }

    const parsed = JSON.parse(json);
    if (
      Array.isArray(parsed.players) &&
      Array.isArray(parsed.matches) &&
      Array.isArray(parsed.tournaments)
    ) {
      if (!Array.isArray(parsed.calibrationSessions)) {
        parsed.calibrationSessions = [];
      }
      return parsed as AppState;
    }
    return null;
  } catch {
    return null;
  }
}

export { DEFAULT_STATE };
