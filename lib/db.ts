import postgres, { type Sql } from "postgres";
import type { Product } from "./types";

let client: Sql | null = null;

export function getDb(): Sql | null {
  if (!process.env.DATABASE_URL) return null;
  if (!client) client = postgres(process.env.DATABASE_URL, { max: 8, onnotice: () => {} });
  return client;
}

export async function ensureSchema() {
  const sql = getDb();
  if (!sql) return false;

  await sql`
    create table if not exists acvm_products (
      registration_number text primary key,
      trade_name text not null default '',
      registrant text not null default '',
      status text not null default '',
      product_types jsonb not null default '[]'::jsonb,
      active_ingredients jsonb not null default '[]'::jsonb,
      registration_date text,
      nz_agent text,
      raw jsonb not null default '[]'::jsonb,
      first_seen_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      last_seen_run_id bigint,
      missing_count integer not null default 0,
      is_current boolean not null default true
    )
  `;
  await sql`alter table acvm_products add column if not exists last_seen_run_id bigint`;
  await sql`alter table acvm_products add column if not exists missing_count integer not null default 0`;
  await sql`alter table acvm_products add column if not exists is_current boolean not null default true`;

  await sql`
    create table if not exists acvm_events (
      id bigserial primary key,
      fingerprint text unique not null,
      event_type text not null,
      registration_number text not null,
      trade_name text not null default '',
      registrant text not null default '',
      detected_at timestamptz not null default now(),
      summary text not null,
      payload jsonb not null default '{}'::jsonb
    )
  `;

  await sql`
    create table if not exists acvm_sync_runs (
      id bigserial primary key,
      started_at timestamptz not null default now(),
      completed_at timestamptz,
      source_url text,
      row_count integer,
      product_count integer,
      event_count integer,
      status text not null default 'running',
      error text
    )
  `;

  await sql`
    create table if not exists acvm_users (
      id bigserial primary key,
      email text unique not null,
      name text not null default '',
      password_hash text not null,
      plan text not null default 'preview',
      subscription_status text not null default 'preview',
      stripe_customer_id text,
      stripe_subscription_id text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists acvm_watchlists (
      id bigserial primary key,
      user_id bigint not null references acvm_users(id) on delete cascade,
      entity_type text not null check (entity_type in ('product','registrant','ingredient')),
      entity_value text not null,
      label text not null default '',
      created_at timestamptz not null default now(),
      last_alerted_at timestamptz not null default now(),
      unique(user_id, entity_type, entity_value)
    )
  `;

  await sql`
    create table if not exists regulatory_signals (
      id bigserial primary key,
      source text not null,
      external_id text not null,
      signal_type text not null,
      title text not null default '',
      summary text not null default '',
      event_date date,
      source_url text not null,
      ingredients jsonb not null default '[]'::jsonb,
      applicant text not null default '',
      status text not null default '',
      raw jsonb not null default '{}'::jsonb,
      first_seen_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(source, external_id, signal_type)
    )
  `;

  await sql`
    create table if not exists regulatory_sync_runs (
      id bigserial primary key,
      started_at timestamptz not null default now(),
      completed_at timestamptz,
      source text not null,
      signal_count integer not null default 0,
      status text not null default 'running',
      error text
    )
  `;

  await sql`create index if not exists idx_regulatory_signals_date on regulatory_signals(event_date desc)`;
  await sql`create index if not exists idx_regulatory_signals_source on regulatory_signals(source, signal_type)`;
  await sql`create index if not exists idx_regulatory_signals_ingredients on regulatory_signals using gin(ingredients)`;

  await sql`create index if not exists idx_acvm_events_detected_at on acvm_events(detected_at desc)`;
  await sql`create index if not exists idx_acvm_events_registrant on acvm_events(registrant)`;
  await sql`create index if not exists idx_acvm_watchlists_user on acvm_watchlists(user_id)`;

  return true;
}

