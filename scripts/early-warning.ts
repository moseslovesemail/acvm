import { readFile } from "node:fs/promises";
import { ensureSchema, getEarlyWarningStats, getKnownIngredients, upsertRegulatorySignals } from "../lib/db";
import { fetchEarlyWarningSignals } from "../lib/early-warning";
import type { RegulatorySignalInput } from "../lib/db";

const SNAPSHOT = "data/upstream-signals.json";

type SnapshotFile = {
  capturedAt: string;
  sources?: Record<string, { status?: string; count?: number; error?: string }>;
  signals: RegulatorySignalInput[];
};

function enrichIngredients(signals: RegulatorySignalInput[], knownIngredients: string[]) {
  return signals.map((signal) => {
    const text = [
      signal.title,
      signal.summary,
      signal.applicant ?? "",
      signal.status ?? "",
      JSON.stringify(signal.raw ?? {})
    ].join(" ").toLowerCase();

    const inferred = knownIngredients.filter((ingredient) =>
      ingredient.length >= 3 && text.includes(ingredient.toLowerCase())
    );

    return {
      ...signal,
      ingredients: [...new Set([...(signal.ingredients ?? []), ...inferred])]
    };
  });
}

async function loadSnapshot() {
  try {
    const snapshot = JSON.parse(await readFile(SNAPSHOT, "utf8")) as SnapshotFile;
    if (!Array.isArray(snapshot.signals) || !snapshot.signals.length) return null;
    return snapshot;
  } catch {
    return null;
  }
}

async function main() {
  console.log("[acvm-signal] early-warning sync started " + new Date().toISOString());
  await ensureSchema();

  const knownIngredients = await getKnownIngredients();
  const snapshot = await loadSnapshot();

  let epa: RegulatorySignalInput[] = [];
  let mrl: RegulatorySignalInput[] = [];
  let sourceMode = "live";

  if (snapshot) {
    sourceMode = "github-snapshot";
    const enriched = enrichIngredients(snapshot.signals, knownIngredients);
    epa = enriched.filter((signal) => signal.source === "EPA_HSNO");
    mrl = enriched.filter((signal) => signal.source === "MPI_MRL");
  } else {
    const live = await fetchEarlyWarningSignals(knownIngredients);
    epa = live.epa;
    mrl = live.mrl;
  }

  const epaResult = await upsertRegulatorySignals("EPA_HSNO", epa);
  const mrlResult = await upsertRegulatorySignals("MPI_MRL", mrl);
  const storedStats = await getEarlyWarningStats();

  console.log(JSON.stringify({
    sourceMode,
    snapshotCapturedAt: snapshot?.capturedAt ?? null,
    sourceStatus: snapshot?.sources ?? null,
    knownIngredients: knownIngredients.length,
    EPA_HSNO: { fetched: epa.length, ...epaResult },
    MPI_MRL: { fetched: mrl.length, ...mrlResult },
    storedStats
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
