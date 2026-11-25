// The dev game server's database (bun run dev): "depths_dev" on the PostgreSQL from
// game-server/docker-compose.yml (bun run server:db), or on the one in DEV_DATABASE_URL.
// bun run dev:reset drops it.
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ADMIN_URL = process.env.DEV_DATABASE_URL || 'postgres://depths:depths@127.0.0.1:5432/depths';
export const DEV_DB = 'depths_dev';
export const devDatabaseUrl = () => Object.assign(new URL(ADMIN_URL), { pathname: `/${DEV_DB}` }).toString();
export const DEV_DB_HELP = 'Start PostgreSQL with `bun run server:db` (needs Docker Desktop), or set DEV_DATABASE_URL.';

async function withAdmin(fn) {
  let pg;
  try {
    pg = createRequire(path.join(root, 'game-server', 'package.json'))('pg');
  } catch {
    throw new Error('The game server packages are missing. Run: bun run server:install');
  }
  const client = new pg.Client({ connectionString: ADMIN_URL, connectionTimeoutMillis: 3000 });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(`No PostgreSQL at ${ADMIN_URL.replace(/:[^:@/]*@/, ':***@')} (${error.code || error.message}). ${DEV_DB_HELP}`);
  }
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}
const exists = (client) => client.query('SELECT 1 FROM pg_database WHERE datname = $1', [DEV_DB]).then((r) => r.rowCount > 0);

/** Creates the dev database if it isn't there yet; returns its URL. Throws with a helpful message. */
export async function ensureDevDatabase() {
  await withAdmin(async (client) => {
    if (!(await exists(client))) await client.query(`CREATE DATABASE ${DEV_DB}`);
  });
  return devDatabaseUrl();
}
/** true/false, or null when PostgreSQL can't be reached. */
export const devDatabaseExists = () => withAdmin(exists).catch(() => null);
export const dropDevDatabase = () => withAdmin((client) => client.query(`DROP DATABASE IF EXISTS ${DEV_DB} WITH (FORCE)`));
