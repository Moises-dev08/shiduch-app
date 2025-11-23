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
          <Text style={styles.introTitle}>Terms & Conditions</Text>
          <Text style={styles.introText}>
            Before completing your registration, please read and confirm the following terms.
            You must accept all items to use this app.
          </Text>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Religious Standards</Text>
            <Text style={styles.text}>
              I confirm that I am religious and shomer negi&apos;a.{'\n'}
              I understand that if I do not uphold these standards, my profile may be removed from the app.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Matchmaking Is Free of Charge</Text>
            <Text style={styles.subsectionTitle}>I agree that:</Text>
            <Text style={styles.bulletText}>
              • All matchmaking done through this app is completely free.{'\n'}
              • I may not request, require, or imply any form of payment at any stage — before, during, or after a match.{'\n'}
              • I participate leshem Shamayim, solely to help others.{'\n'}
              • Any money given to me must be voluntary, from the giver&apos;s free will only.
            </Text>
            
            <Text style={styles.subsectionTitle}>Use of Private Information</Text>
            <Text style={styles.subsectionTitle}>I agree that:</Text>
            <Text style={styles.bulletText}>
              • If I receive or access any private information from any profile on this app,{'\n'}
              • I may not charge, request payment, or accept compensation from that individual,{'\n'}
              • Even if I suggest a match for them outside of the app.
            </Text>
            <Text style={styles.text}>
              This rule applies to all communication or assistance initiated through information obtained on the platform.
            </Text>
            
            <Text style={styles.subsectionTitle}>Support for the App</Text>
            <Text style={styles.text}>
              If I receive any voluntary appreciation payment from someone I assisted, I agree to contribute 30% of that amount to support and maintain the app.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Account Access Authorization</Text>
            <Text style={styles.text}>
              I allow the app&apos;s support team to access my account and profile at any time for moderation, review, or security purposes.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Content & Conduct Rules</Text>
            <Text style={styles.text}>
              I agree not to upload any inappropriate, immodest, offensive, or misleading content.{'\n'}
              I understand that violating these rules may result in my account being frozen, suspended, or permanently deleted without notice.
            </Text>
          </View>
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
  introTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
    marginBottom: 8,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 8,
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
    backgroundColor: '#03a9f4',
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
