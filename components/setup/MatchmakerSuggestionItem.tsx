import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MatchmakerSuggestionItemProps {
  suggesterName: string;
  suggesterPicture?: string;
  suggestedName: string;
  suggestedPicture?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
  notes?: string;
  suggesterContinuationChoice?: 'by_themselves' | 'with_middle_person' | null;
  suggestedContinuationChoice?: 'by_themselves' | 'with_middle_person' | null;
  matchmakerSide: 'suggester' | 'suggested'; // Which side is the matchmaker connected to
  suggesterContact?: { email?: string; phone?: string; whatsapp?: string };
  suggestedContact?: { email?: string; phone?: string; whatsapp?: string };
  suggesterMatchmakerContact?: { name: string; email?: string; phone?: string; whatsapp?: string };
  suggestedMatchmakerContact?: { name: string; email?: string; phone?: string; whatsapp?: string };
}

const statusConfig = {
  pending: {
    label: 'Pending response',
    icon: 'time-outline' as const,
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  accepted: {
    label: 'Interested',
    icon: 'checkmark-circle' as const,
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  rejected: {
    label: 'Not Interested',
    icon: 'close-circle' as const,
    color: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  completed: {
    label: 'Completed',
    icon: 'checkmark-done-circle' as const,
    color: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
};

export default function MatchmakerSuggestionItem({
  suggesterName,
  suggesterPicture,
  suggestedName,
  suggestedPicture,
  status,
  createdAt,
  notes,
  suggesterContinuationChoice,
  suggestedContinuationChoice,
  matchmakerSide,
  suggesterContact,
  suggestedContact,
  suggesterMatchmakerContact,
  suggestedMatchmakerContact,
}: MatchmakerSuggestionItemProps) {
  const [showContactModal, setShowContactModal] = useState(false);
  const config = statusConfig[status];
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const getChoiceText = (choice: 'by_themselves' | 'with_middle_person' | null | undefined) => {
    if (!choice) return 'Deciding...';
    return choice === 'by_themselves' ? 'By themselve' : 'With middle person';
  };

  const getChoiceIcon = (choice: 'by_themselves' | 'with_middle_person' | null | undefined) => {
    if (!choice) return 'time-outline';
    return choice === 'by_themselves' ? 'person' : 'people';
  };

  // Determine which contact to show based on matchmaker side and continuation choices
  const getContactToShow = () => {
    if (status !== 'completed' || !suggesterContinuationChoice || !suggestedContinuationChoice) {
      return null;
    }

    // If matchmaker is for suggester, show suggested person's contact
    if (matchmakerSide === 'suggester') {
      // If suggested chose by_themselves, show their direct contact
      if (suggestedContinuationChoice === 'by_themselves') {
        return { ...suggestedContact, name: suggestedName, role: 'The other person' };
      }
      // If suggested chose with_middle_person, show their matchmaker's contact
      if (suggestedMatchmakerContact) {
        return { ...suggestedMatchmakerContact, role: 'Their middle person' };
      }
    }

    // If matchmaker is for suggested, show suggester's contact
    if (matchmakerSide === 'suggested') {
      // If suggester chose by_themselves, show their direct contact
      if (suggesterContinuationChoice === 'by_themselves') {
        return { ...suggesterContact, name: suggesterName, role: 'The other person' };
      }
      // If suggester chose with_middle_person, show their matchmaker's contact
      if (suggesterMatchmakerContact) {
        return { ...suggesterMatchmakerContact, role: 'Their middle person' };
      }
    }

    return null;
  };

  const contactInfo = getContactToShow();

  const copyToClipboard = async (value: string, label: string) => {
    if (!value) {
      Alert.alert('Not Available', 'This contact information is not available');
      return;
    }

    try {
      await Clipboard.setStringAsync(value);
      Alert.alert('Copied!', `${label} has been copied to clipboard`);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handleCardPress = () => {
    if (status === 'completed' && contactInfo) {
      setShowContactModal(true);
    } else if (status === 'completed') {
      Alert.alert('Awaiting Choices', 'Waiting for both parties to choose how they want to continue.');
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.container} 
        onPress={handleCardPress}
        activeOpacity={0.7}
        disabled={status !== 'completed'}
      >
        <View style={styles.content}>
        {/* Both Accepted Banner */}
        {(status === 'accepted' || status === 'completed') && (
          <View style={styles.acceptedBanner}>
            <Ionicons name="heart" size={16} color="#E91E63" />
            <Text style={styles.acceptedText}>Both accepted the match!</Text>
            <Ionicons name="heart" size={16} color="#E91E63" />
          </View>
        )}

        <View style={styles.profilesRow}>
          <View style={[styles.profileItem, matchmakerSide === 'suggester' && styles.myClientHighlight]}>
            {matchmakerSide === 'suggester' && (
              <View style={styles.myClientBadge}>
                <Ionicons name="star" size={10} color="#FFC107" />
                <Text style={styles.myClientBadgeText}>My Client</Text>
              </View>
            )}
            {suggesterPicture ? (
              <Image source={{ uri: suggesterPicture }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImage, styles.placeholderImage]}>
                <Ionicons name="person" size={20} color="#999" />
              </View>
            )}
            <Text style={styles.profileName} numberOfLines={1}>{suggesterName}</Text>
          </View>

          {/* Connecting Line Animation */}
          <View style={styles.connectionContainer}>
            <View style={styles.connectionLine} />
            <View style={styles.heartCircle}>
              <Ionicons name="heart" size={18} color="#fff" />
            </View>
            <View style={styles.connectionLine} />
          </View>

          <View style={[styles.profileItem, matchmakerSide === 'suggested' && styles.myClientHighlight]}>
            {matchmakerSide === 'suggested' && (
              <View style={styles.myClientBadge}>
                <Ionicons name="star" size={10} color="#FFC107" />
                <Text style={styles.myClientBadgeText}>My Client</Text>
              </View>
            )}
            {suggestedPicture ? (
              <Image source={{ uri: suggestedPicture }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImage, styles.placeholderImage]}>
                <Ionicons name="person" size={20} color="#999" />
              </View>
            )}
            <Text style={styles.profileName} numberOfLines={1}>{suggestedName}</Text>
          </View>
        </View>

        <Text style={styles.dateText}>{formattedDate}</Text>
        {notes && <Text style={styles.notesText} numberOfLines={2}>{notes}</Text>}
        
        {/* Continuation Choices */}
        {status === 'accepted' && (
          <View style={styles.choicesContainer}>
            <Text style={styles.choicesTitle}>How they want to continue:</Text>
            <View style={styles.choiceRow}>
              <View style={styles.choiceItem}>
                <Ionicons name={getChoiceIcon(suggesterContinuationChoice)} size={16} color="#666" />
                <Text style={styles.choiceLabel}>{suggesterName.split(' ')[0]}:</Text>
                <Text style={styles.choiceValue}>{getChoiceText(suggesterContinuationChoice)}</Text>
              </View>
              <View style={styles.choiceItem}>
                <Ionicons name={getChoiceIcon(suggestedContinuationChoice)} size={16} color="#666" />
                <Text style={styles.choiceLabel}>{suggestedName.split(' ')[0]}:</Text>
                <Text style={styles.choiceValue}>{getChoiceText(suggestedContinuationChoice)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Match Summary for Completed */}
        {status === 'completed' && suggesterContinuationChoice && suggestedContinuationChoice && (
          <View style={styles.summaryContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.summaryText}>
              {suggesterContinuationChoice === 'by_themselves' && suggestedContinuationChoice === 'by_themselves' 
                ? 'Both are continuing by themselves'
                : suggesterContinuationChoice === 'with_middle_person' && suggestedContinuationChoice === 'with_middle_person'
                ? 'Both want middle person assistance'
                : 'One wants middle person, one by themselves'}
            </Text>
          </View>
        )}

        {/* Tap to view contact hint */}
        {status === 'completed' && contactInfo && (
          <View style={styles.tapHint}>
            <Ionicons name="information-circle" size={16} color="#007AFF" />
            <Text style={styles.tapHintText}>Tap card to view contact information</Text>
          </View>
        )}
        
        <View style={[styles.statusBadge, { backgroundColor: config.backgroundColor }]}>
          <Ionicons name={config.icon} size={14} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>
    </TouchableOpacity>

      {/* Contact Information Modal */}
      <Modal
        visible={showContactModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contact Information</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {contactInfo && (
                <>
                  <View style={styles.contactHeader}>
                    <Ionicons name="person-circle" size={48} color="#007AFF" />
                    <View style={styles.contactHeaderText}>
                      <Text style={styles.contactName}>{contactInfo.name}</Text>
                      <Text style={styles.contactRole}>{contactInfo.role}</Text>
                    </View>
                  </View>

                  <View style={styles.contactFields}>
                    {contactInfo.email && (
                      <View style={styles.contactField}>
                        <View style={styles.fieldContent}>
                          <Ionicons name="mail" size={20} color="#007AFF" />
                          <Text style={styles.fieldText}>{contactInfo.email}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => copyToClipboard(contactInfo.email || '', 'Email')}
                        >
                          <Ionicons name="copy-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {contactInfo.phone && (
                      <View style={styles.contactField}>
                        <View style={styles.fieldContent}>
                          <Ionicons name="call" size={20} color="#007AFF" />
                          <Text style={styles.fieldText}>{contactInfo.phone}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => copyToClipboard(contactInfo.phone || '', 'Phone')}
                        >
                          <Ionicons name="copy-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {contactInfo.whatsapp && (
                      <View style={styles.contactField}>
                        <View style={styles.fieldContent}>
                          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                          <Text style={styles.fieldText}>{contactInfo.whatsapp}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => copyToClipboard(contactInfo.whatsapp || '', 'WhatsApp')}
                        >
                          <Ionicons name="copy-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  profilesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  profileItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 6,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  heartIcon: {
    marginHorizontal: 8,
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  choicesContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  choicesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  choiceRow: {
    gap: 8,
  },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  choiceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  choiceValue: {
    fontSize: 13,
    color: '#666',
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FCE4EC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  acceptedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E91E63',
  },
  myClientHighlight: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFC107',
    padding: 8,
  },
  myClientBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFC107',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  myClientBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  connectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  connectionLine: {
    width: 20,
    height: 2,
    backgroundColor: '#E91E63',
  },
  heartCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  tapHintText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  contactHeaderText: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  contactRole: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  contactFields: {
    gap: 12,
  },
  contactField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  fieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fieldText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  copyButton: {
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

