import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
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
import ApprovedInfoRequestCard from '../../components/connect/ApprovedInfoRequestCard';
import InfoRequestCard from '../../components/connect/InfoRequestCard';
import IntroRequestCard from '../../components/intro/IntroRequestCard';
import MatchmakerRequestCard from '../../components/intro/MatchmakerRequestCard';
import MadeSuggestionCard from '../../components/suggestion/MadeSuggestionCard';
import SuggestionCard from '../../components/suggestion/SuggestionCard';
import { useRealtimeInfoRequests } from '../../hooks/useRealtimeInfoRequests';
import { useRealtimeIntroRequests } from '../../hooks/useRealtimeIntroRequests';
import { useRealtimeSuggestions } from '../../hooks/useRealtimeSuggestions';
import { InfoRequest, infoRequestService } from '../../lib/infoRequestService';
import { IntroRequest, introService } from '../../lib/introService';
import { Profile, profileService } from '../../lib/profileService';
import { Suggestion, suggestionService } from '../../lib/suggestionService';
import { viewedNotificationService } from '../../lib/viewedNotificationService';

export default function ConnectScreen() {
  const params = useLocalSearchParams();
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'for_you' | 'for_others'>('for_you');
  // Initialize activeSection from params if provided, otherwise default to 'action_needed'
  const [activeSection, setActiveSection] = useState<'action_needed' | 'matches' | 'passed' | 'liked'>(
    (params.section as 'action_needed' | 'matches' | 'passed' | 'liked') || 'action_needed'
  );
  const [activeForOthersSection, setActiveForOthersSection] = useState<'awaiting' | 'matched' | 'not_matched'>('awaiting');
  const isSilentUpdateRef = React.useRef(false);

  // State for tracking last viewed matches timestamp for matchmakers
  const [lastViewedMatchesForOthersAt, setLastViewedMatchesForOthersAt] = useState<Date | null>(null);

  // Real intro requests data
  const [sentIntroRequests, setSentIntroRequests] = useState<IntroRequest[]>([]);
  const [receivedIntroRequests, setReceivedIntroRequests] = useState<IntroRequest[]>([]);
  const [matchmakerRequests, setMatchmakerRequests] = useState<IntroRequest[]>([]);

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

      // Parallelize intro requests and matchmaker requests
      const [result, matchmakerResult] = await Promise.all([
        introService.getMyIntroRequests(),
        introService.getMatchmakerRequests(),
      ]);

      if (result.success) {
        setSentIntroRequests(result.sentRequests || []);
        setReceivedIntroRequests(result.receivedRequests || []);
      }

      if (matchmakerResult.success) {
        setMatchmakerRequests(matchmakerResult.matchmakerRequests || []);
        console.log('Loaded matchmaker requests:', matchmakerResult.matchmakerRequests?.length || 0);
      } else {
        console.error('Error loading matchmaker requests:', matchmakerResult.error);
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

      // Parallelize received and sent info requests
      const [receivedResult, sentResult] = await Promise.all([
        infoRequestService.getReceivedRequests(),
        infoRequestService.getSentRequests(),
      ]);

      if (receivedResult.success) {
        setReceivedInfoRequests(receivedResult.requests || []);
      }

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

  // Mark intro requests and suggestions as viewed when user views the "Action Needed" section
  useEffect(() => {
    if (activeCategory === 'for_you' && activeSection === 'action_needed' && !loading) {
      // Mark intro requests as viewed when section is displayed
      profileService.markIntroRequestsAsViewed().then(() => {
        // Reload intro requests to get updated data
        loadIntroRequests(true);
      });
      
      // Mark suggestions as viewed when section is displayed
      profileService.markSuggestionsAsViewed().then(() => {
        // Reload suggestions to get updated data
        loadSuggestions(true);
      });
    }
  }, [activeCategory, activeSection, loading, loadIntroRequests, loadSuggestions]);

  // Mark matches and suggestions as viewed when user views the "Matches" section (For You)
  useEffect(() => {
    if (activeCategory === 'for_you' && activeSection === 'matches' && !loading) {
      // Mark matches as viewed when section is displayed
      profileService.markMatchesAsViewed().then(() => {
        // Update local state and reload data
        setLastViewedMatchesAt(new Date());
        loadIntroRequests(true);
        loadSuggestions(true);
      });
      
      // Mark suggestions as viewed when section is displayed (suggestions can also be matches)
      profileService.markSuggestionsAsViewed().then(() => {
        loadSuggestions(true);
      });
    }
  }, [activeCategory, activeSection, loading, loadIntroRequests, loadSuggestions]);

  // Mark matches as viewed when matchmaker views the "Matched" section (For Others)
  useEffect(() => {
    if (activeCategory === 'for_others' && activeForOthersSection === 'matched' && !loading && matchmakerRequests.length > 0) {
      // Mark as viewed when section is displayed (for anyone who is a matchmaker)
      profileService.markMatchesAsViewed().then(() => {
        // Update local state and reload data
        setLastViewedMatchesForOthersAt(new Date());
        loadIntroRequests(true);
        loadSuggestions(true);
      });
    }
  }, [activeCategory, activeForOthersSection, loading, matchmakerRequests.length, loadIntroRequests, loadSuggestions]);

  // Mark notifications as viewed when viewing "For You" category
  useEffect(() => {
    if (activeCategory === 'for_you' && !loading) {
      // Mark intro requests as viewed (for action needed notifications)
      profileService.markIntroRequestsAsViewed().then(() => {
        loadIntroRequests(true);
      });
      
      // Mark suggestions as viewed (for action needed notifications)
      profileService.markSuggestionsAsViewed().then(() => {
        loadSuggestions(true);
      });
      
      // Mark matches as viewed (for matches notifications)
      profileService.markMatchesAsViewed().then(() => {
        setLastViewedMatchesAt(new Date());
        loadIntroRequests(true);
        loadSuggestions(true);
      });
    }
  }, [activeCategory, loading, loadIntroRequests, loadSuggestions]);

  // Mark notifications as viewed when viewing "For Others" category
  useEffect(() => {
    if (activeCategory === 'for_others' && !loading) {
      // Mark matches as viewed (for matches notifications)
      if (matchmakerRequests.length > 0) {
        profileService.markMatchesAsViewed().then(() => {
          setLastViewedMatchesForOthersAt(new Date());
          loadIntroRequests(true);
          loadSuggestions(true);
        });
      }
      
      // Mark suggestions as viewed (for suggestions notifications)
      profileService.markSuggestionsAsViewed().then(() => {
        loadSuggestions(true);
      });
    }
  }, [activeCategory, loading, matchmakerRequests.length, loadIntroRequests, loadSuggestions]);

  const loadData = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      // Parallelize all independent data loading operations
      const [profileResult] = await Promise.all([
        profileService.getProfile(),
        // Start loading all data in parallel
        loadIntroRequests(silent),
        loadSuggestions(silent),
        loadInfoRequests(silent),
      ]);

      if (profileResult.success && profileResult.profile) {
        setCurrentUserProfile(profileResult.profile);
        
        // Set last viewed matches timestamp if available
        if (profileResult.profile.last_viewed_matches_at) {
          setLastViewedMatchesAt(new Date(profileResult.profile.last_viewed_matches_at));
        }
        
        // Set last viewed matches for "For Others" section (for matchmakers)
        if (profileResult.profile.last_viewed_matches_at) {
          setLastViewedMatchesForOthersAt(new Date(profileResult.profile.last_viewed_matches_at));
        }
        
        // Set default category based on role
        // Note: We check role here, but middle person requests will be shown regardless of role
        if (profileResult.profile.role === 'matchmaker') {
          setActiveCategory('for_others');
        }
      }
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

  // Mark all notifications as viewed when Connect tab is focused
  useFocusEffect(
    useCallback(() => {
      const markNotificationsAsViewed = async () => {
        // Collect all notification IDs to mark as viewed
        const notifications: { type: 'intro_request' | 'suggestion' | 'info_request'; id: string }[] = [];
        
        // Add intro request IDs
        sentIntroRequests.forEach(r => notifications.push({ type: 'intro_request', id: r.id }));
        receivedIntroRequests.forEach(r => notifications.push({ type: 'intro_request', id: r.id }));
        matchmakerRequests.forEach(r => notifications.push({ type: 'intro_request', id: r.id }));
        
        // Add suggestion IDs
        receivedSuggestions.forEach(s => notifications.push({ type: 'suggestion', id: s.id }));
        madeSuggestions.forEach(s => notifications.push({ type: 'suggestion', id: s.id }));
        
        // Add info request IDs
        receivedInfoRequests.forEach(r => notifications.push({ type: 'info_request', id: r.id }));
        sentInfoRequests.forEach(r => notifications.push({ type: 'info_request', id: r.id }));
        
        // Mark all as viewed
        if (notifications.length > 0) {
          await viewedNotificationService.markMultipleAsViewed(notifications);
        }
        
        // Also mark using old method for backward compatibility
        profileService.markIntroRequestsAsViewed();
        profileService.markSuggestionsAsViewed();
        profileService.markMatchesAsViewed();
      };
      
      markNotificationsAsViewed();
    }, [sentIntroRequests, receivedIntroRequests, matchmakerRequests, receivedSuggestions, madeSuggestions, receivedInfoRequests, sentInfoRequests])
  );

  // Update activeSection when params change
  useEffect(() => {
    if (params.section && ['action_needed', 'matches', 'passed', 'liked'].includes(params.section as string)) {
      setActiveSection(params.section as 'action_needed' | 'matches' | 'passed' | 'liked');
    }
  }, [params.section]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false); // Manual refresh with refreshing state
    setRefreshing(false);
  };

  // State for tracking last viewed matches timestamp
  const [lastViewedMatchesAt, setLastViewedMatchesAt] = useState<Date | null>(null);

  // Calculate notification counts for badges
  // Calculate new matches count (for Matches tab badge)
  const newMatchesCount = useMemo(() => {
    if (!lastViewedMatchesAt) {
      // If never viewed, count all current matches as new
      let count = 0;
      count += sentIntroRequests.filter(r => 
        r.matchmaker_status === 'accepted' && r.requested_status === 'accepted'
      ).length;
      count += receivedIntroRequests.filter(r => 
        r.matchmaker_status === 'accepted' && r.requested_status === 'accepted'
      ).length;
      if (currentUserProfile) {
        count += receivedSuggestions.filter(s => s.status === 'accepted' || s.status === 'completed').length;
      }
      return count;
    }

    let count = 0;
    // Count sent intro requests that became matches after last viewed
    count += sentIntroRequests.filter(r => {
      const isMatch = r.matchmaker_status === 'accepted' && r.requested_status === 'accepted';
      if (!isMatch) return false;
      const requestUpdatedAt = new Date(r.updated_at);
      return requestUpdatedAt > lastViewedMatchesAt;
    }).length;

    // Count received intro requests that became matches after last viewed
    count += receivedIntroRequests.filter(r => {
      const isMatch = r.matchmaker_status === 'accepted' && r.requested_status === 'accepted';
      if (!isMatch) return false;
      const requestUpdatedAt = new Date(r.updated_at);
      return requestUpdatedAt > lastViewedMatchesAt;
    }).length;

    // Count suggestions that became matches after last viewed
    if (currentUserProfile) {
      count += receivedSuggestions.filter(s => {
        const isMatch = s.status === 'accepted' || s.status === 'completed';
        if (!isMatch) return false;
        const suggestionUpdatedAt = new Date(s.updated_at);
        return suggestionUpdatedAt > lastViewedMatchesAt;
      }).length;
    }

    return count;
  }, [sentIntroRequests, receivedIntroRequests, receivedSuggestions, currentUserProfile, lastViewedMatchesAt]);

  const forYouBadgeCount = useMemo(() => {
    let count = 0;
    
    // Count received info requests needing response
    count += receivedInfoRequests.filter(r => r.status === 'pending').length;
    
    // Count approved info requests (newly approved - within last 7 days or if never viewed)
    // These show information that was provided in response to user's request
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    count += sentInfoRequests.filter(r => {
      if (r.status !== 'approved') return false;
      if (!r.responded_at) return false;
      const respondedAt = new Date(r.responded_at);
      return respondedAt > sevenDaysAgo;
    }).length;
    
    // Count received intro requests needing response (only new ones if last viewed timestamp exists)
    const lastViewedIntroRequests = currentUserProfile?.last_viewed_intro_requests_at 
      ? new Date(currentUserProfile.last_viewed_intro_requests_at)
      : null;
    
    if (lastViewedIntroRequests) {
      count += receivedIntroRequests.filter(r => {
        const needsResponse = r.requested_status === 'pending' || 
          (r.requested_status === 'accepted' && !r.requested_continuation_choice);
        if (!needsResponse) return false;
        const requestCreatedAt = new Date(r.created_at);
        return requestCreatedAt > lastViewedIntroRequests;
      }).length;
      
      count += sentIntroRequests.filter(r => {
        const needsChoice = r.matchmaker_status === 'accepted' && 
          r.requested_status === 'accepted' && 
          !r.requester_continuation_choice;
        if (!needsChoice) return false;
        const requestCreatedAt = new Date(r.created_at);
        return requestCreatedAt > lastViewedIntroRequests;
      }).length;
    } else {
      // If never viewed, count all
      count += receivedIntroRequests.filter(r => 
        r.requested_status === 'pending' || 
        (r.requested_status === 'accepted' && !r.requested_continuation_choice)
      ).length;
      
      count += sentIntroRequests.filter(r => 
        r.matchmaker_status === 'accepted' && 
        r.requested_status === 'accepted' && 
        !r.requester_continuation_choice
      ).length;
    }
    
    // Count received suggestions needing response
    if (currentUserProfile) {
      count += receivedSuggestions.filter(s => {
        const isProfileOne = s.profile_one_id === currentUserProfile.id;
        const isProfileTwo = s.profile_two_id === currentUserProfile.id;
        const myStatus = isProfileOne ? s.profile_one_status : s.profile_two_status;
        const myContinuationChoice = isProfileOne ? s.profile_one_continuation_choice : s.profile_two_continuation_choice;
        
        // Count if I haven't responded yet (pending status)
        // OR if I accepted but haven't chosen continuation method yet
        return myStatus === 'pending' || 
          (myStatus === 'accepted' && !myContinuationChoice);
      }).length;
    }
    
    // Add new matches count
    count += newMatchesCount;
    
    return count;
  }, [receivedInfoRequests, receivedIntroRequests, sentIntroRequests, receivedSuggestions, currentUserProfile, newMatchesCount]);

  // Calculate new matches count for "For Others" section (for anyone who is a matchmaker)
  const newMatchesForOthersCount = useMemo(() => {
    // Only show if user has middle person requests (is a matchmaker)
    if (matchmakerRequests.length === 0) {
      return 0;
    }

    if (!lastViewedMatchesForOthersAt) {
      // If never viewed, count all current matches as new
      return matchmakerRequests.filter(r => 
        r.matchmaker_status === 'accepted' && r.requested_status === 'accepted'
      ).length;
    }

    // Count matches that became completed/accepted after last viewed
    return matchmakerRequests.filter(r => {
      const isMatch = r.matchmaker_status === 'accepted' && r.requested_status === 'accepted';
      if (!isMatch) return false;
      
      const requestUpdatedAt = new Date(r.updated_at);
      return requestUpdatedAt > lastViewedMatchesForOthersAt;
    }).length;
  }, [matchmakerRequests, lastViewedMatchesForOthersAt]);

  const forOthersBadgeCount = useMemo(() => {
    let count = 0;
    
    // Count Matchmaker requests needing action
    count += matchmakerRequests.filter(r => 
      r.matchmaker_status === 'pending' || 
      (r.matchmaker_status === 'accepted' && r.requested_status === 'pending')
    ).length;
    
    // Count made suggestions awaiting response
    count += madeSuggestions.filter(s => 
      s.status === 'pending' || 
      (s.status === 'accepted' && (!s.profile_one_continuation_choice || !s.profile_two_continuation_choice))
    ).length;
    
    // Add new matches count for matchmakers
    count += newMatchesForOthersCount;
    
    return count;
  }, [matchmakerRequests, madeSuggestions, newMatchesForOthersCount]);

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
              let actionCount = 
                receivedIntroRequests.filter(r => 
                  r.requested_status === 'pending' || 
                  (r.requested_status === 'accepted' && !r.requested_continuation_choice)
                ).length +
                sentIntroRequests.filter(r => 
                  r.matchmaker_status === 'accepted' && 
                  r.requested_status === 'accepted' && 
                  !r.requester_continuation_choice
                ).length +
                receivedInfoRequests.filter(r => r.status === 'pending').length;
              
              // Add suggestions count using the same logic as the main filter
              if (currentUserProfile) {
                actionCount += receivedSuggestions.filter(s => {
                  const isProfileOne = s.profile_one_id === currentUserProfile.id;
                  const myStatus = isProfileOne ? s.profile_one_status : s.profile_two_status;
                  const myContinuationChoice = isProfileOne ? s.profile_one_continuation_choice : s.profile_two_continuation_choice;
                  return myStatus === 'pending' || (myStatus === 'accepted' && !myContinuationChoice);
                }).length;
              }
              
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
            {newMatchesCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{newMatchesCount}</Text>
              </View>
            )}
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
            {newMatchesForOthersCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{newMatchesForOthersCount}</Text>
              </View>
            )}
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
            {/* Approved Info Requests (show the info that was provided) */}
            {sentInfoRequests
              .filter(r => r.status === 'approved')
              .map(request => (
                <ApprovedInfoRequestCard
                  key={request.id}
                  request={request}
                />
              ))}

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
                r.requested_status === 'pending' || 
                (r.requested_status === 'accepted' && !r.requested_continuation_choice)
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

            {/* Sent Intro Requests (need to choose continuation after both accepted) */}
            {sentIntroRequests
              .filter(r => 
                r.matchmaker_status === 'accepted' && 
                r.requested_status === 'accepted' && 
                !r.requester_continuation_choice
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
              .filter(s => {
                const isProfileOne = s.profile_one_id === currentUserProfile.id;
                const isProfileTwo = s.profile_two_id === currentUserProfile.id;
                const myStatus = isProfileOne ? s.profile_one_status : s.profile_two_status;
                const myContinuationChoice = isProfileOne ? s.profile_one_continuation_choice : s.profile_two_continuation_choice;
                
                // Show if I haven't responded yet (pending status)
                // OR if I accepted but haven't chosen continuation method yet
                return myStatus === 'pending' || 
                  (myStatus === 'accepted' && !myContinuationChoice);
              })
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

        {/* Show matched requests in Matches section */}
        {activeCategory === 'for_you' && activeSection === 'matches' && (
          <>
            {sentIntroRequests
              .filter(r => 
                r.matchmaker_status === 'accepted' && 
                r.requested_status === 'accepted'
              )
              .map(request => (
                <IntroRequestCard
                  key={request.id}
                  request={request}
                  isRequester={true}
                  onUpdate={loadIntroRequests}
                />
              ))}

            {receivedIntroRequests
              .filter(r => 
                r.matchmaker_status === 'accepted' && 
                r.requested_status === 'accepted'
              )
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
              .filter(r => 
                r.matchmaker_status === 'rejected' || 
                (r.matchmaker_status === 'accepted' && r.requested_status === 'rejected')
              )
              .map(request => (
                <IntroRequestCard
                  key={request.id}
                  request={request}
                  isRequester={true}
                  onUpdate={loadIntroRequests}
                />
              ))}

            {receivedIntroRequests
              .filter(r => r.requested_status === 'rejected')
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
         sentInfoRequests.filter(r => r.status === 'approved').length === 0 &&
         receivedInfoRequests.filter(r => r.status === 'pending').length === 0 &&
         sentIntroRequests.filter(r => r.matchmaker_status === 'accepted' && r.requested_status === 'accepted' && !r.requester_continuation_choice).length === 0 &&
         receivedIntroRequests.filter(r => r.requested_status === 'pending' || (r.requested_status === 'accepted' && !r.requested_continuation_choice)).length === 0 &&
         receivedSuggestions.filter(s => {
           if (!currentUserProfile) return false;
           const isProfileOne = s.profile_one_id === currentUserProfile.id;
           const myStatus = isProfileOne ? s.profile_one_status : s.profile_two_status;
           const myContinuationChoice = isProfileOne ? s.profile_one_continuation_choice : s.profile_two_continuation_choice;
           return myStatus === 'pending' || (myStatus === 'accepted' && !myContinuationChoice);
         }).length === 0 &&
         renderEmptyState(activeSection)}

        {activeCategory === 'for_you' && activeSection === 'matches' &&
         sentIntroRequests.filter(r => r.matchmaker_status === 'accepted' && r.requested_status === 'accepted').length === 0 &&
         receivedIntroRequests.filter(r => r.matchmaker_status === 'accepted' && r.requested_status === 'accepted').length === 0 &&
         receivedSuggestions.filter(s => s.status === 'accepted' || s.status === 'completed').length === 0 &&
         renderEmptyState(activeSection)}

        {activeCategory === 'for_you' && activeSection === 'liked' &&
         sentIntroRequests.filter(r => r.status !== 'completed').length === 0 &&
         renderEmptyState(activeSection)}

        {activeCategory === 'for_you' && activeSection === 'passed' &&
         sentIntroRequests.filter(r => r.matchmaker_status === 'rejected' || (r.matchmaker_status === 'accepted' && r.requested_status === 'rejected')).length === 0 &&
         receivedIntroRequests.filter(r => r.requested_status === 'rejected').length === 0 &&
         receivedSuggestions.filter(s => s.status === 'rejected').length === 0 &&
         renderEmptyState(activeSection)}

        {/* For Others - Awaiting Response */}
        {activeCategory === 'for_others' && activeForOthersSection === 'awaiting' && (
          <>
            {/* Show intro requests for matchmakers */}
            {matchmakerRequests.length > 0 && matchmakerRequests
              .filter(r => 
                r.matchmaker_status === 'pending' || 
                (r.matchmaker_status === 'accepted' && r.requested_status === 'pending')
              )
              .map(request => (
                <MatchmakerRequestCard
                  key={request.id}
                  request={request}
                  onUpdate={loadIntroRequests}
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
            {matchmakerRequests.filter(r => 
                r.matchmaker_status === 'pending' || 
                (r.matchmaker_status === 'accepted' && r.requested_status === 'pending')
              ).length === 0 &&
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
            {/* Show matched intro requests for matchmakers */}
            {matchmakerRequests.length > 0 && matchmakerRequests
              .filter(r => 
                r.matchmaker_status === 'accepted' && 
                r.requested_status === 'accepted'
              )
              .map(request => (
                <MatchmakerRequestCard
                  key={request.id}
                  request={request}
                  onUpdate={loadIntroRequests}
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
            {matchmakerRequests.filter(r => 
                r.matchmaker_status === 'accepted' && r.requested_status === 'accepted'
              ).length === 0 &&
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
            {/* Show rejected intro requests for matchmakers */}
            {matchmakerRequests.length > 0 && matchmakerRequests
              .filter(r => 
                r.matchmaker_status === 'rejected' || 
                (r.matchmaker_status === 'accepted' && r.requested_status === 'rejected')
              )
              .map(request => (
                <MatchmakerRequestCard
                  key={request.id}
                  request={request}
                  onUpdate={loadIntroRequests}
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
            {matchmakerRequests.filter(r => r.matchmaker_status === 'rejected' || (r.matchmaker_status === 'accepted' && r.requested_status === 'rejected')).length === 0 &&
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

