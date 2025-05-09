import db from "#database";

/**
 * Waits until the specified league is not locked.
 *
 * This function is meant to be used to prevent player data from being accessed while the league is locked.
 * It waits until the specified league is not locked, then returns.
 *
 * @param league - The league to wait for.
 */
export async function whileLocked(league: string) {
  while (
    (await db
      .selectFrom("data")
      .select("value1")
      .where("value1", "=", `locked${league}`)
      .executeTakeFirst()) !== undefined
  ) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
