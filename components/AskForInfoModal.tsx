import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { getFieldLabel } from '../lib/fieldLabels';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppTextInput } from './AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AskForInfoModalProps {
  visible: boolean;
  fieldName: string;
  profileName: string;
  onClose: () => void;
  onSubmit: (note: string) => void;
  isSubmitting: boolean;
}

export default function AskForInfoModal({
  visible,
  fieldName,
  profileName,
  onClose,
  onSubmit,
  isSubmitting,
}: AskForInfoModalProps) {
  const fieldLabel = getFieldLabel(fieldName);
  const [note, setNote] = useState(`Hi, I would like to know more about you.`);

  const handleSubmit = () => {
    if (note.trim()) {
      onSubmit(note.trim());
    }
  };

  const handleClose = () => {
    setNote(`Hi, I would like to know more about you.`);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
            <Ionicons name="close" size={28} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Request Information</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.infoBox}>
            <Ionicons name="lock-closed" size={40} color="#1293DA" />
            <Text style={styles.infoTitle}>Private Information</Text>
            <Text style={styles.infoText}>
              You&apos;re requesting to see {profileName}&apos;s {fieldLabel.toLowerCase()}.
            </Text>
            <Text style={styles.infoSubtext}>
              They will be notified and can choose to share this information with you.
            </Text>
          </View>

          <View style={styles.noteSection}>
            <Text style={styles.label}>Your Message</Text>
            <Text style={styles.helperText}>
              Personalize your message to increase the chances of approval
            </Text>
            <AppTextInput
              style={styles.textInput}
              value={note}
              onChangeText={setNote}
              placeholder="Type your message..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting || !note.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Send Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  infoBox: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fef5f8',
    borderRadius: 12,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoSubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  noteSection: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    backgroundColor: '#f9f9f9',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    marginTop: 4,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#1293DA',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

