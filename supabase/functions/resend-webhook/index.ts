import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Webhook } from "npm:svix@1.40.0";

interface ResendEvent {
  type?: string;
  data?: {
    email_id?: string;
    bounce?: { message?: string };
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret is not configured", { status: 503 });
  }

  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let event: ResendEvent;
  try {
    event = new Webhook(secret).verify(payload, headers) as ResendEvent;
  } catch (error) {
    console.error("Invalid Resend webhook signature:", error);
    return new Response("Invalid signature", { status: 401 });
  }

  const emailId = event.data?.email_id;
  const failed = event.type === "email.bounced" || event.type === "email.complained";
  if (!emailId || !failed) {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const reason =
    event.type === "email.complained"
      ? "The recipient marked this email as spam."
      : event.data?.bounce?.message || "The email bounced.";

  const { data: recipient } = await adminClient
    .from("email_campaign_recipients")
    .update({ status: "bounced", error: reason })
    .eq("resend_id", emailId)
    .select("campaign_id")
    .maybeSingle();

  if (recipient?.campaign_id) {
    const { data: rows } = await adminClient
      .from("email_campaign_recipients")
      .select("status")
      .eq("campaign_id", recipient.campaign_id);
    const sentCount = (rows ?? []).filter((row) => row.status === "sent").length;
    const failedCount = (rows ?? []).filter(
      (row) => row.status === "failed" || row.status === "bounced",
    ).length;
    await adminClient
      .from("email_campaigns")
      .update({
        sent_count: sentCount,
        failed_count: failedCount,
        status: sentCount > 0 ? "partial" : "failed",
      })
      .eq("id", recipient.campaign_id);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
