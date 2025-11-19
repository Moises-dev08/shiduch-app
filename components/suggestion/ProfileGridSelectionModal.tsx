import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { calculateAge } from '../../lib/utils';
import { Profile } from '../../types/homeTypes';

interface ProfileGridSelectionModalProps {
  visible: boolean;
  currentUserGender?: string; // To show opposite gender only
  excludedProfileId?: string; // Exclude current user's profile
  onSelect: (profile: Profile) => void;
  onCancel: () => void;
}

type FilterGender = 'all' | 'male' | 'female';

export default function ProfileGridSelectionModal({
  visible,
  currentUserGender,
  excludedProfileId,
  onSelect,
  onCancel,
}: ProfileGridSelectionModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [filterHashkafa, setFilterHashkafa] = useState('');

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, dob, gender, role, hashkafa_type, pictures')
        .eq('status', 'approved')
        .eq('is_active', true)
        .eq('role', 'single'); // Only singles can be set up

      // Exclude the current user
      if (excludedProfileId) {
        query = query.neq('id', excludedProfileId);
      }

      // Filter by opposite gender
      if (currentUserGender) {
        const oppositeGender = currentUserGender === 'male' ? 'female' : 'male';
        query = query.eq('gender', oppositeGender);
      }

      const { data, error } = await query;

      if (error) throw error;

      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  }, [excludedProfileId, currentUserGender]);

  const applyFilters = useCallback(() => {
    let filtered = [...profiles];

    // Search by name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(query)
      );
    }

    // Age filter
    if (ageMin) {
      filtered = filtered.filter(p => calculateAge(p.dob) >= parseInt(ageMin));
    }
    if (ageMax) {
      filtered = filtered.filter(p => calculateAge(p.dob) <= parseInt(ageMax));
    }

    // Hashkafa filter
    if (filterHashkafa.trim()) {
      const query = filterHashkafa.toLowerCase();
      filtered = filtered.filter(p =>
        p.hashkafa.toLowerCase().includes(query)
      );
    }

    setFilteredProfiles(filtered);
  }, [profiles, searchQuery, ageMin, ageMax, filterHashkafa]);

  useEffect(() => {
    if (visible) {
      loadProfiles();
    }
  }, [visible, loadProfiles]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setAgeMin('');
    setAgeMax('');
    setFilterHashkafa('');
    setSearchQuery('');
  };

  const handleSelectProfile = (profile: Profile) => {
    onSelect(profile);
    clearFilters();
  };

  const handleCancel = () => {
    clearFilters();
    onCancel();
  };

  const getProfileImage = (profile: Profile) => {
    if (Array.isArray(profile.pictures) && profile.pictures.length > 0) {
      return profile.pictures[0];
    }
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Profile to Set Up</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options" size={22} color={showFilters ? '#e91e63' : '#666'} />
          </TouchableOpacity>
        </View>

        {/* Results Count */}
        <View style={styles.resultsCount}>
          <Text style={styles.resultsText}>{filteredProfiles.length} profiles available</Text>
        </View>

        {/* Profile Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e91e63" />
          </View>
        ) : (
          <ScrollView style={styles.gridContainer} contentContainerStyle={styles.grid}>
            {filteredProfiles.map((profile) => (
              <TouchableOpacity
                key={profile.id}
                style={styles.gridItem}
                onPress={() => handleSelectProfile(profile)}
                activeOpacity={0.7}
              >
                {getProfileImage(profile) ? (
                  <Image
                    source={{ uri: getProfileImage(profile)! }}
                    style={styles.gridImage}
                  />
                ) : (
                  <View style={styles.gridImagePlaceholder}>
                    <Ionicons name="person" size={40} color="#ccc" />
                  </View>
                )}
                <View style={styles.gridOverlay}>
                  <Text style={styles.gridName} numberOfLines={1}>
                    {profile.first_name} {profile.last_name}
                  </Text>
                  <Text style={styles.gridDetails}>
                    {calculateAge(profile.dob)} • {profile.hashkafa_type || 'Not specified'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {filteredProfiles.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateTitle}>No profiles found</Text>
                <Text style={styles.emptyStateMessage}>
                  Try adjusting your search or filters.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.filterModalContainer}>
          {/* Filter Modal Header */}
          <View style={styles.filterModalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.filterModalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterModalContent}>
            {/* Age Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Age Range</Text>
              <View style={styles.ageInputs}>
                <TextInput
                  style={styles.ageInput}
                  placeholder="Min"
                  value={ageMin}
                  onChangeText={setAgeMin}
                  keyboardType="numeric"
                />
                <Text style={styles.ageSeparator}>-</Text>
                <TextInput
                  style={styles.ageInput}
                  placeholder="Max"
                  value={ageMax}
                  onChangeText={setAgeMax}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Hashkafa Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Hashkafa</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter hashkafa..."
                value={filterHashkafa}
                onChangeText={setFilterHashkafa}
                autoCapitalize="words"
              />
            </View>

            {/* Clear Filters Button */}
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setAgeMin('');
                setAgeMax('');
                setFilterHashkafa('');
              }}
            >
              <Ionicons name="close-circle" size={18} color="#666" />
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    padding: 8,
  },
  resultsCount: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  gridItem: {
    width: '47%',
    aspectRatio: 0.75,
    margin: '1.5%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  gridName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  gridDetails: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  emptyState: {
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  filterModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e91e63',
  },
  filterModalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  ageInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  ageSeparator: {
    fontSize: 18,
    color: '#666',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});

