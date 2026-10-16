import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ConfirmationModal from "../../components/ConfirmationModal";
import InfoModal from "../../components/InfoModal";
import {
  EmailAudience,
  EmailCampaignSummary,
  EmailContent,
  EmailFailure,
  EmailTemplate,
  MemberSearchResult,
  emailAnnouncementService,
} from "../../lib/emailAnnouncementService";
import { webPageLayout } from "../../styles/webPageLayout";
import { styles } from "./announcements.styles";

const EMPTY_CONTENT: EmailContent = {
  subject: "",
  textBody: "",
  postTitle: "",
  postBody: "",
  linkUrl: "",
  linkLabel: "",
};

const PRESETS: { label: string; boys: boolean; girls: boolean; matchmakers: boolean }[] = [
  { label: "All members", boys: true, girls: true, matchmakers: true },
  { label: "All singles", boys: true, girls: true, matchmakers: false },
  { label: "Boys only", boys: true, girls: false, matchmakers: false },
  { label: "Girls only", boys: false, girls: true, matchmakers: false },
  { label: "All matchmakers", boys: false, girls: false, matchmakers: true },
  { label: "Singles and matchmakers", boys: true, girls: true, matchmakers: true },
];

function roleLabel(role: string, gender: string): string {
  if (role === "matchmaker") return "Matchmaker";
  if (gender === "male") return "Boy";
  if (gender === "female") return "Girl";
  return "Member";
}

function statusLabel(status: string): string {
  if (status === "sent") return "Sent";
  if (status === "partial") return "Partly sent";
  if (status === "failed") return "Failed";
  if (status === "sending") return "Sending";
  return status;
}

