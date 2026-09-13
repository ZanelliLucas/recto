/** ENF-6.4 — synthèse de fréquentation du back-office : uniquement des compteurs agrégés. */
export interface AudienceDay {
  /** Jour UTC, AAAA-MM-JJ. */
  day: string;
  views: number;
  gamesStarted: number;
  gamesFinished: number;
}

export interface AudienceSummary {
  from: string;
  to: string;
  days: AudienceDay[];
  pages: { path: string; views: number }[];
  categories: { name: string; games: number; finished: number }[];
}
