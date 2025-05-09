import db from "./database";

/**
+ * Deletes a user from a league and performs related cleanup tasks.
+ *
+ * @param {number} league - The ID of the league from which the user will be removed.
+ * @param {number} user - The ID of the user to be removed from the league.
+ * @return {Promise<void>} A promise that resolves once the user has been removed
+ */
export async function leaveLeague(league: number, user: number): Promise<void> {
  await db
    .deleteFrom("leagueUsers")
    .where("leagueID", "=", league)
    .where("user", "=", user)
    .execute();
  await db
    .deleteFrom("points")
    .where("leagueID", "=", league)
    .where("user", "=", user)
    .execute();
  await db
    .deleteFrom("squad")
    .where("leagueID", "=", league)
    .where("user", "=", user)
    .execute();
  await db
    .deleteFrom("historicalSquad")
    .where("leagueID", "=", league)
    .where("user", "=", user)
    .execute();
  await db
    .deleteFrom("historicalTransfers")
    .where("leagueID", "=", league)
    .where((eb) =>
      eb.or([
        eb.and([eb("buyer", "=", user), eb("seller", "=", 0)]),
        eb.and([eb("buyer", "=", 0), eb("seller", "=", user)]),
      ]),
    )
    .execute();
  await db
    .updateTable("transfers")
    .set("seller", 0)
    .where("leagueID", "=", league)
    .where("seller", "=", user)
    .execute();
  await db
    .updateTable("transfers")
    .set("buyer", 0)
    .where("leagueID", "=", league)
    .where("buyer", "=", user)
    .execute();
  console.log(`User ${user} left league ${league}`);
  // Checks if the league still has users
  const isEmpty = await db
    .selectFrom("leagueUsers")
    .selectAll()
    .where("leagueID", "=", league)
    .execute()
    .then((e) => e.length === 0);
  if (isEmpty) {
    await db.deleteFrom("invite").where("leagueID", "=", league).execute();
    await db.deleteFrom("transfers").where("leagueID", "=", league).execute();
    await db
      .deleteFrom("leagueSettings")
      .where("leagueID", "=", league)
      .execute();
    await db
      .deleteFrom("historicalTransfers")
      .where("leagueID", "=", league)
      .execute();
    await db
      .deleteFrom("historicalSquad")
      .where("leagueID", "=", league)
      .execute();
    await db
      .deleteFrom("announcements")
      .where("leagueID", "=", league)
      .execute();
    console.log(`League ${league} is now empty and is being deleted`);
  }
}
