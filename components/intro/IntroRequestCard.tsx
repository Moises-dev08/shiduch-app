import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
  isRequester: boolean;
  onUpdate: () => void;
  isActionNeeded?: boolean; // Flag to show simplified action-focused UI
}

export default function IntroRequestCard({ request, isRequester, onUpdate, isActionNeeded = false }: IntroRequestCardProps) {
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showMiddlePersonModal, setShowMiddlePersonModal] = useState(false);
  const [showContinuationModal, setShowContinuationModal] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isResponding, setIsResponding] = useState(false);

  const otherProfile = isRequester ? request.requested_profile : request.requester_profile;
  const middlePerson = request.requester_middle_person;
  const contactInfo = introService.getContactInfo(request, isRequester);

  const handleViewProfile = () => {
    if (otherProfile && otherProfile.id) {
      router.push(`/profile-details?id=${otherProfile.id}&hideActions=true`);
    }
  };
console.log('contactInfo', contactInfo);
  const handleAccept = () => {
    // Show continuation choice modal directly
    setShowContinuationModal(true);
  };

  const handleContinuationChoice = async (choice: 'by_themselves' | 'with_middle_person') => {
    // If they chose to continue with Matchmaker/Shadchan, show selection modal
    if (choice === 'with_middle_person') {
      setShowContinuationModal(false);
      setShowMiddlePersonModal(true);
      return;
    }

    // If by themselves, accept directly
    setIsAccepting(true);
    try {
      await introService.respondToIntroRequest(request.id, 'accepted', '', choice);
      setShowContinuationModal(false);
      Alert.alert('Success! ✅', 'You have accepted the intro request!');
      onUpdate();
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleMiddlePersonSelected = async (person: any) => {
    setShowMiddlePersonModal(false);
    setIsAccepting(true);
    
    try {
      // If this is initial response (pending or rejected status)
      if (request.status === 'pending' || request.status === 'rejected') {
        // Accept with Matchmaker/Shadchan
        await introService.respondToIntroRequest(
          request.id, 
          'accepted', 
          '', 
          'with_middle_person', 
          person.id
        );
        Alert.alert('Success! ✅', 'You have accepted the intro request!');
      } 
      // If already accepted and now choosing Matchmaker/Shadchan for continuation
      else if (request.status === 'accepted' && !isRequester && !request.requested_continuation_choice) {
        // Set the Matchmaker/Shadchan first
        await introService.setRequestedMiddlePerson(request.id, person.id);
        // Then set the continuation choice
        await introService.setContinuationChoice(request.id, 'with_middle_person', false);
        Alert.alert('Choice Saved! ✅', 'Your continuation preference has been saved!');
      }
      onUpdate();
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await introService.respondToIntroRequest(request.id, 'rejected', rejectNote);
      setShowRejectNote(false);
      Alert.alert('Request Declined', 'The intro request has been declined.');
      onUpdate();
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleChangeToAccept = () => {
    // Show continuation choice modal directly
    setShowContinuationModal(true);
  };

  const handleRequesterContinuationChoice = async (choice: 'by_themselves' | 'with_middle_person') => {
    setIsAccepting(true);
    try {
      await introService.setContinuationChoice(request.id, choice, true);
      Alert.alert('Choice Saved', 'Your continuation preference has been saved!');
      onUpdate();
    } catch (error) {
      console.error('Error setting continuation choice:', error);
      Alert.alert('Error', 'Failed to save choice');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleContinueProcess = () => {
    // Open continuation modal for choosing next step
    setShowContinuationModal(true);
  };

  const handleModalContinuationChoice = async (choice: 'by_themselves' | 'with_middle_person') => {
    // If this is for the initial response (requested person accepting)
    if (request.status === 'pending' || (request.status === 'rejected' && !isRequester)) {
      await handleContinuationChoice(choice);
    }
    // If this is for requester choosing after acceptance
    else if (isRequester && !request.requester_continuation_choice) {
      await handleRequesterContinuationChoice(choice);
    }
    // If this is for requested person choosing after acceptance
    else if (!isRequester && request.status === 'accepted' && !request.requested_continuation_choice) {
      // For requested person after accepting, they can also choose Matchmaker/Shadchan
      if (choice === 'with_middle_person') {
        setShowContinuationModal(false);
        setShowMiddlePersonModal(true);
      } else {
        await handleRequestedContinuationChoice(choice);
      }
    }
  };

  const handleRequestedContinuationChoice = async (choice: 'by_themselves' | 'with_middle_person') => {
    setIsResponding(true);
    try {
      await introService.setContinuationChoice(request.id, choice, false);
      setShowContinuationModal(false);
      Alert.alert('Choice Saved', 'Your continuation preference has been saved!');
      onUpdate();
    } catch (error) {
      console.error('Error setting continuation choice:', error);
      Alert.alert('Error', 'Failed to save choice');
    } finally {
      setIsResponding(false);
    }
  };

  const handleSendSMS = (phone: string) => {
    Linking.openURL(`sms:${phone}`);
  };

  const handleSendWhatsApp = (phone: string) => {
    Linking.openURL(`whatsapp://send?phone=${phone}`);
  };

  const handleSendEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleCopyPhone = async (phone: string) => {
    await Clipboard.setStringAsync(phone);
    Alert.alert('Copied', 'Phone number copied to clipboard');
  };

  const renderStatus = () => {
    if (request.status === 'pending' && !isRequester) {
      // For received requests, show who asked
      const requesterName = request.requester_profile?.first_name || 'Someone';
      return (
        <View style={[styles.statusBadge, styles.pendingBadge]}>
          <Text style={styles.statusText}>💌 {requesterName} asked for you</Text>
        </View>
      );
    }
    if (request.status === 'pending' && isRequester) {
      return (
        <View style={[styles.statusBadge, styles.pendingBadge]}>
          <Text style={styles.statusText}>⏳ Awaiting Response</Text>
        </View>
      );
    }
    if (request.status === 'rejected' && isRequester) {
      // Show declined for requester
      const requestedName = request.requested_profile?.first_name || 'They';
      return (
        <View style={[styles.statusBadge, styles.rejectedBadge]}>
          <Text style={styles.statusText}>✗ {requestedName} Declined</Text>
        </View>
      );
    }
    if (request.status === 'rejected' && !isRequester) {
      // Show that you declined
      return (
        <View style={[styles.statusBadge, styles.rejectedBadge]}>
          <Text style={styles.statusText}>✗ You Declined</Text>
        </View>
      );
    }
    if (request.status === 'accepted') {
      return (
        <View style={[styles.statusBadge, styles.acceptedBadge]}>
          <Text style={styles.statusText}>✓ Accepted</Text>
        </View>
      );
    }
    if (request.status === 'completed') {
      return (
        <View style={[styles.statusBadge, styles.completedBadge]}>
          <Text style={styles.statusText}>✓ Ready to Connect</Text>
        </View>
      );
    }
  };

  // Determine what action is needed
  const needsInitialResponse = request.status === 'pending' && !isRequester;
  const needsContinuationChoice = request.status === 'accepted' && 
    ((isRequester && !request.requester_continuation_choice) || 
     (!isRequester && !request.requested_continuation_choice));
  const waitingForOtherContinuation = request.status === 'accepted' &&
    ((isRequester && request.requester_continuation_choice && !request.requested_continuation_choice) ||
     (!isRequester && request.requested_continuation_choice && !request.requester_continuation_choice));

  return (
    <View style={[styles.card, isActionNeeded && styles.actionNeededCard]}>
      {/* Action Needed Banner */}
      {isActionNeeded && needsInitialResponse && (
        <View style={styles.actionBanner}>
          <Ionicons name="notifications" size={18} color="#fff" />
          <Text style={styles.actionBannerText}>Response Required</Text>
        </View>
      )}
      {isActionNeeded && needsContinuationChoice && (
        <View style={[styles.actionBanner, styles.continuationBanner]}>
          <Ionicons name="arrow-forward-circle" size={18} color="#fff" />
          <Text style={styles.actionBannerText}>Choose How to Continue</Text>
        </View>
      )}
      {isActionNeeded && waitingForOtherContinuation && (
        <View style={[styles.actionBanner, styles.waitingBanner]}>
          <Ionicons name="time" size={18} color="#fff" />
          <Text style={styles.actionBannerText}>Waiting for {isRequester ? request.requested_profile?.first_name : request.requester_profile?.first_name}</Text>
        </View>
      )}

      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={handleViewProfile} activeOpacity={0.7}>
        <View style={styles.profileSection}>
          {(() => {
            const pictures = otherProfile?.pictures;
            const picturePrivacy = otherProfile?.picture_privacy || otherProfile?.picturePrivacy || 'none';
            const firstPicture = Array.isArray(pictures) && pictures.length > 0 
              ? pictures[0] 
              : typeof pictures === 'string' 
                ? pictures 
                : null;
            
            // Determine if we should show the image based on privacy settings
            const showImage = firstPicture && (picturePrivacy === 'always' || picturePrivacy === 'private' || picturePrivacy === 'one_time');
            const isBlurred = picturePrivacy === 'private';
            
            if (showImage) {
              return (
                <View style={styles.profileImageContainer}>
                  <Image 
                    source={{ uri: profileService.getImageUrl(firstPicture) }} 
                    style={styles.profileImage}
                    blurRadius={isBlurred ? 15 : 0}
                  />
                  {isBlurred && (
                    <View style={styles.blurOverlay}>
                      <Ionicons name="lock-closed" size={16} color="#fff" />
                    </View>
                  )}
                </View>
              );
            } else {
              return (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={30} color="#ccc" />
                </View>
              );
            }
          })()}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {otherProfile.first_name} {otherProfile.last_name}
            </Text>
            <Text style={styles.profileDetails}>
              {otherProfile.age} • {otherProfile.gender}
            </Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          {renderStatus()}
          <Ionicons name="chevron-forward" size={20} color="#ccc" style={styles.chevron} />
        </View>
      </TouchableOpacity>

      {/* Middle Person Info */}
      <View style={styles.middlePersonSection}>
        <Ionicons name="people" size={16} color="#666" />
        <Text style={styles.middlePersonText}>
          via {middlePerson.first_name} {middlePerson.last_name} (Matchmaker/Shadchan) 
        </Text>
      </View>

      {/* Rejected - option to change mind */}
      {request.status === 'rejected' && !isRequester && (
        <View style={styles.actionsSection}>
          <Text style={styles.actionTitle}>Changed Your Mind?</Text>
          <TouchableOpacity
            style={[styles.button, styles.acceptButton, isAccepting && styles.buttonDisabled]}
            onPress={handleChangeToAccept}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Accept Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Pending - need to respond */}
      {request.status === 'pending' && !isRequester && (
        <View style={styles.actionsSection}>
          <Text style={styles.actionTitle}>Response Required</Text>
          {!showRejectNote ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.rejectButton, (isRejecting || isAccepting) && styles.buttonDisabled]}
                onPress={() => setShowRejectNote(true)}
                disabled={isRejecting || isAccepting}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.acceptButton, (isRejecting || isAccepting) && styles.buttonDisabled]}
                onPress={handleAccept}
                disabled={isRejecting || isAccepting}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TextInput
                style={styles.noteInput}
                placeholder="Optional note to Matchmaker/Shadchan..."
                value={rejectNote}
                onChangeText={setRejectNote}
                multiline
                numberOfLines={3}
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setShowRejectNote(false)}
                  disabled={isRejecting}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.rejectButton, isRejecting && styles.buttonDisabled]}
                  onPress={handleReject}
                  disabled={isRejecting}
                >
                  {isRejecting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Confirm Decline</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Accepted - needs to choose continuation */}
      {request.status === 'accepted' && needsContinuationChoice && !isActionNeeded && (
        <View style={styles.actionsSection}>
          <Text style={styles.actionTitle}>How would you like to continue?</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.continueButton, isAccepting && styles.buttonDisabled]}
              onPress={() => {
                if (isRequester) {
                  handleRequesterContinuationChoice('by_themselves');
                } else {
                  handleContinuationChoice('by_themselves');
                }
              }}
              disabled={isAccepting}
            >
              <Ionicons name="person" size={18} color="#fff" />
              <Text style={styles.buttonTextSmall}>By Myself</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.continueButton, isAccepting && styles.buttonDisabled]}
              onPress={() => {
                if (isRequester) {
                  handleRequesterContinuationChoice('with_middle_person');
                } else {
                  handleContinuationChoice('with_middle_person');
                }
              }}
              disabled={isAccepting}
            >
              <Ionicons name="people" size={18} color="#fff" />
              <Text style={styles.buttonTextSmall}>With Middle Person</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Action Needed - Big Continue Button */}
      {isActionNeeded && needsContinuationChoice && (
        <TouchableOpacity
          style={[styles.bigContinueButton, isAccepting && styles.buttonDisabled]}
          onPress={handleContinueProcess}
          disabled={isAccepting}
        >
          {isAccepting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
              <Text style={styles.bigContinueButtonText}>Choose How to Continue</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Show contact info if both have chosen */}
      {request.status === 'completed' && contactInfo.shouldShowContact && contactInfo.contactPerson && (
        <View style={styles.contactSection}>
          <TouchableOpacity 
            style={styles.contactToggle}
            onPress={() => setShowContactInfo(!showContactInfo)}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={18} color="#4CAF50" />
            <Text style={styles.contactToggleText}>Contact Information</Text>
            <Ionicons 
              name={showContactInfo ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
          
          {showContactInfo && (
            <>
              <Text style={styles.contactTitle}>{contactInfo.message}</Text>
              <View style={styles.contactCard}>
                <Text style={styles.contactName}>{contactInfo.contactPerson.name}</Text>
                {contactInfo.contactPerson.phone && (
                  <Text style={styles.contactDetail}>📞 {contactInfo.contactPerson.phone}</Text>
                )}
                {contactInfo.contactPerson.email && (
                  <Text style={styles.contactDetail}>📧 {contactInfo.contactPerson.email}</Text>
                )}

                <View style={styles.contactActions}>
                  {contactInfo.contactPerson.phone && (
                    <>
                      <TouchableOpacity
                        style={styles.contactAction}
                        onPress={() => handleSendSMS(contactInfo.contactPerson!.phone!)}
                      >
                        <Ionicons name="chatbubble" size={18} color="#007AFF" />
                        <Text style={styles.contactActionText}>SMS</Text>
                      </TouchableOpacity>

                      {contactInfo.contactPerson.phone && (
                        <TouchableOpacity
                          style={styles.contactAction}
                          onPress={() => handleSendWhatsApp(contactInfo.contactPerson!.phone!)}
                        >
                          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                          <Text style={styles.contactActionText}>WhatsApp</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.contactAction}
                        onPress={() => handleCopyPhone(contactInfo.contactPerson!.phone!)}
                      >
                        <Ionicons name="copy" size={18} color="#666" />
                        <Text style={styles.contactActionText}>Copy</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {contactInfo.contactPerson.email && (
                    <TouchableOpacity
                      style={styles.contactAction}
                      onPress={() => handleSendEmail(contactInfo.contactPerson!.email!)}
                    >
                      <Ionicons name="mail" size={18} color="#EA4335" />
                      <Text style={styles.contactActionText}>Email</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Resume Download */}
                {contactInfo.contactPerson.resumeUrl && (
                  <TouchableOpacity
                    style={styles.resumeButton}
                    onPress={async () => {
                      const { resumeService } = await import('../../lib/resumeService');
                      const result = await resumeService.downloadResume(
                        contactInfo.contactPerson!.resumeUrl!,
                        `${contactInfo.contactPerson!.name}_resume`
                      );
                      if (!result.success) {
                        Alert.alert('Error', result.error || 'Failed to open resume');
                      }
                    }}
                  >
                    <Ionicons name="document-text" size={20} color="#03a9f4" />
                    <Text style={styles.resumeButtonText}>Download Resume 📄</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      )}

      {/* Waiting message */}
      {request.status === 'accepted' && (isRequester ? request.requester_continuation_choice : request.requested_continuation_choice) && !contactInfo.shouldShowContact && (
        <View style={styles.waitingSection}>
          <Ionicons name="hourglass" size={20} color="#999" />
          <Text style={styles.waitingText}>{contactInfo.message}</Text>
        </View>
      )}

      {/* Modals */}
      <MiddlePersonSelectionModal
        visible={showMiddlePersonModal}
        excludedProfileId={isRequester ? request.requester_id : request.requested_profile_id}
        requestedProfileId={isRequester ? request.requested_profile_id : request.requester_id}
        onSelect={handleMiddlePersonSelected}
        onCancel={() => setShowMiddlePersonModal(false)}
      />

      {otherProfile && (
        <ContinuationChoiceModal
          visible={showContinuationModal}
          profileName={`${otherProfile.first_name} ${otherProfile.last_name}`}
          onSelectChoice={handleModalContinuationChoice}
          onCancel={() => {
            setShowContinuationModal(false);
          }}
          loading={isResponding}
        />
      )}
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
  actionNeededCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#03a9f4',
    paddingTop: 0,
  },
  actionBanner: {
    backgroundColor: '#03a9f4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    gap: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  continuationBanner: {
    backgroundColor: '#2196F3',
  },
  waitingBanner: {
    backgroundColor: '#FF9800',
  },
  actionBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  chevron: {
    marginTop: 4,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  profileDetails: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: 180,
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  acceptedBadge: {
    backgroundColor: '#E8F5E9',
  },
  rejectedBadge: {
    backgroundColor: '#FFEBEE',
  },
  completedBadge: {
    backgroundColor: '#E3F2FD',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  middlePersonSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
  },
  middlePersonText: {
    fontSize: 13,
    color: '#666',
  },
  actionsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#FF6B6B',
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  continueButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextSmall: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  contactSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  contactToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
  },
  contactToggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  contactCard: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contactDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  contactAction: {
    alignItems: 'center',
    gap: 4,
  },
  contactActionText: {
    fontSize: 11,
    color: '#666',
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e1f5fe',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#03a9f4',
  },
  resumeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#03a9f4',
    marginLeft: 8,
  },
  waitingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginTop: 12,
  },
  waitingText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  bigContinueButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 12,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bigContinueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

