import { notFound } from "next/navigation";
import { getIngredientProfile } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function IngredientProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const name = decodeURIComponent(slug);
  const data = await getIngredientProfile(name);
  if (!data) notFound();
  const user = await getCurrentUser();
  const current = data.products.filter((p: any) => p.is_current);

  return (
    <main className="container dashboard">
      <div className="profile-hero">
        <div><div className="eyebrow">Active ingredient intelligence</div><h2>{name}</h2><p className="lead">{current.length} current products across {data.registrants.length} registrants.</p></div>
        {user ? <form action="/api/watchlist" method="POST">
          <input type="hidden" name="entityType" value="ingredient"/><input type="hidden" name="entityValue" value={name}/><input type="hidden" name="label" value={name}/><input type="hidden" name="returnTo" value={"/ingredients/" + encodeURIComponent(name)}/>
          <button className="button signal" type="submit">Watch this ingredient</button>
        </form> : <a className="button signal" href="/register">Create account to watch</a>}
      </div>

      <div className="profile-grid">
        <section className="profile-card"><span className="stat-label">Current products</span><strong>{current.length}</strong></section>
        <section className="profile-card"><span className="stat-label">Registrants</span><strong>{data.registrants.length}</strong></section>
        <section className="profile-card"><span className="stat-label">Recorded signals</span><strong>{data.events.length}</strong></section>
      </div>

      <section className="workspace-section">
        <div className="workspace-heading"><h3>Competitive set</h3><span>Registrant share by current product count.</span></div>
        <div className="watch-grid">{data.registrants.map((r: any) => <a className="watch-card link-card" href={"/registrants/" + encodeURIComponent(r.registrant)} key={r.registrant}><div className="signal-type">{r.products} products</div><strong>{r.registrant}</strong></a>)}</div>
      </section>

      <section className="workspace-section">
        <div className="workspace-heading"><h3>Products containing this ingredient</h3><span>Current products first.</span></div>
        <div className="table-wrap"><table><thead><tr><th>Registration</th><th>Product</th><th>Registrant</th><th>Status</th></tr></thead>
        <tbody>{data.products.map((p: any) => <tr key={p.registration_number}><td>{p.registration_number}</td><td><a className="table-link" href={"/products/" + encodeURIComponent(p.registration_number)}>{p.trade_name}</a></td><td><a className="table-link" href={"/registrants/" + encodeURIComponent(p.registrant)}>{p.registrant}</a></td><td>{p.is_current ? p.status || "Current" : "Not present"}</td></tr>)}</tbody></table></div>
      </section>
    </main>
  );
}
