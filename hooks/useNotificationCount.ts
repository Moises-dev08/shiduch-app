/**
 * Hook to track notification counts across the app
 * Uses viewed_notifications table to track what user has seen
 */

import { useCallback, useEffect, useState } from 'react';
import { infoRequestService } from '../lib/infoRequestService';
import { introService } from '../lib/introService';
import { profileService } from '../lib/profileService';
import { suggestionService } from '../lib/suggestionService';
import { viewedNotificationService } from '../lib/viewedNotificationService';
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

      // Get viewed notification IDs
      const [viewedIntroIds, viewedSuggestionIds, viewedInfoRequestIds] = await Promise.all([
        viewedNotificationService.getViewedIds('intro_request'),
        viewedNotificationService.getViewedIds('suggestion'),
        viewedNotificationService.getViewedIds('info_request'),
      ]);

      const viewedIntros = new Set(viewedIntroIds.ids || []);
      const viewedSuggestions = new Set(viewedSuggestionIds.ids || []);
      const viewedInfoRequests = new Set(viewedInfoRequestIds.ids || []);

      // Fetch all data
      const [introResult, suggestionResult, infoRequestResult] = await Promise.all([
        introService.getMyIntroRequests(),
        suggestionService.getMySuggestions(),
        infoRequestService.getReceivedRequests(),
      ]);

      let forYouCount = 0;
      let forOthersCount = 0;

      // Count "For You" action items (exclude viewed)
      if (introResult.success) {
        // Received intro requests needing response
        forYouCount += introResult.receivedRequests?.filter(
          (r) => {
            const needsAction = r.requested_status === 'pending' ||
              (r.requested_status === 'accepted' && !r.requested_continuation_choice);
            return needsAction && !viewedIntros.has(r.id);
          }
        ).length || 0;

        // Sent intro requests needing continuation choice
        forYouCount += introResult.sentRequests?.filter(
          (r) => {
            const needsAction = r.matchmaker_status === 'accepted' &&
              r.requested_status === 'accepted' &&
              !r.requester_continuation_choice;
            return needsAction && !viewedIntros.has(r.id);
          }
        ).length || 0;
      }

      // Count suggestions needing action (exclude viewed)
      if (suggestionResult.success) {
        forYouCount += suggestionResult.receivedSuggestions?.filter(
          (s) => {
            const isProfileOne = s.profile_one_id === profile.id;
            const myStatus = isProfileOne ? s.profile_one_status : s.profile_two_status;
            const myContinuationChoice = isProfileOne ? s.profile_one_continuation_choice : s.profile_two_continuation_choice;
            const needsAction = myStatus === 'pending' || (myStatus === 'accepted' && !myContinuationChoice);
            return needsAction && !viewedSuggestions.has(s.id);
          }
        ).length || 0;
      }

      // Count info requests needing response (exclude viewed)
      if (infoRequestResult.success) {
        forYouCount += infoRequestResult.requests?.filter(
          (r) => r.status === 'pending' && !viewedInfoRequests.has(r.id)
        ).length || 0;
      }

      // Count "For Others" action items (for matchmakers)
      const matchmakerResult = await introService.getMatchmakerRequests();
      if (matchmakerResult.success && matchmakerResult.matchmakerRequests) {
        forOthersCount += matchmakerResult.matchmakerRequests.filter(
          (r) => {
            const needsAction = r.matchmaker_status === 'pending' ||
              (r.matchmaker_status === 'accepted' && r.requested_status === 'pending');
            return needsAction && !viewedIntros.has(r.id);
          }
        ).length;
      }

      // Add suggestions made by user that are awaiting response (exclude viewed)
      if (suggestionResult.success) {
        forOthersCount += suggestionResult.madeSuggestions?.filter(
          (s) => {
            const needsAction = s.status === 'pending' ||
              (s.status === 'accepted' &&
                (!s.profile_one_continuation_choice || !s.profile_two_continuation_choice));
            return needsAction && !viewedSuggestions.has(s.id);
          }
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

