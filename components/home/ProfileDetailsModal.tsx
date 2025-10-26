import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Profile } from '../../types/homeTypes';
import ProfileActions from '../profile/ProfileActions';

interface ProfileDetailsModalProps {
  visible: boolean;
  profile: Profile | null;
  onClose: () => void;
  onPicturePress: (index: number) => void;
  onSetupPress: () => void;
  onAskForInfoPress: () => void;
  isSubmittingInfoRequest: boolean;
}

export default function ProfileDetailsModal({
  visible,
  profile,
  onClose,
  onPicturePress,
  onSetupPress,
  onAskForInfoPress,
  isSubmittingInfoRequest,
}: ProfileDetailsModalProps) {
  const [imageError, setImageError] = React.useState(false);

  // Reset image error when profile changes
  React.useEffect(() => {
    setImageError(false);
  }, [profile?.id]);

  // Cleanup when modal closes
  React.useEffect(() => {
    if (!visible) {
      setImageError(false);
    }
  }, [visible]);

  if (!profile) return null;

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {!imageError && profile.picture ? (
              <Image 
                source={{ uri: profile.picture }} 
                style={styles.profileImage}
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={[styles.profileImage, styles.placeholderProfileImage]}>
                <Ionicons name="person" size={50} color="#ccc" />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileAge}>{profile.age} years old</Text>
              <Text style={styles.profileLocation}>{profile.location}</Text>
            </View>
          </View>

          {/* Pictures Section */}
          {profile.pictures && profile.pictures.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pictures</Text>
              <View style={styles.picturesGrid}>
                {profile.pictures.map((picture, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.pictureThumbnail}
                    onPress={() => onPicturePress(index)}
                    activeOpacity={0.7}
                  >
                    <Image 
                      source={{ uri: picture }} 
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>

          {/* Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Hashkafa:</Text>
              <Text style={styles.detailValue}>{profile.hashkafa}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Role:</Text>
              <Text style={styles.detailValue}>{profile.role}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gender:</Text>
              <Text style={styles.detailValue}>{profile.gender}</Text>
            </View>
            
            {profile.school && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>School:</Text>
                <Text style={styles.detailValue}>{profile.school}</Text>
              </View>
            )}
            
            {profile.occupation && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Occupation:</Text>
                <Text style={styles.detailValue}>{profile.occupation}</Text>
              </View>
            )}
          </View>
        </ScrollView>
        
        {/* Action Buttons */}
        <ProfileActions
          onSetupPress={onSetupPress}
          onAskForInfoPress={onAskForInfoPress}
          isSubmittingInfoRequest={isSubmittingInfoRequest}
          showSetupButton={true}
          showAskForInfoButton={true}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  placeholder: {
    width: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
  },
  placeholderProfileImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    justifyContent: 'center',
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileAge: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  profileLocation: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  picturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pictureThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    width: 120,
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
});

