import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProfileActionsProps {
  onSetupPress: () => void;
  onAskForInfoPress: () => void;
  onReportPress?: () => void;
  onSharePress?: () => void;
  isSubmittingInfoRequest: boolean;
  isSharing?: boolean;
  showSetupButton: boolean;
  showAskForInfoButton: boolean;
  showReportButton?: boolean;
  showShareButton?: boolean;
}

export default function ProfileActions({
  onSetupPress,
  onAskForInfoPress,
  onReportPress,
  onSharePress,
  isSubmittingInfoRequest,
  isSharing = false,
  showSetupButton,
  showAskForInfoButton,
  showReportButton = false,
  showShareButton = false,
}: ProfileActionsProps) {
  return (
    <View style={styles.container}>
      {/* Main Action Buttons */}
      <View style={styles.mainActions}>
        {showSetupButton && (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onSetupPress}
            disabled={isSubmittingInfoRequest}
          >
            <Ionicons name="heart" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Ask for Intro</Text>
          </TouchableOpacity>
        )}

        {showAskForInfoButton && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onAskForInfoPress}
            disabled={isSubmittingInfoRequest}
          >
            {isSubmittingInfoRequest ? (
              <ActivityIndicator color="#03a9f4" />
            ) : (
              <>
                <Ionicons name="information-circle-outline" size={20} color="#03a9f4" />
                <Text style={styles.secondaryButtonText}>Ask for Info</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Secondary Action Buttons (Report & Share) */}
      {(showReportButton || showShareButton) && (
        <View style={styles.secondaryActions}>
          {showReportButton && onReportPress && (
            <TouchableOpacity
              style={[styles.iconButton, styles.reportButton]}
              onPress={onReportPress}
            >
              <Ionicons name="flag-outline" size={20} color="#f44336" />
              <Text style={styles.reportButtonText}>Report Profile</Text>
            </TouchableOpacity>
          )}

          {showShareButton && onSharePress && (
            <TouchableOpacity
              style={[styles.iconButton, styles.shareButton]}
              onPress={onSharePress}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator color="#03a9f4" size="small" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={20} color="#03a9f4" />
                  <Text style={styles.shareButtonText}>Share Profile</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  mainActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#03a9f4',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#03a9f4',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#03a9f4',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  reportButton: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f44336',
  },
  shareButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#bbdefb',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#03a9f4',
  },
});

