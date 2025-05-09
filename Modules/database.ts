import dotenv from "dotenv";
import { Kysely, sql, SqliteDialect } from "kysely";
import { DB } from "#types/db";
import SQLite from "better-sqlite3";
if (process.env.APP_ENV !== "test") {
  dotenv.config({ path: ".env.local" });
} else {
  dotenv.config({ path: ".env.test.local" });
}
const dialect = new SqliteDialect({
  database: new SQLite(process.env.SQLITE),
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<DB>({
  dialect,
});
export const optimizeDB = async () => {
  console.log("Optimizing database");
  await sql`PRAGMA AUTO_VACUUM=1`.execute(db);
  await sql`PRAGMA OPTIMIZE`.execute(db);
  await sql`PRAGMA journal_mode=WAL`.execute(db);
  console.log("Optimized database");
};
export default db;
