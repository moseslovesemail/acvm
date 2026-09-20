import { ensureSchema, getDb } from "../lib/db";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://web-production-ecbd57.up.railway.app";

  if (!apiKey || !from) {
    console.log(JSON.stringify({ sent: 0, configured: false, reason: "RESEND_API_KEY or ALERT_FROM_EMAIL missing" }));
    return;
  }

  const sql = getDb();
  if (!sql) throw new Error("DATABASE_URL is not configured");
  await ensureSchema();

  const rows = await sql`
    with matched as (
      select
        w.id as watch_id,
        w.entity_type,
        w.entity_value,
        w.label as watch_label,
        u.id as user_id,
        u.email,
        u.name,
        'ACVM'::text as source_family,
        e.id::text as event_key,
        e.event_type,
        e.registration_number,
        e.trade_name,
        e.registrant,
        e.detected_at,
        e.summary,
        null::text as source_url
      from acvm_watchlists w
      join acvm_users u on u.id = w.user_id
      join acvm_events e on (
        (w.entity_type = 'product' and e.registration_number = w.entity_value)
        or (w.entity_type = 'registrant' and e.registrant = w.entity_value)
        or (
          w.entity_type = 'ingredient'
          and exists (
            select 1 from acvm_products p
            where p.registration_number = e.registration_number
              and p.active_ingredients ? w.entity_value
          )
        )
      )
      where e.detected_at > w.last_alerted_at

      union all

      select
        w.id as watch_id,
        w.entity_type,
        w.entity_value,
        w.label as watch_label,
        u.id as user_id,
        u.email,
        u.name,
        r.source as source_family,
        ('reg-' || r.id)::text as event_key,
        r.signal_type as event_type,
        ''::text as registration_number,
        r.title as trade_name,
        r.applicant as registrant,
        coalesce(r.event_date::timestamptz, r.first_seen_at) as detected_at,
        r.summary,
        r.source_url
      from acvm_watchlists w
      join acvm_users u on u.id = w.user_id
      join regulatory_signals r on (
        w.entity_type = 'ingredient'
        and r.ingredients ? w.entity_value
      )
      where coalesce(r.event_date::timestamptz, r.first_seen_at) > w.last_alerted_at
    )
    select *
    from matched
    order by user_id, detected_at desc
  `;

  const grouped = new Map<number, any[]>();
  for (const row of rows) {
    const userId = Number(row.user_id);
    if (!grouped.has(userId)) grouped.set(userId, []);
    grouped.get(userId)!.push(row);
  }

  let sent = 0;
  for (const [, events] of grouped) {
    const first = events[0];
    const uniqueEvents = [...new Map(events.map((event: any) => [event.event_key, event])).values()];
    const subject = "ACVM Signal — " + uniqueEvents.length + " new regulatory signal" + (uniqueEvents.length === 1 ? "" : "s");

    const items = uniqueEvents.map((event: any) => {
      const upstream = event.source_family !== "ACVM";
      const url = upstream
        ? baseUrl + "/early-warning"
        : baseUrl + "/products/" + encodeURIComponent(event.registration_number);
      const sourceLink = event.source_url
        ? '<br><a href="' + escapeHtml(event.source_url) + '" style="color:#657b5d">Official source</a>'
        : "";

      return '<li style="margin:0 0 18px"><strong>' +
        escapeHtml(String(event.event_type).replaceAll("_", " ")) +
        '</strong> <small style="color:#69756e">' + escapeHtml(event.source_family) + '</small><br>' +
        '<a href="' + url + '" style="color:#15493b;font-weight:700">' +
        escapeHtml(event.trade_name || event.registration_number || "Regulatory activity") +
        '</a><br>' + escapeHtml(event.summary) +
        (event.registrant ? '<br><small style="color:#69756e">' + escapeHtml(event.registrant) + '</small>' : "") +
        sourceLink + '</li>';
    }).join("");

    const html = '<div style="font-family:Arial,sans-serif;color:#17211d;max-width:680px;margin:auto">' +
      '<div style="font-size:12px;letter-spacing:2px;color:#657b5d;text-transform:uppercase">ACVM Signal</div>' +
      '<h1 style="font-family:Georgia,serif;font-size:32px;color:#0d382e">Your monitored market changed.</h1>' +
      '<p>Hello ' + escapeHtml(first.name || first.email) + ',</p>' +
      '<p>These ACVM or upstream regulatory events match entities on your watchlist.</p><ul style="padding-left:20px">' +
      items +
      '</ul><p><a href="' + baseUrl + '/watchlist" style="display:inline-block;background:#b8d779;color:#082c25;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Open your watchlist</a></p>' +
      '<hr style="border:0;border-top:1px solid #dcded4;margin:28px 0">' +
      '<small style="color:#69756e">ACVM Signal is independent regulatory intelligence. EPA pipeline activity, MRL activity and source removals are signals for investigation, not proof of product approval, ACVM registration or market launch. Verify decisions against the official source.</small></div>';

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to: [first.email], subject, html })
    });

    if (!response.ok) {
      console.error("Alert send failed", first.email, response.status, await response.text());
      continue;
    }

    const watchIds = [...new Set(events.map((event: any) => Number(event.watch_id)))];
    for (const id of watchIds) {
      await sql`update acvm_watchlists set last_alerted_at = now() where id = ${id}`;
    }
    sent++;
  }

  console.log(JSON.stringify({ configured: true, usersWithSignals: grouped.size, sent, matchedRows: rows.length }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
