import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EngagementButton from "../../components/EngagementButton";
import { ConnectHeader } from "../../components/connect/ConnectHeader";
import InfoRequestCard from "../../components/connect/InfoRequestCard";
import IntroRequestCard from "../../components/intro/IntroRequestCard";
import MatchmakerRequestCard from "../../components/intro/MatchmakerRequestCard";
import MadeSuggestionCard from "../../components/suggestion/MadeSuggestionCard";
import SuggestionCard from "../../components/suggestion/SuggestionCard";
import { useRealtimeInfoRequests } from "../../hooks/useRealtimeInfoRequests";
import { useRealtimeIntroRequests } from "../../hooks/useRealtimeIntroRequests";
import { useRealtimeSuggestions } from "../../hooks/useRealtimeSuggestions";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { UNREAD_COUNT_QUERY_KEY } from "../../hooks/useUnreadNotificationsCount";
import { useWebTabVisible } from "../../hooks/useWebTabVisible";
import { engagementService } from "../../lib/engagementService";
import { infoRequestService } from "../../lib/infoRequestService";
import { introService } from "../../lib/introService";
import { notificationService } from "../../lib/notificationService";
import { Profile, profileService } from "../../lib/profileService";
import { suggestionService } from "../../lib/suggestionService";
import { supabase } from "../../lib/supabase";
import { viewedNotificationService } from "../../lib/viewedNotificationService";

// ── Standalone query functions (stable, no re-creation on render) ──────────

async function fetchIntroData() {
  const [result, matchmakerResult] = await Promise.all([
    introService.getMyIntroRequests(),
    introService.getMatchmakerRequests(),
  ]);
  return {
    sentRequests: result.success ? (result.sentRequests ?? []) : [],
    receivedRequests: result.success ? (result.receivedRequests ?? []) : [],
    matchmakerRequests: matchmakerResult.success
      ? (matchmakerResult.matchmakerRequests ?? [])
      : [],
  };
}

async function fetchSuggestionsData() {
  const result = await suggestionService.getMySuggestions();
  return {
    receivedSuggestions: result.success
      ? (result.receivedSuggestions ?? [])
      : [],
    madeSuggestions: result.success ? (result.madeSuggestions ?? []) : [],
  };
}

async function fetchPendingEngagementData() {
  const result = await engagementService.getPendingEngagementRequest();
  if (!result.success || !result.engagement) {
    return { pendingEngagement: null, otherProfile: null };
  }
  const engagement = result.engagement;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { pendingEngagement: null, otherProfile: null };

  const otherAuthId =
    user.id === engagement.user1_id ? engagement.user2_id : engagement.user1_id;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, user_id")
    .eq("user_id", otherAuthId)
    .single();

  return { pendingEngagement: engagement, otherProfile: profile ?? null };
}

async function fetchInfoData() {
  const [receivedResult, sentResult] = await Promise.all([
    infoRequestService.getReceivedRequests(),
    infoRequestService.getSentRequests(),
  ]);
  return {
    receivedInfoRequests: receivedResult.success
      ? (receivedResult.requests ?? [])
      : [],
    sentInfoRequests: sentResult.success ? (sentResult.requests ?? []) : [],
  };
}

