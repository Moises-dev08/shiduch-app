import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { suggestionService } from '../../lib/suggestionService';

interface ReceivedInfoRequestItemProps {
  requestId: string;
  requesterName: string;
  requesterPicture?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  message?: string;
  onStatusUpdate: () => void;
}

const statusConfig = {
  pending: {
    label: 'Pending Response',
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

export default function ReceivedInfoRequestItem({
  requestId,
  requesterName,
  requesterPicture,
  status,
  createdAt,
  message,
  onStatusUpdate,
}: ReceivedInfoRequestItemProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const config = statusConfig[status];
  
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleApprove = async () => {
    setIsApproving(true);
    const result = await suggestionService.updateInfoRequestStatus(requestId, 'approved');
    setIsApproving(false);
    
    if (result.success) {
      Alert.alert('Success', `${requesterName} can now see your full profile.`);
      onStatusUpdate();
    } else {
      Alert.alert('Error', result.error || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    Alert.alert(
      'Reject Request',
      `Are you sure you want to reject ${requesterName}'s request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setIsRejecting(true);
            const result = await suggestionService.updateInfoRequestStatus(requestId, 'rejected');
            setIsRejecting(false);
            
            if (result.success) {
              Alert.alert('Request Rejected', 'The request has been rejected.');
              onStatusUpdate();
            } else {
              Alert.alert('Error', result.error || 'Failed to reject request');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <View style={styles.profileSection}>
          {requesterPicture ? (
            <Image source={{ uri: requesterPicture }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.placeholderImage]}>
              <Ionicons name="person" size={24} color="#999" />
            </View>
          )}
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{requesterName}</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
            {message && <Text style={styles.messageText} numberOfLines={2}>{message}</Text>}
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: config.backgroundColor }]}>
          <Ionicons name={config.icon} size={16} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>

      {status === 'pending' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton, isApproving && styles.buttonDisabled]}
            onPress={handleApprove}
            disabled={isApproving || isRejecting}
            activeOpacity={0.8}
          >
            {isApproving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton, isRejecting && styles.buttonDisabled]}
            onPress={handleReject}
            disabled={isApproving || isRejecting}
            activeOpacity={0.8}
          >
            {isRejecting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="close" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

