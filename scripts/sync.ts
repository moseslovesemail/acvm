import { fetchEntireRegisterRows, normalizeProducts } from "../lib/mpi";
import { ensureSchema, syncProducts } from "../lib/db";

async function main() {
  console.log(`[acvm-signal] sync started ${new Date().toISOString()}`);
  await ensureSchema();
  const { rows, sourceUrl } = await fetchEntireRegisterRows();
  const products = normalizeProducts(rows);
  const result = await syncProducts(products, sourceUrl, rows.length);
  console.log(JSON.stringify({ sourceUrl, rows: rows.length, products: products.length, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
