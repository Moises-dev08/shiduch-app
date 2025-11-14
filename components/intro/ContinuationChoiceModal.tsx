import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ContinuationChoiceModalProps {
  visible: boolean;
  profileName: string;
  onSelectChoice: (choice: 'by_themselves' | 'with_middle_person') => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ContinuationChoiceModal({
  visible,
  profileName,
  onSelectChoice,
  onCancel,
  loading = false,
}: ContinuationChoiceModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Ionicons name="people-circle" size={60} color="#e91e63" />
          </View>

          <Text style={styles.title}>How would you like to continue?</Text>
          
          <Text style={styles.message}>
            Great! You and {profileName} are interested. Choose how you&apos;d like to proceed:
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#e91e63" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.choiceButton, styles.byThemselvesButton]}
                onPress={() => onSelectChoice('by_themselves')}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="person" size={24} color="#fff" />
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.buttonTitle}>By myself</Text>
                    <Text style={styles.buttonDescription}>
                      Connect directly
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.choiceButton, styles.withMiddlePersonButton]}
                onPress={() => onSelectChoice('with_middle_person')}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="people" size={24} color="#fff" />
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.buttonTitle}>With a middle person</Text>
                    <Text style={styles.buttonDescription}>
                      Use a middle person to help coordinate
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  choiceButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  byThemselvesButton: {
    backgroundColor: '#4CAF50',
  },
  withMiddlePersonButton: {
    backgroundColor: '#2196F3',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
});

