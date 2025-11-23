import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { calculateAge } from '../../lib/utils';
import { Profile } from '../../types/homeTypes';

interface ProfileCardProps {
  profile: Profile;
  onPress: (profile: Profile) => void;
  renderAction?: ReactNode;
}

export default function ProfileCard({ profile, onPress, renderAction }: ProfileCardProps) {
  const [imageError, setImageError] = useState(false);
  const showImage = !imageError && profile.picture && (profile.picturePrivacy === 'always' || profile.picturePrivacy === 'private' || profile.picturePrivacy === 'one_time');
  const isBlurred = profile.picturePrivacy === 'private';
  const age = calculateAge(profile.dob);

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
            blurRadius={isBlurred ? 15 : 0}
          />
          {isBlurred && (
            <View style={styles.blurOverlay}>
              <Ionicons name="lock-closed" size={24} color="#fff" />
            </View>
          )}
          <View style={styles.nameBadge}>
            <Text style={styles.nameText} numberOfLines={1}>{profile.name}</Text>
          </View>
          <View style={styles.ageBadge}>
            <Text style={styles.ageText}>{age} y/o</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.profileImage, styles.placeholderImage]}>
          <Ionicons 
            name="person" 
            size={40} 
            color="#ccc" 
          />
          <View style={styles.nameBadge}>
            <Text style={styles.nameText} numberOfLines={1}>{profile.name}</Text>
          </View>
          <View style={styles.ageBadge}>
            <Text style={styles.ageText}>{age} y/o</Text>
          </View>
        </View>
      )}
      {renderAction && <View style={styles.actionContainer}>{renderAction}</View>}
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
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  nameBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: '#87CEEB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  nameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  ageBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#03a9f4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  actionContainer: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

