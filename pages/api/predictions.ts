import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "#/pages/api/auth/[...nextauth]";
import db from "#/Modules/database";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const body: {
    home_team: string;
    away_team: string;
    league: number;
    home: number;
    away: number;
    gameStart: number;
  } = req.body;
  if (req.method !== "POST") {
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }
  const user = await getServerSession(req, res, authOptions);
  if (!user) {
    res.status(401).end("Not logged in");
    return;
  }
  const id = user.user.id;
  if (
    (await db
      .selectFrom("leagueUsers")
      .selectAll()
      .where("user", "=", id)
      .where("leagueID", "=", body.league)
      .executeTakeFirst()) === undefined
  ) {
    res.status(403).end("You are not in this league. ");
    return;
  }
  const leagueSettings = await db
    .selectFrom("leagueSettings")
    .selectAll()
    .where("leagueID", "=", body.league)
    .where("predictionsEnabled", "=", 1)
    .executeTakeFirst();
  if (leagueSettings === undefined) {
    res.status(403).end("This league does not have predictions enabled. ");
    return;
  }
  const leagueType = leagueSettings.league;
  const data = {
    leagueID: body.league,
    user: id,
    club: body.home_team,
    league: leagueType,
    home: body.home,
    away: body.away,
  };
  // Checks if the game doesn't exist in current games
  if (
    (await db
      .selectFrom("clubs")
      .selectAll()
      .where("club", "=", body.home_team)
      .where("league", "=", leagueType)
      .where("gameStart", ">", Date.now() / 1000)
      .where("opponent", "=", body.away_team)
      .executeTakeFirst()) === undefined
  ) {
    // Check if this is a valid future game
    if (
      (await db
        .selectFrom("futureClubs")
        .select("club")
        .where("club", "=", body.home_team)
        .where("league", "=", leagueType)
        .where("gameStart", "=", body.gameStart)
        .where("opponent", "=", body.away_team)
        .executeTakeFirst()) === undefined
    ) {
      res.status(400).end("Invalid match");
      return;
    }
    await db
      .insertInto("futurePredictions")
      .values({ ...data, gameStart: body.gameStart })
      .onConflict((e) =>
        e.doUpdateSet({
          home: data.home,
          away: data.away,
        }),
      )
      .execute();
    console.log(
      `User ${id} predicted for match ${body.home_team}-${body.away_team} in future time ${body.gameStart} the score of ${body.home}-${body.away} in league ${body.league}`,
    );
    res.status(200).end("Saved");
    return;
  }
  await db
    .insertInto("predictions")
    .values(data)
    .onConflict((e) => e.doUpdateSet({ home: data.home, away: data.away }))
    .execute();
  console.log(
    `User ${id} predicted for match ${body.home_team}-${body.away_team} the score of ${body.home}-${body.away} in league ${body.league}`,
  );
  res.status(200).end("Saved");
}
