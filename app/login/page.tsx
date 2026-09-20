export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="container auth-shell">
      <section className="auth-card">
        <div className="eyebrow">Customer access</div>
        <h2>Sign in to ACVM Signal</h2>
        <p className="lead">Open your saved watchlists, monitored signals and subscription account.</p>
        {params.error && <div className="form-error">That email/password combination was not accepted.</div>}
        <form action="/api/auth/login" method="POST" className="stack-form">
          <label>Email<input name="email" type="email" required autoComplete="email"/></label>
          <label>Password<input name="password" type="password" required autoComplete="current-password"/></label>
          <button className="button signal" type="submit">Sign in</button>
        </form>
        <p className="form-foot">New to ACVM Signal? <a href="/register">Create an account</a>.</p>
      </section>
    </main>
  );
}
