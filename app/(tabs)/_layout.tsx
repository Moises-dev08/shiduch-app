import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import { useNotificationCount } from "../../hooks/useNotificationCount";
import { profileService } from "../../lib/profileService";
import { supabase } from "../../lib/supabase";

export default function TabLayout() {
  const [profileStatus, setProfileStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const { counts, refresh: refreshNotifications } = useNotificationCount();
  const pathname = usePathname();

  const checkProfileStatus = useCallback(async () => {
    try {
      const result = await profileService.getProfileStatus();
      if (result.success) {
        if (result.status) {
          setHasProfile(true);
          setProfileStatus((prevStatus) => {
            if (prevStatus && prevStatus !== 'approved' && result.status === 'approved') {
              Alert.alert(
                'Profile Approved!',
                'Your profile has been approved! You now have access to all features.',
                [{ text: 'Great!' }]
              );
              refreshNotifications();
            }
            return result.status!;
          });
        } else {
          setHasProfile(false);
          setProfileStatus(null);
        }
      }
    } catch (error) {
      console.error('Error checking profile status:', error);
    }
  }, [refreshNotifications]);

  // Initial check on mount + re-check when app returns to foreground
  useEffect(() => {
    checkProfileStatus();
    refreshNotifications();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkProfileStatus();
        refreshNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkProfileStatus, refreshNotifications]);

  // Realtime: re-check when the user's own profile row is updated (e.g. admin approval)
  // or when a new notification arrives for the user
  const checkProfileStatusRef = useRef(checkProfileStatus);
  checkProfileStatusRef.current = checkProfileStatus;

  useEffect(() => {
    let profileChannel: string | null = null;
    let notifChannel: string | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      profileChannel = `profile-status-${user.id}`;
      supabase
        .channel(profileChannel)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
          () => { checkProfileStatusRef.current(); }
        )
        .subscribe();

      notifChannel = `admin-notif-status-${user.id}`;
      supabase
        .channel(notifChannel)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            const rowUserId = (payload.new as any)?.user_id;
            if (!rowUserId || rowUserId === user.id) {
              checkProfileStatusRef.current();
            }
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      [profileChannel, notifChannel].forEach((name) => {
        if (!name) return;
        const ch = supabase.getChannels().find(c => c.topic === `realtime:${name}`);
        if (ch) supabase.removeChannel(ch);
      });
    };
  }, []);

  const isConnectTabActive = pathname === '/connect';

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
        tabBarActiveTintColor: "#1293DA",
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
          // Only show badge if Connect tab is NOT active and there are notifications
          tabBarBadge: (!isConnectTabActive && counts.total > 0) ? counts.total : undefined,
        }}
        listeners={{
          tabPress: (e) => {
            if (!handleTabPress('connect')) {
              e.preventDefault();
            } else {
              // Refresh notifications immediately when tab is pressed
              refreshNotifications();
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
        name="notifications"
        options={{
          href: null,
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
          href: null,
        }}
      />
    </Tabs>
  );
}
 