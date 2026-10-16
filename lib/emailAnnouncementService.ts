import { supabase, supabaseUrl } from "./supabase";

export interface EmailContent {
  subject: string;
  textBody: string;
  postTitle: string;
  postBody: string;
  linkUrl: string;
  linkLabel: string;
}

export interface EmailAudience {
  boys: boolean;
  girls: boolean;
  matchmakers: boolean;
  profileIds: string[];
}

export interface EmailTemplate extends EmailContent {
  id: string;
  name: string;
  updatedAt: string;
}

export interface MemberSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  gender: string;
}

export interface EmailCampaignSummary {
  id: string;
  subject: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  skippedNoEmail: number;
  createdAt: string;
}

export interface EmailFailure {
  displayName: string;
  status: string;
  error: string | null;
}

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface TemplateRow {
  id: string;
  name: string;
  subject: string;
  text_body: string;
  post_title: string;
  post_body: string;
  link_url: string;
  link_label: string;
  updated_at: string;
}

interface CampaignRow {
  id: string;
  subject: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  skipped_no_email: number;
  created_at: string;
}

function mapTemplate(row: TemplateRow): EmailTemplate {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject ?? "",
    textBody: row.text_body ?? "",
    postTitle: row.post_title ?? "",
    postBody: row.post_body ?? "",
    linkUrl: row.link_url ?? "",
    linkLabel: row.link_label ?? "",
    updatedAt: row.updated_at,
  };
}

function mapCampaign(row: CampaignRow): EmailCampaignSummary {
  return {
    id: row.id,
    subject: row.subject,
    status: row.status,
    recipientCount: row.recipient_count,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    skippedNoEmail: row.skipped_no_email,
    createdAt: row.created_at,
  };
}

async function callFunction<T>(body: Record<string, unknown>): Promise<ServiceResult<T>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const response = await fetch(`${supabaseUrl}/functions/v1/send-announcement`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) return { success: false, error: payload.error || "Request failed" };
  return { success: true, data: payload };
}

function contentPayload(content: EmailContent): Record<string, string> {
  return {
    subject: content.subject,
    textBody: content.textBody,
    postTitle: content.postTitle,
    postBody: content.postBody,
    linkUrl: content.linkUrl,
    linkLabel: content.linkLabel,
  };
}

class EmailAnnouncementService {
  async searchMembers(query: string): Promise<ServiceResult<MemberSearchResult[]>> {
    const result = await callFunction<{ members: MemberSearchResult[] }>({
      action: "search_members",
      query,
    });
    if (!result.success || !result.data) return { success: false, error: result.error };
    return { success: true, data: result.data.members };
  }

  async listTemplates(): Promise<ServiceResult<EmailTemplate[]>> {
    const result = await callFunction<{ templates: TemplateRow[] }>({ action: "list_templates" });
    if (!result.success || !result.data) return { success: false, error: result.error };
    return { success: true, data: result.data.templates.map(mapTemplate) };
  }

  async saveTemplate(
    name: string,
    content: EmailContent,
    id?: string,
  ): Promise<ServiceResult<{ id: string }>> {
    return callFunction<{ id: string }>({
      action: "save_template",
      id,
      name,
      ...contentPayload(content),
    });
  }

  async deleteTemplate(id: string): Promise<ServiceResult<{ success: boolean }>> {
    return callFunction<{ success: boolean }>({ action: "delete_template", id });
  }

  async preview(content: EmailContent, audience: EmailAudience): Promise<ServiceResult<{ recipientCount: number; skippedNoEmail: number }>> {
    return callFunction<{ recipientCount: number; skippedNoEmail: number }>({
      action: "preview",
      ...contentPayload(content),
      ...audience,
    });
  }

  async send(content: EmailContent, audience: EmailAudience): Promise<ServiceResult<{ campaignId: string; recipientCount: number; skippedNoEmail: number }>> {
    return callFunction<{ campaignId: string; recipientCount: number; skippedNoEmail: number }>({
      action: "send",
      ...contentPayload(content),
      ...audience,
    });
  }

  async listCampaigns(): Promise<ServiceResult<EmailCampaignSummary[]>> {
    const result = await callFunction<{ campaigns: CampaignRow[] }>({ action: "list_campaigns" });
    if (!result.success || !result.data) return { success: false, error: result.error };
    return { success: true, data: result.data.campaigns.map(mapCampaign) };
  }

  async getCampaign(campaignId: string): Promise<ServiceResult<{ campaign: EmailCampaignSummary; failures: EmailFailure[] }>> {
    const result = await callFunction<{
      campaign: CampaignRow;
      failures: { display_name: string; status: string; error: string | null }[];
    }>({ action: "campaign", campaignId });
    if (!result.success || !result.data) return { success: false, error: result.error };
    return {
      success: true,
      data: {
        campaign: mapCampaign(result.data.campaign),
        failures: result.data.failures.map((failure) => ({
          displayName: failure.display_name,
          status: failure.status,
          error: failure.error,
        })),
      },
    };
  }

  async retry(campaignId: string): Promise<ServiceResult<{ campaignId: string }>> {
    return callFunction<{ campaignId: string }>({ action: "retry", campaignId });
  }
}

export const emailAnnouncementService = new EmailAnnouncementService();
