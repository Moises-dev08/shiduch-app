import { Ionicons } from "@expo/vector-icons";
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
import { IntroRequest, introService } from "../../lib/introService";
import { profileService } from "../../lib/profileService";

interface MatchmakerRequestCardProps {
  request: IntroRequest;
  onUpdate: () => void;
}

/**
 * Card for matchmaker (Ben) to view and respond to intro requests
 * Shows: Ori → Shimon (via Ben)
 */
export default function MatchmakerRequestCard({
  request,
  onUpdate,
}: MatchmakerRequestCardProps) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteToRequester, setNoteToRequester] = useState("");
  const [noteToRequested, setNoteToRequested] = useState("");
  const [responseType, setResponseType] = useState<
    "accepted" | "rejected" | null
  >(null);
  const [isResponding, setIsResponding] = useState(false);

  const requesterProfile = request.requester_profile;
  const requestedProfile = request.requested_profile;

  const getProfileImage = (profile: any) => {
    if (Array.isArray(profile?.pictures) && profile.pictures.length > 0) {
      return profileService.getImageUrl(profile.pictures[0]);
    }
    return null;
  };

  const handleViewProfile = (profileId: string) => {
    router.push(`/profile-details?id=${profileId}&hideActions=true`);
  };

  const handleResponseWithNote = (response: "accepted" | "rejected") => {
    setResponseType(response);
    setShowNoteModal(true);
  };

  const handleSubmitResponse = async () => {
    if (!responseType) return;

    setIsResponding(true);
    try {
      await introService.matchmakerRespondToRequest(
        request.id,
        responseType,
        noteToRequester || undefined,
        noteToRequested || undefined,
      );
      setShowNoteModal(false);
      setNoteToRequester("");
      setNoteToRequested("");
      setResponseType(null);
      Alert.alert(
        responseType === "accepted"
          ? "Request Accepted! ✅"
          : "Request Declined",
        responseType === "accepted"
          ? "The request has been sent to the requested person."
          : "The requester has been notified.",
      );
      onUpdate();
    } catch (error) {
      console.error("Error responding to request:", error);
      Alert.alert("Error", "Failed to respond to request");
    } finally {
      setIsResponding(false);
    }
  };

  const renderStatus = () => {
    if (request.matchmaker_status === "pending") {
      return (
        <View style={[styles.statusBadge, styles.pendingBadge]}>
          <Text style={styles.statusText}>⏳ Action Needed</Text>
        </View>
      );
    } else if (request.matchmaker_status === "rejected") {
      return (
        <View style={[styles.statusBadge, styles.rejectedBadge]}>
          <Text style={styles.statusText}>✗ You Declined</Text>
        </View>
      );
    } else if (request.matchmaker_status === "accepted") {
      if (request.requested_status === "pending") {
        return (
          <View style={[styles.statusBadge, styles.waitingBadge]}>
            <Text style={styles.statusText}>
              ⏳ Waiting for {requestedProfile?.first_name}
            </Text>
          </View>
        );
      } else if (request.requested_status === "rejected") {
        return (
          <View style={[styles.statusBadge, styles.rejectedBadge]}>
            <Text style={styles.statusText}>
              ✗ {requestedProfile?.first_name} Declined
            </Text>
          </View>
        );
      } else if (request.requested_status === "accepted") {
        return (
          <View style={[styles.statusBadge, styles.matchedBadge]}>
            <Text style={styles.statusText}>✓ Both accepted!</Text>
          </View>
        );
      }
    }
    return null;
  };

  const requesterImage = getProfileImage(requesterProfile);
  const requestedImage = getProfileImage(requestedProfile);

  return (
    <View style={styles.card}>
      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Ionicons name="people" size={20} color="#1293DA" />
        <Text style={styles.descriptionText}>
          <Text style={styles.boldText}>{requesterProfile?.first_name}</Text>{" "}
          has requested your assistance as a matchmaker/shadchan to facilitate a
          potential introduction with{" "}
          <Text style={styles.boldText}>{requestedProfile?.first_name}</Text>.
        </Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profilesRow}>
          {/* Requester */}
          <TouchableOpacity
            style={styles.profileContainer}
            onPress={() => handleViewProfile(requesterProfile?.id)}
          >
            {requesterImage ? (
              <Image
                source={{ uri: requesterImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.placeholderImage]}>
                <Ionicons name="person" size={20} color="#999" />
              </View>
            )}
            <Text style={styles.profileName} numberOfLines={1}>
              {requesterProfile?.first_name}
            </Text>
          </TouchableOpacity>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <Ionicons name="arrow-forward" size={24} color="#1293DA" />
            <Text style={styles.viaText}>You as</Text>
            <Text style={styles.viaText}>Matchmaker</Text>
          </View>

          {/* Requested */}
          <TouchableOpacity
            style={styles.profileContainer}
            onPress={() => handleViewProfile(requestedProfile?.id)}
          >
            {requestedImage ? (
              <Image
                source={{ uri: requestedImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.placeholderImage]}>
                <Ionicons name="person" size={20} color="#999" />
              </View>
            )}
            <Text style={styles.profileName} numberOfLines={1}>
              {requestedProfile?.first_name}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status */}
      {renderStatus()}

      {/* Requested Person's Note (if they responded) */}
      {request.requested_note_to_matchmaker && (
        <View style={styles.noteContainer}>
          <View style={styles.noteHeader}>
            <Ionicons name="chatbox" size={16} color="#1293DA" />
            <Text style={styles.noteTitle}>
              Note from {requestedProfile?.first_name}:
            </Text>
          </View>
          <Text style={styles.noteText}>
            {request.requested_note_to_matchmaker}
          </Text>
        </View>
      )}

      {/* Contact Information - Show when both parties accepted and continuing with matchmaker */}
      {request.matchmaker_status === "accepted" &&
        request.requested_status === "accepted" &&
        (request.requester_continuation_choice === "with_middle_person" ||
          request.requested_continuation_choice === "with_middle_person") && (
          <View style={styles.contactSection}>
            <View style={styles.contactHeader}>
              <Ionicons name="people" size={20} color="#1293DA" />
              <Text style={styles.contactTitle}>
                Contact information for both parties
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={18} color="#1293DA" />
              <Text style={styles.infoText}>
                Both parties have chosen to continue with your assistance as a
                matchmaker. Here is their contact information.
              </Text>
            </View>

            <ScrollView
              style={styles.contactsContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Requester Contact Info */}
              {requesterProfile && (
                <View style={styles.personContactCard}>
                  <Text style={styles.personContactName}>
                    {requesterProfile.first_name} {requesterProfile.last_name}
                    <Text style={styles.roleLabel}> (Requester)</Text>
                  </Text>

                  {requesterProfile.phone && (
                    <TouchableOpacity
                      style={styles.contactItem}
                      onPress={() =>
                        Linking.openURL(`tel:${requesterProfile.phone}`)
                      }
                    >
                      <Ionicons name="call" size={18} color="#1293DA" />
                      <Text style={styles.contactText}>
                        {requesterProfile.phone}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {requesterProfile.email && (
                    <TouchableOpacity
                      style={styles.contactItem}
                      onPress={() =>
                        Linking.openURL(`mailto:${requesterProfile.email}`)
                      }
                    >
                      <Ionicons name="mail" size={18} color="#1293DA" />
                      <Text style={styles.contactText}>
                        {requesterProfile.email}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {requesterProfile.whatsapp && (
                    <TouchableOpacity
                      style={styles.contactItem}
                      onPress={() =>
                        Linking.openURL(
                          `https://wa.me/${requesterProfile.whatsapp}`,
                        )
                      }
                    >
                      <Ionicons
                        name="logo-whatsapp"
                        size={18}
                        color="#25D366"
                      />
                      <Text style={styles.contactText}>
                        {requesterProfile.whatsapp}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Requested Contact Info */}
              {requestedProfile && (
                <View style={styles.personContactCard}>
                  <Text style={styles.personContactName}>
                    {requestedProfile.first_name} {requestedProfile.last_name}
                    <Text style={styles.roleLabel}> (Requested)</Text>
                  </Text>

                  {requestedProfile.phone && (
                    <TouchableOpacity
                      style={styles.contactItem}
                      onPress={() =>
                        Linking.openURL(`tel:${requestedProfile.phone}`)
                      }
                    >
                      <Ionicons name="call" size={18} color="#1293DA" />
                      <Text style={styles.contactText}>
                        {requestedProfile.phone}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {requestedProfile.email && (
                    <TouchableOpacity
                      style={styles.contactItem}
                      onPress={() =>
                        Linking.openURL(`mailto:${requestedProfile.email}`)
                      }
                    >
                      <Ionicons name="mail" size={18} color="#1293DA" />
                      <Text style={styles.contactText}>
                        {requestedProfile.email}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {requestedProfile.whatsapp && (
                    <TouchableOpacity
                      style={styles.contactItem}
                      onPress={() =>
                        Linking.openURL(
                          `https://wa.me/${requestedProfile.whatsapp}`,
                        )
                      }
                    >
                      <Ionicons
                        name="logo-whatsapp"
                        size={18}
                        color="#25D366"
                      />
                      <Text style={styles.contactText}>
                        {requestedProfile.whatsapp}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        )}

      {/* Action Buttons (only if pending) */}
      {request.matchmaker_status === "pending" && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleResponseWithNote("rejected")}
            disabled={isResponding}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleResponseWithNote("accepted")}
            disabled={isResponding}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Note Modal */}
      <Modal
        visible={showNoteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNoteModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {responseType === "accepted"
                  ? "Accept Request"
                  : "Decline Request"}
              </Text>
              <Text style={styles.modalSubtitle}>Add optional notes:</Text>

              {/* Note to Requester (Ori) */}
              <Text style={styles.noteLabel}>
                Note for {requesterProfile?.first_name} (Requester):
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Optional note..."
                value={noteToRequester}
                onChangeText={setNoteToRequester}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Note to Requested (Shimon) - only if accepting */}
              {responseType === "accepted" && (
                <>
                  <Text style={styles.noteLabel}>
                    Note for {requestedProfile?.first_name} (Introduction):
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Optional note..."
                    value={noteToRequested}
                    onChangeText={setNoteToRequested}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowNoteModal(false);
                    setNoteToRequester("");
                    setNoteToRequested("");
                    setResponseType(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    responseType === "accepted"
                      ? styles.acceptModalButton
                      : styles.rejectModalButton,
                  ]}
                  onPress={handleSubmitResponse}
                  disabled={isResponding}
                >
                  {isResponding ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {responseType === "accepted" ? "Accept" : "Decline"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  descriptionContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  descriptionText: {
    flex: 1,
    fontSize: 14,
    color: "#0277bd",
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "700",
    color: "#0D4F8A",
  },
  header: {
    marginBottom: 12,
  },
  profilesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileContainer: {
    alignItems: "center",
    flex: 1,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  placeholderImage: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  arrowContainer: {
    alignItems: "center",
    marginHorizontal: 8,
    justifyContent: "center",
  },
  viaText: {
    fontSize: 11,
    color: "#1293DA",
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  pendingBadge: {
    backgroundColor: "#fff3cd",
  },
  waitingBadge: {
    backgroundColor: "#e3f2fd",
  },
  matchedBadge: {
    backgroundColor: "#d4edda",
  },
  rejectedBadge: {
    backgroundColor: "#f8d7da",
  },
  noteContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1293DA",
  },
  noteText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
  },
  rejectButton: {
    backgroundColor: "#F59E0B",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
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
  noteLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 4,
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
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  acceptModalButton: {
    backgroundColor: "#4CAF50",
  },
  rejectModalButton: {
    backgroundColor: "#F59E0B",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Contact Section Styles
  contactSection: {
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
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
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  contactsContainer: {
    maxHeight: 400,
  },
  personContactCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#1293DA",
  },
  personContactName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1293DA",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  contactText: {
    fontSize: 15,
    color: "#1293DA",
    textDecorationLine: "underline",
  },
});
