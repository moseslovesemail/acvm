export default function MarketIllustration() {
  return (
    <svg className="market-illustration" viewBox="0 0 820 560" role="img" aria-label="New Zealand agricultural regulatory intelligence landscape">
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#dfe7dd"/>
          <stop offset="60%" stopColor="#eef1e8"/>
          <stop offset="100%" stopColor="#e7dfcf"/>
        </linearGradient>
        <linearGradient id="hill" x1="0" x2="1">
          <stop offset="0%" stopColor="#6f8567"/>
          <stop offset="100%" stopColor="#486557"/>
        </linearGradient>
        <linearGradient id="field" x1="0" x2="1">
          <stop offset="0%" stopColor="#b9c697"/>
          <stop offset="100%" stopColor="#80976f"/>
        </linearGradient>
        <linearGradient id="glass" x1="0" x2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".9"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity=".48"/>
        </linearGradient>
      </defs>

      <rect width="820" height="560" rx="34" fill="url(#sky)"/>
      <circle cx="642" cy="96" r="46" fill="#f5e8c9" opacity=".78"/>
      <path d="M0 245 102 180 198 226 308 139 413 222 520 164 629 228 720 180 820 227V330H0Z" fill="#9ca998" opacity=".7"/>
      <path d="M0 278 120 223 245 267 348 198 467 275 590 220 708 272 820 236V353H0Z" fill="url(#hill)"/>
      <path d="M0 330c128-37 235-34 330 8 111 49 260 38 490-28v250H0Z" fill="url(#field)"/>
      <path d="M0 384c126-53 252-45 378 25 123 68 270 61 442-23v174H0Z" fill="#9aaa7a"/>
      <path d="M0 452c156-54 306-43 450 34 123 66 246 63 370 12v62H0Z" fill="#6c835c"/>
      <path d="M8 489c163-36 325-17 486 56" stroke="#d7dcbf" strokeWidth="3" opacity=".6" fill="none"/>
      <path d="M45 442c149-36 284-20 405 48" stroke="#d7dcbf" strokeWidth="2" opacity=".5" fill="none"/>

      <g opacity=".9">
        <g transform="translate(174 353)">
          <ellipse cx="0" cy="0" rx="23" ry="13" fill="#1b2f29"/>
          <circle cx="22" cy="-5" r="8" fill="#1b2f29"/>
          <rect x="-16" y="8" width="4" height="18" rx="2" fill="#1b2f29"/>
          <rect x="10" y="8" width="4" height="18" rx="2" fill="#1b2f29"/>
          <path d="M-16-4c10-8 18-4 22 4-9 3-16 4-22 4Z" fill="#f2eee3"/>
        </g>
        <g transform="translate(252 378) scale(.78)">
          <ellipse cx="0" cy="0" rx="23" ry="13" fill="#f6f3ea"/>
          <circle cx="22" cy="-5" r="8" fill="#f6f3ea"/>
          <rect x="-15" y="8" width="4" height="18" rx="2" fill="#21332d"/>
          <rect x="10" y="8" width="4" height="18" rx="2" fill="#21332d"/>
          <path d="M25-10 32-15M20-10 15-16" stroke="#21332d" strokeWidth="3" strokeLinecap="round"/>
        </g>
        <g transform="translate(304 389) scale(.62)">
          <ellipse cx="0" cy="0" rx="23" ry="13" fill="#f6f3ea"/>
          <circle cx="22" cy="-5" r="8" fill="#f6f3ea"/>
          <rect x="-15" y="8" width="4" height="18" rx="2" fill="#21332d"/>
          <rect x="10" y="8" width="4" height="18" rx="2" fill="#21332d"/>
        </g>
      </g>

      <g transform="translate(60 364)">
        <rect x="0" y="28" width="70" height="112" rx="16" fill="#f4efe4" stroke="#d5d4c7"/>
        <rect x="16" y="0" width="38" height="34" rx="7" fill="#173e32"/>
        <path d="M19 90c19-27 35-34 48-22-5 24-21 37-48 39 7-8 15-15 26-21-10 2-19 3-26 4Z" fill="#6f8966"/>
        <rect x="82" y="61" width="46" height="79" rx="12" fill="#523f2d" opacity=".92"/>
        <rect x="91" y="46" width="28" height="20" rx="5" fill="#1c312b"/>
        <rect x="139" y="49" width="58" height="91" rx="13" fill="#ede8db" stroke="#d5d4c7"/>
        <rect x="150" y="31" width="36" height="22" rx="5" fill="#2f403a"/>
      </g>

      <g transform="translate(510 112)">
        <rect width="262" height="194" rx="22" fill="url(#glass)" stroke="#ffffff" strokeOpacity=".8"/>
        <text x="24" y="32" fill="#173e32" fontSize="14" fontWeight="700" letterSpacing="1.3">REGULATORY MONITOR</text>
        <text x="24" y="56" fill="#6b786f" fontSize="11">ACVM market changes</text>
        <path d="M25 126 62 111 92 119 126 84 157 97 196 65 234 75" fill="none" stroke="#173e32" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="126" cy="84" r="5" fill="#b8d779"/>
        <circle cx="196" cy="65" r="5" fill="#b8d779"/>
        <rect x="26" y="149" width="32" height="19" rx="4" fill="#cfdab5"/>
        <rect x="67" y="139" width="32" height="29" rx="4" fill="#aebe8b"/>
        <rect x="108" y="132" width="32" height="36" rx="4" fill="#849a72"/>
        <rect x="149" y="119" width="32" height="49" rx="4" fill="#607b65"/>
        <rect x="190" y="104" width="32" height="64" rx="4" fill="#355c4b"/>
      </g>

      <g transform="translate(555 342)">
        <rect width="210" height="142" rx="20" fill="#123c31" opacity=".96"/>
        <text x="20" y="30" fill="#dce7d6" fontSize="11" letterSpacing="1.5">LATEST SIGNAL</text>
        <text x="20" y="60" fill="#fff" fontSize="22" fontWeight="700">Product change</text>
        <text x="20" y="84" fill="#b8c6bd" fontSize="12">Registrant · ingredient · status</text>
        <line x1="20" y1="104" x2="190" y2="104" stroke="#547064"/>
        <circle cx="28" cy="123" r="5" fill="#b8d779"/>
        <text x="42" y="127" fill="#dce7d6" fontSize="11">MPI source monitored</text>
      </g>

      <g transform="translate(434 85)" opacity=".62">
        <path d="M35 4c7 17 16 29 27 38-2 20-11 39-27 57-16-19-24-39-24-58C22 29 30 17 35 4Z" fill="#173e32"/>
        <circle cx="35" cy="28" r="4" fill="#dff09e"/>
        <circle cx="28" cy="53" r="3" fill="#dff09e"/>
        <circle cx="42" cy="72" r="4" fill="#dff09e"/>
        <path d="M35 28 28 53 42 72" stroke="#dff09e" strokeWidth="1.6" fill="none"/>
        <circle cx="35" cy="53" r="43" fill="none" stroke="#173e32" strokeOpacity=".25"/>
        <circle cx="35" cy="53" r="58" fill="none" stroke="#173e32" strokeOpacity=".16"/>
      </g>
    </svg>
  );
}
