import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PictureViewerModal from '../components/home/PictureViewerModal';
import NoMatchmakerModal from '../components/profile/NoMatchmakerModal';
import ProfileActions from '../components/profile/ProfileActions';
import SuggestionConfirmModal from '../components/profile/SuggestionConfirmModal';
import { useInfoRequestStatus } from '../hooks/useInfoRequestStatus';
import { useSuggestions } from '../hooks/useSuggestions';
import { Profile as DBProfile, profileService } from '../lib/profileService';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/homeTypes';

export default function ProfileDetailsScreen() {
  const params = useLocalSearchParams();
  const profileId = (params.profileId || params.id) as string;
  const hideActions = params.hideActions === 'true'; // Hide actions when viewing from suggestions

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<DBProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showPictureViewer, setShowPictureViewer] = useState(false);
  const [selectedPictureIndex, setSelectedPictureIndex] = useState(0);

  // Check info request status
  const { existingRequest, checkStatus } = useInfoRequestStatus(profileId);

  // Suggestion logic
  const {
    showSetupConfirmModal,
    setShowSetupConfirmModal,
    showNoMatchmakerModal,
    setShowNoMatchmakerModal,
    isSubmittingSuggestion,
    isSubmittingInfoRequest,
    handleSetupPress,
    handleConfirmSetup,
    handleAskForInfo,
  } = useSuggestions(currentUserProfile, profile, checkStatus);

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);

      // Validate profileId
      if (!profileId || profileId === 'undefined' || profileId === '') {
        console.error('Invalid profile ID:', profileId);
        router.back();
        return;
      }

      // Get current user profile
      const currentProfileResult = await profileService.getProfile();
      if (currentProfileResult.success && currentProfileResult.profile) {
        setCurrentUserProfile(currentProfileResult.profile);
      }

      // Get the profile to display
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error || !data) {
        console.error('Error loading profile:', error);
        router.back();
        return;
      }

      // Transform to display profile - RESPECTING PRIVACY SETTINGS
      const privacySettings = data.privacy_settings || {};
      const picturePrivacy = data.picture_privacy || 'none';
      const showPictures = picturePrivacy === 'always';

      // Only show pictures if privacy allows
      const firstPicture = showPictures && data.pictures && data.pictures.length > 0 
        ? profileService.getImageUrl(data.pictures[0])
        : '';
      
      const allPictures = showPictures && data.pictures && data.pictures.length > 0
        ? data.pictures.map((pic: string) => profileService.getImageUrl(pic))
        : [];

      const location = data.address || 
        (data.city && data.state ? `${data.city}, ${data.state}` : 
         data.location_city || 
         data.location_street || 
         'Unknown');

      const displayProfile: Profile = {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`,
        age: data.age || 0,
        picture: firstPicture,
        pictures: allPictures,
        hashkafa: data.hashkafa || 'Not specified',
        location: privacySettings.address ? 'Hidden' : location,
        bio: data.bio || 'No bio available',
        role: data.role,
        gender: data.gender,
        phone: data.phone || undefined,
        email: data.email || undefined,
        whatsapp: data.whatsapp || undefined,
        school: privacySettings.school ? undefined : (data.school || undefined),
        occupation: privacySettings.occupation ? undefined : (data.occupation || undefined),
        height: privacySettings.height ? undefined : (data.height || undefined),
        hasChildren: privacySettings.hasChildren ? undefined : data.has_children,
        picturePrivacy,
        privacySettings,
      };

      setProfile(displayProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  // Load profile data
  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const handlePicturePress = (index: number) => {
    setSelectedPictureIndex(index);
    setShowPictureViewer(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e91e63" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {!imageError && profile.picture ? (
            <Image 
              source={{ uri: profile.picture }} 
              style={styles.profileImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={[styles.profileImage, styles.placeholderProfileImage]}>
              <Ionicons name="person" size={50} color="#ccc" />
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileAge}>{profile.age} years old</Text>
            <Text style={styles.profileLocation}>{profile.location}</Text>
          </View>
        </View>

        {/* Pictures Section */}
        {profile.pictures && profile.pictures.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pictures</Text>
            <View style={styles.picturesGrid}>
              {profile.pictures.map((picture, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.pictureThumbnail}
                  onPress={() => handlePicturePress(index)}
                  activeOpacity={0.7}
                >
                  <Image 
                    source={{ uri: picture }} 
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Hashkafa:</Text>
            <Text style={styles.detailValue}>{profile.hashkafa}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Role:</Text>
            <Text style={styles.detailValue}>{profile.role}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gender:</Text>
            <Text style={styles.detailValue}>{profile.gender}</Text>
          </View>
          
          {profile.school && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>School:</Text>
              <Text style={styles.detailValue}>{profile.school}</Text>
            </View>
          )}
          
          {profile.occupation && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Occupation:</Text>
              <Text style={styles.detailValue}>{profile.occupation}</Text>
            </View>
          )}
        </View>

        {/* Bottom padding for action buttons */}
        <View style={{ height: hideActions ? 20 : 100 }} />
      </ScrollView>
      
      {/* Action Buttons - Hidden when viewing from suggestions */}
      {!hideActions && profile && currentUserProfile && (
        <ProfileActions
          profileId={profile.id}
          profileName={profile.name}
          profileGender={profile.gender as 'male' | 'female'}
          currentUserRole={currentUserProfile.role as 'single' | 'matchmaker' | 'both'}
          currentUserGender={currentUserProfile.gender as 'male' | 'female'}
          onSetupPress={handleSetupPress}
          onAskForInfoPress={handleAskForInfo}
          isSubmittingInfoRequest={isSubmittingInfoRequest}
          showSetupButton={true}
          showAskForInfoButton={true}
          infoRequestStatus={
            existingRequest?.status === 'pending' || existingRequest?.status === 'approved' 
              ? existingRequest.status 
              : null
          }
        />
      )}

      {/* Picture Viewer Modal */}
      {showPictureViewer && (
        <PictureViewerModal
          visible={showPictureViewer}
          pictures={profile.pictures}
          initialIndex={selectedPictureIndex}
          onClose={() => setShowPictureViewer(false)}
        />
      )}

      {/* Suggestion Confirmation Modal */}
      {showSetupConfirmModal && (
        <SuggestionConfirmModal
          visible={showSetupConfirmModal}
          profileName={profile.name}
          isLoading={isSubmittingSuggestion}
          onConfirm={handleConfirmSetup}
          onCancel={() => setShowSetupConfirmModal(false)}
        />
      )}

      {/* No Matchmaker Modal */}
      {showNoMatchmakerModal && (
        <NoMatchmakerModal
          visible={showNoMatchmakerModal}
          onClose={() => setShowNoMatchmakerModal(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  picturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pictureThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
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
});

