import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

// Mock data for profiles
const mockProfiles: Profile[] = [
  {
    id: '1',
    name: 'Sarah Cohen',
    age: 25,
    picture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    pictures: [
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face'
    ],
    hashkafa: 'Modern Orthodox',
    location: 'Brooklyn, NY',
    bio: 'Looking for someone to share life\'s adventures with. Love hiking, cooking, and learning Torah.',
    role: 'single',
    gender: 'female',
    school: 'Yeshiva University',
    occupation: 'Teacher'
  },
  {
    id: '2',
    name: 'David Levy',
    age: 28,
    picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    pictures: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face'
    ],
    hashkafa: 'Yeshivish',
    location: 'Lakewood, NJ',
    bio: 'Learning in kollel, looking for a partner to build a Torah home together.',
    role: 'single',
    gender: 'male',
    occupation: 'Kollel Student'
  },
  {
    id: '3',
    name: 'Rachel Green',
    age: 24,
    picture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    pictures: [
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face'
    ],
    hashkafa: 'Chabad',
    location: 'Crown Heights, NY',
    bio: 'Passionate about helping others and spreading light. Love art and music.',
    role: 'single',
    gender: 'female',
    school: 'Stern College',
    occupation: 'Social Worker'
  },
  {
    id: '4',
    name: 'Moshe Schwartz',
    age: 30,
    picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    pictures: [
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face'
    ],
    hashkafa: 'Litvish',
    location: 'Monsey, NY',
    bio: 'Business professional seeking a meaningful relationship grounded in Torah values.',
    role: 'single',
    gender: 'male',
    occupation: 'Finance'
  },
  {
    id: '5',
    name: 'Leah Rosenberg',
    age: 26,
    picture: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    pictures: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face'
    ],
    hashkafa: 'Sephardic',
    location: 'Queens, NY',
    bio: 'Family-oriented and traditional. Love cooking and hosting guests.',
    role: 'single',
    gender: 'female',
    occupation: 'Nurse'
  },
  {
    id: '6',
    name: 'Yosef Friedman',
    age: 32,
    picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    pictures: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'
    ],
    hashkafa: 'Chassidish',
    location: 'Williamsburg, NY',
    bio: 'Looking for a partner to share a life of Torah and chessed.',
    role: 'single',
    gender: 'male',
    occupation: 'Business Owner'
  },
  {
    id: '7',
    name: 'Miriam Katz',
    age: 23,
    picture: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
    pictures: [
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face'
    ],
    hashkafa: 'Modern Orthodox',
    location: 'Teaneck, NJ',
    bio: 'Recent graduate looking for someone to grow with in Torah and life.',
    role: 'single',
    gender: 'female',
    school: 'Stern College',
    occupation: 'Marketing'
  },
  {
    id: '8',
    name: 'Avi Goldberg',
    age: 29,
    picture: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
    pictures: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'
    ],
    hashkafa: 'Yeshivish',
    location: 'Flatbush, NY',
    bio: 'Learning and working. Seeking a partner for a Torah-centered life.',
    role: 'single',
    gender: 'male',
    occupation: 'Software Engineer'
  },
  {
    id: '9',
    name: 'Chana Weiss',
    age: 27,
    picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    pictures: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'
    ],
    hashkafa: 'Chabad',
    location: 'Borough Park, NY',
    bio: 'Passionate about education and helping children. Love nature and books.',
    role: 'single',
    gender: 'female',
    school: 'Touro College',
    occupation: 'Special Education Teacher'
  }
];

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPictureViewer, setShowPictureViewer] = useState(false);
  const [selectedPictureIndex, setSelectedPictureIndex] = useState(0);
  const [filteredProfiles, setFilteredProfiles] = useState(mockProfiles);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = mockProfiles.filter(profile =>
      profile.name.toLowerCase().includes(query.toLowerCase()) ||
      profile.hashkafa.toLowerCase().includes(query.toLowerCase()) ||
      profile.location.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredProfiles(filtered);
  };

  const handleProfilePress = (profile: Profile) => {
    setSelectedProfile(profile);
    setShowProfileModal(true);
  };

  const handleAskForInfo = () => {
    Alert.alert(
      'Request Sent',
      'Your request for more information has been sent to this profile.',
      [{ text: 'OK' }]
    );
  };

  const handlePicturePress = (index: number) => {
    setSelectedPictureIndex(index);
    setShowPictureViewer(true);
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.profilesGrid}>
          {filteredProfiles.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              style={styles.profileCard}
              onPress={() => handleProfilePress(profile)}
            >
              <View style={styles.profileImageContainer}>
                <Image source={{ uri: profile.picture }} style={styles.profileImage} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.profileLocation}>{profile.location}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Profile Modal */}
      <Modal visible={showProfileModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.placeholder} />
            <Text style={styles.modalTitle}>Profile</Text>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
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

              <View style={styles.profileSection}>
                <Text style={styles.sectionTitle}>Pictures</Text>
                <View style={styles.picturesContainer}>
                  {selectedProfile.pictures.map((picture, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.pictureThumbnail}
                      onPress={() => handlePicturePress(index)}
                    >
                      <Image source={{ uri: picture }} style={styles.thumbnailImage} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

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

              <TouchableOpacity style={styles.askButton} onPress={handleAskForInfo}>
                <Ionicons name="information-circle" size={20} color="#fff" />
                <Text style={styles.askButtonText}>Ask for More Information</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.filterModalContainer}>
          <View style={styles.filterModalHeader}>
            <View style={styles.placeholder} />
            <Text style={styles.filterModalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Age Range</Text>
              
              {/* Age Options */}
              <View style={styles.ageOptionsContainer}>
                <TouchableOpacity style={styles.ageOptionChip}>
                  <Text style={styles.ageOptionText}>18-25</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ageOptionChip}>
                  <Text style={styles.ageOptionText}>26-30</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ageOptionChip}>
                  <Text style={styles.ageOptionText}>31-35</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ageOptionChip}>
                  <Text style={styles.ageOptionText}>36+</Text>
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
                <TouchableOpacity style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Modern Orthodox</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Yeshivish</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Chabad</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Litvish</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Sephardic</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Chassidish</Text>
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
                  <TouchableOpacity style={styles.filterChip}>
                    <Text style={styles.filterChipText}>Brooklyn, NY</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.filterChip}>
                    <Text style={styles.filterChipText}>Queens, NY</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.filterChip}>
                    <Text style={styles.filterChipText}>Manhattan, NY</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.filterChip}>
                    <Text style={styles.filterChipText}>Lakewood, NJ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.filterChip}>
                    <Text style={styles.filterChipText}>Monsey, NY</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.filterChip}>
                    <Text style={styles.filterChipText}>Teaneck, NJ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity 
              style={styles.clearFiltersButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.applyFiltersButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Picture Viewer Modal */}
      <Modal visible={showPictureViewer} transparent animationType="fade">
        <View style={styles.pictureViewerOverlay}>
          <TouchableOpacity 
            style={styles.closePictureViewer}
            onPress={() => setShowPictureViewer(false)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {selectedProfile && (
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
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e91e63',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  askButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
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
  },
  closePictureViewer: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
  },
  fullScreenPicture: {
    width: '90%',
    height: '70%',
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
});