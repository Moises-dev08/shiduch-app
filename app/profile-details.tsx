import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AskForInfoModal from "../components/AskForInfoModal";
import EngagementButton from "../components/EngagementButton";
import PictureViewerModal from "../components/home/PictureViewerModal";
import ReportProfileModal from "../components/home/ReportProfileModal";
import ContinuationChoiceModal from "../components/intro/ContinuationChoiceModal";
import MiddlePersonSelectionModal from "../components/intro/MiddlePersonSelectionModal";
import PreviousSuggestionWarningModal from "../components/suggestion/PreviousSuggestionWarningModal";
import ProfileGridSelectionModal from "../components/suggestion/ProfileGridSelectionModal";
import { infoRequestService } from "../lib/infoRequestService";
import { introService } from "../lib/introService";
import { pictureViewService } from "../lib/pictureViewService";
import { Profile as DBProfile, profileService } from "../lib/profileService";
import { suggestionService } from "../lib/suggestionService";
import { supabase } from "../lib/supabase";
import { calculateAge } from "../lib/utils";
import { Profile } from "../types/homeTypes";
import { profileDetailsStyles } from "./styles";

const styles = profileDetailsStyles;

async function fetchProfileDetails(profileId: string) {
  const [currentProfileResult, introResult, { data, error }, infoRequestResult] =
    await Promise.all([
      profileService.getProfile(),
      introService.getMyIntroRequests(),
      supabase.from("profiles").select("*").eq("id", profileId).single(),
      infoRequestService.getSentRequests(),
    ]);

  if (error || !data) throw new Error("Profile not found");

  // Current user profile
  const currentUserProfile =
    currentProfileResult.success ? currentProfileResult.profile ?? null : null;

  // Existing intro request (either direction)
  let existingIntroRequest: any = null;
  if (introResult.success) {
    const activeStatuses = [
      "pending_matchmaker",
      "pending_requested",
      "accepted",
      "completed",
    ] as const;
    const sent = introResult.sentRequests?.find(
      (r) =>
        r.requested_profile_id === profileId &&
        activeStatuses.includes(r.status as any),
    );
    const received = introResult.receivedRequests?.find(
      (r) =>
        r.requester_id === profileId &&
        activeStatuses.includes(r.status as any),
    );
    existingIntroRequest = sent ?? received ?? null;
  }

  // Approved info fields
  const currentApprovedFields = new Set<string>();
  if (infoRequestResult.success && infoRequestResult.requests) {
    infoRequestResult.requests
      .filter(
        (r) => r.requested_profile_id === profileId && r.status === "approved",
      )
      .forEach((r) => currentApprovedFields.add(r.field_name));
  }

  // Privacy helpers
  const fieldPrivacy = data.field_privacy || {};
  const picturePrivacy = data.picture_privacy || "none";

  const shouldShowField = (privacyFieldName: string, dbFieldName?: string) => {
    const dbField = dbFieldName || privacyFieldName;
    return !fieldPrivacy[privacyFieldName] || currentApprovedFields.has(dbField);
  };

  // One-time picture view status
  let hasPicturesBeenViewed = false;
  if (picturePrivacy === "one_time") {
    const viewResult = await pictureViewService.hasViewedPictures(profileId);
    if (viewResult.success) hasPicturesBeenViewed = viewResult.hasViewed;
  }

  const showPictures =
    picturePrivacy === "always" ||
    picturePrivacy === "private" ||
    (picturePrivacy === "one_time" && !hasPicturesBeenViewed);

  const firstPicture =
    showPictures && data.pictures?.length > 0
      ? profileService.getImageUrl(data.pictures[0])
      : "";
  const allPictures =
    showPictures && data.pictures?.length > 0
      ? data.pictures.map((pic: string) => profileService.getImageUrl(pic))
      : [];

  const locationString =
    data.location_country === "United States"
      ? `${data.location_city}, ${data.location_state}${data.location_country ? ", " + data.location_country : ""}`
      : data.location_country;
  const location =
    fieldPrivacy.location_city || fieldPrivacy.location_state
      ? "Hidden"
      : locationString;

  const displayProfile: import("../types/homeTypes").Profile = {
    id: data.id,
    first_name: data.first_name,
    last_name: data.last_name,
    name: `${data.first_name} ${data.last_name}`,
    dob: shouldShowField("dob") ? data.dob : undefined,
    picture: firstPicture,
    pictures: allPictures,
    hashkafa_type: shouldShowField("hashkafa_type") ? data.hashkafa_type : undefined,
    location,
    bio: data.bio || "No bio available",
    role: data.role,
    gender: data.gender,
    phone: shouldShowField("phone") ? data.phone : undefined,
    email: shouldShowField("email") ? data.email : undefined,
    whatsapp: shouldShowField("whatsapp") ? data.whatsapp : undefined,
    height: shouldShowField("height") ? data.height : undefined,
    hasChildren: shouldShowField("hasChildren") ? data.has_children : undefined,
    picturePrivacy: currentApprovedFields.has("pictures") ? "always" : picturePrivacy,
    field_privacy: fieldPrivacy,
    what_looking_for: shouldShowField("what_looking_for") ? data.what_looking_for : undefined,
    location_city: shouldShowField("location_city") ? data.location_city : undefined,
    location_state: shouldShowField("location_state") ? data.location_state : undefined,
    location_country: shouldShowField("location_country") ? data.location_country : undefined,
    languages: shouldShowField("languages") ? data.languages : undefined,
    nationality: shouldShowField("nationality") ? data.nationality : undefined,
    is_cohen: shouldShowField("is_cohen") ? data.is_cohen : undefined,
    torah_learning: shouldShowField("torahLearning", "torah_learning") ? data.torah_learning : undefined,
    praying: shouldShowField("praying") ? data.praying : undefined,
    education_level: shouldShowField("educationLevel", "education_level") ? data.education_level : undefined,
    post_high_school_path: shouldShowField("post_high_school_path") ? data.post_high_school_path : undefined,
    current_occupation_study: shouldShowField("current_occupation_study") ? data.current_occupation_study : undefined,
    plan_after_marriage: shouldShowField("plan_after_marriage") ? data.plan_after_marriage : undefined,
    marital_status: shouldShowField("marital_status") ? data.marital_status : undefined,
    dress_style: shouldShowField("dress_style") ? data.dress_style : undefined,
    wears_black_hat: shouldShowField("wears_black_hat") ? data.wears_black_hat : undefined,
    head_covering: shouldShowField("head_covering") ? data.head_covering : undefined,
    smoking: shouldShowField("smoking") ? data.smoking : undefined,
    alcohol_consumption: shouldShowField("alcohol_consumption") ? data.alcohol_consumption : undefined,
    last_active_at: data.last_active_at,
  };

  return { displayProfile, currentUserProfile, rawData: data, existingIntroRequest, hasPicturesBeenViewed };
}

