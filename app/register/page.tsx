export default async function Register({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="container auth-shell">
      <section className="auth-card">
        <div className="eyebrow">Founding access</div>
        <h2>Create your ACVM Signal account</h2>
        <p className="lead">Start with three monitored entities while the founding-partner programme is open.</p>
        {params.error && <div className="form-error">Use a valid email and a password of at least eight characters.</div>}
        <form action="/api/auth/register" method="POST" className="stack-form">
          <label>Name<input name="name" type="text" autoComplete="name"/></label>
          <label>Email<input name="email" type="email" required autoComplete="email"/></label>
          <label>Password<input name="password" type="password" minLength={8} required autoComplete="new-password"/></label>
          <button className="button signal" type="submit">Create account</button>
        </form>
        <p className="form-foot">Already registered? <a href="/login">Sign in</a>.</p>
      </section>
    </main>
  );
}
