import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileCard from '../components/home/ProfileCard';
import { Profile, profileService } from '../lib/profileService';
import { suggestionService } from '../lib/suggestionService';
import { supabase } from '../lib/supabase';
import { Profile as HomeProfile } from '../types/homeTypes';

export default function MatchmakerSetupScreen() {
  const params = useLocalSearchParams();
  const sourceProfileId = params.profileId as string;
  const sourceProfileName = params.profileName as string;
  const sourceGender = params.gender as 'male' | 'female';

  const [profiles, setProfiles] = useState<HomeProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<HomeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<HomeProfile | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadProfiles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [profiles, searchQuery]);

  const loadCurrentUser = async () => {
    const result = await profileService.getProfile();
    if (result.success && result.profile) {
      setCurrentUserProfile(result.profile);
    }
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved')
        .eq('role', 'single')
        .neq('id', sourceProfileId); // Don't show the source profile

      if (error) {
        console.error('Error loading profiles:', error);
        return;
      }

      // Filter by opposite gender
      const oppositeGender = sourceGender === 'male' ? 'female' : 'male';
      const filtered = (data || []).filter(p => p.gender === oppositeGender);

      // Transform to HomeProfile format
      const transformed: HomeProfile[] = filtered.map(p => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        age: p.age || 0,
        picture: p.pictures && p.pictures.length > 0 ? profileService.getImageUrl(p.pictures[0]) : '',
        pictures: p.pictures || [],
        hashkafa: p.hashkafa || '',
        location: p.address || p.city || '',
        bio: p.bio || '',
        role: p.role,
        gender: p.gender,
        phone: p.phone,
        email: p.email,
        whatsapp: p.whatsapp,
        school: p.school,
        occupation: p.occupation,
        height: p.height,
        hasChildren: p.has_children,
        picturePrivacy: p.picture_privacy || 'none',
        privacySettings: p.privacy_settings || {},
      }));

      setProfiles(transformed);
    } catch (error) {
      console.error('Error in loadProfiles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...profiles];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.hashkafa.toLowerCase().includes(query) ||
          p.location.toLowerCase().includes(query)
      );
    }

    setFilteredProfiles(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfiles();
  };

  const handleProfilePress = (profile: HomeProfile) => {
    router.push({
      pathname: '/profile-details',
      params: { profileId: profile.id, hideActions: 'true' },
    });
  };

  const handleSelectProfile = (profile: HomeProfile) => {
    setSelectedProfile(profile);
    setShowConfirmModal(true);
  };

  const handleConfirmSetup = async () => {
    if (!selectedProfile || !currentUserProfile) return;

    setIsSubmitting(true);

    try {
      // Create suggestion from matchmaker perspective
      // Both users will receive the suggestion
      const result = await suggestionService.createMatchmakerSuggestion(
        sourceProfileId,
        selectedProfile.id,
        currentUserProfile.id
      );

      setIsSubmitting(false);
      setShowConfirmModal(false);

      if (result.success) {
        Alert.alert(
          'Setup Created',
          `You have successfully set up ${sourceProfileName} with ${selectedProfile.name}. Both users will receive the suggestion.`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create setup');
      }
    } catch (error) {
      console.error('Error creating setup:', error);
      setIsSubmitting(false);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profiles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Setup for {sourceProfileName}</Text>
          <Text style={styles.headerSubtitle}>
            Select a {sourceGender === 'male' ? 'female' : 'male'} profile
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, hashkafa, location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Profiles Grid */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.profilesContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredProfiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Profiles Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try adjusting your search criteria'
                : 'No suitable profiles available at the moment'}
            </Text>
          </View>
        ) : (
          <View style={styles.profilesGrid}>
            {filteredProfiles.map(profile => (
              <View key={profile.id} style={styles.profileCardWrapper}>
                <ProfileCard
                  profile={profile}
                  onPress={() => handleProfilePress(profile)}
                />
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => handleSelectProfile(profile)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.selectButtonText}>Select</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isSubmitting && setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="heart-circle" size={48} color="#FF6B6B" />
              <Text style={styles.modalTitle}>Confirm Setup</Text>
            </View>

            <Text style={styles.modalMessage}>
              You are about to setup{' '}
              <Text style={styles.boldText}>{sourceProfileName}</Text> with{' '}
              <Text style={styles.boldText}>{selectedProfile?.name}</Text>.
            </Text>

            <Text style={styles.modalInfo}>
              Both users will receive this suggestion and can accept or reject it.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleConfirmSetup}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.confirmButtonText}>Yes, Create Setup</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  profilesContainer: {
    padding: 16,
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  profileCardWrapper: {
    width: '31%',
    marginBottom: 16,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: '700',
    color: '#333',
  },
  modalInfo: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    backgroundColor: '#FF6B6B',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

