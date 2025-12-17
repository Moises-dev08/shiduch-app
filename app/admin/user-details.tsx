import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
import SuccessModal from '../../components/SuccessModal';
import { adminService } from '../../lib/adminService';
import { Profile } from '../../lib/profileService';

export default function UserDetailsScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Action State
  const [pendingAction, setPendingAction] = useState<'freeze' | 'unfreeze' | 'suspend' | 'unsuspend' | 'remove' | null>(null);
  const [confirmStep, setConfirmStep] = useState<'confirm' | 'reason'>('confirm');
  const [actionReason, setActionReason] = useState('');
  const [processingActionType, setProcessingActionType] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;
    
    setLoading(true);
    const result = await adminService.getAllUsers();
    if (result.success && result.profiles) {
      const foundProfile = result.profiles.find(p => p.user_id === userId);
      if (foundProfile) {
        setProfile(foundProfile);
      }
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleAdminAction = (action: 'freeze' | 'unfreeze' | 'suspend' | 'unsuspend' | 'remove') => {
    if (!profile) return;
    
    setPendingAction(action);
    setConfirmStep('confirm');
    setActionReason('');
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (!pendingAction || !profile) return;

    // If suspend, move to reason step
    if (pendingAction === 'suspend' && confirmStep === 'confirm') {
      setConfirmStep('reason');
      return;
    }

    // For all other actions or suspend with reason, proceed
    if (pendingAction === 'suspend' && confirmStep === 'reason') {
      if (!actionReason.trim()) {
        return; // Don't proceed if no reason
      }
    }

    setShowConfirmModal(false);
    performAction(pendingAction, actionReason || undefined);
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setPendingAction(null);
    setConfirmStep('confirm');
    setActionReason('');
  };

  const performAction = async (action: 'freeze' | 'unfreeze' | 'suspend' | 'unsuspend' | 'remove', reason?: string) => {
    if (!profile) return;
    
    setProcessingActionType(action);
    
    // Call backend service for all actions
    const result = await adminService.performAdminAction(profile.user_id, action, reason);

    setProcessingActionType(null);

    if (result.success) {
      let title = 'Success';
      let message = 'Action completed successfully';

      switch(action) {
        case 'freeze': title = 'User Frozen'; message = 'User is now hidden from others.'; break;
        case 'unfreeze': title = 'User Unfrozen'; message = 'User is now visible.'; break;
        case 'suspend': title = 'User Suspended'; message = 'User access has been blocked.'; break;
        case 'unsuspend': title = 'User Unsuspended'; message = 'User access has been restored.'; break;
        case 'remove': title = 'User Deleted'; message = 'User account has been permanently removed.'; break;
      }

      setSuccessMessage({ title, message });
      setShowSuccessModal(true);
      
      // Reload profile to get updated status from backend
      await loadProfile();
      
      // If user was removed, go back to users list
      if (action === 'remove') {
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    } else {
      // Show error - could be enhanced with error modal
      setShowConfirmModal(false);
      setPendingAction(null);
      setConfirmStep('confirm');
      setActionReason('');
    }
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>User Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#03a9f4" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>User Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>User Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statusBanner}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(profile.account_status, profile.is_active) }]} />
          <Text style={styles.statusBannerText}>
            Status: <Text style={{fontWeight: 'bold'}}>{getStatusText(profile.account_status, profile.is_active)}</Text>
          </Text>
        </View>

        {profile.suspension_reason && (
          <View style={styles.alertBox}>
            <Ionicons name="warning" size={20} color="#d32f2f" />
            <Text style={styles.alertText}>Reason: {profile.suspension_reason}</Text>
          </View>
        )}

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Basic Info</Text>
          <Text style={styles.detailText}>Name: {profile.first_name} {profile.last_name}</Text>
          <Text style={styles.detailText}>Role: {profile.role}</Text>
          <Text style={styles.detailText}>Email: {profile.email || 'N/A'}</Text>
          <Text style={styles.detailText}>Phone: {profile.phone}</Text>
          <Text style={styles.detailText}>Signed Up: {new Date(profile.created_at).toLocaleDateString()}</Text>
          <Text style={styles.detailText}>Last Active: {profile.last_active_at ? new Date(profile.last_active_at).toLocaleDateString() : 'Never'}</Text>
        </View>

        {/* Admin Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Admin Actions</Text>
          
          {/* Freeze/Unfreeze */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.blueButton]}
            onPress={() => handleAdminAction(profile.is_active === false ? 'unfreeze' : 'freeze')}
            disabled={!!processingActionType}
          >
            {(processingActionType === 'freeze' || processingActionType === 'unfreeze') ? (
                 <ActivityIndicator color="#fff" />
            ) : (
                <>
                  <Ionicons name={profile.is_active === false ? "eye" : "eye-off"} size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                      {profile.is_active === false ? 'Unfreeze Account' : 'Freeze Account'}
                  </Text>
                </>
            )}
          </TouchableOpacity>

          {/* Suspend/Unsuspend */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.orangeButton]}
            onPress={() => handleAdminAction(profile.account_status === 'suspended' ? 'unsuspend' : 'suspend')}
            disabled={!!processingActionType}
          >
            {(processingActionType === 'suspend' || processingActionType === 'unsuspend') ? (
                 <ActivityIndicator color="#fff" />
             ) : (
                 <>
                  <Ionicons name={profile.account_status === 'suspended' ? "lock-open" : "lock-closed"} size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                      {profile.account_status === 'suspended' ? 'Unsuspend Account' : 'Suspend Account'}
                  </Text>
                 </>
             )}
          </TouchableOpacity>

          {/* Remove */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.redButton]}
            onPress={() => handleAdminAction('remove')}
            disabled={!!processingActionType}
          >
           {processingActionType === 'remove' ? (
               <ActivityIndicator color="#fff" />
           ) : (
               <>
                <Ionicons name="trash" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Remove User</Text>
               </>
           )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal - Same as in users.tsx */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogBox}>
            {confirmStep === 'confirm' ? (
              // Confirmation Step
              <>
                {pendingAction === 'remove' && (
                  <View style={styles.warningIconContainer}>
                    <Ionicons name="warning" size={48} color="#f44336" />
                  </View>
                )}
                <Text style={styles.dialogTitle}>
                  {pendingAction === 'freeze' && 'Freeze User'}
                  {pendingAction === 'unfreeze' && 'Unfreeze User'}
                  {pendingAction === 'suspend' && 'Suspend User'}
                  {pendingAction === 'unsuspend' && 'Unsuspend User'}
                  {pendingAction === 'remove' && 'Delete User'}
                </Text>
                <Text style={styles.dialogSubtitle}>
                  {pendingAction === 'freeze' && 'Are you sure you want to freeze this user? They will be hidden from other users.'}
                  {pendingAction === 'unfreeze' && 'Are you sure you want to unfreeze this user? They will be visible to other users again.'}
                  {pendingAction === 'suspend' && 'Are you sure you want to suspend this user? They will be blocked from accessing the app.'}
                  {pendingAction === 'unsuspend' && 'Are you sure you want to unsuspend this user? Their access will be restored.'}
                  {pendingAction === 'remove' && 'Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.'}
                </Text>
                <View style={styles.dialogButtons}>
                  <TouchableOpacity onPress={handleCancelConfirm} style={styles.dialogButtonCancel}>
                    <Text style={styles.dialogButtonTextCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleConfirm} 
                    style={[
                      styles.dialogButtonConfirm,
                      {
                        backgroundColor: 
                          pendingAction === 'freeze' || pendingAction === 'unfreeze' ? '#2196f3' :
                          pendingAction === 'suspend' || pendingAction === 'unsuspend' ? '#ff9800' :
                          pendingAction === 'remove' ? '#f44336' : '#ff9800'
                      }
                    ]}
                  >
                    <Text style={styles.dialogButtonTextConfirm}>
                      {pendingAction === 'remove' ? 'Delete' : 'Yes'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // Reason Input Step (for suspend)
              <>
                <Text style={styles.dialogTitle}>Suspend User</Text>
                <Text style={styles.dialogSubtitle}>Enter reason for suspension:</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Reason..."
                  value={actionReason}
                  onChangeText={setActionReason}
                  multiline
                  autoFocus
                />
                {!actionReason.trim() && (
                  <Text style={styles.errorText}>Please provide a reason</Text>
                )}
                <View style={styles.dialogButtons}>
                  <TouchableOpacity onPress={() => setConfirmStep('confirm')} style={styles.dialogButtonCancel}>
                    <Text style={styles.dialogButtonTextCancel}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleConfirm} 
                    style={[
                      styles.dialogButtonConfirm,
                      styles.dialogButtonOrange as any,
                      !actionReason.trim() && styles.dialogButtonDisabled
                    ]}
                    disabled={!actionReason.trim() || processingActionType === 'suspend'}
                  >
                    {processingActionType === 'suspend' ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.dialogButtonTextConfirm}>Suspend</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <SuccessModal
        visible={showSuccessModal}
        title={successMessage.title}
        message={successMessage.message}
        onClose={() => setShowSuccessModal(false)}
      />
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
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 16 },
  
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8
  },
  statusIndicator: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusBannerText: { fontSize: 16 },

  alertBox: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  alertText: { color: '#d32f2f', flex: 1 },

  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 20
  },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  detailText: { fontSize: 14, marginBottom: 8, color: '#444' },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8
  },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  blueButton: { backgroundColor: '#2196f3' },
  orangeButton: { backgroundColor: '#ff9800' },
  redButton: { backgroundColor: '#f44336' },

  // Confirmation Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  dialogBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center'
  },
  warningIconContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  dialogTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 12,
    textAlign: 'center',
    color: '#333'
  },
  dialogSubtitle: { 
    fontSize: 15, 
    color: '#666', 
    marginBottom: 24,
    lineHeight: 22,
    textAlign: 'center'
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 8,
    fontSize: 15
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginBottom: 16,
    marginTop: -8
  },
  dialogButtons: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: 12,
    marginTop: 8
  },
  dialogButtonCancel: { 
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  dialogButtonTextCancel: { 
    color: '#666',
    fontSize: 16,
    fontWeight: '500'
  },
  dialogButtonConfirm: {
    backgroundColor: '#ff9800',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dialogButtonOrange: {
    backgroundColor: '#ff9800'
  },
  dialogButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6
  },
  dialogButtonTextConfirm: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 16
  }
});
