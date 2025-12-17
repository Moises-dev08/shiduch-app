import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminService } from '../../lib/adminService';
import { Profile, profileService } from '../../lib/profileService';
import { calculateAge } from '../../lib/utils';

export default function AdminUsers() {
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'frozen' | 'suspended'>('all');

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async (query = searchQuery) => {
    setLoading(true);
    const result = await adminService.getAllUsers(query);
    if (result.success && result.profiles) {
      setAllProfiles(result.profiles);
      applyFilter(result.profiles, filter);
    }
    setLoading(false);
  };

  const applyFilter = (profilesToFilter: Profile[], currentFilter: 'all' | 'frozen' | 'suspended') => {
    let filtered: Profile[] = [];
    
    switch (currentFilter) {
      case 'frozen':
        filtered = profilesToFilter.filter(p => p.is_active === false);
        break;
      case 'suspended':
        filtered = profilesToFilter.filter(p => p.account_status === 'suspended');
        break;
      case 'all':
      default:
        filtered = profilesToFilter;
        break;
    }
    
    setProfiles(filtered);
  };

  const handleFilterChange = (newFilter: 'all' | 'frozen' | 'suspended') => {
    setFilter(newFilter);
    applyFilter(allProfiles, newFilter);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Debounce could be added here, currently just calling on submit or generic
    if (text.length === 0) loadUsers('');
  };

  const submitSearch = () => {
    loadUsers(searchQuery);
  };

  const handleViewProfile = (profile: Profile) => {
    router.push(`/admin/user-details?userId=${profile.user_id}`);
  };


  const getStatusColor = (status?: string, isActive?: boolean) => {
    if (status === 'suspended') return '#f44336'; // Red
    if (status === 'removed') return '#9e9e9e'; // Grey
    if (isActive === false) return '#2196f3'; // Blue (Frozen)
    return '#4caf50'; // Green (Active)
  };

  const getStatusText = (status?: string, isActive?: boolean) => {
    if (status === 'suspended') return 'Suspended';
    if (status === 'removed') return 'Removed';
    if (isActive === false) return 'Frozen';
    return 'Active';
  };

  const getImageUrl = (path: string) => {
    return profileService.getImageUrl(path);
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>All Users</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or email..."
            value={searchQuery}
            onChangeText={handleSearch}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); loadUsers(''); }}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            All Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'frozen' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('frozen')}
        >
          <Ionicons 
            name="eye-off" 
            size={16} 
            color={filter === 'frozen' ? '#fff' : '#2196f3'} 
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.filterButtonText, filter === 'frozen' && styles.filterButtonTextActive]}>
            Frozen
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'suspended' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('suspended')}
        >
          <Ionicons 
            name="lock-closed" 
            size={16} 
            color={filter === 'suspended' ? '#fff' : '#ff9800'} 
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.filterButtonText, filter === 'suspended' && styles.filterButtonTextActive]}>
            Suspended
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#03a9f4" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {profiles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users found.</Text>
            </View>
          ) : (
            profiles.map((profile) => (
              <TouchableOpacity
                key={profile.id}
                style={styles.profileCard}
                onPress={() => handleViewProfile(profile)}
              >
                <View style={styles.profileRow}>
                  {profile.pictures && profile.pictures.length > 0 ? (
                    <Image source={{ uri: getImageUrl(profile.pictures[0]) }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.placeholderAvatar]}>
                      <Ionicons name="person" size={24} color="#ccc" />
                    </View>
                  )}
                  
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{profile.first_name} {profile.last_name}</Text>
                    <Text style={styles.profileSubtext}>
                      {profile.role === 'single' ? 'Single' : 'Matchmaker'} • {calculateAge(profile.dob || '')} yrs
                    </Text>
                    {profile.email && <Text style={styles.profileEmail}>{profile.email}</Text>}
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(profile.account_status, profile.is_active) }]}>
                    <Text style={styles.statusText}>
                      {getStatusText(profile.account_status, profile.is_active)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backButton: { padding: 8 },
  title: { fontSize: 20, fontWeight: 'bold' },
  
  searchContainer: { padding: 16, backgroundColor: '#fff' },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center'
  },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 8 },
  
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    gap: 8
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  filterButtonActive: {
    backgroundColor: '#03a9f4',
    borderColor: '#03a9f4'
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666'
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 16 },

  profileCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  placeholderAvatar: { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '600', color: '#333' },
  profileSubtext: { fontSize: 13, color: '#666' },
  profileEmail: { fontSize: 12, color: '#999' },
  
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});
