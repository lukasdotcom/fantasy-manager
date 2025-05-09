import { NextApiRequest, NextApiResponse } from "next";
import db from "../../../../Modules/database";
import { announcements } from "#types/database";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (session) {
    const league = parseInt(String(req.query.league));
    const isAdmin =
      (await db
        .selectFrom("leagueUsers")
        .selectAll()
        .where("leagueID", "=", league)
        .where("user", "=", session.user.id)
        .where("admin", "=", 1)
        .executeTakeFirst()) !== undefined;
    switch (req.method) {
      // Used to add an anouncement
      case "POST":
        // Checks if the user is qualified to do this
        if (isAdmin) {
          // Adds the announcement
          const {
            priority = "info",
            title = "",
            description = "",
          }: announcements = req.body;
          await db
            .insertInto("announcements")
            .values({
              leagueID: league,
              priority: priority,
              title: title,
              description: description,
            })
            .execute();
          res.status(200).end("Added announcement");
        } else {
          res.status(401).end("You are not admin of this league");
        }
        break;
      case "DELETE": // Used to delete an announcement
        // Checks if the user is qualified to do this
        if (isAdmin) {
          const { title = "", description = "" }: announcements = req.body;
          await db
            .deleteFrom("announcements")
            .where("leagueID", "=", league)
            .where("title", "=", title)
            .where("description", "=", description)
            .execute();
          res.status(200).end("Deleted announcement");
        } else {
          res.status(401).end("You are not admin of this league");
        }
        break;
      default:
        res.status(405).end(`Method ${req.method} Not Allowed`);
        break;
    }
  } else {
    res.status(401).end("Not logged in");
  }
}
