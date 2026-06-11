export type Players = Player[];
interface Player {
  id: number;
  firstName: string;
  lastName: string;
  knownName: null | string;
  squadId: number;
  position: Position;
  price: number;
  status: Status;
  matchStatus: null;
  percentSelected: number;
  roundsSelected: RoundsSelected;
  stats: Stats;
  oneToWatch: boolean;
  oneToWatchText: null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qualificationRoundIds: any[];
  fifaId: null;
}

export enum Position {
  Def = "DEF",
  Fwd = "FWD",
  Gk = "GK",
  Mid = "MID",
}

export interface RoundsSelected {
  "1": number;
}

export interface Stats {
  totalPoints: number;
  avgPoints: number;
  form: number;
  lastRoundPoints: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roundPoints: any[];
  nextFixtureFromActiveRound: null;
  nextFixtureFromScheduledRound: number;
}

export enum Status {
  Playing = "playing",
  Transferred = "transferred",
}