export default function ConnectScreen() {
  const isTabVisible = useWebTabVisible();
  const { isDesktop, contentPadding } = useResponsiveLayout();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<
    "for_you" | "for_others"
  >("for_you");
  const [activeSection, setActiveSection] = useState<
    "action_needed" | "matches" | "passed" | "liked"
  >(
    (params.section as "action_needed" | "matches" | "passed" | "liked") ||
      "action_needed",
  );
  // True while we're transitioning into Matches after an accept action
  const [pendingMatch, setPendingMatch] = useState(false);
  const [activeForOthersSection, setActiveForOthersSection] = useState<
    "awaiting" | "matched" | "not_matched"
  >("awaiting");
  const [lastViewedMatchesForOthersAt, setLastViewedMatchesForOthersAt] =
    useState<Date | null>(null);
  // Desktop tab state (intros, suggestions, info)
  const [activeTab, setActiveTab] = useState<"intros" | "suggestions" | "info">("intros");

  // ── React Query ────────────────────────────────────────────────────────────
  const introQuery = useQuery({
    queryKey: ["intro_requests"],
    queryFn: fetchIntroData,
    staleTime: 30 * 1000,
  });
  const suggestQuery = useQuery({
    queryKey: ["suggestions"],
    queryFn: fetchSuggestionsData,
    staleTime: 30 * 1000,
  });
  const infoQuery = useQuery({
    queryKey: ["info_requests"],
    queryFn: fetchInfoData,
    staleTime: 30 * 1000,
  });
  const engagementQuery = useQuery({
    queryKey: ["pending_engagement"],
    queryFn: fetchPendingEngagementData,
    staleTime: 30 * 1000,
  });

  // True whenever any query is actively fetching (background refresh or first load)
  const isFetching =
    introQuery.isFetching ||
    suggestQuery.isFetching ||
    infoQuery.isFetching ||
    engagementQuery.isFetching;
  // Share the same profile cache used by profile.tsx
  const profileQuery = useQuery({
    queryKey: ["my_profile"],
    queryFn: () => profileService.getProfile(),
    staleTime: 5 * 60 * 1000,
  });

  // Derived arrays — empty until first fetch resolves (no loading state shown)
  const sentIntroRequests = introQuery.data?.sentRequests ?? [];
  const receivedIntroRequests = introQuery.data?.receivedRequests ?? [];
  const matchmakerRequests = introQuery.data?.matchmakerRequests ?? [];
  const receivedSuggestions = suggestQuery.data?.receivedSuggestions ?? [];
  const madeSuggestions = suggestQuery.data?.madeSuggestions ?? [];
  const receivedInfoRequests = infoQuery.data?.receivedInfoRequests ?? [];
  const sentInfoRequests = infoQuery.data?.sentInfoRequests ?? [];
  const pendingEngagement = engagementQuery.data?.pendingEngagement ?? null;
  const pendingEngagementOtherProfile =
    engagementQuery.data?.otherProfile ?? null;

  // loading = true only when there is no cached data yet (first-ever launch)
  const loading =
    introQuery.isLoading ||
    suggestQuery.isLoading ||
    infoQuery.isLoading ||
    engagementQuery.isLoading ||
    profileQuery.isLoading;

  // ── Sync profile data from query ──────────────────────────────────────────
  useEffect(() => {
    if (!profileQuery.data?.profile) return;
    const p = profileQuery.data.profile;
    setCurrentUserProfile(p);
    if (p.last_viewed_matches_at) {
      setLastViewedMatchesAt(new Date(p.last_viewed_matches_at));
      setLastViewedMatchesForOthersAt(new Date(p.last_viewed_matches_at));
    }
    if (p.role === "matchmaker") setActiveCategory("for_others");
  }, [profileQuery.data]);

  // ── Invalidation helpers (replaces silent loaders) ────────────────────────
  const invalidateIntroRequests = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["intro_requests"] }),
    [queryClient],
  );
  const invalidateSuggestions = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["suggestions"] }),
    [queryClient],
  );
  const invalidateInfoRequests = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["info_requests"] }),
    [queryClient],
  );

  // Called by a card when user successfully accepts → navigate to Matches and show spinner
  const handleCardAccepted = useCallback(() => {
    setPendingMatch(true);
    setActiveSection("matches");
    queryClient.invalidateQueries({ queryKey: ["intro_requests"] });
    queryClient.invalidateQueries({ queryKey: ["suggestions"] });
  }, [queryClient]);

  // Clear pendingMatch once the background fetch resolves
  useEffect(() => {
    if (pendingMatch && !introQuery.isFetching && !suggestQuery.isFetching) {
      setPendingMatch(false);
    }
  }, [pendingMatch, introQuery.isFetching, suggestQuery.isFetching]);

  // ── Mark-as-viewed effects (fire after data is ready) ─────────────────────
  useEffect(() => {
    if (
      activeCategory === "for_you" &&
      activeSection === "action_needed" &&
      !loading
    ) {
      profileService
        .markIntroRequestsAsViewed()
        .then(() => invalidateIntroRequests());
      profileService
        .markSuggestionsAsViewed()
        .then(() => invalidateSuggestions());
    }
  }, [
    activeCategory,
    activeSection,
    loading,
    invalidateIntroRequests,
    invalidateSuggestions,
  ]);

  useEffect(() => {
    if (
      activeCategory === "for_you" &&
      activeSection === "matches" &&
      !loading
    ) {
      profileService.markMatchesAsViewed().then(() => {
        setLastViewedMatchesAt(new Date());
        invalidateIntroRequests();
        invalidateSuggestions();
      });
      profileService
        .markSuggestionsAsViewed()
        .then(() => invalidateSuggestions());
    }
  }, [
    activeCategory,
    activeSection,
    loading,
    invalidateIntroRequests,
    invalidateSuggestions,
  ]);

  useEffect(() => {
    if (
      activeCategory === "for_others" &&
      activeForOthersSection === "matched" &&
      !loading &&
      matchmakerRequests.length > 0
    ) {
      profileService.markMatchesAsViewed().then(() => {
        setLastViewedMatchesForOthersAt(new Date());
        invalidateIntroRequests();
        invalidateSuggestions();
      });
    }
  }, [
    activeCategory,
    activeForOthersSection,
    loading,
    matchmakerRequests.length,
    invalidateIntroRequests,
    invalidateSuggestions,
  ]);

  useEffect(() => {
    if (activeCategory === "for_you" && !loading) {
      profileService
        .markIntroRequestsAsViewed()
        .then(() => invalidateIntroRequests());
      profileService
        .markSuggestionsAsViewed()
        .then(() => invalidateSuggestions());
      profileService.markMatchesAsViewed().then(() => {
        setLastViewedMatchesAt(new Date());
        invalidateIntroRequests();
        invalidateSuggestions();
      });
    }
  }, [activeCategory, loading, invalidateIntroRequests, invalidateSuggestions]);

  useEffect(() => {
    if (activeCategory === "for_others" && !loading) {
      if (matchmakerRequests.length > 0) {
        profileService.markMatchesAsViewed().then(() => {
          setLastViewedMatchesForOthersAt(new Date());
          invalidateIntroRequests();
          invalidateSuggestions();
        });
      }
      profileService
        .markSuggestionsAsViewed()
        .then(() => invalidateSuggestions());
    }
  }, [
    activeCategory,
    loading,
    matchmakerRequests.length,
    invalidateIntroRequests,
    invalidateSuggestions,
  ]);

  // ── Realtime: invalidate queries instead of manual silent refresh ──────────
  useRealtimeIntroRequests(invalidateIntroRequests, currentUserProfile?.id);
  useRealtimeSuggestions(invalidateSuggestions, currentUserProfile?.id);
  useRealtimeInfoRequests(invalidateInfoRequests, currentUserProfile?.id);

  // On every focus: only invalidate (respects staleTime, won't refetch fresh data)
  // and mark all notifications as read so the bell badge clears.
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["intro_requests"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["info_requests"] });

      notificationService.markAllAsRead().then(() => {
        queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
      });
    }, [queryClient]),
  );

  // Mark all notifications as viewed when Connect tab is focused
  useFocusEffect(
    useCallback(() => {
      const markNotificationsAsViewed = async () => {
        // Collect all notification IDs to mark as viewed
        const notifications: {
          type: "intro_request" | "suggestion" | "info_request";
          id: string;
        }[] = [];

        // Add intro request IDs
        sentIntroRequests.forEach((r) =>
          notifications.push({ type: "intro_request", id: r.id }),
        );
        receivedIntroRequests.forEach((r) =>
          notifications.push({ type: "intro_request", id: r.id }),
        );
        matchmakerRequests.forEach((r) =>
          notifications.push({ type: "intro_request", id: r.id }),
        );

        // Add suggestion IDs
        receivedSuggestions.forEach((s) =>
          notifications.push({ type: "suggestion", id: s.id }),
        );
        madeSuggestions.forEach((s) =>
          notifications.push({ type: "suggestion", id: s.id }),
        );

        // Add info request IDs
        receivedInfoRequests.forEach((r) =>
          notifications.push({ type: "info_request", id: r.id }),
        );
        sentInfoRequests.forEach((r) =>
          notifications.push({ type: "info_request", id: r.id }),
        );

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
    }, [
      sentIntroRequests,
      receivedIntroRequests,
      matchmakerRequests,
      receivedSuggestions,
      madeSuggestions,
      receivedInfoRequests,
      sentInfoRequests,
    ]),
  );

  // Update activeSection when params change
  useEffect(() => {
    if (
      params.section &&
      ["action_needed", "matches", "passed", "liked"].includes(
        params.section as string,
      )
    ) {
      setActiveSection(
        params.section as "action_needed" | "matches" | "passed" | "liked",
      );
    }
  }, [params.section]);

  // Update activeCategory when params change (e.g. deep-link from notification)
  useEffect(() => {
    if (
      params.category &&
      ["for_you", "for_others"].includes(params.category as string)
    ) {
      setActiveCategory(params.category as "for_you" | "for_others");
    }
  }, [params.category]);

  // Update forOthers sub-section when params change
  useEffect(() => {
    if (
      params.forOthersSection &&
      ["awaiting", "matched", "not_matched"].includes(
        params.forOthersSection as string,
      )
    ) {
      setActiveForOthersSection(
        params.forOthersSection as "awaiting" | "matched" | "not_matched",
      );
    }
  }, [params.forOthersSection]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      introQuery.refetch(),
      suggestQuery.refetch(),
      infoQuery.refetch(),
      engagementQuery.refetch(),
      profileQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  // State for tracking last viewed matches timestamp
  const [lastViewedMatchesAt, setLastViewedMatchesAt] = useState<Date | null>(
    null,
  );

  // Calculate notification counts for badges
  // Calculate new matches count (for Matches tab badge)
  const newMatchesCount = useMemo(() => {
    if (!lastViewedMatchesAt) {
      // If never viewed, count all current matches as new
      let count = 0;
      count += sentIntroRequests.filter(
        (r) =>
          r.matchmaker_status === "accepted" &&
          r.requested_status === "accepted",
      ).length;
      count += receivedIntroRequests.filter(
        (r) =>
          r.matchmaker_status === "accepted" &&
          r.requested_status === "accepted",
      ).length;
      if (currentUserProfile) {
        count += receivedSuggestions.filter(
          (s) => s.status === "accepted" || s.status === "completed",
        ).length;
      }
      return count;
    }

    let count = 0;
    // Count sent intro requests that became matches after last viewed
    count += sentIntroRequests.filter((r) => {
      const isMatch =
        r.matchmaker_status === "accepted" && r.requested_status === "accepted";
      if (!isMatch) return false;
      const requestUpdatedAt = new Date(r.updated_at);
      return requestUpdatedAt > lastViewedMatchesAt;
    }).length;

    // Count received intro requests that became matches after last viewed
    count += receivedIntroRequests.filter((r) => {
      const isMatch =
        r.matchmaker_status === "accepted" && r.requested_status === "accepted";
      if (!isMatch) return false;
      const requestUpdatedAt = new Date(r.updated_at);
      return requestUpdatedAt > lastViewedMatchesAt;
    }).length;

    // Count suggestions that became matches after last viewed
    if (currentUserProfile) {
      count += receivedSuggestions.filter((s) => {
        const isMatch = s.status === "accepted" || s.status === "completed";
        if (!isMatch) return false;
        const suggestionUpdatedAt = new Date(s.updated_at);
        return suggestionUpdatedAt > lastViewedMatchesAt;
      }).length;
    }

    return count;
  }, [
    sentIntroRequests,
    receivedIntroRequests,
    receivedSuggestions,
    currentUserProfile,
    lastViewedMatchesAt,
  ]);

  const forYouBadgeCount = useMemo(() => {
    let count = 0;

    // Count received info requests needing response
    count += receivedInfoRequests.filter((r) => r.status === "pending").length;

    // Count approved info requests (newly approved - within last 7 days or if never viewed)
    // These show information that was provided in response to user's request
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    count += sentInfoRequests.filter((r) => {
      if (r.status !== "approved") return false;
      if (!r.responded_at) return false;
      const respondedAt = new Date(r.responded_at);
      return respondedAt > sevenDaysAgo;
    }).length;

    // Count received intro requests needing response (only new ones if last viewed timestamp exists)
    const lastViewedIntroRequests =
      currentUserProfile?.last_viewed_intro_requests_at
        ? new Date(currentUserProfile.last_viewed_intro_requests_at)
        : null;

    if (lastViewedIntroRequests) {
      count += receivedIntroRequests.filter((r) => {
        const needsResponse =
          r.requested_status === "pending" ||
          (r.requested_status === "accepted" &&
            !r.requested_continuation_choice);
        if (!needsResponse) return false;
        const requestCreatedAt = new Date(r.created_at);
        return requestCreatedAt > lastViewedIntroRequests;
      }).length;

      count += sentIntroRequests.filter((r) => {
        const needsChoice =
          r.matchmaker_status === "accepted" &&
          r.requested_status === "accepted" &&
          !r.requester_continuation_choice;
        if (!needsChoice) return false;
        const requestCreatedAt = new Date(r.created_at);
        return requestCreatedAt > lastViewedIntroRequests;
      }).length;
    } else {
      // If never viewed, count all
      count += receivedIntroRequests.filter(
        (r) =>
          r.requested_status === "pending" ||
          (r.requested_status === "accepted" &&
            !r.requested_continuation_choice),
      ).length;

      count += sentIntroRequests.filter(
        (r) =>
          r.matchmaker_status === "accepted" &&
          r.requested_status === "accepted" &&
          !r.requester_continuation_choice,
      ).length;
    }

    // Count received suggestions needing response
    if (currentUserProfile) {
      count += receivedSuggestions.filter((s) => {
        const isProfileOne = s.profile_one_id === currentUserProfile.id;
        const isProfileTwo = s.profile_two_id === currentUserProfile.id;
        const myStatus = isProfileOne
          ? s.profile_one_status
          : s.profile_two_status;
        const myContinuationChoice = isProfileOne
          ? s.profile_one_continuation_choice
          : s.profile_two_continuation_choice;

        // Count if I haven't responded yet (pending status)
        // OR if I accepted but haven't chosen continuation method yet
        return (
          myStatus === "pending" ||
          (myStatus === "accepted" && !myContinuationChoice)
        );
      }).length;
    }

    // Add new matches count
    count += newMatchesCount;

    return count;
  }, [
    receivedInfoRequests,
    receivedIntroRequests,
    sentIntroRequests,
    receivedSuggestions,
    currentUserProfile,
    newMatchesCount,
  ]);

  // Calculate new matches count for "For Others" section (for anyone who is a matchmaker)
  const newMatchesForOthersCount = useMemo(() => {
    // Only show if user has middle person requests (is a matchmaker)
    if (matchmakerRequests.length === 0) {
      return 0;
    }

    if (!lastViewedMatchesForOthersAt) {
      // If never viewed, count all current matches as new
      return matchmakerRequests.filter(
        (r) =>
          r.matchmaker_status === "accepted" &&
          r.requested_status === "accepted",
      ).length;
    }

    // Count matches that became completed/accepted after last viewed
    return matchmakerRequests.filter((r) => {
      const isMatch =
        r.matchmaker_status === "accepted" && r.requested_status === "accepted";
      if (!isMatch) return false;

      const requestUpdatedAt = new Date(r.updated_at);
      return requestUpdatedAt > lastViewedMatchesForOthersAt;
    }).length;
  }, [matchmakerRequests, lastViewedMatchesForOthersAt]);

  const forOthersBadgeCount = useMemo(() => {
    let count = 0;

    // Count Matchmaker requests needing action
    count += matchmakerRequests.filter(
      (r) =>
        r.matchmaker_status === "pending" ||
        (r.matchmaker_status === "accepted" &&
          r.requested_status === "pending"),
    ).length;

    // Count made suggestions awaiting response
    count += madeSuggestions.filter(
      (s) =>
        s.status === "pending" ||
        (s.status === "accepted" &&
          (!s.profile_one_continuation_choice ||
            !s.profile_two_continuation_choice)),
    ).length;

    // Add new matches count for matchmakers
    count += newMatchesForOthersCount;

    return count;
  }, [matchmakerRequests, madeSuggestions, newMatchesForOthersCount]);

  const renderEmptyState = (section: string) => {
    const emptyStates = {
      action_needed: {
        icon: "notifications-outline",
        title: "No actions needed",
        message:
          "You're all caught up! ✨ Check back later for new intro requests.",
      },
      matches: {
        icon: "heart-circle-outline",
        title: "No matches yet",
        message:
          "When both parties accept an intro request, your matches will appear here. 💕",
      },
      passed: {
        icon: "close-circle-outline",
        title: "No declined requests",
        message: "Intro requests that were declined will appear here.",
      },
      liked: {
        icon: "heart-outline",
        title: "No liked profiles",
        message:
          "Profiles you like will appear here showing their response status. ❤️",
      },
      for_others: {
        icon: "people-outline",
        title: "For others",
        message: "This section is coming soon. 👥",
      },
    };

    const state =
      emptyStates[section as keyof typeof emptyStates] ||
      emptyStates.action_needed;

    return (
      <View style={styles.emptyState}>
        <Ionicons name={state.icon as any} size={64} color="#ccc" />
        <Text style={styles.emptyStateTitle}>{state.title}</Text>
        <Text style={styles.emptyStateMessage}>{state.message}</Text>
      </View>
    );
  };

  // Derive role directly from cached query data to avoid a render-cycle delay.
  // currentUserProfile is set via useEffect (one render late), causing tabs to flash in.
  const profileRole =
    profileQuery.data?.profile?.role ?? currentUserProfile?.role;
  const isSingle = profileRole === "single";

  if (!isTabVisible) {
    return null;
  }

  // Calculate counts for header badges
  const headerCounts = {
    intros: receivedIntroRequests.filter(
      (r) =>
        r.requested_status === "pending" ||
        (r.requested_status === "accepted" && !r.requested_continuation_choice),
    ).length +
    sentIntroRequests.filter(
      (r) =>
        r.matchmaker_status === "accepted" &&
        r.requested_status === "accepted" &&
        !r.requester_continuation_choice,
    ).length,
    suggestions: currentUserProfile
      ? receivedSuggestions.filter((s) => {
          const isProfileOne = s.profile_one_id === currentUserProfile.id;
          const myStatus = isProfileOne
            ? s.profile_one_status
            : s.profile_two_status;
          const myContinuationChoice = isProfileOne
            ? s.profile_one_continuation_choice
            : s.profile_two_continuation_choice;
          return myStatus === "pending" || (myStatus === "accepted" && !myContinuationChoice);
        }).length
      : 0,
    info: receivedInfoRequests.filter((r) => r.status === "pending").length,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageBody}>
      {/* Header - Desktop version has tabs */}
      {isDesktop ? (
        <ConnectHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={headerCounts}
          isDesktop={true}
        />
      ) : (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Connect</Text>
        </View>
      )}

      {/* Category Tabs (only for singles) */}
      {isSingle && (
        <View style={styles.categoryTabs}>
          <TouchableOpacity
            style={[
              styles.categoryTab,
              activeCategory === "for_you" && styles.categoryTabActive,
            ]}
            onPress={() => setActiveCategory("for_you")}
          >
            <View style={styles.categoryTabContent}>
              <Text
                style={[
                  styles.categoryTabText,
                  activeCategory === "for_you" && styles.categoryTabTextActive,
                ]}
              >
                For you
              </Text>
              {forYouBadgeCount > 0 && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {forYouBadgeCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryTab,
              activeCategory === "for_others" && styles.categoryTabActive,
            ]}
            onPress={() => setActiveCategory("for_others")}
          >
            <View style={styles.categoryTabContent}>
              <Text
                style={[
                  styles.categoryTabText,
                  activeCategory === "for_others" &&
                    styles.categoryTabTextActive,
                ]}
              >
                For others
              </Text>
              {forOthersBadgeCount > 0 && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {forOthersBadgeCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Section Tabs */}
      {activeCategory === "for_you" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sectionTabs}
          contentContainerStyle={styles.sectionTabsContent}
        >
          <TouchableOpacity
            style={[
              styles.sectionTab,
              activeSection === "action_needed" && styles.sectionTabActive,
            ]}
            onPress={() => setActiveSection("action_needed")}
          >
            <Ionicons
              name="notifications"
              size={18}
              color={activeSection === "action_needed" ? "#1293DA" : "#999"}
            />
            <Text
              style={[
                styles.sectionTabText,
                activeSection === "action_needed" &&
                  styles.sectionTabTextActive,
              ]}
            >
              Action Needed
            </Text>
            {(() => {
              let actionCount =
                receivedIntroRequests.filter(
                  (r) =>
                    r.requested_status === "pending" ||
                    (r.requested_status === "accepted" &&
                      !r.requested_continuation_choice),
                ).length +
                sentIntroRequests.filter(
                  (r) =>
                    r.matchmaker_status === "accepted" &&
                    r.requested_status === "accepted" &&
                    !r.requester_continuation_choice,
                ).length +
                receivedInfoRequests.filter((r) => r.status === "pending")
                  .length +
                (pendingEngagement ? 1 : 0);

              // Add suggestions count using the same logic as the main filter
              if (currentUserProfile) {
                actionCount += receivedSuggestions.filter((s) => {
                  const isProfileOne =
                    s.profile_one_id === currentUserProfile.id;
                  const myStatus = isProfileOne
                    ? s.profile_one_status
                    : s.profile_two_status;
                  const myContinuationChoice = isProfileOne
                    ? s.profile_one_continuation_choice
                    : s.profile_two_continuation_choice;
                  return (
                    myStatus === "pending" ||
                    (myStatus === "accepted" && !myContinuationChoice)
                  );
                }).length;
              }

              return (
                actionCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{actionCount}</Text>
                  </View>
                )
              );
            })()}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sectionTab,
              activeSection === "matches" && styles.sectionTabActive,
            ]}
            onPress={() => setActiveSection("matches")}
          >
            <Ionicons
              name="heart-circle"
              size={18}
              color={activeSection === "matches" ? "#1293DA" : "#999"}
            />
            <Text
              style={[
                styles.sectionTabText,
                activeSection === "matches" && styles.sectionTabTextActive,
              ]}
            >
              Matches
            </Text>
            {newMatchesCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{newMatchesCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sectionTab,
              activeSection === "passed" && styles.sectionTabActive,
            ]}
            onPress={() => setActiveSection("passed")}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={activeSection === "passed" ? "#1293DA" : "#999"}
            />
            <Text
              style={[
                styles.sectionTabText,
                activeSection === "passed" && styles.sectionTabTextActive,
              ]}
            >
              Passed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sectionTab,
              activeSection === "liked" && styles.sectionTabActive,
            ]}
            onPress={() => setActiveSection("liked")}
          >
            <Ionicons
              name="heart"
              size={18}
              color={activeSection === "liked" ? "#1293DA" : "#999"}
            />
            <Text
              style={[
                styles.sectionTabText,
                activeSection === "liked" && styles.sectionTabTextActive,
              ]}
            >
              You Liked
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* For Others Section Tabs */}
      {activeCategory === "for_others" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sectionTabs}
          contentContainerStyle={styles.sectionTabsContent}
        >
          <TouchableOpacity
            style={[
              styles.sectionTab,
              activeForOthersSection === "awaiting" && styles.sectionTabActive,
            ]}
            onPress={() => setActiveForOthersSection("awaiting")}
          >
            <Ionicons
              name="time"
              size={18}
              color={activeForOthersSection === "awaiting" ? "#1293DA" : "#999"}
            />
            <Text
              style={[
                styles.sectionTabText,
                activeForOthersSection === "awaiting" &&
                  styles.sectionTabTextActive,
              ]}
            >
              Awaiting response
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sectionTab,
              activeForOthersSection === "matched" && styles.sectionTabActive,
            ]}
            onPress={() => setActiveForOthersSection("matched")}
          >
            <Ionicons
              name="heart"
              size={18}
              color={activeForOthersSection === "matched" ? "#1293DA" : "#999"}
            />
            <Text
              style={[
                styles.sectionTabText,
                activeForOthersSection === "matched" &&
                  styles.sectionTabTextActive,
              ]}
            >
              Matched
            </Text>
            {newMatchesForOthersCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{newMatchesForOthersCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sectionTab,
              activeForOthersSection === "not_matched" &&
                styles.sectionTabActive,
            ]}
            onPress={() => setActiveForOthersSection("not_matched")}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={
                activeForOthersSection === "not_matched" ? "#1293DA" : "#999"
              }
            />
            <Text
              style={[
                styles.sectionTabText,
                activeForOthersSection === "not_matched" &&
                  styles.sectionTabTextActive,
              ]}
            >
              Did not match
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Loading bar shown only on initial cold load (no cached data yet) */}
      {loading && !refreshing && (
        <View style={styles.fetchingBar}>
          <ActivityIndicator size="small" color="#1293DA" />
          <Text style={styles.fetchingText}>Updating…</Text>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1293DA"]}
          />
        }
      >
        {/* Intro Requests Section - Action Needed */}
        {activeCategory === "for_you" && activeSection === "action_needed" && (
          <>
            {/* Pending Engagement Confirmation */}
            {pendingEngagement &&
              pendingEngagementOtherProfile &&
              currentUserProfile && (
                <View style={styles.engagementActionCard}>
                  <View style={styles.engagementActionHeader}>
                    <Ionicons name="heart-circle" size={24} color="#DAA520" />
                    <Text style={styles.engagementActionTitle}>
                      {pendingEngagementOtherProfile.first_name} wants to
                      confirm your engagement!
                    </Text>
                  </View>
                  <EngagementButton
                    otherUserId={pendingEngagementOtherProfile.id}
                    otherUserName={`${pendingEngagementOtherProfile.first_name} ${pendingEngagementOtherProfile.last_name}`}
                    currentUserName={`${currentUserProfile.first_name} ${currentUserProfile.last_name}`}
                    containerStyle={styles.engagementActionButtonContainer}
                  />
                </View>
              )}

            {/* Received Info Requests (need response) */}
            {(!isDesktop || activeTab === "info") &&
              receivedInfoRequests
                .filter((r) => r.status === "pending")
                .map((request) => (
                  <InfoRequestCard
                    key={request.id}
                    request={request}
                    onUpdate={invalidateInfoRequests}
                  />
                ))}

            {/* Received Intro Requests (need response OR need continuation choice) */}
            {(!isDesktop || activeTab === "intros") &&
              receivedIntroRequests
                .filter(
                  (r) =>
                    r.requested_status === "pending" ||
                    (r.requested_status === "accepted" &&
                      !r.requested_continuation_choice),
                )
                .map((request) => (
                  <IntroRequestCard
                    key={request.id}
                    request={request}
                    isRequester={false}
                    onUpdate={invalidateIntroRequests}
                    onAccepted={handleCardAccepted}
                    isActionNeeded={true}
                  />
                ))}

            {/* Sent Intro Requests (need to choose continuation after both accepted) */}
            {(!isDesktop || activeTab === "intros") &&
              sentIntroRequests
                .filter(
                  (r) =>
                    r.matchmaker_status === "accepted" &&
                    r.requested_status === "accepted" &&
                    !r.requester_continuation_choice,
                )
                .map((request) => (
                  <IntroRequestCard
                    key={request.id}
                    request={request}
                    isRequester={true}
                    onUpdate={invalidateIntroRequests}
                    onAccepted={handleCardAccepted}
                    isActionNeeded={true}
                  />
                ))}

            {/* Received Suggestions (need response OR need continuation choice) */}
            {(!isDesktop || activeTab === "suggestions") &&
              currentUserProfile &&
              receivedSuggestions
                .filter((s) => {
                  const isProfileOne =
                    s.profile_one_id === currentUserProfile.id;
                  const isProfileTwo =
                    s.profile_two_id === currentUserProfile.id;
                  const myStatus = isProfileOne
                    ? s.profile_one_status
                    : s.profile_two_status;
                  const myContinuationChoice = isProfileOne
                    ? s.profile_one_continuation_choice
                    : s.profile_two_continuation_choice;

                  // Show if I haven't responded yet (pending status)
                  // OR if I accepted but haven't chosen continuation method yet
                  return (
                    myStatus === "pending" ||
                    (myStatus === "accepted" && !myContinuationChoice)
                  );
                })
                .map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    currentProfileId={currentUserProfile.id}
                    onUpdate={invalidateSuggestions}
                    onAccepted={handleCardAccepted}
                    isActionNeeded={true}
                  />
                ))}
          </>
        )}

        {/* Show matched requests in Matches section */}
        {activeCategory === "for_you" && activeSection === "matches" && (
          <>
            {/* Spinner shown right after a user accepts — waits for fresh data */}
            {pendingMatch &&
              (introQuery.isFetching || suggestQuery.isFetching) && (
                <View style={styles.pendingMatchContainer}>
                  <ActivityIndicator size="large" color="#1293DA" />
                  <Text style={styles.pendingMatchText}>
                    Loading your match…
                  </Text>
                </View>
              )}

            {(!isDesktop || activeTab === "intros") &&
              sentIntroRequests
                .filter(
                  (r) =>
                    r.matchmaker_status === "accepted" &&
                    r.requested_status === "accepted",
                )
                .map((request) => (
                  <IntroRequestCard
                    key={request.id}
                    request={request}
                    isRequester={true}
                    onUpdate={invalidateIntroRequests}
                  />
                ))}

            {(!isDesktop || activeTab === "intros") &&
              receivedIntroRequests
                .filter(
                  (r) =>
                    r.matchmaker_status === "accepted" &&
                    r.requested_status === "accepted",
                )
                .map((request) => (
                  <IntroRequestCard
                    key={request.id}
                    request={request}
                    isRequester={false}
                    onUpdate={invalidateIntroRequests}
                  />
                ))}

            {/* Show matched suggestions — both sides must have accepted */}
            {(!isDesktop || activeTab === "suggestions") &&
              currentUserProfile &&
              receivedSuggestions
                .filter((s) => {
                  const isP1 = s.profile_one_id === currentUserProfile.id;
                  const myStatus = isP1
                    ? s.profile_one_status
                    : s.profile_two_status;
                  const otherStatus = isP1
                    ? s.profile_two_status
                    : s.profile_one_status;
                  return (
                    (myStatus === "accepted" && otherStatus === "accepted") ||
                    s.status === "completed"
                  );
                })
                .map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    currentProfileId={currentUserProfile.id}
                    onUpdate={invalidateSuggestions}
                  />
                ))}
          </>
        )}

        {/* Show profiles you liked in You Liked section */}
        {activeCategory === "for_you" && activeSection === "liked" && (
          <>
            {(!isDesktop || activeTab === "intros") &&
              sentIntroRequests
                .filter(
                  (r) =>
                    r.status !== "completed" &&
                    r.matchmaker_status !== "rejected" &&
                    !(
                      r.matchmaker_status === "accepted" &&
                      r.requested_status === "rejected"
                    ),
                )
                .map((request) => (
                  <IntroRequestCard
                    key={request.id}
                    request={request}
                    isRequester={true}
                    onUpdate={invalidateIntroRequests}
                  />
                ))}

            {(!isDesktop || activeTab === "intros") &&
              receivedIntroRequests
                .filter((r) => r.requested_status === "accepted")
                .map((request) => (
                  <IntroRequestCard
                    key={request.id}
                    request={request}
                    isRequester={false}
                    onUpdate={invalidateIntroRequests}
                  />
                ))}

            {(!isDesktop || activeTab === "suggestions") &&
              currentUserProfile &&
              receivedSuggestions
                .filter((s) => {
                  const isProfileOne =
                    s.profile_one_id === currentUserProfile.id;
                  const myStatus = isProfileOne
                    ? s.profile_one_status
                    : s.profile_two_status;
                  const otherStatus = isProfileOne
                    ? s.profile_two_status
                    : s.profile_one_status;
                  return (
                    myStatus === "accepted" &&
                    otherStatus !== "accepted" &&
                    s.status !== "completed" &&
                    s.status !== "rejected"
                  );
                })
                .map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    currentProfileId={currentUserProfile.id}
                    onUpdate={invalidateSuggestions}
                  />
                ))}
          </>
        )}

        {/* Show rejected requests in Passed section */}
        {activeCategory === "for_you" && activeSection === "passed" && (
          <>
            {(!isDesktop || activeTab === "intros") &&
              sentIntroRequests
                .filter(
                  (r) =>
                    r.matchmaker_status === "rejected" ||
                    (r.matchmaker_status === "accepted" &&
                      r.requested_status === "rejected"),
                )
                .map((request) => (
                  <IntroRequestCard
                    key={request.id}
                    request={request}
                    isRequester={true}
                    onUpdate={invalidateIntroRequests}
                  />
                ))}

            {(!isDesktop || activeTab === "intros") &&
              receivedIntroRequests
                .filter((r) => r.requested_status === "rejected")
                .map((request) => (
                  <IntroRequestCard
                    key={request.id}
                    request={request}
                    isRequester={false}
                    onUpdate={invalidateIntroRequests}
                  />
                ))}

            {/* Show rejected suggestions — check individual status as well for older records */}
            {(!isDesktop || activeTab === "suggestions") &&
              currentUserProfile &&
              receivedSuggestions
                .filter((s) => {
                  const isProfileOne =
                    s.profile_one_id === currentUserProfile.id;
                  const myStatus = isProfileOne
                    ? s.profile_one_status
                    : s.profile_two_status;
                  return s.status === "rejected" || myStatus === "rejected";
                })
                .map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    currentProfileId={currentUserProfile.id}
                    onUpdate={invalidateSuggestions}
                  />
                ))}
          </>
        )}

        {/* Empty state when no intro requests, suggestions, info requests, or pending engagements */}
        {activeCategory === "for_you" &&
          activeSection === "action_needed" &&
          !pendingEngagement &&
          receivedInfoRequests.filter((r) => r.status === "pending").length ===
            0 &&
          sentIntroRequests.filter(
            (r) =>
              r.matchmaker_status === "accepted" &&
              r.requested_status === "accepted" &&
              !r.requester_continuation_choice,
          ).length === 0 &&
          receivedIntroRequests.filter(
            (r) =>
              r.requested_status === "pending" ||
              (r.requested_status === "accepted" &&
                !r.requested_continuation_choice),
          ).length === 0 &&
          receivedSuggestions.filter((s) => {
            if (!currentUserProfile) return false;
            const isProfileOne = s.profile_one_id === currentUserProfile.id;
            const myStatus = isProfileOne
              ? s.profile_one_status
              : s.profile_two_status;
            const myContinuationChoice = isProfileOne
              ? s.profile_one_continuation_choice
              : s.profile_two_continuation_choice;
            return (
              myStatus === "pending" ||
              (myStatus === "accepted" && !myContinuationChoice)
            );
          }).length === 0 &&
          renderEmptyState(activeSection)}

        {activeCategory === "for_you" &&
          activeSection === "matches" &&
          sentIntroRequests.filter(
            (r) =>
              r.matchmaker_status === "accepted" &&
              r.requested_status === "accepted",
          ).length === 0 &&
          receivedIntroRequests.filter(
            (r) =>
              r.matchmaker_status === "accepted" &&
              r.requested_status === "accepted",
          ).length === 0 &&
          (currentUserProfile
            ? receivedSuggestions.filter((s) => {
                const isP1 = s.profile_one_id === currentUserProfile.id;
                const myStatus = isP1
                  ? s.profile_one_status
                  : s.profile_two_status;
                const otherStatus = isP1
                  ? s.profile_two_status
                  : s.profile_one_status;
                return (
                  (myStatus === "accepted" && otherStatus === "accepted") ||
                  s.status === "completed"
                );
              }).length === 0
            : true) &&
          renderEmptyState(activeSection)}

        {activeCategory === "for_you" &&
          activeSection === "liked" &&
          sentIntroRequests.filter(
            (r) =>
              r.status !== "completed" &&
              r.matchmaker_status !== "rejected" &&
              !(
                r.matchmaker_status === "accepted" &&
                r.requested_status === "rejected"
              ),
          ).length === 0 &&
          receivedIntroRequests.filter((r) => r.requested_status === "accepted")
            .length === 0 &&
          (currentUserProfile
            ? receivedSuggestions.filter((s) => {
                const isP1 = s.profile_one_id === currentUserProfile.id;
                const myStatus = isP1
                  ? s.profile_one_status
                  : s.profile_two_status;
                const otherStatus = isP1
                  ? s.profile_two_status
                  : s.profile_one_status;
                return (
                  myStatus === "accepted" &&
                  otherStatus !== "accepted" &&
                  s.status !== "completed" &&
                  s.status !== "rejected"
                );
              }).length === 0
            : true) &&
          renderEmptyState(activeSection)}

        {activeCategory === "for_you" &&
          activeSection === "passed" &&
          sentIntroRequests.filter(
            (r) =>
              r.matchmaker_status === "rejected" ||
              (r.matchmaker_status === "accepted" &&
                r.requested_status === "rejected"),
          ).length === 0 &&
          receivedIntroRequests.filter((r) => r.requested_status === "rejected")
            .length === 0 &&
          receivedSuggestions.filter((s) => {
            if (!currentUserProfile) return false;
            const isProfileOne = s.profile_one_id === currentUserProfile.id;
            const myStatus = isProfileOne
              ? s.profile_one_status
              : s.profile_two_status;
            return s.status === "rejected" || myStatus === "rejected";
          }).length === 0 &&
          renderEmptyState(activeSection)}

        {/* For Others - Awaiting Response */}
        {activeCategory === "for_others" &&
          activeForOthersSection === "awaiting" && (
            <>
              {/* Show intro requests for matchmakers */}
              {(!isDesktop || activeTab === "intros") &&
                matchmakerRequests.length > 0 &&
                matchmakerRequests
                  .filter(
                    (r) =>
                      r.matchmaker_status === "pending" ||
                      (r.matchmaker_status === "accepted" &&
                        r.requested_status === "pending"),
                  )
                  .map((request) => (
                    <MatchmakerRequestCard
                      key={request.id}
                      request={request}
                      onUpdate={invalidateIntroRequests}
                    />
                  ))}

              {/* Show suggestions (both singles and matchmakers) */}
              {(!isDesktop || activeTab === "suggestions") &&
                currentUserProfile &&
                madeSuggestions
                  .filter(
                    (s) =>
                      s.status === "pending" ||
                      (s.status === "accepted" &&
                        (!s.profile_one_continuation_choice ||
                          !s.profile_two_continuation_choice)),
                  )
                  .map((suggestion) => (
                    <MadeSuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                    />
                  ))}

              {/* Empty state */}
              {matchmakerRequests.filter(
                (r) =>
                  r.matchmaker_status === "pending" ||
                  (r.matchmaker_status === "accepted" &&
                    r.requested_status === "pending"),
              ).length === 0 &&
                madeSuggestions.filter(
                  (s) =>
                    s.status === "pending" ||
                    (s.status === "accepted" &&
                      (!s.profile_one_continuation_choice ||
                        !s.profile_two_continuation_choice)),
                ).length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="time-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyStateTitle}>
                      No pending matches
                    </Text>
                    <Text style={styles.emptyStateMessage}>
                      Matches you&apos;re facilitating will appear here once
                      they need responses. ⏳
                    </Text>
                  </View>
                )}
            </>
          )}

        {/* For Others - Matched */}
        {activeCategory === "for_others" &&
          activeForOthersSection === "matched" && (
            <>
              {/* Show matched intro requests for matchmakers */}
              {(!isDesktop || activeTab === "intros") &&
                matchmakerRequests.length > 0 &&
                matchmakerRequests
                  .filter(
                    (r) =>
                      r.matchmaker_status === "accepted" &&
                      r.requested_status === "accepted",
                  )
                  .map((request) => (
                    <MatchmakerRequestCard
                      key={request.id}
                      request={request}
                      onUpdate={invalidateIntroRequests}
                    />
                  ))}

              {/* Show suggestions (both singles and matchmakers) */}
              {(!isDesktop || activeTab === "suggestions") &&
                currentUserProfile &&
                madeSuggestions
                  .filter(
                    (s) =>
                      s.status === "completed" ||
                      (s.status === "accepted" &&
                        s.profile_one_continuation_choice &&
                        s.profile_two_continuation_choice),
                  )
                  .map((suggestion) => (
                    <MadeSuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                    />
                  ))}

              {/* Empty state */}
              {matchmakerRequests.filter(
                (r) =>
                  r.matchmaker_status === "accepted" &&
                  r.requested_status === "accepted",
              ).length === 0 &&
                madeSuggestions.filter(
                  (s) =>
                    s.status === "completed" ||
                    (s.status === "accepted" &&
                      s.profile_one_continuation_choice &&
                      s.profile_two_continuation_choice),
                ).length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="heart-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyStateTitle}>No matches yet</Text>
                    <Text style={styles.emptyStateMessage}>
                      Successful matches you&apos;ve facilitated will appear
                      here. 💕
                    </Text>
                  </View>
                )}
            </>
          )}

        {/* For Others - Did Not Match */}
        {activeCategory === "for_others" &&
          activeForOthersSection === "not_matched" && (
            <>
              {/* Show rejected intro requests for matchmakers */}
              {(!isDesktop || activeTab === "intros") &&
                matchmakerRequests.length > 0 &&
                matchmakerRequests
                  .filter(
                    (r) =>
                      r.matchmaker_status === "rejected" ||
                      (r.matchmaker_status === "accepted" &&
                        r.requested_status === "rejected"),
                  )
                  .map((request) => (
                    <MatchmakerRequestCard
                      key={request.id}
                      request={request}
                      onUpdate={invalidateIntroRequests}
                    />
                  ))}

              {/* Show suggestions (both singles and matchmakers) */}
              {(!isDesktop || activeTab === "suggestions") &&
                currentUserProfile &&
                madeSuggestions
                  .filter((s) => s.status === "rejected")
                  .map((suggestion) => (
                    <MadeSuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                    />
                  ))}

              {/* Empty state */}
              {matchmakerRequests.filter(
                (r) =>
                  r.matchmaker_status === "rejected" ||
                  (r.matchmaker_status === "accepted" &&
                    r.requested_status === "rejected"),
              ).length === 0 &&
                madeSuggestions.filter((s) => s.status === "rejected")
                  .length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="close-circle-outline"
                      size={64}
                      color="#ccc"
                    />
                    <Text style={styles.emptyStateTitle}>
                      No Declined Matches
                    </Text>
                    <Text style={styles.emptyStateMessage}>
                      Matches that didn&apos;t work out will appear here.
                    </Text>
                  </View>
                )}
            </>
          )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  pageBody: {
    flex: 1,
    width: "100%",
  },
  engagementActionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DAA520",
    shadowColor: "#DAA520",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  engagementActionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  engagementActionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  engagementActionButtonContainer: {
    marginTop: 12,
    paddingTop: 0,
    borderTopWidth: 0,
    borderTopColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  pendingMatchContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 16,
  },
  pendingMatchText: {
    fontSize: 16,
    color: "#1293DA",
    fontWeight: "600",
  },
  fetchingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
    backgroundColor: "#E3F2FD",
    borderBottomWidth: 1,
    borderBottomColor: "#B3DDF5",
  },
  fetchingText: {
    fontSize: 13,
    color: "#1293DA",
    fontWeight: "500",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  categoryTabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  categoryTabActive: {
    borderBottomColor: "#1293DA",
  },
  categoryTabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryTabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#999",
  },
  categoryTabTextActive: {
    color: "#1293DA",
    fontWeight: "600",
  },
  categoryBadge: {
    backgroundColor: "#1293DA",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  categoryBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  sectionTabs: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    maxHeight: 56,
  },
  sectionTabsContent: {
    paddingHorizontal: 12,
  },
  sectionTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    marginVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    gap: 6,
  },
  sectionTabActive: {
    backgroundColor: "#E3F2FD",
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  sectionTabTextActive: {
    color: "#1293DA",
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#1293DA",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
});
