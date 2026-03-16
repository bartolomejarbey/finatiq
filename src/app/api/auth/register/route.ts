import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import { welcomeAdvisor, verificationCode as verificationCodeTemplate } from "@/lib/email/templates";

const DEFAULT_STAGES = [
  { name: "Nový lead", position: 0, color: "#6366F1" },
  { name: "Kontaktován", position: 1, color: "#3B82F6" },
  { name: "Schůzka", position: 2, color: "#F59E0B" },
  { name: "Nabídka", position: 3, color: "#10B981" },
  { name: "Uzavřeno - výhra", position: 4, color: "#22C55E" },
  { name: "Uzavřeno - prohra", position: 5, color: "#EF4444" },
];

const DEFAULT_TAGS = [
  { name: "Hypotéka", color: "#3B82F6" },
  { name: "Investice", color: "#22C55E" },
  { name: "Pojistka", color: "#8B5CF6" },
  { name: "Refinancování", color: "#F97316" },
  { name: "Prioritní", color: "#EF4444" },
];

const DEFAULT_TEMPLATES = [
  {
    name: "Úvodní kontakt",
    subject: "Úvodní konzultace - {firma_poradce}",
    body: "Dobrý den {jmeno_klienta},\n\nděkuji za Váš zájem o finanční poradenství. Rád bych si s Vámi domluvil úvodní bezplatnou konzultaci, kde probereme Vaše potřeby a možnosti.\n\nMůžeme se spojit na telefonním čísle {telefon_poradce} nebo odpovědět na tento email.\n\nS pozdravem,\n{jmeno_poradce}\n{firma_poradce}",
    is_default: true,
  },
  {
    name: "Nabídka",
    subject: "Nabídka - {nazev_dealu}",
    body: "Dobrý den {jmeno_klienta},\n\nna základě naší schůzky Vám posílám nabídku týkající se {nazev_dealu} v hodnotě {hodnota_dealu}.\n\nV příloze najdete podrobné informace. Pokud budete mít jakékoliv dotazy, neváhejte se ozvat.\n\nS pozdravem,\n{jmeno_poradce}\n{firma_poradce}",
    is_default: true,
  },
  {
    name: "Follow-up",
    subject: "Navázání na naši komunikaci",
    body: "Dobrý den {jmeno_klienta},\n\nchtěl bych navázat na naši předchozí komunikaci ohledně {nazev_dealu}. Máte nějaké nové otázky nebo se chcete posunout dál?\n\nRád Vám pomohu s dalšími kroky.\n\nS pozdravem,\n{jmeno_poradce}\n{firma_poradce}",
    is_default: true,
  },
  {
    name: "Poděkování",
    subject: "Děkujeme za Vaši důvěru",
    body: "Dobrý den {jmeno_klienta},\n\nděkuji za Vaši důvěru a těším se na další spolupráci. Pokud budete cokoli potřebovat, jsem Vám k dispozici.\n\nS pozdravem,\n{jmeno_poradce}\n{firma_poradce}",
    is_default: true,
  },
  {
    name: "Připomínka",
    subject: "Připomínka - {nazev_dealu}",
    body: "Dobrý den {jmeno_klienta},\n\nrád bych Vám připomněl naši domluvenou schůzku/termín ohledně {nazev_dealu}.\n\nPokud potřebujete termín změnit, dejte mi prosím vědět.\n\nS pozdravem,\n{jmeno_poradce}\n{firma_poradce}",
    is_default: true,
  },
];

