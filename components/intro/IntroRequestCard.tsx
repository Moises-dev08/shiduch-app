import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import EngagementButton from '../../components/EngagementButton';
import { IntroRequest, introService } from '../../lib/introService';
import { profileService } from '../../lib/profileService';
import ContinuationChoiceModal from './ContinuationChoiceModal';

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
  const [showConfirmAcceptModal, setShowConfirmAcceptModal] = useState(false);

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

  const handleViewMatchmakerProfile = () => {
    if (matchmakerProfile && matchmakerProfile.id) {
      router.push(`/profile-details?id=${matchmakerProfile.id}&hideActions=true`);
    }
  };

  // FOR REQUESTED PERSON: Accept the intro request
  const handleAccept = () => {
    // Show confirmation modal first
    setShowConfirmAcceptModal(true);
  };

  // FOR REQUESTED PERSON: After confirming, show continuation choice or auto-accept with matchmaker
  const handleConfirmAccept = async () => {
    setShowConfirmAcceptModal(false);
    
    // If requester already chose "with_middle_person", automatically use matchmaker for both
    if (request.requester_continuation_choice === 'with_middle_person') {
      setIsResponding(true);
      try {
        await introService.requestedPersonRespond(request.id, 'accepted');
        await introService.setContinuationChoice(request.id, 'with_middle_person', matchmakerProfile?.id);
        Alert.alert(
          'Success! ✅', 
          `You have accepted the intro request! This match will be coordinated by ${matchmakerProfile?.first_name} (Matchmaker/Shadchan).`
        );
        onUpdate();
      } catch (error) {
        console.error('Error accepting request:', error);
        Alert.alert('Error', 'Failed to accept request');
      } finally {
        setIsResponding(false);
      }
    } else {
      // Otherwise, show them the continuation choice modal
      setShowContinuationModal(true);
    }
  };

  // FOR REQUESTED PERSON: Handle continuation choice
  const handleContinuationChoice = async (choice: 'by_themselves' | 'with_middle_person') => {
    setIsResponding(true);
    setShowContinuationModal(false);
    
    try {
      await introService.requestedPersonRespond(request.id, 'accepted');
      
      // If they want a matchmaker, use the existing one (Ben)
      if (choice === 'with_middle_person' && matchmakerProfile?.id) {
        await introService.setContinuationChoice(request.id, choice, matchmakerProfile.id);
      } else {
        await introService.setContinuationChoice(request.id, choice);
      }
      
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
    setShowContinuationModal(false);
    
    try {
      // If they want a matchmaker, use the existing one (Ben)
      if (choice === 'with_middle_person' && matchmakerProfile?.id) {
        await introService.setContinuationChoice(request.id, choice, matchmakerProfile.id);
      } else {
        await introService.setContinuationChoice(request.id, choice);
      }
      
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
          <View style={[styles.statusBadge, styles.waitingBadge]}>
            <Ionicons name="time" size={16} color="#1976d2" />
            <Text style={[styles.statusText, { color: '#1976d2' }]}>Awaiting Matchmaker Response</Text>
          </View>
        );
      } else if (request.matchmaker_status === 'rejected') {
        return (
          <View style={[styles.statusBadge, styles.rejectedBadge]}>
            <Ionicons name="close-circle" size={16} color="#d32f2f" />
            <Text style={[styles.statusText, { color: '#d32f2f' }]}>Matchmaker Declined</Text>
          </View>
        );
      } else if (request.matchmaker_status === 'accepted' && request.requested_status === 'pending') {
        return (
          <View style={[styles.statusBadge, styles.waitingBadge]}>
            <Ionicons name="time" size={16} color="#1976d2" />
            <Text style={[styles.statusText, { color: '#1976d2' }]}>Waiting for {otherProfile?.first_name}&apos;s Response</Text>
          </View>
        );
      } else if (request.requested_status === 'rejected') {
        return (
          <View style={[styles.statusBadge, styles.rejectedBadge]}>
            <Ionicons name="close-circle" size={16} color="#d32f2f" />
            <Text style={[styles.statusText, { color: '#d32f2f' }]}>{otherProfile?.first_name} Declined</Text>
          </View>
        );
      } else if (request.matchmaker_status === 'accepted' && request.requested_status === 'accepted') {
        if (!request.requester_continuation_choice) {
          return (
            <View style={[styles.statusBadge, styles.matchedBadge]}>
              <Ionicons name="checkmark-circle" size={16} color="#388e3c" />
              <Text style={[styles.statusText, { color: '#388e3c' }]}>Match Confirmed!</Text>
            </View>
          );
        }
        return (
          <View style={[styles.statusBadge, styles.completedBadge]}>
            <Ionicons name="checkmark-done" size={16} color="#2e7d32" />
            <Text style={[styles.statusText, { color: '#2e7d32' }]}>Ready to Connect</Text>
          </View>
        );
      }
    } else {
      // REQUESTED PERSON VIEW
      if (request.requested_status === 'pending') {
        return (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <Ionicons name="mail" size={16} color="#f57c00" />
            <Text style={[styles.statusText, { color: '#f57c00' }]}>New Introduction Request</Text>
          </View>
        );
      } else if (request.requested_status === 'rejected') {
        return (
          <View style={[styles.statusBadge, styles.rejectedBadge]}>
            <Ionicons name="close-circle" size={16} color="#d32f2f" />
            <Text style={[styles.statusText, { color: '#d32f2f' }]}>Declined</Text>
          </View>
        );
      } else if (request.requested_status === 'accepted') {
        if (!request.requested_continuation_choice) {
          return (
            <View style={[styles.statusBadge, styles.matchedBadge]}>
              <Ionicons name="checkmark-circle" size={16} color="#388e3c" />
              <Text style={[styles.statusText, { color: '#388e3c' }]}>Match Confirmed!</Text>
            </View>
          );
        }
        return (
          <View style={[styles.statusBadge, styles.completedBadge]}>
            <Ionicons name="checkmark-done" size={16} color="#2e7d32" />
            <Text style={[styles.statusText, { color: '#2e7d32' }]}>Ready to Connect</Text>
          </View>
        );
      }
    }
    return null;
  };

  // Determine if action is needed
  const needsAction = () => {
    if (isRequester) {
      // Requester already made their choice during request creation, so no further action needed here
      return false;
    } else {
      // Requested person needs to respond or choose continuation
      // But if requester chose 'with_middle_person', requested doesn't need to choose (auto-assigned)
      if (request.requested_status === 'pending') {
        return true;
      }
      if (request.requested_status === 'accepted' && !request.requested_continuation_choice) {
        // If requester chose matchmaker, requested doesn't need to choose (already auto-assigned)
        return request.requester_continuation_choice !== 'with_middle_person';
      }
      return false;
    }
  };

  const profileImage = getProfileImage(otherProfile);

  return (
    <View style={styles.card}>
      {/* Matchmaker Context (for requested person) */}
      {!isRequester && (
        <View style={styles.matchmakerContext}>
          <Ionicons name="people" size={18} color="#666" />
          <Text style={styles.matchmakerContextText}>
            Facilitated by{' '}
            <Text 
              style={styles.matchmakerNameClickable}
              onPress={handleViewMatchmakerProfile}
            >
              {matchmakerProfile?.first_name} {matchmakerProfile?.last_name}
            </Text>
            {' '}(Matchmaker/Shadchan)
          </Text>
        </View>
      )}

      {/* Matchmaker's Note to Requested Person (Shimon) */}
      {!isRequester && request.matchmaker_note_to_requested && (
        <View style={styles.noteContainer}>
          <View style={styles.noteHeader}>
            <Ionicons name="chatbox" size={16} color="#1293DA" />
            <Text style={styles.noteTitle}>Note from {matchmakerProfile?.first_name}:</Text>
          </View>
          <Text style={styles.noteText}>{request.matchmaker_note_to_requested}</Text>
        </View>
      )}

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
          {!isRequester && (
            <Text style={styles.requestDescription}>
              A potential introduction opportunity
            </Text>
          )}
          {isRequester && (
            <View style={styles.matchmakerInfo}>
              <Ionicons name="people" size={14} color="#666" />
              <Text style={styles.matchmakerText}>
                via {matchmakerProfile?.first_name}
              </Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      {/* Status Badge */}
      {renderStatusBadge()}

      {/* Contact Information - Show when both chose "by_themselves" */}
      {request.matchmaker_status === 'accepted' && 
       request.requested_status === 'accepted' &&
       request.requester_continuation_choice === 'by_themselves' &&
       request.requested_continuation_choice === 'by_themselves' && (
        <View style={styles.contactSection}>
          <View style={styles.contactHeader}>
            <Ionicons name="call" size={20} color="#4CAF50" />
            <Text style={styles.contactTitle}>Contact Information</Text>
          </View>
          
          {otherProfile && (
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{otherProfile.first_name} {otherProfile.last_name}</Text>
              
              {otherProfile.phone && (
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => Linking.openURL(`tel:${otherProfile.phone}`)}
                >
                  <Ionicons name="call" size={18} color="#1293DA" />
                  <Text style={styles.contactText}>{otherProfile.phone}</Text>
                </TouchableOpacity>
              )}
              
              {otherProfile.email && (
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => Linking.openURL(`mailto:${otherProfile.email}`)}
                >
                  <Ionicons name="mail" size={18} color="#1293DA" />
                  <Text style={styles.contactText}>{otherProfile.email}</Text>
                </TouchableOpacity>
              )}
              
              {otherProfile.whatsapp && (
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => Linking.openURL(`https://wa.me/${otherProfile.whatsapp}`)}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                  <Text style={styles.contactText}>{otherProfile.whatsapp}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Engagement Button */}
          <View style={styles.engagementContainer}>
            <EngagementButton
              otherUserId={otherProfile?.id || ''}
              otherUserName={`${otherProfile?.first_name} ${otherProfile?.last_name}` || ''}
              currentUserName={isRequester ? 
                `${request.requester_profile?.first_name} ${request.requester_profile?.last_name}` : 
                `${request.requested_profile?.first_name} ${request.requested_profile?.last_name}`
              }
            />
          </View>
        </View>
      )}

      {/* Matchmaker Contact Information - Show when continuing with matchmaker */}
      {request.matchmaker_status === 'accepted' && 
       request.requested_status === 'accepted' &&
       ((request.requester_continuation_choice === 'with_middle_person' || 
         request.requested_continuation_choice === 'with_middle_person')) && (
        <View style={styles.matchmakerContactSection}>
          <View style={styles.matchmakerContactHeader}>
            <Ionicons name="people" size={20} color="#1293DA" />
            <Text style={styles.matchmakerContactTitle}>Matchmaker Contact Information</Text>
          </View>
          
          <View style={styles.matchmakerInfoBox}>
            <Text style={styles.matchmakerInfoText}>
              This introduction is being facilitated by your matchmaker. Please contact them for next steps.
            </Text>
          </View>
          
          {matchmakerProfile && (
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{matchmakerProfile.first_name} {matchmakerProfile.last_name}</Text>
              
              {matchmakerProfile.phone && (
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => Linking.openURL(`tel:${matchmakerProfile.phone}`)}
                >
                  <Ionicons name="call" size={18} color="#1293DA" />
                  <Text style={styles.matchmakerContactText}>{matchmakerProfile.phone}</Text>
                </TouchableOpacity>
              )}
              
              {matchmakerProfile.email && (
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => Linking.openURL(`mailto:${matchmakerProfile.email}`)}
                >
                  <Ionicons name="mail" size={18} color="#1293DA" />
                  <Text style={styles.matchmakerContactText}>{matchmakerProfile.email}</Text>
                </TouchableOpacity>
              )}
              
              {matchmakerProfile.whatsapp && (
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => Linking.openURL(`https://wa.me/${matchmakerProfile.whatsapp}`)}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                  <Text style={styles.matchmakerContactText}>{matchmakerProfile.whatsapp}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Matchmaker's Note (for requester) */}
      {isRequester && request.matchmaker_note_to_requester && (
        <View style={styles.noteContainer}>
          <View style={styles.noteHeader}>
            <Ionicons name="chatbox" size={16} color="#1293DA" />
            <Text style={styles.noteTitle}>Note from {matchmakerProfile?.first_name}:</Text>
          </View>
          <Text style={styles.noteText}>{request.matchmaker_note_to_requester}</Text>
        </View>
      )}

      {/* Action Buttons - Placed after Matchmaker Context for requested person */}
      {!isRequester && needsAction() && request.requested_status === 'pending' && (
        <View style={styles.actionsContainer}>
          <View style={styles.responseButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => setShowRejectNote(true)}
              disabled={isResponding}
            >
              <Ionicons name="close-circle" size={22} color="#666" />
              <Text style={[styles.actionButtonText, { color: '#666' }]}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              disabled={isResponding}
            >
              {isResponding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={[styles.actionButtonText, { color: '#fff' }]}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Other Action Buttons */}
      {needsAction() && !isRequester && (
        <View style={styles.actionsContainer}>
          {/* Requested person choosing continuation (after accepting) */}
          {request.requested_status === 'accepted' && 
           !request.requested_continuation_choice && 
           request.requester_continuation_choice !== 'with_middle_person' && (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setShowContinuationModal(true)}
            >
              <Ionicons name="arrow-forward-circle" size={22} color="#fff" />
              <Text style={styles.continueButtonText}>Choose How to Continue</Text>
            </TouchableOpacity>
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

      {/* Confirm Accept Modal - for requested person before continuation choice */}
      {!isRequester && (
        <Modal
          visible={showConfirmAcceptModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowConfirmAcceptModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModalContent}>
              <View style={styles.confirmModalHeader}>
                <Ionicons name="heart-circle" size={48} color="#4CAF50" />
                <Text style={styles.confirmModalTitle}>Accept Intro Request?</Text>
              </View>
              
              <View style={styles.confirmModalBody}>
                <Text style={styles.confirmModalText}>
                  You&apos;re about to accept the intro request from <Text style={styles.boldText}>{otherProfile?.first_name}</Text>.
                </Text>
                <View style={styles.confirmModalInfo}>
                  <Ionicons name="information-circle" size={20} color="#666" />
                  <Text style={styles.confirmModalInfoText}>
                    After accepting, you&apos;ll choose how you&apos;d like to continue with the introduction.
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowConfirmAcceptModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Go Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.acceptConfirmButton]}
                  onPress={handleConfirmAccept}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Yes, Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Continuation Choice Modal */}
      <ContinuationChoiceModal
        visible={showContinuationModal}
        profileName={`${otherProfile?.first_name} ${otherProfile?.last_name}`}
        onSelectChoice={isRequester ? handleRequesterContinuationChoice : handleContinuationChoice}
        onCancel={() => setShowContinuationModal(false)}
        loading={isResponding}
        otherSideChoice={isRequester ? request.requested_continuation_choice : request.requester_continuation_choice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  placeholderImage: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  matchmakerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  matchmakerText: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  pendingBadge: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffe082',
  },
  waitingBadge: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#90caf9',
  },
  matchedBadge: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#81c784',
  },
  rejectedBadge: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#ef9a9a',
  },
  completedBadge: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#66bb6a',
  },
  noteContainer: {
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#1293DA',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1293DA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionsContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  responseButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  continueButton: {
    backgroundColor: '#1293DA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#1293DA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#F59E0B',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Contact Section Styles
  contactSection: {
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A8D8F5',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D4F8A',
  },
  contactInfo: {
    gap: 10,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  contactText: {
    fontSize: 15,
    color: '#1293DA',
    textDecorationLine: 'underline',
  },
  engagementContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#A8D8F5',
  },
  // Matchmaker Contact Section Styles
  matchmakerContactSection: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A8D8F5',
  },
  matchmakerContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  matchmakerContactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D4F8A',
  },
  matchmakerInfoBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#1293DA',
  },
  matchmakerInfoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  matchmakerContactText: {
    fontSize: 15,
    color: '#1293DA',
    textDecorationLine: 'underline',
  },
  // Confirm Accept Modal Styles
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  confirmModalHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  confirmModalBody: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  confirmModalText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  boldText: {
    fontWeight: '700',
    color: '#4CAF50',
  },
  confirmModalInfo: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  confirmModalInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  acceptConfirmButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    gap: 6,
  },
  matchmakerContext: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  matchmakerContextText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  matchmakerName: {
    fontWeight: '600',
    color: '#1293DA',
  },
  matchmakerNameClickable: {
    fontWeight: '600',
    color: '#1293DA',
    textDecorationLine: 'underline',
  },
  requestDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
});

