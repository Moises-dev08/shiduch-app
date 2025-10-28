import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ContactInfoDisplay from '../suggestion/ContactInfoDisplay';
import ContinuationChoiceModal from '../suggestion/ContinuationChoiceModal';

interface ReceivedSuggestionItemProps {
  suggestionId: string;
  suggesterProfileId: string;
  suggesterName: string;
  suggesterPicture?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
  notes?: string;
  suggestedContinuationChoice?: 'by_themselves' | 'with_middle_person';
  onStatusChange?: () => void;
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

export default function ReceivedSuggestionItem({
  suggestionId,
  suggesterProfileId,
  suggesterName,
  suggesterPicture,
  status,
  createdAt,
  notes,
  suggestedContinuationChoice,
  onStatusChange,
}: ReceivedSuggestionItemProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentChoice, setCurrentChoice] = useState(suggestedContinuationChoice);
  const [showContinuationModal, setShowContinuationModal] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Sync local state with props when they change (after refresh)
  useEffect(() => {
    setCurrentStatus(status);
    setCurrentChoice(suggestedContinuationChoice);
  }, [status, suggestedContinuationChoice]);

  const showChoiceButton = currentStatus === 'accepted' && !currentChoice;
  
  const config = statusConfig[currentStatus];
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleViewProfile = () => {
    if (!suggesterProfileId || suggesterProfileId === '') {
      Alert.alert('Error', 'Profile not available');
      return;
    }
    router.push(`/profile-details?profileId=${suggesterProfileId}&hideActions=true`);
  };

  const handleStatusUpdate = async (newStatus: 'accepted' | 'rejected') => {
    if (newStatus === 'rejected') {
      Alert.alert(
        'Reject Suggestion',
        'Are you sure you want to reject this suggestion?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              try {
                const { suggestionService } = await import('../../lib/suggestionService');
                const result = await suggestionService.updateSuggestionStatus(suggestionId, newStatus);
                
                if (result.success) {
                  setCurrentStatus(newStatus);
                  Alert.alert('Success', 'Suggestion rejected');
                  onStatusChange?.();
                } else {
                  Alert.alert('Error', result.error || 'Failed to update suggestion status');
                }
              } catch (error) {
                console.error('Error updating suggestion:', error);
                Alert.alert('Error', 'An unexpected error occurred');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } else {
      // For accept, update status and show Choose button
      Alert.alert(
        'Accept Suggestion',
        'Are you sure you want to accept this suggestion?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Accept',
            onPress: async () => {
              setLoading(true);
              try {
                const { suggestionService } = await import('../../lib/suggestionService');
                const result = await suggestionService.updateSuggestionStatus(suggestionId, 'accepted');
                
                if (result.success) {
                  setCurrentStatus('accepted');
                  Alert.alert('Success', 'Suggestion accepted! Click "Choose" to decide how to continue.');
                  onStatusChange?.();
                } else {
                  Alert.alert('Error', result.error || 'Failed to accept suggestion');
                }
              } catch (error) {
                console.error('Error accepting suggestion:', error);
                Alert.alert('Error', 'An unexpected error occurred');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    }
  };

  const handleContinuationModalClose = () => {
    setShowContinuationModal(false);
    onStatusChange?.();
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.profileSection}
          onPress={handleViewProfile}
          activeOpacity={0.7}
        >
          {suggesterPicture ? (
            <Image source={{ uri: suggesterPicture }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.placeholderImage]}>
              <Ionicons name="person" size={24} color="#999" />
            </View>
          )}
          
          <View style={styles.profileInfo}>
            <Text style={styles.infoText}>
              <Text style={styles.profileName}>{suggesterName}</Text>
              {' suggested you for a setup'}
            </Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
            {notes && <Text style={styles.notesText} numberOfLines={2}>{notes}</Text>}
            <Text style={styles.viewProfileHint}>Tap to view profile</Text>
          </View>
        </TouchableOpacity>
        
        {currentStatus === 'pending' ? (
          <View style={styles.actionButtons}>
            {loading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleStatusUpdate('accepted')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleStatusUpdate('rejected')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : showChoiceButton ? (
          <TouchableOpacity
            style={styles.choiceButton}
            onPress={() => setShowContinuationModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
            <Text style={styles.choiceButtonText}>Choose</Text>
          </TouchableOpacity>
        ) : currentStatus === 'completed' ? (
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => setShowContactInfo(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: config.backgroundColor }]}>
            <Ionicons name={config.icon} size={16} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        )}
      </View>

      <ContinuationChoiceModal
        visible={showContinuationModal}
        suggestionId={suggestionId}
        userType="suggested"
        onClose={handleContinuationModalClose}
        onSuccess={handleContinuationModalClose}
      />

      <ContactInfoDisplay
        visible={showContactInfo}
        suggestionId={suggestionId}
        onClose={() => setShowContactInfo(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  infoText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
  },
  profileName: {
    fontWeight: '600',
    color: '#007AFF',
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  viewProfileHint: {
    fontSize: 11,
    color: '#007AFF',
    marginTop: 6,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#2196F3',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  contactButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  choiceButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});

