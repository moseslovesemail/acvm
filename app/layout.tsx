import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ACVM Signal — Agricultural Product Regulatory Intelligence",
  description: "Track registrations, cancellations, status changes and competitive movement in New Zealand's ACVM market."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NZ">
      <body>
        <header className="container nav">
          <a className="brand" href="/"><span className="brand-mark" />ACVM Signal</a>
          <nav className="navlinks">
            <a href="/#product">Product</a>
            <a href="/#pricing">Pricing</a>
            <a href="/products">Products</a>
            <a href="/dashboard" className="button secondary">Open dashboard</a>
          </nav>
        </header>
        {children}
        <footer className="footer">
          <div className="container">
            <strong>ACVM Signal</strong> — independent regulatory intelligence. This work is based on/includes MPI data licensed by Ministry for Primary Industries for re-use under CC BY 4.0. ACVM Signal is not affiliated with or endorsed by MPI. Regulatory information should be checked against the official source before acting.
          </div>
        </footer>
      </body>
    </html>
  );
}
