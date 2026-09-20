import * as cheerio from "cheerio";
import type { RegulatorySignalInput } from "./db";

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
const EPA_SEARCH_URL = "https://www.epa.govt.nz/database-search/hsno-application-register/DatabaseSearchForm/?ApplicationType=Importation+or+manufacture+for+release&DatabaseType=HSNO&SiteDatabaseSearchFilters=33&sort=Date";
const MPI_CONSULTATIONS_URL = "https://www.mpi.govt.nz/consultations?cat=9";

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = clean(value).match(/(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})/);
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
    headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml", "accept-language": "en-NZ,en;q=0.9" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);\n  const html = await response.text();\n  if (html.length < 500) throw new Error(`${url} returned an unexpectedly small HTML response (${html.length} bytes)`);\n  return { html, finalUrl: response.url || url };
}

function findResultBlock($: cheerio.CheerioAPI, element: any) {
  let node = $(element);
  let best = node.parent();
  for (let i = 0; i < 7; i++) {
    const text = clean(best.text());
    if (/Decision notified date:/i.test(text) && text.length >= 40 && text.length <= 2500) return best;
    const parent = best.parent();
    if (!parent.length) break;
    best = parent;
  }
  return node.parent();
}

export async function fetchEpaHsnoSignals(knownIngredients: string[], pages = 5): Promise<RegulatorySignalInput[]> {
  const signals = new Map<string, RegulatorySignalInput>();

  for (let page = 0; page < pages; page++) {
    const start = page * 10;
    const url = EPA_SEARCH_URL + "&start=" + start;
    const { html, finalUrl } = await fetchHtml(url);
    const $ = cheerio.load(html);

    $("a, h3, h4, h5, h6").each((_, element) => {
      const label = clean($(element).text());
      if (!/^APP\d{6}$/i.test(label)) return;

      const applicationId = label.toUpperCase();
      if (signals.has(applicationId)) return;

      const block = findResultBlock($, element);
      const blockText = clean(block.text());
      const dateMatch = blockText.match(/Decision notified date:\s*(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/i);
      const eventDate = isoDate(dateMatch?.[1]);
      const summary = clean(
        blockText
          .replace(new RegExp(applicationId, "ig"), "")
          .replace(/Decision notified date:\s*\d{1,2}\s+[A-Za-z]+\s+20\d{2}/ig, "")
      ).slice(0, 1000);

      if (!summary || !eventDate) return;

      const anchor = $(element).is("a") ? $(element) : $(element).find("a").first();
      const href = anchor.attr("href");
      const sourceUrl = href
        ? new URL(href, finalUrl).toString()
        : EPA_SEARCH_URL + "&Keywords=" + encodeURIComponent(applicationId);

      signals.set(applicationId, {
        source: "EPA_HSNO",
        externalId: applicationId,
        signalType: "EPA_DECISION",
        title: applicationId,
        summary,
        eventDate,
        sourceUrl,
        ingredients: extractIngredients(summary, knownIngredients),
        status: "Decision notified",
        raw: { applicationId, sourceListUrl: url }
      });
    });
  }

  return [...signals.values()];
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
  return [...deduped.values()];
}

export async function fetchEarlyWarningSignals(knownIngredients: string[]) {
  const [epa, mrl] = await Promise.all([
    fetchEpaHsnoSignals(knownIngredients),
    fetchMpiMrlSignals(knownIngredients)
  ]);
  return { epa, mrl, all: [...epa, ...mrl] };
}
