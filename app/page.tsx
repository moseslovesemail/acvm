import { DEMO_SIGNALS } from "@/lib/demo";

const capabilities = [
  ["Signal Feed", "New registrations, cancellations, suspensions and material product changes in one chronological feed."],
  ["Product Explorer", "Search by trade name, registrant, registration number, product type or active ingredient."],
  ["Competitor Monitor", "Track registrants and portfolios so product managers see market movement without manual register searches."],
  ["Market Entry", "Identify active ingredients, incumbent products and recent entrants before committing regulatory and commercial effort."]
];

const plans = [
  { key:"watch", name:"Watch", price:"$399", text:"For a focused product or competitor watchlist.", features:["3 watchlists","Weekly regulatory brief","Full product search","CSV export"] },
  { key:"intelligence", name:"Intelligence", price:"$799", text:"For product managers and regulatory teams.", features:["15 watchlists","Daily signal feed","Registrant portfolio views","Priority exports"], featured:true },
  { key:"pro", name:"Pro", price:"$1,500", text:"For multi-brand portfolios and market-entry teams.", features:["Unlimited watchlists","Near-real-time alerts","API / data export","Multi-user access"] }
];

export default function Home() {
  return (
    <main>
      <section className="container hero">
        <div>
          <div className="eyebrow">New Zealand regulatory intelligence</div>
          <h1>Know what changed in the ACVM market.</h1>
          <p className="lead">ACVM Signal turns public MPI registration data into a commercial change feed for veterinary medicines, agricultural chemicals and vertebrate toxic agents.</p>
          <div className="hero-actions">
            <a className="button signal" href="/dashboard">View signal dashboard</a>
            <a className="button secondary" href="#pricing">See pricing</a>
          </div>
          <p className="source-note" style={{marginTop:16}}>Built from official MPI ACVM register data and related regulatory lists.</p>
        </div>
        <aside className="signal-panel">
          <div className="panel-head"><strong>Signal feed</strong><span className="live"><span className="live-dot"/>Source monitored</span></div>
          {DEMO_SIGNALS.map((signal) => (
            <div className="signal-item" key={signal.registrationNumber}>
              <div className="signal-type">{signal.eventType.replaceAll("_"," ")}</div>
              <div className="signal-title">{signal.tradeName}</div>
              <div className="signal-meta">{signal.registrant} · {signal.registrationNumber} · {signal.detectedAt}</div>
            </div>
          ))}
          <div className="signal-item">
            <div className="signal-type">Change detection</div>
            <div className="signal-title">Daily snapshots create the history MPI does not package for you.</div>
            <div className="signal-meta">Registrant, status, ingredient and product-field changes are diffed automatically.</div>
          </div>
        </aside>
      </section>

      <section className="section" id="product">
        <div className="container">
          <div className="section-head">
            <div><div className="eyebrow">Product</div><h2>From register to intelligence layer.</h2></div>
            <p className="lead">The register answers “what is registered?”. ACVM Signal answers “what changed, who is moving, what does it affect, and what should I watch next?”.</p>
          </div>
          <div className="grid-4">
            {capabilities.map(([title,body]) => <div className="card" key={title}><h3>{title}</h3><p>{body}</p></div>)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div><div className="eyebrow">Working layers</div><h2>Simple enough to launch. Structured enough to compound.</h2></div>
            <p className="lead">One source repository feeds the public product, the intelligence database and the scheduled sync worker.</p>
          </div>
          <div className="grid-4">
            <div className="card"><div className="kpi">01</div><h3>MPI ingest</h3><p>Discover the current CSV endpoint, download, normalise and preserve source provenance.</p></div>
            <div className="card"><div className="kpi">02</div><h3>Snapshot + diff</h3><p>Postgres retains the last state and records only commercially meaningful changes.</p></div>
            <div className="card"><div className="kpi">03</div><h3>Signal UI</h3><p>Search products, inspect recent events and build competitor or ingredient watchlists.</p></div>
            <div className="card"><div className="kpi">04</div><h3>Stripe</h3><p>Subscription checkout for Watch, Intelligence and Pro plans, ready for account gating.</p></div>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="container">
          <div className="section-head">
            <div><div className="eyebrow">Pricing</div><h2>Specialist B2B pricing.</h2></div>
            <p className="lead">Launch pricing in NZD per month. Keep the buyer pool narrow and the value proposition operational: less manual monitoring, earlier competitive awareness, and faster regulatory research.</p>
          </div>
          <div className="price-grid">
            {plans.map((plan) => (
              <form className={`price ${plan.featured ? "featured" : ""}`} action="/api/checkout" method="POST" key={plan.key}>
                <input type="hidden" name="plan" value={plan.key}/>
                <h3>{plan.name}</h3>
                <div className="price-amount">{plan.price}<small>/mo</small></div>
                <p>{plan.text}</p>
                <ul>{plan.features.map(f => <li key={f}>{f}</li>)}</ul>
                <button className={`button ${plan.featured ? "signal" : ""}`} type="submit">Start subscription</button>
              </form>
            ))}
          </div>
          <p className="source-note" style={{marginTop:14}}>Prices are proposed launch pricing and can be changed in Stripe without rebuilding the app.</p>
        </div>
      </section>
    </main>
  );
}
