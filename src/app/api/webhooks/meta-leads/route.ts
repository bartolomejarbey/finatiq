import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

// GET: Meta webhook verification
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "finadvisor_verify_token";

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST: Receive lead from Meta Lead Ads
export async function POST(request: Request) {
  const body = await request.text();

  // Verify webhook signature — REQUIRE signature when app secret is configured
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 403 });
  }
  const expectedSignature = "sha256=" + crypto.createHmac("sha256", appSecret).update(body).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const data = JSON.parse(body);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const entries = data?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        if (change.field !== "leadgen") continue;
        const leadData = change.value;
        const adId = leadData?.ad_id;
        const formId = leadData?.form_id;
        const leadgenId = leadData?.leadgen_id;
        const pageId = leadData?.page_id;

        // Extract lead field data
        const fieldData = leadData?.field_data || [];
        const getName = (key: string) => fieldData.find((f: { name: string; values: string[] }) => f.name === key)?.values?.[0] || "";
        const contactName = getName("full_name") || `${getName("first_name")} ${getName("last_name")}`.trim() || "Meta Lead";
        const email = getName("email");
        const phone = getName("phone_number") || getName("phone");

        // Find advisor by meta_ad_account_id or page_id
        const { data: advisor } = await supabaseAdmin
          .from("advisors")
          .select("id")
          .or(`meta_ad_account_id.eq.${pageId},meta_ad_account_id.eq.${entry.id}`)
          .limit(1)
          .single();

        if (!advisor) {
          // If no advisor found, try first advisor as fallback (for testing)
          const { data: fallback } = await supabaseAdmin
            .from("advisors")
            .select("id")
            .limit(1)
            .single();
          if (!fallback) continue;
          Object.assign(advisor || {}, fallback);
        }

        const advisorId = advisor?.id;
        if (!advisorId) continue;

        // Create client
        const nameParts = contactName.split(" ");
        const firstName = nameParts[0] || "Lead";
        const lastName = nameParts.slice(1).join(" ") || "Meta";

        const { data: newClient } = await supabaseAdmin
          .from("clients")
          .insert({
            advisor_id: advisorId,
            first_name: firstName,
            last_name: lastName,
            email: email || null,
            phone: phone || null,
          })
          .select("id")
          .single();

        // Get first pipeline stage
        const { data: firstStage } = await supabaseAdmin
          .from("pipeline_stages")
          .select("id")
          .eq("advisor_id", advisorId)
          .order("position")
          .limit(1)
          .single();

        if (firstStage) {
          // Create deal
          await supabaseAdmin.from("deals").insert({
            advisor_id: advisorId,
            title: `Meta Lead: ${contactName}`,
            contact_name: contactName,
            contact_email: email || null,
            contact_phone: phone || null,
            stage_id: firstStage.id,
            source: "meta",
            client_id: newClient?.id || null,
            meta_lead_id: leadgenId,
            meta_ad_id: adId,
            meta_campaign_id: formId,
          });
        }

        // Create notification for advisor
        if (newClient) {
          await supabaseAdmin.from("client_notifications").insert({
            client_id: newClient.id,
            advisor_id: advisorId,
            type: "info",
            title: `Nový lead z Meta Ads: ${contactName}`,
            body: `Email: ${email || "—"}, Tel: ${phone || "—"}`,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Meta webhook error:", err);
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }
}
