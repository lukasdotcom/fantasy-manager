import db from "../Modules/database";

/**
 * Checks if matchdays are currently happening and if it is a matchday checks if the update time has passed to request a new update.
 *
 * @param {string} league - The league to check for updates.
 * @return {Promise<void>} - A Promise that resolves when the update check is complete.
 */
export async function checkUpdate(league: string) {
  // No more `await connect()` or `connection.end()`

  // Checks if both 'transferOpen' and 'playerUpdate' entries exist for the league.
  // The original query logic implied needing at least two records matching the OR conditions.
  const dataEntries = await db
    .selectFrom("data")
    .select("value1") // Select a minimal column to check for existence and count
    .where((eb) =>
      eb.or([
        eb("value1", "=", "transferOpen" + league),
        eb("value1", "=", "playerUpdate" + league),
      ]),
    )
    .limit(2) // We only care if we find at least 2 distinct matching entries
    .execute();

  if (dataEntries.length < 2) {
    return;
  }

  if ((await timeUntilUpdate(league)) <= 0) {
    await db
      .insertInto("data")
      .values({ value1: "update" + league, value2: "1" }) // value2 is stored as string '1'
      .onConflict((oc) => oc.doUpdateSet({ value2: "1" }))
      .execute();
  }
}

/**
 * Returns the cache length for a league.
 * @param {string} league - The league you want to check.
 * @param {boolean} max - If you are looking at max or min time
 * @return {number} The length in seconds to wait. If negative this is how late you are
 */
export async function timeUntilUpdate(
  league: string,
  max: boolean = false,
): Promise<number> {
  const lockedEntry = await db
    .selectFrom("data")
    .select("value1") // Select any column to check for existence
    .where("value1", "=", "locked" + league)
    .executeTakeFirst();

  if (lockedEntry) {
    return 0; // Data is locked, no cache, update immediately
  }
  // Checks if a game is currently or is about to happen and if it is so if the update time has passed for that
  // If there is no game it is checked if the update time for that has passed
  const playerUpdateEntry = await db
    .selectFrom("data")
    .select("value2")
    .where("value1", "=", "playerUpdate" + league)
    .executeTakeFirst();

  if (!playerUpdateEntry || playerUpdateEntry.value2 === null) {
    return 0; // No player update time found or it's null
  }

  const gameTimeConfigKey = `config${max ? "Max" : "Min"}TimeGame`;
  const transferTimeConfigKey = `config${max ? "Max" : "Min"}TimeTransfer`;

  // Fetch config values in a single query for minor efficiency gain
  const configs = await db
    .selectFrom("data")
    .select(["value1", "value2"])
    .where((eb) =>
      eb.or([
        eb("value1", "=", gameTimeConfigKey),
        eb("value1", "=", transferTimeConfigKey),
      ]),
    )
    .execute();

  const gameTimeStr = configs.find(
    (c) => c.value1 === gameTimeConfigKey,
  )?.value2;
  const transferTimeStr = configs.find(
    (c) => c.value1 === transferTimeConfigKey,
  )?.value2;

  if (!gameTimeStr || !transferTimeStr) {
    console.error(
      `Missing time configurations ('${gameTimeConfigKey}' or '${transferTimeConfigKey}') in data table for league: ${league}`,
    );
    return 0; // Critical config missing
  }

  const gameTime = parseInt(gameTimeStr, 10);
  const transferTime = parseInt(transferTimeStr, 10);

  if (isNaN(gameTime) || isNaN(transferTime)) {
    console.error(
      `Invalid non-numeric time configurations in data table for league: ${league}. GameTime: '${gameTimeStr}', TransferTime: '${transferTimeStr}'`,
    );
    return 0; // Invalid config
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);

  const clubDefiningGameWindow = await db
    .selectFrom("clubs")
    .select("club") // Select any column to check for existence
    .where("gameStart", "<", nowInSeconds + gameTime - 120)
    .where("gameEnd", ">", nowInSeconds - gameTime)
    .where("league", "=", league)
    .executeTakeFirst();
  const isBeforeGame = !!clubDefiningGameWindow; // True if a game is starting soon or ongoing

  if (!isBeforeGame) {
    // This block handles an edge case from the original logic
    const nextClosestGame = await db
      .selectFrom("clubs")
      .select("gameStart") // Assuming gameStart is a numeric Unix timestamp
      .where("gameStart", "<", nowInSeconds + transferTime + 120)
      .where("gameEnd", ">", nowInSeconds) // Game must not have ended yet
      .where("league", "=", league)
      .orderBy("gameStart", "asc")
      .limit(1)
      .executeTakeFirst();

    let timeUntilGameEdgeCase = -1000; // Default value from original logic
    if (nextClosestGame && typeof nextClosestGame.gameStart === "number") {
      // Using a fresh Date.now() / 1000 as in original for this specific calculation's timing
      timeUntilGameEdgeCase =
        nextClosestGame.gameStart - Math.floor(Date.now() / 1000) - 120;
    }

    // If timeUntilGameEdgeCase is greater than -1000, it means a specific condition was met.
    // If it remains -1000 (e.g., no such game found), this condition is false, and we proceed.
    if (timeUntilGameEdgeCase > -1000) {
      return timeUntilGameEdgeCase;
    }
  }

  const lastPlayerUpdateTime = parseInt(playerUpdateEntry.value2, 10);
  if (isNaN(lastPlayerUpdateTime)) {
    console.error(
      `Invalid non-numeric playerUpdateValue in data table for league: ${league}. Value: '${playerUpdateEntry.value2}'`,
    );
    return 0; // Invalid data
  }

  const relevantTimeOffset = isBeforeGame ? gameTime : transferTime;
  // Calculate how much time is left until the next scheduled update
  return lastPlayerUpdateTime - (nowInSeconds - relevantTimeOffset);
}
