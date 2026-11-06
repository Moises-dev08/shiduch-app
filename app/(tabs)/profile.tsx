import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWebTabVisible } from '../../hooks/useWebTabVisible';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileStatusModal from '../../components/ProfileStatusModal';
import SuccessModal from '../../components/SuccessModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { WebShareModal } from '../../components/WebShareModal';
import MatchmakerProfileForm from '../../components/profile/MatchmakerProfileForm';
import SinglesProfileForm from '../../components/profile/SinglesProfileForm';
import { ProfilePageShell } from '../../components/profile/ProfilePageShell';
import { useProfileShare } from '../../hooks/useProfileShare';
import { FieldPrivacy, Profile, ProfileData, profileService } from '../../lib/profileService';

interface ProfileSetupChooserProps {
  setupStep: 1 | 2;
  onSelectRole: (role: "single" | "matchmaker") => void;
  onSelectGender: (gender: "male" | "female") => void;
  onBack: () => void;
}

function ProfileSetupChooser({
  setupStep,
  onSelectRole,
  onSelectGender,
  onBack,
}: ProfileSetupChooserProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.roleModalContainer}>
      <View style={styles.roleModalContent}>
        <Text style={styles.roleModalTitle}>
          {setupStep === 1 ? "Welcome!" : "Almost there!"}
        </Text>
        <Text style={styles.roleModalSubtitle}>
          {setupStep === 1
            ? "Let's get started by setting up your profile"
            : "Just one more step to get started"}
        </Text>

        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, setupStep === 2 && styles.stepDotComplete]} />
          <View style={[styles.stepLine, setupStep === 2 && styles.stepLineComplete]} />
          <View style={[styles.stepDot, setupStep === 1 && styles.stepDotInactive]} />
        </View>

        <Text style={styles.questionText}>
          {setupStep === 1 ? "Step 1: What's your role?" : "Step 2: Select your gender:"}
        </Text>

        {setupStep === 1 && (
          <>
            <View style={styles.roleOptions}>
              <TouchableOpacity
                style={styles.roleCard}
                onPress={() => onSelectRole("single")}
              >
                <View style={styles.roleIconContainer}>
                  <Ionicons name="heart" size={40} color="#1293DA" />
                </View>
                <Text style={styles.roleTitle}>I&apos;m Single</Text>
                <Text style={styles.roleDescription}>
                  Looking to find my match
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roleCard}
                onPress={() => onSelectRole("matchmaker")}
              >
                <View style={styles.roleIconContainer}>
                  <Ionicons name="people" size={40} color="#2196F3" />
                </View>
                <Text style={styles.roleTitle}>I&apos;m a Matchmaker</Text>
                <Text style={styles.roleDescription}>
                  Helping others find their match
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.roleNote}>
              You can change your role later from your profile page.
            </Text>
          </>
        )}

        {setupStep === 2 && (
          <>
            <View style={styles.roleOptions}>
              <TouchableOpacity
                style={styles.roleCard}
                onPress={() => onSelectGender("male")}
              >
                <View style={[styles.roleIconContainer, { backgroundColor: "#E3F2FD" }]}>
                  <Ionicons name="male" size={40} color="#2196F3" />
                </View>
                <Text style={styles.roleTitle}>Male</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roleCard}
                onPress={() => onSelectGender("female")}
              >
                <View style={[styles.roleIconContainer, { backgroundColor: "#E3F2FD" }]}>
                  <Ionicons name="female" size={40} color="#1293DA" />
                </View>
                <Text style={styles.roleTitle}>Female</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={20} color="#666" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function ProfileScreen() {
  const isTabVisible = useWebTabVisible();
  const { isDesktop } = useResponsiveLayout();
  const queryClient = useQueryClient();
  // Incrementing this key forces the form to remount with fresh initialData,
  // discarding any unsaved changes when the user returns to this tab.
  const [formKey, setFormKey] = useState(0);
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      // Tab re-focused after navigating away — reset form to last saved state
      setFormKey((k) => k + 1);
    }, [])
  );

  // ── React Query — shared with connect.tsx via same key ────────────────────
  const { data: profileResult, isLoading: initialLoading, refetch: reloadProfile } = useQuery({
    queryKey: ['my_profile'],
    queryFn: () => profileService.getProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const [existingProfile, setExistingProfile] = useState<Profile | null>(null);
  const [profileStatus, setProfileStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectionReason, setRejectionReason] = useState<string>();
  const [loading, setLoading] = useState(false);
  
  // Role and gender selection for new users
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2>(1); // 1 = role, 2 = gender
  const [selectedRole, setSelectedRole] = useState<'single' | 'matchmaker' | null>(null);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false); // Track if profile was submitted
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [roleSwitched, setRoleSwitched] = useState(false); // Show banner after a role switch
  
  // Success and status modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSwitchConfirmModal, setShowSwitchConfirmModal] = useState(false);
  
  const {
    isSharing,
    shareProfile,
    showWebShareModal,
    webShareUrl,
    closeWebShareModal,
    copyWebShareUrl,
  } = useProfileShare();

  // Sync query result to local UI state
  useEffect(() => {
    if (profileResult === undefined) return; // still loading
    if (profileResult?.success && profileResult.profile) {
      const profile = profileResult.profile;
      setExistingProfile(profile);
      setProfileStatus(profile.status);
      setRejectionReason(profile.rejection_reason);
      setSelectedRole(profile.role as 'single' | 'matchmaker');
      setSelectedGender(profile.gender as 'male' | 'female');
      setHasSubmitted(true);
      if (profile.status === 'pending' || profile.status === 'rejected') {
        setShowStatusModal(true);
      }
    } else if (profileResult?.success && !profileResult.profile) {
      // New account: getProfile() returns success with no row (PGRST116) — start role/gender setup.
      setExistingProfile(null);
      setHasSubmitted(false);
      setShowSetupModal(true);
      setSetupStep(1);
    } else if (profileResult && !profileResult.success) {
      // Transient error (e.g. brief "not authenticated" right after login) — do NOT open
      // the setup modal, which would incorrectly start the account-creation flow.
      // The React Query will retry and the correct state will arrive shortly.
    }
  }, [profileResult]);

  // Auto-close status modal when profile becomes approved
  useEffect(() => {
    if (profileStatus === 'approved' && showStatusModal) {
      setShowStatusModal(false);
      setRejectionReason('');
      setSuccessMessage({
        title: 'Profile Approved!',
        message: 'Your profile has been approved! You now have access to all features of the app.'
      });
      setShowSuccessModal(true);
    }
  }, [profileStatus, showStatusModal]);

  // Poll for status updates when profile is pending or rejected
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    // If status modal is showing (pending or rejected), check for status updates
    if (showStatusModal && (profileStatus === 'pending' || profileStatus === 'rejected')) {
      intervalId = setInterval(async () => {
        console.log('Profile tab: Polling for status update...');
        const result = await profileService.getProfile();
        if (result.success && result.profile) {
          setProfileStatus(result.profile.status);
          setRejectionReason(result.profile.rejection_reason);
        }
      }, 5000); // Check every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [showStatusModal, profileStatus]);

  const handleRoleSelection = (role: 'single' | 'matchmaker') => {
    setSelectedRole(role);
    setSetupStep(2); // Move to gender selection
  };

  const handleGenderSelection = (gender: 'male' | 'female') => {
    setSelectedGender(gender);
    setShowSetupModal(false); // Close modal and show form
  };

  const handleBackToRoleSelection = () => {
    setSetupStep(1);
    setSelectedRole(null);
  };

  const handleChangeRoleGender = () => {
    if (!hasSubmitted) {
      setSetupStep(1);
      setShowSetupModal(true);
    }
  };

  const handleSwitchRole = () => {
    setShowSwitchConfirmModal(true);
  };

  const handleConfirmSwitchRole = async () => {
    const targetRole = selectedRole === 'single' ? 'matchmaker' : 'single';
    setIsSwitchingRole(true);
    try {
      const result = await profileService.switchRole(targetRole);
      if (result.success && result.profile) {
        setExistingProfile(result.profile);
        setSelectedRole(targetRole);
        setProfileStatus('pending');
        setHasSubmitted(true);
        setRoleSwitched(true);
        setFormKey((k) => k + 1);
        queryClient.invalidateQueries({ queryKey: ['my_profile'] });
        setShowSwitchConfirmModal(false);
        setShowStatusModal(true);
      } else {
        setShowSwitchConfirmModal(false);
        setSuccessMessage({
          title: 'Error',
          message: result.error || 'Failed to switch role',
        });
        setShowSuccessModal(true);
      }
    } catch {
      setShowSwitchConfirmModal(false);
      setSuccessMessage({
        title: 'Error',
        message: 'An unexpected error occurred',
      });
      setShowSuccessModal(true);
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const transformProfileToFormData = (profile: Profile): any => {
    // Convert storage paths to public URLs
    const pictureUrls = (profile.pictures || []).map((path: string) => {
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
      }
      return profileService.getImageUrl(path);
    });

    return {
      firstName: profile.first_name,
      lastName: profile.last_name,
      dob: profile.dob,
      bio: profile.bio,
      phone: profile.phone,
      email: profile.email,
      whatsapp: profile.whatsapp,
      pictures: pictureUrls,
      picturePrivacy: profile.picture_privacy,
      whatLookingFor: profile.what_looking_for,
      height: profile.height,
      locationCity: profile.location_city,
      locationState: profile.location_state,
      locationCountry: profile.location_country,
      languages: profile.languages,
      nationality: profile.nationality,
      isCohen: profile.is_cohen,
      hashkafaType: profile.hashkafa_type,
      religiousLevel: profile.religious_level,
      culturalOrigin: profile.cultural_origin,
      torahLearning: profile.torah_learning,
      praying: profile.praying,
      educationLevel: profile.education_level,
      postHighSchoolPath: profile.post_high_school_path,
      currentOccupationStudy: profile.current_occupation_study,
      planAfterMarriage: profile.plan_after_marriage,
      maritalStatus: profile.marital_status,
      dressStyle: profile.dress_style,
      wearsBlackHat: profile.wears_black_hat,
      headCovering: profile.head_covering,
      smoking: profile.smoking,
      alcoholConsumption: profile.alcohol_consumption,
      resumeUrl: profile.resume_url,
      fieldPrivacy: profile.field_privacy,
    };
  };

  const handleFormSubmit = async (formData: any, fieldPrivacy?: FieldPrivacy) => {
    setLoading(true);
    try {
      // Prepare profile data
      const profileData: ProfileData = {
        ...formData,
        role: selectedRole!,
        gender: selectedGender!,
      };

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await profileService.updateProfile(profileData, fieldPrivacy);
      } else {
        // Create new profile
        result = await profileService.createProfile(profileData, fieldPrivacy);
      }

      if (result.success && result.profile) {
        setExistingProfile(result.profile);
        setProfileStatus(result.profile.status);
        setHasSubmitted(true);
        setRoleSwitched(false); // Banner dismisses after successful submit
        if (result.profile.rejection_reason) {
          setRejectionReason(result.profile.rejection_reason);
        }

        // Reload profile to get the converted public URLs for images
        await reloadProfile();
        queryClient.invalidateQueries({ queryKey: ['my_profile'] });

        // Determine success message
        const isNewProfile = !existingProfile;
        const wasResubmitted = result.wasResubmitted;
        const isUpdate = existingProfile && !wasResubmitted;
        
        let title = 'Success!';
        let message = '';
        
        if (wasResubmitted) {
          title = 'Profile Resubmitted! 📝';
          message = 'Your profile has been updated and resubmitted for admin review. You cannot use the app until it\'s approved. We\'ll notify you once it\'s reviewed!';
        } else if (isNewProfile) {
          title = 'Profile Created! 🎉';
          message = 'Your profile has been created successfully and is now pending admin approval. You cannot use the app until it\'s approved. You\'ll be notified once it\'s reviewed!';
        } else if (isUpdate) {
          title = 'Profile Updated! ✨';
          message = 'Your profile has been updated successfully! Your changes are now pending admin approval. You cannot use the app until your profile is approved again.';
        }
        
        setSuccessMessage({ title, message });
        setShowSuccessModal(true);
        setShowStatusModal(false);

        if (result.profile.status === 'pending') {
          setProfileStatus('pending');
          await reloadProfile();
        }
      } else {
        setSuccessMessage({
          title: 'Error',
          message: result.error || 'Failed to save profile',
        });
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSuccessMessage({
        title: 'Error',
        message: 'An unexpected error occurred',
      });
      setShowSuccessModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    
    // If profile was just approved, navigate to home
    if (profileStatus === 'approved') {
      router.replace('/(tabs)');
    } else {
      // Otherwise, if profile is not approved (pending or rejected), show the status modal
      setShowStatusModal(true);
    }
  };

  const handleShareProfile = async () => {
    try {
      if (!existingProfile || profileStatus !== 'approved') {
        setSuccessMessage({
          title: 'Cannot share',
          message: 'Please complete and get your profile approved before sharing.',
        });
        setShowSuccessModal(true);
        return;
      }

      await shareProfile(existingProfile);
    } catch (error) {
      console.error('Error sharing profile:', error);
      setSuccessMessage({
        title: 'Error',
        message: 'Unable to share profile',
      });
      setShowSuccessModal(true);
    }
  };

  const savedRole =
    existingProfile?.role === "single" || existingProfile?.role === "matchmaker"
      ? existingProfile.role
      : null;
  const viewerRole = savedRole ?? selectedRole;
  const viewerGender =
    existingProfile?.gender === "male" || existingProfile?.gender === "female"
      ? existingProfile.gender
      : selectedGender;

  if (!isTabVisible) {
    return null;
  }

  if (showSetupModal && Platform.OS === "web") {
    return (
      <ProfileSetupChooser
        setupStep={setupStep}
        onSelectRole={handleRoleSelection}
        onSelectGender={handleGenderSelection}
        onBack={handleBackToRoleSelection}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ProfilePageShell
        profileStatus={profileStatus}
        rejectionReason={rejectionReason}
        onShare={handleShareProfile}
        isSharing={isSharing}
        showStatusBanner={hasSubmitted}
      >
        {/* Header */}
        <View style={isDesktop ? styles.desktopHeader : styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={isDesktop ? styles.desktopTitle : styles.title}>
                {isDesktop ? 'My Profile' : 'Profile Setup'}
              </Text>
              <Text style={isDesktop ? styles.desktopSubtitle : styles.subtitle}>
                {isDesktop
                  ? existingProfile?.status === 'approved'
                    ? 'Your profile is live and visible to the community'
                    : existingProfile?.status === 'pending'
                    ? 'Your profile is under review by our team'
                    : 'Complete your profile to start connecting'
                  : viewerRole === 'single'
                    ? 'Tell us about yourself'
                    : viewerRole === 'matchmaker'
                      ? 'Matchmaker profile'
                      : 'Loading your profile'}
              </Text>
            </View>
            <View style={styles.headerButtons}>
              {selectedRole && selectedGender && !hasSubmitted && (
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={handleChangeRoleGender}
                >
                  <Ionicons name="swap-horizontal" size={20} color="#1293DA" />
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
              )}
              {!isDesktop && existingProfile && profileStatus === 'approved' && (
                <TouchableOpacity
                  style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
                  onPress={handleShareProfile}
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <Ionicons name="share-social" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => router.push('/(tabs)/settings')}
              >
                <Ionicons name="settings" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          {hasSubmitted && (
            <TouchableOpacity
              style={[styles.switchRoleButton, isSwitchingRole && styles.changeButtonDisabled]}
              onPress={handleSwitchRole}
              disabled={isSwitchingRole}
            >
              {isSwitchingRole ? (
                <ActivityIndicator size="small" color="#1293DA" />
              ) : (
                <>
                  <Ionicons name="swap-horizontal" size={18} color="#1293DA" />
                  <Text style={styles.switchRoleButtonText}>
                    {selectedRole === 'single' ? 'Switch to Matchmaker' : 'Switch to Single'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Loading State or Form Content */}
        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1293DA" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : viewerRole && viewerGender ? (
          viewerRole === 'single' ? (
            <SinglesProfileForm
              key={formKey}
              initialData={existingProfile ? transformProfileToFormData(existingProfile) : undefined}
              onSubmit={handleFormSubmit}
              gender={viewerGender}
              loading={loading}
              roleSwitched={roleSwitched}
            />
          ) : (
            <MatchmakerProfileForm
              key={formKey}
              initialData={existingProfile ? transformProfileToFormData(existingProfile) : undefined}
              onSubmit={handleFormSubmit}
              gender={viewerGender}
              loading={loading}
              roleSwitched={roleSwitched}
            />
          )
        ) : null}
      </ProfilePageShell>

      <Modal
        visible={showSetupModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <ProfileSetupChooser
          setupStep={setupStep}
          onSelectRole={handleRoleSelection}
          onSelectGender={handleGenderSelection}
          onBack={handleBackToRoleSelection}
        />
      </Modal>

      {/* Success Modal */}
      {showSuccessModal && (
        <SuccessModal
          visible
          title={successMessage.title}
          message={successMessage.message}
          onClose={handleSuccessModalClose}
          buttonText="Continue"
        />
      )}

      {/* Web Share Modal (Web only) */}
      <WebShareModal
        visible={showWebShareModal}
        url={webShareUrl}
        onClose={closeWebShareModal}
        onCopy={copyWebShareUrl}
      />

      {/* Profile Status Modal */}
      <ProfileStatusModal
        visible={showStatusModal}
        status={profileStatus}
        rejectionReason={rejectionReason}
        onClose={() => {
          setShowStatusModal(false);
          setShowSuccessModal(false);
          if (profileStatus === 'approved') {
            router.replace('/(tabs)');
          }
        }}
        onStatusChange={(newStatus) => {
          setProfileStatus(newStatus);
          if (newStatus === 'approved') {
            setRejectionReason('');
            setShowStatusModal(false);
            setSuccessMessage({
              title: 'Profile Approved!',
              message: 'Your profile has been approved! You now have access to all features of the app.'
            });
            setShowSuccessModal(true);
          }
        }}
      />

      {/* Switch Role Confirmation Modal */}
      <ConfirmationModal
        visible={showSwitchConfirmModal}
        title={`Switch to ${selectedRole === 'single' ? 'Matchmaker' : 'Single'}?`}
        message={`Your current role-specific data will be saved and restored if you switch back.\n\nYour profile will need admin approval again before you can use the app. You will need to fill in any required fields for your new role before submitting.`}
        confirmText="Switch"
        cancelText="Cancel"
        onConfirm={handleConfirmSwitchRole}
        onCancel={() => setShowSwitchConfirmModal(false)}
        loading={isSwitchingRole}
        iconName="swap-horizontal"
        iconColor="#1293DA"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  desktopHeader: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  desktopTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  desktopSubtitle: {
    fontSize: 15,
    color: '#666',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    gap: 4,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1293DA',
  },
  changeButtonDisabled: {
    opacity: 0.5,
  },
  switchRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    gap: 6,
  },
  switchRoleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1293DA',
  },
  shareButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  roleModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  roleModalContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  roleModalTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  roleModalSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1293DA',
  },
  stepDotInactive: {
    backgroundColor: '#e0e0e0',
  },
  stepDotComplete: {
    backgroundColor: '#4CAF50',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  stepLineComplete: {
    backgroundColor: '#4CAF50',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  roleIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  roleNote: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    padding: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
});

