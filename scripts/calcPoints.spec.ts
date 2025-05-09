import db from "../Modules/database";
import {
  calcHistoricalPredictionPoints,
  calcPredicitionPointsRaw,
  calcPredictionsPointsNow,
  calcStarredPoints,
  predictions_raw,
} from "./calcPoints";
import { describe } from "@jest/globals";
import { Selectable } from "kysely";
import { LeagueUsers, LeagueSettings, Points } from "../types/db";

describe("calcStarredPoints", () => {
  beforeEach(async () => {
    await db.deleteFrom("players").execute();
    await db.deleteFrom("squad").execute();
  });
  it("no players", async () => {
    const user: Selectable<LeagueUsers> = {
      user: 1,
      leagueID: 1,
      points: 0,
      money: 0,
      formation: "{}",
      fantasyPoints: 0,
      predictionPoints: 0,
      admin: 0,
      tutorial: 0,
    };
    expect(process.env["APP_ENV"]).toBe("test");
    expect(await calcStarredPoints(user)).toBe(0);
  });
});

describe("calcPredictionsPointsNow", () => {
  beforeEach(async () => {
    await db.deleteFrom("predictions").execute();
    await db.deleteFrom("leagueSettings").execute();
    await db.deleteFrom("leagueUsers").execute();
  });
  it("no predictions with null", async () => {
    await db
      .insertInto("predictions")
      .values({
        leagueID: 1,
        user: 1,
        club: "test",
        league: "league",
      })
      .execute();
    await db
      .insertInto("leagueSettings")
      .values({ leagueID: 1, leagueName: "", league: "league" })
      .execute();
    await db
      .insertInto("leagueUsers")
      .values({ user: 1, leagueID: 1, money: 0 })
      .execute();
    await db
      .insertInto("predictions")
      .values({
        leagueID: 1,
        user: 1,
        club: "test2",
        league: "league",
        home: 1,
      })
      .execute();
    const user = await db
      .selectFrom("leagueUsers")
      .where("user", "=", 1)
      .where("leagueID", "=", 1)
      .selectAll()
      .executeTakeFirst();
    expect(user).toBeDefined();
    if (user !== undefined) {
      await calcPredictionsPointsNow(user);
    }
    const prediction_list = await db
      .selectFrom("predictions")
      .where("leagueID", "=", 1)
      .where("user", "=", 1)
      .selectAll()
      .execute();
    for (let i = 0; i < prediction_list.length; i++) {
      expect(prediction_list[i].home).not.toBeNull();
      expect(prediction_list[i].away).not.toBeNull();
    }
  });
});

describe("calcPredictionsPoints", () => {
  const defaultleagueSettings: Selectable<LeagueSettings> = {
    leagueID: 1,
    leagueName: "test",
    archived: 0,
    startMoney: 0,
    transfers: 0,
    duplicatePlayers: 0,
    starredPercentage: 0,
    matchdayTransfers: 0,
    fantasyEnabled: 0,
    predictionsEnabled: 1,
    top11: 0,
    inactiveDays: 0,
    active: 1,
    league: "league",
    predictExact: 5,
    predictDifference: 3,
    predictWinner: 1,
  };
  it("no predictions", () => {
    expect(calcPredicitionPointsRaw([], [], defaultleagueSettings));
  });
  it("Simple with exact, difference and winner", () => {
    const predictions: predictions_raw[] = [
      { home: 2, away: 2, club: "1" },
      { home: 5, away: 1, club: "2" },
      { home: 5, away: 1, club: "3" },
    ];
    const games: predictions_raw[] = [
      { home: 2, away: 2, club: "1" },
      { home: 3, away: 0, club: "2" },
      { home: 4, away: 0, club: "3" },
    ];
    expect(
      calcPredicitionPointsRaw(predictions, games, defaultleagueSettings),
    ).toBe(9);
  });
});

describe("calcHistoricalPredictionPoints", () => {
  const point_data: Selectable<Points> = {
    leagueID: 1,
    user: 1,
    points: 0,
    fantasyPoints: 0,
    predictionPoints: 0,
    time: 1,
    matchday: 1,
    money: 0,
  };
  beforeEach(async () => {
    await db.deleteFrom("leagueSettings").execute();
    await db.deleteFrom("historicalClubs").execute();
    await db.deleteFrom("historicalPredictions").execute();
    await db.deleteFrom("leagueUsers").execute();
    await db
      .insertInto("leagueSettings")
      .values({
        leagueID: 1,
        predictExact: 10,
        league: "league",
        leagueName: "test",
      })
      .execute();
    await db
      .insertInto("historicalClubs")
      .values({
        home: 1,
        time: 1,
        teamScore: 1,
        opponentScore: 1,
        gameStart: 0,
        club: "test",
        league: "league",
      })
      .execute();
    await db
      .insertInto("leagueUsers")
      .values({ user: 1, leagueID: 1, money: 0 })
      .execute();
  });
  it("no prediction", async () => {
    expect(await calcHistoricalPredictionPoints(point_data)).toBe(0);
  });
  it("one prediction", async () => {
    await db
      .insertInto("historicalPredictions")
      .values({
        user: 1,
        leagueID: 1,
        matchday: 1,
        home: 1,
        away: 1,
        club: "test",
        league: "league",
      })
      .execute();
    expect(await calcHistoricalPredictionPoints(point_data)).toBe(10);
  });
});
