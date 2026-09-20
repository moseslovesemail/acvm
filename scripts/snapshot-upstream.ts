import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fetchEarlyWarningSignals } from "../lib/early-warning";
import type { RegulatorySignalInput } from "../lib/db";

const OUTPUT = "data/upstream-signals.json";

type Snapshot = {
  capturedAt: string;
  sources: {
    EPA_HSNO: { status: "ok" | "stale"; count: number; error?: string };
    MPI_MRL: { status: "ok" | "stale"; count: number; error?: string };
  };
  signals: RegulatorySignalInput[];
};

async function previousSnapshot(): Promise<Snapshot | null> {
  try {
    return JSON.parse(await readFile(OUTPUT, "utf8")) as Snapshot;
  } catch {
    return null;
  }
}

function previousBySource(previous: Snapshot | null, source: RegulatorySignalInput["source"]) {
  return previous?.signals.filter((signal) => signal.source === source) ?? [];
}

async function main() {
  const previous = await previousSnapshot();
  const result = await fetchEarlyWarningSignals([]);

  const epaFailed = Boolean(result.errors.EPA_HSNO);
  const mrlFailed = Boolean(result.errors.MPI_MRL);

  const epa = epaFailed ? previousBySource(previous, "EPA_HSNO") : result.epa;
  const mrl = mrlFailed ? previousBySource(previous, "MPI_MRL") : result.mrl;

  if (epaFailed && mrlFailed && !previous) {
    throw new Error("Both upstream sources failed and no prior snapshot exists");
  }

  const snapshot: Snapshot = {
    capturedAt: new Date().toISOString(),
    sources: {
      EPA_HSNO: {
        status: epaFailed ? "stale" : "ok",
        count: epa.length,
        ...(result.errors.EPA_HSNO ? { error: result.errors.EPA_HSNO } : {})
      },
      MPI_MRL: {
        status: mrlFailed ? "stale" : "ok",
        count: mrl.length,
        ...(result.errors.MPI_MRL ? { error: result.errors.MPI_MRL } : {})
      }
    },
    signals: [...epa, ...mrl]
  };

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({
    capturedAt: snapshot.capturedAt,
    EPA_HSNO: snapshot.sources.EPA_HSNO,
    MPI_MRL: snapshot.sources.MPI_MRL,
    total: snapshot.signals.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
