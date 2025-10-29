import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileStatusModal from '../../components/ProfileStatusModal';
import { useProfileShare } from '../../hooks/useProfileShare';
import { Profile, profileService } from '../../lib/profileService';
import { supabase } from '../../lib/supabase';

const { width: screenWidth } = Dimensions.get('window');

interface ProfileData {
  firstName: string;
  lastName: string;
  age: string;
  hashkafa: string;
  role: 'single' | 'matchmaker' | 'both';
  gender: 'male' | 'female';
  address: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  school: string;
  occupation: string;
  bio: string;
  phone: string;
  email: string;
  whatsapp: string;
  pictures: string[];
  mainPictureIndex: number;
  picturePrivacy: 'none' | 'always' | 'private';
  height: string;
  hasChildren: 'yes' | 'no' | '';
  matchmakerEmail?: string;
}

interface PrivacySettings {
  height: boolean;
  hasChildren: boolean;
  address: boolean;
  school: boolean;
  occupation: boolean;
}

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Israel', 'Australia',
  'France', 'Germany', 'Spain', 'Italy', 'Netherlands',
  'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Denmark',
  'Norway', 'Finland', 'Poland', 'Czech Republic', 'Hungary',
  'Portugal', 'Greece', 'Ireland', 'New Zealand', 'South Africa',
  'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia',
  'Other'
].sort();

