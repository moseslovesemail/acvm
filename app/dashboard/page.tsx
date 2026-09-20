import { getDashboardData } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const data = await getDashboardData();
  const user = await getCurrentUser();
  const events = data?.events ?? [];
  const stats = data?.stats ?? { products:"—", registrants:"—", suspended:"—", removed:"—" };

  return (
    <main className="container dashboard">
      <div className="dash-top">
        <div>
          <div className="eyebrow">Intelligence workspace</div>
          <h2 style={{marginTop:8}}>Regulatory signal dashboard</h2>
          <p className="lead">Current ACVM market state plus changes detected after the production baseline.</p>
        </div>
        <div className="dash-actions">
          <a className="button signal" href="/early-warning">Early Warning</a>
          {user && <a className="button secondary" href="/watchlist">Your watchlist</a>}
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
        <span>Last ACVM source sync: <strong>{data?.lastRun?.completed_at ? new Date(data.lastRun.completed_at).toLocaleString("en-NZ") : "Not available"}</strong></span>
        <a href="/cancellations">Open cancellation & removal monitor →</a>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Signal</th><th>Product</th><th>Registrant</th><th>Registration</th><th>Detected</th></tr></thead>
          <tbody>
            {events.map((event: any) => (
              <tr key={event.id}>
                <td><span className="badge">{String(event.event_type).replaceAll("_"," ")}</span></td>
                <td><a className="table-link" href={"/products/" + encodeURIComponent(event.registration_number)}><strong>{event.trade_name || event.registration_number}</strong></a><br/><span className="source-note">{event.summary}</span></td>
                <td><a className="table-link" href={"/registrants/" + encodeURIComponent(event.registrant || "")}>{event.registrant}</a></td>
                <td>{event.registration_number}</td>
                <td>{new Date(event.detected_at).toLocaleDateString("en-NZ")}</td>
              </tr>
            ))}
            {!events.length && <tr><td colSpan={5} className="source-note">No ACVM changes have been detected since the production baseline. Upstream EPA and MRL activity is tracked separately in Early Warning.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
