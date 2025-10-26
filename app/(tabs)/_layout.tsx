import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { profileService } from "../../lib/profileService";

export default function TabLayout() {
  const [profileStatus, setProfileStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  useEffect(() => {
    checkProfileStatus();
  }, []);

  const checkProfileStatus = async () => {
    try {
      const result = await profileService.getProfileStatus();
      if (result.success) {
        setProfileStatus(result.status || null);
      }
    } catch (error) {
      console.error('Error checking profile status:', error);
    }
  };

  const handleTabPress = (tabName: string) => {
    if (profileStatus === 'pending' && tabName !== 'profile') {
      Alert.alert(
        'Profile Under Review',
        'Your profile is currently under review. You can only access the Profile tab until your profile is approved.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

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
            <Ionicons name="home" size={size} color={color} />
          ),
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
        name="setup"
        options={{
          title: "Set up",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (!handleTabPress('setup')) {
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
            <FontAwesome5 name="donate" size={size} color={color} />

          ),
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
