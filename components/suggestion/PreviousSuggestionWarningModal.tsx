import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PreviousSuggestionWarningModalProps {
  visible: boolean;
  profileOneName: string;
  profileTwoName: string;
  profileOneStatus: 'pending' | 'accepted' | 'rejected';
  profileTwoStatus: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  onCancel: () => void;
  onContinue: () => void;
}

export default function PreviousSuggestionWarningModal({
  visible,
  profileOneName,
  profileTwoName,
  profileOneStatus,
  profileTwoStatus,
  createdAt,
  onCancel,
  onContinue,
}: PreviousSuggestionWarningModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'accepted':
        return { text: 'Accepted ✓', color: '#4CAF50' };
      case 'rejected':
        return { text: 'Declined ✗', color: '#F44336' };
      case 'pending':
        return { text: 'Pending ⏳', color: '#FF9800' };
      default:
        return { text: status, color: '#666' };
    }
  };

  const profileOneDisplay = getStatusDisplay(profileOneStatus);
  const profileTwoDisplay = getStatusDisplay(profileTwoStatus);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="alert-circle" size={48} color="#FF9800" />
              </View>
              <Text style={styles.title}>Previous Suggestion Found</Text>
              <Text style={styles.subtitle}>
                These profiles were suggested before
              </Text>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Previous suggestion from:</Text>
                <Text style={styles.infoDate}>{formatDate(createdAt)}</Text>
              </View>

              {/* Profile Responses */}
              <View style={styles.responsesContainer}>
                <View style={styles.responseItem}>
                  <View style={styles.responseHeader}>
                    <Ionicons name="person" size={20} color="#666" />
                    <Text style={styles.responseName}>{profileOneName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${profileOneDisplay.color}15` }]}>
                    <Text style={[styles.statusText, { color: profileOneDisplay.color }]}>
                      {profileOneDisplay.text}
                    </Text>
                  </View>
                </View>

                <View style={styles.responseItem}>
                  <View style={styles.responseHeader}>
                    <Ionicons name="person" size={20} color="#666" />
                    <Text style={styles.responseName}>{profileTwoName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${profileTwoDisplay.color}15` }]}>
                    <Text style={[styles.statusText, { color: profileTwoDisplay.color }]}>
                      {profileTwoDisplay.text}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.warningBox}>
                <Ionicons name="information-circle" size={20} color="#03a9f4" />
                <Text style={styles.warningText}>
                  Would you like to suggest these profiles to each other again?
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.continueButton]}
                onPress={onContinue}
              >
                <Text style={styles.continueButtonText}>Yes, Suggest Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    padding: 24,
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  responsesContainer: {
    marginBottom: 20,
    gap: 12,
  },
  responseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  responseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#0277bd',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  continueButton: {
    backgroundColor: '#03a9f4',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

