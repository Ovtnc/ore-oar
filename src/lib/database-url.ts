import "server-only";

function firstNonEmpty(...values: Array<string | undefined | null>) {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function buildPostgresUrlFromParts(env: NodeJS.ProcessEnv) {
  const host = firstNonEmpty(env.POSTGRES_HOST, env.PGHOST, "127.0.0.1");
  const port = firstNonEmpty(env.POSTGRES_PORT, env.PGPORT, "5432");
  const db = firstNonEmpty(env.POSTGRES_DB, env.PGDATABASE, "oar_ore");
  const user = firstNonEmpty(env.POSTGRES_USER, env.PGUSER);
  const pass = firstNonEmpty(env.POSTGRES_PASSWORD, env.PGPASSWORD);

  if (!user || !pass) return "";

  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(pass);
  const encodedDb = encodeURIComponent(db);
  return `postgresql://${encodedUser}:${encodedPass}@${host}:${port}/${encodedDb}?schema=public`;
}

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const explicitOverride = firstNonEmpty(env.POSTGRES_DATABASE_URL);
  if (explicitOverride) {
    return { url: explicitOverride, source: "POSTGRES_DATABASE_URL" as const };
  }

  const derivedPostgres = buildPostgresUrlFromParts(env);
  if (derivedPostgres) {
    return { url: derivedPostgres, source: "POSTGRES_ENV" as const };
  }

  const direct = firstNonEmpty(env.DATABASE_URL);
  if (direct) {
    return { url: direct, source: "DATABASE_URL" as const };
  }

  return { url: "", source: null };
}

export function prepareDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const resolved = resolveDatabaseUrl(env);
  if (resolved.url) {
    env.DATABASE_URL = resolved.url;
  }
  return resolved;
}
