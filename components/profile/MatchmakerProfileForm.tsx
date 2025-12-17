import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
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

// Options data (same as Singles form)
const NATIONALITY_OPTIONS = ['Sephardi', 'Ashkenazi', 'Chassidic', 'Yemenite', 'Mixed Background','Other'];
const HASHKAFA_OPTIONS = ['Yeshivish', 'Open-minded Yeshivish', 'Modern Yeshivish', 'Chareidi', 'Orthodox', 'Modern Orthodox', 'Other'];
const LANGUAGES = ['English', 'Hebrew', 'Yiddish', 'Spanish', 'French', 'Russian', 'Arabic', 'Other'];

const COUNTRIES = [
  'United States', 'Israel', 'Canada', 'United Kingdom', 'Australia',
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cambodia', 'Cameroon', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia',
  'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
  'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Italy',
  'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius',
  'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea',
  'North Macedonia', 'Norway',
  'Oman',
  'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar',
  'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore',
  'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain',
  'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago',
  'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Venezuela', 'Vietnam',
  'Yemen',
  'Zambia', 'Zimbabwe'
];

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming'
];

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
  // Calculate maximum date (18 years ago from today)
  const getMaxDate = () => {
    const today = new Date();
    const maxDate = new Date();
    maxDate.setFullYear(today.getFullYear() - 18);
    return maxDate;
  };

  const getMinDate = () => {
    const today = new Date();
    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - 80);
    return minDate;
  };

  const [dob, setDob] = useState(initialData?.dob ? new Date(initialData.dob) : getMaxDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dobError, setDobError] = useState<string>('');

  // Validate age when DOB changes
  const validateDOB = (selectedDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - selectedDate.getFullYear();
    const monthDiff = today.getMonth() - selectedDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate())) {
      age--;
    }
    
    if (age < 18) {
      setDobError('You must be at least 18 years old');
      return false;
    } else if (age > 80) {
      setDobError('You cannot be more than 80 years old');
      return false;
    } else {
      setDobError('');
      return true;
    }
  };

  // Validate DOB on initial load
  useEffect(() => {
    if (dob) {
      validateDOB(dob);
    }
  }, []); // Only run on mount
  const [bio, setBio] = useState(initialData?.bio || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [whatsapp, setWhatsapp] = useState(initialData?.whatsapp || '');

  // Handler to allow only numbers in phone field
  const handlePhoneChange = (text: string) => {
    // Remove all non-numeric characters
    const numericOnly = text.replace(/[^0-9]/g, '');
    setPhone(numericOnly);
  };

  // Handler to allow only numbers in WhatsApp field
  const handleWhatsAppChange = (text: string) => {
    // Remove all non-numeric characters
    const numericOnly = text.replace(/[^0-9]/g, '');
    setWhatsapp(numericOnly);
  };

  // Location
  const [locationCity, setLocationCity] = useState(initialData?.locationCity || '');
  const [locationState, setLocationState] = useState(initialData?.locationState || '');
  const [locationCountry, setLocationCountry] = useState(initialData?.locationCountry || '');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);

  // Languages
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(initialData?.languages || []);
  const [languageOther, setLanguageOther] = useState('');

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  // Cultural & Religious
  const [religiousLevel, setReligiousLevel] = useState(initialData?.religiousLevel || '');
  const [religiousLevelOther, setReligiousLevelOther] = useState('');
  const [selectedCulturalOrigin, setSelectedCulturalOrigin] = useState<string[]>(initialData?.culturalOrigin ? [initialData.culturalOrigin] : []);
  const [culturalOriginOther, setCulturalOriginOther] = useState('');

  const toggleCulturalOrigin = (origin: string) => {
    setSelectedCulturalOrigin(prev =>
      prev.includes(origin) ? prev.filter(o => o !== origin) : [...prev, origin]
    );
  };

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
    const missingFields = [];
    if (!firstName.trim()) missingFields.push('First Name');
    if (!lastName.trim()) missingFields.push('Last Name');
    if (!bio.trim()) missingFields.push('Bio');
    if (!phone.trim()) missingFields.push('Phone');
    if (!locationCountry) missingFields.push('Country');
    if (locationCountry === 'United States' && !locationState) missingFields.push('State');
    if (locationCountry === 'United States' && !locationCity.trim()) missingFields.push('City');
    if (selectedLanguages.length === 0) missingFields.push('Languages');
    if (selectedLanguages.includes('Other') && !languageOther.trim()) missingFields.push('Languages (Other)');
    if (!religiousLevel) missingFields.push('Religious Level');
    if (religiousLevel === 'Other' && !religiousLevelOther.trim()) missingFields.push('Religious Level (Other)');
    if (selectedCulturalOrigin.length === 0) missingFields.push('Cultural Origin');
    if (selectedCulturalOrigin.includes('Other') && !culturalOriginOther.trim()) missingFields.push('Cultural Origin (Other)');
    if (picturePrivacy !== 'none' && pictures.length === 0) missingFields.push('Pictures');

    if (missingFields.length > 0) {
      Alert.alert('Missing Required Fields', `Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    // Validate age - must be between 18 and 80 years old
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) {
      Alert.alert(
        'Age Requirement',
        'You must be at least 18 years old to create an account. Please enter a valid date of birth.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (age > 80) {
      Alert.alert(
        'Age Requirement',
        'You cannot be more than 80 years old. Please enter a valid date of birth.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Process languages
    const languages = selectedLanguages.length > 0
      ? selectedLanguages.includes('Other')
        ? [...selectedLanguages.filter(l => l !== 'Other'), languageOther].filter(l => l)
        : selectedLanguages
      : undefined;

    // Process cultural origin
    const culturalOrigin = selectedCulturalOrigin.length > 0
      ? selectedCulturalOrigin.includes('Other')
        ? [...selectedCulturalOrigin.filter(o => o !== 'Other'), culturalOriginOther].filter(o => o).join(', ')
        : selectedCulturalOrigin.join(', ')
      : undefined;

    // Prepare data
    const formData = {
      firstName,
      lastName,
      dob: dob.toISOString().split('T')[0],
      bio,
      phone,
      email: email.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      pictures,
      picturePrivacy,
      locationCity: locationCity || undefined,
      locationState: locationCountry === 'United States' ? locationState || undefined : undefined,
      locationCountry: locationCountry || undefined,
      languages,
      religiousLevel: religiousLevel === 'Other' ? religiousLevelOther : religiousLevel,
      culturalOrigin,
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
          <Text style={styles.helpText}>You must be at least 18 years old</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>{dob.toLocaleDateString()}</Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </TouchableOpacity>
          {dobError ? (
            <Text style={styles.errorText}>{dobError}</Text>
          ) : null}
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

      {/* Contact Information */}

        <Text style={styles.sectionTitle}>Contact Information</Text>
        <Text style={styles.sectionSubtitle}>
          This information will only be shared with singles who selected you as their matchmaker and people you suggest matches to (if they choose to continue with a matchmaker after a successful match).
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={handlePhoneChange}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Personal Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email (optional)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>WhatsApp Number</Text>
          <TextInput
            style={styles.input}
            value={whatsapp}
            onChangeText={handleWhatsAppChange}
            placeholder="Enter WhatsApp number (optional)"
            keyboardType="phone-pad"
            autoCorrect={false}
          />
        </View>


        {/* Location Section */}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Location *</Text>
        
        <View style={styles.inputGroup}>
          <TouchableOpacity 
            style={styles.selectButton} 
            onPress={() => setShowCountryModal(true)}
          >
            <Text style={locationCountry ? styles.selectText : styles.selectPlaceholder}>
              {locationCountry || 'Select Country'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {locationCountry === 'United States' && (
            <TouchableOpacity 
              style={[styles.selectButton, styles.inputSpaced]} 
              onPress={() => setShowStateModal(true)}
            >
              <Text style={locationState ? styles.selectText : styles.selectPlaceholder}>
                {locationState || 'Select State'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          )}

          {locationCountry === 'United States' && (
            <TextInput
              style={[styles.input, styles.inputSpaced]}
              value={locationCity}
              onChangeText={setLocationCity}
              placeholder="City"
              autoCapitalize="words"
            />
          )}
        </View>

        {/* Details Section */}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Details</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Languages (select all that apply) *</Text>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang}
              style={[styles.checkOption, selectedLanguages.includes(lang) && styles.checkSelected]}
              onPress={() => toggleLanguage(lang)}
            >
              <Text style={[styles.checkText, selectedLanguages.includes(lang) && styles.checkTextSelected]}>
                {lang}
              </Text>
            </TouchableOpacity>
          ))}
          {selectedLanguages.includes('Other') && (
            <TextInput
              style={[styles.input, styles.inputSpaced]}
              value={languageOther}
              onChangeText={setLanguageOther}
              placeholder="Please specify other language"
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Religious Level / Hashkafa *</Text>
          {HASHKAFA_OPTIONS.map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.checkOption, religiousLevel === option && styles.checkSelected]}
              onPress={() => setReligiousLevel(option)}
            >
              <Text style={[styles.checkText, religiousLevel === option && styles.checkTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
          {religiousLevel === 'Other' && (
            <TextInput
              style={[styles.input, styles.inputSpaced]}
              value={religiousLevelOther}
              onChangeText={setReligiousLevelOther}
              placeholder="Please specify"
            />
          )}
        </View>

         <View style={styles.inputGroup}>
          <Text style={styles.label}>Cultural Origin (select all that apply) *</Text>
          {NATIONALITY_OPTIONS.map(origin => (
            <TouchableOpacity
              key={origin}
              style={[styles.checkOption, selectedCulturalOrigin.includes(origin) && styles.checkSelected]}
              onPress={() => toggleCulturalOrigin(origin)}
            >
              <Text style={[styles.checkText, selectedCulturalOrigin.includes(origin) && styles.checkTextSelected]}>
                {origin}
              </Text>
            </TouchableOpacity>
          ))}
          {selectedCulturalOrigin.includes('Other') && (
            <TextInput
              style={[styles.input, styles.inputSpaced]}
              value={culturalOriginOther}
              onChangeText={setCulturalOriginOther}
              placeholder="Please specify other cultural origin"
            />
          )}
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color="#03a9f4" />
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
        <Modal visible={showDatePicker} animationType="slide" presentationStyle="formSheet">
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
                  if (selectedDate) {
                    setDob(selectedDate);
                    validateDOB(selectedDate);
                  }
                }}
                maximumDate={getMaxDate()}
                minimumDate={getMinDate()}
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
              if (selectedDate) {
                setDob(selectedDate);
                validateDOB(selectedDate);
              }
            }}
            maximumDate={getMaxDate()}
            minimumDate={getMinDate()}
          />
        )
      )}

      {/* Country Picker Modal */}
      <Modal visible={showCountryModal} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCountryModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={() => setShowCountryModal(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {COUNTRIES.map((country) => (
              <TouchableOpacity
                key={country}
                style={styles.modalListItem}
                onPress={() => {
                  setLocationCountry(country);
                  setShowCountryModal(false);
                }}
              >
                <Text style={styles.modalListItemText}>{country}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* State Picker Modal */}
      <Modal visible={showStateModal} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowStateModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select State</Text>
            <TouchableOpacity onPress={() => setShowStateModal(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {US_STATES.map((state) => (
              <TouchableOpacity
                key={state}
                style={styles.modalListItem}
                onPress={() => {
                  setLocationState(state);
                  setShowStateModal(false);
                }}
              >
                <Text style={styles.modalListItemText}>{state}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
    backgroundColor: '#03a9f4',
    borderColor: '#03a9f4',
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
    backgroundColor: '#03a9f4',
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
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
    marginBottom: 8,
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
    backgroundColor: '#e1f5fe',
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
    backgroundColor: '#03a9f4',
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
    color: '#03a9f4',
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
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  selectButton: {
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
  selectText: {
    fontSize: 16,
    color: '#333',
  },
  selectPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  inputSpaced: {
    marginTop: 8,
  },
  checkOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  checkSelected: {
    backgroundColor: '#e1f5fe',
    borderColor: '#03a9f4',
  },
  checkText: {
    fontSize: 15,
    color: '#666',
  },
  checkTextSelected: {
    color: '#03a9f4',
    fontWeight: '600',
  },
  modalList: {
    flex: 1,
  },
  modalListItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalListItemText: {
    fontSize: 16,
    color: '#333',
  },
});

