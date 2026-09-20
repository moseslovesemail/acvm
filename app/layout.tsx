import "./globals.css";
import type { Metadata } from "next";
import BrandMark from "@/components/BrandMark";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ACVM Signal — Agricultural Product Regulatory Intelligence",
  description: "Track registrations, cancellations, status changes and competitive movement in New Zealand's ACVM market."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="en-NZ">
      <body>
        <header className="site-header">
          <div className="container nav">
            <a className="brand" href="/"><BrandMark /></a>
            <nav className="navlinks">
              <a href="/#product">Intelligence</a>
              <a href="/products">Products</a>
              <a href="/early-warning">Early Warning</a>
              <a href="/cancellations">Market exits</a>
              {user ? <a href="/watchlist">Watchlist</a> : <a href="/#pricing">Plans</a>}
              {user ? (
                <a href="/account" className="button nav-button">Account</a>
              ) : (
                <a href="/login" className="button nav-button">Sign in</a>
              )}
            </nav>
          </div>
        </header>
        {children}
        <footer className="footer">
          <div className="container footer-grid">
            <div>
              <BrandMark compact />
              <p>Independent New Zealand agricultural product regulatory intelligence.</p>
            </div>
            <div className="footer-copy">
              This work is based on/includes MPI data licensed by Ministry for Primary Industries for re-use under CC BY 4.0. ACVM Signal is not affiliated with or endorsed by MPI. Regulatory information should be checked against the official source before acting.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
