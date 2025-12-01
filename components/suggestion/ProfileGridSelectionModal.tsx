import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { profileService } from '../../lib/profileService';
import { supabase } from '../../lib/supabase';
import { calculateAge } from '../../lib/utils';
import { Profile } from '../../types/homeTypes';
import ProfileCard from '../home/ProfileCard';

interface ProfileGridSelectionModalProps {
  visible: boolean;
  currentUserGender?: string; // To show opposite gender only
  excludedProfileId?: string; // Exclude current user's profile
  onSelect: (profile: Profile) => void;
  onCancel: () => void;
}

// Local interface for database profile structure
interface DatabaseProfile {
  id: string;
  first_name: string;
  last_name: string;
  dob?: string;
  gender: 'male' | 'female';
  role: 'single' | 'matchmaker';
  hashkafa_type?: string;
  pictures?: string[];
  picture_privacy?: 'none' | 'always' | 'private' | 'one_time';
}

export default function ProfileGridSelectionModal({
  visible,
  currentUserGender,
  excludedProfileId,
  onSelect,
  onCancel,
}: ProfileGridSelectionModalProps) {
  const [profiles, setProfiles] = useState<DatabaseProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<DatabaseProfile[]>([]);
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
        .select('id, first_name, last_name, dob, gender, role, hashkafa_type, pictures, picture_privacy')
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

      setProfiles((data as DatabaseProfile[]) || []);
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
        p.hashkafa_type?.toLowerCase().includes(query)
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

  // Transform database profile to Profile type
  const transformProfile = useCallback((dbProfile: DatabaseProfile): Profile => {
    const firstPicture = Array.isArray(dbProfile.pictures) && dbProfile.pictures.length > 0 
      ? dbProfile.pictures[0] 
      : '';
    
    return {
      id: dbProfile.id,
      name: `${dbProfile.first_name} ${dbProfile.last_name}`,
      picture: firstPicture ? profileService.getImageUrl(firstPicture) : '',
      pictures: dbProfile.pictures || [],
      location: '',
      bio: '',
      role: dbProfile.role,
      gender: dbProfile.gender,
      dob: dbProfile.dob,
      hashkafa_type: dbProfile.hashkafa_type,
      picturePrivacy: dbProfile.picture_privacy || 'none',
    };
  }, []);

  const handleSelectProfile = (profile: Profile) => {
    onSelect(profile);
    clearFilters();
  };

  const handleViewProfile = (profile: Profile) => {
    onCancel(); // Close the modal first
    setTimeout(() => {
      router.push(`/profile-details?id=${profile.id}&hideActions=true`);
    }, 100);
  };

  const handleCancel = () => {
    clearFilters();
    onCancel();
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
            <Ionicons name="options" size={22} color={showFilters ? '#03a9f4' : '#666'} />
          </TouchableOpacity>
        </View>

        {/* Results Count */}
        <View style={styles.resultsCount}>
          <Text style={styles.resultsText}>{filteredProfiles.length} profiles available</Text>
        </View>

        {/* Profile Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#03a9f4" />
          </View>
        ) : filteredProfiles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No profiles found</Text>
            <Text style={styles.emptyStateMessage}>
              Try adjusting your search or filters.
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.profilesGrid}
            showsVerticalScrollIndicator={false}
          >
            {filteredProfiles.map((dbProfile) => {
              const profile = transformProfile(dbProfile);
              return (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onPress={handleViewProfile}
                  renderAction={
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() => handleSelectProfile(profile)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.selectButtonText}>Select Profile</Text>
                    </TouchableOpacity>
                  }
                />
              );
            })}
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
  scrollView: {
    flex: 1,
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 12,
    backgroundColor: '#03a9f4',
    borderRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    shadowColor: '#03a9f4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
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
    color: '#03a9f4',
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

