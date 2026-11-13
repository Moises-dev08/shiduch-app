import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_ADDRESS = "Zivug Mishamayim <matches@zivugmishamayim.com>";
const MAX_SUBJECT = 200;
const MAX_BODY = 8000;
const MAX_URL = 500;
const MAX_IMAGE_URL = 2000;

interface EmailContent {
  subject: string;
  textBody: string;
  postTitle: string;
  postBody: string;
  linkUrl: string;
  linkLabel: string;
  postImageUrl: string;
}

interface AudienceInput {
  boys: boolean;
  girls: boolean;
  matchmakers: boolean;
  profileIds: string[];
}

interface ProfileRow {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  gender: string | null;
}

interface RecipientDraft {
  userId: string;
  profileId: string;
  displayName: string;
  firstName: string;
  email: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function readContent(input: Record<string, unknown>): EmailContent {
  return {
    subject: clip(input.subject, MAX_SUBJECT),
    textBody: clip(input.textBody, MAX_BODY),
    postTitle: clip(input.postTitle, MAX_SUBJECT),
    postBody: clip(input.postBody, MAX_BODY),
    linkUrl: clip(input.linkUrl, MAX_URL),
    linkLabel: clip(input.linkLabel, 80),
    postImageUrl: clip(input.postImageUrl, MAX_IMAGE_URL),
  };
}

function readAudience(input: Record<string, unknown>): AudienceInput {
  const ids = Array.isArray(input.profileIds)
    ? input.profileIds.filter((id): id is string => typeof id === "string").slice(0, 200)
    : [];
  return {
    boys: input.boys === true,
    girls: input.girls === true,
    matchmakers: input.matchmakers === true,
    profileIds: ids,
  };
}

function hasContent(content: EmailContent): boolean {
  return Boolean(
    content.textBody || content.postTitle || content.postBody || content.linkUrl || content.postImageUrl,
  );
}

function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function contentError(content: EmailContent, requireSubject: boolean): string | null {
  if (requireSubject && !content.subject) return "A subject is required.";
  if (!hasContent(content)) return "Add a message, a post, or a link.";
  if (content.linkUrl && !isSafeUrl(content.linkUrl)) {
    return "The link must start with http:// or https://.";
  }
  if (content.postImageUrl && !isSafeUrl(content.postImageUrl)) {
    return "The post picture must be an http or https image.";
  }
  return null;
}

function renderHtml(content: EmailContent, firstName: string): string {
  const name = escapeHtml(firstName || "there");
  const paragraphs = content.textBody
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(block).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");

  const image =
    content.postImageUrl && isSafeUrl(content.postImageUrl)
      ? `<img src="${escapeHtml(content.postImageUrl)}" alt="" width="512" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:0 0 12px;" />`
      : "";

  const post =
    content.postTitle || content.postBody || image
      ? `<div style="margin:0 0 20px;padding:16px;background:#f4f8fc;border-radius:10px;">
          ${image}
          ${content.postTitle ? `<p style="margin:0 0 8px;font-size:18px;font-weight:700;">${escapeHtml(content.postTitle)}</p>` : ""}
          ${content.postBody ? `<p style="margin:0;font-size:16px;line-height:1.5;">${escapeHtml(content.postBody).replace(/\n/g, "<br>")}</p>` : ""}
        </div>`
      : "";

  const label = escapeHtml(content.linkLabel || "Open link");
  const link = content.linkUrl
    ? `<p style="margin:24px 0;">
        <a href="${escapeHtml(content.linkUrl)}" style="background:#1293DA;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600;">${label}</a>
      </p>`
    : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f7fb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;">
            <tr>
              <td style="padding:28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#222222;">
                <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.04em;color:#1293DA;font-weight:700;">Zivug Mishamayim</p>
                <p style="margin:0 0 16px;font-size:16px;">Hi ${name},</p>
                ${paragraphs}
                ${post}
                ${link}
                <p style="margin:24px 0 0;font-size:13px;color:#888888;">You are receiving this from Zivug Mishamayim.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function requireAdmin(
  req: Request,
): Promise<{ adminClient: SupabaseClient; userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Missing authorization header" }, 401);

  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData.user) return jsonResponse({ error: "Unauthorized" }, 401);

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const { data: adminRow } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (!adminRow) return jsonResponse({ error: "Admins only" }, 403);

  return { adminClient, userId: authData.user.id };
}

async function loadEligibleProfiles(adminClient: SupabaseClient): Promise<ProfileRow[]> {
  const { data, error } = await adminClient
    .from("profiles")
    .select("id, user_id, first_name, last_name, role, gender")
    .eq("status", "approved")
    .eq("is_active", true)
    .eq("account_status", "active");
  if (error) throw new Error(error.message);
  return (data ?? []) as ProfileRow[];
}

function matchesAudience(profile: ProfileRow, audience: AudienceInput): boolean {
  const role = (profile.role ?? "").toLowerCase();
  const gender = (profile.gender ?? "").toLowerCase();
  const inGroup =
    (audience.boys && role === "single" && gender === "male") ||
    (audience.girls && role === "single" && gender === "female") ||
    (audience.matchmakers && role === "matchmaker");
  return inGroup || audience.profileIds.includes(profile.id);
}

async function loadAuthEmails(adminClient: SupabaseClient): Promise<Map<string, string>> {
  const emails = new Map<string, string>();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const users = data.users ?? [];
    for (const user of users) {
      if (user.email) emails.set(user.id, user.email);
    }
    if (users.length < 1000) break;
  }
  return emails;
}

