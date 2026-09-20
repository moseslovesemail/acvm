import { notFound } from "next/navigation";
import { getRegistrantProfile } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegistrantProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const name = decodeURIComponent(slug);
  const data = await getRegistrantProfile(name);
  if (!data) notFound();
  const user = await getCurrentUser();
  const currentProducts = data.products.filter((p: any) => p.is_current);

  return (
    <main className="container dashboard">
      <div className="profile-hero">
        <div><div className="eyebrow">Registrant intelligence</div><h2>{name}</h2><p className="lead">{currentProducts.length} products currently present in the monitored register.</p></div>
        {user ? <form action="/api/watchlist" method="POST">
          <input type="hidden" name="entityType" value="registrant"/><input type="hidden" name="entityValue" value={name}/><input type="hidden" name="label" value={name}/><input type="hidden" name="returnTo" value={"/registrants/" + encodeURIComponent(name)}/>
          <button className="button signal" type="submit">Watch this registrant</button>
        </form> : <a className="button signal" href="/register">Create account to watch</a>}
      </div>

      <div className="profile-grid">
        <section className="profile-card"><span className="stat-label">Current products</span><strong>{currentProducts.length}</strong></section>
        <section className="profile-card"><span className="stat-label">Ingredients</span><strong>{data.ingredients.length}</strong></section>
        <section className="profile-card"><span className="stat-label">Recorded signals</span><strong>{data.events.length}</strong></section>
      </div>

      <section className="workspace-section">
        <div className="workspace-heading"><h3>Ingredient portfolio</h3><span>Ranked by current product count.</span></div>
        <div className="chip-list">{data.ingredients.map((x: any) => <a className="entity-chip" href={"/ingredients/" + encodeURIComponent(x.ingredient)} key={x.ingredient}>{x.ingredient} <small>{x.products}</small></a>)}</div>
      </section>

      <section className="workspace-section">
        <div className="workspace-heading"><h3>Product portfolio</h3><span>Current products first.</span></div>
        <div className="table-wrap"><table><thead><tr><th>Registration</th><th>Trade name</th><th>Ingredients</th><th>Status</th></tr></thead>
        <tbody>{data.products.map((p: any) => <tr key={p.registration_number}><td>{p.registration_number}</td><td><a className="table-link" href={"/products/" + encodeURIComponent(p.registration_number)}>{p.trade_name}</a></td><td>{(p.active_ingredients ?? []).join(", ")}</td><td>{p.is_current ? p.status || "Current" : "Not present"}</td></tr>)}</tbody></table></div>
      </section>
    </main>
  );
}
