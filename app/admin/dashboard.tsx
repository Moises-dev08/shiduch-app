import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { adminService } from '../../lib/adminService';
import { Profile, profileService } from '../../lib/profileService';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingApprove, setProcessingApprove] = useState(false);
  const [processingReject, setProcessingReject] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    const result = await adminService.getPendingProfiles();
    if (result.success && result.profiles) {
      setProfiles(result.profiles);
    } else {
      Alert.alert('Error', result.error || 'Failed to load profiles');
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfiles();
    setRefreshing(false);
  };

  const handleViewProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setShowDetailModal(true);
  };

  const handleApprove = async (profileId: string) => {
    Alert.alert(
      'Approve Profile',
      'Are you sure you want to approve this profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessingApprove(true);
            const result = await adminService.approveProfile(profileId);
            setProcessingApprove(false);
            
            if (result.success) {
              Alert.alert('Success', 'Profile approved successfully');
              setShowDetailModal(false);
              await loadProfiles();
            } else {
              Alert.alert('Error', result.error || 'Failed to approve profile');
            }
          },
        },
      ]
    );
  };

  const handleReject = (profile: Profile) => {
    setSelectedProfile(profile);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedProfile) return;

    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    setProcessingReject(true);
    const result = await adminService.rejectProfile(selectedProfile.id, rejectionReason);
    setProcessingReject(false);

    if (result.success) {
      Alert.alert('Success', 'Profile rejected successfully');
      setShowRejectModal(false);
      setShowDetailModal(false);
      await loadProfiles();
    } else {
      Alert.alert('Error', result.error || 'Failed to reject profile');
    }
  };

  const getImageUrl = (path: string) => {
    return profileService.getImageUrl(path);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e91e63" />
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
          <Text style={styles.subtitle}>{profiles.length} Pending Profiles</Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert(
              'Logout',
              'Are you sure you want to logout?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Logout',
                  onPress: async () => {
                    await supabase.auth.signOut();
                    router.replace('/auth/login');
                  },
                },
              ]
            );
          }}
        >
          <Ionicons name="log-out" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
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
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {profile.first_name} {profile.last_name}
                  </Text>
                  <Text style={styles.profileDetail}>
                    {profile.age} years old • {profile.gender}
                  </Text>
                  <Text style={styles.profileDetail}>
                    {profile.role === 'single' ? 'Single' : 'Matchmaker'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#666" />
              </View>
              <Text style={styles.profileDate}>
                Submitted: {new Date(profile.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Profile Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedProfile && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Profile Review</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Pictures */}
              {selectedProfile.pictures && selectedProfile.pictures.length > 0 && (
                <View style={styles.picturesSection}>
                  <Text style={styles.sectionTitle}>Photos ({selectedProfile.pictures.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedProfile.pictures.map((picture, index) => (
                      <Image
                        key={index}
                        source={{ uri: getImageUrl(picture) }}
                        style={styles.profilePicture}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Personal Info */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <DetailRow label="Name" value={`${selectedProfile.first_name} ${selectedProfile.last_name}`} />
                <DetailRow label="Age" value={selectedProfile.age.toString()} />
                <DetailRow label="Gender" value={selectedProfile.gender} />
                <DetailRow label="Role" value={selectedProfile.role} />
                <DetailRow label="Hashkafa" value={selectedProfile.hashkafa} />
              </View>

              {/* Bio */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <Text style={styles.bioText}>{selectedProfile.bio}</Text>
              </View>

              {/* Location */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Location</Text>
                {selectedProfile.street && <DetailRow label="Street" value={selectedProfile.street} />}
                {selectedProfile.city && <DetailRow label="City" value={selectedProfile.city} />}
                {selectedProfile.state && <DetailRow label="State" value={selectedProfile.state} />}
                {selectedProfile.zip_code && <DetailRow label="ZIP Code" value={selectedProfile.zip_code} />}
                {selectedProfile.country && <DetailRow label="Country" value={selectedProfile.country} />}
              </View>

              {/* Contact Info */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                <DetailRow label="Phone" value={selectedProfile.phone} />
                <DetailRow label="Email" value={selectedProfile.email} />
                <DetailRow label="WhatsApp" value={selectedProfile.whatsapp} />
              </View>

              {/* Optional Info */}
              {(selectedProfile.school || selectedProfile.occupation) && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Additional Information</Text>
                  {selectedProfile.school && <DetailRow label="School" value={selectedProfile.school} />}
                  {selectedProfile.occupation && <DetailRow label="Occupation" value={selectedProfile.occupation} />}
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleReject(selectedProfile)}
                disabled={processingApprove || processingReject}
              >
                {processingReject ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleApprove(selectedProfile.id)}
                disabled={processingApprove || processingReject}
              >
                {processingApprove ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        animationType="fade"
        transparent
        statusBarTranslucent
      >
        <View style={styles.rejectModalOverlay}>
          <View style={styles.rejectModal}>
            <Text style={styles.rejectModalTitle}>Reject Profile</Text>
            <Text style={styles.rejectModalSubtitle}>
              Please provide a reason for rejection:
            </Text>
            <TextInput
              style={styles.rejectInput}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Enter reason..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.rejectModalButtons}>
              <TouchableOpacity
                style={[styles.rejectModalButton, styles.rejectModalCancel]}
                onPress={() => setShowRejectModal(false)}
                disabled={processingReject}
              >
                <Text style={styles.rejectModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectModalButton, styles.rejectModalConfirm]}
                onPress={confirmReject}
                disabled={processingReject}
              >
                {processingReject ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.rejectModalConfirmText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flex: 1,
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
  logoutButton: {
    padding: 8,
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
  profileDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
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
  modalContent: {
    flex: 1,
    padding: 20,
  },
  picturesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  profilePicture: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginRight: 12,
  },
  detailSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 120,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  bioText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#4caf50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rejectModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  rejectModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  rejectModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 16,
  },
  rejectModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectModalCancel: {
    backgroundColor: '#f0f0f0',
  },
  rejectModalConfirm: {
    backgroundColor: '#f44336',
  },
  rejectModalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectModalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