async function resolveRecipients(
  adminClient: SupabaseClient,
  audience: AudienceInput,
): Promise<{ recipients: RecipientDraft[]; skippedNoEmail: number }> {
  const profiles = await loadEligibleProfiles(adminClient);
  const chosen = new Map<string, ProfileRow>();
  for (const profile of profiles) {
    if (!profile.user_id || !matchesAudience(profile, audience)) continue;
    if (!chosen.has(profile.user_id)) chosen.set(profile.user_id, profile);
  }

  const emails = await loadAuthEmails(adminClient);
  const recipients: RecipientDraft[] = [];
  let skippedNoEmail = 0;
  for (const profile of chosen.values()) {
    const userId = profile.user_id;
    if (!userId) continue;
    const email = emails.get(userId);
    const displayName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
    if (!email) {
      skippedNoEmail += 1;
      continue;
    }
    recipients.push({
      userId,
      profileId: profile.id,
      displayName: displayName || "Member",
      firstName: profile.first_name?.trim() || "there",
      email,
    });
  }
  return { recipients, skippedNoEmail };
}

async function refreshCampaignCounts(
  adminClient: SupabaseClient,
  campaignId: string,
): Promise<void> {
  const { data } = await adminClient
    .from("email_campaign_recipients")
    .select("status")
    .eq("campaign_id", campaignId);
  const rows = data ?? [];
  const sentCount = rows.filter((row) => row.status === "sent").length;
  const failedCount = rows.filter(
    (row) => row.status === "failed" || row.status === "bounced",
  ).length;
  const pendingCount = rows.filter((row) => row.status === "pending").length;
  let status = "sent";
  if (pendingCount > 0) status = "sending";
  else if (failedCount > 0 && sentCount > 0) status = "partial";
  else if (failedCount > 0 && sentCount === 0) status = "failed";

  await adminClient
    .from("email_campaigns")
    .update({
      sent_count: sentCount,
      failed_count: failedCount,
      status,
      completed_at: pendingCount === 0 ? new Date().toISOString() : null,
    })
    .eq("id", campaignId);
}

async function deliverRecipient(
  adminClient: SupabaseClient,
  apiKey: string,
  content: EmailContent,
  recipientId: string,
  recipient: { email: string; firstName: string },
): Promise<"sent" | "failed" | "rate_limited"> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [recipient.email],
      subject: content.subject,
      html: renderHtml(content, recipient.firstName),
    }),
  });

  if (response.status === 429) {
    await adminClient
      .from("email_campaign_recipients")
      .update({ status: "failed", error: "Sending limit reached. Try again later." })
      .eq("id", recipientId);
    return "rate_limited";
  }

  if (!response.ok) {
    const details = (await response.text()).slice(0, 300);
    await adminClient
      .from("email_campaign_recipients")
      .update({ status: "failed", error: details || "Email could not be sent." })
      .eq("id", recipientId);
    return "failed";
  }

  const payload = (await response.json()) as { id?: string };
  await adminClient
    .from("email_campaign_recipients")
    .update({
      status: "sent",
      resend_id: payload.id ?? null,
      error: null,
      sent_at: new Date().toISOString(),
    })
    .eq("id", recipientId);
  return "sent";
}

