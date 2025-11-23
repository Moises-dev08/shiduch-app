import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { profileService } from '../../lib/profileService';
import { Suggestion, suggestionService } from '../../lib/suggestionService';
import ContinuationChoiceModal from '../intro/ContinuationChoiceModal';
import MiddlePersonSelectionModal from '../intro/MiddlePersonSelectionModal';

interface SuggestionCardProps {
  suggestion: Suggestion;
  currentProfileId: string;
  onUpdate: () => void;
  isActionNeeded?: boolean;
}

export default function SuggestionCard({ suggestion, currentProfileId, onUpdate, isActionNeeded = false }: SuggestionCardProps) {
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [showContinuationModal, setShowContinuationModal] = useState(false);
  const [showMiddlePersonModal, setShowMiddlePersonModal] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);

  const isProfileOne = suggestion.profile_one_id === currentProfileId;
  const isProfileTwo = suggestion.profile_two_id === currentProfileId;
  const otherProfile = (isProfileOne ? suggestion.profile_two : suggestion.profile_one) as any;
  const suggester = suggestion.suggester_profile as any;

  const myStatus = isProfileOne ? suggestion.profile_one_status : suggestion.profile_two_status;
  const otherStatus = isProfileOne ? suggestion.profile_two_status : suggestion.profile_one_status;

  const contactInfo = suggestionService.getContactInfo(suggestion, currentProfileId);

  const handleViewProfile = (profileId: string) => {
    router.push(`/profile-details?id=${profileId}&hideActions=true`);
  };

  const handleAccept = () => {
    setShowContinuationModal(true);
  };

  const handleContinuationChoice = async (choice: 'by_themselves' | 'with_middle_person') => {
    if (choice === 'with_middle_person') {
      setShowContinuationModal(false);
      setShowMiddlePersonModal(true);
      return;
    }

    setIsResponding(true);
    try {
      await suggestionService.respondToSuggestion(suggestion.id, 'accepted');
      await suggestionService.setContinuationChoice(suggestion.id, choice);
      setShowContinuationModal(false);
      Alert.alert('Success', 'You have accepted the suggestion!');
      onUpdate();
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      Alert.alert('Error', 'Failed to accept suggestion');
    } finally {
      setIsResponding(false);
    }
  };

  const handleMiddlePersonSelected = async (person: any) => {
    setShowMiddlePersonModal(false);
    setIsResponding(true);
    try {
      await suggestionService.respondToSuggestion(suggestion.id, 'accepted');
      await suggestionService.setContinuationChoice(suggestion.id, 'with_middle_person', person.id);
      Alert.alert('Success', 'You have accepted the suggestion!');
      onUpdate();
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      Alert.alert('Error', 'Failed to accept suggestion');
    } finally {
      setIsResponding(false);
    }
  };

  const handleReject = async () => {
    setIsResponding(true);
    try {
      await suggestionService.respondToSuggestion(suggestion.id, 'rejected', rejectNote);
      setShowRejectNote(false);
      Alert.alert('Suggestion Declined', 'The suggestion has been declined.');
      onUpdate();
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      Alert.alert('Error', 'Failed to reject suggestion');
    } finally {
      setIsResponding(false);
    }
  };

  const handleSendSMS = (phone: string) => {
    Linking.openURL(`sms:${phone}`);
  };

  const handleSendWhatsApp = (whatsapp: string) => {
    Linking.openURL(`https://wa.me/${whatsapp.replace(/\D/g, '')}`);
  };

  const handleSendEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleCopyPhone = async (phone: string) => {
    await Clipboard.setStringAsync(phone);
    Alert.alert('Copied!', 'Phone number copied to clipboard');
  };

  const getProfileImage = (profile: any) => {
    if (Array.isArray(profile?.pictures) && profile.pictures.length > 0) {
      return profileService.getImageUrl(profile.pictures[0]);
    }
    return null;
  };

  const renderStatus = () => {
    if (myStatus === 'pending') {
      return (
        <View style={[styles.statusBadge, styles.pendingBadge]}>
          <Text style={styles.statusText}>⏳ Action Needed</Text>
        </View>
      );
    }
    if (myStatus === 'accepted' && otherStatus === 'pending') {
      return (
        <View style={[styles.statusBadge, styles.waitingBadge]}>
          <Text style={styles.statusText}>⏳ Waiting for {otherProfile?.first_name}</Text>
        </View>
      );
    }
    if (myStatus === 'accepted' && otherStatus === 'accepted') {
      return (
        <View style={[styles.statusBadge, styles.matchedBadge]}>
          <Text style={styles.statusText}>✓ Both Accepted</Text>
        </View>
      );
    }
    if (myStatus === 'rejected' || otherStatus === 'rejected') {
      return (
        <View style={[styles.statusBadge, styles.rejectedBadge]}>
          <Text style={styles.statusText}>✗ Declined</Text>
        </View>
      );
    }
  };

  const needsContinuationChoice = myStatus === 'accepted' && otherStatus === 'accepted' && 
    (isProfileOne ? !suggestion.profile_one_continuation_choice : !suggestion.profile_two_continuation_choice);

  return (
    <View style={[styles.card, isActionNeeded && styles.actionNeededCard]}>
      {/* Action Needed Banner */}
      {isActionNeeded && myStatus === 'pending' && (
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.suggestionText}>
          <Text style={styles.boldText}>{suggester?.first_name} {suggester?.last_name}</Text>
          {' '}suggests you with{' '}
          <Text style={styles.boldText}>{otherProfile?.first_name} {otherProfile?.last_name}</Text>
        </Text>
        {renderStatus()}
      </View>

      {/* Learn More Button */}
      <TouchableOpacity
        style={styles.learnMoreButton}
        onPress={() => setShowLearnMore(true)}
      >
        <Ionicons name="information-circle-outline" size={20} color="#03a9f4" />
        <Text style={styles.learnMoreText}>Learn More</Text>
      </TouchableOpacity>

      {/* Action Buttons - Pending */}
      {myStatus === 'pending' && !showRejectNote && (
        <View style={styles.actionsSection}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={() => setShowRejectNote(true)}
              disabled={isResponding}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              disabled={isResponding}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Reject Note Input */}
      {showRejectNote && (
        <View style={styles.actionsSection}>
          <TextInput
            style={styles.noteInput}
            placeholder="Optional note to suggester..."
            value={rejectNote}
            onChangeText={setRejectNote}
            multiline
            numberOfLines={3}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowRejectNote(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={handleReject}
              disabled={isResponding}
            >
              {isResponding ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Confirm Decline</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Continuation Choice Needed */}
      {needsContinuationChoice && !isActionNeeded && (
        <TouchableOpacity
          style={styles.bigContinueButton}
          onPress={() => setShowContinuationModal(true)}
          disabled={isResponding}
        >
          <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
          <Text style={styles.bigContinueButtonText}>Choose How to Continue</Text>
        </TouchableOpacity>
      )}

      {/* Contact Info */}
      {suggestion.status === 'completed' && contactInfo.shouldShowContact && contactInfo.contactPerson && (
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

      {/* Learn More Modal */}
      <Modal
        visible={showLearnMore}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLearnMore(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLearnMore(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Suggestion Details</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Suggester Profile */}
            <View style={styles.profileSection}>
              <Text style={styles.sectionTitle}>Suggested by</Text>
              {suggester && (
                <TouchableOpacity
                  style={styles.profileCard}
                  onPress={() => {
                    setShowLearnMore(false);
                    handleViewProfile(suggester.id);
                  }}
                >
                  {getProfileImage(suggester) ? (
                    <Image source={{ uri: getProfileImage(suggester)! }} style={styles.profileImage} />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Ionicons name="person" size={30} color="#ccc" />
                    </View>
                  )}
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{suggester?.first_name} {suggester.last_name}</Text>
                    <Text style={styles.profileDetails}>{suggester.age} • {suggester.gender}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>

            {/* Note */}
            {suggestion.note && suggester && (
              <View style={styles.noteSection}>
                <Text style={styles.sectionTitle}>Note from {suggester.first_name}</Text>
                <View style={styles.noteCard}>
                  <Text style={styles.noteText}>{suggestion.note}</Text>
                </View>
              </View>
            )}

            {/* Other Profile */}
            <View style={styles.profileSection}>
              <Text style={styles.sectionTitle}>Match Profile</Text>
              <TouchableOpacity
                style={styles.profileCard}
                onPress={() => {
                  setShowLearnMore(false);
                  if (otherProfile?.id) {
                    handleViewProfile(otherProfile.id);
                  }
                }}
              >
                {getProfileImage(otherProfile) ? (
                  <Image source={{ uri: getProfileImage(otherProfile)! }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="person" size={30} color="#ccc" />
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{otherProfile?.first_name} {otherProfile?.last_name}</Text>
                  <Text style={styles.profileDetails}>{otherProfile?.age} • {otherProfile?.gender}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modals */}
      <MiddlePersonSelectionModal
        visible={showMiddlePersonModal}
        excludedProfileId={currentProfileId}
        requestedProfileId={otherProfile.id}
        onSelect={handleMiddlePersonSelected}
        onCancel={() => setShowMiddlePersonModal(false)}
      />

      {otherProfile && (
        <ContinuationChoiceModal
          visible={showContinuationModal}
          profileName={`${otherProfile?.first_name} ${otherProfile?.last_name}`}
          onSelectChoice={handleContinuationChoice}
          onCancel={() => setShowContinuationModal(false)}
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
  actionBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    marginBottom: 12,
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '600',
    color: '#03a9f4',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  waitingBadge: {
    backgroundColor: '#E3F2FD',
  },
  matchedBadge: {
    backgroundColor: '#E8F5E9',
  },
  rejectedBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF0F5',
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#03a9f4',
  },
  actionsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
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
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#FF6B6B',
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
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
  contactSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 12,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  profileSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  noteSection: {
    marginBottom: 24,
  },
  noteCard: {
    backgroundColor: '#FFF9C4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFF176',
  },
  noteText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
});

