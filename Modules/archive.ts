import db from "./database";

/**
 * Archives a league by updating the archived timestamp in the leagueSettings table and deleting invites for the league.
 *
 * @param {string} league - The ID of the league to archive.
 */
export const archive_league = async (league: number) => {
  await db
    .updateTable("leagueSettings")
    .set({ archived: Math.floor(Date.now() / 1000) })
    .where("leagueID", "=", league)
    .execute();

  await db.deleteFrom("invite").where("leagueID", "=", league).execute();
};
