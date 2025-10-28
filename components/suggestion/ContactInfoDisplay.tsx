import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { profileService } from '../../lib/profileService';
import { suggestionService, SuggestionWithDetails } from '../../lib/suggestionService';

interface ContactInfoDisplayProps {
  visible: boolean;
  suggestionId: string;
  onClose: () => void;
}

interface ContactInfo {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  role: string;
}

export default function ContactInfoDisplay({
  visible,
  suggestionId,
  onClose,
}: ContactInfoDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState<SuggestionWithDetails | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [contactsToShow, setContactsToShow] = useState<ContactInfo[]>([]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, suggestionId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load current user profile
      const profileResult = await profileService.getProfile();
      if (!profileResult.success || !profileResult.profile) {
        Alert.alert('Error', 'Failed to load your profile');
        onClose();
        return;
      }
      setCurrentUserProfile(profileResult.profile);

      // Load suggestion with contact info
      const suggestionResult = await suggestionService.getSuggestionWithContactInfo(suggestionId);
      if (!suggestionResult.success || !suggestionResult.suggestion) {
        Alert.alert('Error', 'Failed to load suggestion details');
        onClose();
        return;
      }
      setSuggestion(suggestionResult.suggestion);

      // Determine what contacts to show
      const contacts = determineContactsToShow(
        suggestionResult.suggestion,
        profileResult.profile.id
      );
      setContactsToShow(contacts);
    } catch (error) {
      console.error('Error loading contact info:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const determineContactsToShow = (
    sug: SuggestionWithDetails,
    currentProfileId: string
  ): ContactInfo[] => {
    const contacts: ContactInfo[] = [];
    
    const isSuggester = sug.suggester_id === currentProfileId;
    const suggesterChoice = sug.suggester_continuation_choice;
    const suggestedChoice = sug.suggested_continuation_choice;

    if (!suggesterChoice || !suggestedChoice) {
      return contacts; // Not ready yet
    }

    // Case 1: Both chose "by_themselves"
    if (suggesterChoice === 'by_themselves' && suggestedChoice === 'by_themselves') {
      if (isSuggester) {
        // Show the suggested person's contact
        if (sug.suggested_profile) {
          contacts.push({
            name: `${sug.suggested_profile.first_name} ${sug.suggested_profile.last_name}`,
            email: sug.suggested_profile.email,
            phone: sug.suggested_profile.phone,
            whatsapp: sug.suggested_profile.whatsapp,
            role: 'Direct Contact',
          });
        }
      } else {
        // Show the suggester's contact
        if (sug.suggester_profile) {
          contacts.push({
            name: `${sug.suggester_profile.first_name} ${sug.suggester_profile.last_name}`,
            email: sug.suggester_profile.email,
            phone: sug.suggester_profile.phone,
            whatsapp: sug.suggester_profile.whatsapp,
            role: 'Direct Contact',
          });
        }
      }
    }
    // Case 2: One chose "by_themselves", other chose "with_middle_person"
    else if (
      (suggesterChoice === 'by_themselves' && suggestedChoice === 'with_middle_person') ||
      (suggesterChoice === 'with_middle_person' && suggestedChoice === 'by_themselves')
    ) {
      if (isSuggester) {
        if (suggesterChoice === 'by_themselves') {
          // Suggester chose by_themselves, show them the suggested person's matchmaker
          if (sug.suggested_matchmaker) {
            contacts.push({
              name: `${sug.suggested_matchmaker.first_name} ${sug.suggested_matchmaker.last_name}`,
              email: sug.suggested_matchmaker.email,
              phone: sug.suggested_matchmaker.phone,
              whatsapp: sug.suggested_matchmaker.whatsapp,
              role: 'Matchmaker',
            });
          }
        } else {
          // Suggester chose with_middle_person, their matchmaker gets the suggested person's contact
          if (sug.suggested_profile) {
            contacts.push({
              name: `${sug.suggested_profile.first_name} ${sug.suggested_profile.last_name}`,
              email: sug.suggested_profile.email,
              phone: sug.suggested_profile.phone,
              whatsapp: sug.suggested_profile.whatsapp,
              role: 'Other Person (share with your matchmaker)',
            });
          }
        }
      } else {
        // Suggested person
        if (suggestedChoice === 'by_themselves') {
          // Suggested chose by_themselves, show them the suggester's matchmaker
          if (sug.suggester_matchmaker) {
            contacts.push({
              name: `${sug.suggester_matchmaker.first_name} ${sug.suggester_matchmaker.last_name}`,
              email: sug.suggester_matchmaker.email,
              phone: sug.suggester_matchmaker.phone,
              whatsapp: sug.suggester_matchmaker.whatsapp,
              role: 'Matchmaker',
            });
          }
        } else {
          // Suggested chose with_middle_person, their matchmaker gets the suggester's contact
          if (sug.suggester_profile) {
            contacts.push({
              name: `${sug.suggester_profile.first_name} ${sug.suggester_profile.last_name}`,
              email: sug.suggester_profile.email,
              phone: sug.suggester_profile.phone,
              whatsapp: sug.suggester_profile.whatsapp,
              role: 'Other Person (share with your matchmaker)',
            });
          }
        }
      }
    }
    // Case 3: Both chose "with_middle_person"
    else if (suggesterChoice === 'with_middle_person' && suggestedChoice === 'with_middle_person') {
      if (isSuggester) {
        // Show the suggested person's matchmaker
        if (sug.suggested_matchmaker) {
          contacts.push({
            name: `${sug.suggested_matchmaker.first_name} ${sug.suggested_matchmaker.last_name}`,
            email: sug.suggested_matchmaker.email,
            phone: sug.suggested_matchmaker.phone,
            whatsapp: sug.suggested_matchmaker.whatsapp,
            role: 'Matchmaker (share with your matchmaker)',
          });
        }
      } else {
        // Show the suggester's matchmaker
        if (sug.suggester_matchmaker) {
          contacts.push({
            name: `${sug.suggester_matchmaker.first_name} ${sug.suggester_matchmaker.last_name}`,
            email: sug.suggester_matchmaker.email,
            phone: sug.suggester_matchmaker.phone,
            whatsapp: sug.suggester_matchmaker.whatsapp,
            role: 'Matchmaker (share with your matchmaker)',
          });
        }
      }
    }

    return contacts;
  };

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Contact Information</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading contact information...</Text>
            </View>
          ) : contactsToShow.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="information-circle-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>Not Yet Available</Text>
              <Text style={styles.emptyText}>
                Contact information will be available once both parties make their continuation choice
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.content}>
              {/* Match Summary */}
              {suggestion && (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <Ionicons name="heart" size={24} color="#e91e63" />
                    <Text style={styles.summaryTitle}>Match Summary</Text>
                  </View>
                  <View style={styles.summaryContent}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Suggester:</Text>
                      <Text style={styles.summaryValue}>
                        {suggestion.suggester_profile
                          ? `${suggestion.suggester_profile.first_name} ${suggestion.suggester_profile.last_name}`
                          : 'Unknown'}
                      </Text>
                    </View>
                    <View style={styles.summaryDivider}>
                      <Ionicons name="heart-outline" size={20} color="#e91e63" />
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Suggested:</Text>
                      <Text style={styles.summaryValue}>
                        {suggestion.suggested_profile
                          ? `${suggestion.suggested_profile.first_name} ${suggestion.suggested_profile.last_name}`
                          : 'Unknown'}
                      </Text>
                    </View>
                    {(suggestion.suggester_matchmaker || suggestion.suggested_matchmaker) && (
                      <>
                        <View style={styles.summaryDivider} />
                        <Text style={styles.summaryNote}>
                          {suggestion.suggester_matchmaker && suggestion.suggested_matchmaker
                            ? '👥 Both parties are working with matchmakers'
                            : suggestion.suggester_matchmaker
                            ? '👤 Suggester is working with a matchmaker'
                            : '👤 Suggested person is working with a matchmaker'}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              )}

              {/* Contact Information */}
              {contactsToShow.map((contact, index) => (
                <View key={index} style={styles.contactCard}>
                  <View style={styles.contactHeader}>
                    <Ionicons name="person-circle" size={48} color="#007AFF" />
                    <View style={styles.contactHeaderText}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactRole}>{contact.role}</Text>
                    </View>
                  </View>

                  <View style={styles.contactActions}>
                    {contact.email && (
                      <View style={styles.contactField}>
                        <View style={styles.fieldContent}>
                          <Ionicons name="mail" size={20} color="#007AFF" />
                          <Text style={styles.fieldText}>{contact.email}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => copyToClipboard(contact.email || '', 'Email')}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="copy-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {contact.phone && (
                      <View style={styles.contactField}>
                        <View style={styles.fieldContent}>
                          <Ionicons name="call" size={20} color="#007AFF" />
                          <Text style={styles.fieldText}>{contact.phone}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => copyToClipboard(contact.phone || '', 'Phone')}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="copy-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {contact.whatsapp && (
                      <View style={styles.contactField}>
                        <View style={styles.fieldContent}>
                          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                          <Text style={styles.fieldText}>{contact.whatsapp}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => copyToClipboard(contact.whatsapp || '', 'WhatsApp')}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="copy-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <Text style={styles.infoText}>
                  Please use this contact information respectfully and according to the agreed terms
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#fff9fc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e91e63',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e91e63',
  },
  summaryContent: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    minWidth: 80,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  summaryDivider: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryNote: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: 8,
  },
  contactCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
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
  contactActions: {
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#007AFF',
    lineHeight: 18,
  },
});

