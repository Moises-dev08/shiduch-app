import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTextInput } from '../AppTextInput';
import { reportService, ReportReason } from '../../lib/reportService';

interface ReportProfileModalProps {
  visible: boolean;
  profileId: string;
  profileName: string;
  onClose: () => void;
  onReportSubmitted?: () => void;
}

interface ReasonOption {
  id: ReportReason;
  label: string;
  description: string;
}

const REPORT_REASONS: ReasonOption[] = [
  {
    id: 'fake_profile',
    label: 'Fake Profile',
    description: 'This profile appears to be fake or impersonating someone',
  },
  {
    id: 'underage',
    label: 'Underage',
    description: 'This person appears to be underage',
  },
  {
    id: 'non_serious',
    label: 'Non-Serious Relationship Intentions',
    description: 'This person does not seem serious about finding a match',
  },
];

export default function ReportProfileModal({
  visible,
  profileId,
  profileName,
  onClose,
  onReportSubmitted,
}: ReportProfileModalProps) {
  const [selectedReasons, setSelectedReasons] = useState<ReportReason[]>([]);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleReasonToggle = (reasonId: ReportReason) => {
    setSelectedReasons(prev => {
      if (prev.includes(reasonId)) {
        return prev.filter(r => r !== reasonId);
      } else {
        return [...prev, reasonId];
      }
    });
  };

  const handleSubmit = async () => {
    if (selectedReasons.length === 0) {
      Alert.alert('Select Reason', 'Please select at least one reason for reporting this profile.');
      return;
    }

    Alert.alert(
      'Confirm Report',
      `Are you sure you want to report ${profileName}? This action will be reviewed by our admin team.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              const result = await reportService.reportProfile(
                profileId,
                selectedReasons,
                additionalDetails.trim() || undefined
              );

              if (result.success) {
                Alert.alert(
                  'Report Submitted',
                  'Thank you for reporting. Our admin team will review this profile.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Reset form
                        setSelectedReasons([]);
                        setAdditionalDetails('');
                        onClose();
                        onReportSubmitted?.();
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to submit report. Please try again.');
              }
            } catch (error) {
              console.error('Error submitting report:', error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    if (!submitting) {
      setSelectedReasons([]);
      setAdditionalDetails('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.kavContainer}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.title}>Report Profile</Text>
          <TouchableOpacity onPress={handleClose} disabled={submitting}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.infoSection}>
            <Ionicons name="alert-circle-outline" size={48} color="#ff9800" />
            <Text style={styles.infoTitle}>Why are you reporting {profileName}?</Text>
            <Text style={styles.infoText}>
              Your report will be reviewed by our admin team. False reports may result in account suspension.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Reason(s)</Text>
            {REPORT_REASONS.map(reason => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonOption,
                  selectedReasons.includes(reason.id) && styles.reasonOptionSelected,
                ]}
                onPress={() => handleReasonToggle(reason.id)}
                disabled={submitting}
              >
                <View style={styles.reasonHeader}>
                  <View
                    style={[
                      styles.checkbox,
                      selectedReasons.includes(reason.id) && styles.checkboxSelected,
                    ]}
                  >
                    {selectedReasons.includes(reason.id) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.reasonLabel}>{reason.label}</Text>
                </View>
                <Text style={styles.reasonDescription}>{reason.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
            <AppTextInput
              style={styles.textInput}
              placeholder="Provide any additional information that might help our review..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={additionalDetails}
              onChangeText={setAdditionalDetails}
              editable={!submitting}
              textAlignVertical="top"
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                (selectedReasons.length === 0 || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={selectedReasons.length === 0 || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  kavContainer: {
    flex: 1,
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
  infoSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff8e1',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  reasonOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  reasonOptionSelected: {
    borderColor: '#1293DA',
    backgroundColor: '#e3f2fd',
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#1293DA',
    borderColor: '#1293DA',
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  reasonDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 36,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    minHeight: 100,
    backgroundColor: '#f9f9f9',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#F59E0B',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

