import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HowItWorksCarousel from '../../components/HowItWorksCarousel';
import TermsModal from '../../components/TermsModal';
import { useAuth } from '../../lib/AuthContext';
import { profileService } from '../../lib/profileService';

export default function SettingsScreen() {
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [isProfileActive, setIsProfileActive] = useState(true);
  const [loadingProfileStatus, setLoadingProfileStatus] = useState(true);
  const [processingFreeze, setProcessingFreeze] = useState(false);
  const { signOut } = useAuth();

  // Fetch profile status when screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchProfileStatus = async () => {
        setLoadingProfileStatus(true);
        const result = await profileService.getProfile();
        if (result.success && result.profile) {
          setIsProfileActive(result.profile.is_active);
        }
        setLoadingProfileStatus(false);
      };

      fetchProfileStatus();
    }, [])
  );

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
    if (isProfileActive) {
      setShowFreezeModal(true);
    } else {
      // Unfreeze directly without modal
      handleUnfreezeProfile();
    }
  };

  const confirmFreezeProfile = async () => {
    setShowFreezeModal(false);
    setProcessingFreeze(true);

    const result = await profileService.freezeProfile();
    setProcessingFreeze(false);

    if (result.success) {
      setIsProfileActive(false);
      Alert.alert(
        'Profile Frozen',
        'Your profile has been frozen and will not be visible to other users.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Error',
        result.error || 'Failed to freeze profile. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleUnfreezeProfile = async () => {
    setProcessingFreeze(true);

    const result = await profileService.unfreezeProfile();
    setProcessingFreeze(false);

    if (result.success) {
      setIsProfileActive(true);
      Alert.alert(
        'Profile Unfrozen',
        'Your profile is now active and visible to other users.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Error',
        result.error || 'Failed to unfreeze profile. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleInviteFriend = async () => {
    try {
      const inviteLink = 'https://shiduchim.app/invite'; // TODO: Update with actual app link
      const message = `Join Shiduchim App! A modern matchmaking platform to find your perfect match. Download here: ${inviteLink}`;
      
      await Share.share({
        message: message,
        title: 'Invite Friends to Shiduchim App',
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing invite:', error);
        Alert.alert('Error', 'Unable to share invite link');
      }
    }
  };

  const handleHowItWorks = () => {
    setShowHowItWorks(true);
  };

  const handleTermsAndConditions = () => {
    setShowTermsModal(true);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This is your last chance. Are you absolutely sure you want to delete your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    setDeletingAccount(true);
                    
                    try {
                      const result = await profileService.deleteAccount();
                      
                      if (result.success) {
                        Alert.alert(
                          'Account Deleted',
                          'Your account has been permanently deleted.',
                          [
                            {
                              text: 'OK',
                              onPress: async () => {
                                await signOut();
                                router.replace('/auth/login');
                              }
                            }
                          ]
                        );
                      } else {
                        setDeletingAccount(false);
                        Alert.alert(
                          'Error',
                          result.error || 'Failed to delete account. Please try again or contact support.'
                        );
                      }
                    } catch (error) {
                      setDeletingAccount(false);
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', 'An unexpected error occurred while deleting your account.');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
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
      <ScrollView  showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* General Section */}
        <Text style={styles.sectionTitle}>General</Text>
        
        <TouchableOpacity style={styles.settingsItem} onPress={handleHowItWorks}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="information-circle" size={24} color="#4CAF50" />
            <Text style={styles.settingsItemText}>How It Works</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsItem} onPress={handleInviteFriend}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="person-add" size={24} color="#9C27B0" />
            <Text style={styles.settingsItemText}>Invite a Friend</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingsItem} 
          onPress={handleFreezeProfile}
          disabled={loadingProfileStatus || processingFreeze}
        >
          <View style={styles.settingsItemLeft}>
            {processingFreeze ? (
              <ActivityIndicator size="small" color="#2196f3" />
            ) : (
              <Ionicons 
                name={isProfileActive ? "snow" : "sunny"} 
                size={24} 
                color={isProfileActive ? "#2196f3" : "#4CAF50"} 
              />
            )}
            <Text style={[styles.settingsItemText, (loadingProfileStatus || processingFreeze) && styles.disabledText]}>
              {loadingProfileStatus ? 'Loading...' : isProfileActive ? 'Freeze Profile' : 'Unfreeze Profile'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support</Text>

        <TouchableOpacity style={styles.settingsItem} onPress={handleReportProblem}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="flag" size={24} color="#ff6b35" />
            <Text style={styles.settingsItemText}>Report a Problem</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* Legal Section */}
        <Text style={styles.sectionTitle}>Legal</Text>

        <TouchableOpacity style={styles.settingsItem} onPress={handleTermsAndConditions}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="document-text" size={24} color="#3F51B5" />
            <Text style={styles.settingsItemText}>Terms and Conditions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.settingsItem} onPress={handleDeleteAccount}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="trash" size={24} color="#F44336" />
            <Text style={styles.settingsItemText}>Delete Account</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="log-out" size={24} color="#FF9800" />
            <Text style={styles.settingsItemText}>Logout</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* How It Works Modal */}
      <HowItWorksCarousel
        visible={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />

      {/* Terms and Conditions Modal */}
      <TermsModal
        visible={showTermsModal}
        onDecline={() => setShowTermsModal(false)}
        viewOnly={true}
      />

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

      {/* Deleting Account Loading Modal */}
      {deletingAccount && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Deleting your account...</Text>
              <Text style={styles.loadingSubtext}>Please wait, this may take a moment.</Text>
            </View>
          </View>
        </Modal>
      )}
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  disabledText: {
    opacity: 0.5,
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
  // Loading Overlay Styles
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 250,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
