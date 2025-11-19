/**
 * Realtime Diagnostics Tool
 * Use this to debug and verify Supabase Realtime is working properly
 */

import { supabase } from './supabase';

export class RealtimeDiagnostics {
  /**
   * Test if realtime connection is working
   */
  static async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🔍 Testing Supabase Realtime connection...');

      // Create a test channel
      const testChannel = supabase
        .channel('connection-test')
        .on('system', {}, (payload) => {
          console.log('System event:', payload);
        })
        .subscribe((status, err) => {
          console.log('Connection test status:', status);
          if (err) {
            console.error('Connection test error:', err);
          }
        });

      // Wait for connection
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check status
      const state = testChannel.state;
      console.log('Channel state:', state);

      // Cleanup
      await supabase.removeChannel(testChannel);

      if (state === 'joined') {
        return {
          success: true,
          message: 'Realtime connection successful',
          details: { state },
        };
      } else {
        return {
          success: false,
          message: `Realtime connection failed. State: ${state}`,
          details: { state },
        };
      }
    } catch (error) {
      console.error('Realtime test error:', error);
      return {
        success: false,
        message: `Error testing connection: ${error}`,
        details: error,
      };
    }
  }

  /**
   * Monitor all active realtime subscriptions
   */
  static monitorSubscriptions(): void {
    console.log('📡 Monitoring active Realtime subscriptions...');
    
    // Log all channels
    const channels = supabase.getChannels();
    console.log(`Active channels: ${channels.length}`);
    
    channels.forEach((channel, index) => {
      console.log(`Channel ${index + 1}:`, {
        topic: channel.topic,
        state: channel.state,
        subTopic: channel.subTopic,
      });
    });

    if (channels.length === 0) {
      console.warn('⚠️ No active realtime channels found!');
    }
  }

  /**
   * Test a specific table for realtime updates
   */
  static testTableRealtime(
    tableName: string,
    testCallback?: () => void
  ): () => void {
    console.log(`🧪 Testing realtime for table: ${tableName}`);

    const channel = supabase
      .channel(`test-${tableName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        (payload) => {
          console.log(`✅ Realtime update received for ${tableName}:`, payload);
          if (testCallback) testCallback();
        }
      )
      .subscribe((status, err) => {
        console.log(`${tableName} subscription status:`, status);
        if (err) {
          console.error(`${tableName} subscription error:`, err);
        }
      });

    // Return cleanup function
    return () => {
      console.log(`🧹 Cleaning up test for ${tableName}`);
      supabase.removeChannel(channel);
    };
  }

  /**
   * Check realtime status for all app tables
   */
  static async checkAllTables(): Promise<void> {
    console.log('🔍 Checking realtime for all app tables...');
    
    const tables = ['profiles', 'intro_requests', 'suggestions', 'info_requests'];
    
    for (const table of tables) {
      const cleanup = this.testTableRealtime(table);
      
      // Keep subscription active for 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
      
      // Cleanup
      cleanup();
    }
  }

  /**
   * Get current realtime connection status
   */
  static getConnectionStatus(): {
    channelCount: number;
    channels: any[];
  } {
    const channels = supabase.getChannels();
    return {
      channelCount: channels.length,
      channels: channels.map((ch) => ({
        topic: ch.topic,
        state: ch.state,
      })),
    };
  }
}

// Export a simple test function that can be called from anywhere
export const testRealtime = async () => {
  console.log('🚀 Starting Realtime Diagnostics...');
  
  // Test connection
  const result = await RealtimeDiagnostics.testConnection();
  console.log('Connection test result:', result);
  
  // Monitor subscriptions
  RealtimeDiagnostics.monitorSubscriptions();
  
  return result;
};

