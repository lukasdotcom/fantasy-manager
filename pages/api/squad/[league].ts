import db from "#database";
import { calcPointsLeague } from "../../../scripts/calcPoints";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth";
import { NextApiHandler } from "next";
// An array of valid formations
const validFormations = [
  [1, 3, 5, 2],
  [1, 3, 4, 3],
  [1, 4, 4, 2],
  [1, 4, 3, 3],
  [1, 4, 5, 1],
  [1, 5, 3, 2],
  [1, 5, 4, 1],
];
export interface LeagueInfo {
  formation: number[];
  players: {
    playeruid: string;
    position: string;
    starred: boolean;
    status: string;
  }[];
  validFormations: number[][];
  position_total: {
    [key: string]: number;
  };
}
/**
 * Retrieves information about a league.
 *
 * @param {number} league - the ID of the league
 * @param {number} user - the ID of the user
 * @return {Promise<LeagueInfo>} a Promise that resolves to the LeagueInfo object
 * @throws {string} throws an error if the league is not found
 */
export const getLeagueInfo = async (
  league: number,
  user: number,
): Promise<LeagueInfo> => {
  // Checks if the league exists
  const result = await db
    .selectFrom("leagueUsers")
    .selectAll()
    .where("leagueID", "=", league)
    .where("user", "=", user)
    .executeTakeFirst();
  if (result !== undefined) {
    const formation = JSON.parse(result.formation);
    // Gets all the players on the team
    const squad = await db
      .selectFrom("squad")
      .select(["playeruid", "position", "starred"])
      .where("leagueID", "=", league)
      .where("user", "=", user)
      .execute();
    // Checks if a player is being sold
    const squad_with_status = await Promise.all(
      squad.map(async (player) => {
        return {
          ...player,
          status: await db
            .selectFrom("transfers")
            .select("leagueID")
            .where("leagueID", "=", league)
            .where("playeruid", "=", player.playeruid)
            .where("seller", "=", user)
            .executeTakeFirst()
            .then((e) => (e === undefined ? "" : "sell")),
        };
      }),
    );
    // Gets all the purchases
    const purchases = await db
      .selectFrom("transfers")
      .select(["playeruid", "position", "starred"])
      .where("leagueID", "=", league)
      .where("buyer", "=", user)
      .execute()
      .then((e) => e.map((player) => ({ ...player, status: "buy" })));
    // Merges the 2 lists
    const players = [...squad_with_status, ...purchases].map((e) => ({
      ...e,
      starred: Boolean(e.starred),
    }));
    const position_total: { [key: string]: number } = {
      att: 0,
      mid: 0,
      def: 0,
      gk: 0,
    };
    await Promise.all(
      players
        .filter((player) => player.status !== "sell")
        .map(async (player) => {
          if (player.position !== "bench") {
            position_total[player.position] += 1;
          } else {
            position_total[
              await db
                .selectFrom("players")
                .select("position")
                .where("uid", "=", player.playeruid)
                .executeTakeFirst()
                .then((e) => e?.position ?? "unknown")
            ] += 1;
          }
        }),
    );
    return { formation, players, validFormations, position_total };
  } else {
    throw "League not found";
  }
};
/**
 * Gets the number of players a user has in a given position.
 * @param position The position to check.
 * @param league The league to check.
 * @param user The user to check.
 * @returns The number of players in the given position.
 */
async function playersInPosition(
  position: string,
  league: number,
  user: number,
) {
  const squad = await db
    .selectFrom("squad")
    .select((e) => [e.fn.count("playeruid").as("count")])
    .where("position", "=", position)
    .where("leagueID", "=", league)
    .where("user", "=", user)
    .executeTakeFirst()
    .then((e) => parseInt(String(e?.count)));
  const transfers = await db
    .selectFrom("transfers")
    .select((e) => [e.fn.count("playeruid").as("count")])
    .where("position", "=", position)
    .where("leagueID", "=", league)
    .where("buyer", "=", user)
    .executeTakeFirst()
    .then((e) => parseInt(String(e?.count)));
  return squad + transfers;
}
/**
 * Checks if there are enough open spots for a given position.
 *
 * @param {number} limit - The maximum number of spots allowed.
 * @param {string} position - The position to check for open spots.
 * @param {string} league - The league to check for open spots.
 * @param {number} user - The user to check for open spots.
 * @return {Promise<string>} A promise that resolves with a message indicating if there are enough spots for the given position.
 */
