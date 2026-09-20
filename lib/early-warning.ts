import * as cheerio from "cheerio";
import type { RegulatorySignalInput } from "./db";

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
const EPA_PIPELINE_URL = "https://www.epa.govt.nz/hazardous-substances/substance-approvals-and-group-standards/applying-for-a-new-approval/timeframes-to-process-a-new-application/";
const MPI_CONSULTATIONS_URL = "https://www.mpi.govt.nz/consultations?cat=9";

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = clean(value);

  const numeric = normalized.match(/(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})/);
  if (numeric) {
    const day = Number(numeric[1]);
    const monthNumber = Number(numeric[2]);
    if (day >= 1 && day <= 31 && monthNumber >= 1 && monthNumber <= 12) {
      return `${numeric[3]}-${numeric[2].padStart(2,"0")}-${numeric[1].padStart(2,"0")}`;
    }
  }

  const match = normalized.match(/(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})/);
  if (!match) return null;
  const months: Record<string, string> = {
    january:"01", february:"02", march:"03", april:"04", may:"05", june:"06",
    july:"07", august:"08", september:"09", october:"10", november:"11", december:"12"
  };
  const month = months[match[2].toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${month}-${match[1].padStart(2,"0")}`;
}

function matchKnownIngredients(text: string, knownIngredients: string[]) {
  const lower = text.toLowerCase();
  return knownIngredients
    .filter((ingredient) => ingredient.length >= 3 && lower.includes(ingredient.toLowerCase()))
    .sort((a, b) => b.length - a.length);
}

function extractLikelyIngredients(text: string) {
  const candidates: string[] = [];
  const patterns = [
    /containing\s+([^.;]{2,220}?)\s+as (?:the )?active ingredients?/gi,
    /active ingredients?\s*[:\-]\s*([^.;]{2,220})/gi
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      const cleaned = match[1]
        .replace(/\b\d+(?:\.\d+)?\s*(?:g\/l|mg\/l|g\/kg|mg\/kg|%\s*w\/?v|%\s*w\/?w|%)\b/gi, "")
        .replace(/\b(?:and|with)\b/gi, ",");
      for (const part of cleaned.split(",")) {
        const value = clean(part)
          .replace(/^(?:the\s+)?/i, "")
          .replace(/\s+(?:in|for|to|as)\s+.*$/i, "");
        if (value.length >= 3 && value.length <= 70 && !/^(water|mixture|product|substance)$/i.test(value)) candidates.push(value);
      }
    }
  }
  return unique(candidates);
}

function extractIngredients(text: string, knownIngredients: string[]) {
  const known = matchKnownIngredients(text, knownIngredients);
  const likely = extractLikelyIngredients(text);
  return unique([...known, ...likely]);
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-NZ,en;q=0.9"
    },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  const html = await response.text();
  if (html.length < 500) {
    throw new Error(`${url} returned an unexpectedly small HTML response (${html.length} bytes)`);
  }
  return { html, finalUrl: response.url || url };
}

export async function fetchEpaHsnoSignals(knownIngredients: string[]): Promise<RegulatorySignalInput[]> {
  const { html, finalUrl } = await fetchHtml(EPA_PIPELINE_URL);
  const $ = cheerio.load(html);
  const table = $("table").filter((_, element) => {
    const text = clean($(element).text());
    return /Application number/i.test(text) && /Date lodged/i.test(text) && /Next step/i.test(text) && !/Date decision notified/i.test(text);
  }).first();

  if (!table.length) throw new Error("EPA Category C pipeline table was not found in the public timeframes page");

  const signals: RegulatorySignalInput[] = [];
  table.find("tr").each((_, row) => {
    const cells = $(row).find("th,td").map((__, cell) => clean($(cell).text())).get();
    const appIndex = cells.findIndex((cell) => /^APP\d{6}$/i.test(cell));
    if (appIndex < 0) return;

    const applicationId = cells[appIndex].toUpperCase();
    const shortName = cells[appIndex + 1] || applicationId;
    const applicant = cells[appIndex + 2] || "";
    const lodged = cells[appIndex + 3] || "";
    const status = cells[appIndex + 4] || "";
    const nextStep = cells[appIndex + 5] || "";
    const combined = [shortName, applicant, status, nextStep].filter(Boolean).join(" ");
    const ingredients = extractIngredients(combined, knownIngredients);

    signals.push({
      source: "EPA_HSNO",
      externalId: applicationId,
      signalType: "EPA_PIPELINE",
      title: shortName,
      summary: [
        applicant ? "Applicant: " + applicant + "." : "",
        status ? "Status: " + status + "." : "",
        nextStep ? "Next step: " + nextStep + "." : ""
      ].filter(Boolean).join(" "),
      eventDate: isoDate(lodged),
      sourceUrl: finalUrl,
      ingredients,
      applicant,
      status: [status, nextStep].filter(Boolean).join(" · "),
      raw: { applicationId, shortName, applicant, lodged, status, nextStep, sourceType: "Category C current pipeline" }
    });
  });

  if (!signals.length) throw new Error("EPA Category C pipeline table contained no application rows");
  return signals;
}

function extractMrlIngredients($: cheerio.CheerioAPI, knownIngredients: string[]) {
  const explicit: string[] = [];
  const heading = $("h2, h3").filter((_, el) => /what we.?re proposing/i.test(clean($(el).text()))).first();

  if (heading.length) {
    let node = heading.next();
    while (node.length && !node.is("h1,h2,h3")) {
      node.find("li").each((_, li) => {
        const text = clean($(li).text()).replace(/[.;]$/, "");
        if (text && text.length <= 100) explicit.push(text);
      });
      if (node.is("li")) {
        const text = clean(node.text()).replace(/[.;]$/, "");
        if (text && text.length <= 100) explicit.push(text);
      }
      node = node.next();
    }
  }

  const pageText = clean($("main").text() || $("body").text());
  const scheduleEntry = pageText.match(/For Schedule [23],?[^.]{0,120}?new entry for\s+(.+?)(?:\s+used as|\s+for which|\.|$)/i);
  if (scheduleEntry?.[1]) explicit.push(clean(scheduleEntry[1]));

  const known = matchKnownIngredients(pageText, knownIngredients);
  return unique([...explicit, ...known])
    .filter((value) => !/^(schedule|submission|proposal|food notice)/i.test(value))
    .slice(0, 40);
}

function consultationDate($: cheerio.CheerioAPI) {
  const text = clean($("main").text() || $("body").text());
  const opened = text.match(/(?:opened|open(?:ed)? on)\s+(?:on\s+)?(\d{1,2}\s+[A-Za-z]+(?:\s+20\d{2})?)/i);
  if (opened?.[1]) {
    const withYear = /20\d{2}/.test(opened[1]) ? opened[1] : opened[1] + " " + new Date().getUTCFullYear();
    const parsed = isoDate(withYear);
    if (parsed) return parsed;
  }
  const title = clean($("h1").first().text());
  const titleDate = title.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i);
  if (titleDate) {
    const month = title.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i)?.[1];
    if (month) return isoDate("1 " + month + " " + titleDate[1]);
  }
  return null;
}

export async function fetchMpiMrlSignals(knownIngredients: string[]): Promise<RegulatorySignalInput[]> {
  const { html, finalUrl } = await fetchHtml(MPI_CONSULTATIONS_URL);
  const $ = cheerio.load(html);
  const consultationUrls = new Set<string>();

  $("a").each((_, el) => {
    const text = clean($(el).text()).toLowerCase();
    const href = $(el).attr("href") || "";
    if (
      text.includes("maximum residue levels") ||
      href.toLowerCase().includes("maximum-residue-levels-for-agricultural-compounds")
    ) {
      consultationUrls.add(new URL(href, finalUrl).toString());
    }
  });

  // Keep known recent consultations as resilient fallbacks if the listing markup changes.
  consultationUrls.add("https://www.mpi.govt.nz/consultations/proposals-to-amend-the-food-notice-maximum-residue-levels-for-agricultural-compounds-april-2026");
  consultationUrls.add("https://www.mpi.govt.nz/consultations/proposals-to-amend-the-food-notice-maximum-residue-levels-for-agricultural-compounds");

  const signals: RegulatorySignalInput[] = [];
  for (const url of consultationUrls) {
    try {
      const page = await fetchHtml(url);
      const $$ = cheerio.load(page.html);
      const title = clean($$("h1").first().text()) || "MPI maximum residue level consultation";
      const ingredients = extractMrlIngredients($$, knownIngredients);
      const eventDate = consultationDate($$);
      const body = clean($$("main").text() || $$("body").text());
      const status = /updated notice|summary of submissions released|consultation closed/i.test(body)
        ? "Consultation completed / updated"
        : /have your say|submissions will close|submissions close/i.test(body)
          ? "Consultation"
          : "Published";

      for (const ingredient of ingredients) {
        const slug = new URL(page.finalUrl).pathname.split("/").filter(Boolean).pop() || "mrl";
        signals.push({
          source: "MPI_MRL",
          externalId: slug + ":" + ingredient.toLowerCase(),
          signalType: "MRL_ACTIVITY",
          title: ingredient,
          summary: `${title}: regulatory activity identified for ${ingredient}.`,
          eventDate,
          sourceUrl: page.finalUrl,
          ingredients: [ingredient],
          status,
          raw: { consultationTitle: title, listingUrl: MPI_CONSULTATIONS_URL }
        });
      }
    } catch (error) {
      console.warn("[acvm-signal] MRL source skipped", url, error instanceof Error ? error.message : String(error));
    }
  }

  const deduped = new Map<string, RegulatorySignalInput>();
  for (const signal of signals) deduped.set(signal.externalId, signal);
  const values = [...deduped.values()];
  if (!values.length) throw new Error("MPI MRL source produced no structured consultation signals");
  return values;
}

export async function fetchEarlyWarningSignals(knownIngredients: string[]) {
  const [epaResult, mrlResult] = await Promise.allSettled([
    fetchEpaHsnoSignals(knownIngredients),
    fetchMpiMrlSignals(knownIngredients)
  ]);

  const epa = epaResult.status === "fulfilled" ? epaResult.value : [];
  const mrl = mrlResult.status === "fulfilled" ? mrlResult.value : [];
  const errors: Record<string, string> = {};

  if (epaResult.status === "rejected") {
    errors.EPA_HSNO = epaResult.reason instanceof Error ? epaResult.reason.message : String(epaResult.reason);
    console.warn("[acvm-signal] EPA source unavailable", errors.EPA_HSNO);
  }
  if (mrlResult.status === "rejected") {
    errors.MPI_MRL = mrlResult.reason instanceof Error ? mrlResult.reason.message : String(mrlResult.reason);
    console.warn("[acvm-signal] MPI MRL source unavailable", errors.MPI_MRL);
  }

  return { epa, mrl, all: [...epa, ...mrl], errors };
}
