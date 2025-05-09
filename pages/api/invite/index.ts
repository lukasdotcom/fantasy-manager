import db from "../../../Modules/database";
import { getServerSession } from "next-auth";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).end("Not logged in");
    return;
  }
  if (req.body?.leagueID === undefined) {
    res.status(400).end("No leagueid given");
    return;
  }
  // Is true if the user is in the league
  const inLeague = await db
    .selectFrom("leagueUsers")
    .where("leagueID", "=", req.body?.leagueID)
    .where("user", "=", session.user.id)
    .selectAll()
    .executeTakeFirst()
    .then((res) => res !== undefined);
  // Variable to check if the league is archived
  const isArchived = db
    .selectFrom("leagueSettings")
    .selectAll()
    .where("leagueID", "=", req.body?.leagueID)
    .where("archived", "=", 0)
    .executeTakeFirst()
    .then((e) => e === undefined);
  // Makes sure that user is in the league they claim they are from
  if (!inLeague) {
    res.status(403).end("You are not in this league. ");
    return;
  }
  switch (req.method) {
    case "POST": // Used to create a new invite link
      if (await isArchived) {
        res.status(400).end("This league is archived");
        break;
      }
      // Makes sure that an invite link was given
      if (!req.body.link || req.body.link === "") {
        res.status(400).end("Invalid invite link");
        break;
      }
      if (req.body.link.search(/[^a-zA-Z0-9]/) > -1) {
        res.status(400).end("Only alphanumeric characters are allowed. ");
        break;
      }
      await db
        .insertInto("invite")
        .values({
          inviteID: req.body.link,
          leagueID: parseInt(String(req.body?.leagueID)),
        })
        .execute()
        .then(() => {
          console.log(
            `League ${req.body.leagueID} created invite link of ${req.body.link}`,
          );
          res.status(200).end("Created invite link");
        })
        .catch(() => {
          res.status(400).end("Invite link taken");
        });
      break;
    case "GET": // Used to get a list of invite links for a league
      const invites = await db
        .selectFrom("invite")
        .where("leagueID", "=", parseInt(String(req.query.leagueID)))
        .execute();
      res.status(200).json(invites);
      break;
    case "DELETE":
      await db
        .deleteFrom("invite")
        .where("leagueID", "=", req.body.leagueID)
        .where("inviteID", "=", req.body.link)
        .execute();
      console.log(
        `League ${req.body.leagueID} removed invite link of ${req.body.link}`,
      );
      res.status(200).end("Deleted invite link");
      break;
    default:
      res.status(405).end(`Method ${req.method} Not Allowed`);
      break;
  }
}
