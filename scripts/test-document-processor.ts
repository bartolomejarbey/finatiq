/**
 * Test script pro document-processor.ts
 *
 * Projde všechny fixtures v test-fixtures/receipts/,
 * zavolá OpenAI Vision API a porovná výsledek s očekávaným statusem.
 *
 * Spuštění: npx tsx scripts/test-document-processor.ts
 *
 * Prerekvizity:
 * - OPENAI_API_KEY v .env.local
 * - Testovací obrázky v test-fixtures/receipts/
 */

import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";

// Load env from .env.local
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL_PRIMARY = process.env.OPENAI_MODEL_PRIMARY || "gpt-4o-mini";
const MODEL_FALLBACK = process.env.OPENAI_MODEL_FALLBACK || "gpt-4o";

const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10.0 },
};

// Expected status per folder
const EXPECTED_STATUS: Record<string, string> = {
  clear: "ok",
  warning: "warning",
  "rejected-blurry": "rejected",
  "rejected-dark": "rejected",
  "rejected-cropped": "rejected",
  "rejected-not-receipt": "rejected",
};

const SYSTEM_PROMPT = `Jsi asistent pro zpracování finančních dokumentů v aplikaci Finatiq. Analyzuj přiložený dokument (účtenka, faktura, výpis, smlouva) a extrahuj strukturovaná data.

KRITICKÁ PRAVIDLA:

1. Dvě pole jsou KRITICKÁ: datum (date) a celková částka (total_amount). Bez nich je dokument NEPOUŽITELNÝ.

2. Pokud NEJSI SI 100% JISTÝ datem NEBO částkou, nastav quality_status = "rejected" a do rejection_reason napiš konkrétní kód. NIKDY nehádej. Raději odmítni, než abys vrátil vymyšlená data. Halucinované číslo v účetnictví klienta je HORŠÍ než žádné číslo.

3. Pokud vidíš jasně datum i částku, ale ostatní pole jsou nejistá (jméno obchodu, IČO, položky), nastav quality_status = "warning" a do warning_fields vypiš, která pole jsou nejistá. Dokument se uloží, ale poradce si data zkontroluje.

4. Pokud vidíš vše jasně a jsi si jistý, nastav quality_status = "ok".

5. Do retry_guidance_cs napiš KONKRÉTNÍ instrukci pro uživatele v češtině, tykáním, přátelsky. NE generické "špatná kvalita". Příklady dobrých instrukcí:
   - "Účtenka je rozmazaná, částku nelze přečíst. Vyfoť ji prosím znovu z menší vzdálenosti a drž mobil pevně."
   - "Horní část účtenky chybí, nevidím datum. Vyfoť prosím celou účtenku od začátku do konce."
   - "Foto je moc tmavé. Zkus to u okna nebo s bleskem — text musí být jasně viditelný."
   - "Na účtence je odlesk, který zakrývá částku. Nakloň ji mírně jinak nebo vyfoť ze strany, aby tam nebyl lesk."
   - "Účtenka je pokrčená a text se láme. Narovnej ji na rovnou plochu a vyfoť znovu."
   - "Foto má nízké rozlišení, text je nečitelný. Vyfoť prosím přímo z aplikace, ne screenshot screenshotu."
   - "Toto nevypadá jako účtenka ani faktura. Zkontroluj prosím, že jsi vybral/a správnou fotku."

6. Buď VELMI PŘÍSNÝ. Lepší odmítnout 20 % fotek a mít 100% spolehlivá data, než přijmout všechno a halucinovat částky.

7. Pro položky (items) — pokud jsou nečitelné, vrať null. Není to kritické pole a neodmítej kvůli tomu dokument.

8. Data v češtině: názvy obchodů nech tak jak jsou (např. "Albert", "Kaufland"), částky jako čísla (ne string), datum ve formátu ISO 8601 (YYYY-MM-DD).

9. Hodnocení confidence:
   - "high" = dokument je čitelný, všechna pole jasně viditelná, jsi si jistý extrakcí
   - "medium" = některá pole jsou nejistá nebo nečitelná, ale kritická pole máš
   - "low" = máš pochybnosti, i když kritická pole vidíš. Toto spustí fallback na silnější model.`;

