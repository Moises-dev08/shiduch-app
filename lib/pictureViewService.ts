import { getStoredAccessToken, supabaseAnonKey, supabaseUrl } from './supabase';

export interface RecordPictureViewOptions {
  viewerProfileId?: string;
  accessToken?: string;
}

export interface PictureView {
  id: string;
  viewer_profile_id: string;
  viewed_profile_id: string;
  viewed_at: string;
}

async function resolveAccessToken(preferred?: string): Promise<string | null> {
  if (preferred) return preferred;
  return getStoredAccessToken();
}

function userIdFromAccessToken(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = globalThis.atob(padded);
    const json: unknown = JSON.parse(decoded);
    if (typeof json !== 'object' || json === null || !('sub' in json)) return null;
    const sub = (json as { sub?: unknown }).sub;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}

async function profileIdForAccessToken(token: string): Promise<string | null> {
  const userId = userIdFromAccessToken(token);
  if (!userId) return null;
  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=id&limit=1`,
    {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!response.ok) return null;
  const rows: unknown = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const first = rows[0];
  if (typeof first !== 'object' || first === null || !('id' in first)) return null;
  const id = (first as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}

async function readRestError(response: Response): Promise<string> {
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed === 'object' && parsed !== null && 'message' in parsed) {
      const message = (parsed as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) return message;
    }
  } catch {
    // Response body was not JSON.
  }
  return `Could not save (${response.status})`;
}

class PictureViewService {
  /**
   * Check if current user has already viewed a profile's pictures
   */
  async hasViewedPictures(viewedProfileId: string): Promise<{ success: boolean; hasViewed: boolean; error?: string }> {
    try {
      const accessToken = await resolveAccessToken();
      if (!accessToken) {
        return { success: false, hasViewed: false, error: 'Not authenticated' };
      }

      const viewerProfileId = await profileIdForAccessToken(accessToken);
      if (!viewerProfileId) {
        return { success: false, hasViewed: false, error: 'Profile not found' };
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/picture_views?viewer_profile_id=eq.${viewerProfileId}&viewed_profile_id=eq.${viewedProfileId}&select=id&limit=1`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const message = await readRestError(response);
        console.error('Error checking picture view:', message);
        return { success: false, hasViewed: false, error: message };
      }

      const rows: unknown = await response.json();
      return { success: true, hasViewed: Array.isArray(rows) && rows.length > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not check the photo view';
      console.error('Error in hasViewedPictures:', error);
      return { success: false, hasViewed: false, error: message };
    }
  }

  /**
   * Record that current user has viewed a profile's pictures.
   * Uses the login already on screen. getSession() can report a missing session
   * even after a successful sign-in, and that check was blocking the save.
   */
  async recordPictureView(
    viewedProfileId: string,
    options?: RecordPictureViewOptions,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = await resolveAccessToken(options?.accessToken);
      if (!accessToken) {
        return { success: false, error: 'Auth session missing!' };
      }

      const viewerProfileId =
        options?.viewerProfileId ?? (await profileIdForAccessToken(accessToken));
      if (!viewerProfileId) {
        return { success: false, error: 'Profile not found' };
      }

      if (viewerProfileId === viewedProfileId) {
        return { success: true };
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/picture_views?on_conflict=viewer_profile_id,viewed_profile_id`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify({
            viewer_profile_id: viewerProfileId,
            viewed_profile_id: viewedProfileId,
            viewed_at: new Date().toISOString(),
          }),
        },
      );

      if (!response.ok) {
        const message = await readRestError(response);
        console.error('Error recording picture view:', message);
        return { success: false, error: message };
      }

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not save the photo view';
      console.error('Error in recordPictureView:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Get all profiles whose pictures have been viewed by current user
   */
  async getViewedProfiles(): Promise<{ success: boolean; viewedProfileIds?: string[]; error?: string }> {
    try {
      const accessToken = await resolveAccessToken();
      if (!accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      const viewerProfileId = await profileIdForAccessToken(accessToken);
      if (!viewerProfileId) {
        return { success: false, error: 'Profile not found' };
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/picture_views?viewer_profile_id=eq.${viewerProfileId}&select=viewed_profile_id`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const message = await readRestError(response);
        console.error('Error getting viewed profiles:', message);
        return { success: false, error: message };
      }

      const rows: unknown = await response.json();
      const viewedProfileIds = Array.isArray(rows)
        ? rows.flatMap((row) => {
            if (typeof row !== 'object' || row === null || !('viewed_profile_id' in row)) return [];
            const id = (row as { viewed_profile_id?: unknown }).viewed_profile_id;
            return typeof id === 'string' ? [id] : [];
          })
        : [];
      return { success: true, viewedProfileIds };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not load seen photos';
      console.error('Error in getViewedProfiles:', error);
      return { success: false, error: message };
    }
  }
}

export const pictureViewService = new PictureViewService();