export default function AnnouncementsScreen(): React.ReactElement {
  const [content, setContent] = useState<EmailContent>(EMPTY_CONTENT);
  const [boys, setBoys] = useState(false);
  const [girls, setGirls] = useState(false);
  const [matchmakers, setMatchmakers] = useState(false);
  const [people, setPeople] = useState<MemberSearchResult[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<EmailCampaignSummary[]>([]);
  const [failures, setFailures] = useState<EmailFailure[]>([]);
  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [saveAsNew, setSaveAsNew] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [info, setInfo] = useState({ visible: false, title: "", message: "" });

  const audience = useCallback((): EmailAudience => {
    return {
      boys,
      girls,
      matchmakers,
      profileIds: people.map((person) => person.id),
    };
  }, [boys, girls, matchmakers, people]);

  const loadLists = useCallback(async (): Promise<void> => {
    const [templateResult, campaignResult] = await Promise.all([
      emailAnnouncementService.listTemplates(),
      emailAnnouncementService.listCampaigns(),
    ]);
    if (templateResult.success && templateResult.data) setTemplates(templateResult.data);
    if (campaignResult.success && campaignResult.data) setCampaigns(campaignResult.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      emailAnnouncementService.searchMembers(query).then((result) => {
        if (result.success && result.data) setResults(result.data);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const showInfo = (title: string, message: string): void => {
    setInfo({ visible: true, title, message });
  };

  const updateContent = (patch: Partial<EmailContent>): void => {
    setContent((current) => ({ ...current, ...patch }));
  };

  const loadTemplate = (template: EmailTemplate): void => {
    setSelectedTemplateId(template.id);
    setTemplateName(template.name);
    setContent({
      subject: template.subject,
      textBody: template.textBody,
      postTitle: template.postTitle,
      postBody: template.postBody,
      linkUrl: template.linkUrl,
      linkLabel: template.linkLabel,
    });
  };

  const saveTemplate = async (): Promise<void> => {
    const name = templateName.trim();
    if (!name) {
      showInfo("Template name", "Enter a name for this template.");
      return;
    }
    setBusy(true);
    const id = saveAsNew ? undefined : selectedTemplateId ?? undefined;
    const result = await emailAnnouncementService.saveTemplate(name, content, id);
    setBusy(false);
    setShowNameModal(false);
    if (!result.success) {
      showInfo("Could not save", result.error || "Try again.");
      return;
    }
    if (result.data?.id) setSelectedTemplateId(result.data.id);
    await loadLists();
  };

  const deleteTemplate = async (): Promise<void> => {
    if (!selectedTemplateId) return;
    setBusy(true);
    const result = await emailAnnouncementService.deleteTemplate(selectedTemplateId);
    setBusy(false);
    if (!result.success) {
      showInfo("Could not delete", result.error || "Try again.");
      return;
    }
    setSelectedTemplateId(null);
    setTemplateName("");
    await loadLists();
  };

  const requestSend = async (): Promise<void> => {
    if (!content.subject.trim()) {
      showInfo("Subject", "Add a subject before sending.");
      return;
    }
    setBusy(true);
    const result = await emailAnnouncementService.preview(content, audience());
    setBusy(false);
    if (!result.success || !result.data) {
      showInfo("Could not preview", result.error || "Try again.");
      return;
    }
    if (result.data.recipientCount === 0) {
      showInfo("No recipients", "No selected members have a login email.");
      return;
    }
    const skipped =
      result.data.skippedNoEmail > 0
        ? ` ${result.data.skippedNoEmail} selected members have no login email and will be skipped.`
        : "";
    setConfirmMessage(
      `${result.data.recipientCount} people will receive this email.${skipped}`,
    );
    setShowConfirm(true);
  };

  const confirmSend = async (): Promise<void> => {
    setBusy(true);
    const result = await emailAnnouncementService.send(content, audience());
    setBusy(false);
    setShowConfirm(false);
    if (!result.success) {
      showInfo("Could not send", result.error || "Try again.");
      return;
    }
    showInfo("Email sent", "The send status is listed below.");
    await loadLists();
  };

  const openCampaign = async (campaignId: string): Promise<void> => {
    if (openCampaignId === campaignId) {
      setOpenCampaignId(null);
      setFailures([]);
      return;
    }
    const result = await emailAnnouncementService.getCampaign(campaignId);
    if (!result.success || !result.data) {
      showInfo("Could not load status", result.error || "Try again.");
      return;
    }
    const detail = result.data;
    setOpenCampaignId(campaignId);
    setFailures(detail.failures);
    setCampaigns((current) =>
      current.map((campaign) => (campaign.id === campaignId ? detail.campaign : campaign)),
    );
  };

  const retryCampaign = async (campaignId: string): Promise<void> => {
    setBusy(true);
    const result = await emailAnnouncementService.retry(campaignId);
    setBusy(false);
    if (!result.success) {
      showInfo("Could not retry", result.error || "Try again.");
      return;
    }
    await loadLists();
    const detail = await emailAnnouncementService.getCampaign(campaignId);
    if (detail.success && detail.data) {
      setOpenCampaignId(campaignId);
      setFailures(detail.data.failures);
    }
  };

  const addPerson = (person: MemberSearchResult): void => {
    setPeople((current) =>
      current.some((item) => item.id === person.id) ? current : [...current, person],
    );
    setSearch("");
    setResults([]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.fieldGap} color="#1293DA" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Emails</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, webPageLayout.centeredListScrollContent]} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Templates</Text>
        {templates.length === 0 ? (
          <Text style={styles.emptyText}>No saved templates yet.</Text>
        ) : (
          <View style={styles.templateRow}>
            {templates.map((template) => {
              const selected = template.id === selectedTemplateId;
              return (
                <TouchableOpacity
                  key={template.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => loadTemplate(template)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {template.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setSaveAsNew(false);
              setShowNameModal(true);
            }}
          >
            <Text style={styles.secondaryButtonText}>
              {selectedTemplateId ? "Update template" : "Save template"}
            </Text>
          </TouchableOpacity>
          {selectedTemplateId ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setSaveAsNew(true);
                setTemplateName("");
                setShowNameModal(true);
              }}
            >
              <Text style={styles.secondaryButtonText}>Save as new</Text>
            </TouchableOpacity>
          ) : null}
          {selectedTemplateId ? (
            <TouchableOpacity style={styles.dangerButton} onPress={deleteTemplate}>
              <Text style={styles.dangerButtonText}>Delete template</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Subject</Text>
        <TextInput
          style={styles.input}
          value={content.subject}
          onChangeText={(subject) => updateContent({ subject })}
          placeholder="Subject"
        />
        <Text style={styles.sectionLabel}>Message</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={content.textBody}
          onChangeText={(textBody) => updateContent({ textBody })}
          placeholder="Write the announcement"
          multiline
        />
        <Text style={styles.sectionLabel}>Post</Text>
        <TextInput
          style={styles.input}
          value={content.postTitle}
          onChangeText={(postTitle) => updateContent({ postTitle })}
          placeholder="Post title"
        />
        <TextInput
          style={[styles.input, styles.inputMultiline, styles.fieldGap]}
          value={content.postBody}
          onChangeText={(postBody) => updateContent({ postBody })}
          placeholder="Post"
          multiline
        />
        <Text style={styles.sectionLabel}>Link</Text>
        <TextInput
          style={styles.input}
          value={content.linkLabel}
          onChangeText={(linkLabel) => updateContent({ linkLabel })}
          placeholder="Link label"
        />
        <TextInput
          style={[styles.input, styles.fieldGap]}
          value={content.linkUrl}
          onChangeText={(linkUrl) => updateContent({ linkUrl })}
          placeholder="https://"
          autoCapitalize="none"
        />

        <Text style={styles.sectionLabel}>Who receives it</Text>
        <View style={styles.templateRow}>
          {PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.label}
              style={styles.chip}
              onPress={() => {
                setBoys(preset.boys);
                setGirls(preset.girls);
                setMatchmakers(preset.matchmakers);
              }}
            >
              <Text style={styles.chipText}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.templateRow, styles.fieldGap]}>
          <TouchableOpacity
            style={[styles.chip, boys && styles.chipSelected]}
            onPress={() => setBoys((value) => !value)}
          >
            <Text style={[styles.chipText, boys && styles.chipTextSelected]}>Boys</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, girls && styles.chipSelected]}
            onPress={() => setGirls((value) => !value)}
          >
            <Text style={[styles.chipText, girls && styles.chipTextSelected]}>Girls</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, matchmakers && styles.chipSelected]}
            onPress={() => setMatchmakers((value) => !value)}
          >
            <Text style={[styles.chipText, matchmakers && styles.chipTextSelected]}>
              Matchmakers
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Specific people</Text>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search members"
        />
        {results.map((person) => (
          <TouchableOpacity key={person.id} style={styles.searchResult} onPress={() => addPerson(person)}>
            <Text style={styles.searchResultText}>
              {person.firstName} {person.lastName}
            </Text>
            <Text style={styles.searchResultMeta}>{roleLabel(person.role, person.gender)}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.selectedRow}>
          {people.map((person) => (
            <View key={person.id} style={styles.personChip}>
              <Text style={styles.chipText}>
                {person.firstName} {person.lastName}
              </Text>
              <TouchableOpacity
                onPress={() => setPeople((current) => current.filter((item) => item.id !== person.id))}
                accessibilityLabel={`Remove ${person.firstName}`}
              >
                <Ionicons name="close" size={16} color="#1293DA" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={requestSend} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Send email</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Recent sends</Text>
        {campaigns.length === 0 ? (
          <Text style={styles.emptyText}>No emails sent yet.</Text>
        ) : (
          campaigns.map((campaign) => (
            <TouchableOpacity
              key={campaign.id}
              style={styles.campaignCard}
              onPress={() => openCampaign(campaign.id)}
            >
              <Text style={styles.campaignSubject}>{campaign.subject}</Text>
              <Text style={styles.campaignMeta}>
                {statusLabel(campaign.status)} · {campaign.sentCount} sent · {campaign.failedCount} failed
              </Text>
              {openCampaignId === campaign.id
                ? failures.map((failure, index) => (
                    <Text key={`${failure.displayName}-${index}`} style={styles.failureText}>
                      {failure.displayName}: {failure.error || failure.status}
                    </Text>
                  ))
                : null}
              {openCampaignId === campaign.id && campaign.failedCount > 0 ? (
                <TouchableOpacity style={styles.secondaryButton} onPress={() => retryCampaign(campaign.id)}>
                  <Text style={styles.secondaryButtonText}>Retry failed</Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={showNameModal} transparent animationType="fade" onRequestClose={() => setShowNameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Template name</Text>
            <TextInput
              style={styles.input}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowNameModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveTemplate}>
                <Text style={styles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={showConfirm}
        title="Send email"
        message={confirmMessage}
        confirmText="Send email"
        onConfirm={confirmSend}
        onCancel={() => setShowConfirm(false)}
        loading={busy}
        iconName="mail"
        iconColor="#1293DA"
      />
      <InfoModal
        visible={info.visible}
        title={info.title}
        message={info.message}
        onClose={() => setInfo((current) => ({ ...current, visible: false }))}
      />
    </SafeAreaView>
  );
}
