import { clubs as ClubsData, players as PlayersData } from "#/types/data";
import noAccents from "#Modules/normalize";
import db from "../Modules/database"; // Kysely instance
import {
  Players as PlayersTypeDb,
  FutureClubs as FutureClubsTypeDb,
} from "#type/db";
import { calcPointsType } from "./calcPoints";
import plugins from "./data"; // This is the compiled plugins object
import { downloadPicture } from "./pictures";
import { sql } from "kysely";

// Used to update all the data
export async function updateData(
  url: string,
  file = "./sample/data1.json",
): Promise<void> {
  // Defaults to the first plugin in the list if testing(should be Bundesliga)
  if (process.env.APP_ENV === "test") {
    const pluginKeys = Object.keys(plugins);
    if (pluginKeys.length > 0) {
      url = pluginKeys[0];
    } else {
      console.error("No plugins available for testing mode.");
      return;
    }
  }
  const currentTime = Math.floor(Date.now() / 1000);

  if (!Object.keys(plugins).includes(url)) {
    console.error(`Unknown league url ${url} data was requested`);
    return;
  }

  const leagueData = await db
    .selectFrom("plugins")
    .selectAll()
    .where("url", "=", url)
    .executeTakeFirst();

  if (!leagueData || !leagueData.name) {
    console.error(
      `Cannot locate league for url ${url} or league name is missing`,
    );
    return;
  }
  const league = leagueData.name;

  const lockedStatus = await db
    .selectFrom("data")
    .select("value1")
    .where("value1", "=", `locked${league}`)
    .executeTakeFirst();

  if (lockedStatus) {
    console.log(`League ${league} is locked. Update skipped.`);
    return;
  }

  let lastUpdateEntry = await db
    .selectFrom("data")
    .select("value2")
    .where("value1", "=", `playerUpdate${league}`)
    .executeTakeFirst();

  if (!lastUpdateEntry) {
    lastUpdateEntry = { value2: "0" }; // Default if no entry exists
  }
  const lastUpdateTimestamp = parseInt(lastUpdateEntry.value2, 10);

  // Locks the database to prevent updates
  await db
    .insertInto("data")
    .onConflict((eb) => eb.doNothing())
    .values({ value1: `locked${league}`, value2: `locked${league}` })
    .execute();

  const oldTransferEntry = await db
    .selectFrom("data")
    .select("value2")
    .where("value1", "=", `transferOpen${league}`)
    .executeTakeFirst();
  const oldTransfer = oldTransferEntry?.value2 === "true";

  const settings = JSON.parse(leagueData.settings || "{}");
  if (process.env.APP_ENV === "test") {
    settings.file = file;
  }

  const dbPlayersForPlugin = (
    await db
      .selectFrom("players")
      .selectAll()
      .where("league", "=", league)
      .execute()
  ).map((e) => ({
    ...e,
    exists: Boolean(e.exists),
    pictureUrl: "",
    height: 0,
    width: 0,
  }));
  const dbClubsForPlugin = (
    await db.selectFrom("clubs").selectAll().execute()
  ).map((e) => ({
    ...e,
    exists: Boolean(e.exists),
    fullName: e.fullName || undefined,
    opponent: e.opponent || undefined,
    teamScore: e.teamScore || undefined,
    opponentScore: e.opponentScore || undefined,
    home: e.home >= 0 ? Boolean(e.home) : undefined,
  }));

  type PluginReturnType = [
    boolean,
    number,
    PlayersData[],
    ClubsData[],
    { update_points_after_game_end?: boolean }?,
  ];
  type FailureType = ["FAILURE", "FAILURE", "FAILURE", "FAILURE", undefined];

  const pluginResult: PluginReturnType | FailureType = await plugins[url](
    settings,
    {
      players: dbPlayersForPlugin,
      clubs: dbClubsForPlugin,
      timestamp: lastUpdateTimestamp,
      transferOpen: oldTransfer,
    },
  ).catch((e): FailureType => {
    console.error(
      `Error - Failed to get data for ${league} (if this happens too often something is wrong) with error ${e}`,
    );
    return ["FAILURE", "FAILURE", "FAILURE", "FAILURE", undefined];
  });

  if (pluginResult[0] === "FAILURE") {
    await db
      .deleteFrom("data")
      .where("value1", "=", `locked${league}`)
      .execute();
    return;
  }

  const [
    newTransfer,
    countdown,
    playersFromPlugin,
    clubsFromPlugin,
    run_settings,
  ] = pluginResult;

  await db
    .insertInto("data")
    .values({
      value1: `playerUpdate${league}`,
      value2: currentTime.toString(),
    })
    .onConflict((oc) =>
      oc.column("value1").doUpdateSet({ value2: currentTime.toString() }),
    )
    .execute();

  playersFromPlugin.sort((a, b) => (a.club > b.club ? 1 : -1));

  await db
    .insertInto("data")
    .values({
      value1: `transferOpen${league}`,
      value2: String(newTransfer),
    })
    .onConflict((oc) =>
      oc.column("value1").doUpdateSet({ value2: String(newTransfer) }),
    )
    .execute();
  await db
    .insertInto("data")
    .values({ value1: `countdown${league}`, value2: countdown.toString() })
    .onConflict((oc) =>
      oc.column("value1").doUpdateSet({ value2: countdown.toString() }),
    )
    .execute();

  if (newTransfer && !oldTransfer) {
    // Transfer market just opened
    await endMatchday(league); // Original logic: if market opens, it implies previous matchday ended.
  }

  await db
    .updateTable("players")
    .set({ exists: 0 })
    .where("league", "=", league)
    .execute();

  let clubCache = "";
  let clubDone = false;
  let gameDone = false;

  const getClubFromPluginData = (clubName: string): ClubsData | undefined => {
    return clubsFromPlugin.find((c) => c.club === clubName);
  };

  const existingDbClubsSet: Set<string> = new Set(
    (await db.selectFrom("clubs").select("club").execute()).map((c) => c.club),
  );

  for (const val of playersFromPlugin) {
    let pictureRecord = await db
      .selectFrom("pictures")
      .selectAll()
      .where("url", "=", val.pictureUrl)
      .executeTakeFirst();

    if (!pictureRecord) {
      await db
        .insertInto("pictures")
        .values({
          url: val.pictureUrl,
          height: val.height,
          width: val.width,
          downloaded: 0, // Default
          downloading: 0, // Default
        })
        .execute();
      pictureRecord = await db
        .selectFrom("pictures")
        .selectAll()
        .where("url", "=", val.pictureUrl)
        .executeTakeFirstOrThrow(); // Should exist now

      const picDownloadConfig = await db
        .selectFrom("data")
        .select("value2")
        .where("value1", "=", "configDownloadPicture")
        .where((eb) =>
          eb.or([eb("value2", "=", "yes"), eb("value2", "=", "new&needed")]),
        )
        .executeTakeFirst();
      if (picDownloadConfig) {
        downloadPicture(pictureRecord.id);
      }
    }
    const pictureID = pictureRecord.id;

    if (val.club !== clubCache) {
      clubCache = val.club;
      existingDbClubsSet.delete(clubCache); // Mark this club as processed from plugin data
      const clubDataFromPlugin = getClubFromPluginData(clubCache) || {
        club: clubCache,
        gameStart: 0,
        opponent: "",
        league: league,
        gameEnd: 0,
      };

      if (clubDataFromPlugin.future_games) {
        for (const fg of clubDataFromPlugin.future_games) {
          const baseFutureClub: Omit<FutureClubsTypeDb, "home"> = {
            club: clubCache,
            gameStart: fg.gameStart,
            opponent: fg.opponent,
            league: clubDataFromPlugin.league,
            fullName: clubDataFromPlugin.fullName || null,
          };
          if (fg.home !== undefined) {
            await db
              .insertInto("futureClubs")
              .values({ ...baseFutureClub, home: fg.home ? 1 : 0 })
              .onConflict((oc) =>
                oc.columns(["club", "league", "gameStart"]).doUpdateSet({
                  opponent: fg.opponent,
                  fullName: clubDataFromPlugin.fullName || null,
                  home: fg.home ? 1 : 0,
                }),
              )
              .execute();
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const home = (eb: any) =>
              eb
                .case(
                  eb
                    .selectFrom("futureClubs as fc2")
                    .select("fc2.home")
                    .where("fc2.league", "=", clubDataFromPlugin.league)
                    .where("fc2.opponent", "=", clubCache) // Current club is opponent
                    .where("fc2.club", "=", fg.opponent) // Opponent is club
                    .where("fc2.gameStart", "=", fg.gameStart),
                )
                .when(1)
                .then(0)
                .else(1)
                .end();
            await db
              .insertInto("futureClubs")
              .values({
                ...baseFutureClub,
                home,
              })
              .onConflict((oc) =>
                oc.columns(["club", "league", "gameStart"]).doUpdateSet({
                  opponent: fg.opponent,
                  fullName: clubDataFromPlugin.fullName || null,
                  home,
                }),
              )
              .execute();
          }

          if (clubDataFromPlugin.fullName) {
            await db
              .updateTable("futureClubs")
              .set({ fullName: clubDataFromPlugin.fullName })
              .where("club", "=", clubCache)
              .where("league", "=", clubDataFromPlugin.league)
              .where("gameStart", "=", fg.gameStart)
              .execute();
          }
        }
      }

      await db
        .deleteFrom("futureClubs")
        .where("club", "=", clubCache)
        .where("league", "=", clubDataFromPlugin.league)
        .where("gameStart", "=", clubDataFromPlugin.gameStart)
        .execute();

      // Transfer predictions
      await db
        .insertInto("predictions")
        .columns(["leagueID", "user", "club", "league", "home", "away"])
        .expression((eb) =>
          eb
            .selectFrom("futurePredictions")
            .select(["leagueID", "user", "club", "league", "home", "away"])
            .where("club", "=", clubCache)
            .where("league", "=", clubDataFromPlugin.league)
            .where("gameStart", "=", clubDataFromPlugin.gameStart),
        )
        .onConflict((eb) => eb.doNothing())
        .execute();

      await db
        .deleteFrom("futurePredictions")
        .where("club", "=", clubCache)
        .where("league", "=", clubDataFromPlugin.league)
        .where("gameStart", "=", clubDataFromPlugin.gameStart)
        .execute();

      const previousDbClub = await db
        .selectFrom("clubs")
        .select(["gameStart", "gameEnd"])
        .where("club", "=", clubCache)
        .where("league", "=", clubDataFromPlugin.league)
        .executeTakeFirst();
      const previousDataGameStart = previousDbClub?.gameStart ?? Infinity;
      const previousDataGameEnd = previousDbClub?.gameEnd ?? Infinity;

      clubDone = !(
        Math.min(clubDataFromPlugin.gameStart, previousDataGameStart) >=
          currentTime || newTransfer
      );
      gameDone =
        lastUpdateTimestamp >
        Math.min(previousDataGameEnd, clubDataFromPlugin.gameEnd);
      const home =
        clubDataFromPlugin.home !== undefined
          ? clubDataFromPlugin.home
            ? 1
            : 0
          : // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (eb: any) =>
              eb
                .case(
                  eb
                    .selectFrom("futureClubs as fc2")
                    .select("fc2.home")
                    .where("fc2.league", "=", clubDataFromPlugin.league)
                    .where("fc2.opponent", "=", clubCache)
                    .where("fc2.club", "=", clubDataFromPlugin.opponent || "")
                    .where("fc2.gameStart", "=", clubDataFromPlugin.gameStart),
                )
                .when(1)
                .then(0)
                .else(1)
                .end();
      await db
        .insertInto("clubs")
        .values({
          club: clubDataFromPlugin.club,
          gameStart: clubDataFromPlugin.gameStart,
          gameEnd: clubDataFromPlugin.gameEnd,
          opponent: clubDataFromPlugin.opponent,
          league: clubDataFromPlugin.league,
          exists: 1,
          fullName: clubDataFromPlugin.fullName || null,
          teamScore: null, // Default, updated later if applicable
          opponentScore: null, // Default
          home,
        })
        .onConflict((oc) =>
          oc.columns(["club", "league"]).doUpdateSet({
            // gameStart, gameEnd, opponent might be updated conditionally below
            exists: 1,
            league: clubDataFromPlugin.league, // In case league changed for a club (unlikely)
            fullName: clubDataFromPlugin.fullName || null,
          }),
        )
        .execute();

      await db
        .updateTable("clubs")
        .set({
          home,
        })
        .where("club", "=", clubDataFromPlugin.club)
        .where("league", "=", clubDataFromPlugin.league)
        .execute();

      if (!clubDone) {
        await db
          .updateTable("clubs")
          .set({
            gameStart: clubDataFromPlugin.gameStart,
            gameEnd: clubDataFromPlugin.gameEnd,
            opponent: clubDataFromPlugin.opponent,
            home: home,
          })
          .where("club", "=", clubDataFromPlugin.club)
          .where("league", "=", clubDataFromPlugin.league)
          .execute();
      }
      if (!gameDone) {
        await db
          .updateTable("clubs")
          .set({ gameEnd: clubDataFromPlugin.gameEnd })
          .where("club", "=", clubDataFromPlugin.club)
          .where("league", "=", clubDataFromPlugin.league)
          .execute();
      }
      if (clubDone && !gameDone) {
        if (
          clubDataFromPlugin.opponentScore !== undefined &&
          clubDataFromPlugin.teamScore !== undefined
        ) {
          await db
            .updateTable("clubs")
            .set({
              teamScore: clubDataFromPlugin.teamScore,
              opponentScore: clubDataFromPlugin.opponentScore,
            })
            .where("club", "=", clubDataFromPlugin.club)
            .where("league", "=", clubDataFromPlugin.league)
            .execute();
        }
      }
    } // End club specific updates

    // Player updates
    const existingPlayer = await db
      .selectFrom("players")
      .select("uid") // Select minimal data to check existence
      .where("uid", "=", val.uid)
      .where("league", "=", league)
      .executeTakeFirst();

    if (!existingPlayer) {
      await db
        .insertInto("players")
        .values({
          uid: val.uid,
          name: val.name,
          nameAscii: noAccents(val.name),
          club: val.club,
          pictureID: pictureID,
          value: val.value,
          sale_price: val.sale_price || val.value,
          position: val.position,
          forecast: val.forecast || "a",
          total_points: val.total_points || val.last_match || 0,
          average_points:
            val.average_points || val.total_points || val.last_match || 0,
          last_match: val.last_match || val.total_points || 0,
          locked: clubDone ? 1 : 0,
          exists: val.exists ? 1 : 0,
          league: league,
        })
        .execute();
    } else {
      // Updates that always happen
      await db
        .updateTable("players")
        .set({
          name: val.name,
          nameAscii: noAccents(val.name),
          exists: val.exists ? 1 : 0,
          locked: clubDone ? 1 : 0,
        })
        .where("uid", "=", val.uid)
        .where("league", "=", league)
        .execute();

      // Updates if game has not started (or transfer market is open)
      if (!clubDone) {
        const updateSet: Partial<PlayersTypeDb> = {};
        if (val.forecast !== undefined) updateSet.forecast = val.forecast;
        if (val.total_points !== undefined)
          updateSet.total_points = val.total_points;
        if (val.average_points !== undefined)
          updateSet.average_points = val.average_points;

        if (Object.keys(updateSet).length > 0) {
          await db
            .updateTable("players")
            .set(updateSet)
            .where("uid", "=", val.uid)
            .where("league", "=", league)
            .execute();
        }
      }

      // Updates if transfer market is open
      if (newTransfer) {
        await db
          .updateTable("players")
          .set({
            club: val.club,
            pictureID: pictureID,
            value: val.value,
            sale_price: val.sale_price || val.value,
            position: val.position,
          })
          .where("uid", "=", val.uid)
          .where("league", "=", league)
          .execute();
      }

      // Updates player stats if game is running and not ended for too long (or forced)
      if (
        clubDone &&
        (!gameDone || !!run_settings?.update_points_after_game_end)
      ) {
        const currentPlayerData = await db
          .selectFrom("players")
          .select(["total_points", "last_match"])
          .where("uid", "=", val.uid)
          .where("league", "=", league)
          .executeTakeFirstOrThrow();

        let new_total_points = currentPlayerData.total_points;
        let new_last_match = currentPlayerData.last_match;

        if (val.total_points === undefined && val.last_match !== undefined) {
          new_total_points =
            (currentPlayerData.total_points || 0) +
            (val.last_match || 0) -
            (currentPlayerData.last_match || 0);
          new_last_match = val.last_match || 0;
        } else if (
          val.last_match === undefined &&
          val.total_points !== undefined
        ) {
          new_last_match =
            (currentPlayerData.last_match || 0) +
            (val.total_points || 0) -
            (currentPlayerData.total_points || 0);
          new_total_points = val.total_points || 0;
        } else if (
          val.last_match !== undefined &&
          val.total_points !== undefined
        ) {
          new_last_match = val.last_match;
          new_total_points = val.total_points;
        }
        await db
          .updateTable("players")
          .set({ last_match: new_last_match, total_points: new_total_points })
          .where("uid", "=", val.uid)
          .where("league", "=", league)
          .execute();

        let new_average_points = val.average_points;
        if (new_average_points === undefined) {
          const historicalCountResult = await db
            .selectFrom("historicalPlayers")
            .select((eb) => eb.fn.countAll<string>().as("num"))
            .where("uid", "=", val.uid)
            .where("league", "=", league)
            .executeTakeFirst();
          const gamesPlayed =
            parseInt(historicalCountResult?.num || "0", 10) + 1;
          new_average_points =
            Math.round(((new_total_points || 0) / gamesPlayed) * 10) / 10;
        }
        await db
          .updateTable("players")
          .set({ average_points: new_average_points })
          .where("uid", "=", val.uid)
          .where("league", "=", league)
          .execute();
      }
    }
  } // End player loop

  // Set clubs not in plugin data as non-existent
  for (const clubName in existingDbClubsSet) {
    if (clubName) {
      // Ensure clubName is not empty/null if that's possible in your DB
      await db
        .updateTable("clubs")
        .set({ exists: 0, home: 0 }) // Assuming home=0 resets it
        .where("club", "=", clubName)
        .where("league", "=", league)
        .execute();
    }
  }

  console.log(`Downloaded new data for ${league}`);

  if (!newTransfer) {
    // If transfer market is NOT open (i.e., matchday is ongoing or just ended)
    if (!oldTransfer) {
      // If market was previously closed (i.e. matchday started this cycle)
      await calcPointsType(league);
    } else {
      // Market was already closed (i.e. matchday ongoing)
      await startMatchday(league); // Original used startMatchday here, might need review if calcPoints is more appropriate
    }
  }

  await db.deleteFrom("data").where("value1", "=", `locked${league}`).execute();
  await db
    .insertInto("data")
    .values({ value1: `update${league}`, value2: "0" })
    .onConflict((oc) => oc.column("value1").doUpdateSet({ value2: "0" }))
    .execute();
}

