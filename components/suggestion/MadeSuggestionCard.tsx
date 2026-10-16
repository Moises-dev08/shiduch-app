import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useViewedPictureIds } from "../../hooks/useViewedPictureIds";
import { profileService } from "../../lib/profileService";
import { Suggestion } from "../../lib/suggestionService";
import { calculateAge } from "../../lib/utils";

interface MadeSuggestionCardProps {
  suggestion: Suggestion;
}

export default function MadeSuggestionCard({
  suggestion,
}: MadeSuggestionCardProps) {
  const { imageUrlFor } = useViewedPictureIds();
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);

  const profileOne = suggestion.profile_one as any;
  const profileTwo = suggestion.profile_two as any;

  if (!profileOne || !profileTwo) {
    return null;
  }

  const p1NeedsFacilitation =
    suggestion.profile_one_continuation_choice === "with_middle_person";
  const p2NeedsFacilitation =
    suggestion.profile_two_continuation_choice === "with_middle_person";
  const anyNeedsFacilitation = p1NeedsFacilitation || p2NeedsFacilitation;

  const handleViewProfile = (profileId: string) => {
    router.push(`/profile-details?id=${profileId}&hideActions=true`);
  };

  const handleSendSMS = (phone: string) => Linking.openURL(`sms:${phone}`);
  const handleSendWhatsApp = (phone: string) =>
    Linking.openURL(`https://wa.me/${phone.replace(/\D/g, "")}`);
  const handleSendEmail = (email: string) => Linking.openURL(`mailto:${email}`);
  const handleCopyPhone = async (phone: string) => {
    await Clipboard.setStringAsync(phone);
    Alert.alert("Copied!", "Phone number copied to clipboard");
  };

  const renderContactCard = (profile: any) => (
    <View style={styles.contactCard}>
      <Text style={styles.contactName}>
        {profile.first_name} {profile.last_name}
      </Text>
      {profile.phone && (
        <Text style={styles.contactDetail}>📞 {profile.phone}</Text>
      )}
      {profile.email && (
        <Text style={styles.contactDetail}>📧 {profile.email}</Text>
      )}
      <View style={styles.contactActions}>
        {profile.phone && (
          <>
            <TouchableOpacity
              style={styles.contactAction}
              onPress={() => handleSendSMS(profile.phone)}
            >
              <Ionicons name="chatbubble" size={18} color="#007AFF" />
              <Text style={styles.contactActionText}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactAction}
              onPress={() => handleSendWhatsApp(profile.phone)}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={styles.contactActionText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactAction}
              onPress={() => handleCopyPhone(profile.phone)}
            >
              <Ionicons name="copy" size={18} color="#666" />
              <Text style={styles.contactActionText}>Copy</Text>
            </TouchableOpacity>
          </>
        )}
        {profile.email && (
          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => handleSendEmail(profile.email)}
          >
            <Ionicons name="mail" size={18} color="#EA4335" />
            <Text style={styles.contactActionText}>Email</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const getProfileImage = (profile: any) => {
    return imageUrlFor(profile);
  };

  const renderResponseStatus = (status: string) => {
    if (status === "pending") {
      return (
        <View style={[styles.responseBadge, styles.waitingBadge]}>
          <Ionicons name="time-outline" size={14} color="#FF9800" />
          <Text style={styles.responseText}>Waiting</Text>
        </View>
      );
    }

    if (status === "accepted") {
      return (
        <View style={[styles.responseBadge, styles.acceptedBadge]}>
          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
          <Text style={styles.responseText}>Liked</Text>
        </View>
      );
    }

    return (
      <View style={[styles.responseBadge, styles.rejectedBadge]}>
        <Ionicons name="close-circle" size={14} color="#F59E0B" />
        <Text style={styles.responseText}>Declined</Text>
      </View>
    );
  };

  const getCategoryInfo = () => {
    if (
      suggestion.status === "completed" ||
      (suggestion.status === "accepted" &&
        suggestion.profile_one_continuation_choice &&
        suggestion.profile_two_continuation_choice)
    ) {
      return {
        icon: "heart",
        color: "#4CAF50",
        text: "Matched",
        description: "Both accepted and chose how to continue.",
      };
    } else if (suggestion.status === "rejected") {
      return {
        icon: "close-circle",
        color: "#F59E0B",
        text: "Did not match",
        description: "One or both declined the suggestion.",
      };
    } else {
      return {
        icon: "time",
        color: "#FF9800",
        text: "Awaiting response",
        description: "Waiting for responses or continuation choices.",
      };
    }
  };

  const category = getCategoryInfo();

  return (
    <View style={styles.card}>
      {/* "You suggested this match" label */}
      <View style={styles.suggestedByYouBanner}>
        <Ionicons name="bulb-outline" size={14} color="#7C3AED" />
        <Text style={styles.suggestedByYouText}>You suggested this match</Text>
      </View>

      <View
        style={[
          styles.categoryHeader,
          { backgroundColor: category.color + "10" },
        ]}
      >
        <Ionicons
          name={category.icon as any}
          size={18}
          color={category.color}
        />
        <View>
          <Text style={[styles.categoryText, { color: category.color }]}>
            {category.text}
          </Text>
          <Text style={styles.categoryDescription}>{category.description}</Text>
        </View>
      </View>

      <View style={styles.participantsRow}>
        {/* Profile One */}
        <TouchableOpacity
          style={styles.participant}
          onPress={() => handleViewProfile(profileOne.id)}
          activeOpacity={0.7}
        >
          {getProfileImage(profileOne) ? (
            <Image
              source={{ uri: getProfileImage(profileOne)! }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#ccc" />
            </View>
          )}
          <View style={styles.participantInfo}>
            <Text style={styles.participantName}>
              {profileOne.first_name} {profileOne.last_name}
            </Text>
            <Text style={styles.participantDetails}>
              {calculateAge(profileOne.dob)} • {profileOne.gender}
            </Text>
          </View>
          {renderResponseStatus(suggestion.profile_one_status || "pending")}
        </TouchableOpacity>

        {/* Arrow/Heart Separator */}
        <View style={styles.separator}>
          {suggestion.status === "completed" ||
          (suggestion.status === "accepted" &&
            suggestion.profile_one_continuation_choice &&
            suggestion.profile_two_continuation_choice) ? (
            <Ionicons name="heart" size={20} color="#1293DA" />
          ) : (
            <Ionicons name="arrow-forward" size={20} color="#999" />
          )}
        </View>

        {/* Profile Two */}
        <TouchableOpacity
          style={styles.participant}
          onPress={() => handleViewProfile(profileTwo.id)}
          activeOpacity={0.7}
        >
          {getProfileImage(profileTwo) ? (
            <Image
              source={{ uri: getProfileImage(profileTwo)! }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#ccc" />
            </View>
          )}
          <View style={styles.participantInfo}>
            <Text style={styles.participantName}>
              {profileTwo.first_name} {profileTwo.last_name}
            </Text>
            <Text style={styles.participantDetails}>
              {calculateAge(profileTwo.dob)} • {profileTwo.gender}
            </Text>
          </View>
          {renderResponseStatus(suggestion.profile_two_status || "pending")}
        </TouchableOpacity>
      </View>

      {/* Contact info for facilitation — visible when either person chose with_middle_person */}
      {anyNeedsFacilitation && (
        <View style={styles.facilitateSection}>
          <TouchableOpacity
            style={styles.facilitateHeader}
            onPress={() => setShowContactInfo(!showContactInfo)}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={16} color="#1293DA" />
            <Text style={styles.facilitateTitle}>
              {p1NeedsFacilitation && p2NeedsFacilitation
                ? "Both want you to facilitate — view contacts"
                : `${p1NeedsFacilitation ? profileOne.first_name : profileTwo.first_name} wants you to facilitate — view contacts`}
            </Text>
            <Ionicons
              name={showContactInfo ? "chevron-up" : "chevron-down"}
              size={16}
              color="#1293DA"
            />
          </TouchableOpacity>

          {showContactInfo && (
            <View style={styles.contactList}>
              {renderContactCard(profileOne)}
              {renderContactCard(profileTwo)}
            </View>
          )}
        </View>
      )}

      {/* Note Section */}
      {(suggestion.note ||
        suggestion.profile_one_note ||
        suggestion.profile_two_note) && (
        <TouchableOpacity
          style={styles.noteButton}
          onPress={() => setShowNoteModal(true)}
        >
          <Ionicons name="document-text" size={16} color="#1293DA" />
          <Text style={styles.noteButtonText}>
            {suggestion.profile_one_note && suggestion.profile_two_note
              ? "View your notes"
              : "View your note"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Request Date */}
      <View style={styles.dateSection}>
        <Ionicons name="calendar-outline" size={14} color="#999" />
        <Text style={styles.dateText}>
          Suggested{" "}
          {new Date(suggestion.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year:
              new Date(suggestion.created_at).getFullYear() !==
              new Date().getFullYear()
                ? "numeric"
                : undefined,
          })}
        </Text>
      </View>

      {/* Note Modal */}
      {(suggestion.note ||
        suggestion.profile_one_note ||
        suggestion.profile_two_note) && (
        <Modal
          visible={showNoteModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowNoteModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {suggestion.profile_one_note && suggestion.profile_two_note
                  ? "Your Notes"
                  : "Your Note"}
              </Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              {suggestion.profile_one_note && suggestion.profile_two_note ? (
                // Show both separate notes
                <>
                  <Text style={styles.noteLabel}>
                    Note for {profileOne.first_name} {profileOne.last_name}:
                  </Text>
                  <View style={styles.noteCard}>
                    <Text style={styles.noteText}>
                      {suggestion.profile_one_note}
                    </Text>
                  </View>
                  <Text style={[styles.noteLabel, { marginTop: 20 }]}>
                    Note for {profileTwo.first_name} {profileTwo.last_name}:
                  </Text>
                  <View style={styles.noteCard}>
                    <Text style={styles.noteText}>
                      {suggestion.profile_two_note}
                    </Text>
                  </View>
                </>
              ) : (
                // Show single note (legacy or same note)
                <View style={styles.noteCard}>
                  <Text style={styles.noteText}>
                    {suggestion.profile_one_note ||
                      suggestion.profile_two_note ||
                      suggestion.note}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "700",
  },
  categoryDescription: {
    fontSize: 13,
    color: "#666",
    fontWeight: "400",
  },
  participantsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  participant: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f0f0f0",
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  participantInfo: {
    alignItems: "center",
    gap: 2,
  },
  participantName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  participantDetails: {
    fontSize: 12,
    color: "#666",
  },
  responseBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 4,
  },
  waitingBadge: {
    backgroundColor: "#FFF3E0",
  },
  acceptedBadge: {
    backgroundColor: "#E8F5E9",
  },
  rejectedBadge: {
    backgroundColor: "#FFF8E1",
  },
  responseText: {
    fontSize: 11,
    fontWeight: "600",
  },
  separator: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  noteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#E3F2FD",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1293DA",
  },
  noteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1293DA",
  },
  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: "#999",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  noteCard: {
    backgroundColor: "#FFF9C4",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFF176",
  },
  noteLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  noteText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  suggestedByYouBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F5F3FF",
    borderBottomWidth: 1,
    borderBottomColor: "#EDE9FE",
  },
  suggestedByYouText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7C3AED",
  },
  facilitateSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    backgroundColor: "#F0F9FF",
    overflow: "hidden",
  },
  facilitateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  facilitateTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#1293DA",
  },
  contactList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 12,
  },
  contactCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 6,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
  contactDetail: {
    fontSize: 13,
    color: "#555",
  },
  contactActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  contactAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },
  contactActionText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
});
