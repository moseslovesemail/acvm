import postgres, { type Sql } from "postgres";
import type { Product } from "./types";

let client: Sql | null = null;

function sqlClient(): Sql | null {
  if (!process.env.DATABASE_URL) return null;
  if (!client) client = postgres(process.env.DATABASE_URL, { max: 5 });
  return client;
}

export async function ensureSchema() {
  const sql = sqlClient();
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
      updated_at timestamptz not null default now()
    )
  `;

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
  const sql = sqlClient();
  if (!sql) {
    return { database: false, baseline: true, inserted: products.length, updated: 0, events: 0 };
  }

  await ensureSchema();
  const [{ count }] = await sql`select count(*)::int as count from acvm_products`;
  const baseline = Number(count) === 0;
  const [run] = await sql`
    insert into acvm_sync_runs (source_url, row_count, product_count)
    values (${sourceUrl}, ${rowCount}, ${products.length})
    returning id
  `;

  let inserted = 0;
  let updated = 0;
  let events = 0;

  try {
    for (const product of products) {
      const [existing] = await sql`
        select * from acvm_products where registration_number = ${product.registrationNumber}
      `;

      if (!existing) {
        await sql`
          insert into acvm_products (
            registration_number, trade_name, registrant, status, product_types,
            active_ingredients, registration_date, nz_agent, raw
          ) values (
            ${product.registrationNumber}, ${product.tradeName}, ${product.registrant}, ${product.status},
            ${sql.json(sorted(product.productTypes))}, ${sql.json(sorted(product.activeIngredients))},
            ${product.registrationDate}, ${product.nzAgent}, ${sql.json(product.raw)}
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
          updated_at = now()
        where registration_number = ${product.registrationNumber}
      `;

      if (Object.keys(diffs).length) {
        updated++;
        const eventType = diffs.status
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

    await sql`
      update acvm_sync_runs
      set completed_at = now(), event_count = ${events}, status = 'success'
      where id = ${run.id}
    `;

    return { database: true, baseline, inserted, updated, events };
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
  const sql = sqlClient();
  if (!sql) return null;
  await ensureSchema();
  const [stats] = await sql`
    select
      count(*)::int as products,
      count(distinct registrant)::int as registrants,
      count(*) filter (where lower(status) like '%suspend%')::int as suspended
    from acvm_products
  `;
  const events = await sql`
    select id, event_type, registration_number, trade_name, registrant,
           detected_at::text, summary, payload
    from acvm_events
    order by detected_at desc
    limit 12
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
  const sql = sqlClient();
  if (!sql) return [];
  await ensureSchema();
  const q = `%${query}%`;
  return sql`
    select registration_number, trade_name, registrant, status,
           product_types, active_ingredients, registration_date
    from acvm_products
    where ${query === ""} or trade_name ilike ${q} or registrant ilike ${q}
          or registration_number ilike ${q} or active_ingredients::text ilike ${q}
    order by registration_date desc nulls last, trade_name asc
    limit ${limit}
  `;
}
