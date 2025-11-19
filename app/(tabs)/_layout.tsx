import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Tabs, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, AppState } from "react-native";
import { useNotificationCount } from "../../hooks/useNotificationCount";
import { profileService } from "../../lib/profileService";

export default function TabLayout() {
  const [profileStatus, setProfileStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const { counts, refresh: refreshNotifications } = useNotificationCount();

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
                'Profile Approved!',
                'Your profile has been approved! You now have access to all features.',
                [{ text: 'Great!' }]
              );
              // Refresh notifications when profile is approved
              refreshNotifications();
            }
            return result.status!;
          });
        } else {
          // No profile found
          setHasProfile(false);
          setProfileStatus(null);
        }
      }
    } catch (error) {
      console.error('Error checking profile status:', error);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    checkProfileStatus();
    refreshNotifications();

    // Listen for app state changes (foreground/background)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground, refresh status
        checkProfileStatus();
        refreshNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkProfileStatus, refreshNotifications]);

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
      refreshNotifications();
    }, [checkProfileStatus, refreshNotifications])
  );

  const handleTabPress = (tabName: string) => {

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
          tabBarBadge: counts.total > 0 ? counts.total : undefined,
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
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
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
 