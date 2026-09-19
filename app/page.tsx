import { DEMO_SIGNALS } from "@/lib/demo";
import MarketIllustration from "@/components/MarketIllustration";

const capabilities = [
  ["01", "Signal Feed", "New registrations, cancellations, suspensions and material product changes in one chronological feed."],
  ["02", "Product Explorer", "Search by trade name, registrant, registration number, product type or active ingredient."],
  ["03", "Competitor Monitor", "Track registrants and portfolios so product teams see market movement without repetitive register searches."],
  ["04", "Market Entry", "Map active ingredients, incumbent products and recent entrants before committing regulatory and commercial effort."]
];

const buyerGroups = [
  "Agchemical manufacturers",
  "Veterinary pharmaceuticals",
  "Rural distributors",
  "Regulatory consultants",
  "Agricultural retailers",
  "Market-entry teams"
];

const plans = [
  { key:"watch", name:"Watch", price:"$399", text:"For a focused product or competitor watchlist.", features:["3 watchlists","Weekly regulatory brief","Full product search","CSV export"] },
  { key:"intelligence", name:"Intelligence", price:"$799", text:"For product managers and regulatory teams.", features:["15 watchlists","Daily signal feed","Registrant portfolio views","Priority exports"], featured:true },
  { key:"pro", name:"Pro", price:"$1,500", text:"For multi-brand portfolios and market-entry teams.", features:["Unlimited watchlists","Priority regulatory alerts","API / data export","Multi-user access"] }
];

export default function Home() {
  return (
    <main>
      <section className="hero-wrap">
        <div className="container hero">
          <div className="hero-copy">
            <div className="eyebrow eyebrow--light">New Zealand agricultural regulatory intelligence</div>
            <h1>Clearer signals.<br/>Faster decisions.</h1>
            <p className="lead lead--hero">ACVM Signal turns public MPI product data into a commercial monitoring layer for veterinary medicines, agricultural chemicals and vertebrate toxic agents.</p>
            <div className="hero-actions">
              <a className="button signal" href="/dashboard">Explore the signal dashboard <span>→</span></a>
              <a className="button ghost" href="/products">Search 3,041 products</a>
            </div>
            <div className="hero-proof">
              <span><strong>51,792</strong> source rows monitored</span>
              <span><strong>3,041</strong> ACVM products normalised</span>
              <span><strong>Daily</strong> change detection</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-visual-kicker">Monitor · Analyse · Anticipate</div>
            <MarketIllustration />
          </div>
        </div>
      </section>

      <section className="buyers">
        <div className="container">
          <p className="buyers-label">Built for teams that need to know what changed before the next manual register search</p>
          <div className="buyer-list">
            {buyerGroups.map((buyer) => <span key={buyer}>{buyer}</span>)}
          </div>
        </div>
      </section>

      <section className="section" id="product">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">The intelligence layer</div>
              <h2>From regulatory register to commercial signal.</h2>
            </div>
            <p className="lead">MPI tells you what exists. ACVM Signal is structured around the questions commercial and regulatory teams actually ask: what changed, who moved, what does it affect, and what deserves attention now?</p>
          </div>
          <div className="grid-4">
            {capabilities.map(([number,title,body]) => (
              <div className="card capability-card" key={title}>
                <div className="card-number">{number}</div>
                <div className="card-icon-line" />
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="intelligence-band">
        <div className="container intelligence-grid">
          <div>
            <div className="eyebrow eyebrow--light">Live product intelligence</div>
            <h2>One source.<br/>Four commercial questions.</h2>
            <div className="question-list">
              <div><span>01</span><strong>What entered the market?</strong></div>
              <div><span>02</span><strong>What changed?</strong></div>
              <div><span>03</span><strong>Which competitor moved?</strong></div>
              <div><span>04</span><strong>What should we watch next?</strong></div>
            </div>
          </div>
          <aside className="signal-panel">
            <div className="panel-head">
              <div>
                <span className="panel-overline">Regulatory feed</span>
                <strong>Current signal layer</strong>
              </div>
              <span className="live"><span className="live-dot"/>MPI monitored</span>
            </div>
            {DEMO_SIGNALS.map((signal) => (
              <div className="signal-item" key={signal.registrationNumber}>
                <div className="signal-type">{signal.eventType.replaceAll("_"," ")}</div>
                <div className="signal-title">{signal.tradeName}</div>
                <div className="signal-meta">{signal.registrant} · {signal.registrationNumber} · {signal.detectedAt}</div>
              </div>
            ))}
            <div className="signal-item">
              <div className="signal-type">Change detection</div>
              <div className="signal-title">Daily snapshots create the history the source register does not package for you.</div>
              <div className="signal-meta">Registrant, status, ingredient and product-field changes are diffed automatically.</div>
            </div>
          </aside>
        </div>
      </section>

      <section className="section proof-section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Production baseline</div>
              <h2>Built on a working data pipeline, not a mock dataset.</h2>
            </div>
            <p className="lead">The initial production ingest has been verified against the live MPI register. Re-running the same source produces no false changes, giving the monitoring layer a stable baseline.</p>
          </div>
          <div className="proof-grid">
            <div className="proof-card"><div className="proof-number">51,792</div><p>source rows parsed from the MPI ACVM register</p></div>
            <div className="proof-card"><div className="proof-number">3,041</div><p>distinct products normalised into the intelligence database</p></div>
            <div className="proof-card"><div className="proof-number">0</div><p>false change events on an unchanged repeat snapshot</p></div>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Plans</div>
              <h2>Specialist intelligence for specialist markets.</h2>
            </div>
            <p className="lead">Proposed launch pricing in NZD per month. The value is operational: less manual monitoring, earlier competitive awareness and faster regulatory research.</p>
          </div>
          <div className="price-grid">
            {plans.map((plan) => (
              <form className={`price ${plan.featured ? "featured" : ""}`} action="/api/checkout" method="POST" key={plan.key}>
                <input type="hidden" name="plan" value={plan.key}/>
                {plan.featured && <div className="recommended">Core plan</div>}
                <h3>{plan.name}</h3>
                <div className="price-amount">{plan.price}<small>/mo</small></div>
                <p>{plan.text}</p>
                <ul>{plan.features.map(f => <li key={f}>{f}</li>)}</ul>
                <button className={`button ${plan.featured ? "signal" : "secondary"}`} type="submit">Start subscription</button>
              </form>
            ))}
          </div>
          <p className="source-note" style={{marginTop:14}}>Prices are proposed launch pricing and can be changed in Stripe without rebuilding the application.</p>
        </div>
      </section>
    </main>
  );
}
