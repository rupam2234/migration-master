/**
 * Applies every SQL file in db/migrations (sorted by filename) against the
 * Neon database. Migrations must be idempotent so re-running is safe.
 *
 * Usage: node --env-file=.env scripts/apply-migration.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required (pass --env-file=.env)");
  process.exit(1);
}

const sql = neon(databaseUrl);
const migrationsDir = path.join(process.cwd(), "db", "migrations");
const files = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.log("No migrations found.");
  process.exit(0);
}

for (const file of files) {
  console.log(`Applying ${file}...`);
  // The Neon HTTP driver only accepts single statements via .query(),
  // so split the file into individual statements.
  const statements = readFileSync(path.join(migrationsDir, file), "utf8")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }

  console.log(`Applied ${file} (${statements.length} statements)`);
}

console.log("All migrations applied.");
