import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterState } from '../../types/homeTypes';

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
  const { selectedAgeOption, selectedHashkafa, selectedLocation } = filterState;

  const toggleAgeOption = (option: string) => {
    onFilterChange({
      ...filterState,
      selectedAgeOption: selectedAgeOption === option ? null : option,
    });
  };

  const toggleHashkafa = (hashkafa: string) => {
    const newSelection = selectedHashkafa.includes(hashkafa)
      ? selectedHashkafa.filter(h => h !== hashkafa)
      : [...selectedHashkafa, hashkafa];
    
    onFilterChange({
      ...filterState,
      selectedHashkafa: newSelection,
    });
  };

  const toggleLocation = (location: string) => {
    const newSelection = selectedLocation.includes(location)
      ? selectedLocation.filter(l => l !== location)
      : [...selectedLocation, location];
    
    onFilterChange({
      ...filterState,
      selectedLocation: newSelection,
    });
  };

  const clearAll = () => {
    onFilterChange({
      selectedAgeOption: null,
      selectedHashkafa: [],
      selectedLocation: [],
    });
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Age Range</Text>
            <View style={styles.chipRow}>
              {['18-25', '26-30', '31-35', '36+'].map(option => (
                <TouchableOpacity 
                  key={option}
                  style={[
                    styles.chip, 
                    selectedAgeOption === option && styles.chipSelected
                  ]}
                  onPress={() => toggleAgeOption(option)}
                >
                  <Text style={[
                    styles.chipText, 
                    selectedAgeOption === option && styles.chipTextSelected
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
                  />
                </View>
                <View style={styles.ageInputGroup}>
                  <Text style={styles.inputLabel}>To:</Text>
                  <TextInput
                    style={styles.ageInput}
                    placeholder="35"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
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
              />
            </View>
          </View>

          {/* Hashkafa Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hashkafa</Text>
            <View style={styles.chipRow}>
              {['Modern Orthodox', 'Yeshivish', 'Chabad', 'Litvish', 'Sephardic', 'Chassidish'].map(hashkafa => (
                <TouchableOpacity 
                  key={hashkafa}
                  style={[
                    styles.chip, 
                    selectedHashkafa.includes(hashkafa) && styles.chipSelected
                  ]}
                  onPress={() => toggleHashkafa(hashkafa)}
                >
                  <Text style={[
                    styles.chipText, 
                    selectedHashkafa.includes(hashkafa) && styles.chipTextSelected
                  ]}>
                    {hashkafa}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationInputContainer}>
              <Text style={styles.label}>Search Location:</Text>
              <TextInput
                style={styles.locationInput}
                placeholder="Enter city, state, or zip code..."
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.popularLocations}>
              <Text style={styles.label}>Popular Locations:</Text>
              <View style={styles.chipRow}>
                {['Brooklyn, NY', 'Queens, NY', 'Manhattan, NY', 'Lakewood, NJ', 'Monsey, NY', 'Teaneck, NJ'].map(location => (
                  <TouchableOpacity 
                    key={location}
                    style={[
                      styles.chip, 
                      selectedLocation.includes(location) && styles.chipSelected
                    ]}
                    onPress={() => toggleLocation(location)}
                  >
                    <Text style={[
                      styles.chipText, 
                      selectedLocation.includes(location) && styles.chipTextSelected
                    ]}>
                      {location}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
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
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
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
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
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
  },
  exactAgeInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  locationInputContainer: {
    marginBottom: 16,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  popularLocations: {
    marginTop: 8,
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
    borderColor: '#e91e63',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#e91e63',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#e91e63',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

