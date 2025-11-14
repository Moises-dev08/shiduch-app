import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
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
import IntroRequestCard from '../../components/intro/IntroRequestCard';
import MiddlePersonRequestCard from '../../components/intro/MiddlePersonRequestCard';
import MadeSuggestionCard from '../../components/suggestion/MadeSuggestionCard';
import SuggestionCard from '../../components/suggestion/SuggestionCard';
import { useRealtimeIntroRequests } from '../../hooks/useRealtimeIntroRequests';
import { useRealtimeSuggestions } from '../../hooks/useRealtimeSuggestions';
import { IntroRequest, introService } from '../../lib/introService';
import { Profile, profileService } from '../../lib/profileService';
import { Suggestion, suggestionService } from '../../lib/suggestionService';

export default function ConnectScreen() {
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'for_you' | 'for_others'>('for_you');
  const [activeSection, setActiveSection] = useState<'action_needed' | 'matches' | 'passed' | 'liked'>('action_needed');
  const [activeForOthersSection, setActiveForOthersSection] = useState<'awaiting' | 'matched' | 'not_matched'>('awaiting');

  // Real intro requests data
  const [sentIntroRequests, setSentIntroRequests] = useState<IntroRequest[]>([]);
  const [receivedIntroRequests, setReceivedIntroRequests] = useState<IntroRequest[]>([]);
  const [middlePersonRequests, setMiddlePersonRequests] = useState<IntroRequest[]>([]);

  // Suggestions data
  const [receivedSuggestions, setReceivedSuggestions] = useState<Suggestion[]>([]);
  const [madeSuggestions, setMadeSuggestions] = useState<Suggestion[]>([]);

  const loadIntroRequests = useCallback(async () => {
    try {
      const result = await introService.getMyIntroRequests();
      if (result.success) {
        setSentIntroRequests(result.sentRequests || []);
        setReceivedIntroRequests(result.receivedRequests || []);
      }

      // Load middle person requests
      const middleResult = await introService.getMiddlePersonRequests();
      if (middleResult.success) {
        setMiddlePersonRequests(middleResult.middlePersonRequests || []);
      }
    } catch (error) {
      console.error('Error loading intro requests:', error);
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      const result = await suggestionService.getMySuggestions();
      if (result.success) {
        setReceivedSuggestions(result.receivedSuggestions || []);
        setMadeSuggestions(result.madeSuggestions || []);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await profileService.getProfile();
      if (result.success && result.profile) {
        setCurrentUserProfile(result.profile);
        
        // Set default category based on role
        if (result.profile.role === 'matchmaker') {
          setActiveCategory('for_others');
        }
      }
      
      // Load actual intro requests and suggestions
      await loadIntroRequests();
      await loadSuggestions();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [loadIntroRequests, loadSuggestions]);

  // Set up real-time subscription for intro requests and suggestions
  useRealtimeIntroRequests(loadIntroRequests, currentUserProfile?.id);
  useRealtimeSuggestions(loadSuggestions, currentUserProfile?.id);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };




  const renderEmptyState = (section: string) => {
    const emptyStates = {
      action_needed: {
        icon: 'notifications-outline',
        title: 'No Actions Needed',
        message: 'You\'re all caught up! Check back later for new intro requests.',
      },
      matches: {
        icon: 'heart-circle-outline',
        title: 'No Matches Yet',
        message: 'When both parties accept an intro request, your matches will appear here.',
      },
      passed: {
        icon: 'close-circle-outline',
        title: 'No Declined Requests',
        message: 'Intro requests that were declined will appear here.',
      },
      liked: {
        icon: 'heart-outline',
        title: 'No Liked Profiles',
        message: 'Profiles you like will appear here showing their response status (pending, accepted, or declined).',
      },
      for_others: {
        icon: 'people-outline',
        title: 'For Others',
        message: 'This section is coming soon.',
      },
    };

    const state = emptyStates[section as keyof typeof emptyStates] || emptyStates.action_needed;

    return (
      <View style={styles.emptyState}>
        <Ionicons name={state.icon as any} size={64} color="#ccc" />
        <Text style={styles.emptyStateTitle}>{state.title}</Text>
        <Text style={styles.emptyStateMessage}>{state.message}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e91e63" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSingle = currentUserProfile?.role === 'single';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Connect</Text>
      </View>

      {/* Category Tabs (only for singles) */}
      {isSingle && (
        <View style={styles.categoryTabs}>
          <TouchableOpacity
            style={[styles.categoryTab, activeCategory === 'for_you' && styles.categoryTabActive]}
            onPress={() => setActiveCategory('for_you')}
          >
            <Text style={[styles.categoryTabText, activeCategory === 'for_you' && styles.categoryTabTextActive]}>
              For You
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.categoryTab, activeCategory === 'for_others' && styles.categoryTabActive]}
            onPress={() => setActiveCategory('for_others')}
          >
            <Text style={[styles.categoryTabText, activeCategory === 'for_others' && styles.categoryTabTextActive]}>
              For Others
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Section Tabs */}
      {activeCategory === 'for_you' && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.sectionTabs}
          contentContainerStyle={styles.sectionTabsContent}
        >
          <TouchableOpacity
            style={[styles.sectionTab, activeSection === 'action_needed' && styles.sectionTabActive]}
            onPress={() => setActiveSection('action_needed')}
          >
            <Ionicons 
              name="notifications" 
              size={18} 
              color={activeSection === 'action_needed' ? '#e91e63' : '#999'} 
            />
            <Text style={[styles.sectionTabText, activeSection === 'action_needed' && styles.sectionTabTextActive]}>
              Action Needed
            </Text>
            {(() => {
              const actionCount = 
                receivedIntroRequests.filter(r => 
                  r.status === 'pending' || 
                  (r.status === 'accepted' && (!r.requested_continuation_choice || !r.requester_continuation_choice))
                ).length +
                sentIntroRequests.filter(r => 
                  r.status === 'accepted' && 
                  (!r.requester_continuation_choice || !r.requested_continuation_choice)
                ).length;
              return actionCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{actionCount}</Text>
                </View>
              );
            })()}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionTab, activeSection === 'matches' && styles.sectionTabActive]}
            onPress={() => setActiveSection('matches')}
          >
            <Ionicons 
              name="heart-circle" 
              size={18} 
              color={activeSection === 'matches' ? '#e91e63' : '#999'} 
            />
            <Text style={[styles.sectionTabText, activeSection === 'matches' && styles.sectionTabTextActive]}>
              Matches
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionTab, activeSection === 'passed' && styles.sectionTabActive]}
            onPress={() => setActiveSection('passed')}
          >
            <Ionicons 
              name="close-circle" 
              size={18} 
              color={activeSection === 'passed' ? '#e91e63' : '#999'} 
            />
            <Text style={[styles.sectionTabText, activeSection === 'passed' && styles.sectionTabTextActive]}>
              Passed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionTab, activeSection === 'liked' && styles.sectionTabActive]}
            onPress={() => setActiveSection('liked')}
          >
            <Ionicons 
              name="heart" 
              size={18} 
              color={activeSection === 'liked' ? '#e91e63' : '#999'} 
            />
            <Text style={[styles.sectionTabText, activeSection === 'liked' && styles.sectionTabTextActive]}>
              You Liked
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* For Others Section Tabs */}
      {activeCategory === 'for_others' && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.sectionTabs}
          contentContainerStyle={styles.sectionTabsContent}
        >
          <TouchableOpacity
            style={[styles.sectionTab, activeForOthersSection === 'awaiting' && styles.sectionTabActive]}
            onPress={() => setActiveForOthersSection('awaiting')}
          >
            <Ionicons 
              name="time" 
              size={18} 
              color={activeForOthersSection === 'awaiting' ? '#e91e63' : '#999'} 
            />
            <Text style={[styles.sectionTabText, activeForOthersSection === 'awaiting' && styles.sectionTabTextActive]}>
              Awaiting Response
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionTab, activeForOthersSection === 'matched' && styles.sectionTabActive]}
            onPress={() => setActiveForOthersSection('matched')}
          >
            <Ionicons 
              name="heart" 
              size={18} 
              color={activeForOthersSection === 'matched' ? '#e91e63' : '#999'} 
            />
            <Text style={[styles.sectionTabText, activeForOthersSection === 'matched' && styles.sectionTabTextActive]}>
              Matched
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionTab, activeForOthersSection === 'not_matched' && styles.sectionTabActive]}
            onPress={() => setActiveForOthersSection('not_matched')}
          >
            <Ionicons 
              name="close-circle" 
              size={18} 
              color={activeForOthersSection === 'not_matched' ? '#e91e63' : '#999'} 
            />
            <Text style={[styles.sectionTabText, activeForOthersSection === 'not_matched' && styles.sectionTabTextActive]}>
              Did Not Match
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e91e63']} />
        }
      >
        {/* Intro Requests Section - Action Needed */}
        {activeCategory === 'for_you' && activeSection === 'action_needed' && (
          <>
            {/* Received Intro Requests (need response OR need continuation choice) */}
            {receivedIntroRequests
              .filter(r => 
                r.status === 'pending' || 
                (r.status === 'accepted' && (!r.requested_continuation_choice || !r.requester_continuation_choice))
              )
              .map(request => (
                <IntroRequestCard
                  key={request.id}
                  request={request}
                  isRequester={false}
                  onUpdate={loadIntroRequests}
                  isActionNeeded={true}
                />
              ))}

            {/* Sent Intro Requests (need to choose continuation) */}
            {sentIntroRequests
              .filter(r => 
                r.status === 'accepted' && 
                (!r.requester_continuation_choice || !r.requested_continuation_choice)
              )
              .map(request => (
                <IntroRequestCard
                  key={request.id}
                  request={request}
                  isRequester={true}
                  onUpdate={loadIntroRequests}
                  isActionNeeded={true}
                />
              ))}

            {/* Received Suggestions (need response OR need continuation choice) */}
            {currentUserProfile && receivedSuggestions
              .filter(s => 
                s.status === 'pending' || 
                (s.status === 'accepted' && (
                  (s.profile_one_id === currentUserProfile.id && !s.profile_one_continuation_choice) ||
                  (s.profile_two_id === currentUserProfile.id && !s.profile_two_continuation_choice)
                ))
              )
              .map(suggestion => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  currentProfileId={currentUserProfile.id}
                  onUpdate={loadSuggestions}
                  isActionNeeded={true}
                />
              ))}
          </>
        )}

        {/* Show accepted and completed requests in Matches section */}
        {activeCategory === 'for_you' && activeSection === 'matches' && (
          <>
            {sentIntroRequests
              .filter(r => r.status === 'accepted' || r.status === 'completed')
              .map(request => (
                <IntroRequestCard
                  key={request.id}
                  request={request}
                  isRequester={true}
                  onUpdate={loadIntroRequests}
                />
              ))}

            {receivedIntroRequests
              .filter(r => r.status === 'accepted' || r.status === 'completed')
              .map(request => (
                <IntroRequestCard
                  key={request.id}
                  request={request}
                  isRequester={false}
                  onUpdate={loadIntroRequests}
                />
              ))}

            {/* Show matched suggestions */}
            {currentUserProfile && receivedSuggestions
              .filter(s => s.status === 'accepted' || s.status === 'completed')
              .map(suggestion => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  currentProfileId={currentUserProfile.id}
                  onUpdate={loadSuggestions}
                />
              ))}
          </>
        )}

        {/* Show profiles you liked in You Liked section (all statuses except completed) */}
        {activeCategory === 'for_you' && activeSection === 'liked' && (
          <>
            {sentIntroRequests
              .filter(r => r.status !== 'completed')
              .map(request => (
                <IntroRequestCard
                  key={request.id}
                  request={request}
                  isRequester={true}
                  onUpdate={loadIntroRequests}
                />
              ))}
          </>
        )}

        {/* Show rejected requests in Passed section */}
        {activeCategory === 'for_you' && activeSection === 'passed' && (
          <>
            {sentIntroRequests
              .filter(r => r.status === 'rejected')
              .map(request => (
                <IntroRequestCard
                  key={request.id}
                  request={request}
                  isRequester={true}
                  onUpdate={loadIntroRequests}
                />
              ))}

            {receivedIntroRequests
              .filter(r => r.status === 'rejected')
              .map(request => (
                <IntroRequestCard
                  key={request.id}
                  request={request}
                  isRequester={false}
                  onUpdate={loadIntroRequests}
                />
              ))}

            {/* Show rejected suggestions */}
            {currentUserProfile && receivedSuggestions
              .filter(s => s.status === 'rejected')
              .map(suggestion => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  currentProfileId={currentUserProfile.id}
                  onUpdate={loadSuggestions}
                />
              ))}
          </>
        )}

        {/* Empty state when no intro requests or suggestions */}
        {activeCategory === 'for_you' && activeSection === 'action_needed' &&
         sentIntroRequests.filter(r => r.status === 'accepted' && (!r.requester_continuation_choice || !r.requested_continuation_choice)).length === 0 &&
         receivedIntroRequests.filter(r => r.status === 'pending' || (r.status === 'accepted' && (!r.requested_continuation_choice || !r.requester_continuation_choice))).length === 0 &&
         receivedSuggestions.filter(s => 
           s.status === 'pending' || 
           (s.status === 'accepted' && (
             (currentUserProfile && s.profile_one_id === currentUserProfile.id && !s.profile_one_continuation_choice) ||
             (currentUserProfile && s.profile_two_id === currentUserProfile.id && !s.profile_two_continuation_choice)
           ))
         ).length === 0 &&
         renderEmptyState(activeSection)}

        {activeCategory === 'for_you' && activeSection === 'matches' &&
         sentIntroRequests.filter(r => r.status === 'accepted' || r.status === 'completed').length === 0 &&
         receivedIntroRequests.filter(r => r.status === 'accepted' || r.status === 'completed').length === 0 &&
         receivedSuggestions.filter(s => s.status === 'accepted' || s.status === 'completed').length === 0 &&
         renderEmptyState(activeSection)}

        {activeCategory === 'for_you' && activeSection === 'liked' &&
         sentIntroRequests.filter(r => r.status !== 'completed').length === 0 &&
         renderEmptyState(activeSection)}

        {activeCategory === 'for_you' && activeSection === 'passed' &&
         sentIntroRequests.filter(r => r.status === 'rejected').length === 0 &&
         receivedIntroRequests.filter(r => r.status === 'rejected').length === 0 &&
         receivedSuggestions.filter(s => s.status === 'rejected').length === 0 &&
         renderEmptyState(activeSection)}

        {/* For Others - Awaiting Response */}
        {activeCategory === 'for_others' && activeForOthersSection === 'awaiting' && (
          <>
            {/* Show intro requests for matchmakers */}
            {currentUserProfile?.role === 'matchmaker' && middlePersonRequests
              .filter(r => 
                r.status === 'pending' || 
                (r.status === 'accepted' && (!r.requester_continuation_choice || !r.requested_continuation_choice))
              )
              .map(request => (
                <MiddlePersonRequestCard
                  key={request.id}
                  request={request}
                  currentUserProfileId={currentUserProfile?.id}
                />
              ))}

            {/* Show suggestions (both singles and matchmakers) */}
            {currentUserProfile && madeSuggestions
              .filter(s => 
                s.status === 'pending' || 
                (s.status === 'accepted' && (!s.profile_one_continuation_choice || !s.profile_two_continuation_choice))
              )
              .map(suggestion => (
                <MadeSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                />
              ))}

            {/* Empty state */}
            {((currentUserProfile?.role === 'matchmaker' && middlePersonRequests.filter(r => 
                r.status === 'pending' || 
                (r.status === 'accepted' && (!r.requester_continuation_choice || !r.requested_continuation_choice))
              ).length === 0) || currentUserProfile?.role !== 'matchmaker') &&
             madeSuggestions.filter(s => 
                s.status === 'pending' || 
                (s.status === 'accepted' && (!s.profile_one_continuation_choice || !s.profile_two_continuation_choice))
             ).length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateTitle}>No Pending Matches</Text>
                <Text style={styles.emptyStateMessage}>
                  Matches you&apos;re facilitating will appear here once they need responses.
                </Text>
              </View>
            )}
          </>
        )}

        {/* For Others - Matched */}
        {activeCategory === 'for_others' && activeForOthersSection === 'matched' && (
          <>
            {/* Show intro requests for matchmakers */}
            {currentUserProfile?.role === 'matchmaker' && middlePersonRequests
              .filter(r => 
                r.status === 'completed' || 
                (r.status === 'accepted' && r.requester_continuation_choice && r.requested_continuation_choice)
              )
              .map(request => (
                <MiddlePersonRequestCard
                  key={request.id}
                  request={request}
                  currentUserProfileId={currentUserProfile?.id}
                />
              ))}

            {/* Show suggestions (both singles and matchmakers) */}
            {currentUserProfile && madeSuggestions
              .filter(s => 
                s.status === 'completed' || 
                (s.status === 'accepted' && s.profile_one_continuation_choice && s.profile_two_continuation_choice)
              )
              .map(suggestion => (
                <MadeSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                />
              ))}

            {/* Empty state */}
            {((currentUserProfile?.role === 'matchmaker' && middlePersonRequests.filter(r => 
                r.status === 'completed' || 
                (r.status === 'accepted' && r.requester_continuation_choice && r.requested_continuation_choice)
              ).length === 0) || currentUserProfile?.role !== 'matchmaker') &&
             madeSuggestions.filter(s => 
                s.status === 'completed' || 
                (s.status === 'accepted' && s.profile_one_continuation_choice && s.profile_two_continuation_choice)
             ).length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="heart-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateTitle}>No Matches Yet</Text>
                <Text style={styles.emptyStateMessage}>
                  Successful matches you&apos;ve facilitated will appear here.
                </Text>
              </View>
            )}
          </>
        )}

        {/* For Others - Did Not Match */}
        {activeCategory === 'for_others' && activeForOthersSection === 'not_matched' && (
          <>
            {/* Show intro requests for matchmakers */}
            {currentUserProfile?.role === 'matchmaker' && middlePersonRequests
              .filter(r => r.status === 'rejected')
              .map(request => (
                <MiddlePersonRequestCard
                  key={request.id}
                  request={request}
                  currentUserProfileId={currentUserProfile?.id}
                />
              ))}

            {/* Show suggestions (both singles and matchmakers) */}
            {currentUserProfile && madeSuggestions
              .filter(s => s.status === 'rejected')
              .map(suggestion => (
                <MadeSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                />
              ))}

            {/* Empty state */}
            {((currentUserProfile?.role === 'matchmaker' && middlePersonRequests.filter(r => r.status === 'rejected').length === 0) || currentUserProfile?.role !== 'matchmaker') &&
             madeSuggestions.filter(s => s.status === 'rejected').length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="close-circle-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateTitle}>No Declined Matches</Text>
                <Text style={styles.emptyStateMessage}>
                  Matches that didn&apos;t work out will appear here.
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
  categoryTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  categoryTabActive: {
    borderBottomColor: '#e91e63',
  },
  categoryTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
  },
  categoryTabTextActive: {
    color: '#e91e63',
    fontWeight: '600',
  },
  sectionTabs: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    maxHeight: 56,
  },
  sectionTabsContent: {
    paddingHorizontal: 12,
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    gap: 6,
  },
  sectionTabActive: {
    backgroundColor: '#ffe4f0',
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  sectionTabTextActive: {
    color: '#e91e63',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#e91e63',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});

