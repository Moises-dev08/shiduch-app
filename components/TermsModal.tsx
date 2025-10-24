import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TermsModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function TermsModal({ visible, onAccept, onDecline }: TermsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onDecline} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Terms and Conditions</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.text}>
            By creating an account and using our dating app, you agree to be bound by these Terms and Conditions. 
            If you do not agree to these terms, please do not use our service.
          </Text>

          <Text style={styles.sectionTitle}>2. User Responsibilities</Text>
          <Text style={styles.text}>
            • You must be at least 18 years old to use this service{'\n'}
            • You are responsible for maintaining the confidentiality of your account{'\n'}
            • You agree to provide accurate and truthful information{'\n'}
            • You will not use the service for any illegal or unauthorized purpose{'\n'}
            • You will not harass, abuse, or harm other users
          </Text>

          <Text style={styles.sectionTitle}>3. Privacy and Safety</Text>
          <Text style={styles.text}>
            • We prioritize user safety and privacy{'\n'}
            • Report any inappropriate behavior immediately{'\n'}
            • Never share personal information with strangers{'\n'}
            • Meet in public places for first dates{'\n'}
            • Trust your instincts and be cautious
          </Text>

          <Text style={styles.sectionTitle}>4. Content Guidelines</Text>
          <Text style={styles.text}>
            • No inappropriate, offensive, or explicit content{'\n'}
            • Respect other users and their boundaries{'\n'}
            • No spam, solicitation, or commercial activity{'\n'}
            • Maintain a respectful and positive environment
          </Text>

          <Text style={styles.sectionTitle}>5. Account Termination</Text>
          <Text style={styles.text}>
            We reserve the right to suspend or terminate accounts that violate these terms. 
            You may also delete your account at any time through the app settings.
          </Text>

          <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
          <Text style={styles.text}>
            Our service is provided "as is" without warranties. We are not responsible for 
            the actions of other users or any damages that may result from using our service.
          </Text>

          <Text style={styles.sectionTitle}>7. Changes to Terms</Text>
          <Text style={styles.text}>
            We may update these terms from time to time. Continued use of the service 
            constitutes acceptance of any changes.
          </Text>

          <Text style={styles.lastUpdated}>
            Last updated: {new Date().toLocaleDateString()}
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptButtonText}>Accept & Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 10,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 20,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#e91e63',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
