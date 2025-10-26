import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/AuthContext';

export default function SettingsScreen() {
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth/login');
          }
        }
      ]
    );
  };

  const handleReportProblem = () => {
    Alert.alert(
      'Report Problem',
      'This will open your email app to send a report. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Report', 
          onPress: () => {
            // TODO: Implement email report functionality
            console.log('Opening email to report problem');
          }
        }
      ]
    );
  };

  const handleFreezeProfile = () => {
    setShowFreezeModal(true);
  };

  const confirmFreezeProfile = () => {
    setShowFreezeModal(false);
    Alert.alert(
      'Profile Frozen',
      'Your profile has been frozen and will not be visible to other users.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <TouchableOpacity style={styles.settingsItem} onPress={handleFreezeProfile}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="snow" size={24} color="#2196f3" />
            <Text style={styles.settingsItemText}>Freeze Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsItem} onPress={handleReportProblem}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="flag" size={24} color="#ff6b35" />
            <Text style={styles.settingsItemText}>Report a Problem</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="log-out" size={24} color="#e91e63" />
            <Text style={styles.settingsItemText}>Logout</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Freeze Profile Confirmation Modal */}
      <Modal visible={showFreezeModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.freezeModalOverlay}>
          <View style={styles.freezeModal}>
            <View style={styles.freezeModalHeader}>
              <Ionicons name="snow" size={32} color="#2196f3" />
              <Text style={styles.freezeModalTitle}>Freeze Your Profile</Text>
            </View>
            
            <View style={styles.freezeModalContent}>
              <Text style={styles.freezeModalDescription}>
                Freezing your profile will make it invisible to other users. You can unfreeze it anytime from your settings.
              </Text>
              
              <Text style={styles.freezeModalWarning}>
                ⚠️ This action will hide your profile from all potential matches until you unfreeze it.
              </Text>
            </View>
            
            <View style={styles.freezeModalActions}>
              <TouchableOpacity 
                style={styles.freezeModalCancel}
                onPress={() => setShowFreezeModal(false)}
              >
                <Text style={styles.freezeModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.freezeModalConfirm}
                onPress={confirmFreezeProfile}
              >
                <Text style={styles.freezeModalConfirmText}>Freeze Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40, // Same width as back button to center title
  },
  content: {
    flex: 1,
    padding: 20,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  // Freeze Modal Styles
  freezeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  freezeModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  freezeModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  freezeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  freezeModalContent: {
    marginBottom: 24,
  },
  freezeModalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  freezeModalWarning: {
    fontSize: 14,
    color: '#ff6b35',
    lineHeight: 20,
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
  },
  freezeModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  freezeModalCancel: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  freezeModalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  freezeModalConfirm: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2196f3',
    alignItems: 'center',
    textAlign: 'center',
    
  },
  freezeModalConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    alignItems: 'center',
    textAlign: 'center',
  },
});
