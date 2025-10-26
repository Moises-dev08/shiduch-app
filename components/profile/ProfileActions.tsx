import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProfileActionsProps {
  onSetupPress: () => void;
  onAskForInfoPress: () => void;
  isSubmittingInfoRequest: boolean;
  showSetupButton?: boolean;
  showAskForInfoButton?: boolean;
}

export default function ProfileActions({ 
  onSetupPress, 
  onAskForInfoPress,
  isSubmittingInfoRequest,
  showSetupButton = true,
  showAskForInfoButton = true,
}: ProfileActionsProps) {
  const handleSetupPress = () => {
    console.log('ProfileActions: Setup button tapped');
    onSetupPress();
  };

  return (
    <View style={styles.actionsContainer}>
      {showSetupButton && (
        <TouchableOpacity 
          style={[styles.actionButton, styles.setupButton]} 
          onPress={handleSetupPress}
          activeOpacity={0.8}
        >
          <Ionicons name="heart-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Setup</Text>
        </TouchableOpacity>
      )}
      
      {showAskForInfoButton && (
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
      )}
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
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

