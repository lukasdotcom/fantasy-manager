import db from "#/Modules/database";
import getLocales from "#/locales/getLocales";
import { stringify } from "csv-stringify/sync";
import { NextApiRequest, NextApiResponse } from "next";
import { HistoricalPlayers, Players } from "#type/db";
interface returnType extends Omit<Players, "locked"> {
  pictureUrl: string;
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const league = req.query.league as string;
  if (
    (await db
      .selectFrom("plugins")
      .where("name", "=", "league")
      .select("name")
      .executeTakeFirst()) === undefined
  ) {
    res.status(404).end("League does not exist");
    return;
  }
  if (typeof req.query.time !== "string" && req.query.time !== undefined) {
    res.status(400).end("Invalid time");
    return;
  }
  const time = req.query.time ? parseInt(req.query.time) : 0;
  const filter_function = (e: Players | HistoricalPlayers): returnType => {
    e.value = e.value / 1000000;
    e.sale_price = e.sale_price / 1000000;
    return {
      ...e,
      pictureUrl:
        process.env.NEXTAUTH_URL +
        "/_next/image?url=%2Fapi%2Fpicture%2F" +
        e.pictureID +
        "&w=256&q=75",
    };
  };
  const map_filter_function = (e: Players[] | HistoricalPlayers[]) =>
    e.map(filter_function);
  const data: returnType[] =
    time > 0
      ? await db
          .selectFrom("historicalPlayers")
          .selectAll()
          .where((eb) => {
            const conditions = [eb("league", "=", league)];
            if (req.query.showHidden !== "true") {
              conditions.push(eb("exists", "=", 1));
            }
            return eb.and(conditions);
          })
          .where("time", "=", time)
          .execute()
          .then(map_filter_function)
      : await db
          .selectFrom("players")
          .selectAll()
          .where((eb) => {
            const conditions = [eb("league", "=", league)];
            if (req.query.showHidden !== "true") {
              conditions.push(eb("exists", "=", 1));
            }
            return eb.and(conditions);
          })
          .execute()
          .then(map_filter_function);
  // Checks if this is a download by csv or json
  if (req.query.type === "csv") {
    const names: { [Key: string]: string } = {
      uid: "Playeruid",
      name: "Name",
      nameAscii: "Ascii Name",
      club: "Club",
      pictureUrl: "Picture Url",
      value: "Value",
      sale_price: "Sale Price",
      position: "Position",
      forecast: "Forecast",
      total_points: "Total Points",
      average_points: "Average Points",
      last_match: "Last Match Points",
      exists: "Exists",
      league: "League",
    };
    // Translates all the category names if needed
    const locale_data = await getLocales(String(req.query.locale));
    if (locale_data) {
      Object.keys(names).forEach((e) => {
        names[e] = locale_data[names[e]] || names[e];
      });
    }
    res.setHeader("Content-Type", "application/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${(locale_data || {}).Players || "Players"}.csv`,
    );
    res.status(200).end(stringify([names, ...data]));
  } else {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=players.json");
    res.status(200).end(JSON.stringify(data));
  }
  console.log(
    `A ${
      req.query.type === "csv" ? "csv" : "json"
    } download was requested for ${
      req.query.time ? parseInt(req.query.time) : "latest"
    } time and for league ${league}`,
  );
}
