export default function Success() {
  return (
    <main className="container dashboard">
      <div className="card" style={{maxWidth:680}}>
        <div className="eyebrow">Subscription received</div>
        <h2 style={{marginTop:12}}>Welcome to ACVM Signal.</h2>
        <p>Your Stripe subscription has been created. During the MVP phase, account access can be provisioned manually while automated customer authentication is connected.</p>
        <a className="button signal" href="/dashboard">Open dashboard</a>
      </div>
    </main>
  );
}
