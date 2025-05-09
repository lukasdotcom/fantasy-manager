import db from "../Modules/database"; // Kysely instance
import { LeagueSettings, Plugins, Users, LeagueUsers } from "#type/db";
import { updateData } from "./update";
import versionPackage from "./../package.json"; // Renamed to avoid conflict with 'version' variable
import dotenv from "dotenv";
import compileAnalytics from "./compileAnalytics";
import { checkPictures } from "./pictures";
import { timeUntilUpdate } from "./checkUpdate";
import { leaveLeague } from "#Modules/delete";
import { startWatcher } from "./watch";
import { archive_league } from "#Modules/archive";
import { Selectable } from "kysely";

const analyticsDomain = "https://fantasy.lschaefer.xyz";
const date = new Date();
let day = date.getDay();

if (process.env.APP_ENV !== "test") {
  dotenv.config({ path: ".env.local" });
} else {
  dotenv.config({ path: ".env.test.local" });
}
startWatcher();
checkPictures();
// Makes sure to check if an action is neccessary every 10 seconds
setInterval(update, 10000);
/**
 * Updates all leagues.
 */
async function updateAllLeagues() {
  const activePlugins: Selectable<Plugins>[] = await db
    .selectFrom("plugins")
    .selectAll()
    .where("enabled", "=", 1)
    .execute();

  activePlugins.forEach((e: Selectable<Plugins>) => {
    if (e.url) {
      // Ensure url exists, as it might be optional in the type
      updateData(e.url);
    }
  });
}
updateAllLeagues();
/**
 * Archives all leagues that are inactive for too long and deletes all users that have been inactive for too long.
 */
async function archiveInactive() {
  // Increment inactive days for inactive leagues
  await db
    .updateTable("leagueSettings")
    .set({
      inactiveDays: (eb) => eb("inactiveDays", "+", 1),
    })
    .where("active", "=", 0)
    .where("archived", "=", 0)
    .execute();

  // Increment inactive days for inactive users
  await db
    .updateTable("users")
    .set({
      inactiveDays: (eb) => eb("inactiveDays", "+", 1),
    })
    .where("active", "=", 0)
    .execute();

  // Reset inactive days for active leagues
  await db
    .updateTable("leagueSettings")
    .set({ inactiveDays: 0 })
    .where("active", "=", 1)
    .where("archived", "=", 0)
    .execute();

  // Reset inactive days for active users
  await db
    .updateTable("users")
    .set({ inactiveDays: 0 })
    .where("active", "=", 1)
    .execute();

  const archiveConfig = await db
    .selectFrom("data")
    .select("value2")
    .where("value1", "=", "configArchiveInactiveLeague")
    .executeTakeFirst();

  const daysUntilLeagueArchived = parseInt(archiveConfig?.value2 || "0", 10);

  // Archives all leagues that are inactive for too long
  if (daysUntilLeagueArchived > 0) {
    const leaguesToArchive: Selectable<LeagueSettings>[] = await db
      .selectFrom("leagueSettings")
      .selectAll()
      .where("archived", "=", 0)
      .where("inactiveDays", ">=", daysUntilLeagueArchived)
      .where("active", "=", 0)
      .execute();

    await Promise.all(
      leaguesToArchive.map(async (e) => {
        console.log(
          `Archiving league ${e.leagueID} due to inactivity (${e.inactiveDays} days)`,
        );
        await archive_league(e.leagueID);
      }),
    );
  }

  const deleteUserConfig = await db
    .selectFrom("data")
    .select("value2")
    .where("value1", "=", "configDeleteInactiveUser")
    .executeTakeFirst();
  const daysUntilUserDeleted = parseInt(deleteUserConfig?.value2 || "0");

  // Deletes all user that have been inactive for too long
  if (daysUntilUserDeleted > 0) {
    const usersToDelete: Selectable<Users>[] = await db
      .selectFrom("users")
      .selectAll()
      .where("inactiveDays", ">=", daysUntilUserDeleted)
      .where("active", "=", 0) // Assuming 0 means inactive
      .execute();

    await Promise.all(
      usersToDelete.map(async (e) => {
        const userLeagues: Selectable<LeagueUsers>[] = await db
          .selectFrom("leagueUsers")
          .selectAll()
          .where("user", "=", e.id)
          .execute();

        await Promise.all(
          userLeagues.map((leagueUser) =>
            leaveLeague(leagueUser.leagueID, e.id),
          ),
        );
        console.log(
          `User ${e.id} was deleted due to inactivity (${e.inactiveDays} days)`,
        );
        await db.deleteFrom("users").where("id", "=", e.id).execute();
      }),
    );
  }

  // Set all leagues and users to inactive for the next cycle's increment
  await db.updateTable("leagueSettings").set({ active: 0 }).execute();
  await db.updateTable("users").set({ active: 0 }).execute();
}

