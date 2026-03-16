const BRAND = {
  bg: "#060d1a",
  card: "#0f2035",
  text: "#f0f4f8",
  muted: "rgba(240,244,248,0.4)",
  accent: "#22d3ee",
  font: "'DM Sans', Arial, sans-serif",
};

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:${BRAND.font};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="padding-bottom:24px;text-align:center;">
<span style="font-family:Oswald,Arial,sans-serif;font-size:20px;font-weight:700;color:${BRAND.accent};text-transform:uppercase;letter-spacing:3px;">FINATIQ</span>
</td></tr>
<tr><td style="background:${BRAND.card};border-radius:12px;padding:32px;">
<h1 style="margin:0 0 16px;font-family:Oswald,Arial,sans-serif;font-size:22px;color:${BRAND.text};font-weight:600;">${title}</h1>
${body}
</td></tr>
<tr><td style="padding-top:24px;text-align:center;">
<p style="margin:0;font-size:12px;color:${BRAND.muted};">\u00A9 2025 Finatiq | Harotas s.r.o.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${BRAND.text};">${text}</p>`;
}

function btn(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td>
<a href="${url}" style="display:inline-block;background:${BRAND.accent};color:${BRAND.bg};padding:14px 28px;font-family:Oswald,Arial,sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:2px;text-decoration:none;border-radius:4px;">${text}</a>
</td></tr></table>`;
}

function muted(text: string): string {
  return `<p style="margin:0 0 8px;font-size:13px;color:${BRAND.muted};">${text}</p>`;
}

// --- Templates ---

export function verificationCode(name: string, code: string): { subject: string; html: string } {
  return {
    subject: "Váš ověřovací kód Finatiq",
    html: layout("Váš ověřovací kód", [
      p(`Dobrý den, ${name},`),
      p("Pro dokončení registrace zadejte tento ověřovací kód:"),
      `<div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;font-family:'JetBrains Mono',Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:${BRAND.accent};background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.2);border-radius:8px;padding:16px 32px;">${code}</span>
      </div>`,
      muted("Kód je platný 10 minut. Pokud jste se neregistrovali, tento email ignorujte."),
    ].join("")),
  };
}

export function passwordReset(name: string, resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Obnovení hesla — Finatiq",
    html: layout("Obnovení hesla", [
      p(`Dobrý den, ${name},`),
      p("Obdrželi jsme žádost o obnovení hesla k vašemu účtu Finatiq."),
      btn("Obnovit heslo", resetUrl),
      muted("Odkaz je platný 1 hodinu. Pokud jste o obnovení nežádali, tento email ignorujte."),
    ].join("")),
  };
}

export function welcomeAdvisor(name: string, loginUrl: string): { subject: string; html: string } {
  return {
    subject: "Vítejte ve Finatiq!",
    html: layout("Vítejte ve Finatiq!", [
      p(`Dobrý den, ${name},`),
      p("Váš účet byl úspěšně vytvořen. Máte 14 dní zdarma na vyzkoušení všech funkcí platformy."),
      btn("Přihlásit se", loginUrl),
      muted("Pokud jste se neregistrovali, tento email ignorujte."),
    ].join("")),
  };
}

export function emailVerification(name: string, confirmUrl: string): { subject: string; html: string } {
  return {
    subject: "Ověřte svůj email",
    html: layout("Ověřte svůj email", [
      p(`Dobrý den, ${name},`),
      p("Pro dokončení registrace prosím potvrďte svou emailovou adresu."),
      btn("Ověřit email", confirmUrl),
      muted("Odkaz je platný 24 hodin."),
    ].join("")),
  };
}

export function inviteClient(
  advisorName: string,
  clientName: string,
  loginUrl: string,
  password: string
): { subject: string; html: string } {
  return {
    subject: `${advisorName} vás zve do klientského portálu`,
    html: layout("Pozvánka do klientského portálu", [
      p(`Dobrý den, ${clientName},`),
      p(`Váš finanční poradce ${advisorName} vám vytvořil přístup do klientského portálu Finatiq.`),
      p(`Vaše dočasné heslo: <strong style="color:${BRAND.accent};">${password}</strong>`),
      btn("Přihlásit se do portálu", loginUrl),
      muted("Po prvním přihlášení si prosím změňte heslo."),
    ].join("")),
  };
}

export function trialExpiring(name: string, daysLeft: number, activateUrl: string): { subject: string; html: string } {
  const dayWord = daysLeft === 1 ? "den" : daysLeft < 5 ? "dny" : "dní";
  return {
    subject: `Zkušební doba končí za ${daysLeft} ${dayWord}`,
    html: layout("Zkušební doba brzy končí", [
      p(`Dobrý den, ${name},`),
      p(`Vaše zkušební období Finatiq končí za <strong style="color:${BRAND.accent};">${daysLeft} ${dayWord}</strong>.`),
      p("Aktivujte předplatné a nepřijdete o svá data a nastavení."),
      btn("Aktivovat předplatné", activateUrl),
    ].join("")),
  };
}

export function trialExpired(name: string, activateUrl: string): { subject: string; html: string } {
  return {
    subject: "Zkušební doba vypršela",
    html: layout("Zkušební doba vypršela", [
      p(`Dobrý den, ${name},`),
      p("Vaše zkušební období Finatiq skončilo. Váš účet je nyní omezený."),
      p("Aktivujte předplatné pro obnovení plného přístupu. Vaše data zůstávají v bezpečí."),
      btn("Aktivovat předplatné", activateUrl),
    ].join("")),
  };
}

export function paymentReminder(
  clientName: string,
  amount: number,
  dueDate: string
): { subject: string; html: string } {
  return {
    subject: `Připomínka platby - ${amount.toLocaleString("cs-CZ")} Kč`,
    html: layout("Připomínka platby", [
      p(`Dobrý den, ${clientName},`),
      p(`Připomínáme Vám blížící se platbu ve výši <strong style="color:${BRAND.accent};">${amount.toLocaleString("cs-CZ")} Kč</strong> se splatností ${dueDate}.`),
      p("V případě dotazů kontaktujte svého poradce."),
    ].join("")),
  };
}

export function newLeadAlert(advisorName: string, leadName: string, source: string): { subject: string; html: string } {
  return {
    subject: `Nový lead: ${leadName}`,
    html: layout("Nový lead", [
      p(`Dobrý den, ${advisorName},`),
      p(`Máte nový lead: <strong>${leadName}</strong> ze zdroje <strong>${source}</strong>.`),
    ].join("")),
  };
}

export function newContractAlert(advisorName: string, clientName: string, contractType: string): { subject: string; html: string } {
  return {
    subject: `Nová smlouva od klienta ${clientName}`,
    html: layout("Nová smlouva", [
      p(`Dobrý den, ${advisorName},`),
      p(`Klient ${clientName} nahrál novou smlouvu typu <strong>${contractType}</strong>.`),
    ].join("")),
  };
}

export function dailySummary(advisorName: string, stats: { leads: number; deals: number; reminders: number }): { subject: string; html: string } {
  return {
    subject: "Denní souhrn",
    html: layout("Denní souhrn", [
      p(`Dobrý den, ${advisorName},`),
      p("Zde je váš denní souhrn:"),
      `<table style="margin:0 0 16px;font-size:14px;color:${BRAND.text};">
        <tr><td style="padding:4px 12px 4px 0;">Nové leady:</td><td style="font-weight:600;color:${BRAND.accent};">${stats.leads}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;">Aktivní dealy:</td><td style="font-weight:600;color:${BRAND.accent};">${stats.deals}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;">Připomínky dnes:</td><td style="font-weight:600;color:${BRAND.accent};">${stats.reminders}</td></tr>
      </table>`,
    ].join("")),
  };
}

export function invoiceReminder(advisorName: string, amount: number, dueDate: string): { subject: string; html: string } {
  return {
    subject: `Připomínka faktury - ${amount.toLocaleString("cs-CZ")} Kč`,
    html: layout("Připomínka faktury", [
      p(`Dobrý den, ${advisorName},`),
      p(`Připomínáme nezaplacenou fakturu ve výši <strong style="color:${BRAND.accent};">${amount.toLocaleString("cs-CZ")} Kč</strong> se splatností <strong>${dueDate}</strong>.`),
      p("Prosím uhraďte co nejdříve."),
    ].join("")),
  };
}

export function automationNotification(
  advisorName: string,
  eventType: string,
  details: string
): { subject: string; html: string } {
  return {
    subject: `Automatická notifikace: ${eventType}`,
    html: layout("Automatická notifikace", [
      p(`Dobrý den, ${advisorName},`),
      p(`Systém zaznamenal událost: <strong>${eventType}</strong>`),
      p(details),
      muted("Toto je automatická notifikace z platformy Finatiq."),
    ].join("")),
  };
}

// --- Invoice templates ---

export function invoiceReady(name: string, amount: number, period: string, dueDate: string): { subject: string; html: string } {
  return {
    subject: `Faktura za ${period} — Finatiq`,
    html: layout("Nová faktura", [
      p(`Dobrý den, ${name},`),
      p(`vaše faktura za období <strong>${period}</strong> byla vystavena.`),
      p(`Částka: <strong style="color:${BRAND.accent};">${amount.toLocaleString("cs-CZ")} Kč</strong>`),
      p(`Splatnost: <strong>${dueDate}</strong>`),
      btn("Zobrazit fakturu", "https://www.finatiq.cz/advisor/nastaveni/fakturace"),
    ].join("")),
  };
}

export function invoiceDueSoon(name: string, amount: number, dueDate: string): { subject: string; html: string } {
  return {
    subject: "Připomínka splatnosti faktury — Finatiq",
    html: layout("Připomínka splatnosti", [
      p(`Dobrý den, ${name},`),
      p(`připomínáme, že vaše faktura ve výši <strong style="color:${BRAND.accent};">${amount.toLocaleString("cs-CZ")} Kč</strong> je splatná <strong>${dueDate}</strong>.`),
      btn("Zobrazit fakturu", "https://www.finatiq.cz/advisor/nastaveni/fakturace"),
    ].join("")),
  };
}

export function invoiceOverdue(name: string, amount: number, dueDate: string): { subject: string; html: string } {
  return {
    subject: "Faktura po splatnosti — Finatiq",
    html: layout("Faktura po splatnosti", [
      p(`Dobrý den, ${name},`),
      p(`vaše faktura ve výši <strong style="color:${BRAND.accent};">${amount.toLocaleString("cs-CZ")} Kč</strong> byla splatná <strong>${dueDate}</strong> a dosud nebyla uhrazena.`),
      p("Prosíme o co nejrychlejší úhradu."),
      btn("Zobrazit fakturu", "https://www.finatiq.cz/advisor/nastaveni/fakturace"),
    ].join("")),
  };
}

export function invoiceSecondReminder(name: string, amount: number): { subject: string; html: string } {
  return {
    subject: "Druhá upomínka — neuhrazená faktura — Finatiq",
    html: layout("Druhá upomínka", [
      p(`Dobrý den, ${name},`),
      p(`vaše faktura ve výši <strong style="color:${BRAND.accent};">${amount.toLocaleString("cs-CZ")} Kč</strong> je stále neuhrazena.`),
      p("Pokud nebude uhrazena do 7 dní, bude váš účet pozastaven."),
      btn("Uhradit nyní", "https://www.finatiq.cz/advisor/nastaveni/fakturace"),
    ].join("")),
  };
}

export function subscriptionSuspended(name: string): { subject: string; html: string } {
  return {
    subject: "Účet pozastaven — neuhrazená faktura — Finatiq",
    html: layout("Účet pozastaven", [
      p(`Dobrý den, ${name},`),
      p("váš účet byl pozastaven z důvodu neuhrazené faktury."),
      p("Pro obnovení přístupu prosíme o úhradu dlužné částky."),
      btn("Zobrazit faktury", "https://www.finatiq.cz/advisor/nastaveni/fakturace"),
    ].join("")),
  };
}

// --- Feature trial templates ---

export function featureTrialExpiring(advisorName: string, featureName: string, daysLeft: number): { subject: string; html: string } {
  const dayWord = daysLeft === 1 ? "den" : daysLeft < 5 ? "dny" : "dní";
  return {
    subject: `Trial funkce "${featureName}" končí za ${daysLeft} ${dayWord} — Finatiq`,
    html: layout("Trial funkce končí", [
      p(`Dobrý den, ${advisorName},`),
      p(`trial funkce <strong style="color:${BRAND.accent};">${featureName}</strong> končí za <strong>${daysLeft} ${dayWord}</strong>.`),
      p("Pro pokračování upgradujte svůj plán."),
      btn("Zobrazit plány", "https://www.finatiq.cz/advisor/predplatne"),
    ].join("")),
  };
}

export function featureTrialExpired(advisorName: string, featureName: string): { subject: string; html: string } {
  return {
    subject: `Trial funkce "${featureName}" skončil — Finatiq`,
    html: layout("Trial funkce skončil", [
      p(`Dobrý den, ${advisorName},`),
      p(`trial funkce <strong style="color:${BRAND.accent};">${featureName}</strong> skončil.`),
      p("Pro obnovení přístupu upgradujte svůj plán."),
      btn("Upgradovat", "https://www.finatiq.cz/advisor/predplatne"),
    ].join("")),
  };
}

// --- Contact form template ---

export function contactForm(name: string, email: string, type: string, message: string): { subject: string; html: string } {
  return {
    subject: `Nový dotaz z Finatiq: ${type}`,
    html: layout("Nový dotaz z webu", [
      p(`<strong>Jméno:</strong> ${name}`),
      p(`<strong>Email:</strong> <a href="mailto:${email}" style="color:${BRAND.accent};">${email}</a>`),
      p(`<strong>Typ dotazu:</strong> ${type}`),
      p(`<strong>Zpráva:</strong>`),
      p(message.replace(/\n/g, "<br>")),
      muted("Tento email byl odeslán z kontaktního formuláře na finatiq.cz."),
    ].join("")),
  };
}

// --- Ticket/DM templates ---

export function newTicketAlert(ticketSubject: string, advisorName: string): { subject: string; html: string } {
  return {
    subject: `Nový tiket: ${ticketSubject} — Finatiq`,
    html: layout("Nový tiket", [
      p("Nový tiket v systému:"),
      p(`<strong style="color:${BRAND.accent};">${ticketSubject}</strong>`),
      p(`Od: ${advisorName}`),
      btn("Zobrazit tiket", "https://www.finatiq.cz/superadmin/tikety"),
    ].join("")),
  };
}

export function ticketReply(advisorName: string, message: string): { subject: string; html: string } {
  return {
    subject: "Nová odpověď na váš tiket — Finatiq",
    html: layout("Nová odpověď na tiket", [
      p(`Dobrý den, ${advisorName},`),
      p("na váš tiket byla přidána odpověď:"),
      p(`<em>"${message.substring(0, 200)}${message.length > 200 ? "..." : ""}"</em>`),
      btn("Zobrazit tiket", "https://www.finatiq.cz/advisor"),
    ].join("")),
  };
}

export function newDirectMessage(advisorName: string, message: string): { subject: string; html: string } {
  return {
    subject: "Nová zpráva od Finatiq týmu",
    html: layout("Nová zpráva", [
      p(`Dobrý den, ${advisorName},`),
      p("máte novou zprávu od Finatiq týmu:"),
      p(`<em>"${message.substring(0, 300)}${message.length > 300 ? "..." : ""}"</em>`),
      btn("Zobrazit zprávy", "https://www.finatiq.cz/advisor"),
    ].join("")),
  };
}
