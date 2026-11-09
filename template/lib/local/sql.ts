// A tiny SQL driver for the local mode (no app): SQLite through Node's built-in node:sqlite (a file in data/), or any
// Postgres through LEAD_ENGINE_DB=postgres://... (needs `npm i pg`). Queries use ? placeholders; the Postgres driver rewrites them to
// $1, $2... Only portable SQL is used (TEXT ids, ISO timestamps as TEXT, booleans as 0/1, JSON as TEXT).

export type Row = Record<string, unknown>;
export type Param = string | number | null;

export interface Sql {
  kind: "sqlite" | "postgres";
  all(q: string, p?: Param[]): Promise<Row[]>;
  get(q: string, p?: Param[]): Promise<Row | undefined>;
  run(q: string, p?: Param[]): Promise<void>;
  exec(q: string): Promise<void>;
  close(): Promise<void>;
}

export const toDollar = (q: string) => {
  let i = 0;
  return q.replace(/\?/g, () => `$${++i}`);
};

async function openSqlite(file: string): Promise<Sql> {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  return {
    kind: "sqlite",
    all: async (q, p = []) => db.prepare(q).all(...p) as Row[],
    get: async (q, p = []) => db.prepare(q).get(...p) as Row | undefined,
    run: async (q, p = []) => { db.prepare(q).run(...p); },
    exec: async (q) => { db.exec(q); },
    close: async () => { db.close(); },
  };
}

type PgClient = {
  connect(): Promise<void>;
  query(q: string, p?: Param[]): Promise<{ rows: Row[] }>;
  end(): Promise<void>;
};
type PgModule = { default?: { Client: new (o: { connectionString: string }) => PgClient }; Client?: new (o: { connectionString: string }) => PgClient };

async function openPostgres(url: string): Promise<Sql> {
  const name = "pg"; // optional dependency: only needed when the store is your own Postgres
  const mod = (await import(name).catch(() => {
    throw new Error("LEAD_ENGINE_DB is a Postgres URL: install the driver once with `npm i pg`");
  })) as PgModule;
  const Client = mod.Client ?? mod.default?.Client;
  if (!Client) throw new Error("pg driver not found");
  const c = new Client({ connectionString: url });
  await c.connect();
  return {
    kind: "postgres",
    all: async (q, p = []) => (await c.query(toDollar(q), p)).rows,
    get: async (q, p = []) => (await c.query(toDollar(q), p)).rows[0],
    run: async (q, p = []) => { await c.query(toDollar(q), p); },
    exec: async (q) => { await c.query(q); },
    close: async () => { await c.end(); },
  };
}

// target: a postgres:// URL, or a file path for SQLite (":memory:" in tests).
export function openSql(target: string): Promise<Sql> {
  return /^postgres(ql)?:\/\//.test(target) ? openPostgres(target) : openSqlite(target);
}
