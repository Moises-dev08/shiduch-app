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

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  dob?: string;
  gender: 'male' | 'female';
  role: 'single' | 'matchmaker';
  hashkafa_type?: string;
  pictures?: string[];
}

interface MiddlePersonSelectionModalProps {
  visible: boolean;
  excludedProfileId?: string; // The requester - cannot select themselves
  requestedProfileId?: string; // The person being asked for intro - cannot select them either
  onSelect: (profile: Profile) => void;
  onCancel: () => void;
}

type FilterGender = 'all' | 'male' | 'female';
type FilterRole = 'all' | 'single' | 'matchmaker';

export default function MiddlePersonSelectionModal({
  visible,
  excludedProfileId,
  requestedProfileId,
  onSelect,
  onCancel,
}: MiddlePersonSelectionModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [filterGender, setFilterGender] = useState<FilterGender>('all');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [filterHashkafa, setFilterHashkafa] = useState('');

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, dob, gender, role, hashkafa_type, pictures')
        .eq('status', 'approved')
        .eq('is_active', true);

      // Exclude the requester (current user)
      if (excludedProfileId) {
        query = query.neq('id', excludedProfileId);
      }

      // Exclude the requested profile (person being asked for intro)
      if (requestedProfileId) {
        query = query.neq('id', requestedProfileId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
   }, [excludedProfileId, requestedProfileId]);

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

    // Gender filter
    if (filterGender !== 'all') {
      filtered = filtered.filter(p => p.gender === filterGender);
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(p => p.role === filterRole);
    }

    // Hashkafa filter
    if (filterHashkafa.trim()) {
      const query = filterHashkafa.toLowerCase();
      filtered = filtered.filter(p =>
        p?.hashkafa_type?.toLowerCase().includes(query)
      );
    }

    setFilteredProfiles(filtered);
  }, [profiles, searchQuery, ageMin, ageMax, filterGender, filterRole, filterHashkafa]);

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
    setFilterGender('all');
    setFilterRole('all');
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
          <Text style={styles.headerTitle}>Select Matchmaker/Shadchan</Text>
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
          <Text style={styles.resultsText}>{filteredProfiles.length} people available</Text>
        </View>

        {/* Profile List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#03a9f4" />
          </View>
        ) : (
          <ScrollView style={styles.profileList}>
            {filteredProfiles.map(profile => (
              <TouchableOpacity
                key={profile.id}
                style={styles.profileItem}
                onPress={() => handleSelectProfile(profile)}
              >
                <View style={styles.profileImageContainer}>
                  {profile.pictures && profile.pictures.length > 0 ? (
                    <Image
                      source={{ uri: profile.pictures[0] }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Ionicons name="person" size={30} color="#ccc" />
                    </View>
                  )}
                </View>
                
                <View style={styles.profileDetails}>
                  <Text style={styles.profileName}>
                    {profile.first_name} {profile.last_name}
                  </Text>
                  <Text style={styles.profileInfo}>
                    {calculateAge(profile.dob)} • {profile.gender} • {profile.role}
                  </Text>
                  <Text style={styles.profileHashkafa} numberOfLines={1}>
                    {profile.hashkafa_type || 'Not specified'}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}

            {filteredProfiles.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Profiles Found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your filters or search query
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

            {/* Gender Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Gender</Text>
              <View style={styles.chipContainer}>
                <TouchableOpacity
                  style={[styles.chip, filterGender === 'all' && styles.chipActive]}
                  onPress={() => setFilterGender('all')}
                >
                  <Text style={[styles.chipText, filterGender === 'all' && styles.chipTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, filterGender === 'male' && styles.chipActive]}
                  onPress={() => setFilterGender('male')}
                >
                  <Text style={[styles.chipText, filterGender === 'male' && styles.chipTextActive]}>
                    Male
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, filterGender === 'female' && styles.chipActive]}
                  onPress={() => setFilterGender('female')}
                >
                  <Text style={[styles.chipText, filterGender === 'female' && styles.chipTextActive]}>
                    Female
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Role Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Role</Text>
              <View style={styles.chipContainer}>
                <TouchableOpacity
                  style={[styles.chip, filterRole === 'all' && styles.chipActive]}
                  onPress={() => setFilterRole('all')}
                >
                  <Text style={[styles.chipText, filterRole === 'all' && styles.chipTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, filterRole === 'single' && styles.chipActive]}
                  onPress={() => setFilterRole('single')}
                >
                  <Text style={[styles.chipText, filterRole === 'single' && styles.chipTextActive]}>
                    Single
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, filterRole === 'matchmaker' && styles.chipActive]}
                  onPress={() => setFilterRole('matchmaker')}
                >
                  <Text style={[styles.chipText, filterRole === 'matchmaker' && styles.chipTextActive]}>
                    Matchmaker
                  </Text>
                </TouchableOpacity>
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
                setFilterGender('all');
                setFilterRole('all');
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 12,
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
    gap: 8,
  },
  ageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  ageSeparator: {
    fontSize: 18,
    color: '#666',
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#03a9f4',
    borderColor: '#03a9f4',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  hashkafaInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  clearButton: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#03a9f4',
    fontWeight: '600',
  },
  resultsCount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  profileList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  profileInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  profileHashkafa: {
    fontSize: 13,
    color: '#999',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  filterModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    marginTop: 16,
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
});

