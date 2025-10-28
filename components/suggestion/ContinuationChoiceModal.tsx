import { Ionicons } from '@expo/vector-icons';
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
import { suggestionService } from '../../lib/suggestionService';

interface ContinuationChoiceModalProps {
  visible: boolean;
  suggestionId: string;
  userType: 'suggester' | 'suggested';
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContinuationChoiceModal({
  visible,
  suggestionId,
  userType,
  onClose,
  onSuccess,
}: ContinuationChoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedChoice, setSelectedChoice] = useState<
    'by_themselves' | 'with_middle_person' | null
  >(null);

  useEffect(() => {
    if (visible) {
      loadUserProfile();
    }
  }, [visible]);

  const loadUserProfile = async () => {
    const result = await profileService.getProfile();
    if (result.success && result.profile) {
      setUserProfile(result.profile);
    }
  };

  const handleChoiceSelect = (choice: 'by_themselves' | 'with_middle_person') => {
    setSelectedChoice(choice);
  };

  const handleConfirm = async () => {
    if (!selectedChoice) {
      Alert.alert('Please Select', 'Please choose how you want to continue');
      return;
    }

    // Check if user has a matchmaker when choosing 'with_middle_person'
    if (selectedChoice === 'with_middle_person' && !userProfile?.matchmaker_id) {
      Alert.alert(
        'No Middle Person Assigned',
        'You need to have a middle person assigned to your profile to continue with a middle person. Would you like to go to your profile to add one?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Profile',
            onPress: () => {
              onClose();
              // Navigate to profile screen
            },
          },
        ]
      );
      return;
    }

    setLoading(true);

    try {
      const result = await suggestionService.updateContinuationChoice(
        suggestionId,
        userType,
        selectedChoice,
        selectedChoice === 'with_middle_person' ? userProfile.matchmaker_id : undefined
      );

      if (result.success) {
        Alert.alert(
          'Choice Saved',
          'Your continuation preference has been saved. Once the other person makes their choice, contact information will be shared accordingly.',
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedChoice(null);
                onSuccess();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to save your choice');
      }
    } catch (error) {
      console.error('Error saving continuation choice:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedChoice(null);
    onClose();
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
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="people" size={32} color="#007AFF" />
              <Text style={styles.title}>How would you like to continue?</Text>
              <Text style={styles.subtitle}>
                Choose how you want to proceed with this match
              </Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {/* Option 1: By Themselves */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedChoice === 'by_themselves' && styles.selectedOption,
                ]}
                onPress={() => handleChoiceSelect('by_themselves')}
                activeOpacity={0.7}
              >
                <View style={styles.optionHeader}>
                  <View
                    style={[
                      styles.radioButton,
                      selectedChoice === 'by_themselves' && styles.radioButtonSelected,
                    ]}
                  >
                    {selectedChoice === 'by_themselves' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <View style={styles.optionIconContainer}>
                    <Ionicons name="person" size={28} color="#007AFF" />
                  </View>
                </View>
                <Text style={styles.optionTitle}>Continue by Myself</Text>
                <Text style={styles.optionDescription}>
                  Receive direct contact information of the other person
                </Text>
                <View style={styles.optionDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.detailText}>Direct communication</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.detailText}>No intermediary</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Option 2: With Middle Person */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedChoice === 'with_middle_person' && styles.selectedOption,
                ]}
                onPress={() => handleChoiceSelect('with_middle_person')}
                activeOpacity={0.7}
              >
                <View style={styles.optionHeader}>
                  <View
                    style={[
                      styles.radioButton,
                      selectedChoice === 'with_middle_person' && styles.radioButtonSelected,
                    ]}
                  >
                    {selectedChoice === 'with_middle_person' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <View style={styles.optionIconContainer}>
                    <Ionicons name="people" size={28} color="#007AFF" />
                  </View>
                </View>
                <Text style={styles.optionTitle}>Continue with a middle person</Text>
                <Text style={styles.optionDescription}>
                  Your middle person will facilitate communication
                </Text>
                <View style={styles.optionDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.detailText}>Help with communication</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.detailText}>Privacy maintained</Text>
                  </View>
                </View>
                {!userProfile?.matchmaker_id && (
                  <View style={styles.warningBanner}>
                    <Ionicons name="warning" size={16} color="#FF9800" />
                    <Text style={styles.warningText}>
                      You need to add a middle person to your profile first
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                Contact information will only be shared after both parties make their choice
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!selectedChoice || loading) && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!selectedChoice || loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Choice</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  optionDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#F57C00',
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

