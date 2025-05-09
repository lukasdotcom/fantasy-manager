import { forecast, position } from "#types/database";
import dataGetter, { players, clubs } from "#type/data";
import { EPLPlayers, EPLTeams } from "./types";

const Main: dataGetter = async function () {
  const nowTime = Math.floor(Date.now() / 1000);
  // Gets the data for the league
  const data: EPLPlayers = await fetch(
    "https://fantasy.premierleague.com/api/bootstrap-static/",
  ).then((e) => e.json());
  let newTransfer = true;
  let countdown = 0;
  let matchday = 0;
  let matchdayData: EPLTeams = [];
  // Finds the current matchday by going through each matchday and seeing if they are done
  while (matchday < data.events.length) {
    const currentData = data.events[matchday];
    if (currentData.finished === false) {
      newTransfer = currentData.deadline_time_epoch - nowTime > 0;
      // Gets the team data for the matchday
      matchdayData = await fetch(
        `https://fantasy.premierleague.com/api/fixtures/?event=${currentData.id}`,
      )
        .then(async (val) => {
          if (val.ok) {
            return await val.json();
          } else {
            return [];
          }
        })
        .catch(() => []);
      countdown = newTransfer ? currentData.deadline_time_epoch - nowTime : 0;
      break;
    }
    matchday++;
  }
  // Gets the short_name for the club with this id
  const getTeam = (id: number): string => {
    const result = data.teams.filter((e) => e.id === id);
    if (result.length > 0) {
      return result[0].short_name;
    } else {
      return "";
    }
  };
  // Gets the list of teams and gets their data
  const teams = data.teams.map((club): clubs => {
    const homeGame = matchdayData.filter((e) => e.team_h === club.id);
    let opponent = "";
    let gameStart = 0;
    let teamScore = 0;
    let opponentScore = 0;
    // Sets the default game end time to the past
    let gameEnd = nowTime - 100;
    if (homeGame.length > 0) {
      gameStart = Date.parse(String(homeGame[0].kickoff_time)) / 1000;
      opponent = getTeam(homeGame[0].team_a);
      if (homeGame[0].finished !== true) {
        gameEnd = gameStart + 60 * 2.5 * 60;
      }
      teamScore = homeGame[0].team_h_score;
      opponentScore = homeGame[0].team_a_score;
    }
    const awayGame = matchdayData.filter((e) => e.team_a === club.id);
    if (awayGame.length > 0) {
      gameStart = Date.parse(String(awayGame[0].kickoff_time)) / 1000;
      opponent = getTeam(awayGame[0].team_h);
      if (awayGame[0].finished !== true) {
        gameEnd = gameStart + 60 * 2.5 * 60;
      }
      opponentScore = awayGame[0].team_h_score;
      teamScore = awayGame[0].team_a_score;
    }
    return {
      club: club.short_name,
      gameStart,
      gameEnd,
      opponent,
      teamScore,
      opponentScore,
      league: "EPL",
      home: homeGame.length > 0,
    };
  });
  // Gets all the player data
  const players = data.elements
    .filter((e) => /*Checks if the player is transfered out*/ e.status !== "u")
    .map((e): players => {
      const teamData = data.teams[e.team - 1];
      let forecast: forecast = "m";
      switch (e.status) {
        case "a":
          forecast = "a";
          break;
        case "d":
          forecast = "u";
          break;
        case "i":
          forecast = "m";
          break;
        case "n":
          forecast = "m";
          break;
        case "s":
          forecast = "m";
          break;
        case "u":
          forecast = "u";
          break;
        default:
          forecast = "m";
          break;
      }
      return {
        uid: String(e.code),
        name: e.first_name + " " + e.second_name,
        club: teamData.short_name,
        pictureUrl: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${e.code}.png`,
        height: 140,
        width: 110,
        value: e.now_cost * 100000,
        position:
          (["gk", "gk", "def", "mid", "att"][e.element_type] as position) ||
          "gk",
        forecast,
        total_points: e.total_points,
        average_points: parseFloat(e.points_per_game),
        exists: true,
      };
    });
  return [newTransfer, countdown, players, teams];
};
export default Main;
