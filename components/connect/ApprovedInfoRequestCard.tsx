import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getFieldLabel, PRIVACY_KEY_TO_DB_COLUMN } from '../../lib/fieldLabels';
import { InfoRequest } from '../../lib/infoRequestService';
import { profileService } from '../../lib/profileService';
import { calculateAge } from '../../lib/utils';

interface ApprovedInfoRequestCardProps {
  request: InfoRequest;
}

export default function ApprovedInfoRequestCard({ request }: ApprovedInfoRequestCardProps) {
  const router = useRouter();
  const requestedProfile = request.requested_profile as any;
  if (!requestedProfile) return null;

  const profileName = `${requestedProfile.first_name} ${requestedProfile.last_name}`;
  const age = calculateAge(requestedProfile.dob);
  const location = requestedProfile.location_country === "United States"
    ? `${requestedProfile.location_city || ''}, ${requestedProfile.location_state || ''}`.replace(/^,\s*|,\s*$/g, '')
    : requestedProfile.location_country;

  // Get profile picture
  const showPicture = requestedProfile.picture_privacy === 'always' || requestedProfile.picture_privacy === 'private';
  const profilePicture = showPicture && requestedProfile.pictures && requestedProfile.pictures.length > 0
    ? profileService.getImageUrl(requestedProfile.pictures[0])
    : null;
  const isBlurred = requestedProfile.picture_privacy === 'private';

  const fieldLabel = getFieldLabel(request.field_name);

  // Get the field value from the profile
  const getFieldValue = (): string | null => {
    const privacyKey = request.field_name;
    // Resolve camelCase privacy key → snake_case DB column (falls back to privacyKey if not in map)
    const dbColumn = PRIVACY_KEY_TO_DB_COLUMN[privacyKey] ?? privacyKey;
    const value = requestedProfile[dbColumn] ?? requestedProfile[privacyKey];

    const booleanFields = ['hasChildren', 'has_children', 'is_cohen', 'wears_black_hat'];
    if (booleanFields.includes(privacyKey) || booleanFields.includes(dbColumn)) {
      return value === true ? 'Yes' : value === false ? 'No' : null;
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : null;
    }
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return String(value);
  };

  const fieldValue = getFieldValue();

  const handleViewProfile = () => {
    router.push({
      pathname: '/profile-details',
      params: { profileId: requestedProfile.id }
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

      {/* Approved Info Display */}
      <View style={styles.infoSection}>
        <View style={styles.approvedBadge}>
          <Ionicons name="checkmark-circle" size={18} color="#4caf50" />
          <Text style={styles.approvedText}>Request Approved</Text>
        </View>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{fieldLabel}:</Text>
          {fieldValue ? (
            <View style={styles.valueContainer}>
              <Text style={styles.fieldValue}>{fieldValue}</Text>
            </View>
          ) : (
            <Text style={styles.noValueText}>No information available</Text>
          )}
        </View>

        <Text style={styles.timestamp}>
          Approved on {new Date(request.responded_at || request.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
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
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
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
  infoSection: {
    marginTop: 8,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  approvedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4caf50',
  },
  fieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  valueContainer: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  fieldValue: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  noValueText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
});
