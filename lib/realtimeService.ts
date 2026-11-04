import { RealtimeChannel } from '@supabase/supabase-js';
import { uniqueRealtimeTopic } from './realtimeChannel';
import { supabase } from './supabase';

/**
 * Centralized Realtime Service for managing Supabase Realtime subscriptions
 * This service provides real-time updates for database changes across the app
 */

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Subscribe to profile changes
   */
  subscribeToProfiles(callback: (payload: any) => void): () => void {
    const channelName = 'profiles-changes';
    
    // Remove existing channel if it exists
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(uniqueRealtimeTopic(channelName))
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log(`🔔 Profiles subscription status: ${status}`);
      });

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to intro request changes
   */
  subscribeToIntroRequests(callback: (payload: any) => void): () => void {
    const channelName = 'intro-requests-changes';
    
    // Remove existing channel if it exists
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(uniqueRealtimeTopic(channelName))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intro_requests',
        },
        (payload) => {
          console.log('🔔 Intro request change detected:', payload.eventType, payload.new);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log(`🔔 Intro requests (all) subscription status: ${status}`);
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to intro requests for a specific user
   * This filters updates to only those relevant to the current user
   */
  subscribeToMyIntroRequests(
    profileId: string,
    callback: (payload: any) => void
  ): () => void {
    const channelName = `intro-requests-user-${profileId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(uniqueRealtimeTopic(channelName))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intro_requests',
          filter: `requester_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('🔔 Intro request change (as requester):', payload.eventType, payload.new);
          callback(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intro_requests',
          filter: `requested_profile_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('🔔 Intro request change (as requested):', payload.eventType, payload.new);
          callback(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intro_requests',
          filter: `requester_middle_person_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('🔔 Intro request change (as requester Matchmaker/Shadchan):', payload.eventType, payload.new);
          callback(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intro_requests',
          filter: `requested_middle_person_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('🔔 Intro request change (as requested Matchmaker/Shadchan):', payload.eventType, payload.new);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log(`🔔 Intro requests subscription status: ${status}`);
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to a specific intro request by ID
   */
  subscribeToIntroRequest(
    requestId: string,
    callback: (payload: any) => void
  ): () => void {
    const channelName = `intro-request-${requestId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(uniqueRealtimeTopic(channelName))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intro_requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          console.log('Specific intro request change:', payload);
          callback(payload);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Generic subscription to any table
   */
  subscribeToTable(
    tableName: string,
    callback: (payload: any) => void,
    filter?: string
  ): () => void {
    const channelName = filter ? `${tableName}-${filter}` : `${tableName}-all`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const subscriptionConfig: any = {
      event: '*',
      schema: 'public',
      table: tableName,
    };

    if (filter) {
      subscriptionConfig.filter = filter;
    }

    const channel = supabase
      .channel(uniqueRealtimeTopic(channelName))
      .on('postgres_changes', subscriptionConfig, (payload) => {
        console.log(`${tableName} change detected:`, payload);
        callback(payload);
      })
      .subscribe();

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Unsubscribe from a specific channel
   */
  private unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log(`Unsubscribed from ${channelName}`);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach((channel, name) => {
      supabase.removeChannel(channel);
      console.log(`Unsubscribed from ${name}`);
    });
    this.channels.clear();
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    return this.channels.size;
  }

  /**
   * Check if a channel is active
   */
  isChannelActive(channelName: string): boolean {
    return this.channels.has(channelName);
  }
}

export const realtimeService = new RealtimeService();