const DOCUMENT_SCHEMA = {
  name: "document_extraction",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      document_type: {
        type: "string",
        enum: ["receipt", "invoice", "contract", "statement", "other"],
      },
      extracted_data: {
        type: "object",
        properties: {
          merchant_name: { type: ["string", "null"] },
          merchant_ico: { type: ["string", "null"] },
          merchant_dic: { type: ["string", "null"] },
          date: { type: ["string", "null"], description: "ISO 8601 format YYYY-MM-DD" },
          total_amount: { type: ["number", "null"] },
          currency: { type: ["string", "null"], description: "CZK, EUR, USD..." },
          vat_amount: { type: ["number", "null"] },
          items: {
            type: ["array", "null"],
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: ["number", "null"] },
                price: { type: ["number", "null"] },
              },
              required: ["name", "quantity", "price"],
              additionalProperties: false,
            },
          },
        },
        required: ["merchant_name", "merchant_ico", "merchant_dic", "date", "total_amount", "currency", "vat_amount", "items"],
        additionalProperties: false,
      },
      summary: { type: "string", description: "Krátké shrnutí dokumentu v češtině, max 2 věty" },
      quality_status: { type: "string", enum: ["ok", "warning", "rejected"] },
      critical_fields_readable: {
        type: "object",
        properties: {
          date: { type: "boolean" },
          total_amount: { type: "boolean" },
        },
        required: ["date", "total_amount"],
        additionalProperties: false,
      },
      rejection_reason: {
        type: ["string", "null"],
        enum: ["unreadable_amount", "unreadable_date", "blurry_image", "dark_image", "cropped_image", "crumpled_paper", "glare_reflection", "low_resolution", "not_a_document", null],
      },
      retry_guidance_cs: { type: ["string", "null"], description: "Konkrétní česká instrukce pro uživatele" },
      warning_fields: { type: ["array", "null"], items: { type: "string" } },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      confidence_reason: { type: "string" },
      requires_human_review: { type: "boolean" },
    },
    required: [
      "document_type", "extracted_data", "summary", "quality_status",
      "critical_fields_readable", "rejection_reason", "retry_guidance_cs",
      "warning_fields", "confidence", "confidence_reason", "requires_human_review",
    ],
    additionalProperties: false,
  },
};

interface TestResult {
  file: string;
  folder: string;
  expectedStatus: string;
  actualStatus: string;
  pass: boolean;
  modelUsed: string;
  escalated: boolean;
  confidence: string;
  rejectionReason: string | null;
  retryGuidance: string | null;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  timeMs: number;
  error?: string;
}

function calculateCost(model: string, usage: { input: number; output: number }): number {
  const pricing = PRICING[model] ?? PRICING["gpt-4o-mini"];
  return (usage.input / 1_000_000) * pricing.input + (usage.output / 1_000_000) * pricing.output;
}

function imageToBase64DataUrl(filePath: string): string {
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
  };
  const mime = mimeMap[ext] || "image/jpeg";
  return `data:${mime};base64,${data.toString("base64")}`;
}

