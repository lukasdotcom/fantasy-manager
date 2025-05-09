import db from "../Modules/database";
import { LeagueSettings, LeagueUsers, Points } from "#type/db";
import { Selectable } from "kysely";

async function top11(userID: number, leagueID: number) {
  const formation = JSON.parse(
    (
      await db
        .selectFrom("leagueUsers")
        .select("formation")
        .where("leagueID", "=", leagueID)
        .where("user", "=", userID)
        .executeTakeFirst()
    )?.formation || "",
  );
  const leagueSettings = await db
    .selectFrom("leagueSettings")
    .select(["league", "starredPercentage"])
    .where("leagueID", "=", leagueID)
    .executeTakeFirst();
  const players = await db
    .selectFrom("squad")
    .innerJoin("players", "players.uid", "squad.playeruid")
    .select((eb) => [
      "squad.playeruid",
      "players.position",
      eb(
        "players.last_match",
        "+",
        eb(
          "players.last_match",
          "*",
          eb(
            "starred",
            "*",
            (leagueSettings?.starredPercentage || 100) / 100 - 1,
          ),
        ),
      ).as("points"),
    ])
    .where("user", "=", userID)
    .where("leagueID", "=", leagueID)
    .orderBy("players.position", "desc")
    .orderBy("points", "desc")
    .execute();
  const parts = ["gk", "def", "mid", "att"];
  // Goes through every character and moves them to the correct position
  for (const player of players) {
    const position = parts.indexOf(player.position);
    await db
      .updateTable("squad")
      .set({
        position: formation[position] > 0 ? player.position : "bench",
      })
      .where("playeruid", "=", player.playeruid)
      .where("leagueID", "=", leagueID)
      .where("user", "=", userID)
      .execute();
    formation[position]--;
  }
}
/**
 * Calculates the total points for unstarred players for a user.
 *
 * @param {leagueUsers} user - The user for whom to calculate the points.
 * @return {Promise<number>} The total points for unstarred players.
 */
async function calcUnstarredPoints(
  user: Selectable<LeagueUsers>,
): Promise<number> {
  const result = await db
    .selectFrom("players")
    .select([(eb) => eb.fn.sum("last_match").as("sum")])
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom("squad")
          .select("squad.leagueID")
          .whereRef("squad.playeruid", "=", "players.uid")
          .where("position", "!=", "bench")
          .where("leagueID", "=", user.leagueID)
          .where("user", "=", user.user)
          .where("starred", "=", 0),
      ),
    )
    .executeTakeFirst();
  return parseInt(String(result?.sum)) || 0;
}
/**
 * Calculates the total points for a user's starred players in a league.
 *
 * @param {leagueUsers} user - The user for whom to calculate the points.
 * @return {Promise<number>} The total points for the user's starred players.
 */
export async function calcStarredPoints(
  user: Selectable<LeagueUsers>,
): Promise<number> {
  const result = await db
    .selectFrom("players")
    .select([(eb) => eb.fn.sum("last_match").as("sum")])
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom("squad")
          .select("squad.leagueID")
          .whereRef("squad.playeruid", "=", "players.uid")
          .where("position", "!=", "bench")
          .where("leagueID", "=", user.leagueID)
          .where("user", "=", user.user)
          .where("starred", "=", 1),
      ),
    )
    .executeTakeFirst();
  const points = parseInt(String(result?.sum)) || 0;
  const starMultiplier = await db
    .selectFrom("leagueSettings")
    .select("starredPercentage")
    .where("leagueID", "=", user.leagueID)
    .executeTakeFirst()
    .then((e) => (e ? e.starredPercentage / 100 : 1.5));
  return Math.ceil(points * starMultiplier);
}
export interface predictions_raw {
  club: string;
  home: number | null;
  away: number | null;
}
/**
 * Calculates the total prediction points based on the provided predictions and actual game results.
 *
 * @param {predictions_raw[]} predictions - An array of predicted scores for various clubs.
 * @param {predictions_raw[]} games - An array of actual game results for various clubs.
 * @param {Selectable<LeagueSettings>} settings - The league settings that contain the scoring rules for predictions.
 * @return {number} The total points accumulated from the predictions based on the scoring rules.
 *
 * The function iterates through each prediction and compares it against the actual game result for the same club.
 * Points are awarded based on:
 * - Exact match of predicted and actual scores.
 * - Correct prediction of the goal difference.
 * - Correct prediction of the match outcome (winner).
 */
