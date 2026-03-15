import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { profileService } from '../../lib/profileService';
import { supabase } from '../../lib/supabase';
import { calculateAge } from '../../lib/utils';
import MatchmakerFilterModal, { MatchmakerFilterState } from './MatchmakerFilterModal';

interface Profile {
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

interface MiddlePersonSelectionModalProps {
  visible: boolean;
  excludedProfileId?: string; // The requester - cannot select themselves
  requestedProfileId?: string; // The person being asked for intro - cannot select them either
  onSelect: (profile: Profile) => void;
  onCancel: () => void;
}

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
  
  // Filter state based on matchmaker profile form
  const [filterState, setFilterState] = useState<MatchmakerFilterState>({
    selectedAgeOption: null,
    minAge: null,
    maxAge: null,
    exactAge: null,
    selectedCountries: [],
    selectedStates: [],
    selectedCities: [],
    selectedHashkafa: [],
    selectedCulturalOrigin: [],
    selectedLanguages: [],
    filterGender: 'all',
    filterRole: 'all',
  });

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, dob, gender, role, hashkafa_type, pictures, picture_privacy, location_country, location_state, location_city, languages, cultural_origin')
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
    if (filterState.selectedAgeOption) {
      const [min, max] = filterState.selectedAgeOption === '36+' 
        ? [36, 999]
        : filterState.selectedAgeOption.split('-').map(Number);
      
      filtered = filtered.filter(p => {
        if (!p.dob) return false;
        const age = calculateAge(p.dob);
        return age >= min && age <= max;
      });
    } else if (filterState.exactAge !== null) {
      filtered = filtered.filter(p => {
        if (!p.dob) return false;
        const age = calculateAge(p.dob);
        return age === filterState.exactAge;
      });
    } else if (filterState.minAge !== null || filterState.maxAge !== null) {
      filtered = filtered.filter(p => {
        if (!p.dob) return false;
        const age = calculateAge(p.dob);
        const min = filterState.minAge ?? 0;
        const max = filterState.maxAge ?? 999;
        return age >= min && age <= max;
      });
    }

    // Location filters
    if (filterState.selectedCountries.length > 0) {
      filtered = filtered.filter(p => {
        const country = (p as any).location_country;
        return country && filterState.selectedCountries.includes(country);
      });
    }

    if (filterState.selectedStates.length > 0) {
      filtered = filtered.filter(p => {
        const state = (p as any).location_state;
        return state && filterState.selectedStates.includes(state);
      });
    }

    if (filterState.selectedCities.length > 0) {
      filtered = filtered.filter(p => {
        const city = (p as any).location_city?.toLowerCase();
        return city && filterState.selectedCities.some(c => city.includes(c.toLowerCase()));
      });
    }

    // Hashkafa filter
    if (filterState.selectedHashkafa.length > 0) {
      filtered = filtered.filter(p => 
        p.hashkafa_type && filterState.selectedHashkafa.includes(p.hashkafa_type)
      );
    }

    // Cultural Origin filter
    if (filterState.selectedCulturalOrigin.length > 0) {
      filtered = filtered.filter(p => {
        const culturalOrigin = (p as any).cultural_origin;
        if (!culturalOrigin) return false;
        // cultural_origin can be comma-separated string
        const origins = typeof culturalOrigin === 'string' 
          ? culturalOrigin.split(',').map(o => o.trim())
          : Array.isArray(culturalOrigin) 
            ? culturalOrigin 
            : [];
        return filterState.selectedCulturalOrigin.some(co => origins.includes(co));
      });
    }

    // Languages filter
    if (filterState.selectedLanguages.length > 0) {
      filtered = filtered.filter(p => {
        const languages = (p as any).languages;
        if (!languages) return false;
        const langArray = Array.isArray(languages) ? languages : [];
        return filterState.selectedLanguages.some(lang => langArray.includes(lang));
      });
    }

    // Gender filter
    if (filterState.filterGender !== 'all') {
      filtered = filtered.filter(p => p.gender === filterState.filterGender);
    }

    // Role filter
    if (filterState.filterRole !== 'all') {
      filtered = filtered.filter(p => p.role === filterState.filterRole);
    }

