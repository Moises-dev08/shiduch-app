import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmationModal from '../../components/ConfirmationModal';
import InfoModal from '../../components/InfoModal';
import { adminService } from '../../lib/adminService';
import { getAdminProfileImageUrl } from '../../lib/profilePictureVisibility';
import { Profile } from '../../lib/profileService';
import { reportService } from '../../lib/reportService';
import { supabase } from '../../lib/supabase';
import { calculateAge } from '../../lib/utils';
import { webPageLayout } from '../../styles/webPageLayout';

export default function AdminDashboard() {
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'new' | 'updates'>('all');
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Modal states
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [infoModal, setInfoModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    iconName?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    loadProfiles();
    loadReportsCount();
    adminService.isSuperAdmin().then(setIsSuperAdmin);
  }, []);

  // Reload profiles when screen comes into focus (e.g., after approving/rejecting)
  useFocusEffect(
    useCallback(() => {
      loadProfiles();
      loadReportsCount();
    }, [])
  );

  const loadProfiles = async () => {
    setLoading(true);
    const result = await adminService.getPendingProfiles();
    if (result.success && result.profiles) {
      setAllProfiles(result.profiles);
      applyFilter(result.profiles, filter);
    } else {
      setInfoModal({
        visible: true,
        title: 'Error',
        message: result.error || 'Failed to load profiles',
        iconName: 'alert-circle',
        iconColor: '#F44336',
      });
    }
    setLoading(false);
  };

  const loadReportsCount = async () => {
    const result = await reportService.getPendingReportsCount();
    if (result.success && result.count !== undefined) {
      setPendingReportsCount(result.count);
    }
  };

  const applyFilter = (profilesToFilter: Profile[], currentFilter: 'all' | 'new' | 'updates') => {
    let filtered: Profile[] = [];
    
    switch (currentFilter) {
      case 'new':
        filtered = profilesToFilter.filter(p => !p.is_update);
        break;
      case 'updates':
        filtered = profilesToFilter.filter(p => p.is_update === true);
        break;
      case 'all':
      default:
        filtered = profilesToFilter;
        break;
    }
    
    setProfiles(filtered);
  };

  const handleFilterChange = (newFilter: 'all' | 'new' | 'updates') => {
    setFilter(newFilter);
    applyFilter(allProfiles, newFilter);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfiles(), loadReportsCount()]);
    setRefreshing(false);
  };

  const handleViewProfile = (profile: Profile) => {
    router.push(`/admin/profile-review/${profile.id}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1293DA" />
          <Text style={styles.loadingText}>Loading pending profiles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>
            {allProfiles.length} Pending {allProfiles.length === 1 ? 'Profile' : 'Profiles'}
            {allProfiles.length > 0 && (
              <Text style={styles.subtitleCounts}>
                {' '}({allProfiles.filter(p => !p.is_update).length} new, {allProfiles.filter(p => p.is_update).length} updates)
              </Text>
            )}
          </Text>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            onPress={() => router.push('/admin/reports')} 
            style={styles.actionButton}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="flag" size={20} color="#666" />
              <Text style={styles.actionButtonText}>Reports</Text>
              {pendingReportsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingReportsCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/admin/users')} 
            style={styles.actionButton}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="people" size={20} color="#666" />
              <Text style={styles.actionButtonText}>Users</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/admin/sponsors')} 
            style={styles.actionButton}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="megaphone" size={20} color="#666" />
              <Text style={styles.actionButtonText}>Ads</Text>
            </View>
          </TouchableOpacity>

          {isSuperAdmin && (
            <TouchableOpacity
              onPress={() => router.push('/admin/admins')}
              style={styles.actionButton}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="shield-checkmark" size={20} color="#1293DA" />
                <Text style={[styles.actionButtonText, { color: '#1293DA' }]}>Admins</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            onPress={onRefresh} 
            style={styles.actionButton}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="refresh" size={20} color="#666" />
              <Text style={styles.actionButtonText}>Refresh</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowLogoutConfirm(true)}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="log-out" size={20} color="#666" />
              <Text style={styles.actionButtonText}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'new' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('new')}
        >
          <Ionicons 
            name="add-circle" 
            size={16} 
            color={filter === 'new' ? '#fff' : '#4caf50'} 
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.filterButtonText, filter === 'new' && styles.filterButtonTextActive]}>
            New
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'updates' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('updates')}
        >
          <Ionicons 
            name="refresh" 
            size={16} 
            color={filter === 'updates' ? '#fff' : '#ff9800'} 
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.filterButtonText, filter === 'updates' && styles.filterButtonTextActive]}>
            Updates
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={webPageLayout.centeredListScrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {profiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#4caf50" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>
              No pending profiles to review at the moment.
            </Text>
          </View>
        ) : (
          profiles.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              style={styles.profileCard}
              onPress={() => handleViewProfile(profile)}
            >
              <View style={styles.profileHeader}>
                {(() => {
                  const avatarUrl = getAdminProfileImageUrl(profile);
                  return avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Ionicons name="person" size={28} color="#ccc" />
                    </View>
                  );
                })()}
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {profile.first_name} {profile.last_name}
                  </Text>
                  <Text style={styles.profileDetail}>
                    {profile.dob 
                      ? `Age: ${calculateAge(profile.dob)} (DOB: ${new Date(profile.dob).toLocaleDateString()})` 
                      : 'Age not specified'
                    } • {profile.gender}
                  </Text>
                  <Text style={styles.profileDetail}>
                    {profile.role === 'single' ? 'Single' : 'Matchmaker'}
                    {profile.location_city && profile.location_country && ` • ${profile.location_city}, ${profile.location_country}`}
                  </Text>
                  {profile.marital_status && (
                    <Text style={styles.profileDetail}>
                      {profile.marital_status}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={24} color="#666" />
              </View>
              <View style={styles.profileMeta}>
                {profile.is_update ? (
                  <View style={styles.updateBadge}>
                    <Ionicons name="refresh" size={12} color="#ff9800" />
                    <Text style={styles.updateBadgeText}>Profile Update</Text>
                  </View>
                ) : (
                  <View style={styles.newBadge}>
                    <Ionicons name="add-circle" size={12} color="#4caf50" />
                    <Text style={styles.newBadgeText}>New Profile</Text>
                  </View>
                )}
                <Text style={styles.profileDate}>
                  {profile.is_update 
                    ? `Updated: ${new Date(profile.updated_at).toLocaleDateString()}`
                    : `Submitted: ${new Date(profile.created_at).toLocaleDateString()}`
                  }
                </Text>
              </View>
              {profile.pending_changes?.summary && (
                <View style={styles.changesBanner}>
                  <Ionicons name="information-circle" size={16} color="#2196f3" />
                  <Text style={styles.changesText}>
                    <Text style={styles.changesLabel}>Changes: </Text>
                    {profile.pending_changes.summary}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await supabase.auth.signOut();
          router.replace('/auth/login');
        }}
        onCancel={() => setShowLogoutConfirm(false)}
        iconName="log-out"
        iconColor="#FF9800"
      />

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        iconName={infoModal.iconName}
        iconColor={infoModal.iconColor}
        onClose={() => setInfoModal({ visible: false, title: '', message: '' })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  subtitleCounts: {
    fontSize: 12,
    color: '#999',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#1293DA',
    borderColor: '#1293DA',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: 72,
    minWidth: 72,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonContent: {
    alignItems: 'center',
    position: 'relative',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  profileDate: {
    fontSize: 12,
    color: '#999',
  },
  updateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  updateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ff9800',
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4caf50',
  },
  changesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  changesText: {
    flex: 1,
    fontSize: 13,
    color: '#1976d2',
    lineHeight: 18,
  },
  changesLabel: {
    fontWeight: '600',
  },
});

