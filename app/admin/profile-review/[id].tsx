import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
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
import SuccessModal from '../../../components/SuccessModal';
import { adminService } from '../../../lib/adminService';
import { Profile, profileService } from '../../../lib/profileService';
import { calculateAge } from '../../../lib/utils';

export default function ProfileReviewPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingApprove, setProcessingApprove] = useState(false);
  const [processingReject, setProcessingReject] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

  const loadProfile = useCallback(async () => {
    if (!id) {
      router.back();
      return;
    }

    setLoading(true);
    const result = await adminService.getPendingProfiles();
    if (result.success && result.profiles) {
      const foundProfile = result.profiles.find(p => p.id === id);
      if (foundProfile) {
        setProfile(foundProfile);
      } else {
        Alert.alert('Error', 'Profile not found', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } else {
      Alert.alert('Error', result.error || 'Failed to load profile', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleApprove = async (profileId: string) => {
    if (!profile) return;
    
    const isUpdate = profile.is_update;
    Alert.alert(
      'Approve Profile',
      isUpdate
        ? 'Are you sure you want to approve this profile update? The user will be able to use the app again.'
        : 'Are you sure you want to approve this profile? It will be visible to other users.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessingApprove(true);
            const result = await adminService.approveProfile(profileId);
            setProcessingApprove(false);
            
            if (result.success) {
              setSuccessMessage({
                title: 'Profile Approved!',
                message: isUpdate 
                  ? 'The profile update has been approved successfully. The user can now use the app again.'
                  : 'The profile has been approved successfully and is now visible to other users.',
              });
              setShowSuccessModal(true);
            } else {
              Alert.alert('Error', result.error || 'Failed to approve profile');
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    if (!profile) return;
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!profile) return;

    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    setProcessingReject(true);
    const result = await adminService.rejectProfile(profile.id, rejectionReason);
    setProcessingReject(false);

    if (result.success) {
      const isUpdate = profile.is_update;
      setSuccessMessage({
        title: 'Profile Rejected',
        message: isUpdate
          ? 'The profile update has been rejected. The user will be notified and must update their profile again.'
          : 'The profile has been rejected and the user will be notified.',
      });
      setShowSuccessModal(true);
      setShowRejectModal(false);
    } else {
      Alert.alert('Error', result.error || 'Failed to reject profile');
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.back();
  };

  const getImageUrl = (path: string) => {
    return profileService.getImageUrl(path);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#03a9f4" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Profile not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Profile Review</Text>
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
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Type Info */}
        {profile.is_update && profile.last_approved_at && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color="#2196f3" />
            <View style={styles.infoBannerContent}>
              <Text style={styles.infoBannerTitle}>Profile Update</Text>
              <Text style={styles.infoBannerText}>
                This profile was previously approved on {new Date(profile.last_approved_at).toLocaleDateString()}. 
                The user has made changes that require your review.
              </Text>
            </View>
          </View>
        )}

        {/* Changes Summary */}
        {profile.pending_changes && (
          <View style={styles.changesSection}>
            <Text style={styles.sectionTitle}>Changes Made</Text>
            <View style={styles.changesSummaryBox}>
              <Text style={styles.changesSummaryText}>
                {profile.pending_changes.summary}
              </Text>
            </View>
            {profile.pending_changes.changes && profile.pending_changes.changes.length > 0 && (
              <View style={styles.changesList}>
                {profile.pending_changes.changes.map((change, index) => (
                  <View key={index} style={styles.changeItem}>
                    <Text style={styles.changeFieldName}>{change.displayName}:</Text>
                    <View style={styles.changeValues}>
                      <Text style={styles.changeOldValue}>
                        <Text style={styles.changeLabel}>From: </Text>
                        {change.oldValue || 'Not set'}
                      </Text>
                      <Text style={styles.changeNewValue}>
                        <Text style={styles.changeLabel}>To: </Text>
                        {change.newValue || 'Not set'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        
        {/* Pictures */}
        {profile.pictures && profile.pictures.length > 0 && (
          <View style={styles.picturesSection}>
            <Text style={styles.sectionTitle}>Photos ({profile.pictures.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profile.pictures.map((picture, index) => (
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
          <DetailRow label="Name" value={`${profile.first_name} ${profile.last_name}`} />
          {profile.dob && (
            <>
              <DetailRow label="Age" value={`${calculateAge(profile.dob)} years old`} />
              <DetailRow label="Date of Birth" value={new Date(profile.dob).toLocaleDateString()} />
            </>
          )}
          <DetailRow label="Gender" value={profile.gender} />
          <DetailRow label="Role" value={profile.role === 'single' ? 'Single' : 'Matchmaker'} />
          {profile.height && <DetailRow label="Height" value={profile.height} />}
          {profile.marital_status && <DetailRow label="Marital Status" value={profile.marital_status} />}
        </View>

        {/* Bio */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>

        {/* What Looking For (Singles only) */}
        {profile.role === 'single' && profile.what_looking_for && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>What I&apos;m Looking For</Text>
            <Text style={styles.bioText}>{profile.what_looking_for}</Text>
          </View>
        )}

        {/* Location */}
        {(profile.location_country || profile.location_state || profile.location_city) && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            {profile.location_country && <DetailRow label="Country" value={profile.location_country} />}
            {profile.location_state && <DetailRow label="State" value={profile.location_state} />}
            {profile.location_city && <DetailRow label="City" value={profile.location_city} />}
          </View>
        )}

        {/* Contact Info */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <DetailRow label="Phone" value={profile.phone} />
          {profile.email && <DetailRow label="Email" value={profile.email} />}
          {profile.whatsapp && <DetailRow label="WhatsApp" value={profile.whatsapp} />}
        </View>

        {/* Background & Nationality */}
        {(profile.languages?.length || profile.nationality?.length || profile.is_cohen !== null) && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Background & Nationality</Text>
            {profile.languages && profile.languages.length > 0 && (
              <DetailRow label="Languages" value={profile.languages.join(', ')} />
            )}
            {profile.nationality && profile.nationality.length > 0 && (
              <DetailRow label="Nationality" value={profile.nationality.join(', ')} />
            )}
            {profile.is_cohen !== undefined && profile.is_cohen !== null && (
              <DetailRow label="Cohen" value={profile.is_cohen ? 'Yes' : 'No'} />
            )}
          </View>
        )}

        {/* Religious Outlook */}
        {(profile.hashkafa_type || profile.torah_learning || profile.praying) && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Religious Outlook</Text>
            {profile.hashkafa_type && <DetailRow label="Hashkafa Type" value={profile.hashkafa_type} />}
            {profile.torah_learning && <DetailRow label="Torah Learning" value={profile.torah_learning} />}
            {profile.praying && <DetailRow label="Praying" value={profile.praying} />}
          </View>
        )}

        {/* Education */}
        {(profile.education_level || profile.post_high_school_path) && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Education</Text>
            {profile.education_level && <DetailRow label="Education Level" value={profile.education_level} />}
            {profile.post_high_school_path && <DetailRow label="Post High School Path" value={profile.post_high_school_path} />}
          </View>
        )}

        {/* Occupation & Career */}
        {(profile.current_occupation_study || profile.plan_after_marriage) && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Occupation & Career</Text>
            {profile.current_occupation_study && <DetailRow label="Current Occupation/Study" value={profile.current_occupation_study} />}
            {profile.plan_after_marriage && <DetailRow label="Plan After Marriage" value={profile.plan_after_marriage} />}
          </View>
        )}

        {/* Dress & Appearance */}
        {(profile.dress_style || profile.wears_black_hat !== null || profile.head_covering) && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Dress & Appearance</Text>
            {profile.dress_style && <DetailRow label="Dress Style" value={profile.dress_style} />}
            {profile.wears_black_hat !== undefined && profile.wears_black_hat !== null && (
              <DetailRow label="Wears Black Hat" value={profile.wears_black_hat ? 'Yes' : 'No'} />
            )}
            {profile.head_covering && <DetailRow label="Head Covering" value={profile.head_covering} />}
          </View>
        )}

        {/* Lifestyle */}
        {(profile.smoking || profile.alcohol_consumption) && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Lifestyle</Text>
            {profile.smoking && <DetailRow label="Smoking" value={profile.smoking} />}
            {profile.alcohol_consumption && <DetailRow label="Alcohol Consumption" value={profile.alcohol_consumption} />}
          </View>
        )}

        {/* Privacy Settings */}
        {profile.field_privacy && Object.keys(profile.field_privacy).length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Privacy Settings</Text>
            <Text style={styles.privacyNote}>
              The following fields are marked as private (Ask me):
            </Text>
            {Object.entries(profile.field_privacy).map(([field, isPrivate]) => 
              isPrivate && (
                <Text key={field} style={styles.privateField}>
                  • {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              )
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={handleReject}
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
          onPress={() => handleApprove(profile.id)}
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

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title={successMessage.title}
        message={successMessage.message}
        onClose={handleSuccessClose}
      />
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoBannerContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  changesSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  changesSummaryBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  changesSummaryText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  changesList: {
    marginTop: 8,
  },
  changeItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  changeFieldName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  changeValues: {
    marginLeft: 8,
  },
  changeOldValue: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  changeNewValue: {
    fontSize: 13,
    color: '#4caf50',
    fontWeight: '500',
  },
  changeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
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
  picturesSection: {
    marginBottom: 20,
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
  privacyNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  privateField: {
    fontSize: 14,
    color: '#03a9f4',
    marginLeft: 8,
    marginBottom: 4,
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
  backButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#03a9f4',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
