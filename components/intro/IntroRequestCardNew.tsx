import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
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
  View,
} from 'react-native';
import { IntroRequest, introService } from '../../lib/introService';
import { profileService } from '../../lib/profileService';
import ContinuationChoiceModal from './ContinuationChoiceModal';
import MiddlePersonSelectionModal from './MiddlePersonSelectionModal';

interface IntroRequestCardProps {
  request: IntroRequest;
  isRequester: boolean; // true if current user is the one who requested the intro
  onUpdate: () => void;
  isActionNeeded?: boolean;
}

/**
 * NEW 3-STEP FLOW:
 * 1. Requester (Ori) creates request → Matchmaker (Ben)
 * 2. Matchmaker (Ben) accepts/rejects → Requester (Ori) + Requested (Shimon if accepted)
 * 3. Requested (Shimon) accepts/rejects → both choose continuation
 */
export default function IntroRequestCardNew({ 
  request, 
  isRequester, 
  onUpdate, 
  isActionNeeded = false 
}: IntroRequestCardProps) {
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [showContinuationModal, setShowContinuationModal] = useState(false);
  const [showMiddlePersonModal, setShowMiddlePersonModal] = useState(false);

  const otherProfile = isRequester ? request.requested_profile : request.requester_profile;
  const matchmakerProfile = request.requester_middle_person;

  const getProfileImage = (profile: any) => {
    if (Array.isArray(profile?.pictures) && profile.pictures.length > 0) {
      return profileService.getImageUrl(profile.pictures[0]);
    }
    return null;
  };

  const handleViewProfile = () => {
    if (otherProfile && otherProfile.id) {
      router.push(`/profile-details?id=${otherProfile.id}&hideActions=true`);
    }
  };

  // FOR REQUESTED PERSON: Accept the intro request
  const handleAccept = () => {
    setShowContinuationModal(true);
  };

  // FOR REQUESTED PERSON: Handle continuation choice
  const handleContinuationChoice = async (choice: 'by_themselves' | 'with_middle_person') => {
    if (choice === 'with_middle_person') {
      setShowContinuationModal(false);
      setShowMiddlePersonModal(true);
      return;
    }

    setIsResponding(true);
    try {
      await introService.requestedPersonRespond(request.id, 'accepted');
      await introService.setContinuationChoice(request.id, choice);
      setShowContinuationModal(false);
      Alert.alert('Success! ✅', 'You have accepted the intro request!');
      onUpdate();
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setIsResponding(false);
    }
  };

  // FOR REQUESTED PERSON: Handle middle person selection
  const handleMiddlePersonSelected = async (person: any) => {
    setShowMiddlePersonModal(false);
    setIsResponding(true);
    try {
      await introService.requestedPersonRespond(request.id, 'accepted');
      await introService.setContinuationChoice(request.id, 'with_middle_person', person.id);
      Alert.alert('Success! ✅', 'You have accepted the intro request!');
      onUpdate();
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setIsResponding(false);
    }
  };

  // FOR REQUESTED PERSON: Reject the intro request
  const handleReject = async () => {
    setIsResponding(true);
    try {
      await introService.requestedPersonRespond(request.id, 'rejected', rejectNote);
      setShowRejectNote(false);
      Alert.alert('Request Declined', 'The intro request has been declined.');
      onUpdate();
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request');
    } finally {
      setIsResponding(false);
    }
  };

  // FOR REQUESTER: Set continuation choice after both accepted
  const handleRequesterContinuationChoice = async (choice: 'by_themselves' | 'with_middle_person') => {
    setIsResponding(true);
    try {
      await introService.setContinuationChoice(request.id, choice);
      setShowContinuationModal(false);
      Alert.alert('Choice Saved! ✅', 'Your continuation preference has been saved!');
      onUpdate();
    } catch (error) {
      console.error('Error setting continuation choice:', error);
      Alert.alert('Error', 'Failed to save choice');
    } finally {
      setIsResponding(false);
    }
  };

  // Render status badge
  const renderStatusBadge = () => {
    if (isRequester) {
      // REQUESTER VIEW
      if (request.matchmaker_status === 'pending') {
        return (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <Text style={styles.statusText}>⏳ Waiting for {matchmakerProfile?.first_name}</Text>
          </View>
        );
      } else if (request.matchmaker_status === 'rejected') {
        return (
          <View style={[styles.statusBadge, styles.rejectedBadge]}>
            <Text style={styles.statusText}>✗ Matchmaker Declined</Text>
          </View>
        );
      } else if (request.matchmaker_status === 'accepted' && request.requested_status === 'pending') {
        return (
          <View style={[styles.statusBadge, styles.waitingBadge]}>
            <Text style={styles.statusText}>⏳ Waiting for {otherProfile?.first_name}</Text>
          </View>
        );
      } else if (request.requested_status === 'rejected') {
        return (
          <View style={[styles.statusBadge, styles.rejectedBadge]}>
            <Text style={styles.statusText}>✗ {otherProfile?.first_name} Declined</Text>
          </View>
        );
      } else if (request.matchmaker_status === 'accepted' && request.requested_status === 'accepted') {
        if (!request.requester_continuation_choice) {
          return (
            <View style={[styles.statusBadge, styles.matchedBadge]}>
              <Text style={styles.statusText}>✓ Matched! Choose how to continue</Text>
            </View>
          );
        }
        return (
          <View style={[styles.statusBadge, styles.completedBadge]}>
            <Text style={styles.statusText}>✅ Completed</Text>
          </View>
        );
      }
    } else {
      // REQUESTED PERSON VIEW
      if (request.requested_status === 'pending') {
        return (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <Text style={styles.statusText}>⏳ Action Needed</Text>
          </View>
        );
      } else if (request.requested_status === 'rejected') {
        return (
          <View style={[styles.statusBadge, styles.rejectedBadge]}>
            <Text style={styles.statusText}>✗ You Declined</Text>
          </View>
        );
      } else if (request.requested_status === 'accepted') {
        if (!request.requested_continuation_choice) {
          return (
            <View style={[styles.statusBadge, styles.matchedBadge]}>
              <Text style={styles.statusText}>✓ Matched! Choose how to continue</Text>
            </View>
          );
        }
        return (
          <View style={[styles.statusBadge, styles.completedBadge]}>
            <Text style={styles.statusText}>✅ Completed</Text>
          </View>
        );
      }
    }
    return null;
  };

  // Determine if action is needed
  const needsAction = () => {
    if (isRequester) {
      // Requester needs to choose continuation after both accepted
      return request.matchmaker_status === 'accepted' && 
             request.requested_status === 'accepted' && 
             !request.requester_continuation_choice;
    } else {
      // Requested person needs to respond or choose continuation
      return request.requested_status === 'pending' || 
             (request.requested_status === 'accepted' && !request.requested_continuation_choice);
    }
  };

  const profileImage = getProfileImage(otherProfile);

  return (
    <View style={styles.card}>
      {/* Header with profile info */}
      <TouchableOpacity onPress={handleViewProfile} style={styles.header}>
        <View style={styles.profileImageContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.placeholderImage]}>
              <Ionicons name="person" size={24} color="#999" />
            </View>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.profileName}>
            {otherProfile?.first_name} {otherProfile?.last_name}
          </Text>
          <View style={styles.matchmakerInfo}>
            <Ionicons name="people" size={14} color="#666" />
            <Text style={styles.matchmakerText}>
              via {matchmakerProfile?.first_name}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      {/* Status Badge */}
      {renderStatusBadge()}

      {/* Matchmaker's Note (for requester) */}
      {isRequester && request.matchmaker_note_to_requester && (
        <View style={styles.noteContainer}>
          <View style={styles.noteHeader}>
            <Ionicons name="chatbox" size={16} color="#03a9f4" />
            <Text style={styles.noteTitle}>Note from {matchmakerProfile?.first_name}:</Text>
          </View>
          <Text style={styles.noteText}>{request.matchmaker_note_to_requester}</Text>
        </View>
      )}

      {/* Action Buttons */}
      {needsAction() && (
        <View style={styles.actionsContainer}>
          {isRequester ? (
            // Requester choosing continuation
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setShowContinuationModal(true)}
            >
              <Text style={styles.continueButtonText}>Choose How to Continue</Text>
            </TouchableOpacity>
          ) : (
            // Requested person responding
            request.requested_status === 'pending' ? (
              <View style={styles.responseButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={handleAccept}
                  disabled={isResponding}
                >
                  {isResponding ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => setShowRejectNote(true)}
                  disabled={isResponding}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Requested person choosing continuation
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => setShowContinuationModal(true)}
              >
                <Text style={styles.continueButtonText}>Choose How to Continue</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      )}

      {/* Reject Note Modal */}
      <Modal
        visible={showRejectNote}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRejectNote(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Decline Intro Request</Text>
            <Text style={styles.modalSubtitle}>
              You can optionally add a note for the matchmaker:
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Optional note..."
              value={rejectNote}
              onChangeText={setRejectNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRejectNote(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleReject}
                disabled={isResponding}
              >
                {isResponding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Continuation Choice Modal */}
      <ContinuationChoiceModal
        visible={showContinuationModal}
        onClose={() => setShowContinuationModal(false)}
        onSelect={isRequester ? handleRequesterContinuationChoice : handleContinuationChoice}
      />

      {/* Middle Person Selection Modal */}
      <MiddlePersonSelectionModal
        visible={showMiddlePersonModal}
        onClose={() => setShowMiddlePersonModal(false)}
        onSelect={handleMiddlePersonSelected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  matchmakerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchmakerText: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  pendingBadge: {
    backgroundColor: '#fff3cd',
  },
  waitingBadge: {
    backgroundColor: '#e3f2fd',
  },
  matchedBadge: {
    backgroundColor: '#d4edda',
  },
  rejectedBadge: {
    backgroundColor: '#f8d7da',
  },
  completedBadge: {
    backgroundColor: '#d4edda',
  },
  noteContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#03a9f4',
  },
  noteText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: 8,
  },
  responseButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#03a9f4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#F44336',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

