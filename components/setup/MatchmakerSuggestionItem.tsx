import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface MatchmakerSuggestionItemProps {
  suggesterName: string;
  suggesterPicture?: string;
  suggestedName: string;
  suggestedPicture?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
  notes?: string;
}

const statusConfig = {
  pending: {
    label: 'Pending',
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
}: MatchmakerSuggestionItemProps) {
  const config = statusConfig[status];
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.profilesRow}>
          <View style={styles.profileItem}>
            {suggesterPicture ? (
              <Image source={{ uri: suggesterPicture }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImage, styles.placeholderImage]}>
                <Ionicons name="person" size={20} color="#999" />
              </View>
            )}
            <Text style={styles.profileName} numberOfLines={1}>{suggesterName}</Text>
          </View>

          <Ionicons name="heart" size={20} color="#FF6B6B" style={styles.heartIcon} />

          <View style={styles.profileItem}>
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
        
        <View style={[styles.statusBadge, { backgroundColor: config.backgroundColor }]}>
          <Ionicons name={config.icon} size={14} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>
    </View>
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
});