export function calcPredicitionPointsRaw(
  predictions: predictions_raw[],
  games: predictions_raw[],
  settings: Selectable<LeagueSettings>,
): number {
  let points = 0;
  for (const prediction of predictions) {
    if (prediction.home === null || prediction.away === null) {
      continue;
    }
    for (const game of games) {
      if (game.home === null || game.away === null) {
        continue;
      }
      if (prediction.club == game.club) {
        // Checks if the score was exactly right
        if (prediction.home === game.home && prediction.away === game.away) {
          points += settings.predictExact;
        }
        // Checks if the correct difference in points was chosen
        else if (prediction.home - prediction.away === game.home - game.away) {
          points += settings.predictDifference;
        }
        // Checks if the correct winner was chosen
        else if (
          prediction.home > prediction.away === game.home > game.away &&
          (prediction.home === prediction.away) === (game.home === game.away)
        ) {
          points += settings.predictWinner;
        }
      }
    }
  }
  return points;
}
/**
 * Calculates the total prediction points for a given user for a given matchday.
 *
 * @param {points} matchday - The matchday for which to calculate the prediction points.
 * @return {Promise<number>} The total prediction points for the user for the given matchday.
 */
export async function calcHistoricalPredictionPoints(
  matchday: Selectable<Points>,
): Promise<number> {
  const settings = await db
    .selectFrom("leagueSettings")
    .selectAll()
    .where("leagueID", "=", matchday.leagueID)
    .executeTakeFirst();
  if (settings === undefined) {
    return 0;
  }
  const predictions = await db
    .selectFrom("historicalPredictions")
    .selectAll()
    .where("user", "=", matchday.user)
    .where("leagueID", "=", matchday.leagueID)
    .where("matchday", "=", matchday.matchday)
    .execute();
  const games = (
    await db
      .selectFrom("historicalClubs")
      .selectAll()
      .where("league", "=", settings.league)
      .where("home", "=", 1)
      .where("time", "=", matchday.time)
      .execute()
  ).map((e) => ({
    home: e.teamScore,
    away: e.opponentScore,
    club: e.club,
  }));
  return calcPredicitionPointsRaw(predictions, games, settings);
}
/**
 * Calculates the prediction points for a given user.
 *
 * @param {leagueUsers} user - The user for whom to calculate the prediction points.
 * @return {Promise<number>} The prediction points for the user.
 */
export async function calcPredictionsPointsNow(
  user: Selectable<LeagueUsers>,
): Promise<number> {
  const settings = await db
    .selectFrom("leagueSettings")
    .selectAll()
    .where("leagueID", "=", user.leagueID)
    .executeTakeFirst();
  if (settings === undefined) {
    return 0;
  }
  // Changes all the nulls to 0's to prevent invalid predictions from existing
  await db
    .updateTable("predictions")
    .set({
      home: (eb) => eb.fn.coalesce("home", eb.lit(0)),
      away: (eb) => eb.fn.coalesce("away", eb.lit(0)),
    })
    .where("user", "=", user.user)
    .where("leagueID", "=", user.leagueID)
    .execute();
  const predictions = await db
    .selectFrom("predictions")
    .selectAll()
    .where("user", "=", user.user)
    .where("leagueID", "=", user.leagueID)
    .execute();
  const games = (
    await db
      .selectFrom("clubs")
      .selectAll()
      .where("league", "=", settings.league)
      .where("home", "=", 1)
      .execute()
  ).map((e) => ({
    club: e.club,
    home: e.teamScore,
    away: e.opponentScore,
  }));
  return calcPredicitionPointsRaw(predictions, games, settings);
}
/**
 * Calculates and updates the points for the specified league.
 *
 * @param {string | number} leagueInput - The league type or leagueID.
 */