export async function startMatchday(league: string): Promise<void> {
  console.log(`Starting matchday for ${league}`);

  // Delete transfers with no buyer for the given league
  await db
    .deleteFrom("transfers")
    .where("buyer", "=", -1)
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom("leagueSettings")
          .select("leagueSettings.leagueID")
          .whereRef("leagueSettings.leagueID", "=", "transfers.leagueID")
          .where("leagueSettings.league", "=", league),
      ),
    )
    .execute();

  const transfersToProcess = await db
    .selectFrom("transfers")
    .selectAll()
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom("leagueSettings")
          .select("leagueSettings.leagueID")
          .whereRef("leagueSettings.leagueID", "=", "transfers.leagueID")
          .where("leagueSettings.league", "=", league)
          .where("leagueSettings.archived", "=", 0),
      ),
    )
    .orderBy("leagueID")
    .execute();

  let currentleagueID = -1;
  let matchday = 1;

  for (const transfer of transfersToProcess) {
    await db
      .deleteFrom("squad")
      .where("leagueID", "=", transfer.leagueID)
      .where("playeruid", "=", transfer.playeruid)
      .where("user", "=", transfer.seller)
      .execute();

    if (transfer.buyer !== 0) {
      await db
        .insertInto("squad")
        .values({
          leagueID: transfer.leagueID,
          user: transfer.buyer,
          playeruid: transfer.playeruid,
          position: transfer.position,
          starred: transfer.starred,
        })
        .execute();
    }

    if (transfer.leagueID !== currentleagueID) {
      currentleagueID = transfer.leagueID;
      const maxMatchdayResult = await db
        .selectFrom("points")
        .select((eb) => eb.fn.max("matchday").as("max_matchday"))
        .where("leagueID", "=", currentleagueID)
        .executeTakeFirst();
      matchday = (Number(maxMatchdayResult?.max_matchday) || 0) + 1;
    }

    await db
      .insertInto("historicalTransfers")
      .values({
        matchday: matchday,
        leagueID: transfer.leagueID,
        seller: transfer.seller,
        buyer: transfer.buyer,
        playeruid: transfer.playeruid,
        value: transfer.value,
      })
      .execute();
  }

  await db
    .deleteFrom("transfers")
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom("leagueSettings")
          .select("leagueSettings.leagueID")
          .whereRef("leagueSettings.leagueID", "=", "transfers.leagueID")
          .where("leagueSettings.league", "=", league),
      ),
    )
    .execute();
  console.log(`Simulated every transfer for ${league}`);

  await db
    .updateTable("players")
    .set({ last_match: 0 })
    .where("league", "=", league)
    .execute();

  const leagueUsersForPoints = await db
    .selectFrom("leagueUsers")
    .select(["leagueID", "user", "points", "money"]) // Added money here
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom("leagueSettings")
          .select("leagueSettings.leagueID")
          .whereRef("leagueSettings.leagueID", "=", "leagueUsers.leagueID")
          .where("leagueSettings.league", "=", league)
          .where("leagueSettings.archived", "=", 0),
      ),
    )
    .orderBy("leagueID")
    .execute();

  currentleagueID = -1;
  matchday = 1;
  for (const lu of leagueUsersForPoints) {
    if (lu.leagueID !== currentleagueID) {
      currentleagueID = lu.leagueID;
      const maxMatchdayResult = await db
        .selectFrom("points")
        .select((eb) => eb.fn.max("matchday").as("max_matchday"))
        .where("leagueID", "=", currentleagueID)
        .executeTakeFirst();
      matchday = (Number(maxMatchdayResult?.max_matchday) || 0) + 1;
    }
    await db
      .insertInto("points")
      .values({
        leagueID: lu.leagueID,
        user: lu.user,
        points: 0, // Default to 0 for new matchday
        fantasyPoints: 0,
        predictionPoints: 0,
        matchday: matchday,
        money: lu.money, // money from leagueUsers
        time: null, // time is set when matchday ends
      })
      .execute();
  }
  await calcPointsType(league);
}

