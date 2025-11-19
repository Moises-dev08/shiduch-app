/**
 * Debug screen for testing Realtime functionality
 * Access this via /debug-realtime route
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RealtimeDiagnostics } from '../lib/realtimeDiagnostics';

export default function DebugRealtimeScreen() {
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [activeChannels, setActiveChannels] = useState<any>({ channelCount: 0, channels: [] });
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults((prev) => [`[${timestamp}] ${message}`, ...prev]);
  };

  const runConnectionTest = async () => {
    setTesting(true);
    addLog('Starting connection test...');
    
    const result = await RealtimeDiagnostics.testConnection();
    setConnectionStatus(result);
    
    addLog(`Connection test: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    addLog(result.message);
    
    setTesting(false);
  };

  const checkActiveChannels = () => {
    addLog('Checking active channels...');
    const status = RealtimeDiagnostics.getConnectionStatus();
    setActiveChannels(status);
    addLog(`Found ${status.channelCount} active channels`);
    
    status.channels.forEach((ch, i) => {
      addLog(`  ${i + 1}. ${ch.topic} - ${ch.state}`);
    });
  };

  const testTableRealtime = (tableName: string) => {
    addLog(`Testing realtime for ${tableName}...`);
    
    const cleanup = RealtimeDiagnostics.testTableRealtime(tableName, () => {
      addLog(`✅ Received realtime update for ${tableName}!`);
    });

    // Auto cleanup after 10 seconds
    setTimeout(() => {
      cleanup();
      addLog(`Stopped monitoring ${tableName}`);
    }, 10000);
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  useEffect(() => {
    // Monitor channels on mount
    const interval = setInterval(() => {
      const status = RealtimeDiagnostics.getConnectionStatus();
      setActiveChannels(status);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Realtime Diagnostics</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <TouchableOpacity
            style={[styles.button, testing && styles.buttonDisabled]}
            onPress={runConnectionTest}
            disabled={testing}
          >
            <Ionicons name="wifi" size={20} color="#fff" />
            <Text style={styles.buttonText}>
              {testing ? 'Testing...' : 'Test Connection'}
            </Text>
          </TouchableOpacity>

          {connectionStatus && (
            <View
              style={[
                styles.statusCard,
                connectionStatus.success ? styles.statusSuccess : styles.statusError,
              ]}
            >
              <Text style={styles.statusText}>
                {connectionStatus.success ? '✅ Connected' : '❌ Not Connected'}
              </Text>
              <Text style={styles.statusMessage}>{connectionStatus.message}</Text>
            </View>
          )}
        </View>

        {/* Active Channels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Active Channels ({activeChannels.channelCount})
          </Text>
          <TouchableOpacity style={styles.button} onPress={checkActiveChannels}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.buttonText}>Refresh Channels</Text>
          </TouchableOpacity>

          {activeChannels.channels.map((channel: any, index: number) => (
            <View key={index} style={styles.channelCard}>
              <Text style={styles.channelTopic}>{channel.topic}</Text>
              <Text style={styles.channelState}>State: {channel.state}</Text>
            </View>
          ))}

          {activeChannels.channelCount === 0 && (
            <Text style={styles.emptyText}>No active channels</Text>
          )}
        </View>

        {/* Test Individual Tables */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Tables</Text>
          <Text style={styles.hint}>
            These tests will monitor for 10 seconds. Make changes in the database to see updates.
          </Text>

          {['profiles', 'intro_requests', 'suggestions', 'info_requests'].map((table) => (
            <TouchableOpacity
              key={table}
              style={styles.tableButton}
              onPress={() => testTableRealtime(table)}
            >
              <Ionicons name="play-circle" size={20} color="#e91e63" />
              <Text style={styles.tableButtonText}>{table}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Test Logs */}
        <View style={styles.section}>
          <View style={styles.logsHeader}>
            <Text style={styles.sectionTitle}>Logs</Text>
            <TouchableOpacity onPress={clearLogs}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logsContainer}>
            {testResults.length === 0 ? (
              <Text style={styles.emptyText}>No logs yet</Text>
            ) : (
              testResults.map((log, index) => (
                <Text key={index} style={styles.logText}>
                  {log}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e91e63',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  statusSuccess: {
    backgroundColor: '#e8f5e9',
  },
  statusError: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: '#666',
  },
  channelCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  channelTopic: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  channelState: {
    fontSize: 12,
    color: '#666',
  },
  tableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
    gap: 8,
  },
  tableButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearText: {
    color: '#e91e63',
    fontSize: 14,
    fontWeight: '600',
  },
  logsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    maxHeight: 300,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
});

