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
  Scheduled = "scheduled",
  Finished = "finished",
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
  homeScore: null | number;
  homePenaltyScore: null | number;
  homeGoalScorersAssists: null;
  awayScore: null | number;
  awayPenaltyScore: null | number;
  awayGoalScorersAssists: null;
}

export enum Period {
  PreMatch = "pre_match",
}
