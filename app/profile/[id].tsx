import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/AuthContext';
import { profileService } from '../../lib/profileService';
import { supabase } from '../../lib/supabase';
import { calculateAge } from '../../lib/utils';

export default function SharedProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Check if user is authenticated
      if (!session) {
        // User is not logged in, redirect to App Store
        Alert.alert(
          'App Required',
          'Please download the Zivug Mishamayim app to view this profile.',
          [
            {
              text: 'Download App',
              onPress: () => {
                // Replace with your actual App Store URL
                const appStoreUrl = 'https://apps.apple.com/app/id6738294076';
                Linking.openURL(appStoreUrl);
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => router.back(),
            },
          ]
        );
        return;
      }

      // Fetch the profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .eq('status', 'approved')
        .single();

      if (error || !data) {
        Alert.alert('Error', 'Profile not found or not available.', [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)'),
          },
        ]);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error loading shared profile:', error);
      Alert.alert('Error', 'Failed to load profile.', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#03a9f4" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color="#ccc" />
          <Text style={styles.errorText}>Profile not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const age = profile.dob ? calculateAge(profile.dob) : 'N/A';
  const mainPicture = profile.pictures && profile.pictures.length > 0 
    ? profileService.getImageUrl(profile.pictures[0]) 
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.title}>Shared Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {!imageError && mainPicture ? (
            <Image 
              source={{ uri: mainPicture }} 
              style={styles.profileImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={[styles.profileImage, styles.placeholderProfileImage]}>
              <Ionicons name="person" size={50} color="#ccc" />
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile.first_name} {profile.last_name}
            </Text>
            <Text style={styles.profileAge}>Age: {age}</Text>
            {profile.location_city && profile.location_country && (
              <Text style={styles.profileLocation}>
                {profile.location_city}, {profile.location_country}
              </Text>
            )}
          </View>
        </View>

        {/* About Section */}
        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          {profile.hashkafa_type && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Hashkafa:</Text>
              <Text style={styles.detailValue}>{profile.hashkafa_type}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Role:</Text>
            <Text style={styles.detailValue}>{profile.role}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gender:</Text>
            <Text style={styles.detailValue}>{profile.gender}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#03a9f4" />
          <Text style={styles.infoText}>
            To view full profile details and connect, please use the main app.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.viewInAppButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.viewInAppText}>View in App</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  placeholder: {
    width: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
  },
  placeholderProfileImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    justifyContent: 'center',
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileAge: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  profileLocation: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    width: 120,
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  viewInAppButton: {
    backgroundColor: '#03a9f4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewInAppText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

