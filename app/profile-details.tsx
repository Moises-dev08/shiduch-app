import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PictureViewerModal from '../components/home/PictureViewerModal';
import ContinuationChoiceModal from '../components/intro/ContinuationChoiceModal';
import MiddlePersonSelectionModal from '../components/intro/MiddlePersonSelectionModal';
import ProfileGridSelectionModal from '../components/suggestion/ProfileGridSelectionModal';
import { introService } from '../lib/introService';
import { Profile as DBProfile, profileService } from '../lib/profileService';
import { suggestionService } from '../lib/suggestionService';
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

  // Intro request flow states
  const [showMiddlePersonModal, setShowMiddlePersonModal] = useState(false);
  const [selectedMiddlePerson, setSelectedMiddlePerson] = useState<any>(null);
  const [showContinuationModal, setShowContinuationModal] = useState(false);
  const [isSubmittingIntro, setIsSubmittingIntro] = useState(false);
  const [existingIntroRequest, setExistingIntroRequest] = useState<any>(null);

  // Setup/Suggestion flow states
  const [showProfileGridModal, setShowProfileGridModal] = useState(false);
  const [selectedProfileForSetup, setSelectedProfileForSetup] = useState<Profile | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [suggestionNote, setSuggestionNote] = useState('');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

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

        // Check for existing intro request with this profile (both directions)
        const introResult = await introService.getMyIntroRequests();
        if (introResult.success) {
          // Check sent requests (I asked for intro with them)
          const sentRequest = introResult.sentRequests?.find(
            r => r.requested_profile_id === profileId && 
            (r.status === 'pending' || r.status === 'accepted' || r.status === 'completed')
          );
          
          // Check received requests (they asked for intro with me)
          const receivedRequest = introResult.receivedRequests?.find(
            r => r.requester_id === profileId && 
            (r.status === 'pending' || r.status === 'accepted' || r.status === 'completed')
          );
          
          // Set whichever exists
          const existingRequest = sentRequest || receivedRequest;
          if (existingRequest) {
            setExistingIntroRequest(existingRequest);
          }
        }
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

  const handleAskForIntro = () => {
    // Check if there's already a request
    if (existingIntroRequest) {
      let message = '';
      if (existingIntroRequest.status === 'pending') {
        message = 'You already have a pending intro request with this profile. Please wait for their response.';
      } else if (existingIntroRequest.status === 'accepted') {
        message = 'You already have an accepted intro request with this profile. Check the Connect tab for next steps.';
      } else if (existingIntroRequest.status === 'completed') {
        message = 'You already have a completed match with this profile. Check the Connect tab for contact information.';
      }
      
      Alert.alert('Intro Request Already Exists', message, [{ text: 'OK' }]);
      return;
    }

    // Start the intro flow by selecting middle person
    setShowMiddlePersonModal(true);
  };

  const handleMiddlePersonSelected = (middlePerson: any) => {
    setSelectedMiddlePerson(middlePerson);
    setShowMiddlePersonModal(false);
    // Ask requester how they want to continue
    setShowContinuationModal(true);
  };

  const handleContinuationChoice = async (choice: 'by_themselves' | 'with_middle_person') => {
    if (!selectedMiddlePerson || !profile) return;

    setIsSubmittingIntro(true);
    try {
      // Create the intro request
      const result = await introService.createIntroRequest(
        profile.id,
        selectedMiddlePerson.id
      );

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create intro request');
        return;
      }

      // Set the requester's continuation choice
      if (result.request) {
        await introService.setContinuationChoice(result.request.id, choice, true);
      }

      setShowContinuationModal(false);
      Alert.alert(
        'Intro Request Sent!',
        `Your intro request has been sent to ${profile.name}. ${selectedMiddlePerson.first_name} ${selectedMiddlePerson.last_name} will facilitate the introduction.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to Connect tab
              router.push('/(tabs)/connect');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating intro request:', error);
      Alert.alert('Error', 'Failed to send intro request');
    } finally {
      setIsSubmittingIntro(false);
    }
  };

  const handleSetup = () => {
    // Open profile grid selection modal
    setShowProfileGridModal(true);
  };

  const handleProfileSelected = (selectedProfile: Profile) => {
    setSelectedProfileForSetup(selectedProfile);
    setShowProfileGridModal(false);
    // Open note modal
    setShowNoteModal(true);
  };

  const handleSubmitSuggestion = async () => {
    if (!selectedProfileForSetup || !profile) return;

    setIsSubmittingSuggestion(true);
    try {
      const result = await suggestionService.createSuggestion(
        profile.id,
        selectedProfileForSetup.id,
        suggestionNote.trim() || undefined
      );

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create suggestion');
        return;
      }

      setShowNoteModal(false);
      setSuggestionNote('');
      setSelectedProfileForSetup(null);

      Alert.alert(
        'Suggestion Sent!',
        `Your match suggestion has been sent to ${profile.name} and ${selectedProfileForSetup.name}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.push('/(tabs)/connect');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating suggestion:', error);
      Alert.alert('Error', 'Failed to send suggestion');
    } finally {
      setIsSubmittingSuggestion(false);
    }
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

      {/* Action Buttons */}
      {!hideActions && profile && currentUserProfile && (
        <View style={styles.actionsContainer}>
          {/* Setup button - for both singles and matchmakers */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.setupButton]}
            onPress={handleSetup}
            disabled={isSubmittingSuggestion}
          >
            {isSubmittingSuggestion ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="people" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Setup</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Ask for Intro button - only for singles */}
          {currentUserProfile.role === 'single' && (
            <TouchableOpacity
              style={[
                styles.actionButton, 
                styles.introButton,
                existingIntroRequest && styles.disabledButton
              ]}
              onPress={handleAskForIntro}
              disabled={isSubmittingIntro || !!existingIntroRequest}
            >
              {isSubmittingIntro ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : existingIntroRequest ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {existingIntroRequest.status === 'pending' ? 'Request Pending' : 
                     existingIntroRequest.status === 'accepted' ? 'Request Accepted' :
                     'Already Matched'}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="hand-right" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Ask for Intro</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
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

      {/* Middle Person Selection Modal */}
      <MiddlePersonSelectionModal
        visible={showMiddlePersonModal}
        excludedProfileId={currentUserProfile?.id}
        requestedProfileId={profile?.id}
        onSelect={handleMiddlePersonSelected}
        onCancel={() => setShowMiddlePersonModal(false)}
      />

      {/* Continuation Choice Modal */}
      {profile && (
        <ContinuationChoiceModal
          visible={showContinuationModal}
          profileName={profile.name}
          onSelectChoice={handleContinuationChoice}
          onCancel={() => {
            setShowContinuationModal(false);
            setSelectedMiddlePerson(null);
          }}
          loading={isSubmittingIntro}
        />
      )}

      {/* Profile Grid Selection Modal for Setup */}
      <ProfileGridSelectionModal
        visible={showProfileGridModal}
        currentUserGender={profile?.gender}
        excludedProfileId={profile?.id}
        onSelect={handleProfileSelected}
        onCancel={() => setShowProfileGridModal(false)}
      />

      {/* Note Modal for Suggestion */}
      <Modal
        visible={showNoteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowNoteModal(false);
          setSuggestionNote('');
          setSelectedProfileForSetup(null);
        }}
      >
        <View style={styles.noteModalContainer}>
          <View style={styles.noteModalHeader}>
            <TouchableOpacity onPress={() => {
              setShowNoteModal(false);
              setSuggestionNote('');
              setSelectedProfileForSetup(null);
            }}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.noteModalTitle}>Add a Note (Optional)</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.noteModalContent}>
            <Text style={styles.noteModalLabel}>
              Add a note for {profile?.name} and {selectedProfileForSetup?.name}
            </Text>
            <TextInput
              style={styles.noteTextInput}
              placeholder="Why do you think they would be a good match?"
              value={suggestionNote}
              onChangeText={setSuggestionNote}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />

            <Text style={styles.noteModalHint}>
              This note will be visible to both profiles when they receive your suggestion.
            </Text>
          </ScrollView>

          <View style={styles.noteModalActions}>
            <TouchableOpacity
              style={[styles.noteModalButton, styles.skipButton]}
              onPress={handleSubmitSuggestion}
              disabled={isSubmittingSuggestion}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.noteModalButton, styles.sendButton]}
              onPress={handleSubmitSuggestion}
              disabled={isSubmittingSuggestion}
            >
              {isSubmittingSuggestion ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendButtonText}>Send Suggestion</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  setupButton: {
    backgroundColor: '#FF6B6B',
  },
  introButton: {
    backgroundColor: '#e91e63',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#999',
    opacity: 0.7,
  },
  noteModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  noteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  noteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  noteModalContent: {
    flex: 1,
    padding: 16,
  },
  noteModalLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    lineHeight: 22,
  },
  noteTextInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  noteModalHint: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  noteModalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  noteModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    backgroundColor: '#f0f0f0',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  sendButton: {
    backgroundColor: '#e91e63',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

