import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterState } from '../../types/homeTypes';

// Import options from profile form (matching SinglesProfileForm.tsx)
const NATIONALITY_OPTIONS = ['Sefardi', 'Ashkenaz', 'Chassidic', 'Yemenite', 'Mixed Background', 'Other'];
const HASHKAFA_OPTIONS = ['Yeshivish', 'Open-minded Yeshivish', 'Modern Yeshivish', 'Chareidi', 'Orthodox', 'Modern Orthodox', 'Other'];
const EDUCATION_OPTIONS = ['Yeshiva', 'Rabbinical Semicha', "Bachelor's degree", "Master's degree", 'Master\'s+', 'High school', 'Seminary', 'Other'];
const OCCUPATION_OPTIONS = ['Full-time Yeshiva', 'Half learning / half working', 'Working', 'Part-working', 'Studying and working', 'Other'];
const MARITAL_STATUS_OPTIONS = ['Single', 'Divorced', 'Divorced with kids', 'Widow/Widower', 'Widow/Widower with kids'];

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

const HEIGHT_FEET = Array.from({ length: 5 }, (_, i) => (4 + i).toString()); // 4-8 feet
const HEIGHT_INCHES = Array.from({ length: 12 }, (_, i) => i.toString()); // 0-11 inches

interface FilterModalProps {
  visible: boolean;
  filterState: FilterState;
  onClose: () => void;
  onFilterChange: (filters: FilterState) => void;
}

