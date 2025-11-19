import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface MatchmakerProfileFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  gender: 'male' | 'female';
  loading?: boolean;
}

export default function MatchmakerProfileForm({ initialData, onSubmit, gender, loading }: MatchmakerProfileFormProps) {
  // Images
  const [pictures, setPictures] = useState<string[]>(initialData?.pictures || []);
  const [picturePrivacy, setPicturePrivacy] = useState<'none' | 'always'>(
    initialData?.picturePrivacy === 'none' ? 'none' : 'always'
  );

  // Basic Required Fields
  const [firstName, setFirstName] = useState(initialData?.firstName || '');
  const [lastName, setLastName] = useState(initialData?.lastName || '');
  const [dob, setDob] = useState(initialData?.dob ? new Date(initialData.dob) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bio, setBio] = useState(initialData?.bio || '');
  const [phone, setPhone] = useState(initialData?.phone || '');

  const pickImage = async () => {
    if (pictures.length >= 3) {
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
      setPictures([...pictures, result.assets[0].uri]);
    }
  };

  const removePicture = (index: number) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setPictures(pictures.filter((_, i) => i !== index))
        }
      ]
    );
  };

  const validateAndSubmit = () => {
    // Validate required fields
    const missingFields = [];
    if (!firstName.trim()) missingFields.push('First Name');
    if (!lastName.trim()) missingFields.push('Last Name');
    if (!bio.trim()) missingFields.push('Bio');
    if (!phone.trim()) missingFields.push('Phone');
    if (picturePrivacy !== 'none' && pictures.length === 0) missingFields.push('Pictures');

    if (missingFields.length > 0) {
      Alert.alert('Missing Required Fields', `Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    // Prepare data
    const formData = {
      firstName,
      lastName,
      dob: dob.toISOString().split('T')[0],
      bio,
      phone,
      pictures,
      picturePrivacy,
    };

    onSubmit(formData);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Images */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Images *</Text>
        
        <View style={styles.picturePrivacy}>
          <Text style={styles.label}>Picture Privacy *</Text>
          <Text style={styles.helpText}>
            As a matchmaker, you can choose to show your photo publicly or use a generic avatar.
          </Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[styles.radioOption, picturePrivacy === 'always' && styles.radioSelected]}
              onPress={() => setPicturePrivacy('always')}
            >
              <Text style={[styles.radioText, picturePrivacy === 'always' && styles.radioTextSelected]}>
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioOption, picturePrivacy === 'none' && styles.radioSelected]}
              onPress={() => setPicturePrivacy('none')}
            >
              <Text style={[styles.radioText, picturePrivacy === 'none' && styles.radioTextSelected]}>
                No Photo
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.privacyHelpText}>
            {picturePrivacy === 'none' && '• A generic avatar will be used'}
            {picturePrivacy === 'always' && '• Your photos will be visible to everyone'}
          </Text>
        </View>

        {picturePrivacy !== 'none' && (
          <>
            <Text style={styles.pictureGuide}>
              {pictures.length === 0 && 'Add up to 3 photos. The first will be your main photo.'}
              {pictures.length > 0 && pictures.length < 3 && `You can add ${3 - pictures.length} more photo${3 - pictures.length > 1 ? 's' : ''}.`}
              {pictures.length === 3 && 'Maximum photos added.'}
            </Text>
            <View style={styles.picturesContainer}>
              {pictures.map((picture, index) => (
                <View key={index} style={styles.pictureWrapper}>
                  <Image source={{ uri: picture }} style={styles.picture} />
                  {index === 0 && (
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>MAIN</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.removePicture} onPress={() => removePicture(index)}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {pictures.length < 3 && (
                <TouchableOpacity style={styles.addPicture} onPress={pickImage}>
                  <Ionicons name="camera" size={24} color="#666" />
                  <Text style={styles.addPictureText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>

      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information *</Text>
        <Text style={styles.sectionSubtitle}>
          All fields are required for matchmakers
        </Text>
        
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender *</Text>
          <Text style={styles.genderDisplay}>{gender === 'male' ? 'Male' : 'Female'}</Text>
          <Text style={styles.genderNote}>Gender was set during account creation</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth *</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>{dob.toLocaleDateString()}</Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio *</Text>
          <Text style={styles.helpText}>
            Tell us about your experience as a matchmaker and why you&apos;re passionate about helping others find their match.
          </Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Share your matchmaking experience..."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone *</Text>
          <Text style={styles.helpText}>
            Your phone number will be visible to users who receive your match suggestions.
          </Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color="#e91e63" />
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoTitle}>Matchmaker Profile</Text>
          <Text style={styles.infoText}>
            As a matchmaker, your profile will be visible to singles when you make match suggestions. 
            Make sure your information is accurate and professional.
          </Text>
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={validateAndSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Saving...' : 'Save Profile'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Date Picker Modal for iOS */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showDatePicker} animationType="slide" presentationStyle="fullScreen">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Date of Birth</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={dob}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) setDob(selectedDate);
                }}
                maximumDate={new Date()}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={dob}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDob(selectedDate);
            }}
            maximumDate={new Date()}
          />
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
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
    height: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfInput: {
    width: '48%',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  radioOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
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
    fontWeight: '600',
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
  pictureGuide: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  privacyHelpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  dateButton: {
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
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  genderDisplay: {
    fontSize: 16,
    color: '#333',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  genderNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF0F6',
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C2185B',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#C2185B',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#e91e63',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e91e63',
  },
  datePickerContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  datePicker: {
    height: 300,
    width: '100%',

  },
});

