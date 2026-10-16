import { profileService } from "@/lib/profileService";
import { useViewedPictureIds } from "@/hooks/useViewedPictureIds";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { IntroRequest, introService } from "../../lib/introService";
import { calculateAge } from "../../lib/utils";

interface MiddlePersonRequestCardProps {
  request: IntroRequest;
  currentUserProfileId?: string;
}

export default function MiddlePersonRequestCard({
  request,
  currentUserProfileId,
}: MiddlePersonRequestCardProps) {
  const { imageUrlFor } = useViewedPictureIds();
  const [showContactInfo, setShowContactInfo] = useState(false);

  const requester = request.requester_profile;
  const requested = request.requested_profile;

  // Determine which side the current user is Matchmaker/Shadchan for
  const isRequesterMiddlePerson =
    request.requester_middle_person_id === currentUserProfileId;
  const isRequestedMiddlePerson =
    request.requested_middle_person_id === currentUserProfileId;

  // Get contact info for Matchmaker/Shadchan
  const contactInfo = currentUserProfileId
    ? introService.getMiddlePersonContactInfo(request, currentUserProfileId)
    : { shouldShowContact: false, message: "Loading..." };

  const handleViewProfile = (profileId: string) => {
    router.push(`/profile-details?id=${profileId}&hideActions=true`);
  };

  const handleSendSMS = (phone: string) => {
    Linking.openURL(`sms:${phone}`);
  };

  const handleSendWhatsApp = (whatsapp: string) => {
    Linking.openURL(`https://wa.me/${whatsapp.replace(/\D/g, "")}`);
  };

  const handleSendEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleCopyPhone = async (phone: string) => {
    await Clipboard.setStringAsync(phone);
    Alert.alert("Copied!", "Phone number copied to clipboard");
  };

  const renderResponseStatus = (hasResponded: boolean, response?: string) => {
    if (!hasResponded) {
      return (
        <View style={[styles.responseBadge, styles.waitingBadge]}>
          <Ionicons name="time-outline" size={14} color="#FF9800" />
          <Text style={styles.responseText}>Waiting</Text>
        </View>
      );
    }

    if (response === "accepted") {
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
    // Did not match
    if (request.status === "rejected") {
      return {
        category: "Did not match",
        icon: "close-circle" as const,
        color: "#F59E0B",
        description: "One or both declined",
      };
    }

    // Matched
    if (
      request.status === "completed" ||
      (request.status === "accepted" &&
        request.requester_continuation_choice &&
        request.requested_continuation_choice)
    ) {
      return {
        category: "Matched",
        icon: "heart" as const,
        color: "#4CAF50",
        description: "Both accepted",
      };
    }

    // Awaiting response - Pending means waiting for requested person's initial response
    if (
      request.status === "pending_matchmaker" ||
      request.status === "pending_requested"
    ) {
      return {
        category: "Awaiting response",
        icon: "time" as const,
        color: "#FF9800",
        description: `Waiting for ${requested.first_name}`,
      };
    }

    // Awaiting response - Accepted but need continuation choices
    return {
      category: "Awaiting response",
      icon: "time" as const,
      color: "#FF9800",
      description: "Awaiting continuation choices",
    };
  };

  const categoryInfo = getCategoryInfo();

  const getRequesterPicture = () => imageUrlFor(requester);
  const getRequestedPicture = () => imageUrlFor(requested);

  return (
    <View style={styles.card}>
      {/* Category Header */}
      <View
        style={[
          styles.categoryHeader,
          { backgroundColor: `${categoryInfo.color}15` },
        ]}
      >
        <Ionicons
          name={categoryInfo.icon}
          size={18}
          color={categoryInfo.color}
        />
        <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
          {categoryInfo.category}
        </Text>
        <Text style={styles.categoryDescription}>
          {" "}
          • {categoryInfo.description}
        </Text>
      </View>

      {/* Match Participants */}
      <View style={styles.participantsRow}>
        {/* Requester */}
        <TouchableOpacity
          style={styles.participant}
          onPress={() => handleViewProfile(requester.id)}
          activeOpacity={0.7}
        >
          {getRequesterPicture() ? (
            <Image
              source={{ uri: getRequesterPicture()! }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#ccc" />
            </View>
          )}
          <View style={styles.participantInfo}>
            <Text style={styles.participantName}>
              {requester.first_name} {requester.last_name}
            </Text>
            <Text style={styles.participantDetails}>
              {requester.dob ? calculateAge(requester.dob) : "N/A"} •{" "}
              {requester.gender}
            </Text>
            {isRequesterMiddlePerson && (
              <View style={styles.yourClientBadge}>
                <Ionicons name="hand-right" size={10} color="#2196F3" />
                <Text style={styles.yourClientText}>Facilitating</Text>
              </View>
            )}
          </View>
          {renderResponseStatus(
            true, // Requester always has responded (by initiating the request)
            "accepted", // Requester always shows as liked since they initiated
          )}
        </TouchableOpacity>

        {/* Arrow/Heart Separator */}
        <View style={styles.separator}>
          {request.status === "completed" ||
          (request.status === "accepted" &&
            request.requester_continuation_choice &&
            request.requested_continuation_choice) ? (
            <Ionicons name="heart" size={20} color="#1293DA" />
          ) : (
            <Ionicons name="arrow-forward" size={20} color="#999" />
          )}
        </View>

        {/* Requested */}
        <TouchableOpacity
          style={styles.participant}
          onPress={() => handleViewProfile(requested.id)}
          activeOpacity={0.7}
        >
          {getRequestedPicture() ? (
            <Image
              source={{ uri: getRequestedPicture()! }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#ccc" />
            </View>
          )}
          <View style={styles.participantInfo}>
            <Text style={styles.participantName}>
              {requested.first_name} {requested.last_name}
            </Text>
            <Text style={styles.participantDetails}>
              {requested.dob ? calculateAge(requested.dob) : "N/A"} •{" "}
              {requested.gender}
            </Text>
            {isRequestedMiddlePerson && (
              <View style={styles.yourClientBadge}>
                <Ionicons name="hand-right" size={10} color="#2196F3" />
                <Text style={styles.yourClientText}>Facilitating</Text>
              </View>
            )}
          </View>
          {renderResponseStatus(
            request.status !== "pending_matchmaker" &&
              request.status !== "pending_requested",
            request.status === "rejected" ? "rejected" : "accepted",
          )}
        </TouchableOpacity>
      </View>

      {/* Request Date */}
      <View style={styles.dateSection}>
        <Ionicons name="calendar-outline" size={14} color="#999" />
        <Text style={styles.dateText}>
          Suggested{" "}
          {new Date(request.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year:
              new Date(request.created_at).getFullYear() !==
              new Date().getFullYear()
                ? "numeric"
                : undefined,
          })}
        </Text>
      </View>

      {/* Contact Information */}
      {contactInfo.shouldShowContact && contactInfo.contactPerson && (
        <View style={styles.contactSection}>
          <TouchableOpacity
            style={styles.contactToggle}
            onPress={() => setShowContactInfo(!showContactInfo)}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={18} color="#4CAF50" />
            <Text style={styles.contactToggleText}>Contact information</Text>
            <Ionicons
              name={showContactInfo ? "chevron-up" : "chevron-down"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>

          {showContactInfo && (
            <>
              <Text style={styles.contactTitle}>{contactInfo.message}</Text>
              <View style={styles.contactCard}>
                <Text style={styles.contactName}>
                  {contactInfo.contactPerson.name}
                </Text>
                {contactInfo.contactPerson.phone && (
                  <Text style={styles.contactDetail}>
                    📞 {contactInfo.contactPerson.phone}
                  </Text>
                )}
                {contactInfo.contactPerson.email && (
                  <Text style={styles.contactDetail}>
                    📧 {contactInfo.contactPerson.email}
                  </Text>
                )}

                <View style={styles.contactActions}>
                  {contactInfo.contactPerson.phone && (
                    <>
                      <TouchableOpacity
                        style={styles.contactAction}
                        onPress={() =>
                          handleSendSMS(contactInfo.contactPerson!.phone!)
                        }
                      >
                        <Ionicons name="chatbubble" size={18} color="#007AFF" />
                        <Text style={styles.contactActionText}>SMS</Text>
                      </TouchableOpacity>

                      {contactInfo.contactPerson.whatsapp && (
                        <TouchableOpacity
                          style={styles.contactAction}
                          onPress={() =>
                            handleSendWhatsApp(
                              contactInfo.contactPerson!.whatsapp!,
                            )
                          }
                        >
                          <Ionicons
                            name="logo-whatsapp"
                            size={18}
                            color="#25D366"
                          />
                          <Text style={styles.contactActionText}>WhatsApp</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.contactAction}
                        onPress={() =>
                          handleCopyPhone(contactInfo.contactPerson!.phone!)
                        }
                      >
                        <Ionicons name="copy" size={18} color="#666" />
                        <Text style={styles.contactActionText}>Copy</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {contactInfo.contactPerson.email && (
                    <TouchableOpacity
                      style={styles.contactAction}
                      onPress={() =>
                        handleSendEmail(contactInfo.contactPerson!.email!)
                      }
                    >
                      <Ionicons name="mail" size={18} color="#EA4335" />
                      <Text style={styles.contactActionText}>Email</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      )}

      {/* Waiting Message */}
      {!contactInfo.shouldShowContact && request.status === "accepted" && (
        <View style={styles.waitingSection}>
          <Ionicons name="hourglass" size={16} color="#999" />
          <Text style={styles.waitingText}>{contactInfo.message}</Text>
        </View>
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
  yourClientBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    marginTop: 4,
  },
  yourClientText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2196F3",
  },
  contactSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  contactToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 12,
  },
  contactToggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  contactCard: {
    backgroundColor: "#F1F8F4",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  contactName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  contactDetail: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },
  contactActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  contactAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  contactActionText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  waitingSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF8E1",
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  waitingText: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
  },
});
