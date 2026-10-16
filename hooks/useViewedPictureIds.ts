import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { pictureViewService } from '../lib/pictureViewService';
import {
  getVisibleProfileImageUrl,
  ProfileWithPictures,
} from '../lib/profilePictureVisibility';

export const VIEWED_PICTURE_IDS_QUERY_KEY = ['viewed_picture_ids'] as const;

export function useViewedPictureIds(): {
  viewedIds: string[];
  hasViewed: (profileId: string | undefined) => boolean;
  imageUrlFor: (
    profile: ProfileWithPictures | null | undefined
  ) => string | null;
  markViewed: (profileId: string) => void;
} {
  const queryClient = useQueryClient();
  const { data: viewedIds = [] } = useQuery({
    queryKey: VIEWED_PICTURE_IDS_QUERY_KEY,
    queryFn: async (): Promise<string[]> => {
      const result = await pictureViewService.getViewedProfiles();
      return result.success ? result.viewedProfileIds ?? [] : [];
    },
    staleTime: 30 * 1000,
  });

  const hasViewed = useCallback(
    (profileId: string | undefined): boolean =>
      !!profileId && viewedIds.includes(profileId),
    [viewedIds]
  );

  const imageUrlFor = useCallback(
    (profile: ProfileWithPictures | null | undefined): string | null =>
      getVisibleProfileImageUrl(profile, {
        hasViewedOneTime: hasViewed(profile?.id),
      }),
    [hasViewed]
  );

  const markViewed = useCallback(
    (profileId: string): void => {
      queryClient.setQueryData<string[]>(VIEWED_PICTURE_IDS_QUERY_KEY, (current) => {
        const ids = current ?? [];
        return ids.includes(profileId) ? ids : [...ids, profileId];
      });
      queryClient.invalidateQueries({ queryKey: ['home_profiles'] });
    },
    [queryClient]
  );

  return { viewedIds, hasViewed, imageUrlFor, markViewed };
}
