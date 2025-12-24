import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileCard from '../../components/home/ProfileCard';
import { useHomeProfiles } from '../../hooks/useHomeProfiles';
import { profileService } from '../../lib/profileService';
import { Profile } from '../../types/homeTypes';

export default function HomeScreen() {
  const [profileStatus, setProfileStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  // Check profile status and pending filters when screen is focused
  useFocusEffect(
    useCallback(() => {
      const checkStatus = async () => {
        const result = await profileService.getProfileStatus();
        if (result.success && result.status) {
          setProfileStatus(result.status);
          // If status is not approved, redirect to profile tab
          if (result.status !== 'approved') {
            router.replace('/(tabs)/profile');
          }
        }
      };
      
      const checkPendingFilters = async () => {
        try {
          const pendingFilters = await AsyncStorage.getItem('pendingFilters');
          if (pendingFilters) {
            const newFilters = JSON.parse(pendingFilters);
            setFilterState(newFilters);
            // Clear the pending filters
            await AsyncStorage.removeItem('pendingFilters');
          }
        } catch (error) {
          console.error('Error loading pending filters:', error);
        }
      };
      
      checkStatus();
      checkPendingFilters();
    }, [setFilterState])
  );
  // Profile data and filters
  const {
    filteredProfiles,
    loading,
    refreshing,
    searchQuery,
    filterState,
    setSearchQuery,
    setFilterState,
    onRefresh,
  } = useHomeProfiles();


  // Handlers
  const handleProfilePress = (profile: Profile) => {
    router.push(`/profile-details?id=${profile.id}`);
  };

  // Get active filters for display
  const getActiveFilters = () => {
    const activeFilters: Array<{ label: string; removeKey: string }> = [];

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

    // Nationality
    filterState.selectedNationality.forEach(nationality => {
      activeFilters.push({ label: nationality, removeKey: `nationality_${nationality}` });
    });

    // Marital Status
    filterState.selectedMaritalStatus.forEach(status => {
      activeFilters.push({ label: status, removeKey: `maritalStatus_${status}` });
    });

    // Has Children
    if (filterState.hasChildren !== null) {
      activeFilters.push({ 
        label: filterState.hasChildren ? 'Has Children' : 'No Children', 
        removeKey: 'hasChildren' 
      });
    }

    // Education
    filterState.selectedEducation.forEach(education => {
      activeFilters.push({ label: education, removeKey: `education_${education}` });
    });

    // Occupation
    filterState.selectedOccupation.forEach(occupation => {
      activeFilters.push({ label: occupation, removeKey: `occupation_${occupation}` });
    });

    // Height
    if (filterState.minHeightFeet !== null || filterState.minHeightInches !== null ||
        filterState.maxHeightFeet !== null || filterState.maxHeightInches !== null) {
      const minHeight = filterState.minHeightFeet !== null && filterState.minHeightInches !== null
        ? `${filterState.minHeightFeet}'${filterState.minHeightInches}"`
        : filterState.minHeightFeet !== null ? `${filterState.minHeightFeet}'` : '';
      const maxHeight = filterState.maxHeightFeet !== null && filterState.maxHeightInches !== null
        ? `${filterState.maxHeightFeet}'${filterState.maxHeightInches}"`
        : filterState.maxHeightFeet !== null ? `${filterState.maxHeightFeet}'` : '';
      const heightLabel = minHeight && maxHeight ? `Height: ${minHeight}-${maxHeight}` 
        : minHeight ? `Height: ${minHeight}+`
        : maxHeight ? `Height: up to ${maxHeight}` : 'Height';
      activeFilters.push({ label: heightLabel, removeKey: 'height' });
    }

    // Sorting
    if (filterState.sortBy) {
      const sortLabel = filterState.sortBy === 'newest' ? 'Newest First' : 'Youngest First';
      activeFilters.push({ label: `Sort: ${sortLabel}`, removeKey: 'sortBy' });
    }

    // Ask Me Fields
    if (filterState.hasAskMeFields) {
      activeFilters.push({ label: 'Has "Ask Me"', removeKey: 'hasAskMeFields' });
    }

    // Photo filter
    if (filterState.hasPhoto !== null) {
      const photoLabel = filterState.hasPhoto ? 'Has Photo' : 'No Photo';
      activeFilters.push({ label: photoLabel, removeKey: 'hasPhoto' });
    }

    // Gender-specific filters
    if (filterState.selectedTorahLearning) {
      filterState.selectedTorahLearning.forEach(learning => {
        activeFilters.push({ label: `Torah: ${learning}`, removeKey: `torahLearning_${learning}` });
      });
    }

    if (filterState.selectedPraying) {
      filterState.selectedPraying.forEach(praying => {
        activeFilters.push({ label: `Praying: ${praying}`, removeKey: `praying_${praying}` });
      });
    }

    if (filterState.selectedHeadCovering) {
      filterState.selectedHeadCovering.forEach(covering => {
        activeFilters.push({ label: `Head Covering: ${covering}`, removeKey: `headCovering_${covering}` });
      });
    }

    if (filterState.wearsBlackHat !== null) {
      activeFilters.push({ 
        label: filterState.wearsBlackHat ? 'Wears Black Hat' : 'No Black Hat', 
        removeKey: 'wearsBlackHat' 
      });
    }

    return activeFilters;
  };

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
    } else if (removeKey.startsWith('nationality_')) {
      const nationality = removeKey.replace('nationality_', '');
      newFilterState.selectedNationality = newFilterState.selectedNationality.filter(n => n !== nationality);
    } else if (removeKey.startsWith('maritalStatus_')) {
      const status = removeKey.replace('maritalStatus_', '');
      newFilterState.selectedMaritalStatus = newFilterState.selectedMaritalStatus.filter(s => s !== status);
    } else if (removeKey === 'hasChildren') {
      newFilterState.hasChildren = null;
    } else if (removeKey.startsWith('education_')) {
      const education = removeKey.replace('education_', '');
      newFilterState.selectedEducation = newFilterState.selectedEducation.filter(e => e !== education);
    } else if (removeKey.startsWith('occupation_')) {
      const occupation = removeKey.replace('occupation_', '');
      newFilterState.selectedOccupation = newFilterState.selectedOccupation.filter(o => o !== occupation);
    } else if (removeKey === 'height') {
      newFilterState.minHeightFeet = null;
      newFilterState.minHeightInches = null;
      newFilterState.maxHeightFeet = null;
      newFilterState.maxHeightInches = null;
    } else if (removeKey === 'sortBy') {
      newFilterState.sortBy = null;
    } else if (removeKey === 'hasAskMeFields') {
      newFilterState.hasAskMeFields = false;
    } else if (removeKey === 'hasPhoto') {
      newFilterState.hasPhoto = null;
    } else if (removeKey.startsWith('torahLearning_')) {
      const learning = removeKey.replace('torahLearning_', '');
      newFilterState.selectedTorahLearning = newFilterState.selectedTorahLearning.filter(l => l !== learning);
    } else if (removeKey.startsWith('praying_')) {
      const praying = removeKey.replace('praying_', '');
      newFilterState.selectedPraying = newFilterState.selectedPraying.filter(p => p !== praying);
    } else if (removeKey.startsWith('headCovering_')) {
      const covering = removeKey.replace('headCovering_', '');
      newFilterState.selectedHeadCovering = newFilterState.selectedHeadCovering.filter(h => h !== covering);
    } else if (removeKey === 'wearsBlackHat') {
      newFilterState.wearsBlackHat = null;
    }

    setFilterState(newFilterState);
  };

  const activeFilters = getActiveFilters();


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Discover</Text>
            <TouchableOpacity
              style={styles.successMatchesButton}
              onPress={() => router.push('/successful-matches')}
            >
              <Text style={styles.successMatchesEmoji}>🎉</Text>
              <Text style={styles.successMatchesText}>Success Stories</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => {
              // TODO: Navigate to notifications screen
              console.log('Notifications pressed');
            }}
          >
            <Ionicons name="notifications-outline" size={24} color="#333" />
            {/* Badge for future use */}
            {/* <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View> */}
          </TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search profiles..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => router.push({ 
              pathname: '/filters', 
              params: { filterState: JSON.stringify(filterState) } 
            })}
          >
            <Ionicons name="options" size={20} color="#03a9f4" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Filters Summary */}
      {activeFilters.length > 0 && (
        <View style={styles.filtersSummary}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {activeFilters.map((filter, index) => (
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

      {/* Profiles Grid */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#03a9f4']}
            tintColor="#03a9f4"
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#03a9f4" />
            <Text style={styles.loadingText}>Loading profiles...</Text>
          </View>
        ) : filteredProfiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No profiles found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search 🔍' : 'Check back later for new profiles ✨'}
            </Text>
          </View>
        ) : (
          <View style={styles.profilesGrid}>
            {filteredProfiles?.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onPress={handleProfilePress}
              />
            ))}
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  successMatchesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ff6b9d',
    borderRadius: 20,
    gap: 6,
    marginLeft: 12,
    shadowColor: '#ff6b9d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  successMatchesEmoji: {
    fontSize: 16,
  },
  successMatchesText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#03a9f4',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#03a9f4',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
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

