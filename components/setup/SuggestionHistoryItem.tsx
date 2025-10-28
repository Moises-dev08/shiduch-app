import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { suggestionService } from '../../lib/suggestionService';
import ContactInfoDisplay from '../suggestion/ContactInfoDisplay';
import ContinuationChoiceModal from '../suggestion/ContinuationChoiceModal';

interface SuggestionHistoryItemProps {
  suggestionId: string;
  profileId: string;
  profileName: string;
  profilePicture?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
  matchmakerName?: string;
  suggesterContinuationChoice?: 'by_themselves' | 'with_middle_person';
  onRefresh?: () => void;
}

const statusConfig = {
  pending: {
    label: 'Pending response',
    icon: 'time-outline' as const,
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  accepted: {
    label: 'Answered',
    icon: 'checkmark-circle' as const,
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  rejected: {
    label: 'Rejected',
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

export default function SuggestionHistoryItem({
  suggestionId,
  profileId,
  profileName,
  profilePicture,
  status,
  createdAt,
  matchmakerName,
  suggesterContinuationChoice,
  onRefresh,
}: SuggestionHistoryItemProps) {
  const router = useRouter();
  const [showContinuationModal, setShowContinuationModal] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const config = statusConfig[status];
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleViewProfile = () => {
    if (!profileId || profileId === '') {
      Alert.alert('Error', 'Profile not available');
      return;
    }
    router.push(`/profile-details?profileId=${profileId}&hideActions=true`);
  };

  const handleMakeChoice = () => {
    setShowContinuationModal(true);
  };

  const handleContinuationModalClose = () => {
    setShowContinuationModal(false);
    onRefresh?.();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Suggestion',
      'Are you sure you want to delete this suggestion? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const result = await suggestionService.deleteSuggestion(suggestionId);
            setIsDeleting(false);

            if (result.success) {
              Alert.alert('Success', 'Suggestion deleted successfully');
              onRefresh?.();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete suggestion');
            }
          },
        },
      ]
    );
  };

  const showChoiceButton = status === 'accepted' && !suggesterContinuationChoice;

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.profileSection}
          onPress={handleViewProfile}
          activeOpacity={0.7}
        >
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.placeholderImage]}>
              <Ionicons name="person" size={24} color="#999" />
            </View>
          )}
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileName}</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
            {matchmakerName && (
              <Text style={styles.matchmakerText}>via {matchmakerName}</Text>
            )}
            <Text style={styles.viewProfileHint}>Tap to view profile</Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.rightSection}>
        {status === 'pending' && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteButtonText}>Delete suggestion</Text>
            </TouchableOpacity>
          )}
          {showChoiceButton ? (
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={handleMakeChoice}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
              <Text style={styles.choiceButtonText}>Choose</Text>
            </TouchableOpacity>
          ) : status === 'completed' ? (
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
      </View>

      <ContinuationChoiceModal
        visible={showContinuationModal}
        suggestionId={suggestionId}
        userType="suggester"
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
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  matchmakerText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
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
  rightSection: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F44336',
  },
});

