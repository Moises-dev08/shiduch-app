import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { profileService } from '../lib/profileService';

interface ProfileStatusModalProps {
  visible: boolean;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  onClose?: () => void;
  onStatusChange?: (newStatus: 'pending' | 'approved' | 'rejected') => void;
}

export default function ProfileStatusModal({
  visible,
  status: initialStatus,
  rejectionReason: initialRejectionReason,
  onClose,
  onStatusChange,
}: ProfileStatusModalProps) {
  const [status, setStatus] = useState(initialStatus);
  const [rejectionReason, setRejectionReason] = useState(initialRejectionReason);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch latest profile data when modal becomes visible
  useEffect(() => {
    if (visible) {
      setInitialLoading(true);
      const fetchProfileData = async () => {
        try {
          const result = await profileService.getProfile();
          if (result.success && result.profile) {
            console.log('ProfileStatusModal: Fetched profile data', {
              status: result.profile.status,
              rejectionReason: result.profile.rejection_reason
            });
            setStatus(result.profile.status);
            setRejectionReason(result.profile.rejection_reason);
          }
        } finally {
          setInitialLoading(false);
        }
      };
      fetchProfileData();
    } else {
      setInitialLoading(true);
    }
  }, [visible]);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const result = await profileService.getProfile();
      console.log('ProfileStatusModal: Check status result:', {
        success: result.success,
        status: result.profile?.status,
        rejectionReason: result.profile?.rejection_reason
      });
      
      if (result.success && result.profile) {
        const newStatus = result.profile.status;
        const newRejectionReason = result.profile.rejection_reason;
        
        setStatus(newStatus);
        setRejectionReason(newRejectionReason);
        
        console.log('ProfileStatusModal: Updated state', {
          newStatus,
          newRejectionReason
        });
        
        // Notify parent of status change
        if (onStatusChange && newStatus !== status) {
          onStatusChange(newStatus);
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Ionicons name="time" size={60} color="#ff9800" />;
      case 'approved':
        return <Ionicons name="checkmark-circle" size={60} color="#4caf50" />;
      case 'rejected':
        return <Ionicons name="close-circle" size={60} color="#f44336" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'pending':
        return 'Profile Under Review';
      case 'approved':
        return 'Profile Approved!';
      case 'rejected':
        return 'Profile Needs Attention';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'pending':
        return 'Thank you for submitting your profile! Our team is currently reviewing your information. This usually takes 24-48 hours. We\'ll notify you once your profile is approved.';
      case 'approved':
        return 'Congratulations! Your profile has been approved and is now visible to other users. You can now access all features of the app.';
      case 'rejected':
        return rejectionReason || 'Your profile needs some updates. Please review and update your profile information to meet our guidelines.';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return '#ff9800';
      case 'approved':
        return '#4caf50';
      case 'rejected':
        return '#f44336';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {initialLoading ? (
            <>
              <ActivityIndicator size="large" color="#e91e63" style={{ marginVertical: 40 }} />
              <Text style={styles.message}>Loading profile status...</Text>
            </>
          ) : (
            <>
              <View style={styles.iconContainer}>
                {getStatusIcon()}
              </View>

              <Text style={styles.title}>{getStatusTitle()}</Text>
              
              <Text style={styles.message}>{getStatusMessage()}</Text>

          {status === 'pending' && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#2196f3" />
              <Text style={styles.infoText}>
                You can check your profile status anytime by clicking the button below.
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            {status === 'pending' && (
              <TouchableOpacity
                style={[styles.button, styles.checkButton]}
                onPress={checkStatus}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Check Status</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {status === 'approved' && onClose && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: getStatusColor() }]}
                onPress={onClose}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            )}

            {status === 'rejected' && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: getStatusColor() }]}
                onPress={onClose}
              >
                <Text style={styles.buttonText}>Update Profile</Text>
              </TouchableOpacity>
            )}
          </View>

          {status === 'pending' && (
            <Text style={styles.footer}>
              In the meanwhile, you can only access the Profile tab.
            </Text>
          )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 8,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#2196f3',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkButton: {
    backgroundColor: '#2196f3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

