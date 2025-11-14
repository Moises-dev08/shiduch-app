import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Tabs, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, AppState } from "react-native";
import { useRealtimeIntroRequests } from "../../hooks/useRealtimeIntroRequests";
import { introService } from "../../lib/introService";
import { profileService } from "../../lib/profileService";

export default function TabLayout() {
  const [profileStatus, setProfileStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [connectBadgeCount, setConnectBadgeCount] = useState<number>(0);
  const [currentProfileId, setCurrentProfileId] = useState<string | undefined>(undefined);

  const checkProfileStatus = useCallback(async () => {
    try {
      const result = await profileService.getProfileStatus();
      if (result.success) {
        if (result.status) {
          setHasProfile(true);
          setProfileStatus((prevStatus) => {
            // If status changed from pending/rejected to approved, show success message
            if (prevStatus && prevStatus !== 'approved' && result.status === 'approved') {
              Alert.alert(
                '🎉 Profile Approved!',
                'Your profile has been approved! You now have access to all features.',
                [{ text: 'Great!' }]
              );
            }
            return result.status!;
          });

          // Get profile ID for real-time subscriptions
          const profileResult = await profileService.getProfile();
          if (profileResult.success && profileResult.profile) {
            setCurrentProfileId(profileResult.profile.id);
          }
        } else {
          // No profile found
          setHasProfile(false);
          setProfileStatus(null);
          setCurrentProfileId(undefined);
        }
      }
    } catch (error) {
      console.error('Error checking profile status:', error);
    }
  }, []);

  const checkConnectNotifications = useCallback(async () => {
    try {
      const result = await introService.getMyIntroRequests();
      if (result.success) {
        const received = result.receivedRequests || [];
        const sent = result.sentRequests || [];
        
        // Count items needing action
        const actionCount = 
          received.filter(r => 
            r.status === 'pending' || 
            (r.status === 'accepted' && (!r.requested_continuation_choice || !r.requester_continuation_choice))
          ).length +
          sent.filter(r => 
            r.status === 'accepted' && 
            (!r.requester_continuation_choice || !r.requested_continuation_choice)
          ).length;
        
        setConnectBadgeCount(actionCount);
      }
    } catch (error) {
      console.error('Error checking connect notifications:', error);
    }
  }, []);

  // Set up real-time subscription for intro requests (for badge count)
  useRealtimeIntroRequests(checkConnectNotifications, currentProfileId);

  useEffect(() => {
    checkProfileStatus();
    checkConnectNotifications();

    // Listen for app state changes (foreground/background)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground, refresh status
        checkProfileStatus();
        checkConnectNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkProfileStatus, checkConnectNotifications]);

  // Poll for status updates when profile is not approved
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    // If profile is pending or rejected, poll every 5 seconds
    if (profileStatus === 'pending' || profileStatus === 'rejected' || !hasProfile) {
      intervalId = setInterval(() => {
        console.log('Polling for profile status update...');
        checkProfileStatus();
      }, 5000); // Check every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [profileStatus, hasProfile, checkProfileStatus]);

  // Refresh status when navigating to tabs
  useFocusEffect(
    useCallback(() => {
      console.log('Tab focused, checking profile status...');
      checkProfileStatus();
      checkConnectNotifications();
    }, [checkProfileStatus, checkConnectNotifications])
  );

  const handleTabPress = (tabName: string) => {
    // Clear badge when Connect tab is pressed
    if (tabName === 'connect') {
      setConnectBadgeCount(0);
    }

    // Block all tabs except Profile if no profile exists
    if (!hasProfile && tabName !== 'profile') {
      Alert.alert(
        'Create Your Profile',
        'Please create your profile first before accessing other features.',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Block all tabs except Profile for non-approved profiles
    if (profileStatus !== 'approved' && tabName !== 'profile') {
      const message = profileStatus === 'pending' 
        ? 'Your profile is currently under review. You can only access the Profile tab until your profile is approved.'
        : profileStatus === 'rejected'
        ? 'Your profile needs attention. Please update your profile in the Profile tab.'
        : 'Please complete your profile setup first.';
      
      Alert.alert(
        profileStatus === 'pending' ? 'Profile Under Review' : 'Profile Incomplete',
        message,
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Determine if tabs should be disabled
  const isTabDisabled = !hasProfile || profileStatus !== 'approved';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#e91e63",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons 
              name="home" 
              size={size} 
              color={isTabDisabled ? "#ccc" : color} 
            />
          ),
          tabBarLabelStyle: isTabDisabled ? { color: "#ccc" } : {},
        }}
        listeners={{
          tabPress: (e) => {
            if (!handleTabPress('index')) {
              e.preventDefault();
            }
          },
        }}
      />
      
      <Tabs.Screen
        name="connect"
        options={{
          title: "Connect",
          tabBarIcon: ({ color, size }) => (
            <Ionicons 
              name="heart" 
              size={size} 
              color={isTabDisabled ? "#ccc" : color} 
            />
          ),
          tabBarLabelStyle: isTabDisabled ? { color: "#ccc" } : {},
          tabBarBadge: connectBadgeCount > 0 ? connectBadgeCount : undefined,
        }}
        listeners={{
          tabPress: (e) => {
            if (!handleTabPress('connect')) {
              e.preventDefault();
            }
          },
        }}
      />
      
       <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="donations"
        options={{
          title: "Donations",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 
              name="donate" 
              size={size} 
              color={isTabDisabled ? "#ccc" : color} 
            />
          ),
          tabBarLabelStyle: isTabDisabled ? { color: "#ccc" } : {},
        }}
        listeners={{
          tabPress: (e) => {
            if (!handleTabPress('donations')) {
              e.preventDefault();
            }
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
