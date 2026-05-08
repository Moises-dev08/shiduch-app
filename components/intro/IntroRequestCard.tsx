import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import EngagementButton from "../../components/EngagementButton";
import { IntroRequest, introService } from "../../lib/introService";
import { profileService } from "../../lib/profileService";
import ContinuationChoiceModal from "./ContinuationChoiceModal";

interface IntroRequestCardProps {
  request: IntroRequest;
  isRequester: boolean; // true if current user is the one who requested the intro
  onUpdate: () => void;
  onAccepted?: () => void; // called after a successful accept so parent can navigate to Matches
  isActionNeeded?: boolean;
}

/**
 * NEW 3-STEP FLOW:
 * 1. Requester (Ori) creates request → Matchmaker (Ben)
 * 2. Matchmaker (Ben) accepts/rejects → Requester (Ori) + Requested (Shimon if accepted)
 * 3. Requested (Shimon) accepts/rejects → both choose continuation
 */
export default function IntroRequestCardNew({
  request,
  isRequester,
  onUpdate,
  onAccepted,
  isActionNeeded = false,
}: IntroRequestCardProps) {
  const queryClient = useQueryClient();
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [showContinuationModal, setShowContinuationModal] = useState(false);
  const [showConfirmAcceptModal, setShowConfirmAcceptModal] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showMatchmakerInfo, setShowMatchmakerInfo] = useState(false);

  const handleSendSMS = (phone: string) => Linking.openURL(`sms:${phone}`);
  const handleSendWhatsApp = (phone: string) =>
    Linking.openURL(`https://wa.me/${phone.replace(/\D/g, "")}`);
  const handleSendEmail = async (email: string) => {
    const url = `mailto:${email}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert("No mail app found", `You can reach them at: ${email}`);
    }
  };
  const handleCopyPhone = async (phone: string) => {
    await Clipboard.setStringAsync(phone);
    Alert.alert("Copied!", "Phone number copied to clipboard");
  };
  const handleDownloadResume = async (resumeUrl: string, name: string) => {
    const { resumeService } = await import("../../lib/resumeService");
    const result = await resumeService.downloadResume(
      resumeUrl,
      `${name}_resume`,
    );
    if (!result.success)
      Alert.alert("Error", result.error || "Failed to open resume");
  };

  // Optimistically patch a single intro request in the cache
  const patchIntroCache = (patch: Record<string, any>) => {
    queryClient.setQueryData(["intro_requests"], (old: any) => {
      if (!old) return old;
      const patchList = (list: any[]) =>
        list.map((r: any) => (r.id === request.id ? { ...r, ...patch } : r));
      return {
        ...old,
        sentRequests: patchList(old.sentRequests ?? []),
        receivedRequests: patchList(old.receivedRequests ?? []),
      };
    });
  };

  const otherProfile = isRequester
    ? request.requested_profile
    : request.requester_profile;
  const matchmakerProfile = request.requester_middle_person;

  const getProfileImage = (profile: any) => {
    if (Array.isArray(profile?.pictures) && profile.pictures.length > 0) {
      return profileService.getImageUrl(profile.pictures[0]);
    }
    return null;
  };

  const handleViewProfile = () => {
    if (otherProfile && otherProfile.id) {
      router.push(`/profile-details?id=${otherProfile.id}&hideActions=true`);
    }
  };

  const handleViewMatchmakerProfile = () => {
    if (matchmakerProfile && matchmakerProfile.id) {
      router.push(
        `/profile-details?id=${matchmakerProfile.id}&hideActions=true`,
      );
    }
  };

  // FOR REQUESTED PERSON: Accept the intro request
  const handleAccept = () => {
    // Show confirmation modal first
    setShowConfirmAcceptModal(true);
  };

  // FOR REQUESTED PERSON: After confirming, show continuation choice or auto-accept with matchmaker
  const handleConfirmAccept = async () => {
    setShowConfirmAcceptModal(false);

    if (request.requester_continuation_choice === "with_middle_person") {
      // Requester already chose matchmaker — accept + set choice atomically
      setIsResponding(true);
      patchIntroCache({
        requested_status: "accepted",
        status: "accepted",
        requested_continuation_choice: "with_middle_person",
      });
      try {
        await introService.acceptWithContinuation(
          request.id,
          "with_middle_person",
          matchmakerProfile?.id,
        );
        Alert.alert(
          "Success! ✅",
          `You have accepted the intro request! This match will be coordinated by ${matchmakerProfile?.first_name} (matchmaker/shadchan).`,
        );
        onAccepted?.();
        onUpdate();
      } catch (error) {
        console.error("Error accepting request:", error);
        onUpdate();
        Alert.alert("Error", "Failed to accept request");
      } finally {
        setIsResponding(false);
      }
    } else {
      setShowContinuationModal(true);
    }
  };

  // FOR REQUESTED PERSON: Handle continuation choice — single atomic DB write
  const handleContinuationChoice = async (
    choice: "by_themselves" | "with_middle_person",
  ) => {
    setIsResponding(true);
    setShowContinuationModal(false);
    patchIntroCache({
      requested_status: "accepted",
      status: "accepted",
      requested_continuation_choice: choice,
    });
    try {
      await introService.acceptWithContinuation(
        request.id,
        choice,
        choice === "with_middle_person" ? matchmakerProfile?.id : undefined,
      );
      Alert.alert("Success! ✅", "You have accepted the intro request!");
      onAccepted?.();
      onUpdate();
    } catch (error) {
      console.error("Error accepting request:", error);
      onUpdate();
      Alert.alert("Error", "Failed to accept request");
    } finally {
      setIsResponding(false);
    }
  };

  // FOR REQUESTED PERSON: Reject the intro request
  const handleReject = async () => {
    setIsResponding(true);
    // Optimistic: mark rejected so card leaves action_needed immediately
    patchIntroCache({ requested_status: "rejected", status: "rejected" });
    try {
      await introService.requestedPersonRespond(
        request.id,
        "rejected",
        rejectNote,
      );
      setShowRejectNote(false);
      Alert.alert("Request Declined", "The intro request has been declined.");
      onUpdate();
    } catch (error) {
      console.error("Error rejecting request:", error);
      onUpdate(); // rollback via refetch
      Alert.alert("Error", "Failed to reject request");
    } finally {
      setIsResponding(false);
    }
  };

  // FOR REQUESTER: Set continuation choice after both accepted
  const handleRequesterContinuationChoice = async (
    choice: "by_themselves" | "with_middle_person",
  ) => {
    setIsResponding(true);
    setShowContinuationModal(false);
    // Optimistic: set requester choice so card leaves action_needed
    patchIntroCache({ requester_continuation_choice: choice });
    try {
      if (choice === "with_middle_person" && matchmakerProfile?.id) {
        await introService.setContinuationChoice(
          request.id,
          choice,
          matchmakerProfile.id,
        );
      } else {
        await introService.setContinuationChoice(request.id, choice);
      }
      Alert.alert(
        "Choice Saved! ✅",
        "Your continuation preference has been saved!",
      );
      onAccepted?.();
      onUpdate();
    } catch (error) {
      console.error("Error setting continuation choice:", error);
      onUpdate(); // rollback via refetch
      Alert.alert("Error", "Failed to save choice");
    } finally {
      setIsResponding(false);
    }
  };

  // Render status badge
  const renderStatusBadge = () => {
    if (isRequester) {
      // REQUESTER VIEW
      if (request.matchmaker_status === "pending") {
        return (
          <View style={[styles.statusBadge, styles.waitingBadge]}>
            <Ionicons name="time" size={16} color="#1976d2" />
            <Text style={[styles.statusText, { color: "#1976d2" }]}>
              Awaiting Matchmaker Response
            </Text>
          </View>
        );
      } else if (request.matchmaker_status === "rejected") {
        return (
          <View style={[styles.statusBadge, styles.rejectedBadge]}>
            <Ionicons name="close-circle" size={16} color="#d32f2f" />
            <Text style={[styles.statusText, { color: "#d32f2f" }]}>
              Matchmaker Declined
            </Text>
          </View>
        );
      } else if (
        request.matchmaker_status === "accepted" &&
        request.requested_status === "pending"
      ) {
        return (
          <View style={[styles.statusBadge, styles.waitingBadge]}>
            <Ionicons name="time" size={16} color="#1976d2" />
            <Text style={[styles.statusText, { color: "#1976d2" }]}>
              Waiting for {otherProfile?.first_name}&apos;s Response
            </Text>
          </View>
        );
      } else if (request.requested_status === "rejected") {
        return (
          <View style={[styles.statusBadge, styles.rejectedBadge]}>
            <Ionicons name="close-circle" size={16} color="#d32f2f" />
            <Text style={[styles.statusText, { color: "#d32f2f" }]}>
              {otherProfile?.first_name} Declined
            </Text>
          </View>
        );
      } else if (
        request.matchmaker_status === "accepted" &&
        request.requested_status === "accepted"
      ) {
        if (!request.requester_continuation_choice) {
          return (
            <View style={[styles.statusBadge, styles.matchedBadge]}>
              <Ionicons name="checkmark-circle" size={16} color="#388e3c" />
              <Text style={[styles.statusText, { color: "#388e3c" }]}>
                Match Confirmed!
              </Text>
            </View>
          );
        }
        return (
          <View style={[styles.statusBadge, styles.completedBadge]}>
            <Ionicons name="checkmark-done" size={16} color="#2e7d32" />
            <Text style={[styles.statusText, { color: "#2e7d32" }]}>
              Ready to Connect
            </Text>
          </View>
        );
      }
    } else {
      // REQUESTED PERSON VIEW
      if (request.requested_status === "pending") {
        return (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <Ionicons name="mail" size={16} color="#f57c00" />
            <Text style={[styles.statusText, { color: "#f57c00" }]}>
              New Introduction Request
            </Text>
          </View>
        );
      } else if (request.requested_status === "rejected") {
        return (
          <View style={[styles.statusBadge, styles.rejectedBadge]}>
            <Ionicons name="close-circle" size={16} color="#d32f2f" />
            <Text style={[styles.statusText, { color: "#d32f2f" }]}>
              Declined
            </Text>
          </View>
        );
      } else if (request.requested_status === "accepted") {
        if (!request.requested_continuation_choice) {
          return (
            <View style={[styles.statusBadge, styles.matchedBadge]}>
              <Ionicons name="checkmark-circle" size={16} color="#388e3c" />
              <Text style={[styles.statusText, { color: "#388e3c" }]}>
                Match Confirmed!
              </Text>
            </View>
          );
        }
        return (
          <View style={[styles.statusBadge, styles.completedBadge]}>
            <Ionicons name="checkmark-done" size={16} color="#2e7d32" />
            <Text style={[styles.statusText, { color: "#2e7d32" }]}>
              Ready to Connect
            </Text>
          </View>
        );
      }
    }
    return null;
  };

  // Determine if action is needed
  const needsAction = () => {
    if (isRequester) {
      // Requester already made their choice during request creation, so no further action needed here
      return false;
    } else {
      // Requested person needs to respond or choose continuation
      // But if requester chose 'with_middle_person', requested doesn't need to choose (auto-assigned)
      if (request.requested_status === "pending") {
        return true;
      }
      if (
        request.requested_status === "accepted" &&
        !request.requested_continuation_choice
      ) {
        // If requester chose matchmaker, requested doesn't need to choose (already auto-assigned)
        return request.requester_continuation_choice !== "with_middle_person";
      }
      return false;
    }
  };

  const profileImage = getProfileImage(otherProfile);

  const rejectNoteModalScroll = (
    <ScrollView
      style={styles.rejectModalScroll}
      contentContainerStyle={styles.rejectModalScrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      showsVerticalScrollIndicator={false}
      bounces={false}
      {...(Platform.OS === "ios"
        ? { automaticallyAdjustKeyboardInsets: true as const }
        : {})}
    >
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Decline Intro Request</Text>
        <Text style={styles.modalSubtitle}>
          You can optionally add a note for the matchmaker:
        </Text>
        <TextInput
          style={styles.textInput}
          placeholder="Optional note..."
          value={rejectNote}
          onChangeText={setRejectNote}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => setShowRejectNote(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.submitButton]}
            onPress={handleReject}
            disabled={isResponding}
          >
            {isResponding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Decline</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.card}>
      {/* Matchmaker Context (for requested person) */}
      {!isRequester && (
        <View style={styles.matchmakerContext}>
          <Ionicons name="people" size={18} color="#666" />
          <Text style={styles.matchmakerContextText}>
            Facilitated by{" "}
            <Text
              style={styles.matchmakerNameClickable}
              onPress={handleViewMatchmakerProfile}
            >
              {matchmakerProfile?.first_name} {matchmakerProfile?.last_name}
            </Text>{" "}
            (matchmaker/shadchan)
          </Text>
        </View>
      )}

      {/* Matchmaker's Note to Requested Person (Shimon) */}
      {!isRequester && request.matchmaker_note_to_requested && (
        <View style={styles.noteContainer}>
          <View style={styles.noteHeader}>
            <Ionicons name="chatbox" size={16} color="#1293DA" />
            <Text style={styles.noteTitle}>
              Note from {matchmakerProfile?.first_name}:
            </Text>
          </View>
          <Text style={styles.noteText}>
            {request.matchmaker_note_to_requested}
          </Text>
        </View>
      )}

      {/* Header with profile info */}
      <TouchableOpacity onPress={handleViewProfile} style={styles.header}>
        <View style={styles.profileImageContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.placeholderImage]}>
              <Ionicons name="person" size={24} color="#999" />
            </View>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.profileName}>
            {otherProfile?.first_name} {otherProfile?.last_name}
          </Text>
          {!isRequester && (
            <Text style={styles.requestDescription}>
              A potential introduction opportunity
            </Text>
          )}
          {isRequester && (
            <View style={styles.matchmakerInfo}>
              <Ionicons name="people" size={14} color="#666" />
              <Text style={styles.matchmakerText}>
                via {matchmakerProfile?.first_name}
              </Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      {/* Status Badge */}
      {renderStatusBadge()}

      {/* Contact Information - Show when both chose "by_themselves" */}
      {request.matchmaker_status === "accepted" &&
        request.requested_status === "accepted" &&
        request.requester_continuation_choice === "by_themselves" &&
        request.requested_continuation_choice === "by_themselves" && (
          <View style={styles.unifiedContactSection}>
            <TouchableOpacity
              style={styles.unifiedContactToggle}
              onPress={() => setShowContactInfo(!showContactInfo)}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={18} color="#4CAF50" />
              <Text style={styles.unifiedContactToggleText}>
                Contact information
              </Text>
              <Ionicons
                name={showContactInfo ? "chevron-up" : "chevron-down"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {showContactInfo && otherProfile && (
              <>
                <Text style={styles.unifiedContactMessage}>
                  Both chose to connect directly. Contact info below:
                </Text>
                <View style={styles.unifiedContactCard}>
                  <Text style={styles.unifiedContactName}>
                    {otherProfile.first_name} {otherProfile.last_name}
                  </Text>
                  {otherProfile.phone && (
                    <Text style={styles.unifiedContactDetail}>
                      📞 {otherProfile.phone}
                    </Text>
                  )}
                  {otherProfile.email && (
                    <Text style={styles.unifiedContactDetail}>
                      📧 {otherProfile.email}
                    </Text>
                  )}

                  <View style={styles.unifiedContactActions}>
                    {otherProfile.phone && (
                      <>
                        <TouchableOpacity
                          style={styles.unifiedContactAction}
                          onPress={() => handleSendSMS(otherProfile.phone)}
                        >
                          <Ionicons
                            name="chatbubble"
                            size={18}
                            color="#007AFF"
                          />
                          <Text style={styles.unifiedContactActionText}>
                            SMS
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.unifiedContactAction}
                          onPress={() =>
                            handleSendWhatsApp(
                              otherProfile.whatsapp || otherProfile.phone,
                            )
                          }
                        >
                          <Ionicons
                            name="logo-whatsapp"
                            size={18}
                            color="#25D366"
                          />
                          <Text style={styles.unifiedContactActionText}>
                            WhatsApp
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.unifiedContactAction}
                          onPress={() => handleCopyPhone(otherProfile.phone)}
                        >
                          <Ionicons name="copy" size={18} color="#666" />
                          <Text style={styles.unifiedContactActionText}>
                            Copy
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {otherProfile.email && (
                      <TouchableOpacity
                        style={styles.unifiedContactAction}
                        onPress={() => handleSendEmail(otherProfile.email)}
                      >
                        <Ionicons name="mail" size={18} color="#EA4335" />
                        <Text style={styles.unifiedContactActionText}>
                          Email
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {otherProfile.resumeUrl && (
                    <TouchableOpacity
                      style={styles.unifiedResumeButton}
                      onPress={() =>
                        handleDownloadResume(
                          otherProfile.resumeUrl,
                          `${otherProfile.first_name} ${otherProfile.last_name}`,
                        )
                      }
                    >
                      <Ionicons
                        name="document-text"
                        size={20}
                        color="#1293DA"
                      />
                      <Text style={styles.unifiedResumeButtonText}>
                        View Resume 📄
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

              </>
            )}
          </View>
        )}

      {/* Matchmaker Contact Information - Show when continuing with matchmaker */}
      {request.matchmaker_status === "accepted" &&
        request.requested_status === "accepted" &&
        (request.requester_continuation_choice === "with_middle_person" ||
          request.requested_continuation_choice === "with_middle_person") && (
          <View style={styles.unifiedContactSection}>
            <TouchableOpacity
              style={styles.unifiedContactToggle}
              onPress={() => setShowMatchmakerInfo(!showMatchmakerInfo)}
              activeOpacity={0.7}
            >
              <Ionicons name="people" size={18} color="#1293DA" />
              <Text style={styles.unifiedContactToggleText}>
                Matchmaker contact information
              </Text>
              <Ionicons
                name={showMatchmakerInfo ? "chevron-up" : "chevron-down"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {showMatchmakerInfo && matchmakerProfile && (
              <>
                <Text style={styles.unifiedContactMessage}>
                  This introduction is being facilitated by your matchmaker.
                  Please contact them for next steps.
                </Text>
                <View style={styles.unifiedContactCard}>
                  <Text style={styles.unifiedContactName}>
                    {matchmakerProfile.first_name} {matchmakerProfile.last_name}
                  </Text>
                  {matchmakerProfile.phone && (
                    <Text style={styles.unifiedContactDetail}>
                      📞 {matchmakerProfile.phone}
                    </Text>
                  )}
                  {matchmakerProfile.email && (
                    <Text style={styles.unifiedContactDetail}>
                      📧 {matchmakerProfile.email}
                    </Text>
                  )}

                  <View style={styles.unifiedContactActions}>
                    {matchmakerProfile.phone && (
                      <>
                        <TouchableOpacity
                          style={styles.unifiedContactAction}
                          onPress={() => handleSendSMS(matchmakerProfile.phone)}
                        >
                          <Ionicons
                            name="chatbubble"
                            size={18}
                            color="#007AFF"
                          />
                          <Text style={styles.unifiedContactActionText}>
                            SMS
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.unifiedContactAction}
                          onPress={() =>
                            handleSendWhatsApp(
                              matchmakerProfile.whatsapp ||
                                matchmakerProfile.phone,
                            )
                          }
                        >
                          <Ionicons
                            name="logo-whatsapp"
                            size={18}
                            color="#25D366"
                          />
                          <Text style={styles.unifiedContactActionText}>
                            WhatsApp
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.unifiedContactAction}
                          onPress={() =>
                            handleCopyPhone(matchmakerProfile.phone)
                          }
                        >
                          <Ionicons name="copy" size={18} color="#666" />
                          <Text style={styles.unifiedContactActionText}>
                            Copy
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {matchmakerProfile.email && (
                      <TouchableOpacity
                        style={styles.unifiedContactAction}
                        onPress={() => handleSendEmail(matchmakerProfile.email)}
                      >
                        <Ionicons name="mail" size={18} color="#EA4335" />
                        <Text style={styles.unifiedContactActionText}>
                          Email
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {(matchmakerProfile as any).resumeUrl && (
                    <TouchableOpacity
                      style={styles.unifiedResumeButton}
                      onPress={() =>
                        handleDownloadResume(
                          (matchmakerProfile as any).resumeUrl,
                          `${matchmakerProfile.first_name} ${matchmakerProfile.last_name}`,
                        )
                      }
                    >
                      <Ionicons
                        name="document-text"
                        size={20}
                        color="#1293DA"
                      />
                      <Text style={styles.unifiedResumeButtonText}>
                        View Resume 📄
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        )}

      {/* Engagement button — shown when both sides have accepted the intro request */}
      {request.matchmaker_status === "accepted" &&
        request.requested_status === "accepted" &&
        otherProfile && (
          <EngagementButton
            otherUserId={otherProfile.id || ""}
            otherUserName={`${otherProfile.first_name} ${otherProfile.last_name}`}
            currentUserName={
              isRequester
                ? `${request.requester_profile?.first_name} ${request.requester_profile?.last_name}`
                : `${request.requested_profile?.first_name} ${request.requested_profile?.last_name}`
            }
          />
        )}

      {/* Matchmaker's Note (for requester) */}
      {isRequester && request.matchmaker_note_to_requester && (
        <View style={styles.noteContainer}>
          <View style={styles.noteHeader}>
            <Ionicons name="chatbox" size={16} color="#1293DA" />
            <Text style={styles.noteTitle}>
              Note from {matchmakerProfile?.first_name}:
            </Text>
          </View>
          <Text style={styles.noteText}>
            {request.matchmaker_note_to_requester}
          </Text>
        </View>
      )}

      {/* Action Buttons - Placed after Matchmaker Context for requested person */}
      {!isRequester &&
        needsAction() &&
        request.requested_status === "pending" && (
          <View style={styles.actionsContainer}>
            <View style={styles.responseButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => setShowRejectNote(true)}
                disabled={isResponding}
              >
                <Ionicons name="close-circle" size={22} color="#666" />
                <Text style={[styles.actionButtonText, { color: "#666" }]}>
                  Decline
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAccept}
                disabled={isResponding}
              >
                {isResponding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={[styles.actionButtonText, { color: "#fff" }]}>
                      Accept
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

      {/* Other Action Buttons */}
      {needsAction() && !isRequester && (
        <View style={styles.actionsContainer}>
          {/* Requested person choosing continuation (after accepting) */}
          {request.requested_status === "accepted" &&
            !request.requested_continuation_choice &&
            request.requester_continuation_choice !== "with_middle_person" && (
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => setShowContinuationModal(true)}
              >
                <Ionicons name="arrow-forward-circle" size={22} color="#fff" />
                <Text style={styles.continueButtonText}>
                  Choose how to continue
                </Text>
              </TouchableOpacity>
            )}
        </View>
      )}

      {/* Change Mind - for requested person who previously declined */}
      {!isRequester && request.requested_status === "rejected" && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.changeMindButton]}
            onPress={() => {
              Alert.alert(
                "Change Your Mind?",
                "Do you want to reconsider and accept this intro request?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Yes, Reconsider",
                    onPress: () => {
                      // Re-show the accept flow
                      setShowConfirmAcceptModal(true);
                      // Reset the request status optimistically
                      patchIntroCache({
                        requested_status: "pending",
                        status: "pending_requested",
                      });
                    },
                  },
                ],
              );
            }}
            disabled={isResponding}
          >
            <Ionicons name="refresh-circle" size={20} color="#1293DA" />
            <Text style={[styles.actionButtonText, { color: "#1293DA" }]}>
              Change Mind
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reject Note Modal */}
      <Modal
        visible={showRejectNote}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRejectNote(false)}
      >
        {Platform.OS === "android" ? (
          <KeyboardAvoidingView style={styles.modalOverlay} behavior="height">
            {rejectNoteModalScroll}
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.modalOverlay}>{rejectNoteModalScroll}</View>
        )}
      </Modal>

      {/* Confirm Accept Modal - for requested person before continuation choice */}
      {!isRequester && (
        <Modal
          visible={showConfirmAcceptModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowConfirmAcceptModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModalContent}>
              <View style={styles.confirmModalHeader}>
                <Ionicons name="heart-circle" size={48} color="#4CAF50" />
                <Text style={styles.confirmModalTitle}>
                  Accept Intro Request?
                </Text>
              </View>

              <View style={styles.confirmModalBody}>
                <Text style={styles.confirmModalText}>
                  You&apos;re about to accept the intro request from{" "}
                  <Text style={styles.boldText}>
                    {otherProfile?.first_name}
                  </Text>
                  .
                </Text>
                <View style={styles.confirmModalInfo}>
                  <Ionicons name="information-circle" size={20} color="#666" />
                  <Text style={styles.confirmModalInfoText}>
                    After accepting, you&apos;ll choose how you&apos;d like to
                    continue with the introduction.
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowConfirmAcceptModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Go Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.acceptConfirmButton]}
                  onPress={handleConfirmAccept}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Yes, Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Continuation Choice Modal */}
      <ContinuationChoiceModal
        visible={showContinuationModal}
        profileName={`${otherProfile?.first_name} ${otherProfile?.last_name}`}
        onSelectChoice={
          isRequester
            ? handleRequesterContinuationChoice
            : handleContinuationChoice
        }
        onCancel={() => setShowContinuationModal(false)}
        loading={isResponding}
        otherSideChoice={
          isRequester
            ? request.requested_continuation_choice
            : request.requester_continuation_choice
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#f0f0f0",
  },
  placeholderImage: {
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 19,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  matchmakerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  matchmakerText: {
    fontSize: 13,
    color: "#666",
  },
  statusBadge: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  pendingBadge: {
    backgroundColor: "#fff8e1",
    borderWidth: 1,
    borderColor: "#ffe082",
  },
  waitingBadge: {
    backgroundColor: "#e3f2fd",
    borderWidth: 1,
    borderColor: "#90caf9",
  },
  matchedBadge: {
    backgroundColor: "#e8f5e9",
    borderWidth: 1,
    borderColor: "#81c784",
  },
  rejectedBadge: {
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#ef9a9a",
  },
  completedBadge: {
    backgroundColor: "#e8f5e9",
    borderWidth: 1,
    borderColor: "#66bb6a",
  },
  noteContainer: {
    backgroundColor: "#f8f9fa",
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#1293DA",
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1293DA",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noteText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  actionsContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: "#fafafa",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  responseButtons: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
  },
  rejectButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  changeMindButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#1293DA",
    flex: 1,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  continueButton: {
    backgroundColor: "#1293DA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#1293DA",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  rejectModalScroll: {
    width: "100%",
  },
  rejectModalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    minHeight: 100,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#F59E0B",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Contact Section Styles
  contactSection: {
    backgroundColor: "#EBF8FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#A8D8F5",
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D4F8A",
  },
  contactInfo: {
    gap: 10,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  contactText: {
    fontSize: 15,
    color: "#1293DA",
    textDecorationLine: "underline",
  },
  // Matchmaker Contact Section Styles
  matchmakerContactSection: {
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#A8D8F5",
  },
  matchmakerContactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  matchmakerContactTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D4F8A",
  },
  matchmakerInfoBox: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#1293DA",
  },
  matchmakerInfoText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  matchmakerContactText: {
    fontSize: 15,
    color: "#1293DA",
    textDecorationLine: "underline",
  },
  // Confirm Accept Modal Styles
  confirmModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  confirmModalHeader: {
    alignItems: "center",
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginTop: 16,
    textAlign: "center",
  },
  confirmModalBody: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  confirmModalText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 20,
  },
  boldText: {
    fontWeight: "700",
    color: "#4CAF50",
  },
  confirmModalInfo: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  confirmModalInfoText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  acceptConfirmButton: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    gap: 6,
  },
  // ── Unified contact section (matches SuggestionCard design) ──
  unifiedContactSection: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  unifiedContactToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 12,
  },
  unifiedContactToggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  unifiedContactMessage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  unifiedContactCard: {
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  unifiedContactName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  unifiedContactDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  unifiedContactActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  unifiedContactAction: {
    alignItems: "center",
    gap: 4,
  },
  unifiedContactActionText: {
    fontSize: 11,
    color: "#666",
  },
  unifiedResumeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#1293DA",
  },
  unifiedResumeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1293DA",
    marginLeft: 8,
  },
  matchmakerContext: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  matchmakerContextText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  matchmakerName: {
    fontWeight: "600",
    color: "#1293DA",
  },
  matchmakerNameClickable: {
    fontWeight: "600",
    color: "#1293DA",
    textDecorationLine: "underline",
  },
  requestDescription: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
    fontStyle: "italic",
  },
});
