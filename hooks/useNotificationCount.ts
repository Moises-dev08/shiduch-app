/**
 * Hook to track notification counts across the app
 * Updates in real-time based on database changes
 */

import { useCallback, useEffect, useState } from 'react';
import { infoRequestService } from '../lib/infoRequestService';
import { introService } from '../lib/introService';
import { profileService } from '../lib/profileService';
import { suggestionService } from '../lib/suggestionService';
import { useRealtimeInfoRequests } from './useRealtimeInfoRequests';
import { useRealtimeIntroRequests } from './useRealtimeIntroRequests';
import { useRealtimeSuggestions } from './useRealtimeSuggestions';

export interface NotificationCounts {
  actionNeeded: number;
  forYou: number;
  forOthers: number;
  total: number;
}

export function useNotificationCount() {
  const [counts, setCounts] = useState<NotificationCounts>({
    actionNeeded: 0,
    forYou: 0,
    forOthers: 0,
    total: 0,
  });
  const [currentProfileId, setCurrentProfileId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  // Calculate notification counts
  const calculateCounts = useCallback(async () => {
    try {
      // Get current user profile
      const profileResult = await profileService.getProfile();
      if (!profileResult.success || !profileResult.profile) {
        setCounts({ actionNeeded: 0, forYou: 0, forOthers: 0, total: 0 });
        setLoading(false);
        return;
      }

      const profile = profileResult.profile;
      setCurrentProfileId(profile.id);

      // Fetch all data
      const [introResult, suggestionResult, infoRequestResult] = await Promise.all([
        introService.getMyIntroRequests(),
        suggestionService.getMySuggestions(),
        infoRequestService.getReceivedRequests(),
      ]);

      let forYouCount = 0;
      let forOthersCount = 0;

      // Count "For You" action items
      if (introResult.success) {
        // Received intro requests needing response
        forYouCount += introResult.receivedRequests?.filter(
          (r) =>
            r.status === 'pending' ||
            (r.status === 'accepted' &&
              (!r.requested_continuation_choice || !r.requester_continuation_choice))
        ).length || 0;

        // Sent intro requests needing continuation choice
        forYouCount += introResult.sentRequests?.filter(
          (r) =>
            r.status === 'accepted' &&
            (!r.requester_continuation_choice || !r.requested_continuation_choice)
        ).length || 0;
      }

      // Count suggestions needing action
      if (suggestionResult.success) {
        forYouCount += suggestionResult.receivedSuggestions?.filter(
          (s) =>
            s.status === 'pending' ||
            (s.status === 'accepted' &&
              ((s.profile_one_id === profile.id && !s.profile_one_continuation_choice) ||
                (s.profile_two_id === profile.id && !s.profile_two_continuation_choice)))
        ).length || 0;
      }

      // Count info requests needing response
      if (infoRequestResult.success) {
        forYouCount += infoRequestResult.requests?.filter((r) => r.status === 'pending').length || 0;
      }

      // Count "For Others" action items (if user is a matchmaker or making suggestions)
      if (profile.role === 'matchmaker') {
        const middleResult = await introService.getMiddlePersonRequests();
        if (middleResult.success) {
          forOthersCount += middleResult.middlePersonRequests?.filter(
            (r) =>
              r.status === 'pending' ||
              (r.status === 'accepted' &&
                (!r.requester_continuation_choice || !r.requested_continuation_choice))
          ).length || 0;
        }
      }

      // Add suggestions made by user that are awaiting response
      if (suggestionResult.success) {
        forOthersCount += suggestionResult.madeSuggestions?.filter(
          (s) =>
            s.status === 'pending' ||
            (s.status === 'accepted' &&
              (!s.profile_one_continuation_choice || !s.profile_two_continuation_choice))
        ).length || 0;
      }

      const newCounts = {
        actionNeeded: forYouCount,
        forYou: forYouCount,
        forOthers: forOthersCount,
        total: forYouCount + forOthersCount,
      };

      setCounts(newCounts);
    } catch (error) {
      console.error('Error calculating notification counts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    calculateCounts();
  }, [calculateCounts]);

  // Set up real-time updates (silent refresh when data changes)
  useRealtimeIntroRequests(calculateCounts, currentProfileId);
  useRealtimeSuggestions(calculateCounts, currentProfileId);
  useRealtimeInfoRequests(calculateCounts, currentProfileId);

  return {
    counts,
    loading,
    refresh: calculateCounts,
  };
}

