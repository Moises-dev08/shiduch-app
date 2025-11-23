import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import InfoRequestCard from '../../components/connect/InfoRequestCard';
import IntroRequestCard from '../../components/intro/IntroRequestCard';
import MiddlePersonRequestCard from '../../components/intro/MiddlePersonRequestCard';
import MadeSuggestionCard from '../../components/suggestion/MadeSuggestionCard';
import SuggestionCard from '../../components/suggestion/SuggestionCard';
import { useRealtimeInfoRequests } from '../../hooks/useRealtimeInfoRequests';
import { useRealtimeIntroRequests } from '../../hooks/useRealtimeIntroRequests';
import { useRealtimeSuggestions } from '../../hooks/useRealtimeSuggestions';
import { InfoRequest, infoRequestService } from '../../lib/infoRequestService';
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
  const isSilentUpdateRef = React.useRef(false);

  // Real intro requests data
  const [sentIntroRequests, setSentIntroRequests] = useState<IntroRequest[]>([]);
  const [receivedIntroRequests, setReceivedIntroRequests] = useState<IntroRequest[]>([]);
  const [middlePersonRequests, setMiddlePersonRequests] = useState<IntroRequest[]>([]);

  // Suggestions data
  const [receivedSuggestions, setReceivedSuggestions] = useState<Suggestion[]>([]);
  const [madeSuggestions, setMadeSuggestions] = useState<Suggestion[]>([]);

  // Info requests data
  const [receivedInfoRequests, setReceivedInfoRequests] = useState<InfoRequest[]>([]);
  const [sentInfoRequests, setSentInfoRequests] = useState<InfoRequest[]>([]);

  const loadIntroRequests = useCallback(async (silent: boolean = false) => {
    try {
      if (silent) {
        isSilentUpdateRef.current = true;
      }

      const result = await introService.getMyIntroRequests();
      if (result.success) {
        setSentIntroRequests(result.sentRequests || []);
        setReceivedIntroRequests(result.receivedRequests || []);
      }

      // Load Matchmaker/Shadchan requests
      const middleResult = await introService.getMiddlePersonRequests();
      if (middleResult.success) {
        setMiddlePersonRequests(middleResult.middlePersonRequests || []);
      }
    } catch (error) {
      console.error('Error loading intro requests:', error);
    } finally {
      if (silent) {
        isSilentUpdateRef.current = false;
      }
    }
  }, []);

  const loadSuggestions = useCallback(async (silent: boolean = false) => {
    try {
      if (silent) {
        isSilentUpdateRef.current = true;
      }

      const result = await suggestionService.getMySuggestions();
      if (result.success) {
        setReceivedSuggestions(result.receivedSuggestions || []);
        setMadeSuggestions(result.madeSuggestions || []);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      if (silent) {
        isSilentUpdateRef.current = false;
      }
    }
  }, []);

  const loadInfoRequests = useCallback(async (silent: boolean = false) => {
    try {
      if (silent) {
        isSilentUpdateRef.current = true;
      }

      const receivedResult = await infoRequestService.getReceivedRequests();
      if (receivedResult.success) {
        setReceivedInfoRequests(receivedResult.requests || []);
      }

      const sentResult = await infoRequestService.getSentRequests();
      if (sentResult.success) {
        setSentInfoRequests(sentResult.requests || []);
      }
    } catch (error) {
      console.error('Error loading info requests:', error);
    } finally {
      if (silent) {
        isSilentUpdateRef.current = false;
      }
    }
  }, []);

  const loadData = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const result = await profileService.getProfile();
      if (result.success && result.profile) {
        setCurrentUserProfile(result.profile);
        
        // Set default category based on role
        if (result.profile.role === 'matchmaker') {
          setActiveCategory('for_others');
        }
      }
      
      // Load actual intro requests, suggestions, and info requests
      await loadIntroRequests(silent);
      await loadSuggestions(silent);
      await loadInfoRequests(silent);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [loadIntroRequests, loadSuggestions, loadInfoRequests]);

  // Silent refresh callbacks for realtime updates
  const silentRefreshIntroRequests = useCallback(() => loadIntroRequests(true), [loadIntroRequests]);
  const silentRefreshSuggestions = useCallback(() => loadSuggestions(true), [loadSuggestions]);
  const silentRefreshInfoRequests = useCallback(() => loadInfoRequests(true), [loadInfoRequests]);

  // Set up real-time subscriptions with silent updates
  useRealtimeIntroRequests(silentRefreshIntroRequests, currentUserProfile?.id);
  useRealtimeSuggestions(silentRefreshSuggestions, currentUserProfile?.id);
  useRealtimeInfoRequests(silentRefreshInfoRequests, currentUserProfile?.id);

  useEffect(() => {
    loadData(false); // Initial load with loading state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false); // Manual refresh with refreshing state
    setRefreshing(false);
  };

  // Calculate notification counts for badges
  const forYouBadgeCount = useMemo(() => {
    let count = 0;
    
    // Count received info requests needing response
    count += receivedInfoRequests.filter(r => r.status === 'pending').length;
    
    // Count received intro requests needing response
    count += receivedIntroRequests.filter(r => 
      r.status === 'pending' || 
      (r.status === 'accepted' && (!r.requested_continuation_choice || !r.requester_continuation_choice))
    ).length;
    
    // Count sent intro requests needing continuation choice
    count += sentIntroRequests.filter(r => 
      r.status === 'accepted' && 
      (!r.requester_continuation_choice || !r.requested_continuation_choice)
    ).length;
    
    // Count received suggestions needing response
    if (currentUserProfile) {
      count += receivedSuggestions.filter(s => 
        s.status === 'pending' || 
        (s.status === 'accepted' && (
          (s.profile_one_id === currentUserProfile.id && !s.profile_one_continuation_choice) ||
          (s.profile_two_id === currentUserProfile.id && !s.profile_two_continuation_choice)
        ))
      ).length;
    }
    
    return count;
  }, [receivedInfoRequests, receivedIntroRequests, sentIntroRequests, receivedSuggestions, currentUserProfile]);

  const forOthersBadgeCount = useMemo(() => {
    let count = 0;
    
    // Count Matchmaker/Shadchan requests needing action (for matchmakers)
    if (currentUserProfile?.role === 'matchmaker') {
      count += middlePersonRequests.filter(r => 
        r.status === 'pending' || 
        (r.status === 'accepted' && (!r.requester_continuation_choice || !r.requested_continuation_choice))
      ).length;
    }
    
    // Count made suggestions awaiting response
    count += madeSuggestions.filter(s => 
      s.status === 'pending' || 
      (s.status === 'accepted' && (!s.profile_one_continuation_choice || !s.profile_two_continuation_choice))
    ).length;
    
    return count;
  }, [middlePersonRequests, madeSuggestions, currentUserProfile]);

  const renderEmptyState = (section: string) => {
    const emptyStates = {
      action_needed: {
        icon: 'notifications-outline',
        title: 'No Actions Needed',
        message: 'You\'re all caught up! ✨ Check back later for new intro requests.',
      },
      matches: {
        icon: 'heart-circle-outline',
        title: 'No Matches Yet',
        message: 'When both parties accept an intro request, your matches will appear here. 💕',
      },
      passed: {
        icon: 'close-circle-outline',
        title: 'No Declined Requests',
        message: 'Intro requests that were declined will appear here.',
      },
      liked: {
        icon: 'heart-outline',
        title: 'No Liked Profiles',
        message: 'Profiles you like will appear here showing their response status. ❤️',
      },
      for_others: {
        icon: 'people-outline',
        title: 'For Others',
        message: 'This section is coming soon. 👥',
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
            <View style={styles.categoryTabContent}>
              <Text style={[styles.categoryTabText, activeCategory === 'for_you' && styles.categoryTabTextActive]}>
                For You
              </Text>
              {forYouBadgeCount > 0 && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{forYouBadgeCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.categoryTab, activeCategory === 'for_others' && styles.categoryTabActive]}
            onPress={() => setActiveCategory('for_others')}
          >
            <View style={styles.categoryTabContent}>
              <Text style={[styles.categoryTabText, activeCategory === 'for_others' && styles.categoryTabTextActive]}>
                For Others
              </Text>
              {forOthersBadgeCount > 0 && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{forOthersBadgeCount}</Text>
                </View>
              )}
            </View>
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
              color={activeSection === 'action_needed' ? '#03a9f4' : '#999'} 
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
                ).length +
                receivedInfoRequests.filter(r => r.status === 'pending').length;
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
              color={activeSection === 'matches' ? '#03a9f4' : '#999'} 
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
              color={activeSection === 'passed' ? '#03a9f4' : '#999'} 
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
              color={activeSection === 'liked' ? '#03a9f4' : '#999'} 
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
              color={activeForOthersSection === 'awaiting' ? '#03a9f4' : '#999'} 
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
              color={activeForOthersSection === 'matched' ? '#03a9f4' : '#999'} 
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
              color={activeForOthersSection === 'not_matched' ? '#03a9f4' : '#999'} 
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#03a9f4']} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#03a9f4" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
        {/* Intro Requests Section - Action Needed */}
        {activeCategory === 'for_you' && activeSection === 'action_needed' && (
          <>
            {/* Received Info Requests (need response) */}
            {receivedInfoRequests
              .filter(r => r.status === 'pending')
              .map(request => (
                <InfoRequestCard
                  key={request.id}
                  request={request}
                  onUpdate={loadInfoRequests}
                />
              ))}

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

        {/* Empty state when no intro requests, suggestions, or info requests */}
        {activeCategory === 'for_you' && activeSection === 'action_needed' &&
         receivedInfoRequests.filter(r => r.status === 'pending').length === 0 &&
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
                  Matches you&apos;re facilitating will appear here once they need responses. ⏳
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
                  Successful matches you&apos;ve facilitated will appear here. 💕
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
    borderBottomColor: '#03a9f4',
  },
  categoryTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
  },
  categoryTabTextActive: {
    color: '#03a9f4',
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: '#03a9f4',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    marginVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    gap: 6,
  },
  sectionTabActive: {
    backgroundColor: '#e1f5fe',
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  sectionTabTextActive: {
    color: '#03a9f4',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#03a9f4',
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