export async function calcPointsType(leagueInput: string | number) {
  let determinedLeagueID: number | undefined;
  let determinedLeagueName: string = String(leagueInput);

  const parsedLeagueID = parseInt(String(leagueInput));
  if (!isNaN(parsedLeagueID) && parsedLeagueID > 0) {
    const leagueData = await db
      .selectFrom("leagueSettings")
      .select(["leagueID", "league"])
      .where("leagueID", "=", parsedLeagueID)
      .where("archived", "=", 0)
      .executeTakeFirst();
    if (leagueData) {
      determinedLeagueID = leagueData.leagueID;
      determinedLeagueName = leagueData.league;
    }
  }

  // Makes sure that the transfer season is running
  const transferOpenData = await db
    .selectFrom("data")
    .select("value2")
    .where("value1", "=", "transferOpen" + determinedLeagueName)
    .executeTakeFirst();

  if (transferOpenData?.value2 === "true") {
    return;
  }

  console.log(
    `Calculating user points for ${
      determinedLeagueID ? `leagueID ${determinedLeagueID} in the ` : ""
    }${determinedLeagueName}`,
  );

  let leagueUsers: Selectable<LeagueUsers>[];
  if (determinedLeagueID) {
    leagueUsers = await db
      .selectFrom("leagueUsers")
      .selectAll()
      .where("leagueID", "=", determinedLeagueID)
      .execute();
  } else {
    leagueUsers = await db
      .selectFrom("leagueUsers")
      .selectAll()
      .where((eb) =>
        eb.exists(
          eb
            .selectFrom("leagueSettings")
            .select("leagueSettings.leagueID")
            .whereRef("leagueSettings.leagueID", "=", "leagueUsers.leagueID")
            .where("leagueSettings.league", "=", determinedLeagueName)
            .where("leagueSettings.archived", "=", 0)
            .where((eb2) =>
              eb2.exists(
                eb2
                  .selectFrom("points")
                  .select("points.leagueID")
                  .whereRef("points.leagueID", "=", "leagueUsers.leagueID")
                  .where("points.time", "is", null),
              ),
            ),
        ),
      )
      .orderBy("leagueID")
      .execute();
  }

  let index = 0;
  let currentProcessingLeagueID = -1; // Renamed to avoid conflict with loop variable e.leagueID
  let matchday = 1;

  while (index < leagueUsers.length) {
    const e = leagueUsers[index];
    index++;

    // Moves top 11 players when needed
    const top11Setting = await db
      .selectFrom("leagueSettings")
      .select("leagueID") // Select any column to check existence
      .where("leagueID", "=", e.leagueID)
      .where("top11", "=", 1)
      .executeTakeFirst();

    if (top11Setting) {
      await top11(e.user, e.leagueID);
    }

    const oldPointsData = await db
      .selectFrom("points")
      .select(["fantasyPoints", "predictionPoints"])
      .where("leagueID", "=", e.leagueID)
      .where("user", "=", e.user)
      .where("time", "is", null)
      .orderBy("matchday", "desc")
      .limit(1)
      .executeTakeFirst();

    const [oldFantasyPoints, oldPredictionPoints] = oldPointsData
      ? [oldPointsData.fantasyPoints ?? 0, oldPointsData.predictionPoints ?? 0] // Handle null from DB
      : [0, 0];

    const newFantasyPointsPromise = (async () => {
      const unstarred = await calcUnstarredPoints(e);
      const starred = await calcStarredPoints(e);
      return unstarred + starred;
    })();

    const [newFantasyPoints, newPredictionPoints] = await Promise.all([
      newFantasyPointsPromise,
      calcPredictionsPointsNow(e),
    ]);

    if (e.leagueID !== currentProcessingLeagueID) {
      currentProcessingLeagueID = e.leagueID;
      const matchdayData = await db
        .selectFrom("points")
        .select("matchday")
        .where("leagueID", "=", currentProcessingLeagueID)
        .orderBy("matchday", "desc")
        .limit(1)
        .executeTakeFirst();
      matchday = matchdayData ? matchdayData.matchday : 1;
    }

    if (oldFantasyPoints !== newFantasyPoints) {
      await db
        .updateTable("points")
        .set((eb) => ({
          fantasyPoints: newFantasyPoints,
          points: eb("predictionPoints", "+", newFantasyPoints),
        }))
        .where("leagueID", "=", e.leagueID)
        .where("user", "=", e.user)
        .where("matchday", "=", matchday)
        .execute();

      const updatedUserFantasyPoints =
        (e.fantasyPoints ?? 0) - oldFantasyPoints + newFantasyPoints;
      await db
        .updateTable("leagueUsers")
        .set((eb) => ({
          fantasyPoints: updatedUserFantasyPoints,
          points: eb("predictionPoints", "+", updatedUserFantasyPoints),
        }))
        .where("leagueID", "=", e.leagueID)
        .where("user", "=", e.user)
        .execute();
      e.fantasyPoints = updatedUserFantasyPoints; // Update in-memory object if used later
    }

    if (oldPredictionPoints !== newPredictionPoints) {
      await db
        .updateTable("points")
        .set((eb) => ({
          predictionPoints: newPredictionPoints,
          points: eb("fantasyPoints", "+", newPredictionPoints),
        }))
        .where("leagueID", "=", e.leagueID)
        .where("user", "=", e.user)
        .where("matchday", "=", matchday)
        .where("time", "is", null) // typically update current matchday record
        .execute();

      const updatedUserPredictionPoints =
        (e.predictionPoints ?? 0) - oldPredictionPoints + newPredictionPoints;
      await db
        .updateTable("leagueUsers")
        .set((eb) => ({
          predictionPoints: updatedUserPredictionPoints,
          points: eb("fantasyPoints", "+", updatedUserPredictionPoints),
        }))
        .where("leagueID", "=", e.leagueID)
        .where("user", "=", e.user)
        .execute();
      e.predictionPoints = updatedUserPredictionPoints; // Update in-memory object
    }
  }
  console.log(
    `Updated user points for ${
      determinedLeagueID ? `leagueID ${determinedLeagueID} in the ` : ""
    }${determinedLeagueName}`,
  );
  return;
}
/**
 * Calculates and updates the points for the specified league.
 *
 * @param {number} leagueID_input - The league id.
 */