export default function ProfileScreen() {
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    age: '',
    hashkafa: '',
    role: 'single',
    gender: 'male',
    address: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    school: '',
    occupation: '',
    bio: '',
    phone: '',
    email: '',
    whatsapp: '',
    pictures: [],
    mainPictureIndex: 0,
    picturePrivacy: 'none',
    height: '',
    hasChildren: '',
    matchmakerEmail: ''
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    height: false,
    hasChildren: false,
    address: false,
    school: false,
    occupation: false
  });

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [matchmakerInfo, setMatchmakerInfo] = useState<{name: string; email: string} | null>(null);
  const [showMatchmakerInput, setShowMatchmakerInput] = useState(false);

  const [showPictureViewer, setShowPictureViewer] = useState(false);
  const [selectedPictureIndex, setSelectedPictureIndex] = useState(0);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [profileStatus, setProfileStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectionReason, setRejectionReason] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [existingProfile, setExistingProfile] = useState<Profile | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const { isSharing, shareProfile } = useProfileShare();

  // Load existing profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const result = await profileService.getProfile();
      if (result.success && result.profile) {
        const profile = result.profile;
        setExistingProfile(profile);
        setProfileStatus(profile.status);
        setRejectionReason(profile.rejection_reason);

        // Convert storage paths to public URLs for displaying
        const pictureUrls = (profile.pictures || []).map((path: string) => {
          // If it's already a full URL, keep it
          if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
          }
          // If it's a storage path, convert to public URL
          return profileService.getImageUrl(path);
        });


        // Populate form with existing data
        setProfileData({
          firstName: profile.first_name,
          lastName: profile.last_name,
          age: profile.age.toString(),
          hashkafa: profile.hashkafa,
          role: profile.role as 'single' | 'matchmaker',
          gender: profile.gender as 'male' | 'female',
          address: profile.address,
          street: profile.street || '',
          city: profile.city || '',
          state: profile.state || '',
          zipCode: profile.zip_code || '',
          country: profile.country || '',
          school: profile.school,
          occupation: profile.occupation,
          bio: profile.bio,
          phone: profile.phone,
          email: profile.email,
          whatsapp: profile.whatsapp,
          pictures: pictureUrls,
          mainPictureIndex: 0,
          picturePrivacy: profile.picture_privacy as any,
          height: profile.height || '',
          hasChildren: profile.has_children !== undefined 
            ? (profile.has_children ? 'yes' : 'no')
            : '',
        });

        setPrivacySettings(profile.privacy_settings || {
          height: false,
          hasChildren: false,
          address: false,
          school: false,
          occupation: false
        });

        // Load matchmaker info if exists
        if (profile.matchmaker_id) {
          try {
            const { data: matchmakerData } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', profile.matchmaker_id)
              .single();
            
            if (matchmakerData) {
              setMatchmakerInfo({
                name: `${matchmakerData.first_name} ${matchmakerData.last_name}`,
                email: matchmakerData.email
              });
              setShowMatchmakerInput(false);
            }
          } catch (err) {
            console.error('Error loading matchmaker info:', err);
          }
        } else {
          setMatchmakerInfo(null);
          setShowMatchmakerInput(false);
        }

        // Show status modal if pending or rejected (not approved)
        if (profile.status === 'pending' || profile.status === 'rejected') {
          setShowStatusModal(true);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePrivacyChange = (field: keyof PrivacySettings, value: boolean) => {
    setPrivacySettings(prev => ({ ...prev, [field]: value }));
  };

  const handleShareProfile = async () => {
    try {
      if (!existingProfile || profileStatus !== 'approved') {
        Alert.alert('Cannot Share', 'Please complete and get your profile approved before sharing.');
        return;
      }

      // Build location string
      const locationParts = [profileData.city, profileData.state, profileData.country].filter(Boolean);
      const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;

      // Share profile as PDF with current form data
      await shareProfile(existingProfile, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        age: profileData.age,
        bio: profileData.bio,
        height: profileData.height,
        hasChildren: profileData.hasChildren === 'yes',
        school: profileData.school,
        occupation: profileData.occupation,
        location,
        phone: profileData.phone,
        email: profileData.email,
        whatsapp: profileData.whatsapp,
        pictures: profileData.pictures, // Include the pictures from form data
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
      Alert.alert('Error', 'Unable to share profile');
    }
  };

  const pickImage = async () => {
    if (profileData.pictures.length >= 3) {
      Alert.alert('Limit Reached', 'You can only upload up to 3 pictures');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileData(prev => ({
        ...prev,
        pictures: [...prev.pictures, result.assets[0].uri]
      }));
    }
  };

  const removePicture = (index: number) => {
    const isPrimary = index === 0;
    Alert.alert(
      'Delete Photo',
      `Are you sure you want to delete this ${isPrimary ? 'main ' : ''}photo? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setProfileData(prev => ({
              ...prev,
              pictures: prev.pictures.filter((_, i) => i !== index)
            }));
          }
        }
      ]
    );
  };

  const openPictureViewer = (index: number) => {
    setSelectedPictureIndex(index);
    setShowPictureViewer(true);
  };

  const saveProfile = async () => {
    const requiredFields = ['firstName', 'lastName', 'age', 'hashkafa', 'bio', 'phone', 'email', 'whatsapp'];
    const missingFields = requiredFields.filter(field => !profileData[field as keyof ProfileData]);
    
    if (missingFields.length > 0) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Convert hasChildren to boolean before saving
      const dataToSave = {
        ...profileData,
        hasChildren: profileData.hasChildren === 'yes' ? true : profileData.hasChildren === 'no' ? false : undefined
      };

      let result: { success: boolean; error?: string; profile?: Profile; wasResubmitted?: boolean };
      
      if (existingProfile) {
        // Update existing profile
        result = await profileService.updateProfile(dataToSave, privacySettings);
      } else {
        // Create new profile
        result = await profileService.createProfile(dataToSave, privacySettings);
      }

      if (result.success && result.profile) {
        setExistingProfile(result.profile);
        setProfileStatus(result.profile.status);
        if (result?.profile?.rejection_reason !== '') setRejectionReason(result?.profile?.rejection_reason);
        
        // Reload profile to get the converted public URLs for images
        await loadProfile();
        
        // Determine if we should show the status modal
        // Show it for pending/rejected, and ESPECIALLY if it was just resubmitted
        // When resubmitted, status is now 'pending' so it shows "Under Review" modal
        const shouldShowStatusModal = result.profile.status !== 'approved';
        
        // Show appropriate message based on whether profile was resubmitted
        const successMessage = result.wasResubmitted 
          ? 'Profile updated and resubmitted for admin review!' 
          : 'Profile saved successfully!';
        
        Alert.alert('Success', successMessage, [
          { 
            text: 'OK', 
            onPress: () => {
              if (shouldShowStatusModal) {
                setShowStatusModal(true);
              }
            }
          }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        automaticallyAdjustContentInsets={false}
        
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Profile Setup</Text>
              <Text style={styles.subtitle}>Tell us about yourself</Text>
            </View>
            <View style={styles.headerButtons}>
              {existingProfile && profileStatus === 'approved' && (
                <TouchableOpacity 
                  style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
                  onPress={handleShareProfile}
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <Ionicons name="share-social" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => router.push('/(tabs)/settings')}
              >
                <Ionicons name="settings" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Pictures */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pictures</Text>
          
          <View style={styles.picturePrivacy}>
            <Text style={styles.label}>Picture Privacy *</Text>
            <Text style={styles.helpText}>Choose how you want to share your pictures</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioOption, profileData.picturePrivacy === 'none' && styles.radioSelected]}
                onPress={() => handleInputChange('picturePrivacy', 'none')}
              >
                <Text style={[styles.radioText, profileData.picturePrivacy === 'none' && styles.radioTextSelected]}>No Picture</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioOption, profileData.picturePrivacy === 'always' && styles.radioSelected]}
                onPress={() => handleInputChange('picturePrivacy', 'always')}
              >
                <Text style={[styles.radioText, profileData.picturePrivacy === 'always' && styles.radioTextSelected]}>Always Visible</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioOption, profileData.picturePrivacy === 'private' && styles.radioSelected]}
                onPress={() => handleInputChange('picturePrivacy', 'private')}
              >
                <Text style={[styles.radioText, profileData.picturePrivacy === 'private' && styles.radioTextSelected]}>Private Share</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.privacyHelpText}>
              {profileData.picturePrivacy === 'none' && '• Your profile will not show any pictures'}
              {profileData.picturePrivacy === 'always' && '• Your pictures will be visible to everyone'}
              {profileData.picturePrivacy === 'private' && '• Pictures shown only when you approve info requests'}
            </Text>
          </View>

          {profileData.picturePrivacy !== 'none' && (
            <>
              <Text style={styles.pictureGuide}>
                {profileData.pictures.length === 0 && 'Add up to 3 photos. The first will be your main photo.'}
                {profileData.pictures.length > 0 && profileData.pictures.length < 3 && `You can add ${3 - profileData.pictures.length} more photo${3 - profileData.pictures.length > 1 ? 's' : ''}.`}
                {profileData.pictures.length === 3 && 'You have added the maximum number of photos.'}
              </Text>
              <View style={styles.picturesContainer}>
                {profileData.pictures.map((picture, index) => {
                  return (
                    <View key={index} style={styles.pictureWrapper}>
                      <TouchableOpacity onPress={() => openPictureViewer(index)}>
                        <Image 
                          source={{ uri: picture }} 
                          style={styles.picture}
                          onLoad={() => console.log(`Image ${index} loaded successfully`)}
                          onError={(error) => {
                            console.log(`Image ${index} load error:`, error.nativeEvent.error);
                          }}
                        />
                      </TouchableOpacity>
                      {index === 0 && (
                        <View style={styles.mainBadge}>
                          <Text style={styles.mainBadgeText}>MAIN</Text>
                        </View>
                      )}
                      <TouchableOpacity 
                        style={styles.removePicture}
                        onPress={() => removePicture(index)}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                
                {profileData.pictures.length < 3 && (
                  <TouchableOpacity style={styles.addPicture} onPress={pickImage}>
                    <Ionicons name="camera" size={24} color="#666" />
                    <Text style={styles.addPictureText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About You</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio *</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={profileData.bio}
              onChangeText={(value) => handleInputChange('bio', value)}
              placeholder="Tell us about yourself..."
              multiline
              numberOfLines={4}
              autoComplete='off'
              autoCorrect={false}
              editable
            />
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={profileData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                placeholder="Enter first name"
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="next"
                textContentType="none" 
                autoComplete="off"
                editable
          
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={profileData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                placeholder="Enter last name"
                autoCorrect={false}
                autoCapitalize="words"
                editable
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Age *</Text>
              <TextInput
                style={styles.input}
                value={profileData.age}
                onChangeText={(value) => handleInputChange('age', value)}
                placeholder="Enter age"
                keyboardType="numeric"
                autoCorrect={false}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Gender *</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioOption, profileData.gender === 'male' && styles.radioSelected]}
                  onPress={() => handleInputChange('gender', 'male')}
                >
                  <Text style={[styles.radioText, profileData.gender === 'male' && styles.radioTextSelected]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioOption, profileData.gender === 'female' && styles.radioSelected]}
                  onPress={() => handleInputChange('gender', 'female')}
                >
                  <Text style={[styles.radioText, profileData.gender === 'female' && styles.radioTextSelected]}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hashkafa *</Text>
            <TextInput
              style={styles.input}
              value={profileData.hashkafa}
              onChangeText={(value) => handleInputChange('hashkafa', value)}
              placeholder="Enter your hashkafa"
              multiline
              numberOfLines={3}
              autoCorrect={false}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Height</Text>
              <TextInput
                style={styles.input}
                value={profileData.height}
                onChangeText={(value) => handleInputChange('height', value)}
                placeholder="e.g., 5'8 or 175cm"
                autoCorrect={false}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Do you have any children?</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioOption, profileData.hasChildren === 'yes' && styles.radioSelected]}
                  onPress={() => handleInputChange('hasChildren', 'yes')}
                >
                  <Text style={[styles.radioText, profileData.hasChildren === 'yes' && styles.radioTextSelected]}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioOption, profileData.hasChildren === 'no' && styles.radioSelected]}
                  onPress={() => handleInputChange('hasChildren', 'no')}
                >
                  <Text style={[styles.radioText, profileData.hasChildren === 'no' && styles.radioTextSelected]}>No</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Role *</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioOption, profileData.role === 'single' && styles.radioSelected]}
                onPress={() => handleInputChange('role', 'single')}
              >
                <Text style={[styles.radioText, profileData.role === 'single' && styles.radioTextSelected]}>Single</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioOption, profileData.role === 'matchmaker' && styles.radioSelected]}
                onPress={() => handleInputChange('role', 'matchmaker')}
              >
                <Text style={[styles.radioText, profileData.role === 'matchmaker' && styles.radioTextSelected]}>Matchmaker</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioOption, profileData.role === 'both' && styles.radioSelected]}
                onPress={() => handleInputChange('role', 'both')}
              >
                <Text style={[styles.radioText, profileData.role === 'both' && styles.radioTextSelected]}>Both</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Matchmaker Association - Only for Singles and Both */}
        {(profileData.role === 'single' || profileData.role === 'both') && (
          <View style={[styles.section, styles.matchmakerSection]}>
            <View style={styles.matchmakerHeader}>
              <Ionicons name="people" size={24} color="#e91e63" />
              <Text style={styles.matchmakerTitle}>Matchmaker Association</Text>
            </View>
            <Text style={styles.matchmakerDescription}>
              Connect with your matchmaker for better matches and guidance
            </Text>

            {matchmakerInfo && !showMatchmakerInput ? (
              <View style={styles.currentMatchmakerContainer}>
                <View style={styles.matchmakerInfoCard}>
                  <View style={styles.matchmakerInfoHeader}>
                    <Ionicons name="person-circle" size={40} color="#e91e63" />
                    <View style={styles.matchmakerDetails}>
                      <Text style={styles.matchmakerName}>{matchmakerInfo.name}</Text>
                      <Text style={styles.matchmakerEmail}>{matchmakerInfo.email}</Text>
                    </View>
                  </View>
                  <View style={styles.matchmakerActions}>
                    <TouchableOpacity
                      style={styles.changeMatchmakerButton}
                      onPress={() => {
                        setShowMatchmakerInput(true);
                        handleInputChange('matchmakerEmail', '');
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color="#666" />
                      <Text style={styles.changeMatchmakerText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeMatchmakerButton}
                      onPress={() => {
                        Alert.alert(
                          'Remove Matchmaker',
                          'Are you sure you want to remove your matchmaker?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Remove',
                              style: 'destructive',
                              onPress: () => {
                                setMatchmakerInfo(null);
                                setShowMatchmakerInput(false);
                                handleInputChange('matchmakerEmail', '');
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#F44336" />
                      <Text style={styles.removeMatchmakerText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Matchmaker&apos;s Email (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.matchmakerInput]}
                  value={profileData.matchmakerEmail}
                  onChangeText={(value) => handleInputChange('matchmakerEmail', value)}
                  placeholder="Enter matchmaker's signup email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                />
                <Text style={styles.helpText}>
                  📧 Enter the email your matchmaker used to sign up. They must have an approved matchmaker account.
                </Text>
                {matchmakerInfo && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowMatchmakerInput(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information *</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={profileData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={profileData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp Number</Text>
            <TextInput
              style={styles.input}
              value={profileData.whatsapp}
              onChangeText={(value) => handleInputChange('whatsapp', value)}
              placeholder="Enter WhatsApp number"
              keyboardType="phone-pad"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput
              style={styles.input}
              value={profileData.street}
              onChangeText={(value) => {
                handleInputChange('street', value);
                // Update full address for display
                const fullAddress = `${value}, ${profileData.city}, ${profileData.state} ${profileData.zipCode}, ${profileData.country}`.replace(/ , /g, ', ').replace(/^, /, '').replace(/, $/, '');
                handleInputChange('address', fullAddress);
              }}
              placeholder="Enter street address"
              textContentType="none" 
              autoComplete="off"
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={profileData.city}
                onChangeText={(value) => {
                  handleInputChange('city', value);
                  const fullAddress = `${profileData.street}, ${value}, ${profileData.state} ${profileData.zipCode}, ${profileData.country}`.replace(/ , /g, ', ').replace(/^, /, '').replace(/, $/, '');
                  handleInputChange('address', fullAddress);
                }}
                placeholder="City"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>State/Province</Text>
              <TextInput
                style={styles.input}
                value={profileData.state}
                onChangeText={(value) => {
                  handleInputChange('state', value);
                  const fullAddress = `${profileData.street}, ${profileData.city}, ${value} ${profileData.zipCode}, ${profileData.country}`.replace(/ , /g, ', ').replace(/^, /, '').replace(/, $/, '');
                  handleInputChange('address', fullAddress);
                }}
                placeholder="State"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>ZIP/Postal Code</Text>
              <TextInput
                style={styles.input}
                value={profileData.zipCode}
                onChangeText={(value) => {
                  handleInputChange('zipCode', value);
                  const fullAddress = `${profileData.street}, ${profileData.city}, ${profileData.state} ${value}, ${profileData.country}`.replace(/ , /g, ', ').replace(/^, /, '').replace(/, $/, '');
                  handleInputChange('address', fullAddress);
                }}
                placeholder="ZIP Code"
                autoCorrect={false}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Country</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowCountryDropdown(true)}
              >
                <Text style={profileData.country ? styles.dropdownText : styles.dropdownPlaceholder}>
                  {profileData.country || 'Select country'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Optional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Optional Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>School</Text>
            <TextInput
              style={styles.input}
              value={profileData.school}
              onChangeText={(value) => handleInputChange('school', value)}
              placeholder="Enter school name"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Occupation</Text>
            <TextInput
              style={styles.input}
              value={profileData.occupation}
              onChangeText={(value) => handleInputChange('occupation', value)}
              placeholder="Enter occupation"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.privacyButton}
            onPress={() => setShowPrivacyModal(true)}
          >
            <Text style={styles.privacyButtonText}>Privacy Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={saveProfile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {existingProfile ? 'Update Profile' : 'Save Profile'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Loading Screen */}
      {initialLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e91e63" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      )}

      {/* Picture Viewer Modal */}
      <Modal visible={showPictureViewer} transparent animationType="fade">
        <View style={styles.pictureViewerContainer}>
          <TouchableOpacity 
            style={styles.closeViewer}
            onPress={() => setShowPictureViewer(false)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          <Image 
            source={{ uri: profileData.pictures[selectedPictureIndex] }} 
            style={styles.fullScreenPicture}
            resizeMode="contain"
          />
        </View>
      </Modal>

      {/* Country Dropdown Modal */}
      <Modal visible={showCountryDropdown} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCountryDropdown(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Country</Text>
            <View style={styles.placeholder} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {COUNTRIES.map((country) => (
              <TouchableOpacity
                key={country}
                style={styles.countryOption}
                onPress={() => {
                  handleInputChange('country', country);
                  const fullAddress = `${profileData.street}, ${profileData.city}, ${profileData.state} ${profileData.zipCode}, ${country}`.replace(/ , /g, ', ').replace(/^, /, '').replace(/, $/, '');
                  handleInputChange('address', fullAddress);
                  setShowCountryDropdown(false);
                }}
              >
                <Text style={[
                  styles.countryText,
                  profileData.country === country && styles.countryTextSelected
                ]}>
                  {country}
                </Text>
                {profileData.country === country && (
                  <Ionicons name="checkmark" size={24} color="#e91e63" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Privacy Settings Modal */}
      <Modal visible={showPrivacyModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.privacyModal}>
          <View style={styles.privacyHeader}>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.privacyTitle}>Privacy Settings</Text>
            <View style={styles.placeholder} />
          </View>
          
          <ScrollView style={styles.privacyContent}>
            <Text style={styles.privacyDescription}>
              Choose which information you want to hide from public view. Users can request to see hidden information.
            </Text>
            
            <View style={styles.privacyItem}>
              <Text style={styles.privacyLabel}>Height</Text>
              <TouchableOpacity
                style={[styles.toggle, privacySettings.height && styles.toggleActive]}
                onPress={() => handlePrivacyChange('height', !privacySettings.height)}
              >
                <View style={[styles.toggleButton, privacySettings.height && styles.toggleButtonActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.privacyItem}>
              <Text style={styles.privacyLabel}>Children Status</Text>
              <TouchableOpacity
                style={[styles.toggle, privacySettings.hasChildren && styles.toggleActive]}
                onPress={() => handlePrivacyChange('hasChildren', !privacySettings.hasChildren)}
              >
                <View style={[styles.toggleButton, privacySettings.hasChildren && styles.toggleButtonActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.privacyItem}>
              <Text style={styles.privacyLabel}>School</Text>
              <TouchableOpacity
                style={[styles.toggle, privacySettings.school && styles.toggleActive]}
                onPress={() => handlePrivacyChange('school', !privacySettings.school)}
              >
                <View style={[styles.toggleButton, privacySettings.school && styles.toggleButtonActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.privacyItem}>
              <Text style={styles.privacyLabel}>Address</Text>
              <TouchableOpacity
                style={[styles.toggle, privacySettings.address && styles.toggleActive]}
                onPress={() => handlePrivacyChange('address', !privacySettings.address)}
              >
                <View style={[styles.toggleButton, privacySettings.address && styles.toggleButtonActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.privacyItem}>
              <Text style={styles.privacyLabel}>Occupation</Text>
              <TouchableOpacity
                style={[styles.toggle, privacySettings.occupation && styles.toggleActive]}
                onPress={() => handlePrivacyChange('occupation', !privacySettings.occupation)}
              >
                <View style={[styles.toggleButton, privacySettings.occupation && styles.toggleButtonActive]} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Profile Status Modal */}
      <ProfileStatusModal
        visible={showStatusModal}
        status={profileStatus}
        rejectionReason={rejectionReason}
        onClose={() => {
          setShowStatusModal(false);
          if (profileStatus === 'approved') {
            router.replace('/(tabs)');
          }
        }}
        onStatusChange={(newStatus) => {
          setProfileStatus(newStatus);
          // If status changed to approved, refresh and allow tab access
          if (newStatus === 'approved') {
            setRejectionReason('');
            Alert.alert(
              'Profile Approved!',
              'Your profile has been approved! You now have access to all features.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setShowStatusModal(false);
                    router.replace('/(tabs)');
                  }
                }
              ]
            );
          }
        }}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  shareButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfInput: {
    width: '48%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  addressInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  radioSelected: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
  },
  radioText: {
    fontSize: 14,
    color: '#666',
  },
  radioTextSelected: {
    color: '#fff',
  },
  picturePrivacy: {
    marginBottom: 16,
  },
  picturesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pictureWrapper: {
    position: 'relative',
  },
  picture: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePicture: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPicture: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPictureText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  privacyButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  privacyButtonText: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#e91e63',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pictureViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeViewer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  fullScreenPicture: {
    width: screenWidth,
    height: screenWidth,
  },
  privacyModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  privacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  privacyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 24,
  },
  privacyContent: {
    flex: 1,
    padding: 20,
  },
  privacyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  privacyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  privacyLabel: {
    fontSize: 16,
    color: '#333',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#e91e63',
  },
  toggleButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleButtonActive: {
    alignSelf: 'flex-end',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginVertical: 8,
    fontStyle: 'italic',
  },
  matchmakerSection: {
    backgroundColor: '#fff9fc',
    borderLeftWidth: 4,
    borderLeftColor: '#e91e63',
  },
  matchmakerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  matchmakerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e91e63',
  },
  matchmakerDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  matchmakerInput: {
    borderColor: '#e91e63',
    borderWidth: 2,
  },
  currentMatchmakerContainer: {
    marginTop: 8,
  },
  matchmakerInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e91e63',
  },
  matchmakerInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  matchmakerDetails: {
    flex: 1,
  },
  matchmakerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  matchmakerEmail: {
    fontSize: 14,
    color: '#666',
  },
  matchmakerActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  changeMatchmakerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  changeMatchmakerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  removeMatchmakerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  removeMatchmakerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
  },
  countryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  countryText: {
    fontSize: 16,
    color: '#333',
  },
  countryTextSelected: {
    fontWeight: 'bold',
    color: '#e91e63',
  },
  pictureGuide: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    marginTop: 8,
  },
  mainBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#e91e63',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mainBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  privacyHelpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
