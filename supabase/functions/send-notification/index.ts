import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://app.zivugmishamayim.com/";
const FROM_ADDRESS = "Zivug Mishamayim <matches@zivugmishamayim.com>";

const MATCH_EMAIL_SUBJECTS: Record<string, string> = {
  match_accepted: "Both sides said yes",
  suggestion_both_accepted: "Both sides said yes",
  suggestion_declined: "A match was declined",
  suggestion_other_side_yes: "A match suggestion is waiting",
  intro_request_from_matchmaker: "A match suggestion is waiting",
  intro_both_accepted: "Both sides said yes",
  intro_declined: "A match was declined",
  matchmaker_request: "You have a matchmaking request",
  matchmaker_responded: "A match was declined",
  matchmaker_selected: "You were asked to make a match",
  info_request: "Someone asked you for information",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shouldSendMatchEmail(
  type: string,
  data: Record<string, unknown> | null,
): boolean {
  if (type === "matchmaker_selected") {
    const purpose = data?.purpose;
    return purpose == null || purpose === "facilitator_chosen";
  }
  if (type === "matchmaker_responded") {
    return data?.response === "rejected";
  }
  return Object.prototype.hasOwnProperty.call(MATCH_EMAIL_SUBJECTS, type);
}

async function sendMatchEmail(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  title: string,
  body: string,
  subject: string,
): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not set — skipping match email");
    return;
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("notify_match_email, first_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("Error loading match email preference:", profileError);
    return;
  }

  if (profile?.notify_match_email === false) return;

  const { data: authData, error: authError } = await adminClient.auth.admin.getUserById(userId);
  if (authError || !authData?.user?.email) {
    console.error("Error loading auth email for match notification:", authError);
    return;
  }

  const firstName = profile.first_name?.trim() || "there";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #222; max-width: 560px; margin: 0 auto;">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p><strong>${escapeHtml(title)}</strong></p>
      <p>${escapeHtml(body)}</p>
      <p style="margin: 28px 0;">
        <a href="${APP_URL}" style="background: #1293DA; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; display: inline-block; font-weight: 600;">
          Open Zivug Mishamayim
        </a>
      </p>
      <p style="color: #888; font-size: 13px;">You can turn off these emails anytime in Settings.</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [authData.user.email],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Resend match email failed:", response.status, details);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, title, body, data } = await req.json();
    if (!userId || !title || !body) {
      return new Response(JSON.stringify({ error: "userId, title, and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { error: notifError } = await adminClient.from("notifications").insert({
      user_id: userId,
      title,
      body,
      data: data || {},
      read: false,
    });
    if (notifError) console.error("Error saving notification record:", notifError);

    const notificationType = typeof data?.type === "string" ? data.type : "";
    const notificationData =
      data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    if (shouldSendMatchEmail(notificationType, notificationData)) {
      try {
        await sendMatchEmail(
          adminClient,
          userId,
          title,
          body,
          MATCH_EMAIL_SUBJECTS[notificationType] ?? title,
        );
      } catch (emailError) {
        console.error("Error sending match email:", emailError);
      }
    }

    const { count: unreadCount } = await adminClient
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    const { data: tokens, error: tokensError } = await adminClient
      .from("push_tokens")
      .select("token")
      .eq("user_id", userId);

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError);
      return new Response(JSON.stringify({ error: "Failed to fetch push tokens" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Notification saved, no push tokens found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const messages = tokens.map(({ token }) => ({
      to: token,
      sound: "default",
      title,
      body,
      data: data || {},
      badge: unreadCount ?? 1,
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Expo push notification error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send push notification", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-notification:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
