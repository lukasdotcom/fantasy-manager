export interface players {
  uid: string; // This is the unique id of the player
  name: string; // This is the name of the player
  club: string; // This is the club of the player
  pictureUrl: string; // This is the url of the picture of the player // Note this is always an empty string when passed to the plugin
  height: number; // This is the height of the picture of the player
  width: number; // This is the width of the picture of the player
  value: number; // This is the value of the player
  sale_price?: number; // This is the sale price of the player
  position: string; // This is the position of the player
  forecast?: string; // This is the forecast of the player where a is attending u is unknown and m is missing
  total_points?: number; // This is the total points of the player
  average_points?: number; // This is the average points of the player per game
  last_match?: number; // This is the points in the last match of the player
  exists?: boolean; // This can be set to false to update a player that does not exist anymore
  [key: string]: unknown; // This is so the type definition will work for new versions
}

export interface clubs {
  club: string; // This is the name of the club
  fullName?: string; // This is the full name of the club
  gameStart: number; // This is the start time of the game
  gameEnd: number; // This is the end time of the game
  opponent?: string; // This is the name of the opponent
  teamScore?: number; // This is the score of the team
  opponentScore?: number; // This is the score of the opponent
  league: string; // This is the name of the league
  home?: boolean; // This is if it is home or away, If not set it is chosen at random so that there is only one home team in a game
  future_games?: {
    gameStart: number; // This is the start time of the game
    opponent: string; // This is the name of the opponent
    home?: boolean; // This is if it is home or away, If not set it is chosen at random so that there is only one home team in a game
  }[]; // Allows specification of future games to be predicted
}

// These are the types for the data getter functions
export type result = [
  boolean,
  number,
  players[],
  clubs[],
  {
    update_points_after_game_end?: boolean; // Set this to true if you want the plugin to be able to change points even after the game has ended
    [key: string]: unknown;
  }?, // This is an optional paramater added in 1.20.0 for settings
];
type dataGetter = (
  settings: { [key: string]: string },
  past_data: {
    players: players[];
    clubs: clubs[];
    timestamp: number;
    transferOpen: boolean; // This was added in version 1.20.0. If this is required you must set 1.20.0 as the min version.
    [key: string]: unknown;
  },
) => Promise<result>;
export default dataGetter;
