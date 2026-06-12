export type Rounds = Round[];
interface Round {
  id: number;
  status: Status;
  startDate: Date;
  endDate: Date;
  tournaments: Tournament[];
  stage: string;
}

export enum Status {
  Playing = "playing",
  Scheduled = "scheduled",
  Finished = "complete",
}

export interface Tournament {
  id: number;
  period: Period;
  minutes: number;
  extraMinutes: number;
  venueName: string;
  venueCity: string;
  venueNameTranslationKey: null;
  venueCityTranslationKey: null;
  venueId: number;
  date: Date;
  status: Status;
  isSuspended: boolean;
  homeSquadId: number;
  awaySquadId: number;
  homeSquadName: string;
  awaySquadName: string;
  homeSquadAbbr: string;
  awaySquadAbbr: string;
  homeScore: number | null;
  homePenaltyScore: number | null;
  homeGoalScorersAssists: GoalScorersAssist[] | null;
  awayScore: number | null;
  awayPenaltyScore: number | null;
  awayGoalScorersAssists: GoalScorersAssist[] | null;
}

export interface GoalScorersAssist {
  playerId: number;
  assistId: null;
}

export enum Period {
  FirstHalf = "first_half",
  SecondHalf = "second_half",
  PreMatch = "pre_match",
}
