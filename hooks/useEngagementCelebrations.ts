import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Engagement {
  id: string;
  user1_id: string;
  user2_id: string;
  user1_confirmed: boolean;
  user2_confirmed: boolean;
  confirmed_at: string;
}

const SHOWN_ENGAGEMENTS_KEY = '@shown_engagements';

export function useEngagementCelebrations(currentUserId: string | null) {
  const [celebrationData, setCelebrationData] = useState<{
    coupleName1: string;
    coupleName2: string;
  } | null>(null);

  // Load shown engagements from storage
  const getShownEngagements = async (): Promise<Set<string>> => {
    try {
      const stored = await AsyncStorage.getItem(SHOWN_ENGAGEMENTS_KEY);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Error loading shown engagements:', error);
      return new Set();
    }
  };

  // Mark engagement as shown
  const markEngagementAsShown = async (engagementId: string) => {
    try {
      const shown = await getShownEngagements();
      shown.add(engagementId);
      await AsyncStorage.setItem(SHOWN_ENGAGEMENTS_KEY, JSON.stringify([...shown]));
    } catch (error) {
      console.error('Error saving shown engagement:', error);
    }
  };

  // Check for new engagements
  const checkForNewEngagements = useCallback(async () => {
    if (!currentUserId) return;

    try {
      // Get all confirmed engagements from the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: engagements, error } = await supabase
        .from('engagements')
        .select(`
          id,
          user1_id,
          user2_id,
          user1_confirmed,
          user2_confirmed,
          confirmed_at
        `)
        .eq('user1_confirmed', true)
        .eq('user2_confirmed', true)
        .not('confirmed_at', 'is', null)
        .gte('confirmed_at', yesterday.toISOString())
        .order('confirmed_at', { ascending: false });

      if (error) {
        console.error('Error fetching engagements:', error);
        return;
      }

      if (!engagements || engagements.length === 0) return;

      // Get already shown engagements
      const shownEngagements = await getShownEngagements();

      // Get profiles for engaged users
      const userIds = engagements.map(e => [e.user1_id, e.user2_id]).flat();
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Find the first engagement that hasn't been shown and isn't the current user's
      for (const engagement of engagements) {
        // Skip if already shown
        if (shownEngagements.has(engagement.id)) continue;

        // Skip if this is the current user's engagement
        if (
          engagement.user1_id === currentUserId ||
          engagement.user2_id === currentUserId
        ) {
          // Mark as shown so we don't check it again
          await markEngagementAsShown(engagement.id);
          continue;
        }

        // Get profile data
        const profileOne = profilesMap.get(engagement.user1_id);
        const profileTwo = profilesMap.get(engagement.user2_id);
        
        if (!profileOne || !profileTwo) continue;

        // Show this engagement celebration
        setCelebrationData({
          coupleName1: `${profileOne.first_name} ${profileOne.last_name}`,
          coupleName2: `${profileTwo.first_name} ${profileTwo.last_name}`,
        });

        // Mark as shown
        await markEngagementAsShown(engagement.id);
        break; // Only show one at a time
      }
    } catch (error) {
      console.error('Error checking for new engagements:', error);
    }
  }, [currentUserId]);

  // Check on mount and when app comes to foreground
  useEffect(() => {
    checkForNewEngagements();
  }, [checkForNewEngagements]);

  // Set up realtime subscription for new engagements
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('engagement_celebrations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'engagements',
        },
        (payload) => {
          console.log('Engagement update detected!', payload);
          // Check for new engagements when both users confirm
          const newRecord = payload.new as any;
          if (newRecord.user1_confirmed && newRecord.user2_confirmed && newRecord.confirmed_at) {
            checkForNewEngagements();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, checkForNewEngagements]);

  const closeCelebration = () => {
    setCelebrationData(null);
  };

  return {
    showCelebration: !!celebrationData,
    celebrationData,
    closeCelebration,
  };
}

