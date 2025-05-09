import { NextApiRequest, NextApiResponse } from "next";
import { cache } from "../../../../Modules/cache";
import db from "../../../../Modules/database";
import { checkUpdate } from "../../../../scripts/checkUpdate";
import { downloadPicture } from "#/scripts/pictures";
import { Selectable } from "kysely";
import { HistoricalPlayers, Players } from "#type/db";
import { whileLocked } from "#Modules/locked";
// Used to return a dictionary on the data for a player
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<result>,
) {
  if (req.method == "GET") {
    const league = String(req.query.leagueType);
    const playeruid = String(req.query.uid);
    const time = parseInt(String(req.query.time));
    let returnValue: result | undefined = undefined;
    // Checks if new data needs to be requested
    await checkUpdate(league);
    if (time > 0) {
      const answer = await db
        .selectFrom("historicalPlayers")
        .selectAll()
        .where("uid", "=", String(req.query.uid))
        .where("time", "=", time)
        .where("league", "=", league)
        .executeTakeFirst();
      if (answer !== undefined) {
        // Gets the game data
        const game = await db
          .selectFrom("historicalClubs")
          .select(["opponent", "gameStart"])
          .where("club", "=", answer.club)
          .where("time", "=", time)
          .where("league", "=", league)
          .executeTakeFirst();
        returnValue = {
          ...answer,
          updateRunning: true,
          game: game,
        };
      }
    } else {
      await whileLocked(league);
      const result = await db
        .selectFrom("players")
        .selectAll()
        .where("uid", "=", playeruid)
        .where("league", "=", league)
        .executeTakeFirst();
      // Adds the game information
      if (result !== undefined) {
        // Finds the historical game that may exist on that day
        const game = await db
          .selectFrom("clubs")
          .where("club", "=", result.club)
          .where("league", "=", league)
          .select(["opponent", "gameStart", "gameEnd"])
          .executeTakeFirst();
        returnValue = { ...result, updateRunning: true, game };
      }
    }
    // Tells the user if the updates are still running
    if (returnValue !== undefined) {
      returnValue.updateRunning = await db
        .selectFrom("data")
        .where("value1", "=", "lastUpdateCheck")
        .selectAll()
        .executeTakeFirst()
        .then((e) =>
          e !== undefined
            ? Date.now() / 1000 - 600 < parseInt(e.value2)
            : false,
        );
    }
    // Checks if the player exists
    if (returnValue !== undefined) {
      // Tells the browser how long to cache if not a development
      if (
        process.env.APP_ENV !== "development" &&
        process.env.APP_ENV !== "test"
      ) {
        res.setHeader(
          "Cache-Control",
          `public, max-age=${time > 0 ? 604800 : await cache(league)}`,
        );
      }
      const picture = await db
        .selectFrom("pictures")
        .selectAll()
        .where("id", "=", returnValue.pictureID)
        .executeTakeFirst();
      downloadPicture(returnValue.pictureID);
      const returnData: result = {
        ...returnValue,
        height: picture?.height,
        width: picture?.width,
        downloaded:
          (await db
            .selectFrom("data")
            .where("value1", "=", "configDownloadPicture")
            .where("value2", "=", "no")
            .selectAll()
            .executeTakeFirst()) !== undefined
            ? true
            : Boolean(picture?.downloaded),
      };
      res.status(200).json(returnData);
    } else {
      res.status(404).end("Player not found");
    }
  } else {
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

type gameData = {
  opponent: string | null;
  gameStart?: number;
  gameEnd?: number;
};

// This is the type returned by this API
export type result = (Selectable<Players> | Selectable<HistoricalPlayers>) & {
  forecast: string;
  game?: gameData;
  updateRunning: boolean;
  height?: number;
  width?: number;
  downloaded?: boolean;
};
