import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`UPDATE players SET position='unknown' WHERE position IS NULL`.execute(
    db,
  );
  await sql`UPDATE historicalPlayers SET position='unknown' WHERE position IS NULL`.execute(
    db,
  );
  await sql`DELETE FROM historicalPredictions WHERE matchday IS NULL`.execute(
    db,
  );
  await db.schema.alterTable("users").renameTo("users2").execute();
  await db.schema
    .createTable("users")
    .addColumn("id", "integer", (col) =>
      col.primaryKey().autoIncrement().notNull(),
    )
    .addColumn("username", "varchar", (col) => col.defaultTo("").notNull())
    .addColumn("password", "varchar", (col) => col.notNull())
    .addColumn("throttle", "integer", (col) => col.defaultTo(30).notNull())
    .addColumn("active", "boolean", (col) => col.defaultTo(false).notNull())
    .addColumn("inactiveDays", "integer", (col) => col.defaultTo(0).notNull())
    .addColumn("google", "varchar", (col) => col.defaultTo("").notNull())
    .addColumn("github", "varchar", (col) => col.defaultTo("").notNull())
    .addColumn("admin", "boolean", (col) => col.defaultTo(false).notNull())
    .addColumn("favoriteLeague", "integer")
    .addColumn("theme", "varchar")
    .addColumn("locale", "varchar")
    .execute();
  await sql`INSERT INTO users (id, username, password, throttle, active, inactiveDays, google, github, admin,
                               favoriteLeague, theme, locale)
            SELECT id,
                   COALESCE(username, ''),
                   password,
                   COALESCE(throttle, 30),
                   COALESCE(active, false),
                   COALESCE(inactiveDays, 0),
                   COALESCE(google, ''),
                   COALESCE(github, ''),
                   COALESCE(admin, false),
                   favoriteLeague,
                   theme,
                   locale
            FROM users2`.execute(db);
  await db.schema.dropTable("users2").execute();

  await db.schema.alterTable("players").renameTo("players2").execute();
  await db.schema
    .createTable("players")
    .addColumn("uid", "varchar", (col) => col.notNull())
    .addColumn("name", "varchar", (col) => col.notNull())
    .addColumn("nameAscii", "varchar", (col) => col.notNull())
    .addColumn("club", "varchar", (col) => col.notNull())
    .addColumn("pictureID", "integer", (col) => col.notNull())
    .addColumn("value", "integer", (col) => col.notNull())
    .addColumn("sale_price", "integer", (col) => col.notNull())
    .addColumn("position", "varchar", (col) => col.notNull())
    .addColumn("forecast", "varchar", (col) => col.notNull())
    .addColumn("total_points", "integer", (col) => col.notNull())
    .addColumn("average_points", "integer", (col) => col.notNull())
    .addColumn("last_match", "integer", (col) => col.notNull())
    .addColumn("locked", "boolean", (col) => col.notNull())
    .addColumn("exists", "boolean", (col) => col.notNull())
    .addColumn("league", "varchar", (col) => col.notNull())
    .addPrimaryKeyConstraint("players_pkey", ["uid", "league"])
    .execute();
  await sql`INSERT INTO players (uid, name, nameAscii, club, pictureID, value, sale_price, position, forecast,
                                 total_points, average_points, last_match, locked, "exists", league)
            SELECT uid,
                   name,
                   nameAscii,
                   club,
                   pictureID,
                   value,
                   sale_price,
                   position,
                   forecast,
                   total_points,
                   average_points,
                   last_match,
                   locked,
                   "exists",
                   league
            FROM players2`.execute(db);
  await db.schema.dropTable("players2").execute();

  await db.schema.alterTable("data").renameTo("data2").execute();
  await db.schema
    .createTable("data")
    .addColumn("value1", "varchar", (col) => col.notNull().primaryKey())
    .addColumn("value2", "varchar", (col) => col.notNull())
    .execute();
  await sql`INSERT INTO data (value1, value2)
            SELECT value1, value2
            FROM data2`.execute(db);
  await db.schema.dropTable("data2").execute();

  await db.schema
    .alterTable("leagueSettings")
    .renameTo("leagueSettings2")
    .execute();
  await db.schema
    .createTable("leagueSettings")
    .addColumn("leagueName", "varchar", (col) => col.notNull())
    .addColumn("leagueID", "integer", (col) =>
      col.primaryKey().autoIncrement().notNull(),
    )
    .addColumn("startMoney", "integer", (col) =>
      col.defaultTo(150000000).notNull(),
    )
    .addColumn("transfers", "integer", (col) => col.defaultTo(6).notNull())
    .addColumn("duplicatePlayers", "integer", (col) =>
      col.defaultTo(1).notNull(),
    )
    .addColumn("starredPercentage", "integer", (col) =>
      col.defaultTo(150).notNull(),
    )
    .addColumn("league", "varchar", (col) => col.notNull())
    .addColumn("archived", "integer", (col) => col.defaultTo(0).notNull())
    .addColumn("matchdayTransfers", "boolean", (col) =>
      col.defaultTo(false).notNull(),
    )
    .addColumn("fantasyEnabled", "boolean", (col) =>
      col.defaultTo(true).notNull(),
    )
    .addColumn("predictionsEnabled", "boolean", (col) =>
      col.defaultTo(true).notNull(),
    )
    .addColumn("predictWinner", "integer", (col) => col.defaultTo(2).notNull())
    .addColumn("predictDifference", "integer", (col) =>
      col.defaultTo(5).notNull(),
    )
    .addColumn("predictExact", "integer", (col) => col.defaultTo(15).notNull())
    .addColumn("top11", "boolean", (col) => col.defaultTo(false).notNull())
    .addColumn("active", "boolean", (col) => col.defaultTo(false).notNull())
    .addColumn("inactiveDays", "integer", (col) => col.defaultTo(0).notNull())
    .execute();
  await sql`INSERT INTO leagueSettings (leagueName, leagueID, startMoney, transfers, duplicatePlayers, starredPercentage, league,
                                        archived, matchdayTransfers, fantasyEnabled, predictionsEnabled, predictWinner,
                                        predictDifference, predictExact, top11, active, inactiveDays)
            SELECT leagueName,
                   leagueID,
                   COALESCE(startMoney, 150000000),
                   COALESCE(transfers, 6),
                   COALESCE(duplicatePlayers, 1),
                   COALESCE(starredPercentage, 150),
                   league,
                   COALESCE(archived, 0),
                   COALESCE(matchdayTransfers, false),
                   COALESCE(fantasyEnabled, true),
                   COALESCE(predictionsEnabled, true),
                   COALESCE(predictWinner, 2),
                   COALESCE(predictDifference, 5),
                   COALESCE(predictExact, 15),
                   COALESCE(top11, false),
                   COALESCE(active, false),
                   COALESCE(inactiveDays, 0)
            FROM leagueSettings2`.execute(db);
  await db.schema.dropTable("leagueSettings2").execute();

  await db.schema.alterTable("leagueUsers").renameTo("leagueUsers2").execute();
  await db.schema
    .createTable("leagueUsers")
    .addColumn("leagueID", "integer", (col) => col.notNull())
    .addColumn("user", "integer", (col) => col.notNull())
    .addColumn("fantasyPoints", "integer", (col) => col.defaultTo(0).notNull())
    .addColumn("predictionPoints", "integer", (col) =>
      col.defaultTo(0).notNull(),
    )
    .addColumn("points", "integer", (col) => col.defaultTo(0).notNull())
    .addColumn("money", "integer", (col) => col.notNull())
    .addColumn("formation", "varchar", (col) =>
      col.notNull().defaultTo("[1,4,4,2]"),
    )
    .addColumn("admin", "boolean", (col) => col.defaultTo(false).notNull())
    .addColumn("tutorial", "boolean", (col) => col.defaultTo(true).notNull())
    .addPrimaryKeyConstraint("leagueUsers_pkey", ["leagueID", "user"])
    .execute();
  await sql`INSERT INTO leagueUsers (leagueID, user, points, money, formation, admin, tutorial, fantasyPoints,
                                     predictionPoints)
            SELECT leagueID,
                   user,
                   COALESCE(points, 0),
                   money,
                   COALESCE(formation, '[1,4,4,2]'),
                   COALESCE(admin, false),
                   COALESCE(tutorial, true),
                   COALESCE(fantasyPoints, 0),
                   COALESCE(predictionPoints, 0)
            FROM leagueUsers2`.execute(db);
  await db.schema.dropTable("leagueUsers2").execute();

  await db.schema.alterTable("points").renameTo("points2").execute();
  await db.schema
    .createTable("points")
    .addColumn("leagueID", "integer", (col) => col.notNull())
    .addColumn("user", "integer", (col) => col.notNull())
    .addColumn("fantasyPoints", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("predictionPoints", "integer", (col) =>
      col.notNull().defaultTo(0),
    )
    .addColumn("points", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("matchday", "integer", (col) => col.notNull())
    .addColumn("money", "integer", (col) => col.notNull())
    .addColumn("time", "integer")
    .addPrimaryKeyConstraint("points_pkey", ["leagueID", "user", "matchday"])
    .execute();
  await sql`INSERT INTO points (leagueID, user, points, matchday, money, time, fantasyPoints, predictionPoints)
            SELECT leagueID,
                   user,
                   COALESCE(points, 0),
                   matchday,
                   money,
                   time,
                   COALESCE(fantasyPoints, 0),
                   COALESCE(predictionPoints, 0)
            FROM points2`.execute(db);
  await db.schema.dropTable("points2").execute();

  await db.schema.alterTable("transfers").renameTo("transfers2").execute();
  await db.schema
    .createTable("transfers")
    .addColumn("leagueID", "integer", (col) => col.notNull())
    .addColumn("seller", "integer", (col) => col.notNull())
    .addColumn("buyer", "integer", (col) => col.notNull())
    .addColumn("playeruid", "varchar", (col) => col.notNull())
    .addColumn("value", "integer", (col) => col.notNull())
    .addColumn("position", "varchar", (col) => col.defaultTo("bench").notNull())
    .addColumn("starred", "boolean", (col) => col.defaultTo(false).notNull())
    .addColumn("max", "integer", (col) => col.notNull())
    .execute();
  await sql`INSERT INTO transfers (leagueID, seller, buyer, playeruid, value, position, starred, max)
            SELECT leagueID,
                   seller,
                   buyer,
                   playeruid,
                   value,
                   COALESCE(position, 'bench'),
                   COALESCE(starred, false),
                   max
            FROM transfers2`.execute(db);
  await db.schema.dropTable("transfers2").execute();

  await db.schema.alterTable("invite").renameTo("invite2").execute();
  await db.schema
    .createTable("invite")
    .addColumn("inviteID", "varchar", (col) => col.notNull())
    .addColumn("leagueID", "integer", (col) => col.notNull())
    .addPrimaryKeyConstraint("invite_pkey", ["inviteID"])
    .execute();
  await sql`INSERT INTO invite (inviteID, leagueID)
            SELECT inviteID, leagueID
            FROM invite2`.execute(db);
  await db.schema.dropTable("invite2").execute();

  await db.schema.alterTable("squad").renameTo("squad2").execute();
  await db.schema
    .createTable("squad")
    .addColumn("leagueID", "integer", (col) => col.notNull())
    .addColumn("user", "integer", (col) => col.notNull())
    .addColumn("playeruid", "varchar", (col) => col.notNull())
    .addColumn("position", "varchar", (col) => col.notNull())
    .addColumn("starred", "boolean", (col) => col.defaultTo(false).notNull())
    .addPrimaryKeyConstraint("squad_pkey", ["leagueID", "user", "playeruid"])
    .execute();
  await sql`INSERT INTO squad (leagueID, user, playeruid, position, starred)
            SELECT leagueID, user, playeruid, position, COALESCE(starred, false)
            FROM squad2`.execute(db);
  await db.schema.dropTable("squad2").execute();

  await db.schema
    .alterTable("historicalSquad")
    .renameTo("historicalSquad2")
    .execute();
  await db.schema
    .createTable("historicalSquad")
    .addColumn("matchday", "integer", (col) => col.notNull())
    .addColumn("leagueID", "integer", (col) => col.notNull())
    .addColumn("user", "integer", (col) => col.notNull())
    .addColumn("playeruid", "varchar", (col) => col.notNull())
    .addColumn("position", "varchar", (col) => col.notNull())
    .addColumn("starred", "boolean", (col) => col.defaultTo(false).notNull())
    .addPrimaryKeyConstraint("historicalSquad_pkey", [
      "matchday",
      "leagueID",
      "user",
      "playeruid",
    ])
    .execute();
  await sql`INSERT INTO historicalSquad (matchday, leagueID, user, playeruid, position, starred)
            SELECT matchday, leagueID, user, playeruid, position, COALESCE(starred, false)
            FROM historicalSquad2
            WHERE 1 = 1
            ON CONFLICT DO NOTHING`.execute(db);
  await db.schema.dropTable("historicalSquad2").execute();

  await db.schema
    .alterTable("historicalPlayers")
    .renameTo("historicalPlayers2")
    .execute();
  await db.schema
    .createTable("historicalPlayers")
    .addColumn("time", "integer", (col) => col.notNull())
    .addColumn("uid", "varchar", (col) => col.notNull())
    .addColumn("name", "varchar", (col) => col.notNull())
    .addColumn("nameAscii", "varchar", (col) => col.notNull())
    .addColumn("club", "varchar", (col) => col.notNull())
    .addColumn("pictureID", "integer", (col) => col.notNull())
    .addColumn("value", "integer", (col) => col.notNull())
    .addColumn("sale_price", "integer", (col) => col.notNull())
    .addColumn("position", "varchar", (col) => col.notNull())
    .addColumn("forecast", "varchar", (col) => col.notNull())
    .addColumn("total_points", "integer", (col) => col.notNull())
    .addColumn("average_points", "integer", (col) => col.notNull())
    .addColumn("last_match", "integer", (col) => col.notNull())
    .addColumn("exists", "boolean", (col) => col.notNull())
    .addColumn("league", "varchar", (col) => col.notNull())
    .addPrimaryKeyConstraint("historicalPlayers_pkey", [
      "time",
      "uid",
      "league",
    ])
    .execute();
  await sql`INSERT INTO historicalPlayers (time, uid, name, nameAscii, club, pictureID, value, sale_price, position,
                                           forecast, total_points, average_points, last_match, "exists", league)
            SELECT time,
                   uid,
                   name,
                   nameAscii,
                   club,
                   pictureID,
                   value,
                   sale_price,
                   position,
                   forecast,
                   total_points,
                   average_points,
                   last_match,
                   "exists",
                   league
            FROM historicalPlayers2`.execute(db);
  await db.schema.dropTable("historicalPlayers2").execute();

  await db.schema
    .alterTable("historicalTransfers")
    .renameTo("historicalTransfers2")
    .execute();
  await db.schema
    .createTable("historicalTransfers")
    .addColumn("matchday", "integer", (col) => col.notNull())
    .addColumn("leagueID", "integer", (col) => col.notNull())
    .addColumn("seller", "integer", (col) => col.notNull())
    .addColumn("buyer", "integer", (col) => col.notNull())
    .addColumn("playeruid", "varchar", (col) => col.notNull())
    .addColumn("value", "integer", (col) => col.notNull())
    .execute();
  await sql`INSERT INTO historicalTransfers (matchday, leagueID, seller, buyer, playeruid, value)
            SELECT matchday, leagueID, seller, buyer, playeruid, value
            FROM historicalTransfers2`.execute(db);
  await db.schema.dropTable("historicalTransfers2").execute();

  await db.schema.alterTable("clubs").renameTo("clubs2").execute();
  await db.schema
    .createTable("clubs")
    .addColumn("club", "varchar", (col) => col.notNull())
    .addColumn("fullName", "varchar")
    .addColumn("gameStart", "integer", (col) => col.notNull())
    .addColumn("gameEnd", "integer", (col) => col.notNull())
    .addColumn("opponent", "varchar")
    .addColumn("teamScore", "integer")
    .addColumn("opponentScore", "integer")
    .addColumn("league", "varchar", (col) => col.notNull())
    .addColumn("home", "boolean", (col) => col.notNull())
    .addColumn("exists", "boolean", (col) => col.notNull().defaultTo(true))
    .addPrimaryKeyConstraint("clubs_pkey", ["club", "league"])
    .execute();
  await sql`INSERT INTO clubs (club, gameStart, gameEnd, opponent, teamScore, opponentScore, league, home, "exists",
                               fullName)
            SELECT club,
                   gameStart,
                   gameEnd,
                   opponent,
                   teamScore,
                   opponentScore,
                   league,
                   home,
                   COALESCE("exists", true),
                   fullName
            FROM clubs2`.execute(db);
  await db.schema.dropTable("clubs2").execute();

  await db.schema
    .alterTable("historicalClubs")
    .renameTo("historicalClubs2")
    .execute();
  await db.schema
    .createTable("historicalClubs")
    .addColumn("club", "varchar", (col) => col.notNull())
    .addColumn("fullName", "varchar")
    .addColumn("gameStart", "integer", (col) => col.notNull())
    .addColumn("opponent", "varchar")
    .addColumn("teamScore", "integer")
    .addColumn("opponentScore", "integer")
    .addColumn("league", "varchar", (col) => col.notNull())
    .addColumn("home", "boolean", (col) => col.notNull())
    .addColumn("time", "integer", (col) => col.notNull())
    .addColumn("exists", "boolean", (col) => col.notNull().defaultTo(true))
    .addPrimaryKeyConstraint("historicalClubs_pkey", ["club", "league", "time"])
    .execute();
  await sql`INSERT INTO historicalClubs (club, opponent, teamScore, opponentScore, league, home, time, "exists",
                                         fullName, gameStart)
            SELECT club,
                   opponent,
                   teamScore,
                   opponentScore,
                   league,
                   home,
                   time,
                   COALESCE("exists", true),
                   fullName,
                   gameStart
            FROM historicalClubs2`.execute(db);
  await db.schema.dropTable("historicalClubs2").execute();

  await db.schema.alterTable("futureClubs").renameTo("futureClubs2").execute();
  await db.schema
    .createTable("futureClubs")
    .addColumn("club", "varchar", (col) => col.notNull())
    .addColumn("fullName", "varchar")
    .addColumn("gameStart", "integer", (col) => col.notNull())
    .addColumn("opponent", "varchar", (col) => col.notNull())
    .addColumn("league", "varchar", (col) => col.notNull())
    .addColumn("home", "boolean", (col) => col.notNull())
    .addPrimaryKeyConstraint("futureClubs_pkey", [
      "club",
      "league",
      "gameStart",
    ])
    .execute();
  await sql`INSERT INTO futureClubs (club, fullName, gameStart, opponent, league, home)
            SELECT club, fullName, gameStart, opponent, league, home
            FROM futureClubs2`.execute(db);
  await db.schema.dropTable("futureClubs2").execute();

  await db.schema.alterTable("analytics").renameTo("analytics2").execute();
  await db.schema
    .createTable("analytics")
    .addColumn("day", "integer", (col) => col.primaryKey().notNull())
    .addColumn("versionActive", "varchar", (col) => col.notNull())
    .addColumn("versionTotal", "varchar", (col) => col.notNull())
    .addColumn("leagueActive", "varchar", (col) => col.notNull())
    .addColumn("leagueTotal", "varchar", (col) => col.notNull())
    .addColumn("themeActive", "varchar", (col) => col.notNull())
    .addColumn("themeTotal", "varchar", (col) => col.notNull())
    .addColumn("localeActive", "varchar", (col) => col.notNull())
    .addColumn("localeTotal", "varchar", (col) => col.notNull())
    .execute();
  await sql`INSERT INTO analytics (day, versionActive, versionTotal, leagueActive, leagueTotal, themeActive, themeTotal,
                                   localeActive, localeTotal)
            SELECT day,
                   versionActive,
                   versionTotal,
                   leagueActive,
                   leagueTotal,
                   themeActive,
                   themeTotal,
                   localeActive,
                   localeTotal
            FROM analytics2`.execute(db);
  await db.schema.dropTable("analytics2").execute();

  await db.schema
    .alterTable("detailedAnalytics")
    .renameTo("detailedAnalytics2")
    .execute();
  await db.schema
    .createTable("detailedAnalytics")
    .addColumn("serverID", "varchar", (col) => col.notNull())
    .addColumn("day", "integer", (col) => col.notNull())
    .addColumn("version", "varchar", (col) => col.notNull())
    .addColumn("active", "integer", (col) => col.notNull())
    .addColumn("total", "integer", (col) => col.notNull())
    .addColumn("leagueActive", "varchar", (col) => col.notNull())
    .addColumn("leagueTotal", "varchar", (col) => col.notNull())
    .addColumn("themeActive", "varchar", (col) => col.notNull())
    .addColumn("themeTotal", "varchar", (col) => col.notNull())
    .addColumn("localeActive", "varchar", (col) => col.notNull())
    .addColumn("localeTotal", "varchar", (col) => col.notNull())
    .addPrimaryKeyConstraint("detailedAnalytics_pkey", ["serverID", "day"])
    .execute();
  await sql`INSERT INTO detailedAnalytics (serverID, day, version, active, total, leagueActive, leagueTotal,
                                           themeActive, themeTotal, localeActive, localeTotal)
            SELECT serverID,
                   day,
                   version,
                   active,
                   total,
                   leagueActive,
                   leagueTotal,
                   themeActive,
                   themeTotal,
                   localeActive,
                   localeTotal
            FROM detailedAnalytics2
            WHERE 1 = 1
            ON CONFLICT DO NOTHING`.execute(db);
  await db.schema.dropTable("detailedAnalytics2").execute();

  await db.schema
    .alterTable("announcements")
    .renameTo("announcements2")
    .execute();
  await db.schema
    .createTable("announcements")
    .addColumn("leagueID", "integer", (col) => col.notNull())
    .addColumn("priority", "varchar", (col) => col.notNull())
    .addColumn("title", "varchar", (col) => col.notNull())
    .addColumn("description", "varchar", (col) => col.notNull())
    .execute();
  await sql`INSERT INTO announcements (leagueID, priority, title, description)
            SELECT leagueID, priority, title, description
            FROM announcements2`.execute(db);
  await db.schema.dropTable("announcements2").execute();

  await db.schema.alterTable("plugins").renameTo("plugins2").execute();
  await db.schema
    .createTable("plugins")
    .addColumn("name", "varchar")
    .addColumn("settings", "varchar", (col) => col.notNull())
    .addColumn("enabled", "boolean", (col) => col.defaultTo(false).notNull())
    .addColumn("installed", "boolean", (col) => col.defaultTo(false).notNull())
    .addColumn("url", "varchar", (col) => col.primaryKey().notNull())
    .addColumn("version", "varchar", (col) => col.notNull().defaultTo(""))
    .execute();
  await sql`INSERT INTO plugins (name, settings, enabled, url, version, installed)
            SELECT name, settings, COALESCE(enabled, false), url, COALESCE(version, ''), COALESCE(installed, false)
            FROM plugins2`.execute(db);
  await db.schema.dropTable("plugins2").execute();

  await db.schema.alterTable("pictures").renameTo("pictures2").execute();
  await db.schema
    .createTable("pictures")
    .addColumn("id", "integer", (col) =>
      col.primaryKey().autoIncrement().notNull(),
    )
    .addColumn("url", "varchar", (col) => col.notNull())
    .addColumn("downloading", "boolean", (col) =>
      col.defaultTo(false).notNull(),
    )
    .addColumn("downloaded", "boolean", (col) => col.defaultTo(false).notNull())
    .addColumn("height", "integer", (col) => col.defaultTo(0).notNull())
    .addColumn("width", "integer", (col) => col.defaultTo(0).notNull())
    .execute();
  await sql`INSERT INTO pictures (url, downloaded, height, width, downloading)
            SELECT url,
                   COALESCE(downloaded, false),
                   COALESCE(height, 0),
                   COALESCE(width, 0),
                   COALESCE(downloading, false)
            FROM pictures2`.execute(db);
  await db.schema.dropTable("pictures2").execute();

  await db.schema.alterTable("predictions").renameTo("predictions2").execute();
  await db.schema
    .createTable("predictions")
    .addColumn("leagueID", "integer", (col) => col.notNull())
    .addColumn("user", "integer", (col) => col.notNull())
    .addColumn("club", "varchar", (col) => col.notNull())
    .addColumn("league", "varchar", (col) => col.notNull())
    .addColumn("home", "integer")
    .addColumn("away", "integer")
    .addPrimaryKeyConstraint("predictions_pkey", ["leagueID", "user", "club"])
    .execute();
  await sql`INSERT INTO predictions (leagueID, user, club, league, home, away)
            SELECT leagueID, user, club, league, home, away
            FROM predictions2`.execute(db);
  await db.schema.dropTable("predictions2").execute();

  await db.schema
    .alterTable("historicalPredictions")
    .renameTo("historicalPredictions2")
    .execute();
  await db.schema
    .createTable("historicalPredictions")
    .addColumn("matchday", "integer", (col) => col.notNull())
    .addColumn("leagueID", "integer", (col) => col.notNull())
    .addColumn("user", "integer", (col) => col.notNull())
    .addColumn("club", "varchar", (col) => col.notNull())
    .addColumn("league", "varchar", (col) => col.notNull())
    .addColumn("home", "integer")
    .addColumn("away", "integer")
    .addPrimaryKeyConstraint("historicalPredictions_pkey", [
      "leagueID",
      "user",
      "club",
      "matchday",
    ])
    .execute();
  await sql`INSERT INTO historicalPredictions (matchday, leagueID, user, club, league, home, away)
            SELECT matchday, leagueID, user, club, league, home, away
            FROM historicalPredictions2
            WHERE 1 = 1
            ON CONFLICT DO NOTHING`.execute(db);
  await db.schema.dropTable("historicalPredictions2").execute();

  await db.schema
    .alterTable("futurePredictions")
    .renameTo("futurePredictions2")
    .execute();
  await db.schema
    .createTable("futurePredictions")
    .addColumn("leagueID", "integer", (col) => col.notNull())
    .addColumn("user", "integer", (col) => col.notNull())
    .addColumn("club", "varchar", (col) => col.notNull())
    .addColumn("league", "varchar", (col) => col.notNull())
    .addColumn("gameStart", "integer", (col) => col.notNull())
    .addColumn("home", "integer")
    .addColumn("away", "integer")
    .addPrimaryKeyConstraint("futurePredictions_pkey", [
      "leagueID",
      "user",
      "club",
      "gameStart",
    ])
    .execute();
  await sql`INSERT INTO futurePredictions (leagueID, user, club, league, gameStart, home, away)
            SELECT leagueID, user, club, league, gameStart, home, away
            FROM futurePredictions2`.execute(db);
  await db.schema.dropTable("futurePredictions2").execute();

  await db.schema
    .createIndex("points_leagueID_user")
    .on("points")
    .columns(["leagueID", "user"])
    .execute();

  await db.schema
    .createIndex("transfers_leagueID")
    .on("transfers")
    .columns(["leagueID"])
    .execute();

  await db.schema
    .createIndex("transfers_leagueID_buyer")
    .on("transfers")
    .columns(["leagueID", "buyer"])
    .execute();

  await db.schema
    .createIndex("transfers_leagueID_seller")
    .on("transfers")
    .columns(["leagueID", "seller"])
    .execute();

  await db.schema
    .createIndex("squad_leagueID_user")
    .on("squad")
    .columns(["leagueID", "user"])
    .execute();

  await db.schema
    .createIndex("historicalSquad_leagueID_user_matchday")
    .on("historicalSquad")
    .columns(["leagueID", "user", "matchday"])
    .execute();

  await db.schema
    .createIndex("historicalTransfers_leagueID_matchday")
    .on("historicalTransfers")
    .columns(["leagueID", "matchday"])
    .execute();

  await db.schema
    .createIndex("clubs_club_league")
    .on("historicalClubs")
    .columns(["club", "league"])
    .execute();

  await db.schema
    .createIndex("detailedAnalytics_day")
    .on("detailedAnalytics")
    .columns(["day"])
    .execute();

  await db.schema
    .createIndex("announcements_leagueID")
    .on("announcements")
    .columns(["leagueID"])
    .execute();

  await db.schema
    .createIndex("predictions_leagueID_user")
    .on("predictions")
    .columns(["leagueID", "user"])
    .execute();

  await db.schema
    .createIndex("historicalPredictions_leagueID_user_matchday")
    .on("historicalPredictions")
    .columns(["leagueID", "user", "matchday"])
    .execute();

  await db.schema
    .createIndex("url_pictures")
    .on("pictures")
    .columns(["url"])
    .execute();
}
