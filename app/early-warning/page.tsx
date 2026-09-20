import { getEarlyWarningSignals, getEarlyWarningStats } from "@/lib/db";

export const dynamic = "force-dynamic";

function level(score: number) {
  if (score >= 85) return "High";
  if (score >= 70) return "Elevated";
  return "Monitor";
}

export default async function EarlyWarning({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const params = await searchParams;
  const source = params.source || "all";
  const allSignals = await getEarlyWarningSignals(150);
  const stats = await getEarlyWarningStats();
  const signals = source === "all"
    ? allSignals
    : allSignals.filter((signal: any) => signal.source === source);

  return (
    <main className="container dashboard">
      <div className="dash-top">
        <div>
          <div className="eyebrow">V1.2 · upstream intelligence</div>
          <h2 style={{marginTop:8}}>Early Warning</h2>
          <p className="lead">Public regulatory activity that can appear before, alongside, or outside an ACVM registration event. Each stage remains separately sourced and labelled.</p>
        </div>
        <a className="button secondary" href="/dashboard">ACVM dashboard</a>
      </div>

      <div className="stats">
        <div className="stat"><div className="stat-label">Upstream signals</div><div className="stat-value">{stats?.signals ?? "—"}</div></div>
        <div className="stat"><div className="stat-label">EPA HSNO</div><div className="stat-value">{stats?.epa ?? "—"}</div></div>
        <div className="stat"><div className="stat-label">MPI MRL</div><div className="stat-value">{stats?.mrl ?? "—"}</div></div>
        <div className="stat"><div className="stat-label">Last 90 days</div><div className="stat-value">{stats?.recent ?? "—"}</div></div>
      </div>

      <div className="signal-method">
        <strong>How to read the score</strong>
        <span>Source stage + current NZ product competition + corroborating regulatory activity. It is an evidence-priority score, not a prediction of approval or market entry.</span>
      </div>

      <div className="filter-tabs">
        <a className={source === "all" ? "active" : ""} href="/early-warning">All</a>
        <a className={source === "EPA_HSNO" ? "active" : ""} href="/early-warning?source=EPA_HSNO">EPA HSNO</a>
        <a className={source === "MPI_MRL" ? "active" : ""} href="/early-warning?source=MPI_MRL">MPI MRL</a>
      </div>

      <div className="warning-feed">
        {signals.map((signal: any) => {
          const score = Number(signal.signal_score || 0);
          const ingredients = signal.ingredients ?? [];
          return (
            <article className="warning-card" key={signal.id}>
              <div className="warning-score">
                <span>{score}</span>
                <small>{level(score)}</small>
              </div>
              <div className="warning-main">
                <div className="warning-overline">
                  <span className="badge">{signal.source === "EPA_HSNO" ? "EPA HSNO" : "MPI MRL"}</span>
                  <span>{signal.status}</span>
                  <span>{signal.event_date ? new Date(signal.event_date + "T00:00:00").toLocaleDateString("en-NZ") : "Date not parsed"}</span>
                </div>
                <h3>{signal.title}</h3>
                <p>{signal.summary}</p>
                <div className="chip-list">
                  {ingredients.map((ingredient: string) => (
                    <a className="entity-chip" href={"/ingredients/" + encodeURIComponent(ingredient)} key={ingredient}>{ingredient}</a>
                  ))}
                  {!ingredients.length && <span className="source-note">No ingredient could yet be resolved to the ACVM ingredient dictionary.</span>}
                </div>
                <div className="warning-evidence">
                  <span><strong>{signal.matching_products}</strong> current ACVM products</span>
                  <span><strong>{signal.matching_registrants}</strong> registrants</span>
                  <span><strong>{signal.related_signals}</strong> related upstream signals</span>
                </div>
              </div>
              <div className="warning-actions">
                <a className="text-button" href={signal.source_url} target="_blank" rel="noreferrer">Official source ↗</a>
                {ingredients.length === 1 && <a className="text-button" href={"/ingredients/" + encodeURIComponent(ingredients[0])}>Ingredient intelligence →</a>}
              </div>
            </article>
          );
        })}
        {!signals.length && <div className="empty-state">No upstream signals have been ingested yet. The Early Warning worker will populate this view from EPA and MPI sources.</div>}
      </div>

      <p className="source-note" style={{marginTop:20}}>
        ACVM Signal does not treat an EPA decision or MRL consultation as proof that a product will be registered or launched. These records are surfaced as earlier regulatory evidence for investigation.
      </p>
    </main>
  );
}
