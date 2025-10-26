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

  return (
    <TouchableOpacity 
      key={profile.id} 
      style={styles.profileCard}
      onPress={() => onPress(profile)}
      activeOpacity={0.7}
    >
      {!imageError && profile.picture ? (
        <Image 
          source={{ uri: profile.picture }} 
          style={styles.profileImage}
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.profileImage, styles.placeholderImage]}>
          <Ionicons name="person" size={60} color="#ccc" />
        </View>
      )}
      <View style={styles.profileInfo}>
        <Text style={styles.profileName} numberOfLines={1}>{profile.name}</Text>
        <Text style={styles.profileLocation} numberOfLines={1}>{profile.location}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    padding: 12,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  profileLocation: {
    fontSize: 14,
    color: '#666',
  },
});

