import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { AppTextInput } from '../../components/AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminService } from '../../lib/adminService';
import { Profile, profileService } from '../../lib/profileService';
import { calculateAge } from '../../lib/utils';
import { webPageLayout } from '../../styles/webPageLayout';

export default function AdminUsers() {
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'frozen' | 'suspended'>('all');

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const result = await adminService.getAllUsers();
    if (result.success && result.profiles) {
      setAllProfiles(result.profiles);
    }
    setLoading(false);
  };

  const visibleProfiles = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return allProfiles.filter((profile) => {
      if (filter === 'frozen' && profile.is_active !== false) return false;
      if (filter === 'suspended' && profile.account_status !== 'suspended') return false;
      if (!needle) return true;
      const haystack = `${profile.first_name ?? ''} ${profile.last_name ?? ''} ${profile.email ?? ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [allProfiles, filter, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleSearch = (text: string): void => {
    setSearchQuery(text);
  };

  const handleViewProfile = (profile: Profile): void => {
    const profileId = encodeURIComponent(profile.id);
    const userId = encodeURIComponent(profile.user_id ?? '');
    router.push(`/admin/user-details?profileId=${profileId}&userId=${userId}`);
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
        <TouchableOpacity
          onPress={() => router.replace('/admin/dashboard')}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>All Users</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
          <AppTextInput
            style={styles.searchInput}
            placeholder="Search name or email..."
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            All Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'frozen' && styles.filterButtonActive]}
          onPress={() => setFilter('frozen')}
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
          onPress={() => setFilter('suspended')}
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
          <ActivityIndicator size="large" color="#1293DA" />
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={styles.scrollView}
          contentContainerStyle={webPageLayout.centeredListScrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {visibleProfiles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users found.</Text>
            </View>
          ) : (
            visibleProfiles.map((profile, index) => (
              <TouchableOpacity
                key={profile.id}
                style={styles.profileCard}
                onPress={() => handleViewProfile(profile)}
              >
                <View style={styles.profileRow}>
                  <Text style={styles.profileNumber}>{index + 1}</Text>
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
    backgroundColor: '#1293DA',
    borderColor: '#1293DA'
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
  profileNumber: {
    width: 32,
    fontSize: 14,
    fontWeight: '700',
    color: '#1293DA',
    marginRight: 8,
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
