import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { profileService } from '../../lib/profileService';
import { Suggestion } from '../../lib/suggestionService';

interface MadeSuggestionCardProps {
  suggestion: Suggestion;
}

export default function MadeSuggestionCard({ suggestion }: MadeSuggestionCardProps) {
  const [showNoteModal, setShowNoteModal] = useState(false);

  const profileOne = suggestion.profile_one;
  const profileTwo = suggestion.profile_two;

  if (!profileOne || !profileTwo) {
    return null;
  }

  const handleViewProfile = (profileId: string) => {
    router.push(`/profile-details?id=${profileId}&hideActions=true`);
  };

  const getProfileImage = (profile: any) => {
    const pictures = profile.pictures;
    return Array.isArray(pictures) && pictures.length > 0
      ? profileService.getImageUrl(pictures[0])
      : null;
  };

  const renderResponseStatus = (status: string) => {
    if (status === 'pending') {
      return (
        <View style={[styles.responseBadge, styles.waitingBadge]}>
          <Ionicons name="time-outline" size={14} color="#FF9800" />
          <Text style={styles.responseText}>Waiting</Text>
        </View>
      );
    }

    if (status === 'accepted') {
      return (
        <View style={[styles.responseBadge, styles.acceptedBadge]}>
          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
          <Text style={styles.responseText}>Liked</Text>
        </View>
      );
    }

    return (
      <View style={[styles.responseBadge, styles.rejectedBadge]}>
        <Ionicons name="close-circle" size={14} color="#F44336" />
        <Text style={styles.responseText}>Declined</Text>
      </View>
    );
  };

  const getCategoryInfo = () => {
    if (suggestion.status === 'completed' || 
        (suggestion.status === 'accepted' && 
         suggestion.profile_one_continuation_choice && 
         suggestion.profile_two_continuation_choice)) {
      return {
        icon: 'heart',
        color: '#4CAF50',
        text: 'Matched',
        description: 'Both accepted and chose how to continue.',
      };
    } else if (suggestion.status === 'rejected') {
      return {
        icon: 'close-circle',
        color: '#F44336',
        text: 'Did Not Match',
        description: 'One or both declined the suggestion.',
      };
    } else {
      return {
        icon: 'time',
        color: '#FF9800',
        text: 'Awaiting Response',
        description: 'Waiting for responses or continuation choices.',
      };
    }
  };

  const category = getCategoryInfo();

  return (
    <View style={styles.card}>
      <View style={[styles.categoryHeader, { backgroundColor: category.color + '10' }]}>
        <Ionicons name={category.icon as any} size={18} color={category.color} />
        <View>
          <Text style={[styles.categoryText, { color: category.color }]}>{category.text}</Text>
          <Text style={styles.categoryDescription}>{category.description}</Text>
        </View>
      </View>

      <View style={styles.participantsRow}>
        {/* Profile One */}
        <TouchableOpacity 
          style={styles.participant}
          onPress={() => handleViewProfile(profileOne.id)}
          activeOpacity={0.7}
        >
          {getProfileImage(profileOne) ? (
            <Image source={{ uri: getProfileImage(profileOne)! }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#ccc" />
            </View>
          )}
          <View style={styles.participantInfo}>
            <Text style={styles.participantName}>
              {profileOne.first_name} {profileOne.last_name}
            </Text>
            <Text style={styles.participantDetails}>
              {profileOne.age} • {profileOne.gender}
            </Text>
          </View>
          {renderResponseStatus(suggestion.profile_one_status || 'pending')}
        </TouchableOpacity>

        {/* Arrow/Heart Separator */}
        <View style={styles.separator}>
          {suggestion.status === 'completed' || 
           (suggestion.status === 'accepted' && 
            suggestion.profile_one_continuation_choice && 
            suggestion.profile_two_continuation_choice) ? (
            <Ionicons name="heart" size={20} color="#03a9f4" />
          ) : (
            <Ionicons name="arrow-forward" size={20} color="#999" />
          )}
        </View>

        {/* Profile Two */}
        <TouchableOpacity 
          style={styles.participant}
          onPress={() => handleViewProfile(profileTwo.id)}
          activeOpacity={0.7}
        >
          {getProfileImage(profileTwo) ? (
            <Image source={{ uri: getProfileImage(profileTwo)! }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#ccc" />
            </View>
          )}
          <View style={styles.participantInfo}>
            <Text style={styles.participantName}>
              {profileTwo.first_name} {profileTwo.last_name}
            </Text>
            <Text style={styles.participantDetails}>
              {profileTwo.age} • {profileTwo.gender}
            </Text>
          </View>
          {renderResponseStatus(suggestion.profile_two_status || 'pending')}
        </TouchableOpacity>
      </View>

      {/* Note Section */}
      {suggestion.note && (
        <TouchableOpacity 
          style={styles.noteButton}
          onPress={() => setShowNoteModal(true)}
        >
          <Ionicons name="document-text" size={16} color="#03a9f4" />
          <Text style={styles.noteButtonText}>View Your Note</Text>
        </TouchableOpacity>
      )}

      {/* Request Date */}
      <View style={styles.dateSection}>
        <Ionicons name="calendar-outline" size={14} color="#999" />
        <Text style={styles.dateText}>
          Suggested {new Date(suggestion.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: new Date(suggestion.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
          })}
        </Text>
      </View>

      {/* Note Modal */}
      {suggestion.note && (
        <Modal
          visible={showNoteModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowNoteModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Your Note</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.noteCard}>
                <Text style={styles.noteText}>{suggestion.note}</Text>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  categoryDescription: {
    fontSize: 13,
    color: '#666',
    fontWeight: '400',
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  participant: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInfo: {
    alignItems: 'center',
    gap: 2,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  participantDetails: {
    fontSize: 12,
    color: '#666',
  },
  responseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 4,
  },
  waitingBadge: {
    backgroundColor: '#FFF3E0',
  },
  acceptedBadge: {
    backgroundColor: '#E8F5E9',
  },
  rejectedBadge: {
    backgroundColor: '#FFEBEE',
  },
  responseText: {
    fontSize: 11,
    fontWeight: '600',
  },
  separator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  noteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFF0F5',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  noteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#03a9f4',
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
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

