import db from "../../../../Modules/database";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth";
import { NextApiRequest, NextApiResponse } from "next";
import { leaveLeague } from "#/Modules/delete";
import { archive_league } from "#/Modules/archive";

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
        .select("active")
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
        if (
          (await db
            .selectFrom("leagueUsers")
            .select("admin")
            .where("leagueID", "=", league)
            .where("user", "=", session.user.id)
            .where("admin", "=", 1)
            .executeTakeFirst()) !== undefined
        ) {
          if (Array.isArray(req.body.users)) {
            // Updates all the users from admin to not admin
            await Promise.all(
              req.body.users.map((e: { user: number; admin: boolean }) =>
                db
                  .updateTable("leagueUsers")
                  .set({ admin: +e.admin })
                  .where("leagueID", "=", league)
                  .where("user", "=", e.user)
                  .execute(),
              ),
            );
          }
          if (req.body.settings !== undefined) {
            const settings = {
              leagueName: req.body.settings.leagueName,
              startMoney: parseInt(req.body.settings.startMoney),
              transfers: parseInt(req.body.settings.transfers),
              duplicatePlayers: parseInt(req.body.settings.duplicatePlayers),
              starredPercentage: parseInt(req.body.settings.starredPercentage),
              matchdayTransfers: +Boolean(req.body.settings.matchdayTransfers),
              fantasyEnabled: +Boolean(req.body.settings.fantasyEnabled),
              predictionsEnabled: +Boolean(
                req.body.settings.predictionsEnabled,
              ),
              predictWinner: parseInt(req.body.settings.predictWinner),
              predictDifference: parseInt(req.body.settings.predictDifference),
              predictExact: parseInt(req.body.settings.predictExact),
            };
            if (settings.startMoney < 10000) {
              res.status(400).end("Starting money too low");
            } else if (settings.transfers <= 0) {
              res.status(400).end("At least one transfer must be allowed");
            } else if (settings.duplicatePlayers <= 0) {
              res.status(400).end("Duplicate Players must be greater than 0");
            } else if (settings.starredPercentage < 100) {
              res.status(400).end("Star bonus can not be less than 100%");
            } else if (isNaN(settings.predictWinner)) {
              res.status(400).end("Predict winner must be a number");
            } else if (isNaN(settings.predictDifference)) {
              res.status(400).end("Predict difference must be a number");
            } else if (isNaN(settings.predictExact)) {
              res.status(400).end("Predict exact must be a number");
            } else {
              await db
                .updateTable("leagueSettings")
                .set(settings)
                .where("leagueID", "=", league)
                .execute();
              // Archives the league when told to do so
              if (req.body.settings.archive === true) {
                console.log(`League ${league} was archived`);
                await archive_league(league);
              }
              res.status(200).end("Saved settings");
            }
          }
        } else {
          res.status(401).end("You are not admin of this league");
        }
        break;
      case "DELETE":
        // Used to leave a league
        await leaveLeague(parseInt(String(league)), session.user.id);
        res.status(200).end("Left league");
        break;
      default:
        res.status(405).end(`Method ${req.method} Not Allowed`);
        break;
    }
  } else {
    res.status(401).end("Not logged in");
  }
}
