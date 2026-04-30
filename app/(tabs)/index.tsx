import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import EngagementCelebration from '../../components/EngagementCelebration';
import ProfileCard from '../../components/home/ProfileCard';
import NotificationPanel from '../../components/NotificationPanel';
import { useEngagementCelebrations } from '../../hooks/useEngagementCelebrations';
import { useHomeProfiles } from '../../hooks/useHomeProfiles';
import { useUnreadNotificationsCount } from '../../hooks/useUnreadNotificationsCount';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types/homeTypes';

export default function HomeScreen() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    loadCurrentUser();
  }, []);

  const { showCelebration, celebrationData, closeCelebration } = useEngagementCelebrations(currentUserId);

  const { unreadCount: unreadNotifCount } = useUnreadNotificationsCount();
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);

  // Pick up pending filters when returning from the filters screen
  useFocusEffect(
    useCallback(() => {
      const checkPendingFilters = async () => {
        try {
          const pendingFilters = await AsyncStorage.getItem('pendingFilters');
          if (pendingFilters) {
            const newFilters = JSON.parse(pendingFilters);
            setFilterState(newFilters);
            await AsyncStorage.removeItem('pendingFilters');
          }
        } catch (error) {
          console.error('Error loading pending filters:', error);
        }
      };

      checkPendingFilters();
    }, [setFilterState])
  );
  // Profile data and filters
  const {
    currentUserProfile,
    filteredProfiles,
    visibleProfiles,
    hasMore,
    loadMore,
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

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 300;
    if (isNearBottom && hasMore) {
      loadMore();
    }
  };

  // Get active filters for display
  const getActiveFilters = () => {
    const activeFilters: Array<{ label: string; removeKey: string }> = [];

    if (filterState.genderFilter !== 'all') {
      const label = filterState.genderFilter === 'male' ? 'See first: Boys' : 'See first: Girls';
      activeFilters.push({ label, removeKey: 'genderFilter' });
    }

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
      const sortLabel = filterState.sortBy === 'newest' ? 'Newest First' : 
                        filterState.sortBy === 'oldest' ? 'Oldest First' : 
                        filterState.sortBy === 'youngest' ? 'Youngest First' :
                        filterState.sortBy === 'pictures_to_none' ? 'Pictures to No Pictures' :
                        filterState.sortBy === 'none_to_pictures' ? 'No Pictures to Pictures' :
                        '';
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

    // One-time photo filter
    if (filterState.hasOneTimePhoto) {
      activeFilters.push({ label: 'One Time Photo', removeKey: 'hasOneTimePhoto' });
    }

    if (filterState.hasPrivatePhoto) {
      activeFilters.push({ label: 'Private Photo', removeKey: 'hasPrivatePhoto' });
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

    if (filterState.selectedPostHighSchool) {
      filterState.selectedPostHighSchool.forEach(path => {
        activeFilters.push({ label: `Post-HS: ${path}`, removeKey: `postHighSchool_${path}` });
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

    if (removeKey === 'genderFilter') {
      newFilterState.genderFilter = 'all';
    } else if (removeKey === 'selectedAgeOption') {
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
    } else if (removeKey === 'hasOneTimePhoto') {
      newFilterState.hasOneTimePhoto = false;
    } else if (removeKey === 'hasPrivatePhoto') {
      newFilterState.hasPrivatePhoto = false;
    } else if (removeKey.startsWith('torahLearning_')) {
      const learning = removeKey.replace('torahLearning_', '');
      newFilterState.selectedTorahLearning = newFilterState.selectedTorahLearning.filter(l => l !== learning);
    } else if (removeKey.startsWith('praying_')) {
      const praying = removeKey.replace('praying_', '');
      newFilterState.selectedPraying = newFilterState.selectedPraying.filter(p => p !== praying);
    } else if (removeKey.startsWith('headCovering_')) {
      const covering = removeKey.replace('headCovering_', '');
      newFilterState.selectedHeadCovering = newFilterState.selectedHeadCovering.filter(h => h !== covering);
    } else if (removeKey.startsWith('postHighSchool_')) {
      const path = removeKey.replace('postHighSchool_', '');
      newFilterState.selectedPostHighSchool = newFilterState.selectedPostHighSchool.filter(p => p !== path);
    } else if (removeKey === 'wearsBlackHat') {
      newFilterState.wearsBlackHat = null;
    }

    setFilterState(newFilterState);
  };

  const activeFilters = getActiveFilters();


  return (
    <SafeAreaView style={styles.container}>
      {/* Engagement Celebration */}
      {showCelebration && celebrationData && (
        <EngagementCelebration
          visible={showCelebration}
          coupleName1={celebrationData.coupleName1}
          coupleName2={celebrationData.coupleName2}
          onClose={closeCelebration}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Discover</Text>
          <TouchableOpacity
            style={styles.successMatchesButton}
            onPress={() => router.push('/successful-matches')}
          >
            <Text style={styles.successMatchesEmoji}>🎉</Text>
            <Text style={styles.successMatchesText}>Success Stories</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setNotificationPanelVisible(true)}
          >
            <Ionicons
              name={unreadNotifCount > 0 ? 'notifications' : 'notifications-outline'}
              size={24}
              color="#333"
            />
            {unreadNotifCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </Text>
              </View>
            )}
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
              params: {
                filterState: JSON.stringify(filterState),
                userRole: currentUserProfile?.role ?? '',
                userGender: currentUserProfile?.gender ?? '',
              }
            })}
          >
            <Ionicons name="options" size={20} color="#1293DA" />
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
        scrollEventThrottle={200}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1293DA']}
            tintColor="#1293DA"
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1293DA" />
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
          <>
            <View style={styles.profilesGrid}>
              {visibleProfiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onPress={handleProfilePress}
                />
              ))}
            </View>
            {hasMore && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#1293DA" />
                <Text style={styles.loadMoreText}>Loading more…</Text>
              </View>
            )}
            {!hasMore && filteredProfiles.length > 0 && (
              <Text style={styles.endOfListText}>
                Showing all {filteredProfiles.length} profiles
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <NotificationPanel
        visible={notificationPanelVisible}
        onClose={() => setNotificationPanelVisible(false)}
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
    paddingHorizontal: 20,
    paddingTop: 12,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  successMatchesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#DAA520',
    borderRadius: 20,
    gap: 4,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  successMatchesEmoji: {
    fontSize: 14,
  },
  successMatchesText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationButton: {
    padding: 6,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#E53935',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
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
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1293DA',
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
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#1293DA',
  },
  endOfListText: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 13,
    paddingVertical: 20,
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

