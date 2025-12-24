import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { profileService } from '../lib/profileService';
import { FilterState } from '../types/homeTypes';

// Import options from profile form
const NATIONALITY_OPTIONS = ['Sefardi', 'Ashkenaz', 'Chassidic', 'Yemenite', 'Mixed Background', 'Other'];
const HASHKAFA_OPTIONS = ['Yeshivish', 'Open-minded Yeshivish', 'Modern Yeshivish', 'Chareidi', 'Orthodox', 'Modern Orthodox', 'Other'];
const EDUCATION_OPTIONS = ['Yeshiva', 'Rabbinical Semicha', "Bachelor's degree", "Master's degree", 'Master\'s+', 'High school', 'Seminary', 'Other'];
const OCCUPATION_OPTIONS = ['Full-time Yeshiva', 'Half learning / half working', 'Working', 'Part-working', 'Studying and working', 'Other'];
const MARITAL_STATUS_OPTIONS = ['Single', 'Divorced', 'Divorced with kids', 'Widow/Widower', 'Widow/Widower with kids'];

// Male-specific filters
const TORAH_LEARNING_OPTIONS = ['Full time', 'Part time', 'Occasionally', 'Not currently'];
const PRAYING_OPTIONS = ['3 times a day', 'Twice a day', 'Once a day', 'Regularly', 'Occasionally'];

// Female-specific filters
const HEAD_COVERING_OPTIONS = ['Wig', 'Scarf/Tichel', 'Hat', 'Combination', 'Not yet decided', 'Other'];

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

const AGE_OPTIONS = Array.from({ length: 65 }, (_, i) => i + 18); // 18-82
const HEIGHT_FEET = Array.from({ length: 5 }, (_, i) => (4 + i).toString()); // 4-8 feet
const HEIGHT_INCHES = Array.from({ length: 12 }, (_, i) => i.toString()); // 0-11 inches

// Modal Picker Component
interface ModalPickerProps {
  visible: boolean;
  title: string;
  selectedValue: any;
  options: { label: string; value: any }[];
  onSelect: (value: any) => void;
  onClose: () => void;
}

