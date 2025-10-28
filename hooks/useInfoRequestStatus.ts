import { useEffect, useState } from 'react';
import { InfoRequest, suggestionService } from '../lib/suggestionService';

interface UseInfoRequestStatusResult {
  hasActiveRequest: boolean;
  existingRequest?: InfoRequest;
  loading: boolean;
  checkStatus: () => Promise<void>;
}

/**
 * Custom hook to check if user has an active info request for a profile
 */
export function useInfoRequestStatus(profileId: string | null): UseInfoRequestStatusResult {
  const [hasActiveRequest, setHasActiveRequest] = useState(false);
  const [existingRequest, setExistingRequest] = useState<InfoRequest | undefined>();
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await suggestionService.hasActiveInfoRequest(profileId);
      
      if (result.success) {
        setHasActiveRequest(result.hasActive);
        setExistingRequest(result.existingRequest);
      } else {
        setHasActiveRequest(false);
        setExistingRequest(undefined);
      }
    } catch (error) {
      console.error('Error checking info request status:', error);
      setHasActiveRequest(false);
      setExistingRequest(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [profileId]);

  return {
    hasActiveRequest,
    existingRequest,
    loading,
    checkStatus,
  };
}

