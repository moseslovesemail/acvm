import { getDashboardData } from "@/lib/db";
import { DEMO_SIGNALS } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const data = await getDashboardData();
  const events = data?.events?.length ? data.events : DEMO_SIGNALS;
  const stats = data?.stats ?? { products:"—", registrants:"—", suspended:"—" };

  return (
    <main className="container dashboard">
      <div className="dash-top">
        <div><div className="eyebrow">Intelligence workspace</div><h2 style={{marginTop:8}}>Regulatory signal dashboard</h2></div>
        <a className="button secondary" href="/products">Search products</a>
      </div>
      <div className="stats">
        <div className="stat"><div className="stat-label">Registered products</div><div className="stat-value">{stats.products}</div></div>
        <div className="stat"><div className="stat-label">Registrants</div><div className="stat-value">{stats.registrants}</div></div>
        <div className="stat"><div className="stat-label">Suspended status</div><div className="stat-value">{stats.suspended}</div></div>
        <div className="stat"><div className="stat-label">Last sync</div><div className="stat-value" style={{fontSize:18}}>{data?.lastRun?.completed_at ? new Date(data.lastRun.completed_at).toLocaleDateString("en-NZ") : "Demo"}</div></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Signal</th><th>Product</th><th>Registrant</th><th>Registration</th><th>Detected</th></tr></thead>
          <tbody>{events.map((event: any, idx: number) => (
            <tr key={event.id ?? `${event.registrationNumber}-${idx}`}>
              <td><span className="badge">{String(event.event_type ?? event.eventType).replaceAll("_"," ")}</span></td>
              <td><strong>{event.trade_name ?? event.tradeName}</strong><br/><span className="source-note">{event.summary}</span></td>
              <td>{event.registrant}</td>
              <td>{event.registration_number ?? event.registrationNumber}</td>
              <td>{new Date(event.detected_at ?? event.detectedAt).toLocaleDateString("en-NZ")}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {!data && <p className="source-note" style={{marginTop:12}}>Database not connected yet, so this page is showing the launch preview. Once Railway Postgres is attached and the sync worker runs, these figures become live.</p>}
    </main>
  );
}
