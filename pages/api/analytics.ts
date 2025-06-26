import { NextApiRequest, NextApiResponse } from "next";
import db from "../../Modules/database";
import { detailedAnalytics } from "#types/database";
import { compareSemanticVersions } from "../../Modules/semantic";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method == "POST") {
    // Collects the data from the request
    let {
      active = 0,
      total = 0,
      leagueActive = "{}",
      leagueTotal = "{}",
    }: detailedAnalytics = req.body;
    const {
      serverID = "fake",
      version = "0.0.0",
      themeActive = "{}",
      themeTotal = "{}",
      localeActive = "{}",
      localeTotal = "{}",
    }: detailedAnalytics = req.body;
    // Makes sure that the JSON is valid
    try {
      JSON.parse(leagueActive);
      JSON.parse(leagueTotal);
      JSON.parse(themeActive);
      JSON.parse(themeTotal);
      JSON.parse(localeActive);
      JSON.parse(localeTotal);
    } catch {
      res.status(400).send("Invalid JSON");
      return;
    }
    const day = Math.floor(Date.now() / 1000 / 86400);
    // Checks if the analytics have to be translated from the old version used before 1.11 to the new version.
    if (compareSemanticVersions("1.11.0", version) === -1) {
      if (req.body?.users) {
        total = req.body.users;
      }
      if (req.body?.activeUsers) {
        active = req.body.activeUsers;
      }
      const tempLeagueActive: { [Key: string]: number } = {};
      if (req.body?.BundesligaActive) {
        tempLeagueActive.Bundesliga = req.body.BundesligaActive;
      }
      if (req.body?.EPLActive) {
        tempLeagueActive.EPL = req.body.EPLActive;
      }
      if (req.body?.WorldCup2022Active) {
        tempLeagueActive.WorldCup2022 = req.body.WorldCup2022Active;
      }
      leagueActive = JSON.stringify(tempLeagueActive);
      const tempLeagueTotal: { [Key: string]: number } = {};
      if (req.body?.Bundesliga) {
        tempLeagueTotal.Bundesliga = req.body.Bundesliga;
      }
      if (req.body?.EPL) {
        tempLeagueTotal.EPL = req.body.EPL;
      }
      if (req.body?.WorldCup2022) {
        tempLeagueTotal.WorldCup2022 = req.body.WorldCup2022;
      }
      leagueTotal = JSON.stringify(tempLeagueTotal);
    }
    await db
      .insertInto("detailedAnalytics")
      .values({
        serverID,
        day,
        version,
        active,
        total,
        leagueActive,
        leagueTotal,
        themeActive,
        themeTotal,
        localeActive,
        localeTotal,
      })
      .onConflict((oc) =>
        oc.doUpdateSet({
          version,
          active,
          total,
          leagueActive,
          leagueTotal,
          themeActive,
          themeTotal,
          localeActive,
          localeTotal,
        }),
      )
      .execute();
    res.status(200).end();
  } else {
    res.status(400).end("Method does not exist");
  }
}