export default function FilterModal({
  visible,
  filterState,
  onClose,
  onFilterChange,
}: FilterModalProps) {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    age: true,
    location: true,
    hashkafa: true,
    nationality: true,
    maritalStatus: true,
    hasChildren: true,
    education: true,
    occupation: true,
    height: true,
  });

  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleAgeOption = (option: string) => {
    onFilterChange({
      ...filterState,
      selectedAgeOption: filterState.selectedAgeOption === option ? null : option,
      minAge: null,
      maxAge: null,
      exactAge: null,
    });
  };

  const toggleHashkafa = (hashkafa: string) => {
    const newSelection = filterState.selectedHashkafa.includes(hashkafa)
      ? filterState.selectedHashkafa.filter(h => h !== hashkafa)
      : [...filterState.selectedHashkafa, hashkafa];
    
    onFilterChange({
      ...filterState,
      selectedHashkafa: newSelection,
    });
  };

  const toggleNationality = (nationality: string) => {
    const newSelection = filterState.selectedNationality.includes(nationality)
      ? filterState.selectedNationality.filter(n => n !== nationality)
      : [...filterState.selectedNationality, nationality];
    
    onFilterChange({
      ...filterState,
      selectedNationality: newSelection,
    });
  };

  const toggleMaritalStatus = (status: string) => {
    const newSelection = filterState.selectedMaritalStatus.includes(status)
      ? filterState.selectedMaritalStatus.filter(s => s !== status)
      : [...filterState.selectedMaritalStatus, status];
    
    onFilterChange({
      ...filterState,
      selectedMaritalStatus: newSelection,
    });
  };

  const toggleEducation = (education: string) => {
    const newSelection = filterState.selectedEducation.includes(education)
      ? filterState.selectedEducation.filter(e => e !== education)
      : [...filterState.selectedEducation, education];
    
    onFilterChange({
      ...filterState,
      selectedEducation: newSelection,
    });
  };

  const toggleOccupation = (occupation: string) => {
    const newSelection = filterState.selectedOccupation.includes(occupation)
      ? filterState.selectedOccupation.filter(o => o !== occupation)
      : [...filterState.selectedOccupation, occupation];
    
    onFilterChange({
      ...filterState,
      selectedOccupation: newSelection,
    });
  };


  const toggleState = (state: string) => {
    const newSelection = filterState.selectedStates.includes(state)
      ? filterState.selectedStates.filter(s => s !== state)
      : [...filterState.selectedStates, state];
    
    onFilterChange({
      ...filterState,
      selectedStates: newSelection,
    });
  };

  const setHasChildren = (value: boolean | null) => {
    onFilterChange({
      ...filterState,
      hasChildren: value,
    });
  };

  const clearAll = () => {
    onFilterChange({
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
    });
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
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.title}>Filters</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Age Filter */}
          {renderSection('Age Range', 'age', (
            <>
              <View style={styles.chipRow}>
                {['18-25', '26-30', '31-35', '36+'].map(option => (
                  <TouchableOpacity 
                    key={option}
                    style={[
                      styles.chip, 
                      filterState.selectedAgeOption === option && styles.chipSelected
                    ]}
                    onPress={() => toggleAgeOption(option)}
                  >
                    <Text style={[
                      styles.chipText, 
                      filterState.selectedAgeOption === option && styles.chipTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Age Range */}
              <View style={styles.customAgeContainer}>
                <Text style={styles.label}>Custom Range:</Text>
                <View style={styles.ageInputRow}>
                  <View style={styles.ageInputGroup}>
                    <Text style={styles.inputLabel}>From:</Text>
                    <TextInput
                      style={styles.ageInput}
                      placeholder="18"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                      value={filterState.minAge?.toString() || ''}
                      onChangeText={(text) => onFilterChange({
                        ...filterState,
                        minAge: text ? parseInt(text) : null,
                        selectedAgeOption: null,
                        exactAge: null,
                      })}
                    />
                  </View>
                  <View style={styles.ageInputGroup}>
                    <Text style={styles.inputLabel}>To:</Text>
                    <TextInput
                      style={styles.ageInput}
                      placeholder="35"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                      value={filterState.maxAge?.toString() || ''}
                      onChangeText={(text) => onFilterChange({
                        ...filterState,
                        maxAge: text ? parseInt(text) : null,
                        selectedAgeOption: null,
                        exactAge: null,
                      })}
                    />
                  </View>
                </View>
              </View>

              {/* Exact Age */}
              <View style={styles.exactAgeContainer}>
                <Text style={styles.label}>Exact Age:</Text>
                <TextInput
                  style={styles.exactAgeInput}
                  placeholder="25"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                  value={filterState.exactAge?.toString() || ''}
                  onChangeText={(text) => onFilterChange({
                    ...filterState,
                    exactAge: text ? parseInt(text) : null,
                    selectedAgeOption: null,
                    minAge: null,
                    maxAge: null,
                  })}
                />
              </View>
            </>
          ))}

          {/* Location Filter */}
          {renderSection('Location', 'location', (
            <>
              <View style={styles.locationSection}>
                <Text style={styles.label}>Country:</Text>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search country..."
                    placeholderTextColor="#999"
                    value={countrySearchQuery}
                    onChangeText={(text) => {
                      setCountrySearchQuery(text);
                      setShowCountrySuggestions(text.length > 0);
                    }}
                    onFocus={() => {
                      if (countrySearchQuery.length > 0) {
                        setShowCountrySuggestions(true);
                      }
                    }}
                  />
                  {countrySearchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setCountrySearchQuery('');
                        setShowCountrySuggestions(false);
                      }}
                      style={styles.clearSearchButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
                
                {showCountrySuggestions && (
                  <View style={styles.suggestionsContainer}>
                    <ScrollView 
                      style={styles.suggestionsList}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    >
                      {COUNTRIES.filter(country =>
                        country.toLowerCase().includes(countrySearchQuery.toLowerCase())
                      ).slice(0, 10).map(country => (
                        <TouchableOpacity
                          key={country}
                          style={styles.suggestionItem}
                          onPress={() => {
                            onFilterChange({
                              ...filterState,
                              selectedCountries: [country],
                            });
                            setCountrySearchQuery('');
                            setShowCountrySuggestions(false);
                          }}
                        >
                          <Text style={styles.suggestionText}>{country}</Text>
                        </TouchableOpacity>
                      ))}
                      {COUNTRIES.filter(country =>
                        country.toLowerCase().includes(countrySearchQuery.toLowerCase())
                      ).length > 10 && (
                        <Text style={styles.moreSuggestionsText}>
                          + {COUNTRIES.filter(country =>
                            country.toLowerCase().includes(countrySearchQuery.toLowerCase())
                          ).length - 10} more results
                        </Text>
                      )}
                    </ScrollView>
                  </View>
                )}

                {filterState.selectedCountries.length > 0 && (
                  <View style={styles.selectedCountryContainer}>
                    <Text style={styles.selectedCountryText}>
                      Selected: {filterState.selectedCountries[0]}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        onFilterChange({
                          ...filterState,
                          selectedCountries: [],
                        });
                        setCountrySearchQuery('');
                      }}
                      style={styles.clearCountryButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                )}
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
                        onPress={() => toggleState(state)}
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

              <View style={styles.locationSection}>
                <Text style={styles.label}>City (optional):</Text>
                <TextInput
                  style={styles.locationInput}
                  placeholder="Enter city name..."
                  placeholderTextColor="#999"
                  value={filterState.selectedCities.join(', ')}
                  onChangeText={(text) => onFilterChange({
                    ...filterState,
                    selectedCities: text ? text.split(',').map(c => c.trim()).filter(c => c) : [],
                  })}
                />
              </View>
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
                  onPress={() => toggleHashkafa(hashkafa)}
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
                  onPress={() => toggleNationality(nationality)}
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
                  onPress={() => toggleMaritalStatus(status)}
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
                onPress={() => setHasChildren(filterState.hasChildren === true ? null : true)}
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
                onPress={() => setHasChildren(filterState.hasChildren === false ? null : false)}
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
                  onPress={() => toggleEducation(education)}
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
                  onPress={() => toggleOccupation(occupation)}
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
              <View style={styles.heightSelectionRow}>
                <View style={styles.heightSelectionGroup}>
                  <Text style={styles.inputLabel}>Feet:</Text>
                  <View style={styles.heightChipRow}>
                    <TouchableOpacity
                      style={[
                        styles.heightChip,
                        filterState.minHeightFeet === null && styles.heightChipSelected
                      ]}
                      onPress={() => onFilterChange({
                        ...filterState,
                        minHeightFeet: null,
                      })}
                    >
                      <Text style={[
                        styles.heightChipText,
                        filterState.minHeightFeet === null && styles.heightChipTextSelected
                      ]}>
                        Any
                      </Text>
                    </TouchableOpacity>
                    {HEIGHT_FEET.map(feet => (
                      <TouchableOpacity
                        key={feet}
                        style={[
                          styles.heightChip,
                          filterState.minHeightFeet === parseInt(feet) && styles.heightChipSelected
                        ]}
                        onPress={() => onFilterChange({
                          ...filterState,
                          minHeightFeet: parseInt(feet),
                        })}
                      >
                        <Text style={[
                          styles.heightChipText,
                          filterState.minHeightFeet === parseInt(feet) && styles.heightChipTextSelected
                        ]}>
                          {feet}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.heightSelectionGroup}>
                  <Text style={styles.inputLabel}>Inches:</Text>
                  <View style={styles.heightChipRow}>
                    <TouchableOpacity
                      style={[
                        styles.heightChip,
                        filterState.minHeightInches === null && styles.heightChipSelected
                      ]}
                      onPress={() => onFilterChange({
                        ...filterState,
                        minHeightInches: null,
                      })}
                    >
                      <Text style={[
                        styles.heightChipText,
                        filterState.minHeightInches === null && styles.heightChipTextSelected
                      ]}>
                        Any
                      </Text>
                    </TouchableOpacity>
                    {HEIGHT_INCHES.map(inches => (
                      <TouchableOpacity
                        key={inches}
                        style={[
                          styles.heightChip,
                          filterState.minHeightInches === parseInt(inches) && styles.heightChipSelected
                        ]}
                        onPress={() => onFilterChange({
                          ...filterState,
                          minHeightInches: parseInt(inches),
                        })}
                      >
                        <Text style={[
                          styles.heightChipText,
                          filterState.minHeightInches === parseInt(inches) && styles.heightChipTextSelected
                        ]}>
                          {inches}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>Maximum Height:</Text>
              <View style={styles.heightSelectionRow}>
                <View style={styles.heightSelectionGroup}>
                  <Text style={styles.inputLabel}>Feet:</Text>
                  <View style={styles.heightChipRow}>
                    <TouchableOpacity
                      style={[
                        styles.heightChip,
                        filterState.maxHeightFeet === null && styles.heightChipSelected
                      ]}
                      onPress={() => onFilterChange({
                        ...filterState,
                        maxHeightFeet: null,
                      })}
                    >
                      <Text style={[
                        styles.heightChipText,
                        filterState.maxHeightFeet === null && styles.heightChipTextSelected
                      ]}>
                        Any
                      </Text>
                    </TouchableOpacity>
                    {HEIGHT_FEET.map(feet => (
                      <TouchableOpacity
                        key={feet}
                        style={[
                          styles.heightChip,
                          filterState.maxHeightFeet === parseInt(feet) && styles.heightChipSelected
                        ]}
                        onPress={() => onFilterChange({
                          ...filterState,
                          maxHeightFeet: parseInt(feet),
                        })}
                      >
                        <Text style={[
                          styles.heightChipText,
                          filterState.maxHeightFeet === parseInt(feet) && styles.heightChipTextSelected
                        ]}>
                          {feet}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.heightSelectionGroup}>
                  <Text style={styles.inputLabel}>Inches:</Text>
                  <View style={styles.heightChipRow}>
                    <TouchableOpacity
                      style={[
                        styles.heightChip,
                        filterState.maxHeightInches === null && styles.heightChipSelected
                      ]}
                      onPress={() => onFilterChange({
                        ...filterState,
                        maxHeightInches: null,
                      })}
                    >
                      <Text style={[
                        styles.heightChipText,
                        filterState.maxHeightInches === null && styles.heightChipTextSelected
                      ]}>
                        Any
                      </Text>
                    </TouchableOpacity>
                    {HEIGHT_INCHES.map(inches => (
                      <TouchableOpacity
                        key={inches}
                        style={[
                          styles.heightChip,
                          filterState.maxHeightInches === parseInt(inches) && styles.heightChipSelected
                        ]}
                        onPress={() => onFilterChange({
                          ...filterState,
                          maxHeightInches: parseInt(inches),
                        })}
                      >
                        <Text style={[
                          styles.heightChipText,
                          filterState.maxHeightInches === parseInt(inches) && styles.heightChipTextSelected
                        ]}>
                          {inches}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))}
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
            onPress={onClose}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipSelected: {
    backgroundColor: '#1293DA',
    borderColor: '#1293DA',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  customAgeContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  ageInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ageInputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  ageInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  exactAgeContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  exactAgeInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  locationSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  suggestionsContainer: {
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  moreSuggestionsText: {
    padding: 12,
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  selectedCountryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  selectedCountryText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  clearCountryButton: {
    padding: 4,
  },
  heightContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  heightSelectionRow: {
    gap: 16,
  },
  heightSelectionGroup: {
    marginBottom: 8,
  },
  heightChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  heightChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 50,
    alignItems: 'center',
  },
  heightChipSelected: {
    backgroundColor: '#1293DA',
    borderColor: '#1293DA',
  },
  heightChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  heightChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
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
    borderColor: '#1293DA',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#1293DA',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1293DA',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
