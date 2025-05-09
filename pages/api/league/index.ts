import { NextApiRequest, NextApiResponse } from "next";
import db from "../../../Modules/database";
import { getServerSession } from "next-auth";
import { authOptions } from "#/pages/api/auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (session) {
    switch (req.method) {
      // Used to create a new league
      case "POST":
        // Generates the next id
        const id = Math.floor(Math.random() * 2 ** 35);
        // Makes sure that the id is not taken
        const idUsed =
          (await db
            .selectFrom("leagueSettings")
            .select("leagueID")
            .where("leagueID", "=", id)
            .executeTakeFirst()) !== undefined;
        if (idUsed) {
          res.status(500).end("Failed to create league");
          break;
        }
        const leagueType = req.body.leagueType;
        if (
          (await db
            .selectFrom("plugins")
            .select("url")
            .where("name", "=", leagueType)
            .where("enabled", "=", 1)
            .executeTakeFirst()) === undefined
        ) {
          res.status(404).end("Invalid league type given");
          break;
        }
        if (req.body.name == "") {
          res.status(500).end("Invalid league name given");
          break;
        }
        const startMoney = parseInt(req.body.startMoney);
        const settings: {
          leagueName: string;
          leagueID: number;
          league: string;
          startMoney?: number;
        } = {
          leagueName: req.body.name,
          leagueID: id,
          league: leagueType,
        };
        if (startMoney > 0) {
          settings.startMoney = startMoney;
        }
        await db.insertInto("leagueSettings").values(settings).execute();
        await db
          .insertInto("leagueUsers")
          .values({
            leagueID: id,
            user: session.user.id,
            admin: 1,
            money: await db
              .selectFrom("leagueSettings")
              .select("startMoney")
              .where("leagueID", "=", id)
              .executeTakeFirst()
              .then((e) => (e ? e.startMoney : 0)),
          })
          .execute();
        // Checks if the game is in a transfer period and if yes it starts the first matchday automatically
        const transferClosed =
          (await db
            .selectFrom("data")
            .where("value1", "=", "transferOpen" + leagueType)
            .where("value2", "=", "true")
            .select("value2")
            .executeTakeFirst()) === undefined;
        if (transferClosed) {
          await db
            .insertInto("points")
            .values({
              leagueID: id,
              user: session.user.id,
              money: 0,
              matchday: 1,
            })
            .execute();
        }
        res.status(200).end("Created League");
        console.log(
          `User ${session.user.id} created league with id ${id} and name ${req.body.name}`,
        );
        break;
      case "GET": // Returns all leagues and archived leagues the user is in
        res.status(200).json({
          leagues: await db
            .selectFrom("leagueSettings")
            .selectAll()
            .where((eb) => {
              return eb
                .exists(
                  eb
                    .selectFrom("leagueUsers")
                    .select("league")
                    .where("user", "=", session.user.id)
                    .whereRef(
                      "leagueSettings.leagueID",
                      "=",
                      "leagueUsers.leagueID",
                    ),
                )
                .and(eb("archived", "=", 0));
            })
            .execute(),
          archived: await db
            .selectFrom("leagueSettings")
            .selectAll()
            .where((eb) => {
              return eb
                .exists(
                  eb
                    .selectFrom("leagueUsers")
                    .select("league")
                    .where("user", "=", session.user.id)
                    .whereRef(
                      "leagueSettings.leagueID",
                      "=",
                      "leagueUsers.leagueID",
                    ),
                )
                .and(eb("archived", "!=", 0));
            })
            .orderBy("archived", "desc")
            .execute(),
        });
        break;
      default:
        res.status(405).end(`Method ${req.method} Not Allowed`);
        break;
    }
  } else {
    res.status(401).end("Not logged in");
  }
}
export interface LeagueListResult {
  leagues: LeagueListPart[];
  archived: LeagueListPart[];
}
export interface LeagueListPart {
  leagueName: string;
  leagueID: number;
}
