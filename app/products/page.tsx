import { searchProducts } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const products = await searchProducts(q, 100);

  return (
    <main className="container dashboard">
      <div className="dash-top"><div><div className="eyebrow">Product explorer</div><h2 style={{marginTop:8}}>Search the normalised ACVM register</h2></div></div>
      <form style={{marginBottom:18}}><input className="search" name="q" defaultValue={q} placeholder="Trade name, registrant, ACVM number or ingredient"/></form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Registration</th><th>Trade name</th><th>Registrant</th><th>Type</th><th>Active ingredient</th><th>Status</th></tr></thead>
          <tbody>
            {products.length ? products.map((p: any) => (
              <tr key={p.registration_number}>
                <td>{p.registration_number}</td>
                <td><strong>{p.trade_name}</strong></td>
                <td>{p.registrant}</td>
                <td>{(p.product_types ?? []).join(", ")}</td>
                <td>{(p.active_ingredients ?? []).join(", ")}</td>
                <td>{p.status}</td>
              </tr>
            )) : <tr><td colSpan={6} className="source-note">No database rows yet. Run the sync worker after Railway Postgres is connected.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
