import db from "../../../Modules/database";
import { getServerSession } from "next-auth";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";
// Used to join a league
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (session) {
    // Checks if it is a valid invite
    const invite = await db
      .selectFrom("invite")
      .selectAll()
      .where("inviteID", "=", String(req.query?.invite))
      .executeTakeFirst();
    // Checks if the invite exists
    if (invite === undefined) {
      res.redirect(308, "/404").end();
      return;
    }
    // Gets the info for the league
    const leagueName = await db
      .selectFrom("leagueSettings")
      .select(["leagueName"])
      .where("leagueID", "=", invite.leagueID)
      .where("archived", "=", 0)
      .executeTakeFirst();
    // Checks if the league exists
    if (leagueName !== undefined) {
      // Checks if the user has already joined the league
      const leagueUsers = await db
        .selectFrom("leagueUsers")
        .selectAll()
        .where("leagueID", "=", invite.leagueID)
        .where("user", "=", session.user.id)
        .execute();
      // Adds the user in the database if they have not joined yet
      if (leagueUsers.length == 0) {
        await db
          .insertInto("leagueUsers")
          .values({
            leagueID: invite.leagueID,
            user: session.user.id,
            money: (eb) =>
              eb
                .selectFrom("leagueSettings")
                .select("startMoney")
                .where("leagueID", "=", invite.leagueID),
          })
          .execute();
        // Makes sure to add 0 point matchdays for every matchday that has already happened.
        await db
          .selectFrom("points")
          .selectAll()
          .where("leagueID", "=", invite.leagueID)
          .orderBy("matchday", "desc")
          .execute()
          .then(async (point) => {
            let matchday = 0;
            if (point.length > 0) {
              matchday = point[0].matchday;
            }
            while (matchday > 0) {
              const time = point.filter((a) => a.matchday === matchday);
              await db
                .insertInto("points")
                .values({
                  leagueID: invite.leagueID,
                  user: session.user.id,
                  matchday: matchday,
                  time: time.length > 0 ? time[0].time : 0,
                  money: 0,
                })
                .execute();
              matchday--;
            }
            console.log(
              `User ${session.user.id} joined league ${invite.leagueID}`,
            );
          });
      }
      res.redirect(308, `/${invite.leagueID}`).end();
    } else {
      console.error("Error occurred with invite link");
      res
        .status(500)
        .end("An error occurred please contact the website administrator");
    }
  } else {
    // Redirects the user if they are not logged in
    res
      .redirect(
        307,
        `/api/auth/signin?callbackUrl=${encodeURIComponent(
          process.env.NEXTAUTH_URL + "/api/invite/" + req.query.invite,
        )}`,
      )
      .end();
  }
}
