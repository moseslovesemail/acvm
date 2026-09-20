import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getWatchlists, watchlistLimit } from "@/lib/db";

export const dynamic = "force-dynamic";

const plans = [
  { key: "watch", name: "Watch", price: "$399", limit: "3 watchlists" },
  { key: "intelligence", name: "Intelligence", price: "$799", limit: "15 watchlists" },
  { key: "pro", name: "Pro", price: "$1,500", limit: "Unlimited watchlists" }
];

export default async function Account({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const watchlists = await getWatchlists(Number(user.id));
  const limit = watchlistLimit(String(user.plan));
  const isPaid = ["active", "trialing"].includes(String(user.subscription_status));

  return (
    <main className="container dashboard">
      <div className="dash-top">
        <div>
          <div className="eyebrow">Customer account</div>
          <h2 style={{marginTop:8}}>{user.name || user.email}</h2>
          <p className="lead">{user.email}</p>
        </div>
        <form action="/api/auth/logout" method="POST"><button className="button secondary" type="submit">Sign out</button></form>
      </div>

      {params.billing === "success" && <div className="success-card">Payment received. Stripe is updating your account entitlement now.</div>}
      {params.billing === "not-configured" && <div className="notice-card">Checkout code is ready, but live Stripe keys and Price IDs have not yet been added to Railway.</div>}
      {params.billing === "already-active" && <div className="notice-card">You already have an active subscription. Plan changes will be handled through customer billing management.</div>}

      <div className="watch-summary">
        <div><strong>{String(user.plan).toUpperCase()}</strong><span>current plan</span></div>
        <div><strong>{String(user.subscription_status).toUpperCase()}</strong><span>billing status</span></div>
        <div><strong>{watchlists.length}/{limit >= 1000 ? "∞" : limit}</strong><span>watchlist usage</span></div>
      </div>

      {!isPaid && <section className="workspace-section">
        <div className="workspace-heading"><h3>Activate a paid plan</h3><span>NZD per month. Live checkout activates once Stripe credentials are connected.</span></div>
        <div className="account-plans">
          {plans.map(plan => <form className="account-plan" action="/api/checkout" method="POST" key={plan.key}>
            <input type="hidden" name="plan" value={plan.key}/>
            <span className="signal-type">{plan.limit}</span>
            <strong>{plan.name}</strong>
            <div className="account-price">{plan.price}<small>/mo</small></div>
            <button className="button signal" type="submit">Choose {plan.name}</button>
          </form>)}
        </div>
      </section>}

      <section className="workspace-section">
        <div className="workspace-heading"><h3>Account access</h3><span>V1.1 customer workspace.</span></div>
        <div className="account-links">
          <a className="profile-card" href="/watchlist"><span className="stat-label">Watchlist</span><strong>Open monitored intelligence →</strong></a>
          <a className="profile-card" href="/products"><span className="stat-label">Product explorer</span><strong>Search ACVM products →</strong></a>
          <a className="profile-card" href="/cancellations"><span className="stat-label">Market exits</span><strong>Open removal monitor →</strong></a>
        </div>
      </section>
    </main>
  );
}
