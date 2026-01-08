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
  otherSideChoice?: 'by_themselves' | 'with_middle_person'; // The other person's continuation choice
}

export default function ContinuationChoiceModal({
  visible,
  profileName,
  onSelectChoice,
  onCancel,
  loading = false,
  otherSideChoice,
}: ContinuationChoiceModalProps) {


  console.log('profileName', !profileName);
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
            <Ionicons name="people-circle" size={60} color="#03a9f4" />
          </View>

          <Text style={styles.title}>How would you like to continue?</Text>
          
          {!profileName && (
          <Text style={styles.message}>
            Great! You are interested in {profileName}. Choose how you&apos;d like to proceed:
          </Text> 
          )}

          {/* Show other side's choice if available */}
          {otherSideChoice && (
            <View style={styles.otherSideChoiceBox}>
              <Ionicons 
                name={otherSideChoice === 'by_themselves' ? 'person' : 'people'} 
                size={18} 
                color="#9C27B0" 
              />
              <Text style={styles.otherSideChoiceText}>
                {profileName} chose: <Text style={styles.otherSideChoiceBold}>
                  {otherSideChoice === 'by_themselves' ? 'By myself' : 'With a Matchmaker'}
                </Text>
              </Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#03a9f4" />
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
                    {/* Warning if other side chose matchmaker */}
                    {otherSideChoice === 'with_middle_person' && (
                      <View style={styles.warningNote}>
                        <Ionicons name="information-circle" size={14} color="#FFA726" />
                        <Text style={styles.warningNoteText}>
                          Note: Since {profileName} chose matchmaker, both will continue with matchmaker
                        </Text>
                      </View>
                    )}
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
                    <Text style={styles.buttonTitle}>With a Matchmaker/Shadchan</Text>
                    <Text style={styles.buttonDescription}>
                      Use a Matchmaker/Shadchan to help coordinate
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
  otherSideChoiceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ce93d8',
  },
  otherSideChoiceText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  otherSideChoiceBold: {
    fontWeight: '700',
    color: '#9C27B0',
  },
  warningNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  warningNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#fff',
    lineHeight: 14,
    fontWeight: '600',
  },
});