async function sendPending(
  adminClient: SupabaseClient,
  campaignId: string,
  content: EmailContent,
  draftsByUserId: Map<string, RecipientDraft>,
): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("Email service is not configured.");

  const { data: pendingRows, error } = await adminClient
    .from("email_campaign_recipients")
    .select("id, user_id")
    .eq("campaign_id", campaignId)
    .in("status", ["pending", "failed"]);
  if (error) throw new Error(error.message);

  let rateLimited = false;
  for (const row of pendingRows ?? []) {
    const draft = draftsByUserId.get(row.user_id as string);
    if (rateLimited || !draft) {
      await adminClient
        .from("email_campaign_recipients")
        .update({
          status: "failed",
          error: rateLimited
            ? "Sending limit reached. Try again later."
            : "No login email for this member.",
        })
        .eq("id", row.id);
      continue;
    }
    const result = await deliverRecipient(adminClient, apiKey, content, row.id as string, draft);
    if (result === "rate_limited") rateLimited = true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await refreshCampaignCounts(adminClient, campaignId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req);
    if (auth instanceof Response) return auth;
    const { adminClient, userId } = auth;
    const body = (await req.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "search_members") {
      const query = clip(body.query, 80).replace(/[%_,.()]/g, "");
      if (query.length < 2) return jsonResponse({ members: [] });
      const pattern = `%${query}%`;
      const { data, error } = await adminClient
        .from("profiles")
        .select("id, first_name, last_name, role, gender")
        .eq("status", "approved")
        .eq("is_active", true)
        .eq("account_status", "active")
        .or(`first_name.ilike.${pattern},last_name.ilike.${pattern}`)
        .limit(20);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({
        members: (data ?? []).map((profile) => ({
          id: profile.id,
          firstName: profile.first_name ?? "",
          lastName: profile.last_name ?? "",
          role: profile.role ?? "",
          gender: profile.gender ?? "",
        })),
      });
    }

    if (action === "list_templates") {
      const { data, error } = await adminClient
        .from("email_templates")
        .select("id, name, subject, text_body, post_title, post_body, link_url, link_label, updated_at")
        .order("updated_at", { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ templates: data ?? [] });
    }

    if (action === "save_template") {
      const name = clip(body.name, 80);
      const content = readContent(body);
      if (!name) return jsonResponse({ error: "A template name is required." }, 400);
      const problem = contentError(content, false);
      if (problem) return jsonResponse({ error: problem }, 400);
      const record = {
        name,
        subject: content.subject,
        text_body: content.textBody,
        post_title: content.postTitle,
        post_body: content.postBody,
        link_url: content.linkUrl,
        link_label: content.linkLabel,
        updated_at: new Date().toISOString(),
      };
      const templateId = typeof body.id === "string" ? body.id : "";
      if (templateId) {
        const { error } = await adminClient.from("email_templates").update(record).eq("id", templateId);
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ id: templateId });
      }
      const { data, error } = await adminClient
        .from("email_templates")
        .insert({ ...record, created_by: userId })
        .select("id")
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ id: data.id });
    }

    if (action === "delete_template") {
      const templateId = typeof body.id === "string" ? body.id : "";
      if (!templateId) return jsonResponse({ error: "Template not found." }, 400);
      const { error } = await adminClient.from("email_templates").delete().eq("id", templateId);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ success: true });
    }

    if (action === "list_campaigns") {
      const { data, error } = await adminClient
        .from("email_campaigns")
        .select("id, subject, status, recipient_count, sent_count, failed_count, skipped_no_email, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ campaigns: data ?? [] });
    }

    if (action === "campaign") {
      const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";
      const { data: campaign, error } = await adminClient
        .from("email_campaigns")
        .select("id, subject, status, recipient_count, sent_count, failed_count, skipped_no_email, created_at")
        .eq("id", campaignId)
        .maybeSingle();
      if (error || !campaign) return jsonResponse({ error: "Email not found." }, 404);
      const { data: failures } = await adminClient
        .from("email_campaign_recipients")
        .select("display_name, status, error")
        .eq("campaign_id", campaignId)
        .in("status", ["failed", "bounced"]);
      return jsonResponse({ campaign, failures: failures ?? [] });
    }

    if (action === "preview" || action === "send" || action === "retry") {
      const audience = readAudience(body);
      const content = readContent(body);
      if (action !== "retry") {
        const problem = contentError(content, action === "send");
        if (problem) return jsonResponse({ error: problem }, 400);
        if (!audience.boys && !audience.girls && !audience.matchmakers && audience.profileIds.length === 0) {
          return jsonResponse({ error: "Choose who should receive this email." }, 400);
        }
      }

      if (action === "preview") {
        const { recipients, skippedNoEmail } = await resolveRecipients(adminClient, audience);
        return jsonResponse({ recipientCount: recipients.length, skippedNoEmail });
      }

      if (!Deno.env.get("RESEND_API_KEY")) {
        return jsonResponse({ error: "Email service is not configured." }, 500);
      }

      if (action === "retry") {
        const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";
        const { data: campaign } = await adminClient
          .from("email_campaigns")
          .select("id, subject, text_body, post_title, post_body, link_url, link_label, audience")
          .eq("id", campaignId)
          .maybeSingle();
        if (!campaign) return jsonResponse({ error: "Email not found." }, 404);
        const savedAudience = (campaign.audience ?? {}) as Record<string, unknown>;
        const { recipients } = await resolveRecipients(adminClient, readAudience(savedAudience));
        const drafts = new Map(recipients.map((recipient) => [recipient.userId, recipient]));
        await adminClient.from("email_campaigns").update({ status: "sending" }).eq("id", campaignId);
        await sendPending(adminClient, campaignId, {
          subject: campaign.subject,
          textBody: campaign.text_body,
          postTitle: campaign.post_title,
          postBody: campaign.post_body,
          linkUrl: campaign.link_url,
          linkLabel: campaign.link_label,
          postImageUrl: clip(savedAudience.postImageUrl, MAX_IMAGE_URL),
        }, drafts);
        return jsonResponse({ campaignId });
      }

      const { recipients, skippedNoEmail } = await resolveRecipients(adminClient, audience);
      if (recipients.length === 0) {
        return jsonResponse({ error: "No selected members have a login email." }, 400);
      }

      const { data: campaign, error: campaignError } = await adminClient
        .from("email_campaigns")
        .insert({
          created_by: userId,
          subject: content.subject,
          text_body: content.textBody,
          post_title: content.postTitle,
          post_body: content.postBody,
          link_url: content.linkUrl,
          link_label: content.linkLabel,
          audience: { ...audience, postImageUrl: content.postImageUrl },
          recipient_count: recipients.length,
          skipped_no_email: skippedNoEmail,
          status: "sending",
        })
        .select("id")
        .single();
      if (campaignError || !campaign) {
        return jsonResponse({ error: campaignError?.message ?? "Could not start the email." }, 500);
      }

      const { error: recipientError } = await adminClient.from("email_campaign_recipients").insert(
        recipients.map((recipient) => ({
          campaign_id: campaign.id,
          user_id: recipient.userId,
          profile_id: recipient.profileId,
          display_name: recipient.displayName,
          status: "pending",
        })),
      );
      if (recipientError) return jsonResponse({ error: recipientError.message }, 500);

      const drafts = new Map(recipients.map((recipient) => [recipient.userId, recipient]));
      await sendPending(adminClient, campaign.id, content, drafts);
      return jsonResponse({
        campaignId: campaign.id,
        recipientCount: recipients.length,
        skippedNoEmail,
      });
    }

    return jsonResponse({ error: "Unknown action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("send-announcement error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
