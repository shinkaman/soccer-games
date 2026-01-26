export interface Match {
  id: string
  api_match_id: string
  competition_name: string
  competition_id?: string
  round?: string | null
  kickoff_datetime_jst: string
  home_team: string
  away_team: string
  home_team_id?: string
  away_team_id?: string
  has_japanese_player: boolean
  status?: string
}

export interface MatchFilter {
  competition?: string
  japaneseOnly?: boolean
  startDate?: string
  endDate?: string
}
