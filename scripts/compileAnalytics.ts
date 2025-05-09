import db from "#database";
import {
  analytics as AnalyticsType,
  detailedAnalytics as DetailedAnalyticsType,
} from "#types/database";
import { Selectable } from "kysely";

// Define analyticsData type locally as in original
type AnalyticsData = { [key: string]: number };

/**
 * Turns the days of the analytics in the db into one entry in the final analytics table
 *
 * @param day The day of the week that should be compiled
 *
 */
export default async function compileAnalytics(day: number): Promise<void> {
  // No more connection = await connect() or connection.end()

  // Makes sure that if there was a duplicate for some reason it is ignored
  const detailedAnalyticsEntries: Selectable<DetailedAnalyticsType>[] = await db
    .selectFrom("detailedAnalytics")
    .selectAll()
    .where("day", "=", day)
    .distinct() // Applies DISTINCT to all selected columns
    .execute();

  const previousAnalyticsRecords: Selectable<AnalyticsType>[] = await db
    .selectFrom("analytics")
    .selectAll()
    .where("day", "=", day - 1)
    .execute(); // Fetches all records, original code picks the first if available

  let versionActive: AnalyticsData = {};
  let versionTotal: AnalyticsData = {};
  let leagueActive: AnalyticsData = {};
  let leagueTotal: AnalyticsData = {};
  let themeActive: AnalyticsData = {};
  let themeTotal: AnalyticsData = {};
  let localeActive: AnalyticsData = {};
  let localeTotal: AnalyticsData = {};

  // Makes sure the dictionaries for the analytics are prefilled with all required information
  if (previousAnalyticsRecords.length > 0) {
    const previousEntry = previousAnalyticsRecords[0];

    versionActive = JSON.parse(previousEntry.versionActive);
    for (const version in versionActive) {
      versionActive[version] = 0;
    }
    versionTotal = JSON.parse(previousEntry.versionTotal);
    for (const version in versionTotal) {
      versionTotal[version] = 0;
    }
    leagueActive = JSON.parse(previousEntry.leagueActive);
    for (const league in leagueActive) {
      leagueActive[league] = 0;
    }
    leagueTotal = JSON.parse(previousEntry.leagueTotal);
    for (const league in leagueTotal) {
      leagueTotal[league] = 0;
    }
    themeActive = JSON.parse(previousEntry.themeActive);
    for (const theme in themeActive) {
      themeActive[theme] = 0;
    }
    themeTotal = JSON.parse(previousEntry.themeTotal);
    for (const theme in themeTotal) {
      themeTotal[theme] = 0;
    }
    localeActive = JSON.parse(previousEntry.localeActive);
    for (const locale in localeActive) {
      localeActive[locale] = 0;
    }
    localeTotal = JSON.parse(previousEntry.localeTotal);
    for (const locale in localeTotal) {
      localeTotal[locale] = 0;
    }
  }

  // Goes through every server's analytics and adds them to the dictionaries
  for (const entry of detailedAnalyticsEntries) {
    // Version
    if (versionActive[entry.version] === undefined) {
      versionActive[entry.version] = 0;
    }
    versionActive[entry.version] += entry.active;

    if (versionTotal[entry.version] === undefined) {
      versionTotal[entry.version] = 0;
    }
    versionTotal[entry.version] += entry.total;

    // League
    const entryLeagueActive: AnalyticsData = JSON.parse(entry.leagueActive);
    for (const league in entryLeagueActive) {
      if (leagueActive[league] === undefined) {
        leagueActive[league] = 0;
      }
      leagueActive[league] += entryLeagueActive[league];
    }
    const entryLeagueTotal: AnalyticsData = JSON.parse(entry.leagueTotal);
    for (const league in entryLeagueTotal) {
      if (leagueTotal[league] === undefined) {
        leagueTotal[league] = 0;
      }
      leagueTotal[league] += entryLeagueTotal[league];
    }

    // Theme
    const entryThemeActive: AnalyticsData = JSON.parse(entry.themeActive);
    for (const theme in entryThemeActive) {
      if (themeActive[theme] === undefined) {
        themeActive[theme] = 0;
      }
      themeActive[theme] += entryThemeActive[theme];
    }
    const entryThemeTotal: AnalyticsData = JSON.parse(entry.themeTotal);
    for (const theme in entryThemeTotal) {
      if (themeTotal[theme] === undefined) {
        themeTotal[theme] = 0;
      }
      themeTotal[theme] += entryThemeTotal[theme];
    }

    // Locale
    const entryLocaleActive: AnalyticsData = JSON.parse(entry.localeActive);
    for (const locale in entryLocaleActive) {
      if (localeActive[locale] === undefined) {
        localeActive[locale] = 0;
      }
      localeActive[locale] += entryLocaleActive[locale];
    }
    const entryLocaleTotal: AnalyticsData = JSON.parse(entry.localeTotal);
    for (const locale in entryLocaleTotal) {
      if (localeTotal[locale] === undefined) {
        localeTotal[locale] = 0;
      }
      localeTotal[locale] += entryLocaleTotal[locale];
    }
  }

  // Delete existing entry for the current day before inserting the new one
  await db.deleteFrom("analytics").where("day", "=", day).execute();

  // Insert the newly compiled analytics
  await db
    .insertInto("analytics")
    .values({
      day: day,
      versionActive: JSON.stringify(versionActive),
      versionTotal: JSON.stringify(versionTotal),
      leagueActive: JSON.stringify(leagueActive),
      leagueTotal: JSON.stringify(leagueTotal),
      themeActive: JSON.stringify(themeActive),
      themeTotal: JSON.stringify(themeTotal),
      localeActive: JSON.stringify(localeActive),
      localeTotal: JSON.stringify(localeTotal),
    })
    .execute();

  return;
}