export default function ProfileDetailsScreen() {
  const params = useLocalSearchParams();
  const profileId = (params.profileId || params.id) as string;
  const hideActions = params.hideActions === "true"; // Hide actions when viewing from suggestions

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] =
    useState<DBProfile | null>(null);
  const [rawProfileData, setRawProfileData] = useState<any>(null); // Store raw data to check if fields have values
  // React Query — cache per profileId so re-opening the same profile is instant
  const {
    data: profileQueryData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["profile_details", profileId],
    queryFn: () => fetchProfileDetails(profileId),
    enabled: !!profileId && profileId !== "undefined" && profileId !== "",
    staleTime: 2 * 60 * 1000,
  });
  const [imageError, setImageError] = useState(false);
  const [showPictureViewer, setShowPictureViewer] = useState(false);
  const [selectedPictureIndex, setSelectedPictureIndex] = useState(0);

  // Intro request flow states
  const [showMiddlePersonModal, setShowMiddlePersonModal] = useState(false);
  const [selectedMiddlePerson, setSelectedMiddlePerson] = useState<any>(null);
  const [showContinuationChoiceModal, setShowContinuationChoiceModal] =
    useState(false);
  const [requesterContinuationChoice, setRequesterContinuationChoice] =
    useState<"by_themselves" | "with_middle_person" | null>(null);
  const [showConfirmIntroModal, setShowConfirmIntroModal] = useState(false);
  const [showIntroSuccessModal, setShowIntroSuccessModal] = useState(false);
  const [isSubmittingIntro, setIsSubmittingIntro] = useState(false);
  const [existingIntroRequest, setExistingIntroRequest] = useState<any>(null);

  // Setup/Suggestion flow states
  const [showProfileGridModal, setShowProfileGridModal] = useState(false);
  const [selectedProfileForSetup, setSelectedProfileForSetup] =
    useState<Profile | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showSendConfirmationModal, setShowSendConfirmationModal] =
    useState(false);
  const [suggestionNote, setSuggestionNote] = useState("");
  const [useSameNote, setUseSameNote] = useState(true); // true = same note, false = different notes
  const [profileOneNote, setProfileOneNote] = useState("");
  const [profileTwoNote, setProfileTwoNote] = useState("");
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

  // Previous suggestion warning modal
  const [showPreviousSuggestionModal, setShowPreviousSuggestionModal] =
    useState(false);
  const [previousSuggestionInfo, setPreviousSuggestionInfo] = useState<{
    profileOneName: string;
    profileTwoName: string;
    profileOneStatus: "pending" | "accepted" | "rejected";
    profileTwoStatus: "pending" | "accepted" | "rejected";
    createdAt: string;
  } | null>(null);

  // Info request states
  const [showAskForInfoModal, setShowAskForInfoModal] = useState(false);
  const [selectedFieldForInfo, setSelectedFieldForInfo] = useState<string>("");
  const [isSubmittingInfoRequest, setIsSubmittingInfoRequest] = useState(false);

  // One-time picture view tracking
  const [hasPicturesBeenViewed, setHasPicturesBeenViewed] = useState(false);

  // Report and Share states
  const [showReportModal, setShowReportModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Sync React Query result into local state
  useEffect(() => {
    if (!profileQueryData) return;
    setProfile(profileQueryData.displayProfile);
    setCurrentUserProfile(profileQueryData.currentUserProfile);
    setRawProfileData(profileQueryData.rawData);
    setHasPicturesBeenViewed(profileQueryData.hasPicturesBeenViewed);
    if (profileQueryData.existingIntroRequest) {
      setExistingIntroRequest(profileQueryData.existingIntroRequest);
    }
  }, [profileQueryData]);

  // Navigate back if profile could not be loaded
  useEffect(() => {
    if (isError) router.back();
  }, [isError]);

  const handlePicturePress = async (index: number) => {
    // Check if pictures are private
    if (profile?.picturePrivacy === "private") {
      handleAskForInfo("pictures");
      return;
    }

    // For one-time pictures, show alert if already viewed
    if (profile?.picturePrivacy === "one_time" && hasPicturesBeenViewed) {
      Alert.alert(
        "Pictures Already Viewed",
        "You have already viewed this profile's pictures. One-time pictures can only be viewed once.",
        [{ text: "OK" }],
      );
      return;
    }

    // Record the view for one-time pictures (before opening)
    if (
      profile?.picturePrivacy === "one_time" &&
      !hasPicturesBeenViewed &&
      profile.id
    ) {
      const recordResult = await pictureViewService.recordPictureView(
        profile.id,
      );
      if (recordResult.success) {
        setHasPicturesBeenViewed(true);
      }
    }

    setSelectedPictureIndex(index);
    setShowPictureViewer(true);
  };

  const handleAskForInfo = async (fieldName: string) => {
    // Check if there's already a pending or approved request for this field
    const result = await infoRequestService.getSentRequests();
    if (result.success && result.requests) {
      const existingRequest = result.requests.find(
        (r) =>
          r.requested_profile_id === profile?.id &&
          r.field_name === fieldName &&
          (r.status === "pending" || r.status === "approved"),
      );

      if (existingRequest) {
        if (existingRequest.status === "pending") {
          Alert.alert(
            "Request Already Sent",
            "You already have a pending request for this information. Please wait for a response.",
            [{ text: "OK" }],
          );
        } else if (existingRequest.status === "approved") {
          Alert.alert(
            "Request Approved",
            "This request has already been approved. Go to the Connect tab to see the information.",
            [
              { text: "Cancel" },
              { text: "Reload", onPress: () => refetch() },
            ],
          );
        }
        return;
      }
    }

    setSelectedFieldForInfo(fieldName);
    setShowAskForInfoModal(true);
  };

  const handleSubmitInfoRequest = async (note: string) => {
    if (!profile) return;

    setIsSubmittingInfoRequest(true);
    try {
      const result = await infoRequestService.createInfoRequest(
        profile.id,
        selectedFieldForInfo,
        note,
      );

      if (result.success) {
        Alert.alert(
          "Request Sent! 📤",
          `Your request has been sent to ${profile.name.split(" ")[0]}. You'll be notified when they respond.`,
          [{ text: "OK" }],
        );
        setShowAskForInfoModal(false);
      } else {
        Alert.alert("Error", result.error || "Failed to send request");
      }
    } catch {
      Alert.alert("Error", "Failed to send request");
    } finally {
      setIsSubmittingInfoRequest(false);
    }
  };

  const handleAskForIntro = () => {
    // Check if there's already a request
    if (existingIntroRequest) {
      let message = "";
      if (existingIntroRequest.status === "pending") {
        message =
          "You already have a pending intro request with this profile. Please wait for their response.";
      } else if (existingIntroRequest.status === "accepted") {
        message =
          "You already have an accepted intro request with this profile. Check the Connect tab for next steps.";
      } else if (existingIntroRequest.status === "completed") {
        message =
          "You already have a completed match with this profile. Check the Connect tab for contact information.";
      }

      Alert.alert("Intro Request Already Exists", message, [{ text: "OK" }]);
      return;
    }

    // Start the intro flow by selecting Matchmaker/Shadchan
    setShowMiddlePersonModal(true);
  };

  const handleMiddlePersonSelected = (middlePerson: any) => {
    setSelectedMiddlePerson(middlePerson);
    setShowMiddlePersonModal(false);
    // Show continuation choice modal after selecting matchmaker
    setShowContinuationChoiceModal(true);
  };

  const handleContinuationChoice = (
    choice: "by_themselves" | "with_middle_person",
  ) => {
    setRequesterContinuationChoice(choice);
    setShowContinuationChoiceModal(false);
    // Show confirmation modal after choosing continuation
    setShowConfirmIntroModal(true);
  };

  const handleConfirmIntro = async () => {
    if (!profile || !selectedMiddlePerson || !requesterContinuationChoice)
      return;

    setShowConfirmIntroModal(false);
    setIsSubmittingIntro(true);

    try {
      // Create the intro request with Ori's continuation choice
      const result = await introService.createIntroRequest(
        profile.id,
        selectedMiddlePerson.id,
        requesterContinuationChoice,
      );

      if (!result.success) {
        Alert.alert("Error", result.error || "Failed to create intro request");
        setIsSubmittingIntro(false);
        return;
      }

      // Show success modal
      setShowIntroSuccessModal(true);
    } catch {
      Alert.alert("Error", "Failed to send intro request");
    } finally {
      setIsSubmittingIntro(false);
    }
  };

  const handleSetup = () => {
    // Open profile grid selection modal
    setShowProfileGridModal(true);
  };

  const handleProfileSelected = async (selectedProfile: Profile) => {
    setSelectedProfileForSetup(selectedProfile);
    setShowProfileGridModal(false);
    // Reset note states
    setSuggestionNote("");
    setProfileOneNote("");
    setProfileTwoNote("");
    setUseSameNote(true);

    // Check for previous suggestions
    if (profile) {
      const result = await suggestionService.checkPreviousSuggestion(
        profile.id,
        selectedProfile.id,
      );

      if (result.success && result.hasPrevious && result.previousSuggestion) {
        // Show warning modal about previous suggestion
        setPreviousSuggestionInfo({
          profileOneName: result.previousSuggestion.profileOneName,
          profileTwoName: result.previousSuggestion.profileTwoName,
          profileOneStatus: result.previousSuggestion.profileOneStatus,
          profileTwoStatus: result.previousSuggestion.profileTwoStatus,
          createdAt: result.previousSuggestion.createdAt,
        });
        setShowPreviousSuggestionModal(true);
      } else {
        // No previous suggestion, proceed directly to note modal
        setShowNoteModal(true);
      }
    } else {
      // No profile, just proceed (shouldn't happen but safe fallback)
      setShowNoteModal(true);
    }
  };

  const handlePreviousSuggestionContinue = () => {
    // User wants to suggest again despite previous suggestion
    setShowPreviousSuggestionModal(false);
    setPreviousSuggestionInfo(null);
    setShowNoteModal(true);
  };

  const handlePreviousSuggestionCancel = () => {
    // User doesn't want to suggest again
    setShowPreviousSuggestionModal(false);
    setPreviousSuggestionInfo(null);
    setSelectedProfileForSetup(null);
  };

  const handleNoteModalSkip = () => {
    // Close note modal and proceed to confirmation
    setShowNoteModal(false);
    setShowSendConfirmationModal(true);
  };

  const handleNoteModalAddNote = () => {
    // Close note modal and proceed to confirmation
    setShowNoteModal(false);
    setShowSendConfirmationModal(true);
  };

  const handleSendSuggestion = async () => {
    if (!selectedProfileForSetup || !profile) return;

    setIsSubmittingSuggestion(true);
    try {
      let result;
      if (useSameNote) {
        // Use same note for both (legacy behavior)
        result = await suggestionService.createSuggestion(
          profile.id,
          selectedProfileForSetup.id,
          suggestionNote.trim() || undefined,
        );
      } else {
        // Use different notes
        result = await suggestionService.createSuggestion(
          profile.id,
          selectedProfileForSetup.id,
          undefined, // legacy note
          profileOneNote.trim() || undefined, // profile_one_note
          profileTwoNote.trim() || undefined, // profile_two_note
        );
      }

      if (!result.success) {
        Alert.alert("Error", result.error || "Failed to create suggestion");
        return;
      }

      setShowSendConfirmationModal(false);
      setSuggestionNote("");
      setProfileOneNote("");
      setProfileTwoNote("");
      setUseSameNote(true);
      setSelectedProfileForSetup(null);

      Alert.alert(
        "Suggestion Sent! 💡",
        `Your match suggestion has been sent to ${profile.name} and ${selectedProfileForSetup.name}.`,
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate to Connect tab - You Liked section
              router.push("/(tabs)/connect?section=liked");
            },
          },
        ],
      );
    } catch {
      Alert.alert("Error", "Failed to send suggestion");
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  const handleReportProfile = () => {
    setShowReportModal(true);
  };

  const handleShareProfile = async () => {
    if (!profile) return;

    try {
      setIsSharing(true);

      // Create deep link URL for the profile
      const shareUrl = `shiduchimapp://profile/${profile.id}`;

      // Create a fallback URL that redirects to App Store if app is not installed
      const appStoreUrl = "https://apps.apple.com/app/id6738294076"; // Replace with actual App Store ID
      const fallbackUrl = `https://shiduchimapp.com/profile/${profile.id}?fallback=${encodeURIComponent(appStoreUrl)}`;

      const message = `Check out ${profile.name}'s profile on Zivug Mishamayim!\n\n${shareUrl}\n\nIf you don't have the app: ${fallbackUrl}`;

      await Share.share({
        message,
        title: `${profile.name}'s Profile`,
      });
    } catch {
      Alert.alert("Error", "Failed to share profile. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1293DA" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return null;
  }
  // Helper to check if field is private
  const isFieldPrivate = (fieldName: string): boolean => {
    return profile?.field_privacy?.[fieldName] === true;
  };

  // Helper to check if a field has a value in the database (before privacy filtering)
  const hasFieldValue = (fieldName: string): boolean => {
    if (!rawProfileData) return false;
    const value = rawProfileData[fieldName];
    return value !== null && value !== undefined && value !== "";
  };

  // Helper component for rendering a detail row with "Ask me" button
  // dbFieldName: snake_case field name in database (e.g., 'torah_learning')
  // privacyFieldName: camelCase field name in field_privacy (e.g., 'torahLearning'), defaults to dbFieldName if not provided
  const renderDetailRow = (
    label: string,
    value: any,
    dbFieldName: string,
    privacyFieldName?: string,
  ) => {
    const privacyField = privacyFieldName || dbFieldName;

    // Only render if field has a value in the database
    if (!hasFieldValue(dbFieldName)) {
      return null;
    }

    const isPrivate = isFieldPrivate(privacyField);

    if (isPrivate) {
      return (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{label}:</Text>
          <TouchableOpacity
            style={styles.askMeButton}
            onPress={() => handleAskForInfo(privacyField)}
          >
            <Ionicons name="lock-closed" size={14} color="#1293DA" />
            <Text style={styles.askMeButtonText}>Ask me</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}:</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.imageWrapper}>
            {profile.picturePrivacy === "none" ||
            !profile.picture ||
            imageError ? (
              // No photo - show generic avatar
              <View
                style={[styles.profileImage, styles.placeholderProfileImage]}
              >
                <Ionicons name="person" size={50} color="#ccc" />
              </View>
            ) : (
              // Public or Private - show image
              <>
                <Image
                  source={{ uri: profile.picture }}
                  style={styles.profileImage}
                  onError={() => setImageError(true)}
                  blurRadius={profile.picturePrivacy === "private" ? 20 : 0}
                />
                {profile.picturePrivacy === "private" && (
                  <TouchableOpacity
                    style={styles.seeMoreOverlay}
                    onPress={() => handleAskForInfo("pictures")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="lock-closed" size={32} color="#fff" />
                    <Text style={styles.seeMoreText}>See More</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileAge}>
              Age: {calculateAge(profile.dob)}
            </Text>
            <Text style={styles.profileLocation}>{profile.location}</Text>
          </View>
        </View>

        {/* Pictures Section */}
        {profile.picturePrivacy !== "none" &&
          profile.pictures &&
          profile.pictures.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pictures</Text>
              <View style={styles.picturesGrid}>
                {profile.pictures.slice(0, 3).map((picture, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.pictureThumbnail}
                    onPress={() => handlePicturePress(index)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: picture }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                      blurRadius={profile.picturePrivacy === "private" ? 15 : 0}
                    />
                    {profile.picturePrivacy === "private" && (
                      <View style={styles.blurOverlay}>
                        <Ionicons name="lock-closed" size={20} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {profile.picturePrivacy === "private" && (
                <Text style={styles.pictureNote}>
                  Photos are private. Click any photo to request access.
                </Text>
              )}
            </View>
          )}

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About 👤</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information 📋</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gender:</Text>
            <Text style={styles.detailValue}>{profile.gender}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Role:</Text>
            <Text style={styles.detailValue}>{profile.role}</Text>
          </View>

          {renderDetailRow(
            "Looking For",
            profile.what_looking_for,
            "what_looking_for",
          )}
          {renderDetailRow("Height", profile.height, "height")}
          {renderDetailRow(
            "Has Children",
            profile.hasChildren !== undefined
              ? profile.hasChildren
                ? "Yes"
                : "No"
              : null,
            "hasChildren",
          )}
        </View>

        {/* Location Section */}
        {(hasFieldValue("location_city") ||
          hasFieldValue("location_state") ||
          hasFieldValue("location_country")) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location 📍</Text>
            {renderDetailRow("City", profile.location_city, "location_city")}
            {renderDetailRow("State", profile.location_state, "location_state")}
            {renderDetailRow(
              "Country",
              profile.location_country,
              "location_country",
            )}
          </View>
        )}

        {/* Languages & Background */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Languages & Background 🌍</Text>
          {renderDetailRow(
            "Languages",
            profile.languages && profile.languages.length > 0
              ? profile.languages.join(", ")
              : null,
            "languages",
          )}
          {renderDetailRow(
            "Background",
            profile.nationality && profile.nationality.length > 0
              ? profile.nationality.join(", ")
              : null,
            "nationality",
          )}
          {profile.gender === "male" &&
            renderDetailRow(
              "Cohen",
              profile.is_cohen !== undefined
                ? profile.is_cohen
                  ? "Yes"
                  : "No"
                : null,
              "is_cohen",
            )}
        </View>

        {/* Hashkafa / Religious Outlook */}
        {(profile.hashkafa_type ||
          hasFieldValue("torah_learning") ||
          hasFieldValue("praying")) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Religious Outlook ✡️</Text>

            {profile.hashkafa_type && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Hashkafa:</Text>
                <Text style={styles.detailValue}>{profile.hashkafa_type}</Text>
              </View>
            )}

            {renderDetailRow(
              "Torah Learning",
              profile.torah_learning,
              "torah_learning",
              "torahLearning",
            )}
            {renderDetailRow("Praying", profile.praying, "praying")}
          </View>
        )}

        {/* Education */}
        {(hasFieldValue("education_level") ||
          profile.post_high_school_path) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education 🎓</Text>

            {renderDetailRow(
              "Education Level",
              profile.education_level,
              "education_level",
              "educationLevel",
            )}

            {profile.post_high_school_path && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Post-High School Path:</Text>
                <Text style={styles.detailValue}>
                  {profile.post_high_school_path}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Occupation / Study */}
        {profile.current_occupation_study && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Occupation / Study 💼</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Status:</Text>
              <Text style={styles.detailValue}>
                {profile.current_occupation_study}
              </Text>
            </View>
          </View>
        )}

        {/* Plan After Marriage */}
        {profile.plan_after_marriage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plan After Marriage 💍</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Plans:</Text>
              <Text style={styles.detailValue}>
                {profile.plan_after_marriage}
              </Text>
            </View>
          </View>
        )}

        {/* Marital Status */}
        {profile.marital_status && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Marital Status 💑</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={styles.detailValue}>{profile.marital_status}</Text>
            </View>
          </View>
        )}

        {/* Dress & Appearance */}
        {(profile.dress_style ||
          (profile.gender === "male" &&
            profile.wears_black_hat !== undefined) ||
          (profile.gender === "female" && profile.head_covering)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dress & Appearance 👔</Text>

            {profile.dress_style && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dress Style:</Text>
                <Text style={styles.detailValue}>{profile.dress_style}</Text>
              </View>
            )}

            {profile.gender === "male" &&
              profile.wears_black_hat !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Black Hat:</Text>
                  <Text style={styles.detailValue}>
                    {profile.wears_black_hat ? "Yes" : "No"}
                  </Text>
                </View>
              )}

            {profile.gender === "female" && profile.head_covering && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Head Covering:</Text>
                <Text style={styles.detailValue}>{profile.head_covering}</Text>
              </View>
            )}
          </View>
        )}

        {/* Lifestyle */}
        {(profile.smoking || profile.alcohol_consumption) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lifestyle 🌟</Text>

            {profile.smoking && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Smoking:</Text>
                <Text style={styles.detailValue}>{profile.smoking}</Text>
              </View>
            )}

            {profile.alcohol_consumption && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Alcohol Consumption:</Text>
                <Text style={styles.detailValue}>
                  {profile.alcohol_consumption}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Last Active */}
        {profile.last_active_at && (
          <View style={styles.section}>
            <View style={styles.lastActiveContainer}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={styles.lastActiveText}>
                Last active:{" "}
                {new Date(profile.last_active_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        {/* Report and Share Buttons */}
        {!hideActions && profile && currentUserProfile && (
          <View style={styles.inlineActionsSection}>
            <TouchableOpacity
              style={[styles.inlineButton, styles.reportButton]}
              onPress={handleReportProfile}
            >
              <Ionicons name="flag-outline" size={20} color="#f44336" />
              <Text style={styles.reportButtonText}>Report Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.inlineButton, styles.shareButton]}
              onPress={handleShareProfile}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator color="#1293DA" size="small" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={20} color="#1293DA" />
                  <Text style={styles.shareButtonText}>Share Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom padding for action buttons */}
        <View style={{ height: hideActions ? 20 : 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      {!hideActions && profile && currentUserProfile && (
        <View style={styles.actionsContainer}>
          {/* Setup button - for both singles and matchmakers */}
          <TouchableOpacity
            style={[styles.actionButton, styles.setupButton]}
            onPress={handleSetup}
            disabled={isSubmittingSuggestion}
          >
            {isSubmittingSuggestion ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="people" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Setup</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Ask for Intro button - only for singles */}
          {currentUserProfile.role === "single" && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.introButton,
                existingIntroRequest && styles.disabledButton,
              ]}
              onPress={handleAskForIntro}
              disabled={isSubmittingIntro || !!existingIntroRequest}
            >
              {isSubmittingIntro ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : existingIntroRequest ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {existingIntroRequest.status === "pending"
                      ? "Request Pending"
                      : existingIntroRequest.status === "accepted"
                        ? "Request Accepted"
                        : "Already Matched"}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="hand-right" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Ask for Intro</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Engagement button - for singles with accepted intros */}
          {currentUserProfile.role === "single" &&
            existingIntroRequest?.status === "accepted" && (
              <EngagementButton
                otherUserId={profile.id}
                otherUserName={profile.name}
                currentUserName={currentUserProfile.first_name}
              />
            )}
        </View>
      )}

      {/* Picture Viewer Modal */}
      {showPictureViewer && (
        <PictureViewerModal
          visible={showPictureViewer}
          pictures={profile.pictures}
          initialIndex={selectedPictureIndex}
          onClose={() => setShowPictureViewer(false)}
        />
      )}

      {/* Ask for Info Modal */}
      <AskForInfoModal
        visible={showAskForInfoModal}
        fieldName={selectedFieldForInfo}
        profileName={profile.name}
        onClose={() => setShowAskForInfoModal(false)}
        onSubmit={handleSubmitInfoRequest}
        isSubmitting={isSubmittingInfoRequest}
      />

      {/* Report Profile Modal */}
      {profile && (
        <ReportProfileModal
          visible={showReportModal}
          profileId={profile.id}
          profileName={profile.name}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Middle Person Selection Modal */}
      <MiddlePersonSelectionModal
        visible={showMiddlePersonModal}
        excludedProfileId={currentUserProfile?.id}
        requestedProfileId={profile?.id}
        onSelect={handleMiddlePersonSelected}
        onCancel={() => setShowMiddlePersonModal(false)}
      />

      {/* Confirmation Modal before sending intro request */}
      <Modal
        visible={showConfirmIntroModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConfirmIntroModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Ionicons name="mail" size={48} color="#1293DA" />
              <Text style={styles.confirmModalTitle}>
                Confirm Intro Request
              </Text>
            </View>

            {profile && selectedMiddlePerson && (
              <View style={styles.confirmModalBody}>
                <Text style={styles.confirmModalText}>
                  You&apos;re asking{" "}
                  <Text style={styles.boldText}>
                    {selectedMiddlePerson.first_name}{" "}
                    {selectedMiddlePerson.last_name}
                  </Text>{" "}
                  to facilitate an introduction with{" "}
                  <Text style={styles.boldText}>{profile.name}</Text>.
                </Text>
                <View style={styles.confirmModalInfo}>
                  <Ionicons name="information-circle" size={20} color="#666" />
                  <Text style={styles.confirmModalInfoText}>
                    {selectedMiddlePerson.first_name} will review your request
                    and decide whether to proceed.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmCancelButton]}
                onPress={() => {
                  setShowConfirmIntroModal(false);
                  setSelectedMiddlePerson(null);
                }}
              >
                <Text style={styles.confirmCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmSendButton]}
                onPress={handleConfirmIntro}
                disabled={isSubmittingIntro}
              >
                {isSubmittingIntro ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" />
                    <Text style={styles.confirmSendButtonText}>
                      Send Request
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal after sending intro request */}
      <Modal
        visible={showIntroSuccessModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowIntroSuccessModal(false);
          setSelectedMiddlePerson(null);
          router.push("/(tabs)/connect?section=liked");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
              <Text style={styles.confirmModalTitle}>
                Intro Request Sent! 💌
              </Text>
            </View>

            {profile && selectedMiddlePerson && (
              <View style={styles.confirmModalBody}>
                <Text style={styles.confirmModalText}>
                  Your request has been sent to{" "}
                  <Text style={styles.boldText}>
                    {selectedMiddlePerson.first_name}{" "}
                    {selectedMiddlePerson.last_name}
                  </Text>
                  .
                </Text>
                <View style={styles.confirmModalInfo}>
                  <Ionicons name="time" size={20} color="#1293DA" />
                  <Text style={styles.confirmModalInfoText}>
                    They will review and respond soon. You&apos;ll be notified
                    of their decision.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={[
                  styles.confirmModalButton,
                  styles.confirmSendButton,
                  { width: "100%" },
                ]}
                onPress={() => {
                  setShowIntroSuccessModal(false);
                  setSelectedMiddlePerson(null);
                  router.push("/(tabs)/connect?section=liked");
                }}
              >
                <Text style={styles.confirmSendButtonText}>Go to Connect</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Continuation Choice Modal - Shown after selecting matchmaker */}
      {profile && selectedMiddlePerson && (
        <ContinuationChoiceModal
          visible={showContinuationChoiceModal}
          profileName={`${profile.first_name} ${profile.last_name}`}
          onSelectChoice={handleContinuationChoice}
          onCancel={() => {
            setShowContinuationChoiceModal(false);
            setSelectedMiddlePerson(null);
            setRequesterContinuationChoice(null);
          }}
        />
      )}

      {/* Profile Grid Selection Modal for Setup */}
      <ProfileGridSelectionModal
        visible={showProfileGridModal}
        currentUserGender={profile?.gender}
        excludedProfileId={currentUserProfile?.id}
        onSelect={handleProfileSelected}
        onCancel={() => setShowProfileGridModal(false)}
      />

      {/* Previous Suggestion Warning Modal */}
      {previousSuggestionInfo && (
        <PreviousSuggestionWarningModal
          visible={showPreviousSuggestionModal}
          profileOneName={previousSuggestionInfo.profileOneName}
          profileTwoName={previousSuggestionInfo.profileTwoName}
          profileOneStatus={previousSuggestionInfo.profileOneStatus}
          profileTwoStatus={previousSuggestionInfo.profileTwoStatus}
          createdAt={previousSuggestionInfo.createdAt}
          onCancel={handlePreviousSuggestionCancel}
          onContinue={handlePreviousSuggestionContinue}
        />
      )}

      {/* Note Modal for Suggestion */}
      <Modal
        visible={showNoteModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowNoteModal(false);
          setSuggestionNote("");
          setProfileOneNote("");
          setProfileTwoNote("");
          setUseSameNote(true);
          setSelectedProfileForSetup(null);
        }}
      >
        <View style={styles.noteModalOverlay}>
          <View style={styles.noteModalContainer}>
            <View style={styles.noteModalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowNoteModal(false);
                }}
              >
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
              <Text style={styles.noteModalTitle}>Add a Note (Optional)</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.noteModalContent}>
              <Text style={styles.noteModalLabel}>
                Add a note for {profile?.name} and{" "}
                {selectedProfileForSetup?.name}
              </Text>

              {/* Note Mode Toggle */}
              <View style={styles.noteModeToggle}>
                <TouchableOpacity
                  style={[
                    styles.noteModeOption,
                    useSameNote && styles.noteModeOptionActive,
                  ]}
                  onPress={() => setUseSameNote(true)}
                >
                  <Ionicons
                    name={useSameNote ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={useSameNote ? "#1293DA" : "#999"}
                  />
                  <Text
                    style={[
                      styles.noteModeText,
                      useSameNote && styles.noteModeTextActive,
                    ]}
                  >
                    Same note for both
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.noteModeOption,
                    !useSameNote && styles.noteModeOptionActive,
                  ]}
                  onPress={() => setUseSameNote(false)}
                >
                  <Ionicons
                    name={!useSameNote ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={!useSameNote ? "#1293DA" : "#999"}
                  />
                  <Text
                    style={[
                      styles.noteModeText,
                      !useSameNote && styles.noteModeTextActive,
                    ]}
                  >
                    Different notes
                  </Text>
                </TouchableOpacity>
              </View>

              {useSameNote ? (
                <>
                  <TextInput
                    style={styles.noteTextInput}
                    placeholder="Why do you think they would be a good match?"
                    value={suggestionNote}
                    onChangeText={setSuggestionNote}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    autoFocus
                  />
                  <Text style={styles.noteModalHint}>
                    This note will be visible to both profiles when they receive
                    your suggestion.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.separateNoteLabel}>
                    Note for {profile?.name}:
                  </Text>
                  <TextInput
                    style={styles.noteTextInput}
                    placeholder={`Why do you think ${profile?.name} would be a good match?`}
                    value={profileOneNote}
                    onChangeText={setProfileOneNote}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    autoFocus
                  />
                  <Text style={styles.separateNoteLabel}>
                    Note for {selectedProfileForSetup?.name}:
                  </Text>
                  <TextInput
                    style={styles.noteTextInput}
                    placeholder={`Why do you think ${selectedProfileForSetup?.name} would be a good match?`}
                    value={profileTwoNote}
                    onChangeText={setProfileTwoNote}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Text style={styles.noteModalHint}>
                    Each profile will only see their own note when they receive
                    your suggestion.
                  </Text>
                </>
              )}
            </ScrollView>

            <View style={styles.noteModalActions}>
              <TouchableOpacity
                style={[styles.noteModalButton, styles.skipButton]}
                onPress={handleNoteModalSkip}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.noteModalButton, styles.addNoteButton]}
                onPress={handleNoteModalAddNote}
              >
                <Text style={styles.addNoteButtonText}>Add Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Send Confirmation Modal */}
      <Modal
        visible={showSendConfirmationModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowSendConfirmationModal(false);
        }}
      >
        <View style={styles.noteModalOverlay}>
          <View style={styles.noteModalContainer}>
            <View style={styles.noteModalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowSendConfirmationModal(false);
                }}
              >
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
              <Text style={styles.noteModalTitle}>Send Suggestion</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.noteModalContent}>
              <Text style={styles.noteModalLabel}>
                You are about to suggest {profile?.name} and{" "}
                {selectedProfileForSetup?.name} to each other.
              </Text>

              {/* Show note preview if notes were added */}
              {(() => {
                const hasSameNote = useSameNote && suggestionNote.trim();
                const hasDifferentNotes =
                  !useSameNote &&
                  (profileOneNote.trim() || profileTwoNote.trim());

                if (hasSameNote) {
                  return (
                    <View style={styles.notePreviewSection}>
                      <Text style={styles.notePreviewLabel}>Your note:</Text>
                      <View style={styles.notePreviewCard}>
                        <Text style={styles.notePreviewText}>
                          {suggestionNote}
                        </Text>
                      </View>
                    </View>
                  );
                } else if (hasDifferentNotes) {
                  return (
                    <View style={styles.notePreviewSection}>
                      <Text style={styles.notePreviewLabel}>Your notes:</Text>
                      {profileOneNote.trim() && (
                        <>
                          <Text style={styles.notePreviewSubLabel}>
                            For {profile?.name}:
                          </Text>
                          <View style={styles.notePreviewCard}>
                            <Text style={styles.notePreviewText}>
                              {profileOneNote}
                            </Text>
                          </View>
                        </>
                      )}
                      {profileTwoNote.trim() && (
                        <>
                          <Text
                            style={[
                              styles.notePreviewSubLabel,
                              { marginTop: 12 },
                            ]}
                          >
                            For {selectedProfileForSetup?.name}:
                          </Text>
                          <View style={styles.notePreviewCard}>
                            <Text style={styles.notePreviewText}>
                              {profileTwoNote}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  );
                } else {
                  return (
                    <View style={styles.noNoteSection}>
                      <Ionicons
                        name="document-text-outline"
                        size={32}
                        color="#ccc"
                      />
                      <Text style={styles.noNoteText}>No note added</Text>
                    </View>
                  );
                }
              })()}
            </ScrollView>

            <View style={styles.noteModalActions}>
              <TouchableOpacity
                style={[styles.noteModalButton, styles.cancelButton]}
                onPress={() => {
                  setShowSendConfirmationModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.noteModalButton, styles.sendButton]}
                onPress={handleSendSuggestion}
                disabled={isSubmittingSuggestion}
              >
                {isSubmittingSuggestion ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendButtonText}>Send Suggestion</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
