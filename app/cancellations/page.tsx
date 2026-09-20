import { getCancellationEvents } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Cancellations() {
  const events = await getCancellationEvents(100);
  return (
    <main className="container dashboard">
      <div className="dash-top">
        <div>
          <div className="eyebrow">Market exits</div>
          <h2 style={{marginTop:8}}>Cancellation & removal monitor</h2>
          <p className="lead">Confirmed status changes labelled cancelled plus products absent from two consecutive current-register snapshots.</p>
        </div>
      </div>
      <div className="notice-card">A <strong>source removal</strong> is an intelligence signal, not by itself proof of formal cancellation. ACVM Signal waits for two consecutive missing snapshots and flags the product for verification against MPI cancellation information.</div>
      <div className="table-wrap"><table><thead><tr><th>Signal</th><th>Product</th><th>Registrant</th><th>Detected</th></tr></thead>
      <tbody>{events.map((e: any) => <tr key={e.id}><td><span className="badge">{e.event_type.replaceAll("_"," ")}</span></td><td><a className="table-link" href={"/products/" + encodeURIComponent(e.registration_number)}>{e.trade_name || e.registration_number}</a><br/><span className="source-note">{e.summary}</span></td><td>{e.registrant}</td><td>{new Date(e.detected_at).toLocaleDateString("en-NZ")}</td></tr>)}
      {!events.length && <tr><td colSpan={4} className="source-note">No cancellation/removal events have been created since the production baseline.</td></tr>}</tbody></table></div>
    </main>
  );
}
