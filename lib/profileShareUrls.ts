/**
 * Profile sharing URLs.
 *
 * iOS Messages / Mail only reliably make **https** links tappable — custom schemes
 * like shiduchimapp:// are usually plain text. So we share an https URL as `url` on iOS.
 *
 * Host a page at https://www.zivugmishamayim.com/profile/<id> that either:
 * - Sets up Apple Universal Links (applinks) + AASA so the app opens directly, or
 * - Redirects to shiduchimapp://profile/<id> or shows an “Open in app” button.
 *
 * Deep-link parsing accepts both www and apex hostnames.
 */
export const PROFILE_SHARE_WEB_BASE = 'https://www.zivugmishamayim.com';
export const APP_PROFILE_SCHEME = 'shiduchimapp';

export function getProfileHttpsShareUrl(profileId: string): string {
  return `${PROFILE_SHARE_WEB_BASE}/profile/${profileId}`;
}

export function getProfileDeepLinkUrl(profileId: string): string {
  return `${APP_PROFILE_SCHEME}://profile/${profileId}`;
}

/** True if this URL should open in-app profile (https universal link or custom scheme). */
export function extractProfileIdFromShareUrl(url: string): string | null {
  try {
    const lower = url.toLowerCase();
    // Custom scheme: shiduchimapp://profile/<uuid>
    const schemeMatch = lower.match(/shiduchimapp:\/\/profile\/([^/?#]+)/i);
    if (schemeMatch?.[1]) return schemeMatch[1];

    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (host !== 'zivugmishamayim.com') return null;
    const pathMatch = parsed.pathname.match(/\/profile\/([^/]+)/i);
    return pathMatch?.[1] ?? null;
  } catch {
    return null;
  }
}
