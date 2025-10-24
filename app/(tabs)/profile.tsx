import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
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

const { width: screenWidth } = Dimensions.get('window');

interface ProfileData {
  firstName: string;
  lastName: string;
  age: string;
  hashkafa: string;
  role: 'single' | 'matchmaker';
  gender: 'male' | 'female';
  address: string;
  school: string;
  occupation: string;
  bio: string;
  phone: string;
  email: string;
  whatsapp: string;
  pictures: string[];
  picturePrivacy: 'none' | 'one-time' | 'always' | 'private';
}

interface PrivacySettings {
  phone: boolean;
  email: boolean;
  whatsapp: boolean;
  address: boolean;
  school: boolean;
  occupation: boolean;
}

export default function ProfileScreen() {
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    age: '',
    hashkafa: '',
    role: 'single',
    gender: 'male',
    address: '',
    school: '',
    occupation: '',
    bio: '',
    phone: '',
    email: '',
    whatsapp: '',
    pictures: [],
    picturePrivacy: 'none'
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    phone: false,
    email: false,
    whatsapp: false,
    address: false,
    school: false,
    occupation: false
  });

  const [showPictureViewer, setShowPictureViewer] = useState(false);
  const [selectedPictureIndex, setSelectedPictureIndex] = useState(0);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePrivacyChange = (field: keyof PrivacySettings, value: boolean) => {
    setPrivacySettings(prev => ({ ...prev, [field]: value }));
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
    setProfileData(prev => ({
      ...prev,
      pictures: prev.pictures.filter((_, i) => i !== index)
    }));
  };

  const openPictureViewer = (index: number) => {
    setSelectedPictureIndex(index);
    setShowPictureViewer(true);
  };

  const saveProfile = () => {
    const requiredFields = ['firstName', 'lastName', 'age', 'hashkafa', 'bio', 'phone', 'email', 'whatsapp'];
    const missingFields = requiredFields.filter(field => !profileData[field as keyof ProfileData]);
    
    if (missingFields.length > 0) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    // TODO: Save profile data
    console.log('Profile saved:', { profileData, privacySettings });
    Alert.alert('Success', 'Profile saved successfully!');
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
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push('/(tabs)/settings')}
            >
              <Ionicons name="settings" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pictures */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pictures</Text>
          
          <View style={styles.picturePrivacy}>
            <Text style={styles.label}>Picture Privacy</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioOption, profileData.picturePrivacy === 'none' && styles.radioSelected]}
                onPress={() => handleInputChange('picturePrivacy', 'none')}
              >
                <Text style={[styles.radioText, profileData.picturePrivacy === 'none' && styles.radioTextSelected]}>No Picture</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioOption, profileData.picturePrivacy === 'one-time' && styles.radioSelected]}
                onPress={() => handleInputChange('picturePrivacy', 'one-time')}
              >
                <Text style={[styles.radioText, profileData.picturePrivacy === 'one-time' && styles.radioTextSelected]}>One Time</Text>
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
          </View>

          <View style={styles.picturesContainer}>
            {profileData.pictures.map((picture, index) => (
              <View key={index} style={styles.pictureWrapper}>
                <TouchableOpacity onPress={() => openPictureViewer(index)}>
                  <Image source={{ uri: picture }} style={styles.picture} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.removePicture}
                  onPress={() => removePicture(index)}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            
            {profileData.pictures.length < 3 && (
              <TouchableOpacity style={styles.addPicture} onPress={pickImage}>
                <Ionicons name="camera" size={24} color="#666" />
                <Text style={styles.addPictureText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
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
            </View>
          </View>
        </View>

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
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={profileData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              placeholder="Enter your address"
               textContentType="none" 
               autoComplete="off"
               autoCapitalize="none"
               autoCorrect={false}
            />
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
        <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </TouchableOpacity>
      </ScrollView>

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
              Choose which information you want to keep private. Other users can request to see hidden information.
            </Text>
            
            {Object.entries(privacySettings).map(([key, value]) => (
              <View key={key} style={styles.privacyItem}>
                <Text style={styles.privacyLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
                <TouchableOpacity
                  style={[styles.toggle, value && styles.toggleActive]}
                  onPress={() => handlePrivacyChange(key as keyof PrivacySettings, !value)}
                >
                  <View style={[styles.toggleButton, value && styles.toggleButtonActive]} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

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
});
