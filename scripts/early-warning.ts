import { ensureSchema, getKnownIngredients, upsertRegulatorySignals } from "../lib/db";
import { fetchEarlyWarningSignals } from "../lib/early-warning";

async function main() {
  console.log("[acvm-signal] early-warning sync started " + new Date().toISOString());
  await ensureSchema();
  const knownIngredients = await getKnownIngredients();
  const { epa, mrl } = await fetchEarlyWarningSignals(knownIngredients);

  const epaResult = await upsertRegulatorySignals("EPA_HSNO", epa);
  const mrlResult = await upsertRegulatorySignals("MPI_MRL", mrl);

  console.log(JSON.stringify({
    knownIngredients: knownIngredients.length,
    EPA_HSNO: { fetched: epa.length, ...epaResult },
    MPI_MRL: { fetched: mrl.length, ...mrlResult }
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