    setFilteredProfiles(filtered);
  }, [profiles, searchQuery, filterState]);

  useEffect(() => {
    if (visible) {
      loadProfiles();
    }
  }, [visible, loadProfiles]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setFilterState({
      selectedAgeOption: null,
      minAge: null,
      maxAge: null,
      exactAge: null,
      selectedCountries: [],
      selectedStates: [],
      selectedCities: [],
      selectedHashkafa: [],
      selectedCulturalOrigin: [],
      selectedLanguages: [],
      filterGender: 'all',
      filterRole: 'all',
    });
    setSearchQuery('');
  };

  // Get active filters for display
  const getActiveFilters = useMemo(() => {
    const activeFilters: { label: string; removeKey: string }[] = [];

    // Age filters
    if (filterState.selectedAgeOption) {
      activeFilters.push({ label: `Age: ${filterState.selectedAgeOption}`, removeKey: 'selectedAgeOption' });
    } else if (filterState.exactAge !== null) {
      activeFilters.push({ label: `Age: ${filterState.exactAge}`, removeKey: 'exactAge' });
    } else if (filterState.minAge !== null || filterState.maxAge !== null) {
      const min = filterState.minAge ?? '';
      const max = filterState.maxAge ?? '';
      activeFilters.push({ label: `Age: ${min}-${max}`, removeKey: 'customAge' });
    }

    // Location filters
    if (filterState.selectedCountries.length > 0) {
      activeFilters.push({ label: `Country: ${filterState.selectedCountries[0]}`, removeKey: 'selectedCountries' });
    }
    if (filterState.selectedStates.length > 0) {
      filterState.selectedStates.forEach(state => {
        activeFilters.push({ label: `State: ${state}`, removeKey: `state_${state}` });
      });
    }
    if (filterState.selectedCities.length > 0) {
      filterState.selectedCities.forEach(city => {
        activeFilters.push({ label: `City: ${city}`, removeKey: `city_${city}` });
      });
    }

    // Hashkafa
    filterState.selectedHashkafa.forEach(hashkafa => {
      activeFilters.push({ label: hashkafa, removeKey: `hashkafa_${hashkafa}` });
    });

    // Cultural Origin
    filterState.selectedCulturalOrigin.forEach(origin => {
      activeFilters.push({ label: origin, removeKey: `culturalOrigin_${origin}` });
    });

    // Languages
    filterState.selectedLanguages.forEach(language => {
      activeFilters.push({ label: language, removeKey: `language_${language}` });
    });

    // Gender
    if (filterState.filterGender !== 'all') {
      activeFilters.push({ label: `Gender: ${filterState.filterGender}`, removeKey: 'filterGender' });
    }

    // Role
    if (filterState.filterRole !== 'all') {
      activeFilters.push({ label: `Role: ${filterState.filterRole}`, removeKey: 'filterRole' });
    }

    return activeFilters;
  }, [filterState]);

  // Remove a specific filter
  const removeFilter = (removeKey: string) => {
    const newFilterState = { ...filterState };

    if (removeKey === 'selectedAgeOption') {
      newFilterState.selectedAgeOption = null;
    } else if (removeKey === 'exactAge') {
      newFilterState.exactAge = null;
    } else if (removeKey === 'customAge') {
      newFilterState.minAge = null;
      newFilterState.maxAge = null;
    } else if (removeKey === 'selectedCountries') {
      newFilterState.selectedCountries = [];
    } else if (removeKey.startsWith('state_')) {
      const state = removeKey.replace('state_', '');
      newFilterState.selectedStates = newFilterState.selectedStates.filter(s => s !== state);
    } else if (removeKey.startsWith('city_')) {
      const city = removeKey.replace('city_', '');
      newFilterState.selectedCities = newFilterState.selectedCities.filter(c => c !== city);
    } else if (removeKey.startsWith('hashkafa_')) {
      const hashkafa = removeKey.replace('hashkafa_', '');
      newFilterState.selectedHashkafa = newFilterState.selectedHashkafa.filter(h => h !== hashkafa);
    } else if (removeKey.startsWith('culturalOrigin_')) {
      const origin = removeKey.replace('culturalOrigin_', '');
      newFilterState.selectedCulturalOrigin = newFilterState.selectedCulturalOrigin.filter(o => o !== origin);
    } else if (removeKey.startsWith('language_')) {
      const language = removeKey.replace('language_', '');
      newFilterState.selectedLanguages = newFilterState.selectedLanguages.filter(l => l !== language);
    } else if (removeKey === 'filterGender') {
      newFilterState.filterGender = 'all';
    } else if (removeKey === 'filterRole') {
      newFilterState.filterRole = 'all';
    }

    setFilterState(newFilterState);
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
            <Ionicons name="options" size={22} color={showFilters ? '#1293DA' : '#666'} />
          </TouchableOpacity>
        </View>

        {/* Active Filters Summary */}
        {getActiveFilters.length > 0 && (
          <View style={styles.filtersSummary}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersScrollContent}
            >
              {getActiveFilters.map((filter, index) => (
                <View key={index} style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{filter.label}</Text>
                  <TouchableOpacity
                    onPress={() => removeFilter(filter.removeKey)}
                    style={styles.filterBadgeRemove}
                  >
                    <Ionicons name="close-circle" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Results Count */}
        <View style={styles.resultsCount}>
          <Text style={styles.resultsText}>{filteredProfiles.length} people available</Text>
        </View>

        {/* Profile Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1293DA" />
          </View>
        ) : (
          <ScrollView style={styles.profileList}>
            {filteredProfiles.length === 0 && !loading ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Profiles Found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your filters or search query
                </Text>
              </View>
            ) : (
              <View style={styles.profilesGrid}>
                {filteredProfiles.map(profile => {
                  const pictures = profile.pictures;
                  const picturePrivacy = profile.picture_privacy || 'none';
                  const firstPicture = Array.isArray(pictures) && pictures.length > 0 
                    ? pictures[0] 
                    : typeof pictures === 'string' 
                      ? pictures 
                      : null;
                  
                  const showImage = firstPicture && (picturePrivacy === 'always' || picturePrivacy === 'private' || picturePrivacy === 'one_time');
                  const isBlurred = picturePrivacy === 'private';
                  const age = calculateAge(profile.dob);
                  const fullName = `${profile.first_name} ${profile.last_name}`;

                  return (
                    <TouchableOpacity
                      key={profile.id}
                      style={styles.profileCard}
                      onPress={() => handleSelectProfile(profile)}
                      activeOpacity={0.7}
                    >
                      {showImage ? (
                        <View style={styles.imageContainer}>
                          <Image
                            source={{ uri: profileService.getImageUrl(firstPicture) }}
                            style={styles.profileImage}
                            blurRadius={isBlurred ? 15 : 0}
                          />
                          {isBlurred && (
                            <View style={styles.blurOverlay}>
                              <Ionicons name="lock-closed" size={24} color="#fff" />
                            </View>
                          )}
                          <View style={styles.nameBadge}>
                            <Text style={styles.nameText} numberOfLines={1}>{fullName}</Text>
                          </View>
                          <View style={styles.ageBadge}>
                            <Text style={styles.ageText}>{age} y/o</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.profileImage, styles.placeholderImage]}>
                          <Ionicons name="person" size={40} color="#ccc" />
                          <View style={styles.nameBadge}>
                            <Text style={styles.nameText} numberOfLines={1}>{fullName}</Text>
                          </View>
                          <View style={styles.ageBadge}>
                            <Text style={styles.ageText}>{age} y/o</Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Filter Modal */}
      <MatchmakerFilterModal
        visible={showFilters}
        filterState={filterState}
        onClose={() => setShowFilters(false)}
        onFilterChange={setFilterState}
      />
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
    backgroundColor: '#1293DA',
    borderColor: '#1293DA',
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
    color: '#1293DA',
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
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  profileCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    height: 200,
  },
  nameBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: '#7ACDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  nameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  ageBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#1293DA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
  filtersSummary: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
  },
  filtersScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  filterBadgeText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  filterBadgeRemove: {
    padding: 2,
  },
});

