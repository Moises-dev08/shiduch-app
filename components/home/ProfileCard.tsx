import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Profile } from '../../types/homeTypes';

interface ProfileCardProps {
  profile: Profile;
  onPress: (profile: Profile) => void;
}

export default function ProfileCard({ profile, onPress }: ProfileCardProps) {
  const [imageError, setImageError] = useState(false);
  const showImage = !imageError && profile.picture && profile.picturePrivacy === 'always';

  // Build info lines based on what's visible
  const infoLines: string[] = [];
  if (profile.location && profile.location !== 'Hidden') {
    infoLines.push(profile.location);
  }
  if (profile.height) {
    infoLines.push(profile.height);
  }
  if (profile.hasChildren !== undefined) {
    infoLines.push(profile.hasChildren ? 'Has children' : 'No children');
  }
  if (profile.school) {
    infoLines.push(profile.school);
  }
  if (profile.occupation) {
    infoLines.push(profile.occupation);
  }

  return (
    <TouchableOpacity 
      key={profile.id} 
      style={styles.profileCard}
      onPress={() => onPress(profile)}
      activeOpacity={0.7}
    >
      {showImage ? (
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: profile.picture }} 
            style={styles.profileImage}
            onError={() => setImageError(true)}
          />
          <View style={styles.ageBadge}>
            <Text style={styles.ageText}>{profile.age} y/o</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.profileImage, styles.placeholderImage]}>
          <Ionicons 
            name={profile.picturePrivacy === 'private' ? 'lock-closed' : 'person'} 
            size={40} 
            color="#ccc" 
          />
          <View style={styles.ageBadge}>
            <Text style={styles.ageText}>{profile.age} y/o</Text>
          </View>
        </View>
      )}
      <View style={styles.profileInfo}>
        <Text style={styles.profileName} numberOfLines={1}>{profile.name}</Text>
        {infoLines.length > 0 ? (
          <>
            <Text style={styles.profileDetail} numberOfLines={1}>{infoLines[0]}</Text>
            {infoLines[1] && (
              <Text style={styles.profileDetail} numberOfLines={1}>{infoLines[1]}</Text>
            )}
          </>
        ) : (
          <Text style={styles.profileDetail} numberOfLines={1}>Tap to view</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ageBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  profileInfo: {
    padding: 8,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  profileDetail: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
});

