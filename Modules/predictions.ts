import { sql } from "kysely";
import { predictions } from "#type/database";
import db from "#database";

/**
 * Retrieves predictions for a given league and matchday.
 *
 * @param {number} user - The user ID.
 * @param {number} league - The league ID.
 * @param {(league: string) => Promise<void>} [checkUpdate] - The optional checkUpdate function located at #/scripts/checkUpdate. Doesn't like being imported in here.
 * @param {number} [matchday] - The optional matchday number. If set to -1 then the future will be grabbed.
 * @return {Promise<predictions[]>} An array of all the predictions that the user had
 */
export const get_predictions = async (
  user: number,
  league: number,
  checkUpdate?: (league: string) => Promise<void>,
  matchday?: number,
) => {
  const leagueType = await db
    .selectFrom("leagueSettings")
    .select("league")
    .where("leagueID", "=", league)
    .executeTakeFirst()
    .then((e) => (e ? e.league : ""));
  if (checkUpdate) checkUpdate(leagueType);
  // Gets future predictions if matchday is -1
  if (matchday === -1) {
    return await sql<predictions[]>`SELECT 
        futureClubs.club as home_team,
        futureClubs.fullName as home_team_name,
        futureClubs.opponent as away_team, 
        opponent.fullName as away_team_name,
        futureClubs.gameStart as gameStart,
        99999999999 as gameEnd,
        futurePredictions.home AS home_prediction, 
        futurePredictions.away AS away_prediction 
      FROM 
        futureClubs 
        LEFT OUTER JOIN futurePredictions ON futurePredictions.club = futureClubs.club
        AND futurePredictions.league = ${leagueType} 
        AND futurePredictions.user = ${user}
        AND futurePredictions.leagueID = ${league}
        AND futurePredictions.gameStart = futureClubs.gameStart
        LEFT OUTER JOIN futureClubs AS opponent ON opponent.club = futureClubs.opponent
        AND opponent.league = futureClubs.league
        AND opponent.gameStart = futureClubs.gameStart
      WHERE 
        futureClubs.home = 1 
        AND futureClubs.league = ${leagueType}
      ORDER BY
        gameStart`
      .execute(db)
      .then((e) => e.rows);
  }
  if (matchday) {
    const time = await db
      .selectFrom("points")
      .select("time")
      .where("matchday", "=", matchday)
      .where("leagueID", "=", league)
      .executeTakeFirst()
      .then((e) => (e ? e.time : 0));
    return sql<predictions[]>`SELECT 
        historicalClubs.club as home_team,
        historicalClubs.fullName as home_team_name,
        historicalClubs.opponent as away_team, 
        opponent.fullName as away_team_name,
        historicalClubs.teamScore AS home_score, 
        historicalClubs.opponentScore AS away_score, 
        historicalClubs.gameStart as gameStart,
        0 as gameEnd,
        historicalPredictions.home AS home_prediction, 
        historicalPredictions.away AS away_prediction 
      FROM 
        historicalClubs 
        LEFT OUTER JOIN historicalPredictions ON historicalPredictions.club = historicalClubs.club 
        AND historicalPredictions.matchday = ${matchday}
        AND historicalPredictions.league = ${leagueType}
        AND historicalPredictions.user = ${user}
        AND historicalPredictions.leagueID = ${league}
        LEFT OUTER JOIN historicalClubs AS opponent ON opponent.club = historicalClubs.opponent
        AND opponent.league = historicalClubs.league
        AND opponent.time = historicalClubs.time
      WHERE 
        historicalClubs.home = 1 
        AND historicalClubs.league = ${leagueType}
        AND historicalClubs.time = ${time}
      ORDER BY
        gameStart`
      .execute(db)
      .then((e) => e.rows);
  }
  return sql<predictions[]>`SELECT 
      clubs.club as home_team,
      clubs.fullName as home_team_name,
      clubs.opponent as away_team, 
      opponent.fullName as away_team_name,
      clubs.teamScore AS home_score, 
      clubs.opponentScore AS away_score, 
      clubs.gameStart as gameStart,
      clubs.gameEnd as gameEnd,
      predictions.home AS home_prediction, 
      predictions.away AS away_prediction 
    FROM 
      clubs 
      LEFT OUTER JOIN predictions ON predictions.club = clubs.club
      AND predictions.league = ${leagueType}
      AND predictions.user = ${user}
      AND predictions.leagueID = ${league}
      LEFT OUTER JOIN clubs AS opponent ON opponent.club = clubs.opponent
      AND opponent.league = clubs.league
    WHERE 
      clubs.home = 1 
      AND clubs.league = ${leagueType}
    ORDER BY
      gameStart`
    .execute(db)
    .then((e) => e.rows);
};