function ModalPicker({ visible, title, selectedValue, options, onSelect, onClose }: ModalPickerProps) {
  const [tempValue, setTempValue] = useState(selectedValue);

  useEffect(() => {
    setTempValue(selectedValue);
  }, [selectedValue, visible]);

  const handleDone = () => {
    onSelect(tempValue);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalFullContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalHeaderButton}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={handleDone} style={styles.modalHeaderButton}>
            <Text style={styles.modalDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.modalPickerContainer}>
          <Picker
            selectedValue={tempValue}
            onValueChange={setTempValue}
            style={styles.modalPicker}
            itemStyle={styles.modalPickerItem}
          >
            {options.map((option, index) => (
              <Picker.Item key={index} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// Searchable Country Picker Component
interface SearchableCountryPickerProps {
  visible: boolean;
  selectedValue: string | null;
  countries: string[];
  onSelect: (value: string | null) => void;
  onClose: () => void;
}

function SearchableCountryPicker({ visible, selectedValue, countries, onSelect, onClose }: SearchableCountryPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tempValue, setTempValue] = useState<string | null>(selectedValue);

  useEffect(() => {
    setTempValue(selectedValue);
    setSearchQuery('');
  }, [selectedValue, visible]);

  const handleDone = () => {
    onSelect(tempValue);
    onClose();
  };

  const filteredCountries = countries.filter(country =>
    country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalFullContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalHeaderButton}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Country</Text>
          <TouchableOpacity onPress={handleDone} style={styles.modalHeaderButton}>
            <Text style={styles.modalDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
        
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search countries..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Countries List */}
        <ScrollView style={styles.countryListContainer}>
          <TouchableOpacity
            style={[
              styles.countryItem,
              tempValue === null && styles.countryItemSelected
            ]}
            onPress={() => setTempValue(null)}
          >
            <Text style={[
              styles.countryItemText,
              tempValue === null && styles.countryItemTextSelected
            ]}>
              Any Country
            </Text>
            {tempValue === null && (
              <Ionicons name="checkmark" size={24} color="#007AFF" />
            )}
          </TouchableOpacity>

          {filteredCountries.map((country) => (
            <TouchableOpacity
              key={country}
              style={[
                styles.countryItem,
                tempValue === country && styles.countryItemSelected
              ]}
              onPress={() => setTempValue(country)}
            >
              <Text style={[
                styles.countryItemText,
                tempValue === country && styles.countryItemTextSelected
              ]}>
                {country}
              </Text>
              {tempValue === country && (
                <Ionicons name="checkmark" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}

          {filteredCountries.length === 0 && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No countries found</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function FiltersScreen() {
  const params = useLocalSearchParams();
  const [currentUserGender, setCurrentUserGender] = useState<'male' | 'female' | null>(null);
  
  // Modal picker state
  const [activePickerModal, setActivePickerModal] = useState<{
    visible: boolean;
    title: string;
    field: string;
    options: { label: string; value: any }[];
  }>({
    visible: false,
    title: '',
    field: '',
    options: [],
  });

  // Searchable country picker state
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Parse filter state from params
  const [filterState, setFilterState] = useState<FilterState>(() => {
    try {
      return params.filterState ? JSON.parse(params.filterState as string) : {
        selectedAgeOption: null,
        minAge: null,
        maxAge: null,
        exactAge: null,
        selectedCountries: [],
        selectedStates: [],
        selectedCities: [],
        selectedHashkafa: [],
        selectedNationality: [],
        selectedMaritalStatus: [],
        hasChildren: null,
        selectedEducation: [],
        selectedOccupation: [],
        minHeightFeet: null,
        minHeightInches: null,
        maxHeightFeet: null,
        maxHeightInches: null,
        sortBy: null,
        hasAskMeFields: false,
        hasPhoto: null,
        selectedTorahLearning: [],
        selectedPraying: [],
        selectedHeadCovering: [],
        wearsBlackHat: null,
      };
    } catch {
      return {
        selectedAgeOption: null,
        minAge: null,
        maxAge: null,
        exactAge: null,
        selectedCountries: [],
        selectedStates: [],
        selectedCities: [],
        selectedHashkafa: [],
        selectedNationality: [],
        selectedMaritalStatus: [],
        hasChildren: null,
        selectedEducation: [],
        selectedOccupation: [],
        minHeightFeet: null,
        minHeightInches: null,
        maxHeightFeet: null,
        maxHeightInches: null,
        sortBy: null,
        hasAskMeFields: false,
        hasPhoto: null,
        selectedTorahLearning: [],
        selectedPraying: [],
        selectedHeadCovering: [],
        wearsBlackHat: null,
      };
    }
  });

  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    sort: true,
    askMe: true,
    age: true,
    location: true,
    hashkafa: true,
    nationality: true,
    maritalStatus: true,
    hasChildren: true,
    education: true,
    occupation: true,
    height: true,
    genderSpecific: true,
  });

  useEffect(() => {
    loadUserGender();
  }, []);

  const loadUserGender = async () => {
    const result = await profileService.getProfile();
    if (result.success && result.profile) {
      setCurrentUserGender(result.profile.gender as 'male' | 'female');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleArrayFilter = (array: string[], value: string) => {
    return array.includes(value)
      ? array.filter(v => v !== value)
      : [...array, value];
  };

  const openPickerModal = (title: string, field: string, options: { label: string; value: any }[]) => {
    setActivePickerModal({
      visible: true,
      title,
      field,
      options,
    });
  };

  const handlePickerSelect = (value: any) => {
    const field = activePickerModal.field;
    
    if (field === 'minAge') {
      setFilterState({ ...filterState, minAge: value, selectedAgeOption: null, exactAge: null });
    } else if (field === 'maxAge') {
      setFilterState({ ...filterState, maxAge: value, selectedAgeOption: null, exactAge: null });
    } else if (field === 'country') {
      setFilterState({ ...filterState, selectedCountries: value ? [value] : [], selectedStates: [] });
    } else if (field === 'minHeightFeet') {
      setFilterState({ ...filterState, minHeightFeet: value });
    } else if (field === 'minHeightInches') {
      setFilterState({ ...filterState, minHeightInches: value });
    } else if (field === 'maxHeightFeet') {
      setFilterState({ ...filterState, maxHeightFeet: value });
    } else if (field === 'maxHeightInches') {
      setFilterState({ ...filterState, maxHeightInches: value });
    }
  };

  const getPickerDisplayValue = (field: string): string => {
    switch (field) {
      case 'minAge':
        return filterState.minAge !== null ? `${filterState.minAge} years` : 'Any';
      case 'maxAge':
        return filterState.maxAge !== null ? `${filterState.maxAge} years` : 'Any';
      case 'country':
        return filterState.selectedCountries.length > 0 ? filterState.selectedCountries[0] : 'Any Country';
      case 'minHeightFeet':
        return filterState.minHeightFeet !== null ? `${filterState.minHeightFeet} ft` : 'Any';
      case 'minHeightInches':
        return filterState.minHeightInches !== null ? `${filterState.minHeightInches} in` : 'Any';
      case 'maxHeightFeet':
        return filterState.maxHeightFeet !== null ? `${filterState.maxHeightFeet} ft` : 'Any';
      case 'maxHeightInches':
        return filterState.maxHeightInches !== null ? `${filterState.maxHeightInches} in` : 'Any';
      default:
        return 'Select';
    }
  };

  const clearAll = () => {
    setFilterState({
      selectedAgeOption: null,
      minAge: null,
      maxAge: null,
      exactAge: null,
      selectedCountries: [],
      selectedStates: [],
      selectedCities: [],
      selectedHashkafa: [],
      selectedNationality: [],
      selectedMaritalStatus: [],
      hasChildren: null,
      selectedEducation: [],
      selectedOccupation: [],
      minHeightFeet: null,
      minHeightInches: null,
      maxHeightFeet: null,
      maxHeightInches: null,
      sortBy: null,
      hasAskMeFields: false,
      hasPhoto: null,
      selectedTorahLearning: [],
      selectedPraying: [],
      selectedHeadCovering: [],
      wearsBlackHat: null,
    });
  };

  const applyFilters = async () => {
    try {
      // Store filters in AsyncStorage so home screen can pick them up
      await AsyncStorage.setItem('pendingFilters', JSON.stringify(filterState));
      // Navigate back to home
      router.back();
    } catch (error) {
      console.error('Error saving filters:', error);
      router.back();
    }
  };

  const renderSection = (title: string, sectionKey: string, children: React.ReactNode) => {
    const isExpanded = expandedSections[sectionKey];
    return (
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection(sectionKey)}
        >
          <Text style={styles.sectionTitle}>{title}</Text>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>
        {isExpanded && children}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.title}>Filters</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Sorting Options */}
        {renderSection('Sort By', 'sort', (
          <View style={styles.chipRow}>
            <TouchableOpacity 
              style={[
                styles.chip, 
                filterState.sortBy === 'newest' && styles.chipSelected
              ]}
              onPress={() => setFilterState({
                ...filterState,
                sortBy: filterState.sortBy === 'newest' ? null : 'newest',
              })}
            >
              <Text style={[
                styles.chipText, 
                filterState.sortBy === 'newest' && styles.chipTextSelected
              ]}>
                Newest First
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.chip, 
                filterState.sortBy === 'youngest' && styles.chipSelected
              ]}
              onPress={() => setFilterState({
                ...filterState,
                sortBy: filterState.sortBy === 'youngest' ? null : 'youngest',
              })}
            >
              <Text style={[
                styles.chipText, 
                filterState.sortBy === 'youngest' && styles.chipTextSelected
              ]}>
                Youngest First
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Special Filters */}
        {renderSection('Special Filters', 'askMe', (
          <>
            <View style={styles.chipRow}>
              <TouchableOpacity 
                style={[
                  styles.chip, 
                  filterState.hasAskMeFields && styles.chipSelected
                ]}
                onPress={() => setFilterState({
                  ...filterState,
                  hasAskMeFields: !filterState.hasAskMeFields,
                })}
              >
                <Ionicons 
                  name="lock-closed" 
                  size={14} 
                  color={filterState.hasAskMeFields ? "#fff" : "#666"} 
                  style={{ marginRight: 4 }}
                />
                <Text style={[
                  styles.chipText, 
                  filterState.hasAskMeFields && styles.chipTextSelected
                ]}>
                  Has &quot;Ask Me&quot; Fields
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.chipRow, { marginTop: 8 }]}>
              <TouchableOpacity 
                style={[
                  styles.chip, 
                  filterState.hasPhoto === true && styles.chipSelected
                ]}
                onPress={() => setFilterState({
                  ...filterState,
                  hasPhoto: filterState.hasPhoto === true ? null : true,
                })}
              >
                <Ionicons 
                  name="camera" 
                  size={14} 
                  color={filterState.hasPhoto === true ? "#fff" : "#666"} 
                  style={{ marginRight: 4 }}
                />
                <Text style={[
                  styles.chipText, 
                  filterState.hasPhoto === true && styles.chipTextSelected
                ]}>
                  Has Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.chip, 
                  filterState.hasPhoto === false && styles.chipSelected
                ]}
                onPress={() => setFilterState({
                  ...filterState,
                  hasPhoto: filterState.hasPhoto === false ? null : false,
                })}
              >
                <Ionicons 
                  name="close-circle" 
                  size={14} 
                  color={filterState.hasPhoto === false ? "#fff" : "#666"} 
                  style={{ marginRight: 4 }}
                />
                <Text style={[
                  styles.chipText, 
                  filterState.hasPhoto === false && styles.chipTextSelected
                ]}>
                  No Photo
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ))}

        {/* Age Filter with Dropdowns */}
        {renderSection('Age Range', 'age', (
          <>
            <View style={styles.ageDropdownContainer}>
              <View style={styles.ageDropdownGroup}>
                <Text style={styles.label}>From:</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => openPickerModal(
                    'Select Minimum Age',
                    'minAge',
                    [
                      { label: 'Any', value: null },
                      ...AGE_OPTIONS.map(age => ({ label: `${age} years`, value: age }))
                    ]
                  )}
                >
                  <Text style={styles.pickerButtonText}>{getPickerDisplayValue('minAge')}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.ageDropdownGroup}>
                <Text style={styles.label}>To:</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => openPickerModal(
                    'Select Maximum Age',
                    'maxAge',
                    [
                      { label: 'Any', value: null },
                      ...AGE_OPTIONS.map(age => ({ label: `${age} years`, value: age }))
                    ]
                  )}
                >
                  <Text style={styles.pickerButtonText}>{getPickerDisplayValue('maxAge')}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        ))}

        {/* Location Filter with Dropdown */}
        {renderSection('Location', 'location', (
          <>
            <View style={styles.locationSection}>
              <Text style={styles.label}>Country:</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={styles.pickerButtonText}>{getPickerDisplayValue('country')}</Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {filterState.selectedCountries.includes('United States') && (
              <View style={styles.locationSection}>
                <Text style={styles.label}>State (US):</Text>
                <ScrollView style={styles.chipRow} nestedScrollEnabled>
                  {US_STATES.map(state => (
                    <TouchableOpacity 
                      key={state}
                      style={[
                        styles.chip, 
                        filterState.selectedStates.includes(state) && styles.chipSelected
                      ]}
                      onPress={() => setFilterState({
                        ...filterState,
                        selectedStates: toggleArrayFilter(filterState.selectedStates, state),
                      })}
                    >
                      <Text style={[
                        styles.chipText, 
                        filterState.selectedStates.includes(state) && styles.chipTextSelected
                      ]}>
                        {state}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        ))}

        {/* Hashkafa Filter */}
        {renderSection('Hashkafa', 'hashkafa', (
          <View style={styles.chipRow}>
            {HASHKAFA_OPTIONS.map(hashkafa => (
              <TouchableOpacity 
                key={hashkafa}
                style={[
                  styles.chip, 
                  filterState.selectedHashkafa.includes(hashkafa) && styles.chipSelected
                ]}
                onPress={() => setFilterState({
                  ...filterState,
                  selectedHashkafa: toggleArrayFilter(filterState.selectedHashkafa, hashkafa),
                })}
              >
                <Text style={[
                  styles.chipText, 
                  filterState.selectedHashkafa.includes(hashkafa) && styles.chipTextSelected
                ]}>
                  {hashkafa}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Nationality Filter */}
        {renderSection('Nationality / Background', 'nationality', (
          <View style={styles.chipRow}>
            {NATIONALITY_OPTIONS.map(nationality => (
              <TouchableOpacity 
                key={nationality}
                style={[
                  styles.chip, 
                  filterState.selectedNationality.includes(nationality) && styles.chipSelected
                ]}
                onPress={() => setFilterState({
                  ...filterState,
                  selectedNationality: toggleArrayFilter(filterState.selectedNationality, nationality),
                })}
              >
                <Text style={[
                  styles.chipText, 
                  filterState.selectedNationality.includes(nationality) && styles.chipTextSelected
                ]}>
                  {nationality}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Marital Status Filter */}
        {renderSection('Marital Status', 'maritalStatus', (
          <View style={styles.chipRow}>
            {MARITAL_STATUS_OPTIONS.map(status => (
              <TouchableOpacity 
                key={status}
                style={[
                  styles.chip, 
                  filterState.selectedMaritalStatus.includes(status) && styles.chipSelected
                ]}
                onPress={() => setFilterState({
                  ...filterState,
                  selectedMaritalStatus: toggleArrayFilter(filterState.selectedMaritalStatus, status),
                })}
              >
                <Text style={[
                  styles.chipText, 
                  filterState.selectedMaritalStatus.includes(status) && styles.chipTextSelected
                ]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Has Children Filter */}
        {renderSection('Has Children', 'hasChildren', (
          <View style={styles.chipRow}>
            <TouchableOpacity 
              style={[
                styles.chip, 
                filterState.hasChildren === true && styles.chipSelected
              ]}
              onPress={() => setFilterState({
                ...filterState,
                hasChildren: filterState.hasChildren === true ? null : true,
              })}
            >
              <Text style={[
                styles.chipText, 
                filterState.hasChildren === true && styles.chipTextSelected
              ]}>
                Has Children
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.chip, 
                filterState.hasChildren === false && styles.chipSelected
              ]}
              onPress={() => setFilterState({
                ...filterState,
                hasChildren: filterState.hasChildren === false ? null : false,
              })}
            >
              <Text style={[
                styles.chipText, 
                filterState.hasChildren === false && styles.chipTextSelected
              ]}>
                No Children
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Education Filter */}
        {renderSection('Education Level', 'education', (
          <View style={styles.chipRow}>
            {EDUCATION_OPTIONS.map(education => (
              <TouchableOpacity 
                key={education}
                style={[
                  styles.chip, 
                  filterState.selectedEducation.includes(education) && styles.chipSelected
                ]}
                onPress={() => setFilterState({
                  ...filterState,
                  selectedEducation: toggleArrayFilter(filterState.selectedEducation, education),
                })}
              >
                <Text style={[
                  styles.chipText, 
                  filterState.selectedEducation.includes(education) && styles.chipTextSelected
                ]}>
                  {education}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Occupation Filter */}
        {renderSection('Occupation / Study', 'occupation', (
          <View style={styles.chipRow}>
            {OCCUPATION_OPTIONS.map(occupation => (
              <TouchableOpacity 
                key={occupation}
                style={[
                  styles.chip, 
                  filterState.selectedOccupation.includes(occupation) && styles.chipSelected
                ]}
                onPress={() => setFilterState({
                  ...filterState,
                  selectedOccupation: toggleArrayFilter(filterState.selectedOccupation, occupation),
                })}
              >
                <Text style={[
                  styles.chipText, 
                  filterState.selectedOccupation.includes(occupation) && styles.chipTextSelected
                ]}>
                  {occupation}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Height Filter */}
        {renderSection('Height', 'height', (
          <View style={styles.heightContainer}>
            <Text style={styles.label}>Minimum Height:</Text>
            <View style={styles.heightRow}>
              <View style={styles.heightGroup}>
                <Text style={styles.inputLabel}>Feet:</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => openPickerModal(
                    'Select Minimum Height (Feet)',
                    'minHeightFeet',
                    [
                      { label: 'Any', value: null },
                      ...HEIGHT_FEET.map(feet => ({ label: `${feet} ft`, value: parseInt(feet) }))
                    ]
                  )}
                >
                  <Text style={styles.pickerButtonText}>{getPickerDisplayValue('minHeightFeet')}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.heightGroup}>
                <Text style={styles.inputLabel}>Inches:</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => openPickerModal(
                    'Select Minimum Height (Inches)',
                    'minHeightInches',
                    [
                      { label: 'Any', value: null },
                      ...HEIGHT_INCHES.map(inches => ({ label: `${inches} in`, value: parseInt(inches) }))
                    ]
                  )}
                >
                  <Text style={styles.pickerButtonText}>{getPickerDisplayValue('minHeightInches')}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Maximum Height:</Text>
            <View style={styles.heightRow}>
              <View style={styles.heightGroup}>
                <Text style={styles.inputLabel}>Feet:</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => openPickerModal(
                    'Select Maximum Height (Feet)',
                    'maxHeightFeet',
                    [
                      { label: 'Any', value: null },
                      ...HEIGHT_FEET.map(feet => ({ label: `${feet} ft`, value: parseInt(feet) }))
                    ]
                  )}
                >
                  <Text style={styles.pickerButtonText}>{getPickerDisplayValue('maxHeightFeet')}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.heightGroup}>
                <Text style={styles.inputLabel}>Inches:</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => openPickerModal(
                    'Select Maximum Height (Inches)',
                    'maxHeightInches',
                    [
                      { label: 'Any', value: null },
                      ...HEIGHT_INCHES.map(inches => ({ label: `${inches} in`, value: parseInt(inches) }))
                    ]
                  )}
                >
                  <Text style={styles.pickerButtonText}>{getPickerDisplayValue('maxHeightInches')}</Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {/* Gender-Specific Filters */}
        {currentUserGender && renderSection(
          currentUserGender === 'male' ? 'Female-Specific Filters' : 'Male-Specific Filters',
          'genderSpecific',
          <>
            {/* Show female-specific filters if user is male */}
            {currentUserGender === 'male' && (
              <View style={styles.genderSpecificSection}>
                <Text style={styles.label}>Head Covering:</Text>
                <View style={styles.chipRow}>
                  {HEAD_COVERING_OPTIONS.map(option => (
                    <TouchableOpacity 
                      key={option}
                      style={[
                        styles.chip, 
                        filterState.selectedHeadCovering.includes(option) && styles.chipSelected
                      ]}
                      onPress={() => setFilterState({
                        ...filterState,
                        selectedHeadCovering: toggleArrayFilter(filterState.selectedHeadCovering, option),
                      })}
                    >
                      <Text style={[
                        styles.chipText, 
                        filterState.selectedHeadCovering.includes(option) && styles.chipTextSelected
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Show male-specific filters if user is female */}
            {currentUserGender === 'female' && (
              <>
                <View style={styles.genderSpecificSection}>
                  <Text style={styles.label}>Torah Learning:</Text>
                  <View style={styles.chipRow}>
                    {TORAH_LEARNING_OPTIONS.map(option => (
                      <TouchableOpacity 
                        key={option}
                        style={[
                          styles.chip, 
                          filterState.selectedTorahLearning.includes(option) && styles.chipSelected
                        ]}
                        onPress={() => setFilterState({
                          ...filterState,
                          selectedTorahLearning: toggleArrayFilter(filterState.selectedTorahLearning, option),
                        })}
                      >
                        <Text style={[
                          styles.chipText, 
                          filterState.selectedTorahLearning.includes(option) && styles.chipTextSelected
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.genderSpecificSection}>
                  <Text style={styles.label}>Praying:</Text>
                  <View style={styles.chipRow}>
                    {PRAYING_OPTIONS.map(option => (
                      <TouchableOpacity 
                        key={option}
                        style={[
                          styles.chip, 
                          filterState.selectedPraying.includes(option) && styles.chipSelected
                        ]}
                        onPress={() => setFilterState({
                          ...filterState,
                          selectedPraying: toggleArrayFilter(filterState.selectedPraying, option),
                        })}
                      >
                        <Text style={[
                          styles.chipText, 
                          filterState.selectedPraying.includes(option) && styles.chipTextSelected
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.genderSpecificSection}>
                  <Text style={styles.label}>Wears Black Hat:</Text>
                  <View style={styles.chipRow}>
                    <TouchableOpacity 
                      style={[
                        styles.chip, 
                        filterState.wearsBlackHat === true && styles.chipSelected
                      ]}
                      onPress={() => setFilterState({
                        ...filterState,
                        wearsBlackHat: filterState.wearsBlackHat === true ? null : true,
                      })}
                    >
                      <Text style={[
                        styles.chipText, 
                        filterState.wearsBlackHat === true && styles.chipTextSelected
                      ]}>
                        Yes
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[
                        styles.chip, 
                        filterState.wearsBlackHat === false && styles.chipSelected
                      ]}
                      onPress={() => setFilterState({
                        ...filterState,
                        wearsBlackHat: filterState.wearsBlackHat === false ? null : false,
                      })}
                    >
                      <Text style={[
                        styles.chipText, 
                        filterState.wearsBlackHat === false && styles.chipTextSelected
                      ]}>
                        No
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={clearAll}
        >
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.applyButton}
          onPress={applyFilters}
        >
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Picker */}
      <ModalPicker
        visible={activePickerModal.visible}
        title={activePickerModal.title}
        selectedValue={
          activePickerModal.field === 'minAge' ? filterState.minAge :
          activePickerModal.field === 'maxAge' ? filterState.maxAge :
          activePickerModal.field === 'country' ? (filterState.selectedCountries[0] || null) :
          activePickerModal.field === 'minHeightFeet' ? filterState.minHeightFeet :
          activePickerModal.field === 'minHeightInches' ? filterState.minHeightInches :
          activePickerModal.field === 'maxHeightFeet' ? filterState.maxHeightFeet :
          activePickerModal.field === 'maxHeightInches' ? filterState.maxHeightInches :
          null
        }
        options={activePickerModal.options}
        onSelect={handlePickerSelect}
        onClose={() => setActivePickerModal({ ...activePickerModal, visible: false })}
      />

      {/* Searchable Country Picker */}
      <SearchableCountryPicker
        visible={showCountryPicker}
        selectedValue={filterState.selectedCountries[0] || null}
        countries={COUNTRIES}
        onSelect={(value) => {
          setFilterState({
            ...filterState,
            selectedCountries: value ? [value] : [],
            selectedStates: [], // Reset states when country changes
          });
        }}
        onClose={() => setShowCountryPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
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
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipSelected: {
    backgroundColor: '#03a9f4',
    borderColor: '#03a9f4',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
    paddingHorizontal: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  ageDropdownContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  ageDropdownGroup: {
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    minHeight: 56,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  picker: {
    height: 56,
    width: '100%',
  },
  pickerItem: {
    height: 180,
    fontSize: 20,
    color: '#333',
    fontWeight: '500',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  modalFullContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 60,
  },
  modalHeaderButton: {
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  modalCancelText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  modalDoneText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'right',
  },
  modalPickerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  modalPicker: {
    width: '100%',
    height: '100%',
  },
  modalPickerItem: {
    fontSize: 24,
    height: 200,
    color: '#333',
  },
  locationSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  heightContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  heightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heightGroup: {
    flex: 1,
  },
  genderSpecificSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#03a9f4',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#03a9f4',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#03a9f4',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: '#333',
    paddingVertical: 8,
  },
  countryListContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  countryItemSelected: {
    backgroundColor: '#f8f9fa',
  },
  countryItemText: {
    fontSize: 17,
    color: '#333',
  },
  countryItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  noResultsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#999',
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
});

