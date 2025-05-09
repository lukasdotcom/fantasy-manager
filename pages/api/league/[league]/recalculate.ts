import db from "../../../../Modules/database";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth";
import { NextApiRequest, NextApiResponse } from "next";
import { calcHistoricalPredictionPoints } from "#scripts/calcPoints";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (session) {
    const league = parseInt(req.query.league as string);
    // Variable to check if the league is archived
    const isArchived =
      (await db
        .selectFrom("leagueSettings")
        .selectAll()
        .where("leagueID", "=", league)
        .where("archived", "=", 0)
        .executeTakeFirst()) === undefined;
    switch (req.method) {
      // Used to edit a league
      case "POST":
        if (isArchived) {
          res.status(400).end("This league is archived");
          break;
        }
        // Checks if the user is qualified to do this
        const user = await db
          .selectFrom("leagueUsers")
          .where("leagueID", "=", league)
          .where("user", "=", session.user.id)
          .selectAll()
          .where("admin", "=", 1)
          .executeTakeFirst();
        if (user === undefined) {
          res.status(403).end("You are not admin of this league");
          break;
        }
        const matchdays = await db
          .selectFrom("points")
          .where("leagueID", "=", league)
          .selectAll()
          .orderBy("user", "asc")
          .execute();
        let curr_user = -1;
        let curr_leagueID = -1;
        let change_in_points = 0;
        for (const matchday of matchdays) {
          if (curr_user !== matchday.user) {
            if (curr_user !== -1) {
              await db
                .updateTable("leagueUsers")
                .set((eb) => ({
                  points: eb("points", "+", change_in_points),
                  predictionPoints: eb(
                    "predictionPoints",
                    "+",
                    change_in_points,
                  ),
                }))
                .where("leagueID", "=", curr_leagueID)
                .where("user", "=", curr_user)
                .execute();
            }
            curr_user = matchday.user;
            curr_leagueID = matchday.leagueID;
            change_in_points = 0;
          }
          const points = await calcHistoricalPredictionPoints(matchday);
          change_in_points += points - matchday.predictionPoints;
          await db
            .updateTable("points")
            .set((eb) => ({
              predictionPoints: points,
              points: eb("points", "+", points - matchday.predictionPoints),
            }))
            .where("matchday", "=", matchday.matchday)
            .where("leagueID", "=", matchday.leagueID)
            .where("user", "=", matchday.user)
            .execute();
        }
        res.status(200).end("Updated prediction points");
        break;
      default:
        res.status(405).end(`Method ${req.method} Not Allowed`);
        break;
    }
  } else {
    res.status(401).end("Not logged in");
  }
}
