import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import FeedbackModal from "../../components/FeedbackModal";
import HowItWorksCarousel from "../../components/HowItWorksCarousel";
import TermsModal from "../../components/TermsModal";
import { WebShareModal } from "../../components/WebShareModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import InfoModal from "../../components/InfoModal";
import { useAuth } from "../../lib/AuthContext";
import {
  engagementService,
  EngagementWithProfiles,
} from "../../lib/engagementService";
import { profileService } from "../../lib/profileService";
import { webPageLayout } from "../../styles/webPageLayout";

export default function SettingsScreen() {
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [isProfileActive, setIsProfileActive] = useState(true);
  const [loadingProfileStatus, setLoadingProfileStatus] = useState(true);
  const [notifyMatchEmail, setNotifyMatchEmail] = useState(true);
  const [updatingMatchEmail, setUpdatingMatchEmail] = useState(false);
  const [profileInfo, setProfileInfo] = useState<{
    firstName: string;
    lastName: string;
    id: string;
  } | null>(null);
  const [processingFreeze, setProcessingFreeze] = useState(false);
  const [myEngagement, setMyEngagement] =
    useState<EngagementWithProfiles | null>(null);
  const [loadingEngagement, setLoadingEngagement] = useState(true);
  const { signOut } = useAuth();

  // Modal states
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUndoEngagementConfirm, setShowUndoEngagementConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFinalDeleteConfirm, setShowFinalDeleteConfirm] = useState(false);
  const [infoModal, setInfoModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    iconName?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    onClose?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  // Fetch profile status and engagement when screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchProfileStatus = async () => {
        setLoadingProfileStatus(true);
        const result = await profileService.getProfile();
        if (result.success && result.profile) {
          setIsProfileActive(result.profile.is_active);
          setNotifyMatchEmail(result.profile.notify_match_email !== false);
          setProfileInfo({
            firstName: result.profile.first_name || "",
            lastName: result.profile.last_name || "",
            id: result.profile.id || "",
          });
        }
        setLoadingProfileStatus(false);
      };

      const fetchEngagement = async () => {
        setLoadingEngagement(true);
        const result = await engagementService.getMyEngagement();
        if (result.success) {
          setMyEngagement(result.engagement || null);
        }
        setLoadingEngagement(false);
      };

      fetchProfileStatus();
      fetchEngagement();
    }, []),
  );

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    router.replace("/auth/login");
  };

  const handleReportProblem = async () => {
    const subject = encodeURIComponent("Problem Report – Zivug Mishamayim");

    const userLine = profileInfo
      ? `Name: ${profileInfo.firstName} ${profileInfo.lastName}\nUser ID: ${profileInfo.id}`
      : "";

    const body = encodeURIComponent(
      `Please describe the problem you encountered:\n\n\n\n` +
        `---\n${userLine}`,
    );

    const mailtoUrl = `mailto:support@zivugmishamayim.com?subject=${subject}&body=${body}`;

    const canOpen = await Linking.canOpenURL(mailtoUrl);
    if (canOpen) {
      Linking.openURL(mailtoUrl);
    } else {
      setInfoModal({
        visible: true,
        title: 'No email app found',
        message: 'Please send your report directly to support@zivugmishamayim.com',
        iconName: 'mail',
        iconColor: '#FF9800',
      });
    }
  };

  const handleFreezeProfile = () => {
    if (isProfileActive) {
      setShowFreezeModal(true);
    } else {
      // Unfreeze directly without modal
      handleUnfreezeProfile();
    }
  };

  const handleToggleMatchEmail = async (): Promise<void> => {
    const next = !notifyMatchEmail;
    setUpdatingMatchEmail(true);
    const result = await profileService.setNotifyMatchEmail(next);
    setUpdatingMatchEmail(false);
    if (result.success) {
      setNotifyMatchEmail(next);
    } else {
      setInfoModal({
        visible: true,
        title: 'Error',
        message: result.error || 'Failed to update email preference',
        iconName: 'alert-circle',
        iconColor: '#F44336',
      });
    }
  };

  const confirmFreezeProfile = async () => {
    setShowFreezeModal(false);
    setProcessingFreeze(true);

    const result = await profileService.freezeProfile();
    setProcessingFreeze(false);

    if (result.success) {
      setIsProfileActive(false);
      setInfoModal({
        visible: true,
        title: 'Profile Frozen',
        message: 'Your profile has been frozen and will not be visible to other users.',
        iconName: 'snow',
        iconColor: '#2196F3',
      });
    } else {
      setInfoModal({
        visible: true,
        title: 'Error',
        message: result.error || 'Failed to freeze profile. Please try again.',
        iconName: 'alert-circle',
        iconColor: '#F44336',
      });
    }
  };

  const handleUnfreezeProfile = async () => {
    setProcessingFreeze(true);

    const result = await profileService.unfreezeProfile();
    setProcessingFreeze(false);

    if (result.success) {
      setIsProfileActive(true);
      setInfoModal({
        visible: true,
        title: 'Profile Unfrozen',
        message: 'Your profile is now active and visible to other users.',
        iconName: 'sunny',
        iconColor: '#4CAF50',
      });
    } else {
      setInfoModal({
        visible: true,
        title: 'Error',
        message: result.error || 'Failed to unfreeze profile. Please try again.',
        iconName: 'alert-circle',
        iconColor: '#F44336',
      });
    }
  };

  const handleInviteFriend = async () => {
    // Use different URLs for web vs mobile
    const inviteLink = Platform.OS === "web" 
      ? "https://zivugmishamayim.com"
      : "https://zivugmishamayim.com/invite";
    const message =
      "Join me on Zivug Mishamayim — a Jewish matchmaking app to find your perfect match. Download it here:";

    // Web platform: show share modal
    if (Platform.OS === "web") {
      setShowInviteModal(true);
      return;
    }

    // Mobile platforms: use native Share API
    try {
      await Share.share(
        Platform.OS === "ios"
          ? { message, url: inviteLink }
          : { message: `${message}\n${inviteLink}` },
        { dialogTitle: "Invite a friend" },
      );
    } catch (error: any) {
      if (error.message !== "User did not share") {
        console.error("Error sharing invite:", error);
        setInfoModal({
          visible: true,
          title: 'Error',
          message: 'Unable to share invite link',
          iconName: 'alert-circle',
          iconColor: '#F44336',
        });
      }
    }
  };

  const handleCopyInviteLink = async () => {
    // Use different URLs for web vs mobile
    const inviteLink = Platform.OS === "web"
      ? "https://zivugmishamayim.com"
      : "https://zivugmishamayim.com/invite";
    try {
      await Clipboard.setStringAsync(inviteLink);
      setInfoModal({
        visible: true,
        title: 'Success',
        message: 'Invite link copied to clipboard!',
        iconName: 'checkmark-circle',
        iconColor: '#4CAF50',
      });
    } catch (error) {
      console.error("Error copying invite link:", error);
      setInfoModal({
        visible: true,
        title: 'Error',
        message: 'Failed to copy link to clipboard.',
        iconName: 'alert-circle',
        iconColor: '#F44336',
      });
    }
  };

  const handleHowItWorks = () => {
    setShowHowItWorks(true);
  };

  const handleTermsAndConditions = () => {
    setShowTermsModal(true);
  };

  const handleUndoEngagement = () => {
    if (!myEngagement) return;
    setShowUndoEngagementConfirm(true);
  };

  const confirmUndoEngagement = async () => {
    if (!myEngagement) return;
    
    setShowUndoEngagementConfirm(false);
    const result = await engagementService.undoEngagement(myEngagement.id);
    
    if (result.success) {
      setMyEngagement(null);
      setInfoModal({
        visible: true,
        title: 'Engagement Undone',
        message: 'Your engagement has been removed.',
        iconName: 'checkmark-circle',
        iconColor: '#4CAF50',
      });
    } else {
      setInfoModal({
        visible: true,
        title: 'Error',
        message: result.error || 'Failed to undo engagement',
        iconName: 'alert-circle',
        iconColor: '#F44336',
      });
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true);
  };

  const handleFinalDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setShowFinalDeleteConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    setShowFinalDeleteConfirm(false);
    setDeletingAccount(true);

    try {
      const result = await profileService.deleteAccount();

      if (result.success) {
        setDeletingAccount(false);
        setInfoModal({
          visible: true,
          title: 'Account Deleted',
          message: 'Your account has been permanently deleted.',
          iconName: 'checkmark-circle',
          iconColor: '#4CAF50',
          onClose: async () => {
            await signOut();
            router.replace("/auth/login");
          },
        });
      } else {
        setDeletingAccount(false);
        setInfoModal({
          visible: true,
          title: 'Error',
          message: result.error || 'Failed to delete account. Please try again or contact support.',
          iconName: 'alert-circle',
          iconColor: '#F44336',
        });
      }
    } catch (error) {
      setDeletingAccount(false);
      console.error("Error deleting account:", error);
      setInfoModal({
        visible: true,
        title: 'Error',
        message: 'An unexpected error occurred while deleting your account.',
        iconName: 'alert-circle',
        iconColor: '#F44336',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)/profile")}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.content, webPageLayout.centeredContent]}>
          {/* General Section */}
          <Text style={styles.sectionTitle}>General</Text>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={handleHowItWorks}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="information-circle" size={24} color="#4CAF50" />
              <Text style={styles.settingsItemText}>How It Works</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={handleInviteFriend}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="person-add" size={24} color="#1293DA" />
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
              <Text
                style={[
                  styles.settingsItemText,
                  (loadingProfileStatus || processingFreeze) &&
                    styles.disabledText,
                ]}
              >
                {loadingProfileStatus
                  ? "Loading..."
                  : isProfileActive
                    ? "Freeze Profile"
                    : "Unfreeze Profile"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {Platform.OS === "web" && (
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={handleToggleMatchEmail}
              disabled={loadingProfileStatus || updatingMatchEmail}
            >
              <View style={styles.settingsItemLeft}>
                {updatingMatchEmail ? (
                  <ActivityIndicator size="small" color="#1293DA" />
                ) : (
                  <Ionicons
                    name={notifyMatchEmail ? "mail" : "mail-outline"}
                    size={24}
                    color="#1293DA"
                  />
                )}
                <View style={styles.settingsItemTextWrap}>
                  <Text
                    style={[
                      styles.settingsItemTextNoMargin,
                      (loadingProfileStatus || updatingMatchEmail) &&
                        styles.disabledText,
                    ]}
                  >
                    Email me when I get a match
                  </Text>
                  <Text style={styles.settingsItemHint}>
                    {notifyMatchEmail ? "On" : "Off"} — uses your account email
                  </Text>
                </View>
              </View>
              <Ionicons
                name={notifyMatchEmail ? "toggle" : "toggle-outline"}
                size={36}
                color={notifyMatchEmail ? "#1293DA" : "#ccc"}
              />
            </TouchableOpacity>
          )}

          {/* Support Section */}
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={handleReportProblem}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="flag" size={24} color="#ff6b35" />
              <Text style={styles.settingsItemText}>Report a Problem</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* Feedback Section */}
          <Text style={styles.sectionTitle}>Feedback</Text>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => setShowFeedbackModal(true)}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="chatbox-ellipses" size={24} color="#1293DA" />
              <Text style={styles.settingsItemText}>Give Us Feedback</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* Legal Section */}
          <Text style={styles.sectionTitle}>Legal</Text>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={handleTermsAndConditions}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="document-text" size={24} color="#3F51B5" />
              <Text style={styles.settingsItemText}>Terms and conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() =>
              Linking.openURL("https://zivugmishamayim.com/privacy")
            }
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="shield-checkmark" size={24} color="#3F51B5" />
              <Text style={styles.settingsItemText}>Privacy policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* Account Section */}
          <Text style={styles.sectionTitle}>Account</Text>

          {/* Undo Engagement Option - only show if user is engaged */}
          {!loadingEngagement && myEngagement && (
            <>
              <Text style={styles.sectionTitle}>Relationship Status</Text>
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={handleUndoEngagement}
              >
                <View style={styles.settingsItemLeft}>
                  <Ionicons name="heart-dislike" size={24} color="#9b59b6" />
                  <Text style={styles.settingsItemText}>Undo Engagement</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={handleDeleteAccount}
          >
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

          <Text style={styles.versionText}>
            Version {Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
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

      {/* Feedback Modal */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      {/* Invite Friend Web Share Modal */}
      <WebShareModal
        visible={showInviteModal}
        url="https://zivugmishamayim.com"
        onClose={() => setShowInviteModal(false)}
        onCopy={handleCopyInviteLink}
      />

      {/* Freeze Profile Confirmation Modal */}
      <Modal
        visible={showFreezeModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.freezeModalOverlay}>
          <View style={styles.freezeModal}>
            <View style={styles.freezeModalHeader}>
              <Ionicons name="snow" size={32} color="#2196f3" />
              <Text style={styles.freezeModalTitle}>Freeze Your Profile</Text>
            </View>

            <View style={styles.freezeModalContent}>
              <Text style={styles.freezeModalDescription}>
                Freezing your profile will make it invisible to other users. You
                can unfreeze it anytime from your settings.
              </Text>

              <Text style={styles.freezeModalWarning}>
                ⚠️ This action will hide your profile from all potential matches
                until you unfreeze it.
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
                <Text style={styles.freezeModalConfirmText}>
                  Freeze Profile
                </Text>
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
              <Text style={styles.loadingSubtext}>
                Please wait, this may take a moment.
              </Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        iconName="log-out"
        iconColor="#FF9800"
      />

      {/* Undo Engagement Confirmation Modal */}
      {myEngagement && (
        <ConfirmationModal
          visible={showUndoEngagementConfirm}
          title="Undo Engagement"
          message={`Are you sure you want to undo your engagement with ${
            myEngagement.user1_profile?.first_name ||
            myEngagement.user2_profile?.first_name ||
            "your partner"
          }? This will remove your engagement from the public successful matches list.`}
          confirmText="Undo Engagement"
          cancelText="Cancel"
          onConfirm={confirmUndoEngagement}
          onCancel={() => setShowUndoEngagementConfirm(false)}
          iconName="heart-dislike"
          iconColor="#9b59b6"
        />
      )}

      {/* Delete Account First Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteConfirm}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be permanently removed."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleFinalDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        iconName="trash"
        iconColor="#F44336"
      />

      {/* Delete Account Final Confirmation Modal */}
      <ConfirmationModal
        visible={showFinalDeleteConfirm}
        title="Final Confirmation"
        message="This is your last chance. Are you absolutely sure you want to delete your account?"
        confirmText="Delete Forever"
        cancelText="Cancel"
        onConfirm={confirmDeleteAccount}
        onCancel={() => setShowFinalDeleteConfirm(false)}
        iconName="warning"
        iconColor="#F44336"
      />

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        iconName={infoModal.iconName}
        iconColor={infoModal.iconColor}
        onClose={() => {
          if (infoModal.onClose) {
            infoModal.onClose();
          }
          setInfoModal({ visible: false, title: '', message: '' });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 40, // Same width as back button to center title
  },
  content: {
    padding: 20,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 20,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingsItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingsItemText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  settingsItemTextNoMargin: {
    fontSize: 16,
    color: "#333",
  },
  settingsItemTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  settingsItemHint: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  disabledText: {
    opacity: 0.5,
  },
  // Freeze Modal Styles
  freezeModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  freezeModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  freezeModalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  freezeModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
  },
  freezeModalContent: {
    marginBottom: 24,
  },
  freezeModalDescription: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
    marginBottom: 16,
  },
  freezeModalWarning: {
    fontSize: 14,
    color: "#ff6b35",
    lineHeight: 20,
    backgroundColor: "#fff3e0",
    padding: 12,
    borderRadius: 8,
  },
  freezeModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  freezeModalCancel: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  freezeModalCancelText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
    textAlign: "center",
  },
  freezeModalConfirm: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#2196f3",
    alignItems: "center",
    textAlign: "center",
  },
  freezeModalConfirmText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    alignItems: "center",
    textAlign: "center",
  },
  versionText: {
    textAlign: "center",
    fontSize: 13,
    color: "#aaa",
    marginTop: 24,
    marginBottom: 8,
  },
  // Loading Overlay Styles
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    minWidth: 250,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    textAlign: "center",
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
});