async function update() {
  const enabledPlugins: Selectable<Plugins>[] = await db
    .selectFrom("plugins")
    .selectAll()
    .where("enabled", "=", 1)
    .execute();

  // Increases the throttle attempts left by 1, up to a max of 30
  await db
    .updateTable("users")
    .set({
      throttle: (eb) => eb("throttle", "+", 1),
    })
    .where("throttle", "<", 30)
    .execute();

  const newDate = new Date();
  if (day !== newDate.getDay()) {
    day = newDate.getDay(); // Update current day

    // --- Daily Tasks ---
    const allUsers: Selectable<Users>[] = await db
      .selectFrom("users")
      .selectAll()
      .execute();

    const localeActive: { [Key: string]: number } = {};
    const localeTotal: { [Key: string]: number } = {};
    const themeActive: { [Key: string]: number } = {};
    const themeTotal: { [Key: string]: number } = {};

    for (const user of allUsers) {
      if (user.locale && user.locale !== "") {
        localeTotal[user.locale] = (localeTotal[user.locale] || 0) + 1;
        if (user.active) {
          // Assuming user.active is boolean or 0/1
          localeActive[user.locale] = (localeActive[user.locale] || 0) + 1;
        }
      }
      if (user.theme && user.theme !== "") {
        const themeKey = ["light", "dark"].includes(user.theme)
          ? user.theme
          : "custom";
        themeTotal[themeKey] = (themeTotal[themeKey] || 0) + 1;
        if (user.active) {
          themeActive[themeKey] = (themeActive[themeKey] || 0) + 1;
        }
      }
    }

    const leagueActiveStats: { [Key: string]: number } = {};
    const leagueTotalStats: { [Key: string]: number } = {};

    for (const plugin of enabledPlugins) {
      if (!plugin.name) continue; // Skip if plugin has no name

      const activeUsersInLeague = await db
        .selectFrom("leagueUsers")
        .select((eb) => eb.fn.countAll<string>().as("count")) // Kysely needs explicit type for countAll
        .where((eb) =>
          eb.exists(
            eb
              .selectFrom("leagueSettings")
              .select("leagueSettings.leagueID")
              .whereRef("leagueSettings.leagueID", "=", "leagueUsers.leagueID")
              .where("leagueSettings.league", "=", plugin.name!)
              .where("leagueSettings.archived", "=", 0)
              .where("leagueSettings.active", "=", 1),
          ),
        )
        .where((eb) =>
          eb.exists(
            eb
              .selectFrom("users")
              .select("users.id")
              .whereRef("users.id", "=", "leagueUsers.user")
              .where("users.active", "=", 1), // Assuming active is 1 for true
          ),
        )
        .executeTakeFirst();
      leagueActiveStats[plugin.name] = parseInt(
        activeUsersInLeague?.count || "0",
        10,
      );

      const totalUsersInLeague = await db
        .selectFrom("leagueUsers")
        .select((eb) => eb.fn.countAll<string>().as("count"))
        .where((eb) =>
          eb.exists(
            eb
              .selectFrom("leagueSettings")
              .select("leagueSettings.leagueID")
              .whereRef("leagueSettings.leagueID", "=", "leagueUsers.leagueID")
              .where("leagueSettings.league", "=", plugin.name!)
              .where("leagueSettings.archived", "=", 0),
          ),
        )
        .executeTakeFirst();
      leagueTotalStats[plugin.name] = parseInt(
        totalUsersInLeague?.count || "0",
        10,
      );
    }

    const serverIDEntry = await db
      .selectFrom("data")
      .select("value2")
      .where("value1", "=", "serverID")
      .executeTakeFirst();
    const serverID = serverIDEntry?.value2 || "unknown_server_id";

    const analyticsPayload = {
      serverID: serverID,
      total: allUsers.length,
      active: allUsers.filter((u) => u.active).length,
      version: versionPackage.version,
      leagueActive: JSON.stringify(leagueActiveStats),
      leagueTotal: JSON.stringify(leagueTotalStats),
      themeActive: JSON.stringify(themeActive),
      themeTotal: JSON.stringify(themeTotal),
      localeActive: JSON.stringify(localeActive),
      localeTotal: JSON.stringify(localeTotal),
    };
    const JSONbody = JSON.stringify(analyticsPayload);

    if (
      process.env.APP_ENV !== "development" &&
      process.env.APP_ENV !== "test"
    ) {
      if (process.env.ANALYTICS_OPT_OUT !== "optout") {
        fetch(`${analyticsDomain}/api/analytics`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSONbody,
        }).catch((e) => console.error("Failed to send analytics data:", e));
      }
    }

    // Send analytics to local/internal endpoint
    fetch(`http://localhost:3000/api/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSONbody,
    }).catch((e) => console.error("Failed to send local analytics data:", e));

    await archiveInactive();

    setTimeout(async () => {
      const lastDayRecord = await db
        .selectFrom("analytics")
        .select((eb) => eb.fn.max("day").as("max_day"))
        .executeTakeFirst();

      const todayEpochDays = Math.floor(Date.now() / (1000 * 86400));
      let lastCompiledDay = lastDayRecord?.max_day;

      if (lastCompiledDay !== null && lastCompiledDay !== undefined) {
        while (lastCompiledDay < todayEpochDays) {
          await compileAnalytics(lastCompiledDay);
          lastCompiledDay++;
        }
      }
      await compileAnalytics(todayEpochDays);
      console.log("Compiled server analytics up to day:", todayEpochDays);
    }, 10000);
  } else {
    // --- Regular Interval Update (not a new day) ---
    for (const plugin of enabledPlugins) {
      if (!plugin.name || !plugin.url) continue;

      const updateRequestedEntry = await db
        .selectFrom("data")
        .select("value1") // select any column to check existence
        .where("value1", "=", "update" + plugin.name)
        .where("value2", "=", "1") // Assuming '1' means update requested
        .executeTakeFirst();
      const isUpdateRequested = !!updateRequestedEntry;
      const isUpdateNeeded = (await timeUntilUpdate(plugin.name, true)) < 0;

      if (isUpdateRequested || isUpdateNeeded) {
        console.log(`Updating data for ${plugin.name} now`);
        updateData(plugin.url);
      }
    }
  }

  // --- Tasks for every interval, regardless of new day ---
  await Promise.all(
    enabledPlugins.map(async (plugin) => {
      if (!plugin.name || !plugin.url) return;

      // Reset update request flag
      await db
        .insertInto("data")
        .values({ value1: `update${plugin.name}`, value2: "0" })
        .onConflict((oc) => oc.doUpdateSet({ value2: "0" }))
        .execute();

      const countdownEntry = await db
        .selectFrom("data")
        .select("value2")
        .where("value1", "=", `countdown${plugin.name}`)
        .executeTakeFirst();

      if (countdownEntry?.value2) {
        const time = parseInt(countdownEntry.value2, 10);
        if (!isNaN(time)) {
          if (time - 10 > 0) {
            await db
              .updateTable("data")
              .set({ value2: (time - 10).toString() })
              .where("value1", "=", `countdown${plugin.name}`)
              .execute();
          } else if (time > 0) {
            // Countdown reached zero or below
            updateData(plugin.url); // This was called for both transferOpen true/false case if time > 0
            await db
              .updateTable("data")
              .set({ value2: "0" })
              .where("value1", "=", `countdown${plugin.name}`)
              .execute();
          }
        }
      }
    }),
  );

  // Update 'lastUpdateCheck' timestamp
  const nowTimestamp = String(Math.floor(Date.now() / 1000));
  await db
    .insertInto("data")
    .values({ value1: "lastUpdateCheck", value2: nowTimestamp })
    .onConflict((oc) => oc.doUpdateSet({ value2: nowTimestamp }))
    .execute();
}
