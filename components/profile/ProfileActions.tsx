import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProfileActionsProps {
  profileId: string;
  profileName: string;
  profileGender: 'male' | 'female';
  currentUserRole: 'single' | 'matchmaker' | 'both';
  currentUserGender?: 'male' | 'female';
  onSetupPress: () => void;
  onAskForInfoPress: () => void;
  isSubmittingInfoRequest: boolean;
  showSetupButton?: boolean;
  showAskForInfoButton?: boolean;
  infoRequestStatus?: 'pending' | 'approved' | null;
}

export default function ProfileActions({ 
  profileId,
  profileName,
  profileGender,
  currentUserRole,
  currentUserGender,
  onSetupPress, 
  onAskForInfoPress,
  isSubmittingInfoRequest,
  showSetupButton = true,
  showAskForInfoButton = true,
  infoRequestStatus = null,
}: ProfileActionsProps) {
  const handleSetupPress = () => {
    console.log('ProfileActions: Setup button tapped');
    
    // If matchmaker, navigate to matchmaker setup screen
    if (currentUserRole === 'matchmaker' || currentUserRole === 'both') {
      router.push({
        pathname: '/matchmaker-setup',
        params: {
          profileId,
          profileName,
          gender: profileGender,
        },
      });
    } else {
      // Single user flow
      onSetupPress();
    }
  };

  // Check if matchmaker should see the buttons
  const isMatchmakerOrBoth = currentUserRole === 'matchmaker' || currentUserRole === 'both';
  const isOppositeGender = currentUserGender !== profileGender;
  const showIntroButton = isMatchmakerOrBoth && isOppositeGender;

  // If request is approved, show "View Full Profile" button
  const renderInfoButton = () => {
    if (infoRequestStatus === 'approved') {
      return (
        <TouchableOpacity 
          style={[styles.actionButton, styles.approvedButton]} 

          activeOpacity={0.8}
          disabled
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Full Profile</Text>
        </TouchableOpacity>
      );
    }

    if (infoRequestStatus === 'pending') {
      return (
        <TouchableOpacity 
          style={[styles.actionButton, styles.pendingButton]} 
          disabled
          activeOpacity={1}
        >
          <Ionicons name="time-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Request Pending</Text>
        </TouchableOpacity>
      );
    }

    // Default: Show "Ask for Info" button
    return (
      <TouchableOpacity 
        style={[
          styles.actionButton, 
          styles.infoButton,
          isSubmittingInfoRequest && styles.buttonDisabled
        ]} 
        onPress={onAskForInfoPress}
        disabled={isSubmittingInfoRequest}
        activeOpacity={0.8}
      >
        {isSubmittingInfoRequest ? (
          <>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.actionButtonText}>Sending...</Text>
          </>
        ) : (
          <>
            <Ionicons name="information-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Ask for Info</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  // For matchmakers: only show buttons for opposite gender profiles
  if (isMatchmakerOrBoth && !isOppositeGender) {
    return null; // Don't show any buttons for same gender profiles
  }

  return (
    <View style={styles.actionsContainer}>
      {showSetupButton && showIntroButton && (
        <TouchableOpacity 
          style={[styles.actionButton, styles.setupButton]} 
          onPress={handleSetupPress}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Intro Setup</Text>
        </TouchableOpacity>
      )}

      {showSetupButton && !isMatchmakerOrBoth && (
        <TouchableOpacity 
          style={[styles.actionButton, styles.setupButton]} 
          onPress={handleSetupPress}
          activeOpacity={0.8}
        >
          <Ionicons name="heart-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Setup</Text>
        </TouchableOpacity>
      )}
      
      {showAskForInfoButton && renderInfoButton()}
    </View>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  setupButton: {
    backgroundColor: '#FF6B6B',
  },
  infoButton: {
    backgroundColor: '#007AFF',
  },
  approvedButton: {
    backgroundColor: '#4CAF50',
  },
  pendingButton: {
    backgroundColor: '#FF9800',
    opacity: 0.8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

