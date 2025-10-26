import { useCallback, useEffect, useState } from 'react';
import {
    InfoRequestWithDetails,
    suggestionService,
    SuggestionWithDetails,
} from '../lib/suggestionService';

export function useSetupHistory() {
  const [suggestions, setSuggestions] = useState<SuggestionWithDetails[]>([]);
  const [receivedSuggestions, setReceivedSuggestions] = useState<SuggestionWithDetails[]>([]);
  const [matchmakerSuggestions, setMatchmakerSuggestions] = useState<SuggestionWithDetails[]>([]);
  const [infoRequests, setInfoRequests] = useState<InfoRequestWithDetails[]>([]);
  const [receivedInfoRequests, setReceivedInfoRequests] = useState<InfoRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch all data in parallel
      const [
        suggestionsResult, 
        receivedSuggestionsResult,
        matchmakerSuggestionsResult,
        infoRequestsResult, 
        receivedInfoRequestsResult
      ] = await Promise.all([
        suggestionService.getUserSuggestionsWithDetails(),
        suggestionService.getReceivedSuggestions(),
        suggestionService.getMatchmakerSuggestions(),
        suggestionService.getUserInfoRequestsWithDetails(),
        suggestionService.getReceivedInfoRequests(),
      ]);

      // Handle sent suggestions
      if (suggestionsResult.success) {
        setSuggestions(suggestionsResult.suggestions || []);
      } else {
        console.error('Error loading suggestions:', suggestionsResult.error);
        setSuggestions([]);
      }

      // Handle received suggestions
      if (receivedSuggestionsResult.success) {
        setReceivedSuggestions(receivedSuggestionsResult.suggestions || []);
      } else {
        console.error('Error loading received suggestions:', receivedSuggestionsResult.error);
        setReceivedSuggestions([]);
      }

      // Handle matchmaker suggestions
      if (matchmakerSuggestionsResult.success) {
        setMatchmakerSuggestions(matchmakerSuggestionsResult.suggestions || []);
      } else {
        console.error('Error loading matchmaker suggestions:', matchmakerSuggestionsResult.error);
        setMatchmakerSuggestions([]);
      }

      // Handle sent info requests
      if (infoRequestsResult.success) {
        setInfoRequests(infoRequestsResult.requests || []);
      } else {
        console.error('Error loading info requests:', infoRequestsResult.error);
        setInfoRequests([]);
      }

      // Handle received info requests
      if (receivedInfoRequestsResult.success) {
        setReceivedInfoRequests(receivedInfoRequestsResult.requests || []);
      } else {
        console.error('Error loading received info requests:', receivedInfoRequestsResult.error);
        setReceivedInfoRequests([]);
      }

      // Only set error if all failed with actual errors (not just empty results)
      const allFailed = !suggestionsResult.success && !receivedSuggestionsResult.success && 
                        !matchmakerSuggestionsResult.success && !infoRequestsResult.success && 
                        !receivedInfoRequestsResult.success;
      
      if (allFailed) {
        const notProfileError = suggestionsResult.error !== 'User profile not found' && 
                               infoRequestsResult.error !== 'User profile not found' &&
                               receivedInfoRequestsResult.error !== 'User profile not found';
        if (notProfileError) {
          setError('Failed to load history');
        }
      }
    } catch (err) {
      console.error('Error loading history:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    loadHistory(true);
  }, [loadHistory]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    suggestions,
    receivedSuggestions,
    matchmakerSuggestions,
    infoRequests,
    receivedInfoRequests,
    loading,
    refreshing,
    error,
    refresh,
  };
}