async function endMatchday(league: string): Promise<void> {
  console.log(`Ending Matchday for ${league}`);
  await calcPointsType(league); // Calculate final points before archiving

  const time = Math.floor(Date.now() / 1000);

  await db
    .updateTable("points")
    .set({ time: time })
    .where("time", "is", null)
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom("leagueSettings")
          .select("leagueSettings.leagueID")
          .whereRef("leagueSettings.leagueID", "=", "points.leagueID")
          .where("leagueSettings.league", "=", league),
      ),
    )
    .execute();

  console.log(`Archiving player data for ${league}`);
  await db
    .insertInto("historicalPlayers")
    .columns([
      "time",
      "uid",
      "name",
      "nameAscii",
      "club",
      "pictureID",
      "value",
      "sale_price",
      "position",
      "forecast",
      "total_points",
      "average_points",
      "last_match",
      "exists",
      "league",
    ])
    .expression((eb) =>
      eb
        .selectFrom("players")
        .select([
          sql.lit(time).as("time"),
          "uid",
          "name",
          "nameAscii",
          "club",
          "pictureID",
          "value",
          "sale_price",
          "position",
          "forecast",
          "total_points",
          "average_points",
          "last_match",
          "exists",
          "league",
        ])
        .where("players.league", "=", league),
    )
    .execute();

  console.log(`Archiving matchday data for ${league}`);
  await db
    .insertInto("historicalClubs")
    .columns([
      "club",
      "fullName",
      "gameStart",
      "opponent",
      "teamScore",
      "opponentScore",
      "league",
      "home",
      "time",
      "exists",
    ])
    .expression((eb) =>
      eb
        .selectFrom("clubs")
        .select([
          "club",
          "fullName",
          "gameStart",
          "opponent",
          "teamScore",
          "opponentScore",
          "league",
          "home",
          sql.lit(time).as("time"),
          "exists",
        ])
        .where("clubs.league", "=", league),
    )
    .execute();

  // Archive predictions
  await db
    .insertInto("historicalPredictions")
    .columns(["matchday", "leagueID", "user", "club", "league", "home", "away"])
    .expression((eb) =>
      eb
        .selectFrom("predictions")
        .select([
          (sle) =>
            sle
              .selectFrom("points")
              .select("matchday")
              .whereRef("points.leagueID", "=", "predictions.leagueID")
              .orderBy("matchday", "desc")
              .limit(1)
              .as("matchday"),
          "leagueID",
          "user",
          "club",
          "league",
          "home",
          "away",
        ]),
    )
    .execute();
  await db.deleteFrom("predictions").execute();

  // Archive squads
  await db
    .insertInto("historicalSquad")
    .columns([
      "matchday",
      "leagueID",
      "user",
      "playeruid",
      "position",
      "starred",
    ])
    .expression((eb) =>
      eb
        .selectFrom("squad")
        .where(sql.lit(true))
        .select([
          (sle) =>
            sle
              .selectFrom("points")
              .select("matchday")
              .whereRef("points.leagueID", "=", "squad.leagueID")
              .orderBy("matchday", "desc")
              .limit(1)
              .as("matchday"),
          "leagueID",
          "user",
          "playeruid",
          "position",
          "starred",
        ]),
    )
    .onConflict((oc) =>
      oc.doUpdateSet((eb) => ({
        position: eb.ref("excluded.position"),
        starred: eb.ref("excluded.starred"),
      })),
    )
    .execute();

  // Revalidate download page so it is up to date
  fetch(
    `${process.env.NEXTAUTH_URL_INTERNAL || "http://localhost:3000"}/api/revalidate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.NEXTAUTH_SECRET,
        path: "/download",
      }),
    },
  ).catch((err) => console.error("Failed to revalidate /download:", err));

  const nowTime = Math.floor(Date.now() / 1000);
  await db.deleteFrom("futureClubs").where("gameStart", "<", nowTime).execute();
  await db
    .deleteFrom("futurePredictions")
    .where("gameStart", "<", nowTime)
    .execute();

  await db
    .updateTable("clubs")
    .set({ teamScore: null, opponentScore: null })
    .where("league", "=", league)
    .execute();

  console.log("Ended Matchday for " + league);
}
