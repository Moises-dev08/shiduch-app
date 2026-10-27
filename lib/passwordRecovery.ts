import { APP_WEB_BASE } from './profileShareUrls';
import {
  setPasswordRecoveryPending,
  supabase,
  passwordRecoveryPending,
} from './supabase';

export const PASSWORD_RESET_REDIRECT_URL = `${APP_WEB_BASE}/auth/reset-password`;

export function parseAuthUrlParams(url: string): Record<string, string> {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const params: Record<string, string> = {};

  if (hashIndex !== -1) {
    new URLSearchParams(url.slice(hashIndex + 1)).forEach((value, key) => {
      params[key] = value;
    });
  }
  if (queryIndex !== -1) {
    const end = hashIndex !== -1 && hashIndex > queryIndex ? hashIndex : undefined;
    new URLSearchParams(url.slice(queryIndex + 1, end)).forEach((value, key) => {
      params[key] = value;
    });
  }
  return params;
}

export function isPasswordRecoveryUrl(url: string): boolean {
  return parseAuthUrlParams(url).type === 'recovery';
}

/** True when this page load is a password-reset email, even after the hash is cleared. */
export function shouldOpenPasswordReset(): boolean {
  if (passwordRecoveryPending) return true;
  if (typeof window !== 'undefined' && isPasswordRecoveryUrl(window.location.href)) {
    return true;
  }
  return false;
}

export function clearPasswordRecoveryPending(): void {
  setPasswordRecoveryPending(false);
}

function clearAuthParamsFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.hash = '';
  url.searchParams.delete('code');
  url.searchParams.delete('type');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
}

/**
 * Turns a recovery email link into a session.
 * Implicit links carry access_token + refresh_token. PKCE links carry a code.
 */
export async function establishRecoverySessionFromUrl(url: string): Promise<boolean> {
  const params = parseAuthUrlParams(url);
  if (params.error || params.error_description) return false;

  if (params.type === 'recovery' && params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) return false;
    setPasswordRecoveryPending(true);
    clearAuthParamsFromUrl();
    return true;
  }

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error || !data.session) return false;
    setPasswordRecoveryPending(true);
    clearAuthParamsFromUrl();
    return true;
  }

  return false;
}
