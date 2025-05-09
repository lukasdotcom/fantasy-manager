import { Kysely } from "kysely";

// This is meant to recreate the database from how it looked like with the old schema
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("users")
    .ifNotExists()
    .addColumn("id", "integer", (col) =>
      col.primaryKey().autoIncrement().notNull(),
    )
    .addColumn("username", "varchar")
    .addColumn("password", "varchar")
    .addColumn("throttle", "integer", (col) => col.defaultTo(30))
    .addColumn("active", "boolean", (col) => col.defaultTo(false))
    .addColumn("inactiveDays", "integer", (col) => col.defaultTo(0))
    .addColumn("google", "varchar", (col) => col.defaultTo(""))
    .addColumn("github", "varchar", (col) => col.defaultTo(""))
    .addColumn("admin", "boolean", (col) => col.defaultTo(false))
    .addColumn("favoriteLeague", "integer")
    .addColumn("theme", "varchar")
    .addColumn("locale", "varchar")
    .execute();

  await db.schema
    .createTable("players")
    .ifNotExists()
    .addColumn("uid", "varchar")
    .addColumn("name", "varchar")
    .addColumn("nameAscii", "varchar")
    .addColumn("club", "varchar")
    .addColumn("pictureID", "integer")
    .addColumn("value", "integer")
    .addColumn("sale_price", "integer")
    .addColumn("position", "varchar")
    .addColumn("forecast", "varchar")
    .addColumn("total_points", "integer")
    .addColumn("average_points", "integer")
    .addColumn("last_match", "integer")
    .addColumn("locked", "boolean")
    .addColumn("exists", "boolean")
    .addColumn("league", "varchar")
    .execute();

  await db.schema
    .createTable("data")
    .ifNotExists()
    .addColumn("value1", "varchar")
    .addColumn("value2", "varchar")
    .addPrimaryKeyConstraint("data_pkey", ["value1"])
    .execute();

  await db.schema
    .createTable("leagueSettings")
    .ifNotExists()
    .addColumn("leagueName", "varchar")
    .addColumn("leagueID", "integer", (col) =>
      col.primaryKey().autoIncrement().notNull(),
    )
    .addColumn("startMoney", "integer", (col) => col.defaultTo(150000000))
    .addColumn("transfers", "integer", (col) => col.defaultTo(6))
    .addColumn("duplicatePlayers", "integer", (col) => col.defaultTo(1))
    .addColumn("starredPercentage", "integer", (col) => col.defaultTo(150))
    .addColumn("league", "varchar")
    .addColumn("archived", "integer", (col) => col.defaultTo(0))
    .addColumn("matchdayTransfers", "boolean", (col) => col.defaultTo(false))
    .addColumn("fantasyEnabled", "boolean", (col) => col.defaultTo(true))
    .addColumn("predictionsEnabled", "boolean", (col) => col.defaultTo(true))
    .addColumn("predictWinner", "integer", (col) => col.defaultTo(2))
    .addColumn("predictDifference", "integer", (col) => col.defaultTo(5))
    .addColumn("predictExact", "integer", (col) => col.defaultTo(15))
    .addColumn("top11", "boolean", (col) => col.defaultTo(false))
    .addColumn("active", "boolean", (col) => col.defaultTo(false))
    .addColumn("inactiveDays", "integer", (col) => col.defaultTo(0))
    .execute();

  await db.schema
    .createTable("leagueUsers")
    .ifNotExists()
    .addColumn("leagueID", "integer")
    .addColumn("user", "integer")
    .addColumn("fantasyPoints", "integer", (col) => col.defaultTo(0))
    .addColumn("predictionPoints", "integer", (col) => col.defaultTo(0))
    .addColumn("points", "integer")
    .addColumn("money", "integer")
    .addColumn("formation", "varchar")
    .addColumn("admin", "boolean", (col) => col.defaultTo(false))
    .addColumn("tutorial", "boolean", (col) => col.defaultTo(true))
    .execute();

  await db.schema
    .createTable("points")
    .ifNotExists()
    .addColumn("leagueID", "integer")
    .addColumn("user", "integer")
    .addColumn("fantasyPoints", "integer")
    .addColumn("predictionPoints", "integer")
    .addColumn("points", "integer")
    .addColumn("matchday", "integer")
    .addColumn("money", "integer")
    .addColumn("time", "integer")
    .execute();

  await db.schema
    .createTable("transfers")
    .ifNotExists()
    .addColumn("leagueID", "integer")
    .addColumn("seller", "integer")
    .addColumn("buyer", "integer")
    .addColumn("playeruid", "varchar")
    .addColumn("value", "integer")
    .addColumn("position", "varchar", (col) => col.defaultTo("bench"))
    .addColumn("starred", "boolean", (col) => col.defaultTo(false))
    .addColumn("max", "integer")
    .addPrimaryKeyConstraint("transfers_pkey", [
      "leagueID",
      "seller",
      "buyer",
      "playeruid",
    ])
    .execute();

  await db.schema
    .createTable("invite")
    .ifNotExists()
    .addColumn("inviteID", "varchar")
    .addColumn("leagueID", "integer")
    .addPrimaryKeyConstraint("invite_pkey", ["inviteID"])
    .execute();

  await db.schema
    .createTable("squad")
    .ifNotExists()
    .addColumn("leagueID", "integer")
    .addColumn("user", "integer")
    .addColumn("playeruid", "varchar")
    .addColumn("position", "varchar")
    .addColumn("starred", "boolean", (col) => col.defaultTo(false))
    .execute();

  await db.schema
    .createTable("historicalSquad")
    .ifNotExists()
    .addColumn("matchday", "integer")
    .addColumn("leagueID", "integer")
    .addColumn("user", "integer")
    .addColumn("playeruid", "varchar")
    .addColumn("position", "varchar")
    .addColumn("starred", "boolean", (col) => col.defaultTo(false))
    .execute();

  await db.schema
    .createTable("historicalPlayers")
    .ifNotExists()
    .addColumn("time", "integer")
    .addColumn("uid", "varchar")
    .addColumn("name", "varchar")
    .addColumn("nameAscii", "varchar")
    .addColumn("club", "varchar")
    .addColumn("pictureID", "integer")
    .addColumn("value", "integer")
    .addColumn("sale_price", "integer")
    .addColumn("position", "varchar")
    .addColumn("forecast", "varchar")
    .addColumn("total_points", "integer")
    .addColumn("average_points", "integer")
    .addColumn("last_match", "integer")
    .addColumn("exists", "boolean")
    .addColumn("league", "varchar")
    .execute();

  await db.schema
    .createTable("historicalTransfers")
    .ifNotExists()
    .addColumn("matchday", "integer")
    .addColumn("leagueID", "integer")
    .addColumn("seller", "integer")
    .addColumn("buyer", "integer")
    .addColumn("playeruid", "varchar")
    .addColumn("value", "integer")
    .execute();

  await db.schema
    .createTable("clubs")
    .ifNotExists()
    .addColumn("club", "varchar")
    .addColumn("fullName", "varchar")
    .addColumn("gameStart", "integer")
    .addColumn("gameEnd", "integer")
    .addColumn("opponent", "varchar")
    .addColumn("teamScore", "integer")
    .addColumn("opponentScore", "integer")
    .addColumn("league", "varchar")
    .addColumn("home", "boolean")
    .addColumn("exists", "boolean")
    .addPrimaryKeyConstraint("clubs_pkey", ["club", "league"])
    .execute();

  await db.schema
    .createTable("historicalClubs")
    .ifNotExists()
    .addColumn("club", "varchar")
    .addColumn("fullName", "varchar")
    .addColumn("gameStart", "integer")
    .addColumn("opponent", "varchar")
    .addColumn("teamScore", "integer")
    .addColumn("opponentScore", "integer")
    .addColumn("league", "varchar")
    .addColumn("home", "boolean")
    .addColumn("time", "integer")
    .addColumn("exists", "boolean")
    .addPrimaryKeyConstraint("historicalClubs_pkey", ["club", "league", "time"])
    .execute();

  await db.schema
    .createTable("futureClubs")
    .ifNotExists()
    .addColumn("club", "varchar")
    .addColumn("fullName", "varchar")
    .addColumn("gameStart", "integer")
    .addColumn("opponent", "varchar")
    .addColumn("league", "varchar")
    .addColumn("home", "boolean")
    .addPrimaryKeyConstraint("futureClubs_pkey", [
      "club",
      "league",
      "gameStart",
    ])
    .execute();

  await db.schema
    .createTable("analytics")
    .ifNotExists()
    .addColumn("day", "integer", (col) => col.primaryKey())
    .addColumn("versionActive", "varchar")
    .addColumn("versionTotal", "varchar")
    .addColumn("leagueActive", "varchar")
    .addColumn("leagueTotal", "varchar")
    .addColumn("themeActive", "varchar")
    .addColumn("themeTotal", "varchar")
    .addColumn("localeActive", "varchar")
    .addColumn("localeTotal", "varchar")
    .execute();

  await db.schema
    .createTable("detailedAnalytics")
    .ifNotExists()
    .addColumn("serverID", "varchar")
    .addColumn("day", "integer")
    .addColumn("version", "varchar")
    .addColumn("active", "integer")
    .addColumn("total", "integer")
    .addColumn("leagueActive", "varchar")
    .addColumn("leagueTotal", "varchar")
    .addColumn("themeActive", "varchar")
    .addColumn("themeTotal", "varchar")
    .addColumn("localeActive", "varchar")
    .addColumn("localeTotal", "varchar")
    .execute();

  await db.schema
    .createTable("announcements")
    .ifNotExists()
    .addColumn("leagueID", "integer")
    .addColumn("priority", "varchar")
    .addColumn("title", "varchar")
    .addColumn("description", "varchar")
    .execute();

  await db.schema
    .createTable("plugins")
    .ifNotExists()
    .addColumn("name", "varchar")
    .addColumn("settings", "varchar")
    .addColumn("enabled", "boolean")
    .addColumn("installed", "boolean")
    .addColumn("url", "varchar", (col) => col.primaryKey())
    .addColumn("version", "varchar")
    .execute();

  await db.schema
    .createTable("pictures")
    .ifNotExists()
    .addColumn("id", "integer", (col) =>
      col.primaryKey().autoIncrement().notNull(),
    )
    .addColumn("url", "varchar")
    .addColumn("downloading", "boolean", (col) => col.defaultTo(false))
    .addColumn("downloaded", "boolean", (col) => col.defaultTo(false))
    .addColumn("height", "integer")
    .addColumn("width", "integer")
    .execute();

  await db.schema
    .createTable("predictions")
    .ifNotExists()
    .addColumn("leagueID", "integer")
    .addColumn("user", "integer")
    .addColumn("club", "varchar")
    .addColumn("league", "varchar")
    .addColumn("home", "integer")
    .addColumn("away", "integer")
    .addPrimaryKeyConstraint("predictions_pkey", ["leagueID", "user", "club"])
    .execute();

  await db.schema
    .createTable("historicalPredictions")
    .ifNotExists()
    .addColumn("matchday", "integer")
    .addColumn("leagueID", "integer")
    .addColumn("user", "integer")
    .addColumn("club", "varchar")
    .addColumn("league", "varchar")
    .addColumn("home", "integer")
    .addColumn("away", "integer")
    .execute();

  await db.schema
    .createTable("futurePredictions")
    .ifNotExists()
    .addColumn("leagueID", "integer")
    .addColumn("user", "integer")
    .addColumn("club", "varchar")
    .addColumn("league", "varchar")
    .addColumn("gameStart", "integer")
    .addColumn("home", "integer")
    .addColumn("away", "integer")
    .addPrimaryKeyConstraint("futurePredictions_pkey", [
      "leagueID",
      "user",
      "club",
      "gameStart",
    ])
    .execute();
}
