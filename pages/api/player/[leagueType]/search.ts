import { cache } from "../../../../Modules/cache";
import db from "../../../../Modules/database";
import { NextApiRequest, NextApiResponse } from "next";
// Used to return a list of UIDs of players that are searched for
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method == "GET") {
    const league = String(req.query.leagueType);
    // Gets the search term
    let searchTerm =
      req.query.searchTerm !== undefined ? req.query.searchTerm : "";
    searchTerm = `%${searchTerm}%`;
    // Gets the club search term
    let clubSearch =
      req.query.clubSearch !== undefined ? req.query.clubSearch : "";
    // Used to get the number of players to max out the search results to
    const limit =
      parseInt(String(req.query.limit)) > 0
        ? parseInt(String(req.query.limit))
        : 50;
    clubSearch = `%${clubSearch}%`;
    let query = db
      .selectFrom("players")
      .select("uid")
      .innerJoin("clubs", "players.club", "clubs.club")
      .where((eb) =>
        eb.and([
          eb.or([
            eb("name", "like", searchTerm),
            eb("nameAscii", "like", searchTerm),
          ]),
          eb.or([
            eb("clubs.club", "like", clubSearch),
            eb("clubs.fullName", "like", clubSearch),
          ]),
        ]),
      )
      .where("players.league", "=", league)
      .limit(limit);
    // Creates the sql for all the positions
    let positions = ["att", "mid", "def", "gk"];
    if (req.query.positions != undefined) {
      positions = Array.isArray(JSON.parse(String(req.query.positions)))
        ? JSON.parse(String(req.query.positions)).filter((e: string) =>
            ["att", "mid", "def", "gk"].includes(e),
          )
        : positions;
    }
    if (positions.length > 0) {
      query = query.where((eb) =>
        eb.or(positions.map((e) => eb("position", "=", e))),
      );
    }
    if (req.query.showHidden === "true") {
      query = query.where((eb) =>
        eb.or([
          eb("exists", "=", 1),
          eb.exists(
            eb
              .selectFrom("squad")
              .innerJoin(
                "leagueSettings",
                "squad.leagueID",
                "leagueSettings.leagueID",
              )
              .where("squad.playeruid", "=", "players.uid")
              .where("leagueSettings.archived", "=", 0),
          ),
        ]),
      );
    }
    if (req.query.onlySales === "true") {
      query = query.whereRef("value", "!=", "sale_price");
    }
    const salePrice = req.query.salePrice === "true";
    // Gets the value to order by
    switch (req.query.order_by) {
      case "total_points":
        query = query.orderBy("total_points", "desc");
        break;
      case "average_points":
        query = query.orderBy("average_points", "desc");
        break;
      case "last_match":
        query = query.orderBy("last_match", "desc");
        break;
      default:
        if (salePrice) {
          query = query.orderBy("sale_price", "desc");
        } else {
          query = query.orderBy("value", "desc");
        }
        break;
    }
    // If this is the production server caching is done on all requests
    if (
      process.env.APP_ENV !== "development" &&
      process.env.APP_ENV !== "test"
    ) {
      res.setHeader("Cache-Control", `public, max-age=${await cache(league)}`);
    }
    const min_price = parseInt(String(req.query.minPrice));
    const max_price = parseInt(String(req.query.maxPrice));
    const price_usage = salePrice ? "sale_price" : "value";
    if (min_price >= 0) {
      query = query.where(price_usage, ">=", min_price);
    }
    if (max_price > 0) {
      query = query.where(price_usage, "<=", max_price);
    }
    res
      .status(200)
      .json(await query.execute().then((e) => e.map((val) => val.uid)));
  } else {
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
