import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getWatchlists, getWatchlistEvents, watchlistLimit } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Watchlist({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const items = await getWatchlists(Number(user.id));
  const events = await getWatchlistEvents(Number(user.id), 80);
  const limit = watchlistLimit(String(user.plan));

  return (
    <main className="container dashboard">
      <div className="dash-top">
        <div>
          <div className="eyebrow">Your intelligence</div>
          <h2 style={{marginTop:8}}>Watchlist</h2>
          <p className="lead">Follow products, registrants and active ingredients. ACVM changes and upstream EPA/MRL activity collect here automatically.</p>
        </div>
        <div className="dash-actions">
          <a className="button signal" href="/early-warning">Early Warning</a>
          <a className="button secondary" href="/products">Find products</a>
        </div>
      </div>

      {params.error === "limit" && <div className="form-error">Your current plan allows {limit} watchlist items. Upgrade to monitor more entities.</div>}

      <div className="watch-summary">
        <div><strong>{items.length}</strong><span>of {limit} watchlist places used</span></div>
        <div><strong>{events.length}</strong><span>matching signals in your current feed</span></div>
        <div><strong>{String(user.plan).toUpperCase()}</strong><span>{user.subscription_status} account</span></div>
      </div>

      <section className="workspace-section">
        <div className="workspace-heading"><h3>Monitored entities</h3><span>Add entities from product, registrant and ingredient pages.</span></div>
        <div className="watch-grid">
          {items.map((item: any) => (
            <article className="watch-card" key={item.id}>
              <div className="signal-type">{item.entity_type}</div>
              <strong>{item.label || item.entity_value}</strong>
              <small>{item.entity_value}</small>
              <form action="/api/watchlist" method="POST">
                <input type="hidden" name="action" value="remove"/>
                <input type="hidden" name="id" value={item.id}/>
                <input type="hidden" name="returnTo" value="/watchlist"/>
                <button className="text-button" type="submit">Remove</button>
              </form>
            </article>
          ))}
          {!items.length && <div className="empty-state">Nothing monitored yet. Search the ACVM register and add your first product, company or ingredient.</div>}
        </div>
      </section>

      <section className="workspace-section">
        <div className="workspace-heading"><h3>Signals matching your watchlist</h3><span>ACVM and upstream regulatory activity, newest first.</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Signal</th><th>Matched watch</th><th>Product / activity</th><th>Registrant / applicant</th><th>Detected</th></tr></thead>
            <tbody>
              {events.map((event: any) => {
                const upstream = event.source_family !== "ACVM";
                const href = upstream ? "/early-warning" : "/products/" + encodeURIComponent(event.registration_number);
                return (
                  <tr key={[event.id,event.entity_type,event.entity_value].join("-")}>
                    <td>
                      <span className="badge">{String(event.event_type).replaceAll("_"," ")}</span><br/>
                      <span className="source-note">{event.source_family}</span>
                    </td>
                    <td><strong>{event.watch_label || event.entity_value}</strong><br/><span className="source-note">{event.entity_type}</span></td>
                    <td><a className="table-link" href={href}>{event.trade_name || event.registration_number || "Regulatory activity"}</a><br/><span className="source-note">{event.summary}</span></td>
                    <td>{event.registrant || "—"}</td>
                    <td>{new Date(event.detected_at).toLocaleDateString("en-NZ")}</td>
                  </tr>
                );
              })}
              {!events.length && <tr><td colSpan={5} className="source-note">No matching regulatory events yet. Your watchlist is active.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
