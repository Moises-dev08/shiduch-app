import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface ReceivedSuggestionItemProps {
  suggesterName: string;
  suggesterPicture?: string;
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

export default function ReceivedSuggestionItem({
  suggesterName,
  suggesterPicture,
  status,
  createdAt,
  notes,
}: ReceivedSuggestionItemProps) {
  const config = statusConfig[status];
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
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
        </View>
      </View>
      
      <View style={[styles.statusBadge, { backgroundColor: config.backgroundColor }]}>
        <Ionicons name={config.icon} size={16} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    </View>
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
});

