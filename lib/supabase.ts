import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

export const supabaseUrl = 'https://ebxvbyoqjhbnqkrddcxh.supabase.co';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
export const authStorageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

const REMEMBERED_ACCESS_TOKEN_KEY = 'shiduchim.auth.access-token';
const sessionMemory = new Map<string, string>();
let rememberedAccessToken: string | null = null;

function isWebServer(): boolean {
  return Platform.OS === 'web' && typeof window === 'undefined';
}

/**
 * GoTrue reads `window.location.href` while starting, before it restores a saved login.
 * On a phone `window` is missing, that read throws, and later calls report "Auth session missing!".
 */
function ensureNativeAuthCanReadLocation(): void {
  if (Platform.OS === 'web') return;
  const scope = globalThis as unknown as {
    window?: { location?: { href?: string } };
  };
  if (typeof scope.window?.location?.href === 'string' && scope.window.location.href.length > 0) {
    return;
  }
  const location = { href: 'http://localhost/' };
  if (!scope.window) {
    scope.window = { location };
    return;
  }
  scope.window.location = location;
}

function tokenFromStoredSession(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'access_token' in parsed) {
      const token = (parsed as { access_token?: unknown }).access_token;
      if (typeof token === 'string' && token.length > 0) return token;
    }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'currentSession' in parsed &&
      typeof (parsed as { currentSession?: unknown }).currentSession === 'object'
    ) {
      const current = (parsed as { currentSession?: { access_token?: unknown } | null }).currentSession;
      if (typeof current?.access_token === 'string' && current.access_token.length > 0) {
        return current.access_token;
      }
    }
  } catch {
    if (raw.split('.').length === 3) return raw;
  }
  return null;
}

async function rememberAccessToken(token: string): Promise<void> {
  rememberedAccessToken = token;
  if (isWebServer()) return;
  await AsyncStorage.setItem(REMEMBERED_ACCESS_TOKEN_KEY, token);
}

/** Login copied aside from GoTrue, so a failed refresh cannot erase the only token. */
export async function getStoredAccessToken(): Promise<string | null> {
  if (rememberedAccessToken) return rememberedAccessToken;
  if (isWebServer()) return null;

  const backup = await AsyncStorage.getItem(REMEMBERED_ACCESS_TOKEN_KEY);
  if (backup && backup.split('.').length === 3) {
    rememberedAccessToken = backup;
    return backup;
  }

  const sessionRaw = await authStorage.getItem(authStorageKey);
  const token = tokenFromStoredSession(sessionRaw);
  if (token) rememberedAccessToken = token;
  return token;
}

export async function clearRememberedAccessToken(): Promise<void> {
  rememberedAccessToken = null;
  if (isWebServer()) return;
  await AsyncStorage.removeItem(REMEMBERED_ACCESS_TOKEN_KEY);
}

ensureNativeAuthCanReadLocation();

/** Keep the login in memory and on the device. A missing `window` must not drop the phone session. */
const authStorage: SupportedStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const remembered = sessionMemory.get(key);
    if (remembered !== undefined) {
      return remembered;
    }
    if (isWebServer()) {
      return null;
    }
    const stored = await AsyncStorage.getItem(key);
    if (stored !== null) {
      sessionMemory.set(key, stored);
    }
    return stored;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    sessionMemory.set(key, value);
    if (isWebServer()) {
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    sessionMemory.delete(key);
    if (isWebServer()) {
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

/** Set when a recovery email establishes a session, so startup does not skip the reset screen. */
export let passwordRecoveryPending = false;

export function setPasswordRecoveryPending(pending: boolean): void {
  passwordRecoveryPending = pending;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
  },
});

supabase.auth.onAuthStateChange((event, session) => {
  if (session?.access_token) {
    void rememberAccessToken(session.access_token);
  }
  if (event === 'PASSWORD_RECOVERY') {
    passwordRecoveryPending = true;
  }
});

export async function signOutAndForget(): Promise<void> {
  await clearRememberedAccessToken();
  await supabase.auth.signOut();
}

if (Platform.OS !== 'web') {
  if (AppState.currentState === 'active') {
    void supabase.auth.startAutoRefresh();
  }
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}

