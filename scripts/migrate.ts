import { db, optimizeDB } from "#database";
import { promises as fs } from "fs";
import path from "path";
import { Migrator, FileMigrationProvider } from "kysely";

/**
 * Runs all available migrations against the database.
 *
 * Logs the result of each migration (success or failure) to the console.
 * If any migration fails, logs the error to the console and exits with a
 * non-zero status code.
 */
export async function migrateToLatest() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      // This needs to be an absolute path.
      migrationFolder: path.join(__dirname, "../migrations"),
    }),
  });
  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("failed to migrate");
    console.error(error);
    process.exit(1);
  }
  await optimizeDB();
}

export const default_theme_dark = JSON.stringify({
  palette: {
    mode: "dark",
    warning: {
      main: "#fdd835",
    },
  },
});
export const default_theme_light = JSON.stringify({
  palette: {
    mode: "light",
    warning: {
      main: "#fbc02d",
    },
  },
});

/**
 * Creates the default config.
 *
 * This function should be called on every boot to ensure that a config value exists for all needed values.
 *
 */
export async function createConfig() {
  await db
    .insertInto("data")
    .values([
      { value1: "configMinTimeGame", value2: "120" },
      { value1: "configMaxTimeGame", value2: "1200" },
      { value1: "configMinTimeTransfer", value2: "3600" },
      { value1: "configMaxTimeTransfer", value2: "86400" },
      { value1: "configDownloadPicture", value2: "needed" },
      { value1: "configDeleteInactiveUser", value2: "0" },
      { value1: "configArchiveInactiveLeague", value2: "180" },
      {
        value1: "configEnablePasswordSignup",
        value2: process.env.APP_ENV !== "production" ? "true" : "false",
      },
      { value1: "configThemeDark", value2: default_theme_dark },
      { value1: "configThemeLight", value2: default_theme_light },
    ])
    .onConflict((conflict) => conflict.doNothing())
    .execute();

  if (process.env.APP_ENV === "test") {
    await db
      .updateTable("data")
      .set({ value2: "no" })
      .where("value1", "=", "configDownloadPicture")
      .execute();
  }
}
