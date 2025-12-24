import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Engagement, engagementService } from '../lib/engagementService';
import { supabase } from '../lib/supabase';

interface EngagementButtonProps {
  otherUserId: string; // This is the profile ID
  otherUserName: string;
  currentUserName: string;
}

export default function EngagementButton({ otherUserId, otherUserName, currentUserName }: EngagementButtonProps) {
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUndoConfirmModal, setShowUndoConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [otherUserAuthId, setOtherUserAuthId] = useState<string | null>(null);

  useEffect(() => {
    loadOtherUserAuthId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId]);

  // Reload engagement status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (otherUserAuthId) {
        loadEngagementStatus(otherUserAuthId);
      }
    }, [otherUserAuthId])
  );

  const loadOtherUserAuthId = async () => {
    try {
      // Check if otherUserId is provided
      if (!otherUserId) {
        console.error('otherUserId is undefined');
        setLoading(false);
        return;
      }

      // Fetch the user_id from the profile
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', otherUserId)
        .single();

      if (error) {
        console.error('Error fetching user_id:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setOtherUserAuthId(data.user_id);
        loadEngagementStatus(data.user_id);
      }
    } catch (error) {
      console.error('Error loading user auth ID:', error);
      setLoading(false);
    }
  };

  const loadEngagementStatus = async (authId: string) => {
    const result = await engagementService.getEngagementStatus(authId);
    if (result.success) {
      setEngagement(result.engagement || null);
      console.log('Engagement status loaded:', result.engagement);
    } else {
      console.error('Error loading engagement status:', result.error);
    }
    setLoading(false);
  };

  const handleProposeEngagement = async () => {
    setShowConfirmModal(true);
  };

  const handleUndoEngagement = async () => {
    console.log('handleUndoEngagement called, showing modal...');
    setShowUndoConfirmModal(true);
  };

  const handleConfirmUndo = async () => {
    if (!otherUserAuthId) return;
    
    setShowUndoConfirmModal(false);
    setProposing(true);
    
    const result = await engagementService.undoEngagement(otherUserAuthId);
    
    if (result.success) {
      setEngagement(null);
      setSuccessMessage({
        title: 'Engagement Unmarked',
        message: 'Your engagement status has been removed.'
      });
      setShowSuccessModal(true);
    } else {
      setSuccessMessage({
        title: 'Error',
        message: result.error || 'Failed to undo engagement'
      });
      setShowSuccessModal(true);
    }
    
    setProposing(false);
  };

  const handleConfirmEngagement = async () => {
    if (!otherUserAuthId) {
      setSuccessMessage({
        title: 'Error',
        message: 'Unable to find user information'
      });
      setShowSuccessModal(true);
      return;
    }

    setShowConfirmModal(false);
    setProposing(true);
    
    const result = await engagementService.proposeEngagement(otherUserAuthId);
    
    if (result.success && result.engagement) {
      setEngagement(result.engagement);
      
      const bothConfirmed = result.engagement.user1_confirmed && result.engagement.user2_confirmed;
      
      if (bothConfirmed) {
        setSuccessMessage({
          title: 'Mazel Tov! 🎉',
          message: `Congratulations! Your engagement with ${otherUserName} has been confirmed and will be shared with the community.`
        });
      } else {
        setSuccessMessage({
          title: 'Engagement Proposal Sent! 💍',
          message: `${otherUserName} will be notified and need to confirm as well. Once both of you confirm, your engagement will be shared with the community!`
        });
      }
      
      setShowSuccessModal(true);
    } else {
      setSuccessMessage({
        title: 'Error',
        message: result.error || 'Failed to propose engagement'
      });
      setShowSuccessModal(true);
    }
    
    setProposing(false);
  };

  if (loading) {
    return (
      <View style={styles.buttonContainer}>
        <ActivityIndicator size="small" color="#03a9f4" />
      </View>
    );
  }

  // If both confirmed - show engaged status with option to undo
  if (engagement && engagement.user1_confirmed && engagement.user2_confirmed) {
    return (
      <>
        <TouchableOpacity
          style={[styles.button, styles.engagedButton]}
          onPress={handleUndoEngagement}
          disabled={proposing}
        >
          {proposing ? (
            <ActivityIndicator size="small" color="#ff4d4d" />
          ) : (
            <>
              <Ionicons name="heart" size={20} color="#ff4d4d" />
              <Text style={styles.engagedText}>Engaged! 💍 </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Undo Engagement Confirmation Modal */}
        <Modal
          visible={showUndoConfirmModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowUndoConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="alert-circle" size={48} color="#f39c12" />
                <Text style={styles.modalTitle}>Undo Engagement?</Text>
              </View>
              
              <Text style={styles.modalMessage}>
                Are you sure you want to remove your engagement status with <Text style={styles.boldText}>{otherUserName}</Text>?
              </Text>
              
              <View style={styles.modalInfo}>
                <Ionicons name="information-circle" size={20} color="#666" />
                <Text style={styles.modalInfoText}>
                  This will remove the engagement for both of you and it will no longer be shared with the community.
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowUndoConfirmModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.undoButton]}
                  onPress={handleConfirmUndo}
                  disabled={proposing}
                >
                  {proposing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={20} color="#fff" />
                      <Text style={styles.confirmButtonText}>Yes, Undo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Success/Info Modal */}
        <Modal
          visible={showSuccessModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons 
                  name={successMessage.title.includes('Mazel Tov') ? 'heart-circle' : 'checkmark-circle'} 
                  size={64} 
                  color={successMessage.title.includes('Mazel Tov') ? '#ff4d4d' : '#9b59b6'} 
                />
                <Text style={styles.modalTitle}>{successMessage.title}</Text>
              </View>
              
              <Text style={styles.modalMessage}>
                {successMessage.message}
              </Text>

              <TouchableOpacity
                style={[styles.modalButton, styles.successButton]}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.confirmButtonText}>
                  {successMessage.title.includes('Mazel Tov') ? 'Amazing! 🎉' : 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // If pending (one person confirmed, waiting for other)
  if (engagement && (engagement.user1_confirmed || engagement.user2_confirmed)) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.pendingButton]}
        onPress={handleProposeEngagement}
        disabled={proposing}
      >
        {proposing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="time" size={20} color="#fff" />
            <Text style={styles.buttonText}>Confirm Engagement?</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  // Default - show propose engagement button
  return (
    <>
      <TouchableOpacity
        style={[styles.button, styles.proposeButton]}
        onPress={handleProposeEngagement}
        disabled={proposing}
      >
        {proposing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="diamond" size={20} color="#fff" />
            <Text style={styles.buttonText}>Got Engaged?</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="diamond" size={48} color="#9b59b6" />
              <Text style={styles.modalTitle}>Confirm Engagement</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Are you sure you want to mark that you and <Text style={styles.boldText}>{otherUserName}</Text> got engaged?
            </Text>
            
            <View style={styles.modalInfo}>
              <Ionicons name="information-circle" size={20} color="#666" />
              <Text style={styles.modalInfoText}>
                {otherUserName} will also need to confirm. Once both of you confirm, your engagement will be shared with the community!
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmEngagement}
              >

                <Text style={styles.confirmButtonText}>B&quot;H, we got engaged! 💍</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success/Info Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons 
                name={successMessage.title.includes('Mazel Tov') ? 'heart-circle' : 'checkmark-circle'} 
                size={64} 
                color={successMessage.title.includes('Mazel Tov') ? '#ff4d4d' : '#9b59b6'} 
              />
              <Text style={styles.modalTitle}>{successMessage.title}</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              {successMessage.message}
            </Text>

            <TouchableOpacity
              style={[styles.modalButton, styles.successButton]}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.confirmButtonText}>
                {successMessage.title.includes('Mazel Tov') ? 'Amazing! 🎉' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  proposeButton: {
    backgroundColor: '#9b59b6',
  },
  pendingButton: {
    backgroundColor: '#f39c12',
  },
  engagedButton: {
    backgroundColor: '#fff5f5',
    borderWidth: 2,
    borderColor: '#ff4d4d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  engagedText: {
    color: '#ff4d4d',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  boldText: {
    fontWeight: '700',
    color: '#333',
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  modalInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',

  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#9b59b6',

  },
  successButton: {
    backgroundColor: '#9b59b6',
    width: '100%',
  },
  undoButton: {
    backgroundColor: '#e74c3c',
    flex: 1,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

