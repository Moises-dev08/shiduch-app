import { profileService } from './profileService';

export type PicturePrivacy = 'none' | 'always' | 'private' | 'one_time' | string;

export interface ProfileWithPictures {
  pictures?: string[] | null;
  picture_privacy?: PicturePrivacy | null;
}

/**
 * Returns a public image URL only when the profile allows photos to be shown.
 * `none` (hide photo) always returns null so avatars stay hidden everywhere.
 */
export function getVisibleProfileImageUrl(
  profile: ProfileWithPictures | null | undefined,
  options?: { allowPrivateBlurred?: boolean }
): string | null {
  if (!profile) return null;

  const privacy = profile.picture_privacy || 'none';
  if (privacy === 'none') {
    return null;
  }

  if (privacy === 'private' && !options?.allowPrivateBlurred) {
    // Callers that support blur can pass allowPrivateBlurred: true
  }

  const pictures = profile.pictures;
  if (!Array.isArray(pictures) || pictures.length === 0) {
    return null;
  }

  return profileService.getImageUrl(pictures[0]);
}

export function shouldShowProfilePicture(
  privacy: PicturePrivacy | null | undefined
): boolean {
  const value = privacy || 'none';
  return value !== 'none';
}
