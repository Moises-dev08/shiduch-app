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

/**
 * Admin review helper — always returns photo URLs when uploaded,
 * including when the user chose "No photo" / hidden from other users.
 */
export function getAdminProfileImageUrls(
  profile: ProfileWithPictures | null | undefined
): string[] {
  if (!profile || !Array.isArray(profile.pictures)) {
    return [];
  }

  return profile.pictures
    .filter((path): path is string => typeof path === 'string' && path.length > 0)
    .map((path) => profileService.getImageUrl(path));
}

export function getAdminProfileImageUrl(
  profile: ProfileWithPictures | null | undefined
): string | null {
  const urls = getAdminProfileImageUrls(profile);
  return urls[0] ?? null;
}

export function shouldShowProfilePicture(
  privacy: PicturePrivacy | null | undefined
): boolean {
  const value = privacy || 'none';
  return value !== 'none';
}

export function getPicturePrivacyAdminLabel(
  privacy: PicturePrivacy | null | undefined
): string {
  switch (privacy) {
    case 'always':
      return 'Visible to everyone';
    case 'private':
      return 'Private (blurred until requested)';
    case 'one_time':
      return 'One-time view';
    case 'none':
    default:
      return 'Hidden from users — admin verification only';
  }
}