export async function POST(request: Request) {
  const {
    email,
    password,
    companyName,
    ico,
    dic,
    billingStreet,
    billingCity,
    billingZip,
    billingEmail,
    phone,
    selectedPlanId,
  } = await request.json();

  if (!email || !password || !companyName) {
    return NextResponse.json(
      { error: "Vyplňte všechna pole." },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Create auth user (email_confirm: true = skip Supabase email verification)
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  // 2. Create advisor record with billing info + trial
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  // Check if selected plan is free (price=0) and load features
  let isFree = false;
  let planFeatures: Record<string, boolean> | null = null;
  if (selectedPlanId) {
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("features, price_monthly")
      .eq("id", selectedPlanId)
      .single();
    if (plan?.price_monthly === 0) isFree = true;
    if (plan?.features && typeof plan.features === "object") {
      planFeatures = plan.features as Record<string, boolean>;
    }
  }

  const advisorData: Record<string, unknown> = {
    user_id: userId,
    company_name: companyName,
    subscription_status: isFree ? "active" : "trial",
  };

  // Only set trial dates for paid plans
  if (!isFree) {
    advisorData.trial_started_at = new Date().toISOString();
    advisorData.trial_ends_at = trialEnds.toISOString();
  }

  if (ico) advisorData.ico = ico;
  if (dic) advisorData.dic = dic;
  if (billingStreet) advisorData.billing_street = billingStreet;
  if (billingCity) advisorData.billing_city = billingCity;
  if (billingZip) advisorData.billing_zip = billingZip;
  if (billingEmail) advisorData.billing_email = billingEmail;
  if (phone) advisorData.phone = phone;
  if (selectedPlanId) {
    advisorData.selected_plan_id = selectedPlanId;
    if (planFeatures) {
      const modules: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(planFeatures)) {
        modules[key] = !!val;
      }
      advisorData.enabled_modules = modules;
    }
  }

  const { data: advisor, error: advisorError } = await supabaseAdmin
    .from("advisors")
    .insert(advisorData)
    .select("id")
    .single();

  if (advisorError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "Nepodařilo se vytvořit účet poradce." },
      { status: 500 }
    );
  }

  // 3. Create default pipeline stages
  await supabaseAdmin
    .from("pipeline_stages")
    .insert(DEFAULT_STAGES.map((s) => ({ ...s, advisor_id: advisor.id })));

  // 4. Create default tags
  await supabaseAdmin
    .from("deal_tags")
    .insert(DEFAULT_TAGS.map((t) => ({ ...t, advisor_id: advisor.id })));

  // 5. Create default email templates
  await supabaseAdmin
    .from("email_templates")
    .insert(
      DEFAULT_TEMPLATES.map((t) => ({
        ...t,
        advisor_id: advisor.id,
        variables: [
          "jmeno_klienta",
          "prijmeni_klienta",
          "nazev_dealu",
          "hodnota_dealu",
          "jmeno_poradce",
          "firma_poradce",
          "telefon_poradce",
        ],
      }))
    );

  // 6. Create default automations
  await supabaseAdmin.from("automations").insert([
    {
      advisor_id: advisor.id,
      name: "Schůzka → vytvořit aktivitu",
      description: "Automaticky vytvoří aktivitu typu schůzka při přesunu dealu do fáze Schůzka",
      trigger_type: "stage_change",
      trigger_config: { stage_name: "schůzka" },
      action_type: "create_activity",
      action_config: { activity_type: "meeting", note: "Naplánovaná schůzka s klientem" },
      is_system: true,
    },
    {
      advisor_id: advisor.id,
      name: "Výhra → připomínka follow-up",
      description: "Po výhře dealu vytvoří připomínku na follow-up za 7 dní",
      trigger_type: "deal_won",
      trigger_config: {},
      action_type: "create_reminder",
      action_config: { title: "Follow-up po uzavření dealu", days_offset: "7" },
      is_system: true,
    },
    {
      advisor_id: advisor.id,
      name: "Prohra → připomínka re-engage",
      description: "Po prohře dealu vytvoří připomínku na re-engage za 30 dní",
      trigger_type: "deal_lost",
      trigger_config: {},
      action_type: "create_reminder",
      action_config: { title: "Re-engage po prohraném dealu", days_offset: "30" },
      is_system: true,
    },
    {
      advisor_id: advisor.id,
      name: "Nový deal → notifikace",
      description: "Notifikace při vytvoření nového dealu",
      trigger_type: "deal_created",
      trigger_config: {},
      action_type: "notify",
      action_config: { message: "Nový deal byl vytvořen" },
      is_system: true,
    },
  ]);

  // 7. Generate verification code and send via Resend
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await supabaseAdmin.from("verification_codes").insert({
    user_id: userId,
    code,
    type: "email",
    expires_at: expiresAt.toISOString(),
  });

  // Send verification code email
  const codeEmail = verificationCodeTemplate(companyName, code);
  await sendEmail({ to: email, subject: codeEmail.subject, html: codeEmail.html });

  // Send welcome email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.finatiq.cz";
  const welcome = welcomeAdvisor(companyName, `${appUrl}/login`);
  await sendEmail({ to: email, subject: welcome.subject, html: welcome.html });

  return NextResponse.json({ userId });
}
