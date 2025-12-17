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

      // Get last viewed timestamps
      const lastViewedIntroRequests = profile.last_viewed_intro_requests_at 
        ? new Date(profile.last_viewed_intro_requests_at)
        : null;
      const lastViewedMatches = profile.last_viewed_matches_at 
        ? new Date(profile.last_viewed_matches_at)
        : null;
      const lastViewedSuggestions = profile.last_viewed_suggestions_at 
        ? new Date(profile.last_viewed_suggestions_at)
        : null;

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
        // Received intro requests needing response (only count if created after last viewed)
        forYouCount += introResult.receivedRequests?.filter(
          (r) => {
            const needsAction = r.status === 'pending' ||
              (r.status === 'accepted' &&
                (!r.requested_continuation_choice || !r.requester_continuation_choice));
            
            if (!needsAction) return false;
            
            // If we have a last viewed timestamp, only count requests created after it
            if (lastViewedIntroRequests) {
              const requestCreatedAt = new Date(r.created_at);
              return requestCreatedAt > lastViewedIntroRequests;
            }
            
            return true;
          }
        ).length || 0;

        // Sent intro requests needing continuation choice (only count if created after last viewed)
        forYouCount += introResult.sentRequests?.filter(
          (r) => {
            const needsAction = r.status === 'accepted' &&
              (!r.requester_continuation_choice || !r.requested_continuation_choice);
            
            if (!needsAction) return false;
            
            // If we have a last viewed timestamp, only count requests created after it
            if (lastViewedIntroRequests) {
              const requestCreatedAt = new Date(r.created_at);
              return requestCreatedAt > lastViewedIntroRequests;
            }
            
            return true;
          }
        ).length || 0;
      }

      // Count suggestions needing action (only count if created after last viewed)
      if (suggestionResult.success) {
        forYouCount += suggestionResult.receivedSuggestions?.filter(
          (s) => {
            const needsAction = s.status === 'pending' ||
              (s.status === 'accepted' &&
                ((s.profile_one_id === profile.id && !s.profile_one_continuation_choice) ||
                  (s.profile_two_id === profile.id && !s.profile_two_continuation_choice)));
            
            if (!needsAction) return false;
            
            // If we have a last viewed timestamp, only count suggestions created after it
            if (lastViewedSuggestions) {
              const suggestionCreatedAt = new Date(s.created_at);
              return suggestionCreatedAt > lastViewedSuggestions;
            }
            
            return true;
          }
        ).length || 0;
      }

      // Count info requests needing response
      if (infoRequestResult.success) {
        forYouCount += infoRequestResult.requests?.filter((r) => r.status === 'pending').length || 0;
      }

      // Count new matches (intro requests that became accepted/completed after last viewed)
      if (introResult.success && lastViewedMatches) {
        // Count sent intro requests that became matches after last viewed
        forYouCount += introResult.sentRequests?.filter(
          (r) => {
            const isMatch = r.status === 'accepted' || r.status === 'completed';
            if (!isMatch) return false;
            
            // Check if the request was updated to accepted/completed after last viewed
            const requestUpdatedAt = new Date(r.updated_at);
            return requestUpdatedAt > lastViewedMatches;
          }
        ).length || 0;

        // Count received intro requests that became matches after last viewed
        forYouCount += introResult.receivedRequests?.filter(
          (r) => {
            const isMatch = r.status === 'accepted' || r.status === 'completed';
            if (!isMatch) return false;
            
            // Check if the request was updated to accepted/completed after last viewed
            const requestUpdatedAt = new Date(r.updated_at);
            return requestUpdatedAt > lastViewedMatches;
          }
        ).length || 0;

        // Count suggestions that became matches after last viewed
        if (suggestionResult.success) {
          forYouCount += suggestionResult.receivedSuggestions?.filter(
            (s) => {
              const isMatch = s.status === 'accepted' || s.status === 'completed';
              if (!isMatch) return false;
              
              // Check if the suggestion was updated to accepted/completed after last viewed
              const suggestionUpdatedAt = new Date(s.updated_at);
              return suggestionUpdatedAt > lastViewedMatches;
            }
          ).length || 0;
        }
      } else if (introResult.success && !lastViewedMatches) {
        // If never viewed, count all current matches as new
        forYouCount += introResult.sentRequests?.filter(
          (r) => r.status === 'accepted' || r.status === 'completed'
        ).length || 0;
        forYouCount += introResult.receivedRequests?.filter(
          (r) => r.status === 'accepted' || r.status === 'completed'
        ).length || 0;
        if (suggestionResult.success) {
          forYouCount += suggestionResult.receivedSuggestions?.filter(
            (s) => s.status === 'accepted' || s.status === 'completed'
          ).length || 0;
        }
      }

      // Count "For Others" action items (for anyone who is a matchmaker, regardless of profile role)
      const middleResult = await introService.getMiddlePersonRequests();
      if (middleResult.success && middleResult.middlePersonRequests && middleResult.middlePersonRequests.length > 0) {
        // Count pending or needs continuation choice
        forOthersCount += middleResult.middlePersonRequests.filter(
          (r) =>
            r.status === 'pending' ||
            (r.status === 'accepted' &&
              (!r.requester_continuation_choice || !r.requested_continuation_choice))
        ).length;

        // Count new matches (completed or both continuation choices made) after last viewed
        const lastViewedMatches = profile.last_viewed_matches_at 
          ? new Date(profile.last_viewed_matches_at)
          : null;

        if (lastViewedMatches) {
          forOthersCount += middleResult.middlePersonRequests.filter(
            (r) => {
              const isMatch = r.status === 'completed' || 
                (r.status === 'accepted' && r.requester_continuation_choice && r.requested_continuation_choice);
              if (!isMatch) return false;
              
              const requestUpdatedAt = new Date(r.updated_at);
              return requestUpdatedAt > lastViewedMatches;
            }
          ).length;
        } else {
          // If never viewed, count all current matches as new
          forOthersCount += middleResult.middlePersonRequests.filter(
            (r) => r.status === 'completed' || 
              (r.status === 'accepted' && r.requester_continuation_choice && r.requested_continuation_choice)
          ).length;
        }
      }

      // Add suggestions made by user that are awaiting response (only count if created after last viewed)
      if (suggestionResult.success) {
        forOthersCount += suggestionResult.madeSuggestions?.filter(
          (s) => {
            const needsAction = s.status === 'pending' ||
              (s.status === 'accepted' &&
                (!s.profile_one_continuation_choice || !s.profile_two_continuation_choice));
            
            if (!needsAction) return false;
            
            // If we have a last viewed timestamp, only count suggestions created after it
            if (lastViewedSuggestions) {
              const suggestionCreatedAt = new Date(s.created_at);
              return suggestionCreatedAt > lastViewedSuggestions;
            }
            
            return true;
          }
        ).length || 0;
      }

      // Add count of new singles who selected this user as matchmaker
      const newSinglesResult = await profileService.getNewSinglesCount();
      if (newSinglesResult.success && newSinglesResult.count) {
        forOthersCount += newSinglesResult.count;
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

