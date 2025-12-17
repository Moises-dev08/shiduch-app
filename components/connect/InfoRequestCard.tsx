import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { InfoRequest, infoRequestService } from '../../lib/infoRequestService';
import { profileService } from '../../lib/profileService';
import { calculateAge } from '../../lib/utils';

interface InfoRequestCardProps {
  request: InfoRequest;
  onUpdate: () => void;
}

const fieldLabels: { [key: string]: string } = {
  pictures: 'Pictures',
  height: 'Height',
  hasChildren: 'Children Status',
  location_city: 'City',
  location_state: 'State',
  location_country: 'Country',
  languages: 'Languages',
  nationality: 'Background/Nationality',
  is_cohen: 'Cohen Status',
  hashkafa_type: 'Hashkafa',
  torah_learning: 'Torah Learning',
  praying: 'Prayer Habits',
  education_level: 'Education Level',
  post_high_school_path: 'Post-High School Path',
  current_occupation_study: 'Occupation/Study',
  plan_after_marriage: 'Plan After Marriage',
  marital_status: 'Marital Status',
  dress_style: 'Dress Style',
  wears_black_hat: 'Black Hat',
  head_covering: 'Head Covering',
  smoking: 'Smoking Habits',
  alcohol_consumption: 'Alcohol Consumption',
  phone: 'Phone Number',
  email: 'Email Address',
  whatsapp: 'WhatsApp Number',
  dob: 'Date of Birth',
};

export default function InfoRequestCard({ request, onUpdate }: InfoRequestCardProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const requesterProfile = request.requester_profile;
  if (!requesterProfile) return null;

  const profileName = `${requesterProfile.first_name} ${requesterProfile.last_name}`;
  const age = calculateAge(requesterProfile.dob);
  const location = requesterProfile.location_country === "United States"
    ? `${requesterProfile.location_city}, ${requesterProfile.location_state}`
    : requesterProfile.location_country;

  // Get profile picture
  const showPicture = requesterProfile.picture_privacy === 'always' || requesterProfile.picture_privacy === 'private';
  const profilePicture = showPicture && requesterProfile.pictures && requesterProfile.pictures.length > 0
    ? profileService.getImageUrl(requesterProfile.pictures[0])
    : null;
  const isBlurred = requesterProfile.picture_privacy === 'private';

  const fieldLabel = fieldLabels[request.field_name] || request.field_name;

  const handleRespond = async (status: 'approved' | 'rejected') => {
    // Set appropriate loading state
    if (status === 'approved') {
      setIsApproving(true);
    } else {
      setIsDeclining(true);
    }

    try {
      const result = await infoRequestService.respondToRequest(request.id, status);
      if (result.success) {
        Alert.alert(
          status === 'approved' ? 'Success! ✅' : 'Request Declined',
          status === 'approved' 
            ? `You approved the request to view your ${fieldLabel.toLowerCase()}.`
            : `You declined the request to view your ${fieldLabel.toLowerCase()}.`
        );
        onUpdate();
      } else {
        Alert.alert('Error', result.error || 'Failed to respond to request');
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      // Clear appropriate loading state
      if (status === 'approved') {
        setIsApproving(false);
      } else {
        setIsDeclining(false);
      }
    }
  };

  const handleViewProfile = () => {
    router.push({
      pathname: '/profile-details',
      params: { profileId: requesterProfile.id }
    });
  };

  return (
    <View style={styles.card}>
      {/* Header with profile info */}
      <TouchableOpacity style={styles.profileSection} onPress={handleViewProfile}>
        <View style={styles.profileImageContainer}>
          {profilePicture ? (
            <>
              <Image 
                source={{ uri: profilePicture }} 
                style={styles.profileImage}
                blurRadius={isBlurred ? 15 : 0}
              />
              {isBlurred && (
                <View style={styles.blurOverlay}>
                  <Ionicons name="lock-closed" size={16} color="#fff" />
                </View>
              )}
            </>
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={24} color="#ccc" />
            </View>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profileName}</Text>
          <Text style={styles.profileDetails}>
            {age && `${age} y/o`}
            {age && location && ' • '}
            {location}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      {/* Request details */}
      <View style={styles.requestDetails}>
        <View style={styles.requestHeader}>
          <Ionicons name="lock-closed" size={16} color="#03a9f4" />
          <Text style={styles.requestTitle}>Request to View {fieldLabel}</Text>
        </View>
        
        {request.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Message:</Text>
            <Text style={styles.messageText}>{request.message}</Text>
          </View>
        )}

        <Text style={styles.timestamp}>
          {new Date(request.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>

      {/* Action buttons */}
      {request.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton, isDeclining && styles.buttonDisabled]}
            onPress={() => handleRespond('rejected')}
            disabled={isDeclining || isApproving}
          >
            {isDeclining ? (
              <ActivityIndicator color="#666" size="small" />
            ) : (
              <>
                <Ionicons name="close" size={20} color="#666" />
                <Text style={styles.declineButtonText}>Decline</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.approveButton, isApproving && styles.buttonDisabled]}
            onPress={() => handleRespond('approved')}
            disabled={isDeclining || isApproving}
          >
            {isApproving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.approveButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Status badge for responded requests */}
      {request.status === 'approved' && (
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
          <Text style={styles.statusApproved}>Approved</Text>
        </View>
      )}
      {request.status === 'rejected' && (
        <View style={styles.statusBadge}>
          <Ionicons name="close-circle" size={16} color="#f44336" />
          <Text style={styles.statusRejected}>Declined</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  profileDetails: {
    fontSize: 14,
    color: '#666',
  },
  requestDetails: {
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#03a9f4',
  },
  messageContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  messageLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  declineButton: {
    backgroundColor: '#f0f0f0',
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  approveButton: {
    backgroundColor: '#03a9f4',
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  statusApproved: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4caf50',
  },
  statusRejected: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
  },
});

