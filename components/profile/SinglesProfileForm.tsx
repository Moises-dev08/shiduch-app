import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { resumeService } from '../../lib/resumeService';

interface SinglesProfileFormProps {
  initialData?: any;
  onSubmit: (data: any, fieldPrivacy: any) => void;
  gender: 'male' | 'female';
  loading?: boolean;
}

// Options data
const NATIONALITY_OPTIONS = ['Sefardi', 'Ashkenaz', 'Chassidic', 'Yemenite', 'Mixed Background','Other'];
const HASHKAFA_OPTIONS = ['Yeshivish', 'Open-minded Yeshivish', 'Modern Yeshivish', 'Chareidi', 'Orthodox', 'Modern Orthodox', 'Other'];
const TORAH_LEARNING_OPTIONS = ['Full day', 'Half day', 'Kovea Ittim', 'Attending Torah classes', 'Other'];
const PRAYING_OPTIONS = ['Three times a day with minyan', 'Three times a day', 'Trying as much as possible', 'Other'];
const EDUCATION_MALE = ['Yeshiva', "Rabbinical Semicha", "Bachelor's degree", "Master's degree", 'Master\'s+', 'Other'];
const EDUCATION_FEMALE = ['High school', 'Seminary', "Bachelor's degree", "Master's degree", 'Master\'s+', 'Other'];
const POST_HS_MALE = ['Yeshiva', 'College', 'Both', 'Non-traditional (straight to business)', 'Other'];
const POST_HS_FEMALE = ['Seminary', 'College', 'Seminary & college', 'Seminary & business', 'Non-traditional (straight to business)', 'Other'];
const OCCUPATION_MALE = ['Full-time Yeshiva', 'Half learning / half working', 'Working', 'Other'];
const OCCUPATION_FEMALE = ['Working', 'Part-working', 'Studying and working', 'Other'];
const PLAN_MALE = ['Learn Torah', 'Learn and Work', 'Work and set times for learning', 'Work and attend shiurim/classes', 'Other'];
const PLAN_FEMALE = ['Work full-time', 'Work part-time', 'Homemaker', 'Other'];
const MARITAL_STATUS = ['Single', 'Divorced', 'Divorced with kids', 'Widow/Widower', 'Widow/Widower with kids'];
const DRESS_STYLE_FEMALE = ['Yeshivesh', 'Modest modern', 'Modest fashionable', 'Other'];
const DRESS_STYLE_MALE = [ 'Casual', 'Black & white', 'Other'];
const HEAD_COVERING = ['Wig/Sheitel', 'Mitpachat', 'Both', 'Other'];
const SMOKING = ['Non-smoker', 'Smoking', 'Occasionally', 'Other'];
const ALCOHOL = ['Does not drink at all', 'Drinks very rarely', 'Drinks occasionally', 'Drinks moderately', 'Drinks very often', 'Other'];
const LANGUAGES = ['English', 'Hebrew', 'Yiddish', 'Spanish', 'French', 'Russian', 'Arabic', 'Other'];

const HEIGHT_FEET = Array.from({ length: 5 }, (_, i) => (4 + i).toString()); // 4-8 feet
const HEIGHT_INCHES = Array.from({ length: 12 }, (_, i) => i.toString()); // 0-11 inches

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

