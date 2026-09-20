import { searchProducts } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const products = await searchProducts(q, 100);

  return (
    <main className="container dashboard">
      <div className="dash-top">
        <div>
          <div className="eyebrow">Product explorer</div>
          <h2 style={{marginTop:8}}>Search the normalised ACVM register</h2>
          <p className="lead">Move from a product into its registrant, active ingredients and regulatory history.</p>
        </div>
        <a className="button secondary" href="/cancellations">Market exits</a>
      </div>

      <form className="search-bar">
        <input className="search" name="q" defaultValue={q} placeholder="Trade name, registrant, ACVM number or ingredient"/>
        <button className="button signal" type="submit">Search</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Registration</th><th>Trade name</th><th>Registrant</th><th>Type</th><th>Active ingredient</th><th>Status</th></tr></thead>
          <tbody>
            {products.length ? products.map((p: any) => (
              <tr key={p.registration_number}>
                <td><a className="table-link" href={"/products/" + encodeURIComponent(p.registration_number)}>{p.registration_number}</a></td>
                <td><a className="table-link" href={"/products/" + encodeURIComponent(p.registration_number)}><strong>{p.trade_name}</strong></a></td>
                <td><a className="table-link" href={"/registrants/" + encodeURIComponent(p.registrant)}>{p.registrant}</a></td>
                <td>{(p.product_types ?? []).join(", ")}</td>
                <td>
                  <div className="table-chip-list">
                    {(p.active_ingredients ?? []).map((ingredient: string) => (
                      <a className="mini-chip" href={"/ingredients/" + encodeURIComponent(ingredient)} key={ingredient}>{ingredient}</a>
                    ))}
                  </div>
                </td>
                <td>{p.is_current ? (p.status || "Current") : <span className="badge badge--exit">Not present</span>}</td>
              </tr>
            )) : <tr><td colSpan={6} className="source-note">No products matched that search.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
