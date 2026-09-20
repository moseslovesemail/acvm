import { getDashboardData } from "@/lib/db";
import { DEMO_SIGNALS } from "@/lib/demo";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const data = await getDashboardData();
  const user = await getCurrentUser();
  const events = data?.events?.length ? data.events : DEMO_SIGNALS;
  const stats = data?.stats ?? { products:"—", registrants:"—", suspended:"—", removed:"—" };

  return (
    <main className="container dashboard">
      <div className="dash-top">
        <div>
          <div className="eyebrow">Intelligence workspace</div>
          <h2 style={{marginTop:8}}>Regulatory signal dashboard</h2>
          <p className="lead">Current market state plus changes detected after the production baseline.</p>
        </div>
        <div className="dash-actions">
          {user && <a className="button signal" href="/watchlist">Your watchlist</a>}
          <a className="button secondary" href="/products">Search products</a>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><div className="stat-label">Current products</div><div className="stat-value">{stats.products}</div></div>
        <div className="stat"><div className="stat-label">Registrants</div><div className="stat-value">{stats.registrants}</div></div>
        <div className="stat"><div className="stat-label">Suspended status</div><div className="stat-value">{stats.suspended}</div></div>
        <div className="stat"><div className="stat-label">Removal signals</div><div className="stat-value">{stats.removed}</div></div>
      </div>
      <div className="dashboard-meta">
        <span>Last source sync: <strong>{data?.lastRun?.completed_at ? new Date(data.lastRun.completed_at).toLocaleString("en-NZ") : "Demo"}</strong></span>
        <a href="/cancellations">Open cancellation & removal monitor →</a>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Signal</th><th>Product</th><th>Registrant</th><th>Registration</th><th>Detected</th></tr></thead>
          <tbody>{events.map((event: any, idx: number) => (
            <tr key={event.id ?? String(event.registrationNumber) + "-" + idx}>
              <td><span className="badge">{String(event.event_type ?? event.eventType).replaceAll("_"," ")}</span></td>
              <td><a className="table-link" href={"/products/" + encodeURIComponent(event.registration_number ?? event.registrationNumber)}><strong>{event.trade_name ?? event.tradeName}</strong></a><br/><span className="source-note">{event.summary}</span></td>
              <td><a className="table-link" href={"/registrants/" + encodeURIComponent(event.registrant || "")}>{event.registrant}</a></td>
              <td>{event.registration_number ?? event.registrationNumber}</td>
              <td>{new Date(event.detected_at ?? event.detectedAt).toLocaleDateString("en-NZ")}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {!data && <p className="source-note" style={{marginTop:12}}>Database not connected yet, so this page is showing the launch preview.</p>}
    </main>
  );
}