async function processTestFile(
  filePath: string,
  folder: string
): Promise<TestResult> {
  const fileName = path.basename(filePath);
  const expected = EXPECTED_STATUS[folder] || "unknown";
  const start = Date.now();

  try {
    const dataUrl = imageToBase64DataUrl(filePath);

    // Step 1: Primary model
    const response = await openai.chat.completions.create({
      model: MODEL_PRIMARY,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
            { type: "text", text: "Analyzuj tento dokument a extrahuj data podle instrukcí." },
          ],
        },
      ],
      response_format: { type: "json_schema", json_schema: DOCUMENT_SCHEMA },
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    const parsed = JSON.parse(content);
    const usage = {
      input: response.usage?.prompt_tokens ?? 0,
      output: response.usage?.completion_tokens ?? 0,
    };
    let costUsd = calculateCost(MODEL_PRIMARY, usage);
    let modelUsed = MODEL_PRIMARY;
    let escalated = false;
    let totalInput = usage.input;
    let totalOutput = usage.output;

    // Fallback if low confidence
    if (parsed.confidence === "low" || parsed.requires_human_review) {
      const fallbackResponse = await openai.chat.completions.create({
        model: MODEL_FALLBACK,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
              { type: "text", text: "Analyzuj tento dokument a extrahuj data podle instrukcí." },
            ],
          },
        ],
        response_format: { type: "json_schema", json_schema: DOCUMENT_SCHEMA },
        max_tokens: 2048,
      });

      const fallbackContent = fallbackResponse.choices[0]?.message?.content;
      if (fallbackContent) {
        const fallbackParsed = JSON.parse(fallbackContent);
        const fallbackUsage = {
          input: fallbackResponse.usage?.prompt_tokens ?? 0,
          output: fallbackResponse.usage?.completion_tokens ?? 0,
        };

        totalInput += fallbackUsage.input;
        totalOutput += fallbackUsage.output;
        costUsd += calculateCost(MODEL_FALLBACK, fallbackUsage);
        modelUsed = MODEL_FALLBACK;
        escalated = true;

        Object.assign(parsed, fallbackParsed);
      }
    }

    const actualStatus = parsed.quality_status;
    const timeMs = Date.now() - start;

    return {
      file: fileName,
      folder,
      expectedStatus: expected,
      actualStatus,
      pass: actualStatus === expected,
      modelUsed,
      escalated,
      confidence: parsed.confidence,
      rejectionReason: parsed.rejection_reason,
      retryGuidance: parsed.retry_guidance_cs,
      tokensInput: totalInput,
      tokensOutput: totalOutput,
      costUsd,
      timeMs,
    };
  } catch (error) {
    return {
      file: fileName,
      folder,
      expectedStatus: expected,
      actualStatus: "error",
      pass: false,
      modelUsed: MODEL_PRIMARY,
      escalated: false,
      confidence: "none",
      rejectionReason: null,
      retryGuidance: null,
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: 0,
      timeMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log("=== Finatiq Document Processor Test ===\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set. Add it to .env.local");
    process.exit(1);
  }

  const fixturesDir = path.resolve(__dirname, "../test-fixtures/receipts");
  if (!fs.existsSync(fixturesDir)) {
    console.error(`Fixtures directory not found: ${fixturesDir}`);
    process.exit(1);
  }

  const results: TestResult[] = [];
  const folders = fs.readdirSync(fixturesDir).filter((f) => {
    const stat = fs.statSync(path.join(fixturesDir, f));
    return stat.isDirectory() && f in EXPECTED_STATUS;
  });

  if (folders.length === 0) {
    console.log("No fixture folders found. Add images to test-fixtures/receipts/");
    console.log("See test-fixtures/receipts/README.md for instructions.");
    process.exit(0);
  }

  let totalFiles = 0;
  for (const folder of folders) {
    const folderPath = path.join(fixturesDir, folder);
    const files = fs
      .readdirSync(folderPath)
      .filter((f) => /\.(jpg|jpeg|png)$/i.test(f));

    if (files.length === 0) {
      console.log(`  [${folder}] — no images, skipping`);
      continue;
    }

    console.log(`Testing ${folder}/ (${files.length} files, expected: ${EXPECTED_STATUS[folder]})...`);

    for (const file of files) {
      totalFiles++;
      const filePath = path.join(folderPath, file);
      console.log(`  Processing: ${file}...`);
      const result = await processTestFile(filePath, folder);
      results.push(result);

      const icon = result.pass ? "PASS" : "FAIL";
      const escLabel = result.escalated ? " [escalated]" : "";
      console.log(
        `  [${icon}] ${file}: expected=${result.expectedStatus}, actual=${result.actualStatus}, ` +
          `confidence=${result.confidence}, model=${result.modelUsed}${escLabel}, ` +
          `cost=$${result.costUsd.toFixed(6)}, time=${result.timeMs}ms`
      );
      if (result.error) console.log(`    ERROR: ${result.error}`);
      if (result.rejectionReason) console.log(`    Reason: ${result.rejectionReason}`);
      if (result.retryGuidance) console.log(`    Guidance: ${result.retryGuidance}`);
    }
    console.log();
  }

  // Summary
  console.log("=== SUMMARY ===\n");

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0);
  const escalatedCount = results.filter((r) => r.escalated).length;
  const rejectedCount = results.filter((r) => r.actualStatus === "rejected").length;

  const miniOnlyResults = results.filter((r) => !r.escalated && r.actualStatus !== "error");
  const escalatedResults = results.filter((r) => r.escalated);

  const avgCostMini = miniOnlyResults.length > 0
    ? miniOnlyResults.reduce((s, r) => s + r.costUsd, 0) / miniOnlyResults.length
    : 0;
  const avgCostEscalated = escalatedResults.length > 0
    ? escalatedResults.reduce((s, r) => s + r.costUsd, 0) / escalatedResults.length
    : 0;

  console.log(`Total files tested: ${total}`);
  console.log(`Pass rate: ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`Total cost: $${totalCost.toFixed(6)}`);
  console.log(`Escalated to fallback: ${escalatedCount}`);
  console.log(`Rejected: ${rejectedCount}`);
  console.log();
  console.log(`Avg cost (mini-only): $${avgCostMini.toFixed(6)}`);
  console.log(`Avg cost (escalated): $${avgCostEscalated.toFixed(6)}`);
  console.log();

  // Monthly cost estimate (1000 docs, 80% OK, 15% warning, 5% escalated)
  const monthlyMiniCost = 950 * avgCostMini; // 80% ok + 15% warning = 95% mini
  const monthlyEscalatedCost = 50 * (avgCostEscalated || avgCostMini * 20); // 5% escalated
  const monthlyTotal = monthlyMiniCost + monthlyEscalatedCost;
  console.log("=== MONTHLY COST ESTIMATE (1000 docs) ===");
  console.log(`  950 mini-only:  $${monthlyMiniCost.toFixed(4)}`);
  console.log(`  50 escalated:   $${monthlyEscalatedCost.toFixed(4)}`);
  console.log(`  TOTAL:          $${monthlyTotal.toFixed(4)}`);
  console.log();

  // Per-folder breakdown
  console.log("=== PER-FOLDER RESULTS ===");
  for (const folder of folders) {
    const folderResults = results.filter((r) => r.folder === folder);
    if (folderResults.length === 0) continue;
    const folderPassed = folderResults.filter((r) => r.pass).length;
    console.log(
      `  ${folder}: ${folderPassed}/${folderResults.length} passed`
    );
  }

  if (passed < total) {
    console.log("\nSome tests failed. Review results above.");
    process.exit(1);
  }
}

main().catch(console.error);
