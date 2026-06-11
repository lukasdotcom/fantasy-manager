import { position } from "#/types/database";
import dataGetter, { clubs, players } from "#type/data";
import { Position } from "./typePlayers";
import { Period, Status as RoundStatus } from "./typeRounds";
import { Players, Rounds, Teams } from "./types";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

const positionMap: Record<Position, position> = {
  [Position.Gk]: "gk",
  [Position.Def]: "def",
  [Position.Mid]: "mid",
  [Position.Fwd]: "att",
};

const Main: dataGetter = async function () {
  const nowTime = Math.floor(Date.now() / 1000);

  const [playerData, rounds, squads]: [Players, Rounds, Teams] =
    await Promise.all([
      fetch("https://play.fifa.com/json/fantasy/players.json", {
        headers,
      }).then((e) => e.json()),
      fetch("https://play.fifa.com/json/fantasy/rounds.json", { headers }).then(
        (e) => e.json(),
      ),
      fetch("https://play.fifa.com/json/fantasy/squads.json", { headers }).then(
        (e) => e.json(),
      ),
    ]);

  const squadById = new Map(squads.map((squad) => [squad.id, squad]));

  const roundsWithTimes = rounds.map((round) => ({
    round,
    start: Date.parse(String(round.startDate)) / 1000,
    end: Date.parse(String(round.endDate)) / 1000,
  }));

  const activeRound = roundsWithTimes.find(
    ({ start, end }) => start <= nowTime && nowTime < end,
  );
  const nextRound = roundsWithTimes.find(({ start }) => start > nowTime);
  const currentRoundEntry =
    activeRound ?? nextRound ?? roundsWithTimes[roundsWithTimes.length - 1];
  const currentRound = currentRoundEntry.round;
  const futureRounds = roundsWithTimes
    .filter(({ start }) => start > currentRoundEntry.start)
    .map(({ round }) => round);

  let transferOpen = true;
  let countdown = 0;

  if (activeRound) {
    transferOpen = currentRound.tournaments.every(
      (game) => game.period === Period.PreMatch,
    );
    if (!transferOpen) {
      countdown = currentRoundEntry.end - nowTime;
    }
  } else if (!nextRound) {
    transferOpen = false;
  }

  const clubs: clubs[] = [];
  const clubList: string[] = [];

  for (const game of currentRound.tournaments) {
    const gameStart = Date.parse(String(game.date)) / 1000;
    const isFinished = game.status === RoundStatus.Finished;
    let gameEnd = gameStart + 60 * 60 * 2.5;

    if (!isFinished) {
      if (gameEnd <= nowTime + 600) {
        gameEnd = nowTime + 600;
      }
    }

    if (
      game.period === Period.PreMatch &&
      game.status === RoundStatus.Scheduled &&
      transferOpen
    ) {
      const tempCountdown = gameStart - nowTime;
      if (tempCountdown < countdown || countdown === 0) {
        countdown = tempCountdown;
      }
    }

    const homeSquad = squadById.get(game.homeSquadId);
    const awaySquad = squadById.get(game.awaySquadId);
    const homeScore = (game.homeScore ?? 0) + (game.homePenaltyScore ?? 0);
    const awayScore = (game.awayScore ?? 0) + (game.awayPenaltyScore ?? 0);

    clubList.push(game.homeSquadAbbr);
    clubList.push(game.awaySquadAbbr);

    clubs.push({
      club: game.homeSquadAbbr,
      fullName: homeSquad?.name ?? game.homeSquadName,
      gameStart,
      gameEnd,
      opponent: game.awaySquadAbbr,
      teamScore: homeScore,
      opponentScore: awayScore,
      league: "WorldCup2026",
      home: true,
      future_games: futureRounds.flatMap((round) =>
        round.tournaments
          .filter((fixture) => fixture.homeSquadAbbr === game.homeSquadAbbr)
          .map((fixture) => ({
            gameStart: Date.parse(String(fixture.date)) / 1000,
            opponent: fixture.awaySquadAbbr,
            home: true,
          }))
          .concat(
            round.tournaments
              .filter((fixture) => fixture.awaySquadAbbr === game.homeSquadAbbr)
              .map((fixture) => ({
                gameStart: Date.parse(String(fixture.date)) / 1000,
                opponent: fixture.homeSquadAbbr,
                home: false,
              })),
          ),
      ),
    });

    clubs.push({
      club: game.awaySquadAbbr,
      fullName: awaySquad?.name ?? game.awaySquadName,
      gameStart,
      gameEnd,
      opponent: game.homeSquadAbbr,
      teamScore: awayScore,
      opponentScore: homeScore,
      league: "WorldCup2026",
      home: false,
      future_games: futureRounds.flatMap((round) =>
        round.tournaments
          .filter((fixture) => fixture.homeSquadAbbr === game.awaySquadAbbr)
          .map((fixture) => ({
            gameStart: Date.parse(String(fixture.date)) / 1000,
            opponent: fixture.awaySquadAbbr,
            home: true,
          }))
          .concat(
            round.tournaments
              .filter((fixture) => fixture.awaySquadAbbr === game.awaySquadAbbr)
              .map((fixture) => ({
                gameStart: Date.parse(String(fixture.date)) / 1000,
                opponent: fixture.homeSquadAbbr,
                home: false,
              })),
          ),
      ),
    });
  }

  if (countdown < 0) {
    countdown = 0;
  }

  const players: players[] = playerData.map((player) => {
    const squad = squadById.get(player.squadId);
    const name =
      player.knownName ?? `${player.firstName} ${player.lastName}`.trim();

    return {
      uid: String(player.id),
      name,
      club: squad?.abbr ?? "",
      pictureUrl: `https://play.fifa.com/media/image/fantasy/squads/${player.squadId}.png`,
      height: 200,
      width: 200,
      value: player.price * 1000000,
      position: positionMap[player.position],
      forecast: "a",
      total_points: player.stats.totalPoints,
      average_points: player.stats.avgPoints,
      last_match: player.stats.lastRoundPoints,
      exists: clubList.includes(squad?.abbr ?? ""),
    };
  });

  return [
    transferOpen,
    countdown,
    players,
    clubs,
    { update_points_after_game_end: true },
  ];
};

export default Main;
