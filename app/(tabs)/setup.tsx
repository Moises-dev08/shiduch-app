import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InfoRequestHistoryItem from '../../components/setup/InfoRequestHistoryItem';
import ReceivedInfoRequestItem from '../../components/setup/ReceivedInfoRequestItem';
import SuggestionHistoryItem from '../../components/setup/SuggestionHistoryItem';
import { useSetupHistory } from '../../hooks/useSetupHistory';
import { profileService } from '../../lib/profileService';

type TabType = 'suggestions' | 'sentRequests' | 'receivedRequests';

export default function SetupScreen() {
  const { suggestions, infoRequests, receivedInfoRequests, loading, refreshing, error, refresh } = useSetupHistory();
  const [activeTab, setActiveTab] = useState<TabType>('suggestions');

  const getImageUrl = (pictures: any): string | undefined => {
    if (!pictures || !Array.isArray(pictures) || pictures.length === 0) {
      return undefined;
    }
    const firstPicture = pictures[0];
    if (typeof firstPicture === 'string') {
      return profileService.getImageUrl(firstPicture);
    }
    return undefined;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refresh()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasSuggestions = suggestions.length > 0;
  const hasSentRequests = infoRequests.length > 0;
  const hasReceivedRequests = receivedInfoRequests.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suggestions' && styles.activeTab]}
          onPress={() => setActiveTab('suggestions')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="heart"
            size={18}
            color={activeTab === 'suggestions' ? '#007AFF' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'suggestions' && styles.activeTabText]}>
            Setups
          </Text>
          {hasSuggestions && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{suggestions.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sentRequests' && styles.activeTab]}
          onPress={() => setActiveTab('sentRequests')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-forward-circle"
            size={18}
            color={activeTab === 'sentRequests' ? '#007AFF' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'sentRequests' && styles.activeTabText]}>
            Sent
          </Text>
          {hasSentRequests && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{infoRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'receivedRequests' && styles.activeTab]}
          onPress={() => setActiveTab('receivedRequests')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-down-circle"
            size={18}
            color={activeTab === 'receivedRequests' ? '#007AFF' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'receivedRequests' && styles.activeTabText]}>
            Received
          </Text>
          {hasReceivedRequests && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{receivedInfoRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#007AFF']} />
        }
      >
        {activeTab === 'suggestions' && (
          <>
            {hasSuggestions ? (
              suggestions.map((suggestion) => (
                <SuggestionHistoryItem
                  key={suggestion.id}
                  profileName={`${suggestion.suggested_profile.first_name} ${suggestion.suggested_profile.last_name}`}
                  profilePicture={getImageUrl(suggestion.suggested_profile.pictures)}
                  status={suggestion.status}
                  createdAt={suggestion.created_at}
                  matchmakerName={
                    suggestion.matchmaker
                      ? `${suggestion.matchmaker.first_name} ${suggestion.matchmaker.last_name}`
                      : undefined
                  }
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="heart-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Suggestions Yet</Text>
                <Text style={styles.emptyText}>
                  When you send setup suggestions, they will appear here.
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'sentRequests' && (
          <>
            {hasSentRequests ? (
              infoRequests.map((request) => (
                <InfoRequestHistoryItem
                  key={request.id}
                  profileName={`${request.requested_profile.first_name} ${request.requested_profile.last_name}`}
                  profilePicture={getImageUrl(request.requested_profile.pictures)}
                  status={request.status}
                  createdAt={request.created_at}
                  message={request.message}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="arrow-forward-circle-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Sent Requests</Text>
                <Text style={styles.emptyText}>
                  When you request more information from profiles, they will appear here.
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'receivedRequests' && (
          <>
            {hasReceivedRequests ? (
              receivedInfoRequests.map((request) => (
                <ReceivedInfoRequestItem
                  key={request.id}
                  requestId={request.id}
                  requesterName={`${request.requested_profile.first_name} ${request.requested_profile.last_name}`}
                  requesterPicture={getImageUrl(request.requested_profile.pictures)}
                  status={request.status}
                  createdAt={request.created_at}
                  message={request.message}
                  onStatusUpdate={refresh}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="arrow-down-circle-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Received Requests</Text>
                <Text style={styles.emptyText}>
                  When others request more information from your profile, they will appear here.
                </Text>
              </View>
            )}
          </>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
