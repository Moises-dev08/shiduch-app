import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NoMatchmakerModal from '../../components/profile/NoMatchmakerModal';
import ProfileActions from '../../components/profile/ProfileActions';
import SuggestionConfirmModal from '../../components/profile/SuggestionConfirmModal';
import { useSuggestions } from '../../hooks/useSuggestions';
import { Profile as DBProfile, profileService } from '../../lib/profileService';
import { supabase } from '../../lib/supabase';

interface Profile {
  id: string;
  name: string;
  age: number;
  picture: string;
  pictures: string[];
  hashkafa: string;
  location: string;
  bio: string;
  role: 'single' | 'matchmaker';
  gender: 'male' | 'female';
  phone?: string;
  email?: string;
  whatsapp?: string;
  school?: string;
  occupation?: string;
}


export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPictureViewer, setShowPictureViewer] = useState(false);
  const [selectedPictureIndex, setSelectedPictureIndex] = useState(0);
  
  // Real data states
  const [currentUserProfile, setCurrentUserProfile] = useState<DBProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [selectedAgeOption, setSelectedAgeOption] = useState<string | null>(null);
  const [selectedHashkafa, setSelectedHashkafa] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string[]>([]);
  
  // Use custom hook for suggestions logic
  const {
    showSetupConfirmModal,
    setShowSetupConfirmModal,
    showNoMatchmakerModal,
    setShowNoMatchmakerModal,
    isSubmittingSuggestion,
    isSubmittingInfoRequest,
    handleSetupPress,
    handleConfirmSetup,
    handleAskForInfo,
  } = useSuggestions(currentUserProfile, selectedProfile);

  const handleCloseFilterModal = () => {
    setShowFilterModal(false);
  };

  // Load profiles on mount
  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user profile
      const currentProfileResult = await profileService.getProfile();
      console.log('Current user profile:', currentProfileResult);
      
      if (currentProfileResult.success && currentProfileResult.profile) {
        setCurrentUserProfile(currentProfileResult.profile);
        console.log('Current user role:', currentProfileResult.profile.role);
        console.log('Current user gender:', currentProfileResult.profile.gender);
      }

      // Get all approved profiles from database
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved'); // Only show approved profiles

      console.log('All approved profiles from DB:', data);

      if (error) {
        console.error('Error loading profiles:', error);
        Alert.alert('Error', 'Failed to load profiles');
        return;
      }

      if (data) {
        console.log('Number of approved profiles:', data.length);
        
        // Convert database profiles to display format
        const converted = data.map((dbProfile: DBProfile) => convertToDisplayProfile(dbProfile));
        console.log('Converted profiles:', converted);
        
        // Filter based on current user's role and gender
        const filtered = filterProfilesByUserType(converted, currentProfileResult.profile);
        console.log('Filtered profiles after gender/role filter:', filtered);
        console.log('Number of filtered profiles:', filtered.length);
        
        setAllProfiles(filtered);
        setFilteredProfiles(filtered);
      }
    } catch (error) {
      console.error('Error in loadProfiles:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfiles();
    setRefreshing(false);
  }, [loadProfiles]);

  // Convert database profile to display profile
  const convertToDisplayProfile = (dbProfile: DBProfile): Profile => {
    console.log(`Converting profile ${dbProfile.first_name}:`, {
      hasPictures: !!dbProfile.pictures,
      picturesLength: dbProfile.pictures?.length || 0,
      pictures: dbProfile.pictures
    });

    const firstPicture = dbProfile.pictures && dbProfile.pictures.length > 0 
      ? profileService.getImageUrl(dbProfile.pictures[0])
      : 'https://via.placeholder.com/150';
    
    console.log('First picture URL:', firstPicture);
    
    const allPictures = dbProfile.pictures && dbProfile.pictures.length > 0
      ? dbProfile.pictures.map(pic => profileService.getImageUrl(pic))
      : ['https://via.placeholder.com/400'];

    return {
      id: dbProfile.id,
      name: `${dbProfile.first_name} ${dbProfile.last_name}`,
      age: dbProfile.age,
      picture: firstPicture,
      pictures: allPictures,
      hashkafa: dbProfile.hashkafa,
      location: dbProfile.address || `${dbProfile.city}, ${dbProfile.state}`,
      bio: dbProfile.bio,
      role: dbProfile.role as 'single' | 'matchmaker',
      gender: dbProfile.gender as 'male' | 'female',
      phone: dbProfile.phone,
      email: dbProfile.email,
      whatsapp: dbProfile.whatsapp,
      school: dbProfile.school,
      occupation: dbProfile.occupation,
    };
  };

  // Filter profiles based on current user's role and gender
  const filterProfilesByUserType = (profiles: Profile[], currentUser: DBProfile | undefined): Profile[] => {
    console.log('=== FILTER FUNCTION ===');
    console.log('Input profiles:', profiles.length);
    console.log('Current user:', currentUser);
    
    if (!currentUser) {
      console.log('No current user, returning all profiles');
      return profiles;
    }

    // Always exclude current user's own profile
    let filtered = profiles.filter(profile => profile.id !== currentUser.id);
    console.log('After removing own profile:', filtered.length);

    // If user is a matchmaker, show all profiles (except their own)
    if (currentUser.role === 'matchmaker') {
      console.log('User is matchmaker, showing all profiles');
      return filtered;
    }

    // If user is single, only show opposite gender
    if (currentUser.role === 'single') {
      console.log('User is single with gender:', currentUser.gender);
      console.log('Before gender filter:', filtered.map(p => ({ id: p.id, name: p.name, gender: p.gender })));
      filtered = filtered.filter(profile => {
        const keep = profile.gender !== currentUser.gender;
        console.log(`Profile ${profile.name} (${profile.gender}) - keep: ${keep}`);
        return keep;
      });
      console.log('After gender filter:', filtered.length);
    }

    return filtered;
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = allProfiles.filter(profile =>
      profile.name.toLowerCase().includes(query.toLowerCase()) ||
      profile.hashkafa.toLowerCase().includes(query.toLowerCase()) ||
      profile.location.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredProfiles(filtered);
  };

  const handleProfilePress = (profile: Profile) => {
    // Reset states before opening new profile
    setShowPictureViewer(false);
    setSelectedPictureIndex(0);
    setSelectedProfile(profile);
    setShowProfileModal(true);
  };

  const handleCloseProfileModal = () => {
    // Reset all states when closing the modal
    setShowProfileModal(false);
    setTimeout(() => {
      setSelectedProfile(null);
      setShowPictureViewer(false);
      setSelectedPictureIndex(0);
    }, 300); // Wait for animation to complete
  };

  const handlePicturePress = (index: number) => {
    setSelectedPictureIndex(index);
    setShowPictureViewer(true);
  };

  const handleClosePictureViewer = () => {
    setShowPictureViewer(false);
  };

  const toggleAgeOption = (option: string) => {
    setSelectedAgeOption(selectedAgeOption === option ? null : option);
  };

  const toggleHashkafa = (hashkafa: string) => {
    setSelectedHashkafa(prev => 
      prev.includes(hashkafa) 
        ? prev.filter(h => h !== hashkafa)
        : [...prev, hashkafa]
    );
  };

  const toggleLocation = (location: string) => {
    setSelectedLocation(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find Your Match</Text>
        <Text style={styles.subtitle}>Discover meaningful connections</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, hashkafa, or location..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options" size={20} color="#e91e63" />
        </TouchableOpacity>
      </View>


      {/* Profiles Grid */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#e91e63']}
            tintColor="#e91e63"
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e91e63" />
            <Text style={styles.loadingText}>Loading profiles...</Text>
          </View>
        ) : filteredProfiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No profiles found</Text>
            <Text style={styles.emptySubtext}>
              {currentUserProfile?.role === 'single' 
                ? `We're looking for ${currentUserProfile?.gender === 'male' ? 'female' : 'male'} profiles for you`
                : 'Check back later for new profiles'}
            </Text>
          </View>
        ) : (
          <View style={styles.profilesGrid}>
            {filteredProfiles.map((profile) => (
              <TouchableOpacity
                key={profile.id}
                style={styles.profileCard}
                onPress={() => handleProfilePress(profile)}
              >
                <View style={styles.profileImageContainer}>
                  {profile.picture && profile.picture !== 'https://via.placeholder.com/150' ? (
                    <Image 
                      source={{ uri: profile.picture }} 
                      style={styles.profileImage}
                      defaultSource={require('../../assets/images/icon.png')}
                      onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                    />
                  ) : (
                    <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                      <Ionicons name="person" size={60} color="#ccc" />
                    </View>
                  )}
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{profile.name}</Text>
                  <Text style={styles.profileLocation}>{profile.location}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Profile Modal */}
      <Modal 
        visible={showProfileModal} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={handleCloseProfileModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.placeholder} />
            <Text style={styles.modalTitle}>Profile</Text>
            <TouchableOpacity onPress={handleCloseProfileModal}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {selectedProfile && (
            <ScrollView style={styles.profileContent}>
              <View style={styles.profileHeader}>
                <Image source={{ uri: selectedProfile.picture }} style={styles.largeProfileImage} />
                <View style={styles.profileDetails}>
                  <Text style={styles.largeProfileName}>{selectedProfile.name}</Text>
                  <Text style={styles.largeProfileAge}>{selectedProfile.age} years old</Text>
                  <Text style={styles.largeProfileLocation}>{selectedProfile.location}</Text>
                </View>
              </View>

              {selectedProfile.pictures && selectedProfile.pictures.length > 0 && (
                <View style={styles.profileSection}>
                  <Text style={styles.sectionTitle}>Pictures</Text>
                  <View style={styles.picturesContainer}>
                    {selectedProfile.pictures.map((picture, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.pictureThumbnail}
                        onPress={() => handlePicturePress(index)}
                        activeOpacity={0.7}
                      >
                        <Image 
                          source={{ uri: picture }} 
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.profileSection}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.bioText}>{selectedProfile.bio}</Text>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Hashkafa:</Text>
                  <Text style={styles.detailValue}>{selectedProfile.hashkafa}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Role:</Text>
                  <Text style={styles.detailValue}>{selectedProfile.role}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gender:</Text>
                  <Text style={styles.detailValue}>{selectedProfile.gender}</Text>
                </View>
                {selectedProfile.school && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>School:</Text>
                    <Text style={styles.detailValue}>{selectedProfile.school}</Text>
                  </View>
                )}
                {selectedProfile.occupation && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Occupation:</Text>
                    <Text style={styles.detailValue}>{selectedProfile.occupation}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
          
          {selectedProfile && (
            <ProfileActions
              onSetupPress={handleSetupPress}
              onAskForInfoPress={handleAskForInfo}
              isSubmittingInfoRequest={isSubmittingInfoRequest}
              showSetupButton={true}
              showAskForInfoButton={true}
            />
          )}
        </SafeAreaView>
      </Modal>
      
      {/* Suggestion Confirmation Modal */}
      <SuggestionConfirmModal
        visible={showSetupConfirmModal}
        profileName={selectedProfile?.name || ''}
        isLoading={isSubmittingSuggestion}
        onConfirm={handleConfirmSetup}
        onCancel={() => setShowSetupConfirmModal(false)}
      />
      
      {/* No Matchmaker Modal */}
      <NoMatchmakerModal
        visible={showNoMatchmakerModal}
        onClose={() => setShowNoMatchmakerModal(false)}
      />

      {/* Filter Modal */}
      <Modal 
        visible={showFilterModal} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={handleCloseFilterModal}
      >
        <SafeAreaView style={styles.filterModalContainer}>
          <View style={styles.filterModalHeader}>
            <View style={styles.placeholder} />
            <Text style={styles.filterModalTitle}>Filters</Text>
            <TouchableOpacity onPress={handleCloseFilterModal}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Age Range</Text>
              
              {/* Age Options */}
              <View style={styles.ageOptionsContainer}>
                <TouchableOpacity 
                  style={[styles.ageOptionChip, selectedAgeOption === '18-25' && styles.ageOptionChipSelected]}
                  onPress={() => toggleAgeOption('18-25')}
                >
                  <Text style={[styles.ageOptionText, selectedAgeOption === '18-25' && styles.ageOptionTextSelected]}>18-25</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.ageOptionChip, selectedAgeOption === '26-30' && styles.ageOptionChipSelected]}
                  onPress={() => toggleAgeOption('26-30')}
                >
                  <Text style={[styles.ageOptionText, selectedAgeOption === '26-30' && styles.ageOptionTextSelected]}>26-30</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.ageOptionChip, selectedAgeOption === '31-35' && styles.ageOptionChipSelected]}
                  onPress={() => toggleAgeOption('31-35')}
                >
                  <Text style={[styles.ageOptionText, selectedAgeOption === '31-35' && styles.ageOptionTextSelected]}>31-35</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.ageOptionChip, selectedAgeOption === '36+' && styles.ageOptionChipSelected]}
                  onPress={() => toggleAgeOption('36+')}
                >
                  <Text style={[styles.ageOptionText, selectedAgeOption === '36+' && styles.ageOptionTextSelected]}>36+</Text>
                </TouchableOpacity>
              </View>

              {/* Age Range Input */}
              <View style={styles.ageRangeContainer}>
                <Text style={styles.ageRangeLabel}>Custom Range:</Text>
                <View style={styles.ageInputContainer}>
                  <View style={styles.ageInputGroup}>
                    <Text style={styles.ageInputLabel}>From:</Text>
                    <TextInput
                      style={styles.ageInput}
                      placeholder="18"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                  <View style={styles.ageInputGroup}>
                    <Text style={styles.ageInputLabel}>To:</Text>
                    <TextInput
                      style={styles.ageInput}
                      placeholder="35"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </View>

              {/* Single Age Input */}
              <View style={styles.singleAgeContainer}>
                <Text style={styles.singleAgeLabel}>Exact Age:</Text>
                <TextInput
                  style={styles.singleAgeInput}
                  placeholder="25"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Hashkafa</Text>
              <View style={styles.filterRow}>
                <TouchableOpacity 
                  style={[styles.filterChip, selectedHashkafa.includes('Modern Orthodox') && styles.filterChipSelected]}
                  onPress={() => toggleHashkafa('Modern Orthodox')}
                >
                  <Text style={[styles.filterChipText, selectedHashkafa.includes('Modern Orthodox') && styles.filterChipTextSelected]}>Modern Orthodox</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, selectedHashkafa.includes('Yeshivish') && styles.filterChipSelected]}
                  onPress={() => toggleHashkafa('Yeshivish')}
                >
                  <Text style={[styles.filterChipText, selectedHashkafa.includes('Yeshivish') && styles.filterChipTextSelected]}>Yeshivish</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, selectedHashkafa.includes('Chabad') && styles.filterChipSelected]}
                  onPress={() => toggleHashkafa('Chabad')}
                >
                  <Text style={[styles.filterChipText, selectedHashkafa.includes('Chabad') && styles.filterChipTextSelected]}>Chabad</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, selectedHashkafa.includes('Litvish') && styles.filterChipSelected]}
                  onPress={() => toggleHashkafa('Litvish')}
                >
                  <Text style={[styles.filterChipText, selectedHashkafa.includes('Litvish') && styles.filterChipTextSelected]}>Litvish</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, selectedHashkafa.includes('Sephardic') && styles.filterChipSelected]}
                  onPress={() => toggleHashkafa('Sephardic')}
                >
                  <Text style={[styles.filterChipText, selectedHashkafa.includes('Sephardic') && styles.filterChipTextSelected]}>Sephardic</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterChip, selectedHashkafa.includes('Chassidish') && styles.filterChipSelected]}
                  onPress={() => toggleHashkafa('Chassidish')}
                >
                  <Text style={[styles.filterChipText, selectedHashkafa.includes('Chassidish') && styles.filterChipTextSelected]}>Chassidish</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Location</Text>
              
              {/* Location Input */}
              <View style={styles.locationInputContainer}>
                <Text style={styles.locationInputLabel}>Search Location:</Text>
                <TextInput
                  style={styles.locationInput}
                  placeholder="Enter city, state, or zip code..."
                  placeholderTextColor="#999"
                />
              </View>

              {/* Popular Locations */}
              <View style={styles.popularLocationsContainer}>
                <Text style={styles.popularLocationsLabel}>Popular Locations:</Text>
                <View style={styles.filterRow}>
                  <TouchableOpacity 
                    style={[styles.filterChip, selectedLocation.includes('Brooklyn, NY') && styles.filterChipSelected]}
                    onPress={() => toggleLocation('Brooklyn, NY')}
                  >
                    <Text style={[styles.filterChipText, selectedLocation.includes('Brooklyn, NY') && styles.filterChipTextSelected]}>Brooklyn, NY</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.filterChip, selectedLocation.includes('Queens, NY') && styles.filterChipSelected]}
                    onPress={() => toggleLocation('Queens, NY')}
                  >
                    <Text style={[styles.filterChipText, selectedLocation.includes('Queens, NY') && styles.filterChipTextSelected]}>Queens, NY</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.filterChip, selectedLocation.includes('Manhattan, NY') && styles.filterChipSelected]}
                    onPress={() => toggleLocation('Manhattan, NY')}
                  >
                    <Text style={[styles.filterChipText, selectedLocation.includes('Manhattan, NY') && styles.filterChipTextSelected]}>Manhattan, NY</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.filterChip, selectedLocation.includes('Lakewood, NJ') && styles.filterChipSelected]}
                    onPress={() => toggleLocation('Lakewood, NJ')}
                  >
                    <Text style={[styles.filterChipText, selectedLocation.includes('Lakewood, NJ') && styles.filterChipTextSelected]}>Lakewood, NJ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.filterChip, selectedLocation.includes('Monsey, NY') && styles.filterChipSelected]}
                    onPress={() => toggleLocation('Monsey, NY')}
                  >
                    <Text style={[styles.filterChipText, selectedLocation.includes('Monsey, NY') && styles.filterChipTextSelected]}>Monsey, NY</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.filterChip, selectedLocation.includes('Teaneck, NJ') && styles.filterChipSelected]}
                    onPress={() => toggleLocation('Teaneck, NJ')}
                  >
                    <Text style={[styles.filterChipText, selectedLocation.includes('Teaneck, NJ') && styles.filterChipTextSelected]}>Teaneck, NJ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity 
              style={styles.clearFiltersButton}
              onPress={handleCloseFilterModal}
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.applyFiltersButton}
              onPress={handleCloseFilterModal}
            >
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Picture Viewer Modal */}
      <Modal 
        visible={showPictureViewer} 
        transparent 
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleClosePictureViewer}
      >
        <View style={styles.pictureViewerOverlay}>
          <TouchableOpacity 
            style={styles.closePictureViewer}
            onPress={handleClosePictureViewer}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {selectedProfile && selectedProfile.pictures && selectedProfile.pictures[selectedPictureIndex] && (
            <Image 
              source={{ uri: selectedProfile.pictures[selectedPictureIndex] }} 
              style={styles.fullScreenPicture}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  filterButton: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Filter Modal Styles
  filterModalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  filterChipSelected: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  filterActions: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#e91e63',
    alignItems: 'center',
  },
  applyFiltersText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
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
  profileCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  profileImagePlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    padding: 12,
  },
  profileName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileLocation: {
    fontSize: 12,
    color: '#666',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 24,
  },
  profileContent: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  largeProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  largeProfileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  largeProfileAge: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  largeProfileLocation: {
    fontSize: 14,
    color: '#e91e63',
    fontWeight: '600',
  },
  profileSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  // Picture Styles
  picturesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  pictureThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  // Picture Viewer Styles
  pictureViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closePictureViewer: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  fullScreenPicture: {
    width: '100%',
    height: '80%',
  },
  // Age Input Styles
  ageInputContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  ageInputGroup: {
    flex: 1,
  },
  ageInputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '600',
  },
  ageInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  // Age Options Styles
  ageOptionsContainer: {
    marginBottom: 16,
  },
  ageOptionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
  },
  ageOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  ageOptionChipSelected: {
    backgroundColor: '#e91e63',
    borderColor: '#e91e63',
  },
  ageOptionTextSelected: {
    color: '#fff',
  },
  // Age Range Styles
  ageRangeContainer: {
    marginBottom: 16,
  },
  ageRangeLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '600',
  },
  // Single Age Styles
  singleAgeContainer: {
    marginBottom: 16,
  },
  singleAgeLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '600',
  },
  singleAgeInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    width: '100%',
  },
  // Location Input Styles
  locationInputContainer: {
    marginBottom: 16,
  },
  locationInputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '600',
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  popularLocationsContainer: {
    marginBottom: 16,
  },
  popularLocationsLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '600',
  },
  // Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
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
    padding: 40,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});