export async function calcPointsLeague(leagueID_input: number) {
  const leagueSetting = await db
    .selectFrom("leagueSettings")
    .select(["leagueID", "league"])
    .where("leagueID", "=", leagueID_input)
    .where("archived", "=", 0)
    .executeTakeFirst();

  if (!leagueSetting) {
    console.log(`League with ID ${leagueID_input} not found or archived.`);
    return;
  }

  const currentLeagueID = leagueSetting.leagueID;
  const currentLeagueName = leagueSetting.league;

  // Makes sure that the transfer season is running
  const transferOpenData = await db
    .selectFrom("data")
    .select("value2")
    .where("value1", "=", "transferOpen" + currentLeagueName)
    .executeTakeFirst();

  if (transferOpenData?.value2 === "true") {
    // connection.end(); // Not needed
    return;
  }

  console.log(
    `Calculating user points for leagueID ${currentLeagueID} in the ${currentLeagueName}`,
  );

  const leagueUsers: Selectable<LeagueUsers>[] = await db
    .selectFrom("leagueUsers")
    .selectAll()
    .where("leagueID", "=", currentLeagueID)
    .execute();

  let index = 0;
  let currentProcessingLeagueID = -1; // Tracks the leagueID for matchday calculation
  let matchday = 1;

  while (index < leagueUsers.length) {
    const e = leagueUsers[index];
    index++;

    const top11Setting = await db
      .selectFrom("leagueSettings")
      .select("leagueID")
      .where("leagueID", "=", e.leagueID)
      .where("top11", "=", 1)
      .executeTakeFirst();

    if (top11Setting) {
      await top11(e.user, e.leagueID);
    }

    const oldPointsData = await db
      .selectFrom("points")
      .select(["fantasyPoints", "predictionPoints"])
      .where("leagueID", "=", e.leagueID)
      .where("user", "=", e.user)
      .where("time", "is", null)
      .orderBy("matchday", "desc")
      .limit(1)
      .executeTakeFirst();

    const [oldFantasyPoints, oldPredictionPoints] = oldPointsData
      ? [oldPointsData.fantasyPoints ?? 0, oldPointsData.predictionPoints ?? 0]
      : [0, 0];

    const newFantasyPointsPromise = (async () => {
      const unstarred = await calcUnstarredPoints(e);
      const starred = await calcStarredPoints(e);
      return unstarred + starred;
    })();

    const [newFantasyPoints, newPredictionPoints] = await Promise.all([
      newFantasyPointsPromise,
      calcPredictionsPointsNow(e),
    ]);

    if (e.leagueID !== currentProcessingLeagueID) {
      currentProcessingLeagueID = e.leagueID;
      const matchdayData = await db
        .selectFrom("points")
        .select("matchday")
        .where("leagueID", "=", currentProcessingLeagueID)
        .orderBy("matchday", "desc")
        .limit(1)
        .executeTakeFirst();
      matchday = matchdayData ? matchdayData.matchday : 1;
    }

    if (oldFantasyPoints !== newFantasyPoints) {
      await db
        .updateTable("points")
        .set((eb) => ({
          fantasyPoints: newFantasyPoints,
          points: eb("predictionPoints", "+", newFantasyPoints),
        }))
        .where("leagueID", "=", e.leagueID)
        .where("user", "=", e.user)
        .where("matchday", "=", matchday)
        .where("time", "is", null)
        .execute();

      const updatedUserFantasyPoints =
        (e.fantasyPoints ?? 0) - oldFantasyPoints + newFantasyPoints;
      await db
        .updateTable("leagueUsers")
        .set((eb) => ({
          fantasyPoints: updatedUserFantasyPoints,
          points: eb("predictionPoints", "+", updatedUserFantasyPoints),
        }))
        .where("leagueID", "=", e.leagueID)
        .where("user", "=", e.user)
        .execute();
      e.fantasyPoints = updatedUserFantasyPoints;
    }

    if (oldPredictionPoints !== newPredictionPoints) {
      await db
        .updateTable("points")
        .set((eb) => ({
          predictionPoints: newPredictionPoints,
          points: eb("fantasyPoints", "+", newPredictionPoints),
        }))
        .where("leagueID", "=", e.leagueID)
        .where("user", "=", e.user)
        .where("matchday", "=", matchday)
        .where("time", "is", null)
        .execute();

      const updatedUserPredictionPoints =
        (e.predictionPoints ?? 0) - oldPredictionPoints + newPredictionPoints;
      await db
        .updateTable("leagueUsers")
        .set((eb) => ({
          predictionPoints: updatedUserPredictionPoints,
          points: eb("fantasyPoints", "+", updatedUserPredictionPoints),
        }))
        .where("leagueID", "=", e.leagueID)
        .where("user", "=", e.user)
        .execute();
      e.predictionPoints = updatedUserPredictionPoints;
    }
  }
  console.log(
    `Updated user points for leagueID ${currentLeagueID} in the ${currentLeagueName}`,
  );
  return;
}
