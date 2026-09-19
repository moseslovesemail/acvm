export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup ${compact ? "brand-lockup--compact" : ""}`} aria-label="ACVM Signal">
      <svg className="brand-icon" viewBox="0 0 64 64" role="img" aria-hidden="true">
        <path d="M32 4 54 13v17c0 15.6-8.6 24.8-22 30C18.6 54.8 10 45.6 10 30V13L32 4Z" fill="currentColor" opacity=".12"/>
        <path d="M32 6.5 51.5 14.4v15.2c0 13.7-7.2 22-19.5 27.6C19.7 51.6 12.5 43.3 12.5 29.6V14.4L32 6.5Z" fill="none" stroke="currentColor" strokeWidth="2"/>
        <path d="M19.5 31.8c4.5-8.2 10.2-11.6 17.2-10.3-1.6 7.9-6.6 12.8-15 14.8 1.4-2.9 3.7-5.7 7-8.3-3.7 1.4-6.8 2.7-9.2 3.8Z" fill="currentColor"/>
        <path d="M17 42.5c7-4.5 14.5-6.8 22.5-6.9 4.4 0 7.5.5 9.5 1.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".8"/>
        <path d="M17.5 47c7.8-3.6 15.6-5.2 23.6-4.8 3.1.2 5.5.5 7.3 1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".45"/>
        <path d="M36.5 25.5h4l2.2-4.2 3.2 9 2.2-4h3.4" fill="none" stroke="#b8d779" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="brand-wordmark">
        <span className="brand-acvm">ACVM</span>
        <span className="brand-signal">Signal</span>
      </span>
    </span>
  );
}
