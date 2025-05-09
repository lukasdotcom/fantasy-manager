import db from "../../../../Modules/database";
import redirect from "../../../../Modules/league";
import HistoricalView from "./index.js";
import { sql } from "kysely";
export default function Home(props) {
  return <HistoricalView {...props} />;
}

export async function getServerSideProps(ctx) {
  const user = ctx.params.user;
  const league = ctx.params.league;
  const matchday = ctx.params.matchday;
  // Checks if the matchday exists
  const timeData = await db
    .selectFrom("points")
    .selectAll()
    .where("matchday", "=", matchday)
    .where("leagueID", "=", parseInt(league))
    .execute();
  if (timeData.length === 0) {
    return {
      notFound: true,
    };
  }
  // Calculates the timestamp for this matchday
  const time = timeData[0].time;
  const [transfers, username, latestMatchday, money] = await Promise.all([
    // Gets all transfers at the moment from the user
    sql`SELECT * FROM historicalTransfers WHERE leagueID=${league} AND matchday=${matchday} AND (buyer=${user} OR seller=${user})`
      .execute(db)
      .then((e) => e.rows),
    // Gets the username of the user
    sql`SELECT username FROM users WHERE id=${user}`
      .execute(db)
      .then((e) => e.rows)
      .then((e) => (e.length > 0 ? e[0].username : "")),
    // Gets the latest matchday in that league
    sql`SELECT matchday FROM points WHERE leagueID=${league} and user=${user} ORDER BY matchday DESC`
      .execute(db)
      .then((e) => e.rows)
      .then((res) => (res.length > 0 ? res[0].matchday : 0)),
    // Gets the money
    sql`SELECT money FROM points WHERE leagueID=${league} and user=${user} and matchday=${matchday}`
      .execute(db)
      .then((e) => e.rows)
      .then((res) => (res.length > 0 ? res[0].money : 0)),
  ]);
  // Checks if this matchday was finished
  const historicalSquadExists = !!time;
  // Gets the squad of the user on that matchday
  const squad = historicalSquadExists
    ? await sql`SELECT * FROM historicalSquad WHERE leagueID=${league} AND user=${user} AND matchday=${matchday}`
        .execute(db)
        .then((e) => e.rows)
    : await sql`SELECT * FROM squad WHERE leagueID=${league} AND user=${user}`
        .execute(db)
        .then((e) => e.rows);
  // Calculates the value of the squad
  const values = await Promise.all(
    squad.map((e) =>
      sql`SELECT value FROM players WHERE uid=${e.playeruid} AND league=(SELECT league FROM leagueSettings WHERE leagueID=${league})`
        .execute(db)
        .then((e) => e.rows)
        .then((e) => (e.length > 0 ? e[0].value : 0)),
    ),
  );
  let value = money;
  values.forEach((e) => {
    value += e;
  });
  // Checks if the user exists
  if (username === "") {
    return {
      notFound: true,
    };
  }
  return await redirect(ctx, {
    user,
    username,
    squad,
    transfers,
    league,
    latestMatchday,
    currentMatchday: matchday,
    time: historicalSquadExists ? time : null,
    money,
    value,
  });
}
