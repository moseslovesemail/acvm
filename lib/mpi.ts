import * as cheerio from "cheerio";
import { parse } from "csv-parse/sync";
import type { Product } from "./types";

export const MPI_REGISTER_URL = "https://eatsafe.nzfsa.govt.nz/web/public/21";

const USER_AGENT = "ACVMSignal/0.1 (independent regulatory intelligence)";

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function keyMap(row: Record<string, unknown>) {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(row)) {
    out.set(key.toLowerCase().replace(/[^a-z0-9]/g, ""), clean(value));
  }
  return out;
}

function pick(map: Map<string, string>, candidates: string[]): string {
  for (const candidate of candidates) {
    const value = map.get(candidate.toLowerCase().replace(/[^a-z0-9]/g, ""));
    if (value) return value;
  }
  return "";
}

export async function discoverEntireRegisterCsv(): Promise<string> {
  const response = await fetch(MPI_REGISTER_URL, {
    headers: { "user-agent": USER_AGENT },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`MPI register page returned ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  let href = "";
  $("a").each((_, el) => {
    const text = clean($(el).text()).toLowerCase();
    if (text === "entire register") href = $(el).attr("href") ?? href;
  });
  if (!href) throw new Error("Could not locate MPI Entire register CSV link");
  return new URL(href, response.url || MPI_REGISTER_URL).toString();
}

export async function fetchEntireRegisterRows(): Promise<{ rows: Record<string, string>[]; sourceUrl: string }> {
  const sourceUrl = await discoverEntireRegisterCsv();
  const response = await fetch(sourceUrl, {
    headers: { "user-agent": USER_AGENT },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`MPI CSV returned ${response.status}`);
  const csv = await response.text();
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    trim: true
  }) as Record<string, string>[];
  if (!rows.length) throw new Error("MPI CSV contained no rows");
  return { rows, sourceUrl };
}

export function normalizeProducts(rows: Record<string, string>[]): Product[] {
  const grouped = new Map<string, Product>();

  for (const rawRow of rows) {
    const map = keyMap(rawRow);
    const registrationNumber = pick(map, [
      "registrationnumber", "registrationno", "registration", "acvmnumber", "acvmno"
    ]);
    if (!registrationNumber) continue;

    const tradeName = pick(map, ["tradename", "productname", "name"]);
    const registrant = pick(map, ["registrantname", "registrant"]);
    const status = pick(map, ["status", "registrationstatus"]);
    const productType = pick(map, ["producttype", "type", "classification"]);
    const ingredient = pick(map, ["activeingredient", "ingredient", "ingredients"]);
    const registrationDate = pick(map, ["registrationdate", "dateofregistration", "registereddate"]);
    const nzAgent = pick(map, ["nzagentname", "nzagent", "agent"]);

    const existing = grouped.get(registrationNumber);
    const cleanedRaw = Object.fromEntries(Object.entries(rawRow).map(([k, v]) => [k, clean(v)]));

    if (!existing) {
      grouped.set(registrationNumber, {
        registrationNumber,
        tradeName,
        registrant,
        status,
        productTypes: productType ? [productType] : [],
        activeIngredients: ingredient ? [ingredient] : [],
        registrationDate: registrationDate || null,
        nzAgent: nzAgent || null,
        raw: [cleanedRaw]
      });
      continue;
    }

    if (!existing.tradeName && tradeName) existing.tradeName = tradeName;
    if (!existing.registrant && registrant) existing.registrant = registrant;
    if (!existing.status && status) existing.status = status;
    if (!existing.registrationDate && registrationDate) existing.registrationDate = registrationDate;
    if (!existing.nzAgent && nzAgent) existing.nzAgent = nzAgent;
    if (productType && !existing.productTypes.includes(productType)) existing.productTypes.push(productType);
    if (ingredient && !existing.activeIngredients.includes(ingredient)) existing.activeIngredients.push(ingredient);
    existing.raw.push(cleanedRaw);
  }

  return [...grouped.values()].sort((a, b) => a.registrationNumber.localeCompare(b.registrationNumber));
}