function positionOpen(
  limit: number,
  position: string,
  league: number,
  user: number,
): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    if ((await playersInPosition(position, league, user)) > limit) {
      reject(`Not enough spots for ${position}`);
    } else {
      resolve(`Enough spots for ${position}`);
    }
  });
}

const handler: NextApiHandler = async (req, res) => {
  const session = await getServerSession(req, res, authOptions);
  const league = parseInt(String(req.query.league));
  if (!session) {
    res.status(401).end("Not logged in");
    return;
  }
  const user = session.user.id;
  const leagueSettings = await db
    .selectFrom("leagueSettings")
    .where("leagueID", "=", league)
    .selectAll()
    .where("archived", "=", 0)
    .executeTakeFirst();
  // Checks if the league is archived
  if (leagueSettings === undefined) {
    res.status(400).end("This league is archived");
    return;
  }
  // Checks if the league has fantasy enabled
  if (leagueSettings.fantasyEnabled === 0) {
    res.status(400).end("This league does not have fantasy enabled. ");
    return;
  }
  switch (req.method) {
    // Used to return a dictionary of all formations and your current squad and formation
    case "GET":
      await getLeagueInfo(league, user)
        .then((e) => res.status(200).json(e))
        .catch((e) => {
          // Checks if it was the league not found error
          if (e === "League not found") {
            res.status(404).end(e);
          } else {
            throw e;
          }
        });
      break;
    case "POST":
      // Checks if top 11 prevents the change of formation and players
      if (
        leagueSettings.top11 &&
        (await db
          .selectFrom("data")
          .where("value1", "=", "transferOpen" + leagueSettings.league)
          .where("value2", "=", "true")
          .executeTakeFirst()) !== undefined
      ) {
        res.status(400).end("Top 11 is enabled");
        break;
      }
      // Checks if the user wants to change the formation
      const formation = req.body.formation;
      if (formation !== undefined) {
        // Checks if this is a valid formation
        let included = false;
        validFormations.forEach((e) => {
          if (JSON.stringify(e) == JSON.stringify(formation)) {
            included = true;
          }
        });
        if (included) {
          // Makes sure to check if the formation can be changed to
          await Promise.all([
            positionOpen(formation[1], "def", league, user),
            positionOpen(formation[2], "mid", league, user),
            positionOpen(formation[3], "att", league, user),
          ])
            .then(async () => {
              await db
                .updateTable("leagueUsers")
                .set({
                  formation: JSON.stringify(formation),
                })
                .where("leagueID", "=", league)
                .where("user", "=", user)
                .execute();
              console.log(
                `User ${user} changed formation to ${JSON.stringify(
                  formation,
                )}`,
              );
            })
            .catch(() => {
              res.status(500).end("Not enough spots");
            });
        } else {
          res.status(500).end("Invalid formation");
        }
      }
      const star = req.body.star;
      if (Array.isArray(star)) {
        for (let i = 0; i < star.length; i++) {
          const e = star[i];
          const player = String(e);
          // Checks if the player is on the bench
          const position = await db
            .selectFrom("squad")
            .select("position")
            .where("user", "=", user)
            .where("leagueID", "=", league)
            .where("playeruid", "=", player)
            .executeTakeFirst()
            .then(
              async (result) =>
                // If the player was not found in the squad the transfers are checked
                result?.position ??
                (await db
                  .selectFrom("transfers")
                  .select("position")
                  .where("buyer", "=", user)
                  .where("leagueID", "=", league)
                  .where("playeruid", "=", player)
                  .executeTakeFirst()
                  .then((result) => result?.position ?? "bench")),
            );
          if (position === "bench") {
            res.status(500).end("Player is not in the field");
            return;
          }
          if (
            (
              await db
                .selectFrom("players")
                .select("locked")
                .where("uid", "=", player)
                .where("league", "=", leagueSettings.league)
                .executeTakeFirst()
            )?.locked === 1
          ) {
            res.status(500).end("Player has already played");
            return;
          }
          console.log(`User ${user} starred player ${e}`);
          await db
            .updateTable("squad")
            .set({ starred: 0 })
            .where("user", "=", user)
            .where("leagueID", "=", league)
            .where((eb) =>
              eb.or([
                eb("position", "=", position),
                eb("position", "=", "bench"),
              ]),
            )
            .execute();
          await db
            .updateTable("transfers")
            .set({ starred: 0 })
            .where("buyer", "=", user)
            .where("leagueID", "=", league)
            .where((eb) =>
              eb.or([
                eb("position", "=", position),
                eb("position", "=", "bench"),
              ]),
            )
            .execute();
          await db
            .updateTable("squad")
            .set({ starred: 1 })
            .where("user", "=", user)
            .where("playeruid", "=", player)
            .where("leagueID", "=", league)
            .execute();
          await db
            .updateTable("transfers")
            .set({ starred: 1 })
            .where("buyer", "=", user)
            .where("playeruid", "=", player)
            .where("leagueID", "=", league)
            .execute();
        }
      }
      // List of players to move
      const playerMove = req.body.playerMove;
      if (Array.isArray(playerMove)) {
        for (let i = 0; i < playerMove.length; i++) {
          const e = playerMove[i];
          const position = await db
            .selectFrom("squad")
            .select("position")
            .where("user", "=", user)
            .where("leagueID", "=", league)
            .where("playeruid", "=", e)
            .executeTakeFirst()
            .then(
              async (result) =>
                // If the player was not found in the squad the transfers are checked
                result?.position ??
                (await db
                  .selectFrom("transfers")
                  .select("position")
                  .where("buyer", "=", user)
                  .where("leagueID", "=", league)
                  .where("playeruid", "=", e)
                  .executeTakeFirst()
                  .then((result) => result?.position)),
            );
          if (position === undefined) {
            res.status(500).end("Player is not your player");
            return;
          }
          if (position === "bench") {
            // Finds the players position and checks if they are locked
            const player = await db
              .selectFrom("players")
              .select(["position", "locked"])
              .where("uid", "=", e)
              .where("league", "=", leagueSettings.league)
              .executeTakeFirst();
            if (player === undefined) {
              res.status(500).end("Player does not exist");
              return;
            }
            if (player.locked !== 0) {
              res.status(500).end(`Player is locked`);
              return;
            }
            const position = player.position;
            // Gets the amount of players on that position
            const playerAmount = await playersInPosition(
              position,
              league,
              user,
            );
            // Gets the users formation
            const formation = JSON.parse(
              String(
                (
                  await db
                    .selectFrom("leagueUsers")
                    .select("formation")
                    .where("leagueID", "=", league)
                    .where("user", "=", user)
                    .executeTakeFirst()
                )?.formation,
              ),
            );
            // Checks if there is still room in the formation for this player
            let transferValid = false;
            switch (position) {
              case "gk":
                transferValid = playerAmount < formation[0];
                break;
              case "def":
                transferValid = playerAmount < formation[1];
                break;
              case "mid":
                transferValid = playerAmount < formation[2];
                break;
              case "att":
                transferValid = playerAmount < formation[3];
                break;
            }
            if (!transferValid) {
              res.status(500).end("No more room in formation");
            }
            await db
              .updateTable("squad")
              .set({ position, starred: 0 })
              .where("user", "=", user)
              .where("playeruid", "=", e)
              .where("leagueID", "=", league)
              .execute();
            await db
              .updateTable("transfers")
              .set({ position, starred: 0 })
              .where("buyer", "=", user)
              .where("playeruid", "=", e)
              .where("leagueID", "=", league)
              .execute();
            console.log(`User ${user} moved player ${e} to field`);
          } else {
            // If the player is on the field automatically move them to the bench
            await db
              .updateTable("squad")
              .set({ position: "bench", starred: 0 })
              .where("user", "=", user)
              .where("leagueID", "=", league)
              .where("playeruid", "=", e)
              .execute();
            await db
              .updateTable("transfers")
              .set({ position: "bench", starred: 0 })
              .where("buyer", "=", user)
              .where("leagueID", "=", league)
              .where("playeruid", "=", e)
              .execute();
            console.log(`User ${user} moved player ${e} to bench`);
          }
        }
      }
      // Has the point calculation update for that league
      calcPointsLeague(league);
      // If no errors happened gives a succesful result
      if (res.statusMessage === undefined)
        res.status(200).end("Successfully did commands");
      break;
    default:
      res.status(405).end(`Method ${req.method} Not Allowed`);
      break;
  }
};
export default handler;