export default function SinglesProfileForm({ initialData, onSubmit, gender, loading }: SinglesProfileFormProps) {
  // Images
  const [pictures, setPictures] = useState<string[]>(initialData?.pictures || []);
  const [picturePrivacy, setPicturePrivacy] = useState<'none' | 'always' | 'private' | 'one_time'>(initialData?.picturePrivacy || 'none');
  
  // Resume
  const [resumeUrl, setResumeUrl] = useState<string | undefined>(initialData?.resumeUrl);
  const [resumeFileName, setResumeFileName] = useState<string>('');
  const [uploadingResume, setUploadingResume] = useState(false);

  // Basic Required
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
  }, [dob]); // Only run on mount
  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [bio, setBio] = useState(initialData?.bio || '');
  const [whatLookingFor, setWhatLookingFor] = useState(initialData?.whatLookingFor || '');
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

  // Optional fields
  const [heightFeet, setHeightFeet] = useState<string>(() => {
    if (initialData?.height) {
      const match = initialData.height.match(/(\d+)'(\d+)"/);
      if (match) return match[1];
    }
    return '5';
  });
  const [heightInches, setHeightInches] = useState<string>(() => {
    if (initialData?.height) {
      const match = initialData.height.match(/(\d+)'(\d+)"/);
      if (match) return match[2];
    }
    return '0';
  });
  const [locationCity, setLocationCity] = useState(initialData?.locationCity || '');
  const [locationState, setLocationState] = useState(initialData?.locationState || '');
  const [locationCountry, setLocationCountry] = useState(initialData?.locationCountry || '');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(initialData?.languages || []);
  const [languageOther, setLanguageOther] = useState('');
  
  // Nationality
  const [selectedNationality, setSelectedNationality] = useState<string[]>(initialData?.nationality || []);
  const [nationalityOther, setNationalityOther] = useState('');
  const [isCohen, setIsCohen] = useState<boolean | undefined>(initialData?.isCohen);
  
  // Modals for location dropdowns
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  
  // Hashkafa
  const [hashkafaType, setHashkafaType] = useState(initialData?.hashkafaType || '');
  const [hashkafaOther, setHashkafaOther] = useState('');
  const [torahLearning, setTorahLearning] = useState(initialData?.torahLearning || '');
  const [torahLearningOther, setTorahLearningOther] = useState('');
  const [praying, setPraying] = useState(initialData?.praying || '');
  const [prayingOther, setPrayingOther] = useState('');
  
  // Education - now supports multiple selections
  const [selectedEducation, setSelectedEducation] = useState<string[]>(
    initialData?.educationLevel ? [initialData.educationLevel] : []
  );
  const [educationOther, setEducationOther] = useState('');
  const [postHighSchoolPath, setPostHighSchoolPath] = useState(initialData?.postHighSchoolPath || '');
  const [postHSOther, setPostHSOther] = useState('');
  
  // Occupation
  const [currentOccupationStudy, setCurrentOccupationStudy] = useState(initialData?.currentOccupationStudy || '');
  const [occupationOther, setOccupationOther] = useState('');
  
  // Plan After Marriage
  const [planAfterMarriage, setPlanAfterMarriage] = useState(initialData?.planAfterMarriage || '');
  const [planOther, setPlanOther] = useState('');
  
  // Marital Status
  const [maritalStatus, setMaritalStatus] = useState(initialData?.maritalStatus || '');
  
  // Dress & Appearance
  const [dressStyle, setDressStyle] = useState(initialData?.dressStyle || '');
  const [dressStyleOther, setDressStyleOther] = useState('');
  const [wearsBlackHat, setWearsBlackHat] = useState<boolean | undefined>(initialData?.wearsBlackHat);
  const [headCovering, setHeadCovering] = useState(initialData?.headCovering || '');
  const [headCoveringOther, setHeadCoveringOther] = useState('');
  
  // Lifestyle
  const [smoking, setSmoking] = useState(initialData?.smoking || '');
  const [smokingOther, setSmokingOther] = useState('');
  const [alcoholConsumption, setAlcoholConsumption] = useState(() => {
    const initial = initialData?.alcoholConsumption || '';
    if (initial && !ALCOHOL.includes(initial)) {
      return 'Other';
    }
    return initial;
  });
  const [alcoholOther, setAlcoholOther] = useState(() => {
    const initial = initialData?.alcoholConsumption || '';
    if (initial && !ALCOHOL.includes(initial)) {
      return initial;
    }
    return '';
  });
  
  
  // Field Privacy (Ask Me flags)
  const [fieldPrivacy, setFieldPrivacy] = useState<{ [key: string]: boolean }>(initialData?.fieldPrivacy || {});

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

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const toggleNationality = (nat: string) => {
    setSelectedNationality(prev =>
      prev.includes(nat) ? prev.filter(n => n !== nat) : [...prev, nat]
    );
  };

  const toggleEducation = (edu: string) => {
    setSelectedEducation(prev =>
      prev.includes(edu) ? prev.filter(e => e !== edu) : [...prev, edu]
    );
  };


  const toggleFieldPrivacy = (fieldName: string, hasValue: boolean) => {
    if (!hasValue) {
      Alert.alert('Cannot Mark as Private', 'You must provide an answer before marking it as "Ask me"');
      return;
    }
    setFieldPrivacy(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const handlePickResume = async () => {
    if (!resumeService) {
      Alert.alert('Error', 'Resume service is not available. Please try again.');
      return;
    }
    
    setUploadingResume(true);
    
    try {
      const pickResult = await resumeService.pickDocument();
      
      if (!pickResult.success) {
        if (pickResult.error && pickResult.error !== 'Selection cancelled') {
          Alert.alert('Error', pickResult.error);
        }
        return;
      }

      if (pickResult.uri && pickResult.name) {
        const uploadResult = await resumeService.uploadResume(pickResult.uri, pickResult.name);
        
        if (uploadResult.success && uploadResult.url) {
          setResumeUrl(uploadResult.url);
          setResumeFileName(pickResult.name);
          Alert.alert('Success! ✅', 'Resume uploaded successfully');
        } else {
          Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload resume');
        }
      }
    } catch (error: any) {
      console.error('Error picking/uploading resume:', error);
      Alert.alert('Error', error.message || 'Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleDeleteResume = async () => {
    Alert.alert(
      'Delete Resume',
      'Are you sure you want to delete your resume?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!resumeService) {
              Alert.alert('Error', 'Resume service is not available. Please try again.');
              return;
            }
            
            setUploadingResume(true);
            
            try {
              const result = await resumeService.deleteResume();
              
              if (result.success) {
                setResumeUrl(undefined);
                setResumeFileName('');
                Alert.alert('Deleted', 'Resume deleted successfully');
              } else {
                Alert.alert('Error', result.error || 'Failed to delete resume');
              }
            } catch (error: any) {
              console.error('Error deleting resume:', error);
              Alert.alert('Error', error.message || 'Failed to delete resume');
            } finally {
              setUploadingResume(false);
            }
          }
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
    if (!whatLookingFor.trim()) missingFields.push('What are you looking for');
    if (!phone.trim()) missingFields.push('Phone');
    if (!heightFeet || heightFeet === '' || !heightInches || heightInches === '') missingFields.push('Height');
    if (!locationCountry) missingFields.push('Country');
    if (locationCountry === 'United States' && !locationState) missingFields.push('State');
    if (locationCountry === 'United States' && !locationCity.trim()) missingFields.push('City');
    if (selectedLanguages.length === 0) missingFields.push('Languages');
    if (selectedLanguages.includes('Other') && !languageOther.trim()) missingFields.push('Languages (Other)');
    if (selectedNationality.length === 0) missingFields.push('Nationality/Background');
    if (selectedNationality.includes('Other') && !nationalityOther.trim()) missingFields.push('Nationality/Background (Other)');
    if (!hashkafaType) missingFields.push('Hashkafa Type');
    if (hashkafaType === 'Other' && !hashkafaOther.trim()) missingFields.push('Hashkafa Type (Other)');
    if (gender === 'male') {
      if (!torahLearning) missingFields.push('Torah Learning');
      if (torahLearning === 'Other' && !torahLearningOther.trim()) missingFields.push('Torah Learning (Other)');
      if (!praying) missingFields.push('Praying');
      if (praying === 'Other' && !prayingOther.trim()) missingFields.push('Praying (Other)');
    }
    if (selectedEducation.length === 0) missingFields.push('Education Level');
    if (selectedEducation.includes('Other') && !educationOther.trim()) missingFields.push('Education Level (Other)');
    if (!postHighSchoolPath) missingFields.push('Post-High School Path');
    if (postHighSchoolPath === 'Other' && !postHSOther.trim()) missingFields.push('Post-High School Path (Other)');
    if (!currentOccupationStudy) missingFields.push('Current Occupation/Study');
    if (currentOccupationStudy === 'Other' && !occupationOther.trim()) missingFields.push('Current Occupation/Study (Other)');
    if (!planAfterMarriage) missingFields.push('Plan After Marriage');
    if (planAfterMarriage === 'Other' && !planOther.trim()) missingFields.push('Plan After Marriage (Other)');
    if (!maritalStatus) missingFields.push('Marital Status');
    if (!dressStyle) missingFields.push('Dress Style');
    if (dressStyle === 'Other' && !dressStyleOther.trim()) missingFields.push('Dress Style (Other)');
    if (gender === 'male' && wearsBlackHat === undefined) missingFields.push('Black Hat');
    if (gender === 'female' && !headCovering) missingFields.push('Head Covering');
    if (gender === 'female' && headCovering === 'Other' && !headCoveringOther.trim()) missingFields.push('Head Covering (Other)');
    if (!smoking) missingFields.push('Smoking');
    if (smoking === 'Other' && !smokingOther.trim()) missingFields.push('Smoking (Other)');
    if (!alcoholConsumption) missingFields.push('Alcohol Consumption');
    if (alcoholConsumption === 'Other' && !alcoholOther.trim()) missingFields.push('Alcohol Consumption (Other)');
    if (gender === 'male' && isCohen === undefined) missingFields.push('Cohen');

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

    // Prepare data
    const formData = {
      firstName,
      lastName,
      dob: dob.toISOString().split('T')[0],
      bio,
      whatLookingFor,
      phone,
      email: email.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      pictures,
      picturePrivacy,
      height: heightFeet && heightInches ? `${heightFeet}'${heightInches}"` : undefined,
      locationCity: locationCity || undefined,
      locationState: locationCountry === 'United States' ? locationState || undefined : undefined,
      locationCountry: locationCountry || undefined,
      languages: selectedLanguages.length > 0 
        ? selectedLanguages.includes('Other') 
          ? [...selectedLanguages.filter(l => l !== 'Other'), languageOther].filter(l => l)
          : selectedLanguages
        : undefined,
      nationality: selectedNationality.length > 0 
        ? selectedNationality.includes('Other') 
          ? [...selectedNationality.filter(n => n !== 'Other'), nationalityOther].filter(n => n)
          : selectedNationality
        : undefined,
      isCohen: gender === 'male' ? isCohen : undefined,
      hashkafaType: hashkafaType === 'Other' ? hashkafaOther : hashkafaType || undefined,
      torahLearning: gender === 'male' ? (torahLearning === 'Other' ? torahLearningOther : torahLearning) : undefined,
      praying: gender === 'male' ? (praying === 'Other' ? prayingOther : praying) : undefined,
      educationLevel: selectedEducation.length > 0 
        ? selectedEducation.includes('Other') 
          ? [...selectedEducation.filter(e => e !== 'Other'), educationOther].filter(e => e).join(', ')
          : selectedEducation.join(', ')
        : undefined,
      postHighSchoolPath: postHighSchoolPath === 'Other' ? postHSOther : postHighSchoolPath || undefined,
      currentOccupationStudy: currentOccupationStudy === 'Other' ? occupationOther : currentOccupationStudy || undefined,
      planAfterMarriage: planAfterMarriage === 'Other' ? planOther : planAfterMarriage || undefined,
      maritalStatus: maritalStatus || undefined,
      dressStyle: dressStyle === 'Other' ? dressStyleOther : dressStyle || undefined,
      wearsBlackHat: gender === 'male' ? wearsBlackHat : undefined,
      headCovering: gender === 'female' ? (headCovering === 'Other' ? headCoveringOther : headCovering) : undefined,
      smoking: smoking === 'Other' ? smokingOther : smoking || undefined,
      alcoholConsumption: alcoholConsumption === 'Other' ? alcoholOther : alcoholConsumption || undefined,
      resumeUrl,
    };

    onSubmit(formData, fieldPrivacy);
  };

  const renderAskMeToggle = (fieldName: string, hasValue: boolean) => (
    <TouchableOpacity
      style={[styles.askMeToggle, fieldPrivacy[fieldName] && styles.askMeToggleActive]}
      onPress={() => toggleFieldPrivacy(fieldName, hasValue)}
      disabled={!hasValue}
    >
      <Ionicons 
        name={fieldPrivacy[fieldName] ? 'lock-closed' : 'lock-open'} 
        size={16} 
        color={fieldPrivacy[fieldName] ? '#fff' : '#666'} 
      />
      <Text style={[styles.askMeText, fieldPrivacy[fieldName] && styles.askMeTextActive]}>
        {fieldPrivacy[fieldName] ? 'Private' : 'Ask me'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Images */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Images *</Text>
        
        <View style={styles.picturePrivacy}>
          <Text style={styles.label}>Picture Privacy *</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[styles.radioOption, picturePrivacy === 'always' && styles.radioSelected]}
              onPress={() => setPicturePrivacy('always')}
            >
              <Text style={[styles.radioText, picturePrivacy === 'always' && styles.radioTextSelected]}>Public</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioOption, picturePrivacy === 'private' && styles.radioSelected]}
              onPress={() => setPicturePrivacy('private')}
            >
              <Text style={[styles.radioText, picturePrivacy === 'private' && styles.radioTextSelected]}>Private</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioOption, picturePrivacy === 'one_time' && styles.radioSelected]}
              onPress={() => setPicturePrivacy('one_time')}
            >
              <Text style={[styles.radioText, picturePrivacy === 'one_time' && styles.radioTextSelected]}>One Time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioOption, picturePrivacy === 'none' && styles.radioSelected]}
              onPress={() => setPicturePrivacy('none')}
            >
              <Text style={[styles.radioText, picturePrivacy === 'none' && styles.radioTextSelected]}>No Photo</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helpText}>
            {picturePrivacy === 'none' && 'A generic avatar will be used'}
            {picturePrivacy === 'always' && 'Everyone can see your photos'}
            {picturePrivacy === 'private' && 'Photos blurred - users must request access'}
            {picturePrivacy === 'one_time' && 'Photos can be viewed only once per user 👁️'}
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

      {/* 2. Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information *</Text>
        
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              autoCapitalize="words"
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
            />
          </View>
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
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>What are you looking for *</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={whatLookingFor}
            onChangeText={setWhatLookingFor}
            placeholder="Describe what you're looking for in a match..."
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      {/* 3. Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <Text style={styles.sectionSubtitle}>
          This information will only be shared with your matchmaker and people you match with (if you choose to continue by yourself after a successful match).
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={handlePhoneChange}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
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
          />
        </View>
      </View>

      {/* 4. Additional Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Information *</Text>
        <Text style={styles.sectionSubtitle}>
          All fields are required. You can mark any field as &quot;Ask me&quot; to keep it private
        </Text>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Height (ft/in) *</Text>
            {renderAskMeToggle('height', !!(heightFeet && heightInches && heightFeet !== '' && heightInches !== ''))}
          </View>
          <TouchableOpacity 
            style={styles.heightButton}
            onPress={() => setShowHeightPicker(true)}
          >
            <Text style={heightFeet && heightInches && heightFeet !== '' && heightInches !== '' ? styles.heightButtonText : styles.heightButtonPlaceholder}>
              {heightFeet && heightInches && heightFeet !== '' && heightInches !== '' 
                ? `${heightFeet}'${heightInches}"` 
                : 'Select Height'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        {/*  Marital Status */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Marital Status *</Text>
                    {renderAskMeToggle('maritalStatus', !!maritalStatus)}
                  </View>
                  {MARITAL_STATUS.map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.checkOption, maritalStatus === option && styles.checkSelected]}
                      onPress={() => setMaritalStatus(option)}
                    >
                      <Text style={[styles.checkText, maritalStatus === option && styles.checkTextSelected]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
          </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Location *</Text>
            {renderAskMeToggle('location', !!(locationCity || locationState || locationCountry))}
          </View>
          
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
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Languages (select all that apply) *</Text>
            {renderAskMeToggle('languages', selectedLanguages.length > 0 || !!languageOther)}
          </View>
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
      </View>

      {/* 4. Nationality / Background */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nationality / Background *</Text>
        
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Background (select all that apply) *</Text>
            {renderAskMeToggle('nationality', selectedNationality.length > 0 || !!nationalityOther)}
          </View>
          {NATIONALITY_OPTIONS.map(nat => (
            <TouchableOpacity
              key={nat}
              style={[styles.checkOption, selectedNationality.includes(nat) && styles.checkSelected]}
              onPress={() => toggleNationality(nat)}
            >
              <Text style={[styles.checkText, selectedNationality.includes(nat) && styles.checkTextSelected]}>
                {nat}
              </Text>
            </TouchableOpacity>
          ))}
          {selectedNationality.includes('Other') && (
            <TextInput
              style={[styles.input, styles.inputSpaced]}
              value={nationalityOther}
              onChangeText={setNationalityOther}
              placeholder="Please specify other nationality"
            />
          )}
        </View>

        {gender === 'male' && (
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Cohen *</Text>
              {renderAskMeToggle('isCohen', isCohen !== undefined)}
            </View>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioOption, isCohen === true && styles.radioSelected]}
                onPress={() => setIsCohen(true)}
              >
                <Text style={[styles.radioText, isCohen === true && styles.radioTextSelected]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioOption, isCohen === false && styles.radioSelected]}
                onPress={() => setIsCohen(false)}
              >
                <Text style={[styles.radioText, isCohen === false && styles.radioTextSelected]}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 5. Hashkafa */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hashkafa (Religious Outlook) *</Text>
        
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Hashkafa Type *</Text>
            {renderAskMeToggle('hashkafaType', !!hashkafaType || !!hashkafaOther)}
          </View>
          {HASHKAFA_OPTIONS.map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.checkOption, hashkafaType === option && styles.checkSelected]}
              onPress={() => setHashkafaType(option)}
            >
              <Text style={[styles.checkText, hashkafaType === option && styles.checkTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
          {hashkafaType === 'Other' && (
            <TextInput
              style={[styles.input, styles.inputSpaced]}
              value={hashkafaOther}
              onChangeText={setHashkafaOther}
              placeholder="Please specify"
            />
          )}
        </View>

        {gender === 'male' && (
          <>
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Torah Learning *</Text>
                {renderAskMeToggle('torahLearning', !!torahLearning || !!torahLearningOther)}
              </View>
              {TORAH_LEARNING_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[styles.checkOption, torahLearning === option && styles.checkSelected]}
                  onPress={() => setTorahLearning(option)}
                >
                  <Text style={[styles.checkText, torahLearning === option && styles.checkTextSelected]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
              {torahLearning === 'Other' && (
                <TextInput
                  style={[styles.input, styles.inputSpaced]}
                  value={torahLearningOther}
                  onChangeText={setTorahLearningOther}
                  placeholder="Please specify"
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Praying *</Text>
                {renderAskMeToggle('praying', !!praying || !!prayingOther)}
              </View>
              {PRAYING_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[styles.checkOption, praying === option && styles.checkSelected]}
                  onPress={() => setPraying(option)}
                >
                  <Text style={[styles.checkText, praying === option && styles.checkTextSelected]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
              {praying === 'Other' && (
                <TextInput
                  style={[styles.input, styles.inputSpaced]}
                  value={prayingOther}
                  onChangeText={setPrayingOther}
                  placeholder="Please specify"
                />
              )}
            </View>
          </>
        )}
      </View>

      {/* 6. Education */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Education *</Text>
        
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Education Level (select all that apply) *</Text>
            {renderAskMeToggle('educationLevel', selectedEducation.length > 0 || !!educationOther)}
          </View>
          {(gender === 'male' ? EDUCATION_MALE : EDUCATION_FEMALE).map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.checkOption, selectedEducation.includes(option) && styles.checkSelected]}
              onPress={() => toggleEducation(option)}
            >
              <Text style={[styles.checkText, selectedEducation.includes(option) && styles.checkTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
          {selectedEducation.includes('Other') && (
            <TextInput
              style={[styles.input, styles.inputSpaced]}
              value={educationOther}
              onChangeText={setEducationOther}
              placeholder="Please specify"
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Post-High School Path *</Text>
            {renderAskMeToggle('postHighSchoolPath', !!postHighSchoolPath || !!postHSOther)}
          </View>
          {(gender === 'male' ? POST_HS_MALE : POST_HS_FEMALE).map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.checkOption, postHighSchoolPath === option && styles.checkSelected]}
              onPress={() => setPostHighSchoolPath(option)}
            >
              <Text style={[styles.checkText, postHighSchoolPath === option && styles.checkTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
          {postHighSchoolPath === 'Other' && (
            <TextInput
              style={[styles.input, styles.inputSpaced]}
              value={postHSOther}
              onChangeText={setPostHSOther}
              placeholder="Please specify"
            />
          )}
        </View>
      </View>

      {/* 7. Occupation / Study */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Occupation / Study *</Text>
        
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Current Status *</Text>
            {renderAskMeToggle('currentOccupationStudy', !!currentOccupationStudy || !!occupationOther)}
          </View>
          {(gender === 'male' ? OCCUPATION_MALE : OCCUPATION_FEMALE).map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.checkOption, currentOccupationStudy === option && styles.checkSelected]}
              onPress={() => setCurrentOccupationStudy(option)}
            >
              <Text style={[styles.checkText, currentOccupationStudy === option && styles.checkTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
          {currentOccupationStudy === 'Other' && (
            <TextInput
              style={[styles.input, styles.inputSpaced]}
              value={occupationOther}
              onChangeText={setOccupationOther}
              placeholder="Please specify"
            />
          )}
        </View>
      </View>

      {/* 8. Plan After Marriage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plan After Marriage *</Text>
        
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Plans *</Text>
            {renderAskMeToggle('planAfterMarriage', !!planAfterMarriage || !!planOther)}
          </View>
          {(gender === 'male' ? PLAN_MALE : PLAN_FEMALE).map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.checkOption, planAfterMarriage === option && styles.checkSelected]}
              onPress={() => setPlanAfterMarriage(option)}
            >
              <Text style={[styles.checkText, planAfterMarriage === option && styles.checkTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
          {planAfterMarriage === 'Other' && (
            <TextInput
              style={[styles.input, styles.inputSpaced]}
              value={planOther}
              onChangeText={setPlanOther}
              placeholder="Please specify"
            />
          )}
        </View>
      </View>


      {/* 10. Dress & Appearance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dress & Appearance *</Text>
        
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Dress Style *</Text>
            {renderAskMeToggle('dressStyle', !!dressStyle || !!dressStyleOther)}
          </View>
          { gender === 'male' ? DRESS_STYLE_MALE.map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.checkOption, dressStyle === option && styles.checkSelected]}
              onPress={() => setDressStyle(option)}
            >
              <Text style={[styles.checkText, dressStyle === option && styles.checkTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          )) : DRESS_STYLE_FEMALE.map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.checkOption, dressStyle === option && styles.checkSelected]}
              onPress={() => setDressStyle(option)}
            >
              <Text style={[styles.checkText, dressStyle === option && styles.checkTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
          {dressStyle === 'Other' && (
            <TextInput
              style={[styles.input, styles.inputSpaced]}
              value={dressStyleOther}
              onChangeText={setDressStyleOther}
              placeholder="Please specify"
            />
          )}
        </View>

        {gender === 'male' && (
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Black Hat *</Text>
              {renderAskMeToggle('wearsBlackHat', wearsBlackHat !== undefined)}
            </View>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioOption, wearsBlackHat === true && styles.radioSelected]}
                onPress={() => setWearsBlackHat(true)}
              >
                <Text style={[styles.radioText, wearsBlackHat === true && styles.radioTextSelected]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioOption, wearsBlackHat === false && styles.radioSelected]}
                onPress={() => setWearsBlackHat(false)}
              >
                <Text style={[styles.radioText, wearsBlackHat === false && styles.radioTextSelected]}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {gender === 'female' && (
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Head Covering *</Text>
              {renderAskMeToggle('headCovering', !!headCovering || !!headCoveringOther)}
            </View>
            {HEAD_COVERING.map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.checkOption, headCovering === option && styles.checkSelected]}
                onPress={() => setHeadCovering(option)}
              >
                <Text style={[styles.checkText, headCovering === option && styles.checkTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
            {headCovering === 'Other' && (
              <TextInput
                style={[styles.input, styles.inputSpaced]}
                value={headCoveringOther}
                onChangeText={setHeadCoveringOther}
                placeholder="Please specify"
              />
            )}
          </View>
        )}
      </View>

      {/* 11. Lifestyle */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lifestyle *</Text>
        
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Smoking *</Text>
            {renderAskMeToggle('smoking', !!smoking || !!smokingOther)}
          </View>
          {SMOKING.map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.checkOption, smoking === option && styles.checkSelected]}
              onPress={() => setSmoking(option)}
            >
              <Text style={[styles.checkText, smoking === option && styles.checkTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
          {smoking === 'Other' && (
            <TextInput
              style={[styles.input, styles.inputSpaced]}
              value={smokingOther}
              onChangeText={setSmokingOther}
              placeholder="Please specify"
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Alcohol Consumption *</Text>
            {renderAskMeToggle('alcoholConsumption', !!alcoholConsumption || !!alcoholOther)}
          </View>
          {ALCOHOL.map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.checkOption, alcoholConsumption === option && styles.checkSelected]}
              onPress={() => setAlcoholConsumption(option)}
            >
              <Text style={[styles.checkText, alcoholConsumption === option && styles.checkTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
          {alcoholConsumption === 'Other' && (
            <TextInput
              style={[styles.input, styles.inputSpaced]}
              value={alcoholOther}
              onChangeText={setAlcoholOther}
              placeholder="Please specify"
            />
          )}
        </View>
      </View>

      {/* 12. Upload Resume */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload Resume 📄</Text>
        <Text style={styles.sectionSubtitle}>
          Upload a PDF or image of your resume (optional). This will be shared automatically when you match with someone.
        </Text>

        {resumeUrl ? (
          <View style={styles.resumeContainer}>
            <View style={styles.resumeInfo}>
              <Ionicons name="document-text" size={24} color="#03a9f4" />
              <View style={styles.resumeDetails}>
                <Text style={styles.resumeText}>Resume uploaded</Text>
                <Text style={styles.resumeSubtext}>
                  {resumeFileName || 'resume document'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteResumeButton}
              onPress={handleDeleteResume}
              disabled={uploadingResume}
            >
              {uploadingResume ? (
                <ActivityIndicator size="small" color="#ff4444" />
              ) : (
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadResumeButton}
            onPress={handlePickResume}
            disabled={uploadingResume}
          >
            {uploadingResume ? (
              <ActivityIndicator size="small" color="#03a9f4" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={24} color="#03a9f4" />
                <Text style={styles.uploadResumeText}>Upload Resume</Text>
                <Text style={styles.uploadResumeSubtext}>PDF or Image (max 5MB)</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* 13. Last Active */}
      <View style={styles.section}>
        <View style={styles.lastActiveContainer}>
          <Ionicons name="time-outline" size={20} color="#666" />
          <Text style={styles.lastActiveText}>
            Last active: {new Date().toLocaleDateString()}
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

      {/* Country Selection Modal */}
      <Modal visible={showCountryModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCountryModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={() => setShowCountryModal(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {COUNTRIES.map(country => (
              <TouchableOpacity
                key={country}
                style={styles.modalOption}
                onPress={() => {
                  setLocationCountry(country);
                  if (country !== 'United States') {
                    setLocationState(''); // Clear state if not USA
                  }
                  setShowCountryModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{country}</Text>
                {locationCountry === country && (
                  <Ionicons name="checkmark" size={24} color="#03a9f4" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* State Selection Modal (USA only) */}
      <Modal visible={showStateModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowStateModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select State</Text>
            <TouchableOpacity onPress={() => setShowStateModal(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {US_STATES.map(state => (
              <TouchableOpacity
                key={state}
                style={styles.modalOption}
                onPress={() => {
                  setLocationState(state);
                  setShowStateModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{state}</Text>
                {locationState === state && (
                  <Ionicons name="checkmark" size={24} color="#03a9f4" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Height Picker Modal */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showHeightPicker} animationType="slide" presentationStyle="formSheet">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowHeightPicker(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Height</Text>
              <TouchableOpacity onPress={() => setShowHeightPicker(false)}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.heightPickerModalContainer}>
              <View style={styles.heightPickerWrapper}>
                <Text style={styles.heightPickerLabel}>Feet</Text>
                <Picker
                  selectedValue={heightFeet}
                  onValueChange={(itemValue) => setHeightFeet(itemValue)}
                  style={styles.heightPicker}
                >
                  {HEIGHT_FEET.map((feet) => (
                    <Picker.Item key={feet} label={`${feet}'`} value={feet} />
                  ))}
                </Picker>
              </View>
              <View style={styles.heightPickerWrapper}>
                <Text style={styles.heightPickerLabel}>Inches</Text>
                <Picker
                  selectedValue={heightInches}
                  onValueChange={(itemValue) => setHeightInches(itemValue)}
                  style={styles.heightPicker}
                >
                  {HEIGHT_INCHES.map((inches) => (
                    <Picker.Item key={inches} label={`${inches}"`} value={inches} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </Modal>
      ) : (
        showHeightPicker && (
          <Modal visible={showHeightPicker} transparent={true} animationType="slide">
            <View style={styles.heightPickerModalOverlay}>
              <View style={styles.heightPickerModalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowHeightPicker(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Select Height</Text>
                  <TouchableOpacity onPress={() => setShowHeightPicker(false)}>
                    <Text style={styles.doneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.heightPickerModalContainer}>
                  <View style={styles.heightPickerWrapper}>
                    <Text style={styles.heightPickerLabel}>Feet</Text>
                    <Picker
                      selectedValue={heightFeet}
                      onValueChange={(itemValue) => setHeightFeet(itemValue)}
                      style={styles.heightPicker}
                    >
                      {HEIGHT_FEET.map((feet) => (
                        <Picker.Item key={feet} label={`${feet}'`} value={feet} />
                      ))}
                    </Picker>
                  </View>
                  <View style={styles.heightPickerWrapper}>
                    <Text style={styles.heightPickerLabel}>Inches</Text>
                    <Picker
                      selectedValue={heightInches}
                      onValueChange={(itemValue) => setHeightInches(itemValue)}
                      style={styles.heightPicker}
                    >
                      {HEIGHT_INCHES.map((inches) => (
                        <Picker.Item key={inches} label={`${inches}"`} value={inches} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        )
      )}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  inputSpaced: {
    marginTop: 8,
  },
  bioInput: {
    height: 100,
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
    backgroundColor: '#03a9f4',
    borderColor: '#03a9f4',
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
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
    marginBottom: 8,
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
    flex: 1,
  },
  selectPlaceholder: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },
  checkOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  checkSelected: {
    backgroundColor: '#e1f5fe',
    borderColor: '#03a9f4',
  },
  checkText: {
    fontSize: 15,
    color: '#333',
  },
  checkTextSelected: {
    color: '#03a9f4',
    fontWeight: '600',
  },
  askMeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    gap: 4,
  },
  askMeToggleActive: {
    backgroundColor: '#03a9f4',
  },
  askMeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  askMeTextActive: {
    color: '#fff',
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
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#03a9f4',
  },
  modalContent: {
    flex: 1,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  datePickerContainer: {

    justifyContent: 'center',
    backgroundColor: '#fff',
    alignItems: 'center',
    

  },
  datePicker: {
    height: 200,
  },
  heightButton: {
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
  heightButtonText: {
    fontSize: 16,
    color: '#333',
  },
  heightButtonPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  heightPickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  heightPickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  heightPickerModalContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 20,
  },
  heightPickerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  heightPickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  heightPicker: {
    width: '100%',
    height: 200,
  },
  resumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#e1f5fe',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#03a9f4',
  },
  resumeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resumeDetails: {
    marginLeft: 12,
    flex: 1,
  },
  resumeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  resumeSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  deleteResumeButton: {
    padding: 8,
  },
  uploadResumeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 2,
    borderColor: '#03a9f4',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  uploadResumeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#03a9f4',
    marginTop: 8,
  },
  uploadResumeSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  lastActiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  lastActiveText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});

