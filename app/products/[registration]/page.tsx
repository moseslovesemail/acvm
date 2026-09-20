import { notFound } from "next/navigation";
import { getProductProfile } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProductProfile({ params }: { params: Promise<{ registration: string }> }) {
  const { registration } = await params;
  const data = await getProductProfile(decodeURIComponent(registration));
  if (!data) notFound();
  const user = await getCurrentUser();
  const p: any = data.product;

  return (
    <main className="container dashboard">
      <div className="profile-hero">
        <div>
          <div className="eyebrow">ACVM product</div>
          <h2>{p.trade_name || p.registration_number}</h2>
          <p className="lead">{p.registration_number} · {p.status || "Status not stated"}</p>
        </div>
        {user ? (
          <form action="/api/watchlist" method="POST">
            <input type="hidden" name="entityType" value="product"/>
            <input type="hidden" name="entityValue" value={p.registration_number}/>
            <input type="hidden" name="label" value={p.trade_name || p.registration_number}/>
            <input type="hidden" name="returnTo" value={"/products/" + encodeURIComponent(p.registration_number)}/>
            <button className="button signal" type="submit">Watch this product</button>
          </form>
        ) : <a className="button signal" href="/register">Create account to watch</a>}
      </div>

      <div className="profile-grid">
        <section className="profile-card">
          <span className="stat-label">Registrant</span>
          <a className="profile-link" href={"/registrants/" + encodeURIComponent(p.registrant)}>{p.registrant || "—"}</a>
        </section>
        <section className="profile-card">
          <span className="stat-label">Registration date</span>
          <strong>{p.registration_date || "—"}</strong>
        </section>
        <section className="profile-card">
          <span className="stat-label">Current source</span>
          <strong>{p.is_current ? "Present" : "Not present"}</strong>
        </section>
      </div>

      <section className="workspace-section">
        <div className="workspace-heading"><h3>Active ingredients</h3><span>Follow an ingredient to monitor the competitive set.</span></div>
        <div className="chip-list">
          {(p.active_ingredients ?? []).map((ingredient: string) => <a className="entity-chip" href={"/ingredients/" + encodeURIComponent(ingredient)} key={ingredient}>{ingredient}</a>)}
          {!(p.active_ingredients ?? []).length && <span className="source-note">No ingredient data supplied in the current source row.</span>}
        </div>
      </section>

      <section className="workspace-section">
        <div className="workspace-heading"><h3>Regulatory history</h3><span>ACVM Signal events for this registration.</span></div>
        <div className="table-wrap">
          <table><thead><tr><th>Signal</th><th>Summary</th><th>Detected</th></tr></thead>
          <tbody>
            {data.events.map((event: any) => <tr key={event.id}><td><span className="badge">{event.event_type.replaceAll("_"," ")}</span></td><td>{event.summary}</td><td>{new Date(event.detected_at).toLocaleDateString("en-NZ")}</td></tr>)}
            {!data.events.length && <tr><td colSpan={3} className="source-note">No changes detected since the production baseline.</td></tr>}
          </tbody></table>
        </div>
      </section>
    </main>
  );
}
