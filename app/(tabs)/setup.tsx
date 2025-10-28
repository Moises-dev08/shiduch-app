import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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
import MatchmakerSuggestionItem from '../../components/setup/MatchmakerSuggestionItem';
import ReceivedInfoRequestItem from '../../components/setup/ReceivedInfoRequestItem';
import ReceivedSuggestionItem from '../../components/setup/ReceivedSuggestionItem';
import SuggestionHistoryItem from '../../components/setup/SuggestionHistoryItem';
import { useSetupHistory } from '../../hooks/useSetupHistory';
import { Profile, profileService } from '../../lib/profileService';

type TabType = 'sentSuggestions' | 'receivedSuggestions' | 'matchmakerSuggestions' | 'sentRequests' | 'receivedRequests';

export default function SetupScreen() {
  const { 
    suggestions, 
    receivedSuggestions, 
    matchmakerSuggestions,
    infoRequests, 
    receivedInfoRequests, 
    loading, 
    refreshing, 
    error, 
    refresh 
  } = useSetupHistory();
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const role = currentUserProfile?.role;
  const isMatchmaker = role === 'matchmaker';
  const isSingle = role === 'single';
  const isBoth = role === 'both';
  const canSendSuggestions = isSingle || isBoth; // Can send suggestions if single or both
  const canViewMatchmakerSetups = isMatchmaker || isBoth; // Can view matchmaker setups if matchmaker or both
  
  // Set default tab based on user role
  const [activeTab, setActiveTab] = useState<TabType>('sentSuggestions');

  // Get current user profile to check role
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const result = await profileService.getProfile();
    if (result.success && result.profile) {
      setCurrentUserProfile(result.profile);
      // Update active tab based on role
      if (result.profile.role === 'matchmaker') {
        setActiveTab('matchmakerSuggestions');
      } else if (result.profile.role === 'both') {
        setActiveTab('sentSuggestions'); // Start with sent suggestions for 'both'
      }
    }
  };

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

  const hasSentSuggestions = suggestions.length > 0;
  const hasReceivedSuggestions = receivedSuggestions.length > 0;
  const hasMatchmakerSuggestions = matchmakerSuggestions.length > 0;
  const hasSentRequests = infoRequests.length > 0;
  const hasReceivedRequests = receivedInfoRequests.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Set up</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}
        contentContainerStyle={styles.tabContainer}
      >
        {/* Show for single and both users */}
        {canSendSuggestions && (
          <>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'sentSuggestions' && styles.activeTab]}
              onPress={() => setActiveTab('sentSuggestions')}
              activeOpacity={0.7}
            >
              <Ionicons name="paper-plane" size={16} color={activeTab === 'sentSuggestions' ? '#007AFF' : '#999'} />
              <Text style={[styles.tabText, activeTab === 'sentSuggestions' && styles.activeTabText]}>Sent</Text>
              {hasSentSuggestions && <View style={styles.badge}><Text style={styles.badgeText}>{suggestions.length}</Text></View>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'receivedSuggestions' && styles.activeTab]}
              onPress={() => setActiveTab('receivedSuggestions')}
              activeOpacity={0.7}
            >
              <Ionicons name="heart-circle" size={16} color={activeTab === 'receivedSuggestions' ? '#007AFF' : '#999'} />
              <Text style={[styles.tabText, activeTab === 'receivedSuggestions' && styles.activeTabText]}>Received</Text>
              {hasReceivedSuggestions && <View style={styles.badge}><Text style={styles.badgeText}>{receivedSuggestions.length}</Text></View>}
            </TouchableOpacity>
          </>
        )}

        {/* Show for matchmakers and both users */}
        {canViewMatchmakerSetups && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'matchmakerSuggestions' && styles.activeTab]}
            onPress={() => setActiveTab('matchmakerSuggestions')}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={16} color={activeTab === 'matchmakerSuggestions' ? '#007AFF' : '#999'} />
            <Text style={[styles.tabText, activeTab === 'matchmakerSuggestions' && styles.activeTabText]}>Friend&apos;s setups</Text>
            {hasMatchmakerSuggestions && <View style={styles.badge}><Text style={styles.badgeText}>{matchmakerSuggestions.length}</Text></View>}
          </TouchableOpacity>
        )}

        {/* Show for all users */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sentRequests' && styles.activeTab]}
          onPress={() => setActiveTab('sentRequests')}
          activeOpacity={0.7}
        >
          <Ionicons name="information" size={16} color={activeTab === 'sentRequests' ? '#007AFF' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'sentRequests' && styles.activeTabText]}>Profile info requests</Text>
          {hasSentRequests && <View style={styles.badge}><Text style={styles.badgeText}>{infoRequests.length}</Text></View>}
        </TouchableOpacity>

        {/* Info Received - Show for all users */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'receivedRequests' && styles.activeTab]}
          onPress={() => setActiveTab('receivedRequests')}
          activeOpacity={0.7}
        >
          <Ionicons name="mail" size={16} color={activeTab === 'receivedRequests' ? '#007AFF' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'receivedRequests' && styles.activeTabText]}>Requests received</Text>
          {hasReceivedRequests && <View style={styles.badge}><Text style={styles.badgeText}>{receivedInfoRequests.length}</Text></View>}
        </TouchableOpacity>
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#007AFF']} />
        }
      >
        {activeTab === 'sentSuggestions' && (
          <>
            {hasSentSuggestions ? (
              suggestions.map((suggestion) => (
                <SuggestionHistoryItem
                  key={suggestion.id}
                  suggestionId={suggestion.id}
                  profileId={suggestion.suggested_profile?.id || ''}
                  profileName={`${suggestion.suggested_profile?.first_name || 'Unknown'} ${suggestion.suggested_profile?.last_name || 'User'}`}
                  profilePicture={getImageUrl(suggestion.suggested_profile?.pictures)}
                  status={suggestion.status}
                  createdAt={suggestion.created_at}
                  matchmakerName={
                    suggestion.matchmaker
                      ? `${suggestion.matchmaker.first_name} ${suggestion.matchmaker.last_name}`
                      : undefined
                  }
                  suggesterContinuationChoice={suggestion.suggester_continuation_choice}
                  pairedSuggestionId={suggestion.paired_suggestion_id}
                  pairedSuggestionStatus={suggestion.paired_suggestion?.status}
                  onRefresh={refresh}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="paper-plane-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Sent Suggestions</Text>
                <Text style={styles.emptyText}>
                  When you send setup suggestions from viewing profiles, they will appear here.
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'receivedSuggestions' && (
          <>
            {hasReceivedSuggestions ? (
              receivedSuggestions.map((suggestion) => (
                <ReceivedSuggestionItem
                  key={suggestion.id}
                  suggestionId={suggestion.id}
                  suggesterProfileId={suggestion.suggester_profile?.id || ''}
                  suggesterName={`${suggestion.suggester_profile?.first_name || 'Unknown'} ${suggestion.suggester_profile?.last_name || 'User'}`}
                  suggesterPicture={getImageUrl(suggestion.suggester_profile?.pictures)}
                  status={suggestion.status}
                  createdAt={suggestion.created_at}
                  notes={suggestion.notes}
                  suggestedContinuationChoice={suggestion.suggested_continuation_choice}
                  pairedSuggestionId={suggestion.paired_suggestion_id}
                  pairedSuggestionStatus={suggestion.paired_suggestion?.status}
                  onStatusChange={refresh}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="heart-circle-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Received Suggestions</Text>
                <Text style={styles.emptyText}>
                  When others suggest you for a setup, they will appear here.
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'matchmakerSuggestions' && (
          <>
            {hasMatchmakerSuggestions ? (
              matchmakerSuggestions.map((suggestion) => {
                // Determine which side the matchmaker is on
                const matchmakerSide = suggestion.suggester_matchmaker_id === currentUserProfile?.id ? 'suggester' : 'suggested';
                
                // Filter suggester pictures based on privacy settings
                const suggesterPictures = suggestion.suggester_profile?.picture_privacy === 'always' 
                  ? getImageUrl(suggestion.suggester_profile?.pictures)
                  : undefined;
                
                // Filter suggested pictures based on privacy settings
                const suggestedPictures = suggestion.suggested_profile?.picture_privacy === 'always'
                  ? getImageUrl(suggestion.suggested_profile?.pictures)
                  : undefined;
                
                return (
                  <MatchmakerSuggestionItem
                    key={suggestion.id}
                    suggesterName={`${suggestion.suggester_profile?.first_name || 'Unknown'} ${suggestion.suggester_profile?.last_name || 'User'}`}
                    suggesterPicture={suggesterPictures}
                    suggestedName={`${suggestion.suggested_profile?.first_name || 'Unknown'} ${suggestion.suggested_profile?.last_name || 'User'}`}
                    suggestedPicture={suggestedPictures}
                    status={suggestion.status}
                    createdAt={suggestion.created_at}
                    notes={suggestion.notes}
                    suggesterContinuationChoice={suggestion.suggester_continuation_choice}
                    suggestedContinuationChoice={suggestion.suggested_continuation_choice}
                    matchmakerSide={matchmakerSide}
                    suggesterContact={{
                      email: suggestion.suggester_profile?.email,
                      phone: suggestion.suggester_profile?.phone,
                      whatsapp: suggestion.suggester_profile?.whatsapp,
                    }}
                    suggestedContact={{
                      email: suggestion.suggested_profile?.email,
                      phone: suggestion.suggested_profile?.phone,
                      whatsapp: suggestion.suggested_profile?.whatsapp,
                    }}
                    suggesterMatchmakerContact={
                      suggestion.suggester_matchmaker && suggestion.suggester_continuation_choice === 'with_middle_person'
                        ? {
                            name: `${suggestion.suggester_matchmaker.first_name} ${suggestion.suggester_matchmaker.last_name}`,
                            email: suggestion.suggester_matchmaker.email,
                            phone: suggestion.suggester_matchmaker.phone,
                            whatsapp: suggestion.suggester_matchmaker.whatsapp,
                          }
                        : undefined
                    }
                    suggestedMatchmakerContact={
                      suggestion.suggested_matchmaker && suggestion.suggested_continuation_choice === 'with_middle_person'
                        ? {
                            name: `${suggestion.suggested_matchmaker.first_name} ${suggestion.suggested_matchmaker.last_name}`,
                            email: suggestion.suggested_matchmaker.email,
                            phone: suggestion.suggested_matchmaker.phone,
                            whatsapp: suggestion.suggested_matchmaker.whatsapp,
                          }
                        : undefined
                    }
                  />
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Friend&apos;s Suggestions</Text>
                <Text style={styles.emptyText}>
                  Suggestions from your single profiles associated with you as a matchmaker will appear here.
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'sentRequests' && (
          <>
            {hasSentRequests ? (
            <View>
            <Text style={styles.sectionTitle}>See your profile info requests</Text>
              {infoRequests.map((request) => (
                <InfoRequestHistoryItem
                  key={request.id}
                  profileId={request.requested_profile.id}
                  profileName={`${request.requested_profile.first_name} ${request.requested_profile.last_name}`}
                  profilePicture={getImageUrl(request.requested_profile.pictures)}
                  status={request.status}
                  createdAt={request.created_at}
                  message={request.message}
                  />
              ))}
              </View>
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

              <View>
                <Text style={styles.sectionTitle}>Check who requested to see more information from your profile</Text>
              {receivedInfoRequests.map((request) => (
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
              ))}
              </View>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
    marginTop: 8,
    marginBottom: 12,

  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  tabScrollView: {
    display: 'flex',
    backgroundColor: '#fff',
    borderBottomWidth: 1,    borderBottomColor: '#e0e0e0',
   maxHeight: 50,


  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    height: 50
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
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
    height: '100%'
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