function sorted(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function changed(a: unknown, b: unknown) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

function fingerprint(eventType: string, registrationNumber: string, payload: unknown) {
  const input = `${eventType}|${registrationNumber}|${JSON.stringify(payload)}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${eventType}:${registrationNumber}:${(hash >>> 0).toString(16)}`;
}

export async function syncProducts(products: Product[], sourceUrl: string, rowCount: number) {
  const sql = getDb();
  if (!sql) {
    return { database: false, baseline: true, inserted: products.length, updated: 0, events: 0, removals: 0 };
  }

  await ensureSchema();
  const [{ count }] = await sql`select count(*)::int as count from acvm_products`;
  const baseline = Number(count) === 0;
  const [run] = await sql`
    insert into acvm_sync_runs (source_url, row_count, product_count)
    values (${sourceUrl}, ${rowCount}, ${products.length})
    returning id, started_at
  `;

  let inserted = 0;
  let updated = 0;
  let events = 0;
  let removals = 0;

  try {
    for (const product of products) {
      const [existing] = await sql`
        select * from acvm_products where registration_number = ${product.registrationNumber}
      `;

      if (!existing) {
        await sql`
          insert into acvm_products (
            registration_number, trade_name, registrant, status, product_types,
            active_ingredients, registration_date, nz_agent, raw, last_seen_run_id,
            missing_count, is_current
          ) values (
            ${product.registrationNumber}, ${product.tradeName}, ${product.registrant}, ${product.status},
            ${sql.json(sorted(product.productTypes))}, ${sql.json(sorted(product.activeIngredients))},
            ${product.registrationDate}, ${product.nzAgent}, ${sql.json(product.raw)}, ${run.id}, 0, true
          )
        `;
        inserted++;

        if (!baseline) {
          const payload = {
            registrationDate: product.registrationDate,
            productTypes: product.productTypes,
            activeIngredients: product.activeIngredients
          };
          const fp = fingerprint("NEW_REGISTRATION", product.registrationNumber, payload);
          const summary = `${product.tradeName || product.registrationNumber} registered by ${product.registrant || "unknown registrant"}`;
          const result = await sql`
            insert into acvm_events (fingerprint, event_type, registration_number, trade_name, registrant, summary, payload)
            values (${fp}, 'NEW_REGISTRATION', ${product.registrationNumber}, ${product.tradeName}, ${product.registrant}, ${summary}, ${sql.json(payload)})
            on conflict (fingerprint) do nothing
            returning id
          `;
          if (result.length) events++;
        }
        continue;
      }

      const wasMissing = Number(existing.missing_count ?? 0) >= 2 || existing.is_current === false;
      const before = {
        tradeName: existing.trade_name,
        registrant: existing.registrant,
        status: existing.status,
        productTypes: sorted(existing.product_types ?? []),
        activeIngredients: sorted(existing.active_ingredients ?? []),
        registrationDate: existing.registration_date,
        nzAgent: existing.nz_agent
      };
      const after = {
        tradeName: product.tradeName,
        registrant: product.registrant,
        status: product.status,
        productTypes: sorted(product.productTypes),
        activeIngredients: sorted(product.activeIngredients),
        registrationDate: product.registrationDate,
        nzAgent: product.nzAgent
      };

      const diffs: Record<string, { before: unknown; after: unknown }> = {};
      for (const key of Object.keys(after) as (keyof typeof after)[]) {
        if (changed(before[key], after[key])) diffs[key] = { before: before[key], after: after[key] };
      }

      await sql`
        update acvm_products set
          trade_name = ${product.tradeName},
          registrant = ${product.registrant},
          status = ${product.status},
          product_types = ${sql.json(sorted(product.productTypes))},
          active_ingredients = ${sql.json(sorted(product.activeIngredients))},
          registration_date = ${product.registrationDate},
          nz_agent = ${product.nzAgent},
          raw = ${sql.json(product.raw)},
          last_seen_at = now(),
          last_seen_run_id = ${run.id},
          missing_count = 0,
          is_current = true,
          updated_at = now()
        where registration_number = ${product.registrationNumber}
      `;

      if (wasMissing && !baseline) {
        const payload = { sourceUrl, note: "Product returned after two or more missing snapshots" };
        const fp = fingerprint("RETURNED_TO_REGISTER", product.registrationNumber, payload);
        const result = await sql`
          insert into acvm_events (fingerprint, event_type, registration_number, trade_name, registrant, summary, payload)
          values (${fp}, 'RETURNED_TO_REGISTER', ${product.registrationNumber}, ${product.tradeName}, ${product.registrant},
                  ${`${product.tradeName || product.registrationNumber} returned to the current register`}, ${sql.json(payload)})
          on conflict (fingerprint) do nothing returning id
        `;
        if (result.length) events++;
      }

      if (Object.keys(diffs).length) {
        updated++;
        const nextStatus = String(after.status ?? "").toLowerCase();
        const eventType = diffs.status && nextStatus.includes("cancel")
          ? "CANCELLED"
          : diffs.status
            ? "STATUS_CHANGE"
            : diffs.registrant
              ? "REGISTRANT_CHANGE"
              : diffs.activeIngredients
                ? "INGREDIENT_CHANGE"
                : "PRODUCT_CHANGE";
        const fp = fingerprint(eventType, product.registrationNumber, diffs);
        const summary = `${product.tradeName || product.registrationNumber}: ${Object.keys(diffs).join(", ")} changed`;
        const result = await sql`
          insert into acvm_events (fingerprint, event_type, registration_number, trade_name, registrant, summary, payload)
          values (${fp}, ${eventType}, ${product.registrationNumber}, ${product.tradeName}, ${product.registrant}, ${summary}, ${sql.json(diffs as any)})
          on conflict (fingerprint) do nothing
          returning id
        `;
        if (result.length) events++;
      }
    }

    if (!baseline) {
      const missing = await sql`
        select registration_number, trade_name, registrant, missing_count, is_current
        from acvm_products
        where last_seen_run_id is distinct from ${run.id}
      `;

      for (const product of missing) {
        const newMissingCount = Number(product.missing_count ?? 0) + 1;
        await sql`
          update acvm_products
          set missing_count = ${newMissingCount},
              is_current = ${newMissingCount < 2},
              updated_at = now()
          where registration_number = ${product.registration_number}
        `;

        if (newMissingCount === 2) {
          const payload = {
            missingSnapshots: 2,
            sourceUrl,
            classification: "source_removal",
            caveat: "Removal from the current source is a monitoring signal and should be checked against MPI cancellation data."
          };
          const fp = fingerprint("SOURCE_REMOVAL", product.registration_number, payload);
          const result = await sql`
            insert into acvm_events (fingerprint, event_type, registration_number, trade_name, registrant, summary, payload)
            values (${fp}, 'SOURCE_REMOVAL', ${product.registration_number}, ${product.trade_name}, ${product.registrant},
                    ${`${product.trade_name || product.registration_number} has been absent from two consecutive register snapshots`},
                    ${sql.json(payload)})
            on conflict (fingerprint) do nothing returning id
          `;
          if (result.length) {
            events++;
            removals++;
          }
        }
      }
    }

    await sql`
      update acvm_sync_runs
      set completed_at = now(), event_count = ${events}, status = 'success'
      where id = ${run.id}
    `;

    return { database: true, baseline, inserted, updated, events, removals };
  } catch (error) {
    await sql`
      update acvm_sync_runs
      set completed_at = now(), status = 'failed', error = ${error instanceof Error ? error.message : String(error)}
      where id = ${run.id}
    `;
    throw error;
  }
}

export async function getDashboardData() {
  const sql = getDb();
  if (!sql) return null;
  await ensureSchema();
  const [stats] = await sql`
    select
      count(*) filter (where is_current)::int as products,
      count(distinct registrant) filter (where is_current)::int as registrants,
      count(*) filter (where lower(status) like '%suspend%' and is_current)::int as suspended,
      count(*) filter (where not is_current)::int as removed
    from acvm_products
  `;
  const events = await sql`
    select id, event_type, registration_number, trade_name, registrant,
           detected_at::text, summary, payload
    from acvm_events
    order by detected_at desc
    limit 20
  `;
  const [lastRun] = await sql`
    select completed_at::text, product_count, event_count, status
    from acvm_sync_runs
    order by id desc
    limit 1
  `;
  return { stats, events, lastRun: lastRun ?? null };
}

export async function searchProducts(query = "", limit = 100) {
  const sql = getDb();
  if (!sql) return [];
  await ensureSchema();
  const q = `%${query}%`;
  return sql`
    select registration_number, trade_name, registrant, status,
           product_types, active_ingredients, registration_date, is_current
    from acvm_products
    where (${query === ""} or trade_name ilike ${q} or registrant ilike ${q}
          or registration_number ilike ${q} or active_ingredients::text ilike ${q})
    order by is_current desc, registration_date desc nulls last, trade_name asc
    limit ${limit}
  `;
}

export async function getProductProfile(registrationNumber: string) {
  const sql = getDb();
  if (!sql) return null;
  await ensureSchema();
  const [product] = await sql`
    select * from acvm_products where registration_number = ${registrationNumber}
  `;
  if (!product) return null;
  const events = await sql`
    select * from acvm_events
    where registration_number = ${registrationNumber}
    order by detected_at desc
    limit 30
  `;
  return { product, events };
}

export async function getRegistrantProfile(name: string) {
  const sql = getDb();
  if (!sql) return null;
  await ensureSchema();
  const products = await sql`
    select registration_number, trade_name, status, product_types, active_ingredients,
           registration_date, is_current
    from acvm_products
    where registrant = ${name}
    order by is_current desc, registration_date desc nulls last, trade_name asc
  `;
  if (!products.length) return null;
  const ingredients = await sql`
    select ingredient, count(*)::int as products
    from (
      select jsonb_array_elements_text(active_ingredients) ingredient
      from acvm_products
      where registrant = ${name} and is_current
    ) x
    where ingredient <> ''
    group by ingredient
    order by products desc, ingredient asc
    limit 50
  `;
  const events = await sql`
    select * from acvm_events
    where registrant = ${name}
    order by detected_at desc
    limit 30
  `;
  return { name, products, ingredients, events };
}

export async function getIngredientProfile(name: string) {
  const sql = getDb();
  if (!sql) return null;
  await ensureSchema();
  const products = await sql`
    select registration_number, trade_name, registrant, status, product_types,
           active_ingredients, registration_date, is_current
    from acvm_products
    where active_ingredients ? ${name}
    order by is_current desc, registration_date desc nulls last, trade_name asc
  `;
  if (!products.length) return null;
  const registrants = await sql`
    select registrant, count(*)::int as products
    from acvm_products
    where active_ingredients ? ${name} and is_current
    group by registrant
    order by products desc, registrant asc
  `;
  const events = await sql`
    select e.*
    from acvm_events e
    join acvm_products p on p.registration_number = e.registration_number
    where p.active_ingredients ? ${name}
    order by e.detected_at desc
    limit 30
  `;
  return { name, products, registrants, events };
}

export async function getCancellationEvents(limit = 100) {
  const sql = getDb();
  if (!sql) return [];
  await ensureSchema();
  return sql`
    select id, event_type, registration_number, trade_name, registrant,
           detected_at::text, summary, payload
    from acvm_events
    where event_type in ('CANCELLED','SOURCE_REMOVAL')
    order by detected_at desc
    limit ${limit}
  `;
}

export async function createUser(email: string, name: string, passwordHash: string) {
  const sql = getDb();
  if (!sql) throw new Error("Database is not configured");
  await ensureSchema();
  const result = await sql`
    insert into acvm_users (email, name, password_hash)
    values (${email.toLowerCase()}, ${name}, ${passwordHash})
    on conflict (email) do nothing
    returning id, email, name, plan, subscription_status
  `;
  return result[0] ?? null;
}

export async function getUserByEmail(email: string) {
  const sql = getDb();
  if (!sql) return null;
  await ensureSchema();
  const [user] = await sql`
    select * from acvm_users where email = ${email.toLowerCase()}
  `;
  return user ?? null;
}

export async function getUserById(id: number) {
  const sql = getDb();
  if (!sql) return null;
  await ensureSchema();
  const [user] = await sql`
    select id, email, name, plan, subscription_status, stripe_customer_id, created_at
    from acvm_users where id = ${id}
  `;
  return user ?? null;
}

export async function updateUserBilling(args: {
  userId?: number;
  email?: string;
  plan?: string;
  status?: string;
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  const sql = getDb();
  if (!sql) return null;
  await ensureSchema();
  const whereId = args.userId ?? null;
  const whereEmail = args.email?.toLowerCase() ?? null;
  const [user] = await sql`
    update acvm_users set
      plan = coalesce(${args.plan ?? null}, plan),
      subscription_status = coalesce(${args.status ?? null}, subscription_status),
      stripe_customer_id = coalesce(${args.customerId ?? null}, stripe_customer_id),
      stripe_subscription_id = coalesce(${args.subscriptionId ?? null}, stripe_subscription_id),
      updated_at = now()
    where (${whereId}::bigint is not null and id = ${whereId})
       or (${whereEmail}::text is not null and email = ${whereEmail})
    returning id, email, name, plan, subscription_status, stripe_customer_id
  `;
  return user ?? null;
}

export function watchlistLimit(plan: string) {
  if (plan === "pro") return 1000;
  if (plan === "intelligence") return 15;
  if (plan === "watch") return 3;
  return 3;
}

export async function getWatchlists(userId: number) {
  const sql = getDb();
  if (!sql) return [];
  await ensureSchema();
  return sql`
    select * from acvm_watchlists
    where user_id = ${userId}
    order by created_at desc
  `;
}

export async function addWatchlist(userId: number, entityType: string, entityValue: string, label: string) {
  const sql = getDb();
  if (!sql) throw new Error("Database is not configured");
  await ensureSchema();
  const [user] = await sql`select plan from acvm_users where id = ${userId}`;
  if (!user) throw new Error("User not found");
  const [{ count }] = await sql`select count(*)::int as count from acvm_watchlists where user_id = ${userId}`;
  if (Number(count) >= watchlistLimit(String(user.plan))) throw new Error("Watchlist limit reached");
  const result = await sql`
    insert into acvm_watchlists (user_id, entity_type, entity_value, label)
    values (${userId}, ${entityType}, ${entityValue}, ${label})
    on conflict (user_id, entity_type, entity_value) do nothing
    returning *
  `;
  return result[0] ?? null;
}

export async function removeWatchlist(userId: number, id: number) {
  const sql = getDb();
  if (!sql) return false;
  await ensureSchema();
  const result = await sql`
    delete from acvm_watchlists where id = ${id} and user_id = ${userId} returning id
  `;
  return Boolean(result.length);
}

export async function getWatchlistEvents(userId: number, limit = 100) {
  const sql = getDb();
  if (!sql) return [];
  await ensureSchema();

  return sql`
    with matches as (
      select distinct
        e.id::text as id,
        e.event_type,
        e.registration_number,
        e.trade_name,
        e.registrant,
        e.detected_at,
        e.summary,
        e.payload,
        w.entity_type,
        w.entity_value,
        w.label as watch_label,
        'ACVM'::text as source_family,
        null::text as source_url
      from acvm_watchlists w
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
      where w.user_id = ${userId}

      union all

      select distinct
        ('reg-' || r.id)::text as id,
        r.signal_type as event_type,
        ''::text as registration_number,
        r.title as trade_name,
        r.applicant as registrant,
        coalesce(r.event_date::timestamptz, r.first_seen_at) as detected_at,
        r.summary,
        r.raw as payload,
        w.entity_type,
        w.entity_value,
        w.label as watch_label,
        r.source as source_family,
        r.source_url
      from acvm_watchlists w
      join regulatory_signals r on (
        w.entity_type = 'ingredient'
        and r.ingredients ? w.entity_value
      )
      where w.user_id = ${userId}
    )
    select *
    from matches
    order by detected_at desc
    limit ${limit}
  `;
}

export type RegulatorySignalInput = {
  source: "EPA_HSNO" | "MPI_MRL";
  externalId: string;
  signalType: string;
  title: string;
  summary: string;
  eventDate: string | null;
  sourceUrl: string;
  ingredients: string[];
  applicant?: string;
  status?: string;
  raw?: Record<string, unknown>;
};

export async function upsertRegulatorySignals(source: string, signals: RegulatorySignalInput[]) {
  const sql = getDb();
  if (!sql) return { database: false, inserted: signals.length, updated: 0 };
  await ensureSchema();

  const [run] = await sql`
    insert into regulatory_sync_runs (source)
    values (${source})
    returning id
  `;

  let inserted = 0;
  let updated = 0;
  let deduplicated = 0;

  try {
    for (const signal of signals) {
      const result = await sql`
        insert into regulatory_signals (
          source, external_id, signal_type, title, summary, event_date,
          source_url, ingredients, applicant, status, raw
        ) values (
          ${signal.source}, ${signal.externalId}, ${signal.signalType},
          ${signal.title}, ${signal.summary}, ${signal.eventDate},
          ${signal.sourceUrl}, ${sql.json(signal.ingredients)},
          ${signal.applicant ?? ""}, ${signal.status ?? ""},
          ${sql.json((signal.raw ?? {}) as any)}
        )
        on conflict (source, external_id, signal_type) do update set
          title = excluded.title,
          summary = excluded.summary,
          event_date = excluded.event_date,
          source_url = excluded.source_url,
          ingredients = excluded.ingredients,
          applicant = excluded.applicant,
          status = excluded.status,
          raw = excluded.raw,
          updated_at = now()
        returning (xmax = 0) as inserted
      `;
      if (result[0]?.inserted) inserted++;
      else updated++;
    }

    if (source === "MPI_MRL") {
      const removed = await sql`
        delete from regulatory_signals older
        using regulatory_signals newer
        where older.source = 'MPI_MRL'
          and newer.source = 'MPI_MRL'
          and lower(older.title) = lower(newer.title)
          and coalesce(older.event_date, date '1900-01-01') = coalesce(newer.event_date, date '1900-01-01')
          and older.id < newer.id
        returning older.id
      `;
      deduplicated = removed.length;
    }

    await sql`
      update regulatory_sync_runs
      set completed_at = now(), signal_count = ${signals.length}, status = 'success'
      where id = ${run.id}
    `;
    return { database: true, inserted, updated, deduplicated };
  } catch (error) {
    await sql`
      update regulatory_sync_runs
      set completed_at = now(), status = 'failed', error = ${error instanceof Error ? error.message : String(error)}
      where id = ${run.id}
    `;
    throw error;
  }
}

export async function getKnownIngredients() {
  const sql = getDb();
  if (!sql) return [];
  await ensureSchema();
  const rows = await sql`
    select distinct ingredient
    from acvm_products,
      lateral jsonb_array_elements_text(active_ingredients) ingredient
    where ingredient <> ''
    order by ingredient
  `;
  return rows.map((row: any) => String(row.ingredient));
}

export async function getEarlyWarningSignals(limit = 100) {
  const sql = getDb();
  if (!sql) return [];
  await ensureSchema();

  return sql`
    with enriched as (
      select
        s.*,
        coalesce((
          select count(*)::int
          from acvm_products p
          where p.is_current
            and exists (
              select 1
              from jsonb_array_elements_text(s.ingredients) si(value)
              where p.active_ingredients ? si.value
            )
        ), 0) as matching_products,
        coalesce((
          select count(distinct p.registrant)::int
          from acvm_products p
          where p.is_current
            and exists (
              select 1
              from jsonb_array_elements_text(s.ingredients) si(value)
              where p.active_ingredients ? si.value
            )
        ), 0) as matching_registrants,
        coalesce((
          select count(*)::int
          from regulatory_signals s2
          where s2.id <> s.id
            and s2.event_date >= coalesce(s.event_date, current_date) - interval '180 days'
            and s2.event_date <= coalesce(s.event_date, current_date) + interval '180 days'
            and exists (
              select 1
              from jsonb_array_elements_text(s.ingredients) a(value)
              where s2.ingredients ? a.value
            )
        ), 0) as related_signals
      from regulatory_signals s
    )
    select *,
      least(100,
        case
          when source = 'MPI_MRL' then 72
          when source = 'EPA_HSNO' then 78
          else 50
        end
        + case when matching_products = 0 and jsonb_array_length(ingredients) > 0 then 15
               when matching_products between 1 and 3 then 10
               when matching_products between 4 and 10 then 5
               else 0 end
        + case when related_signals >= 2 then 10
               when related_signals = 1 then 5
               else 0 end
      )::int as signal_score
    from enriched
    order by signal_score desc, first_seen_at desc, event_date desc nulls last
    limit ${limit}
  `;
}

export async function getEarlyWarningStats() {
  const sql = getDb();
  if (!sql) return null;
  await ensureSchema();
  const [stats] = await sql`
    select
      count(*)::int as signals,
      count(*) filter (where source = 'EPA_HSNO')::int as epa,
      count(*) filter (where source = 'MPI_MRL')::int as mrl,
      count(*) filter (where first_seen_at >= now() - interval '90 days')::int as recent
    from regulatory_signals
  `;
  const [lastRun] = await sql`
    select completed_at::text, source, signal_count, status
    from regulatory_sync_runs
    order by id desc
    limit 1
  `;
  return {
    signals: Number(stats?.signals ?? 0),
    epa: Number(stats?.epa ?? 0),
    mrl: Number(stats?.mrl ?? 0),
    recent: Number(stats?.recent ?? 0),
    lastRun: lastRun ?? null
  };
}

export async function getEarlyWarningForIngredient(name: string, limit = 30) {
  const sql = getDb();
  if (!sql) return [];
  await ensureSchema();
  return sql`
    select *
    from regulatory_signals
    where ingredients ? ${name}
    order by event_date desc nulls last, first_seen_at desc
    limit ${limit}
  `;
}
