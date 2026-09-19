import "./globals.css";
import type { Metadata } from "next";
import BrandMark from "@/components/BrandMark";

export const metadata: Metadata = {
  title: "ACVM Signal — Agricultural Product Regulatory Intelligence",
  description: "Track registrations, cancellations, status changes and competitive movement in New Zealand's ACVM market."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NZ">
      <body>
        <header className="site-header">
          <div className="container nav">
            <a className="brand" href="/"><BrandMark /></a>
            <nav className="navlinks">
              <a href="/#product">Intelligence</a>
              <a href="/products">Products</a>
              <a href="/#pricing">Plans</a>
              <a href="/dashboard" className="button nav-button">Open dashboard</a>
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
