import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface InfoRequestHistoryItemProps {
  profileName: string;
  profilePicture?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  message?: string;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: 'time-outline' as const,
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  approved: {
    label: 'Approved',
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
};

export default function InfoRequestHistoryItem({
  profileName,
  profilePicture,
  status,
  createdAt,
  message,
}: InfoRequestHistoryItemProps) {
  const config = statusConfig[status];
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
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
          {message && <Text style={styles.messageText} numberOfLines={1}>{message}</Text>}
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
  messageText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
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

