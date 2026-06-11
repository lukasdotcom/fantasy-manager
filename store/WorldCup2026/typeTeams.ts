export type Teams = Team[];
interface Team {
  id: number;
  name: string;
  group: string;
  abbr: string;
  isEliminated: boolean;
}
