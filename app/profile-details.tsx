import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AskForInfoModal from '../components/AskForInfoModal';
import EngagementButton from '../components/EngagementButton';
import PictureViewerModal from '../components/home/PictureViewerModal';
import ReportProfileModal from '../components/home/ReportProfileModal';
import ContinuationChoiceModal from '../components/intro/ContinuationChoiceModal';
import MiddlePersonSelectionModal from '../components/intro/MiddlePersonSelectionModal';
import PreviousSuggestionWarningModal from '../components/suggestion/PreviousSuggestionWarningModal';
import ProfileGridSelectionModal from '../components/suggestion/ProfileGridSelectionModal';
import { infoRequestService } from '../lib/infoRequestService';
import { introService } from '../lib/introService';
import { pictureViewService } from '../lib/pictureViewService';
import { Profile as DBProfile, profileService } from '../lib/profileService';
import { suggestionService } from '../lib/suggestionService';
import { supabase } from '../lib/supabase';
import { calculateAge } from '../lib/utils';
import { Profile } from '../types/homeTypes';

export default function ProfileDetailsScreen() {
  const params = useLocalSearchParams();
  const profileId = (params.profileId || params.id) as string;
  const hideActions = params.hideActions === 'true'; // Hide actions when viewing from suggestions

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<DBProfile | null>(null);
  const [rawProfileData, setRawProfileData] = useState<any>(null); // Store raw data to check if fields have values
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showPictureViewer, setShowPictureViewer] = useState(false);
  const [selectedPictureIndex, setSelectedPictureIndex] = useState(0);

  // Intro request flow states
  const [showMiddlePersonModal, setShowMiddlePersonModal] = useState(false);
  const [selectedMiddlePerson, setSelectedMiddlePerson] = useState<any>(null);
  const [showContinuationChoiceModal, setShowContinuationChoiceModal] = useState(false);
  const [requesterContinuationChoice, setRequesterContinuationChoice] = useState<'by_themselves' | 'with_middle_person' | null>(null);
  const [showConfirmIntroModal, setShowConfirmIntroModal] = useState(false);
  const [showIntroSuccessModal, setShowIntroSuccessModal] = useState(false);
  const [isSubmittingIntro, setIsSubmittingIntro] = useState(false);
  const [existingIntroRequest, setExistingIntroRequest] = useState<any>(null);

  // Setup/Suggestion flow states
  const [showProfileGridModal, setShowProfileGridModal] = useState(false);
  const [selectedProfileForSetup, setSelectedProfileForSetup] = useState<Profile | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showSendConfirmationModal, setShowSendConfirmationModal] = useState(false);
  const [suggestionNote, setSuggestionNote] = useState('');
  const [useSameNote, setUseSameNote] = useState(true); // true = same note, false = different notes
  const [profileOneNote, setProfileOneNote] = useState('');
  const [profileTwoNote, setProfileTwoNote] = useState('');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  
  // Previous suggestion warning modal
  const [showPreviousSuggestionModal, setShowPreviousSuggestionModal] = useState(false);
  const [previousSuggestionInfo, setPreviousSuggestionInfo] = useState<{
    profileOneName: string;
    profileTwoName: string;
    profileOneStatus: 'pending' | 'accepted' | 'rejected';
    profileTwoStatus: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
  } | null>(null);

  // Info request states
  const [showAskForInfoModal, setShowAskForInfoModal] = useState(false);
  const [selectedFieldForInfo, setSelectedFieldForInfo] = useState<string>('');
  const [isSubmittingInfoRequest, setIsSubmittingInfoRequest] = useState(false);
  
  // One-time picture view tracking
  const [hasPicturesBeenViewed, setHasPicturesBeenViewed] = useState(false);

  // Report and Share states
  const [showReportModal, setShowReportModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);

      // Validate profileId
      if (!profileId || profileId === 'undefined' || profileId === '') {
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

      // Store raw data to check if fields have values
      setRawProfileData(data);

      // Transform to display profile - RESPECTING PRIVACY SETTINGS
      const fieldPrivacy = data.field_privacy || {};
      const picturePrivacy = data.picture_privacy || 'none';
      
      // Check if pictures have been viewed (for one_time privacy)
      let hasViewedPictures = false;
      if (picturePrivacy === 'one_time') {
        const viewResult = await pictureViewService.hasViewedPictures(profileId);
        if (viewResult.success) {
          hasViewedPictures = viewResult.hasViewed;
          setHasPicturesBeenViewed(hasViewedPictures);
        }
      }
      
      // Show pictures based on privacy setting and view status
      const showPictures = picturePrivacy === 'always' || picturePrivacy === 'private' || 
                          (picturePrivacy === 'one_time' && !hasViewedPictures);

      // Only show pictures if privacy allows
      const firstPicture = showPictures && data.pictures && data.pictures.length > 0 
        ? profileService.getImageUrl(data.pictures[0])
        : '';
      
      const allPictures = showPictures && data.pictures && data.pictures.length > 0
        ? data.pictures.map((pic: string) => profileService.getImageUrl(pic))
        : [];

      const locationString = data.location_country === "United States"
        ? `${data.location_city}, ${data.location_state}${data.location_country ? ', ' + data.location_country : ''}`
        : data.location_country;
      const location = fieldPrivacy.location_city || fieldPrivacy.location_state ? 'Hidden' : locationString;

      // Get approved info fields for this specific profile
      const infoRequestResult = await infoRequestService.getSentRequests();
      const currentApprovedFields = new Set<string>();
      if (infoRequestResult.success && infoRequestResult.requests) {
        infoRequestResult.requests
          .filter(r => r.requested_profile_id === profileId && r.status === 'approved')
          .forEach(r => currentApprovedFields.add(r.field_name));
      }

      // Create a function to check if a field should be shown (either not private OR has approved request)
      const shouldShowField = (fieldName: string): boolean => {
        return !fieldPrivacy[fieldName] || currentApprovedFields.has(fieldName);
      };

      const displayProfile: Profile = {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`,
        dob: shouldShowField('dob') ? data.dob : undefined,
        picture: firstPicture,
        pictures: allPictures,
        hashkafa_type: shouldShowField('hashkafa_type') ? data.hashkafa_type : undefined,
        location,
        bio: data.bio || 'No bio available',
        role: data.role,
        gender: data.gender,
        phone: shouldShowField('phone') ? data.phone : undefined,
        email: shouldShowField('email') ? data.email : undefined,
        whatsapp: shouldShowField('whatsapp') ? data.whatsapp : undefined,
        height: shouldShowField('height') ? data.height : undefined,
        hasChildren: shouldShowField('hasChildren') ? data.has_children : undefined,
        picturePrivacy: currentApprovedFields.has('pictures') ? 'always' : picturePrivacy,
        field_privacy: fieldPrivacy,
        // Additional fields from database
        what_looking_for: shouldShowField('what_looking_for') ? data.what_looking_for : undefined,
        location_city: shouldShowField('location_city') ? data.location_city : undefined,
        location_state: shouldShowField('location_state') ? data.location_state : undefined,
        location_country: shouldShowField('location_country') ? data.location_country : undefined,
        languages: shouldShowField('languages') ? data.languages : undefined,
        nationality: shouldShowField('nationality') ? data.nationality : undefined,
        is_cohen: shouldShowField('is_cohen') ? data.is_cohen : undefined,
        torah_learning: shouldShowField('torah_learning') ? data.torah_learning : undefined,
        praying: shouldShowField('praying') ? data.praying : undefined,
        education_level: shouldShowField('education_level') ? data.education_level : undefined,
        post_high_school_path: shouldShowField('post_high_school_path') ? data.post_high_school_path : undefined,
        current_occupation_study: shouldShowField('current_occupation_study') ? data.current_occupation_study : undefined,
        plan_after_marriage: shouldShowField('plan_after_marriage') ? data.plan_after_marriage : undefined,
        marital_status: shouldShowField('marital_status') ? data.marital_status : undefined,
        dress_style: shouldShowField('dress_style') ? data.dress_style : undefined,
        wears_black_hat: shouldShowField('wears_black_hat') ? data.wears_black_hat : undefined,
        head_covering: shouldShowField('head_covering') ? data.head_covering : undefined,
        smoking: shouldShowField('smoking') ? data.smoking : undefined,
        alcohol_consumption: shouldShowField('alcohol_consumption') ? data.alcohol_consumption : undefined,
        last_active_at: data.last_active_at,
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

  const handlePicturePress = async (index: number) => {
    // Check if pictures are private
    if (profile?.picturePrivacy === 'private') {
      handleAskForInfo('pictures');
      return;
    }
    
    // For one-time pictures, show alert if already viewed
    if (profile?.picturePrivacy === 'one_time' && hasPicturesBeenViewed) {
      Alert.alert(
        'Pictures Already Viewed',
        'You have already viewed this profile\'s pictures. One-time pictures can only be viewed once.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Record the view for one-time pictures (before opening)
    if (profile?.picturePrivacy === 'one_time' && !hasPicturesBeenViewed && profile.id) {
      const recordResult = await pictureViewService.recordPictureView(profile.id);
      if (recordResult.success) {
        setHasPicturesBeenViewed(true);
      }
    }
    
    setSelectedPictureIndex(index);
    setShowPictureViewer(true);
  };

  const handleAskForInfo = async (fieldName: string) => {
    // Check if there's already a pending or approved request for this field
    const result = await infoRequestService.getSentRequests();
    if (result.success && result.requests) {
      const existingRequest = result.requests.find(
        r => r.requested_profile_id === profile?.id && 
        r.field_name === fieldName && 
        (r.status === 'pending' || r.status === 'approved')
      );

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          Alert.alert(
            'Request Already Sent',
            'You already have a pending request for this information. Please wait for a response.',
            [{ text: 'OK' }]
          );
        } else if (existingRequest.status === 'approved') {
          Alert.alert(
            'Request Approved',
            'This request has already been approved. Go to the Connect tab to see the information.',
            [
              { text: 'Cancel' },
              { text: 'Reload', onPress: () => loadProfileData() }
            ]
          );
        }
        return;
      }
    }

    setSelectedFieldForInfo(fieldName);
    setShowAskForInfoModal(true);
  };

  const handleSubmitInfoRequest = async (note: string) => {
    if (!profile) return;

    setIsSubmittingInfoRequest(true);
    try {
      const result = await infoRequestService.createInfoRequest(
        profile.id,
        selectedFieldForInfo,
        note
      );

      if (result.success) {
        Alert.alert(
          'Request Sent! 📤',
          `Your request has been sent to ${profile.name.split(' ')[0]}. You'll be notified when they respond.`,
          [{ text: 'OK' }]
        );
        setShowAskForInfoModal(false);
      } else {
        Alert.alert('Error', result.error || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error submitting info request:', error);
      Alert.alert('Error', 'Failed to send request');
    } finally {
      setIsSubmittingInfoRequest(false);
    }
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

    // Start the intro flow by selecting Matchmaker/Shadchan
    setShowMiddlePersonModal(true);
  };

  const handleMiddlePersonSelected = (middlePerson: any) => {
    setSelectedMiddlePerson(middlePerson);
    setShowMiddlePersonModal(false);
    // Show continuation choice modal after selecting matchmaker
    setShowContinuationChoiceModal(true);
  };

  const handleContinuationChoice = (choice: 'by_themselves' | 'with_middle_person') => {
    setRequesterContinuationChoice(choice);
    setShowContinuationChoiceModal(false);
    // Show confirmation modal after choosing continuation
    setShowConfirmIntroModal(true);
  };

  const handleConfirmIntro = async () => {
    if (!profile || !selectedMiddlePerson || !requesterContinuationChoice) return;

    setShowConfirmIntroModal(false);
    setIsSubmittingIntro(true);

    try {
      // Create the intro request with Ori's continuation choice
      const result = await introService.createIntroRequest(
        profile.id,
        selectedMiddlePerson.id,
        requesterContinuationChoice
      );

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create intro request');
        setIsSubmittingIntro(false);
        return;
      }

      // Show success modal
      setShowIntroSuccessModal(true);
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

  const handleProfileSelected = async (selectedProfile: Profile) => {
    setSelectedProfileForSetup(selectedProfile);
    setShowProfileGridModal(false);
    // Reset note states
    setSuggestionNote('');
    setProfileOneNote('');
    setProfileTwoNote('');
    setUseSameNote(true);
    
    // Check for previous suggestions
    if (profile) {
      const result = await suggestionService.checkPreviousSuggestion(
        profile.id,
        selectedProfile.id
      );
      
      if (result.success && result.hasPrevious && result.previousSuggestion) {
        // Show warning modal about previous suggestion
        setPreviousSuggestionInfo({
          profileOneName: result.previousSuggestion.profileOneName,
          profileTwoName: result.previousSuggestion.profileTwoName,
          profileOneStatus: result.previousSuggestion.profileOneStatus,
          profileTwoStatus: result.previousSuggestion.profileTwoStatus,
          createdAt: result.previousSuggestion.createdAt,
        });
        setShowPreviousSuggestionModal(true);
      } else {
        // No previous suggestion, proceed directly to note modal
        setShowNoteModal(true);
      }
    } else {
      // No profile, just proceed (shouldn't happen but safe fallback)
      setShowNoteModal(true);
    }
  };

  const handlePreviousSuggestionContinue = () => {
    // User wants to suggest again despite previous suggestion
    setShowPreviousSuggestionModal(false);
    setPreviousSuggestionInfo(null);
    setShowNoteModal(true);
  };

  const handlePreviousSuggestionCancel = () => {
    // User doesn't want to suggest again
    setShowPreviousSuggestionModal(false);
    setPreviousSuggestionInfo(null);
    setSelectedProfileForSetup(null);
  };

  const handleNoteModalSkip = () => {
    // Close note modal and proceed to confirmation
    setShowNoteModal(false);
    setShowSendConfirmationModal(true);
  };

  const handleNoteModalAddNote = () => {
    // Close note modal and proceed to confirmation
    setShowNoteModal(false);
    setShowSendConfirmationModal(true);
  };

  const handleSendSuggestion = async () => {
    if (!selectedProfileForSetup || !profile) return;

    setIsSubmittingSuggestion(true);
    try {
      let result;
      if (useSameNote) {
        // Use same note for both (legacy behavior)
        result = await suggestionService.createSuggestion(
          profile.id,
          selectedProfileForSetup.id,
          suggestionNote.trim() || undefined
        );
      } else {
        // Use different notes
        result = await suggestionService.createSuggestion(
          profile.id,
          selectedProfileForSetup.id,
          undefined, // legacy note
          profileOneNote.trim() || undefined, // profile_one_note
          profileTwoNote.trim() || undefined  // profile_two_note
        );
      }

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create suggestion');
        return;
      }

      setShowSendConfirmationModal(false);
      setSuggestionNote('');
      setProfileOneNote('');
      setProfileTwoNote('');
      setUseSameNote(true);
      setSelectedProfileForSetup(null);

      Alert.alert(
          'Suggestion Sent! 💡',
        `Your match suggestion has been sent to ${profile.name} and ${selectedProfileForSetup.name}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to Connect tab - You Liked section
              router.push('/(tabs)/connect?section=liked');
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

  const handleReportProfile = () => {
    setShowReportModal(true);
  };

  const handleShareProfile = async () => {
    if (!profile) return;

    try {
      setIsSharing(true);
      
      // Create deep link URL for the profile
      const shareUrl = `shiduchimapp://profile/${profile.id}`;
      
      // Create a fallback URL that redirects to App Store if app is not installed
      const appStoreUrl = 'https://apps.apple.com/app/id6738294076'; // Replace with actual App Store ID
      const fallbackUrl = `https://shiduchimapp.com/profile/${profile.id}?fallback=${encodeURIComponent(appStoreUrl)}`;
      
      const message = `Check out ${profile.name}'s profile on Zivug Mishamayim!\n\n${shareUrl}\n\nIf you don't have the app: ${fallbackUrl}`;
      
      const result = await Share.share({
        message,
        title: `${profile.name}'s Profile`,
      });

      if (result.action === Share.sharedAction) {
        console.log('Profile shared successfully');
      }
    } catch (error) {
      console.error('Error sharing profile:', error);
      Alert.alert('Error', 'Failed to share profile. Please try again.');
    } finally {
      setIsSharing(false);
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
          <ActivityIndicator size="large" color="#03a9f4" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return null;
  }
  // Helper to check if field is private
  const isFieldPrivate = (fieldName: string): boolean => {
    return profile?.field_privacy?.[fieldName] === true;
  };

  // Helper to check if a field has a value in the database (before privacy filtering)
  const hasFieldValue = (fieldName: string): boolean => {
    if (!rawProfileData) return false;
    const value = rawProfileData[fieldName];
    return value !== null && value !== undefined && value !== '';
  };

  // Helper component for rendering a detail row with "Ask me" button
  const renderDetailRow = (label: string, value: any, fieldName: string) => {
    // Only render if field has a value in the database
    if (!hasFieldValue(fieldName)) {
      return null;
    }

    const isPrivate = isFieldPrivate(fieldName);
    
    if (isPrivate) {
      return (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{label}:</Text>
          <TouchableOpacity
            style={styles.askMeButton}
            onPress={() => handleAskForInfo(fieldName)}
          >
            <Ionicons name="lock-closed" size={14} color="#03a9f4" />
            <Text style={styles.askMeButtonText}>Ask me</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}:</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    );
  };

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
          <View style={styles.imageWrapper}>
            {profile.picturePrivacy === 'none' || !profile.picture || imageError ? (
              // No photo - show generic avatar
              <View style={[styles.profileImage, styles.placeholderProfileImage]}>
                <Ionicons name="person" size={50} color="#ccc" />
              </View>
            ) : (
              // Public or Private - show image
              <>
                <Image 
                  source={{ uri: profile.picture }} 
                  style={styles.profileImage}
                  onError={() => setImageError(true)}
                  blurRadius={profile.picturePrivacy === 'private' ? 20 : 0}
                />
                {profile.picturePrivacy === 'private' &&  (
                  <TouchableOpacity
                    style={styles.seeMoreOverlay}
                    onPress={() => handleAskForInfo('pictures')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="lock-closed" size={32} color="#fff" />
                    <Text style={styles.seeMoreText}>See More</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileAge}>Age: {calculateAge(profile.dob)}</Text>
            <Text style={styles.profileLocation}>{profile.location}</Text>
          </View>
        </View>

        {/* Pictures Section */}
        {profile.picturePrivacy !== 'none' && profile.pictures && profile.pictures.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pictures</Text>
            <View style={styles.picturesGrid}>
              {profile.pictures.slice(0, 3).map((picture, index) => (
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
                    blurRadius={profile.picturePrivacy === 'private' ? 15 : 0}
                  />
                  {profile.picturePrivacy === 'private' && (
                    <View style={styles.blurOverlay}>
                      <Ionicons name="lock-closed" size={20} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {profile.picturePrivacy === 'private' && (
              <Text style={styles.pictureNote}>
                Photos are private. Click any photo to request access.
              </Text>
            )}
          </View>
        )}

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About 👤</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information 📋</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gender:</Text>
            <Text style={styles.detailValue}>{profile.gender}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Role:</Text>
            <Text style={styles.detailValue}>{profile.role}</Text>
          </View>
          
          {renderDetailRow('Looking For', profile.what_looking_for, 'what_looking_for')}
          {renderDetailRow('Height', profile.height, 'height')}
          {renderDetailRow('Has Children', profile.hasChildren !== undefined ? (profile.hasChildren ? 'Yes' : 'No') : null, 'hasChildren')}
        </View>

        {/* Location Section */}
        {(hasFieldValue('location_city') || hasFieldValue('location_state') || hasFieldValue('location_country')) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location 📍</Text>
            {renderDetailRow('City', profile.location_city, 'location_city')}
            {renderDetailRow('State', profile.location_state, 'location_state')}
            {renderDetailRow('Country', profile.location_country, 'location_country')}
          </View>
        )}

        {/* Languages & Background */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Languages & Background 🌍</Text>
          {renderDetailRow('Languages', profile.languages && profile.languages.length > 0 ? profile.languages.join(', ') : null, 'languages')}
          {renderDetailRow('Background', profile.nationality && profile.nationality.length > 0 ? profile.nationality.join(', ') : null, 'nationality')}
          {profile.gender === 'male' && renderDetailRow('Cohen', profile.is_cohen !== undefined ? (profile.is_cohen ? 'Yes' : 'No') : null, 'is_cohen')}
        </View>

        {/* Hashkafa / Religious Outlook */}
        {(profile.hashkafa_type || profile.hashkafa_type || profile.torah_learning || profile.praying) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Religious Outlook ✡️</Text>
            
            {profile.hashkafa_type && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Hashkafa:</Text>
                <Text style={styles.detailValue}>{profile.hashkafa_type}</Text>
              </View>
            )}
            
            {profile.hashkafa_type && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{profile.hashkafa_type}</Text>
              </View>
            )}
            
            {profile.torah_learning && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Torah Learning:</Text>
                <Text style={styles.detailValue}>{profile.torah_learning}</Text>
              </View>
            )}
            
            {profile.praying && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Praying:</Text>
                <Text style={styles.detailValue}>{profile.praying}</Text>
              </View>
            )}
          </View>
        )}

        {/* Education */}
        {(profile.education_level || profile.post_high_school_path) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education 🎓</Text>
            
            {profile.education_level && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Education Level:</Text>
                <Text style={styles.detailValue}>{profile.education_level}</Text>
              </View>
            )}
            
            {profile.post_high_school_path && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Post-High School Path:</Text>
                <Text style={styles.detailValue}>{profile.post_high_school_path}</Text>
              </View>
            )}
          </View>
        )}

        {/* Occupation / Study */}
        {profile.current_occupation_study && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Occupation / Study 💼</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Status:</Text>
              <Text style={styles.detailValue}>{profile.current_occupation_study}</Text>
            </View>
          </View>
        )}

        {/* Plan After Marriage */}
        {profile.plan_after_marriage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plan After Marriage 💍</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Plans:</Text>
              <Text style={styles.detailValue}>{profile.plan_after_marriage}</Text>
            </View>
          </View>
        )}

        {/* Marital Status */}
        {profile.marital_status && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Marital Status 💑</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={styles.detailValue}>{profile.marital_status}</Text>
            </View>
          </View>
        )}

        {/* Dress & Appearance */}
        {(profile.dress_style || (profile.gender === 'male' && profile.wears_black_hat !== undefined) || (profile.gender === 'female' && profile.head_covering)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dress & Appearance 👔</Text>
            
            {profile.dress_style && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dress Style:</Text>
                <Text style={styles.detailValue}>{profile.dress_style}</Text>
              </View>
            )}
            
            {profile.gender === 'male' && profile.wears_black_hat !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Black Hat:</Text>
                <Text style={styles.detailValue}>{profile.wears_black_hat ? 'Yes' : 'No'}</Text>
              </View>
            )}
            
            {profile.gender === 'female' && profile.head_covering && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Head Covering:</Text>
                <Text style={styles.detailValue}>{profile.head_covering}</Text>
              </View>
            )}
          </View>
        )}

        {/* Lifestyle */}
        {(profile.smoking || profile.alcohol_consumption) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lifestyle 🌟</Text>
            
            {profile.smoking && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Smoking:</Text>
                <Text style={styles.detailValue}>{profile.smoking}</Text>
              </View>
            )}
            
            {profile.alcohol_consumption && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Alcohol Consumption:</Text>
                <Text style={styles.detailValue}>{profile.alcohol_consumption}</Text>
              </View>
            )}
          </View>
        )}

        {/* Last Active */}
        {profile.last_active_at && (
          <View style={styles.section}>
            <View style={styles.lastActiveContainer}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={styles.lastActiveText}>
                Last active: {new Date(profile.last_active_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        {/* Report and Share Buttons */}
        {!hideActions && profile && currentUserProfile && (
          <View style={styles.inlineActionsSection}>
            <TouchableOpacity
              style={[styles.inlineButton, styles.reportButton]}
              onPress={handleReportProfile}
            >
              <Ionicons name="flag-outline" size={20} color="#f44336" />
              <Text style={styles.reportButtonText}>Report Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.inlineButton, styles.shareButton]}
              onPress={handleShareProfile}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator color="#03a9f4" size="small" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={20} color="#03a9f4" />
                  <Text style={styles.shareButtonText}>Share Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

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

          {/* Engagement button - for singles with accepted intros */}
          {currentUserProfile.role === 'single' && existingIntroRequest?.status === 'accepted' && (
            <EngagementButton
              otherUserId={profile.id}
              otherUserName={profile.name}
              currentUserName={currentUserProfile.first_name}
            />
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

      {/* Ask for Info Modal */}
      <AskForInfoModal
        visible={showAskForInfoModal}
        fieldName={selectedFieldForInfo}
        profileName={profile.name}
        onClose={() => setShowAskForInfoModal(false)}
        onSubmit={handleSubmitInfoRequest}
        isSubmitting={isSubmittingInfoRequest}
      />

      {/* Report Profile Modal */}
      {profile && (
        <ReportProfileModal
          visible={showReportModal}
          profileId={profile.id}
          profileName={profile.name}
          onClose={() => setShowReportModal(false)}
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

      {/* Confirmation Modal before sending intro request */}
      <Modal
        visible={showConfirmIntroModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConfirmIntroModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Ionicons name="mail" size={48} color="#03a9f4" />
              <Text style={styles.confirmModalTitle}>Confirm Intro Request</Text>
            </View>
            
            {profile && selectedMiddlePerson && (
              <View style={styles.confirmModalBody}>
                <Text style={styles.confirmModalText}>
                  You're asking <Text style={styles.boldText}>{selectedMiddlePerson.first_name} {selectedMiddlePerson.last_name}</Text> to facilitate an introduction with <Text style={styles.boldText}>{profile.name}</Text>.
                </Text>
                <View style={styles.confirmModalInfo}>
                  <Ionicons name="information-circle" size={20} color="#666" />
                  <Text style={styles.confirmModalInfoText}>
                    {selectedMiddlePerson.first_name} will review your request and decide whether to proceed.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmCancelButton]}
                onPress={() => {
                  setShowConfirmIntroModal(false);
                  setSelectedMiddlePerson(null);
                }}
              >
                <Text style={styles.confirmCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmSendButton]}
                onPress={handleConfirmIntro}
                disabled={isSubmittingIntro}
              >
                {isSubmittingIntro ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" />
                    <Text style={styles.confirmSendButtonText}>Send Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal after sending intro request */}
      <Modal
        visible={showIntroSuccessModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowIntroSuccessModal(false);
          setSelectedMiddlePerson(null);
          router.push('/(tabs)/connect?section=liked');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
              <Text style={styles.confirmModalTitle}>Intro Request Sent! 💌</Text>
            </View>
            
            {profile && selectedMiddlePerson && (
              <View style={styles.confirmModalBody}>
                <Text style={styles.confirmModalText}>
                  Your request has been sent to <Text style={styles.boldText}>{selectedMiddlePerson.first_name} {selectedMiddlePerson.last_name}</Text>.
                </Text>
                <View style={styles.confirmModalInfo}>
                  <Ionicons name="time" size={20} color="#03a9f4" />
                  <Text style={styles.confirmModalInfoText}>
                    They will review and respond soon. You'll be notified of their decision.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmSendButton, { width: '100%' }]}
                onPress={() => {
                  setShowIntroSuccessModal(false);
                  setSelectedMiddlePerson(null);
                  router.push('/(tabs)/connect?section=liked');
                }}
              >
                <Text style={styles.confirmSendButtonText}>Go to Connect</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Continuation Choice Modal - Shown after selecting matchmaker */}
      {profile && selectedMiddlePerson && (
        <ContinuationChoiceModal
          visible={showContinuationChoiceModal}
          profileName={`${profile.first_name} ${profile.last_name}`}
          onSelectChoice={handleContinuationChoice}
          onCancel={() => {
            setShowContinuationChoiceModal(false);
            setSelectedMiddlePerson(null);
            setRequesterContinuationChoice(null);
          }}
        />
      )}

      {/* Profile Grid Selection Modal for Setup */}
      <ProfileGridSelectionModal
        visible={showProfileGridModal}
        currentUserGender={profile?.gender}
        excludedProfileId={currentUserProfile?.id}
        onSelect={handleProfileSelected}
        onCancel={() => setShowProfileGridModal(false)}
      />

      {/* Previous Suggestion Warning Modal */}
      {previousSuggestionInfo && (
        <PreviousSuggestionWarningModal
          visible={showPreviousSuggestionModal}
          profileOneName={previousSuggestionInfo.profileOneName}
          profileTwoName={previousSuggestionInfo.profileTwoName}
          profileOneStatus={previousSuggestionInfo.profileOneStatus}
          profileTwoStatus={previousSuggestionInfo.profileTwoStatus}
          createdAt={previousSuggestionInfo.createdAt}
          onCancel={handlePreviousSuggestionCancel}
          onContinue={handlePreviousSuggestionContinue}
        />
      )}

      {/* Note Modal for Suggestion */}
      <Modal
        visible={showNoteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowNoteModal(false);
          setSuggestionNote('');
          setProfileOneNote('');
          setProfileTwoNote('');
          setUseSameNote(true);
          setSelectedProfileForSetup(null);
        }}
      >
        <View style={styles.noteModalContainer}>
          <View style={styles.noteModalHeader}>
            <TouchableOpacity onPress={() => {
              setShowNoteModal(false);
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

            {/* Note Mode Toggle */}
            <View style={styles.noteModeToggle}>
              <TouchableOpacity
                style={[styles.noteModeOption, useSameNote && styles.noteModeOptionActive]}
                onPress={() => setUseSameNote(true)}
              >
                <Ionicons 
                  name={useSameNote ? "radio-button-on" : "radio-button-off"} 
                  size={20} 
                  color={useSameNote ? "#03a9f4" : "#999"} 
                />
                <Text style={[styles.noteModeText, useSameNote && styles.noteModeTextActive]}>
                  Same note for both
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.noteModeOption, !useSameNote && styles.noteModeOptionActive]}
                onPress={() => setUseSameNote(false)}
              >
                <Ionicons 
                  name={!useSameNote ? "radio-button-on" : "radio-button-off"} 
                  size={20} 
                  color={!useSameNote ? "#03a9f4" : "#999"} 
                />
                <Text style={[styles.noteModeText, !useSameNote && styles.noteModeTextActive]}>
                  Different notes
                </Text>
              </TouchableOpacity>
            </View>

            {useSameNote ? (
              <>
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
              </>
            ) : (
              <>
                <Text style={styles.separateNoteLabel}>
                  Note for {profile?.name}:
                </Text>
                <TextInput
                  style={styles.noteTextInput}
                  placeholder={`Why do you think ${profile?.name} would be a good match?`}
                  value={profileOneNote}
                  onChangeText={setProfileOneNote}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  autoFocus
                />
                <Text style={styles.separateNoteLabel}>
                  Note for {selectedProfileForSetup?.name}:
                </Text>
                <TextInput
                  style={styles.noteTextInput}
                  placeholder={`Why do you think ${selectedProfileForSetup?.name} would be a good match?`}
                  value={profileTwoNote}
                  onChangeText={setProfileTwoNote}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.noteModalHint}>
                  Each profile will only see their own note when they receive your suggestion.
                </Text>
              </>
            )}
          </ScrollView>

          <View style={styles.noteModalActions}>
            <TouchableOpacity
              style={[styles.noteModalButton, styles.skipButton]}
              onPress={handleNoteModalSkip}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.noteModalButton, styles.addNoteButton]}
              onPress={handleNoteModalAddNote}
            >
              <Text style={styles.addNoteButtonText}>Add Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Send Confirmation Modal */}
      <Modal
        visible={showSendConfirmationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowSendConfirmationModal(false);
        }}
      >
        <View style={styles.noteModalContainer}>
          <View style={styles.noteModalHeader}>
            <TouchableOpacity onPress={() => {
              setShowSendConfirmationModal(false);
            }}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.noteModalTitle}>Send Suggestion</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.noteModalContent}>
            <Text style={styles.noteModalLabel}>
              You are about to suggest {profile?.name} and {selectedProfileForSetup?.name} to each other.
            </Text>

            {/* Show note preview if notes were added */}
            {(() => {
              const hasSameNote = useSameNote && suggestionNote.trim();
              const hasDifferentNotes = !useSameNote && (profileOneNote.trim() || profileTwoNote.trim());
              
              if (hasSameNote) {
                return (
                  <View style={styles.notePreviewSection}>
                    <Text style={styles.notePreviewLabel}>Your note:</Text>
                    <View style={styles.notePreviewCard}>
                      <Text style={styles.notePreviewText}>{suggestionNote}</Text>
                    </View>
                  </View>
                );
              } else if (hasDifferentNotes) {
                return (
                  <View style={styles.notePreviewSection}>
                    <Text style={styles.notePreviewLabel}>Your notes:</Text>
                    {profileOneNote.trim() && (
                      <>
                        <Text style={styles.notePreviewSubLabel}>For {profile?.name}:</Text>
                        <View style={styles.notePreviewCard}>
                          <Text style={styles.notePreviewText}>{profileOneNote}</Text>
                        </View>
                      </>
                    )}
                    {profileTwoNote.trim() && (
                      <>
                        <Text style={[styles.notePreviewSubLabel, { marginTop: 12 }]}>For {selectedProfileForSetup?.name}:</Text>
                        <View style={styles.notePreviewCard}>
                          <Text style={styles.notePreviewText}>{profileTwoNote}</Text>
                        </View>
                      </>
                    )}
                  </View>
                );
              } else {
                return (
                  <View style={styles.noNoteSection}>
                    <Ionicons name="document-text-outline" size={32} color="#ccc" />
                    <Text style={styles.noNoteText}>No note added</Text>
                  </View>
                );
              }
            })()}
          </ScrollView>

          <View style={styles.noteModalActions}>
            <TouchableOpacity
              style={[styles.noteModalButton, styles.cancelButton]}
              onPress={() => {
                setShowSendConfirmationModal(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.noteModalButton, styles.sendButton]}
              onPress={handleSendSuggestion}
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
  lastActiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  lastActiveText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inlineActionsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  inlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
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
    backgroundColor: '#03a9f4',
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
  reportButton: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  reportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f44336',
  },
  shareButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#bbdefb',
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#03a9f4',
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
    marginTop: 8,
  },
  noteModeToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    padding: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  noteModeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  noteModeOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteModeText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  noteModeTextActive: {
    color: '#03a9f4',
    fontWeight: '600',
  },
  separateNoteLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  noteModalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 26,
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
    backgroundColor: '#03a9f4',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  imageWrapper: {
    position: 'relative',
  },
  seeMoreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    gap: 8,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  pictureNote: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  askMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e1f5fe',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#03a9f4',
  },
  askMeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#03a9f4',
  },
  addNoteButton: {
    backgroundColor: '#03a9f4',
  },
  addNoteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  notePreviewSection: {
    marginTop: 20,
  },
  notePreviewLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  notePreviewSubLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  notePreviewCard: {
    backgroundColor: '#FFF9C4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFF176',
    marginBottom: 16,
  },
  notePreviewText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  noNoteSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginTop: 20,
  },
  noNoteText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    fontStyle: 'italic',
  },
  // Confirmation Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  confirmModalHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  confirmModalBody: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  confirmModalText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  boldText: {
    fontWeight: '700',
    color: '#03a9f4',
  },
  confirmModalInfo: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  confirmModalInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  confirmModalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  confirmModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  confirmCancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  confirmCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmSendButton: {
    backgroundColor: '#03a9f4',
  },
  confirmSendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

