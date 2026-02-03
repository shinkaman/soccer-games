import { loadEnvConfig } from '@next/env'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { format, subDays, addDays } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import { JAPANESE_TEAMS } from '../lib/japanese-teams'
import { Match } from '../lib/types'

console.log('RUNNING FILE:', __filename)

// football-data.org の設定
loadEnvConfig(process.cwd(), true)
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY
const API_BASE_URL = 'https://api.football-data.org/v4'

// football-data.org Freeプランで取得可能なリーグのID
const LEAGUE_IDS: Record<string, number> = {
  'UEFA Champions League': 2001,
  'Primeira Liga': 2017,
  'Premier League': 2021,
  'Eredivisie': 2003,
  'Bundesliga': 2002,
  'Ligue 1': 2015,
  'Serie A': 2019,
  'La Liga': 2014,
  'Championship': 2016,
  'World Cup': 2000,
}

// 日本時間（JST）のタイムゾーン
const JST = 'Asia/Tokyo'

interface FootballDataMatch {
  id: number
  utcDate: string
  status: string
  matchday: number | null
  homeTeam: {
    id: number
    name: string
  }
  awayTeam: {
    id: number
    name: string
  }
}

interface FootballDataResponse {
  matches: FootballDataMatch[]
}

// Match型はlib/types.tsからインポート

// APIから試合データを取得
async function fetchFixturesFromAPI(competitionId: number, dateFrom: string, dateTo: string): Promise<FootballDataMatch[]> {
  if (!FOOTBALL_DATA_KEY) {
    console.error('FOOTBALL_DATA_KEY is not set')
    return []
  }

  const url = `${API_BASE_URL}/competitions/${competitionId}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': FOOTBALL_DATA_KEY,
      },
    })

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`Rate limit reached for competition ${competitionId}, waiting...`)
        await new Promise(resolve => setTimeout(resolve, 60000)) // 1分待機
        return []
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data: FootballDataResponse = await response.json()
    
    return data.matches || []
  } catch (error) {
    console.error(`Error fetching fixtures for competition ${competitionId}:`, error)
    return []
  }
}

// チームに日本人選手がいるかチェック（JAPANESE_TEAMS ベース・同期）
function hasJapanesePlayerByTeamName(teamName: string, competitionName: string): boolean {
  const knownTeams = JAPANESE_TEAMS[competitionName] || []
  if (knownTeams.some(team => teamName.includes(team) || team.includes(teamName))) {
    return true
  }
  if (teamName.includes('Japan') || teamName.includes('日本')) {
    return true
  }
  return false
}

// チームに日本人選手がいるかチェック（API用・非同期）
async function checkJapanesePlayers(teamId: number, teamName: string, competitionName: string): Promise<boolean> {
  return hasJapanesePlayerByTeamName(teamName, competitionName)
}

// APIのUTC日時をJSTに変換し、「JSTの数字をISO形式で保存」（表示側の前提に合わせる）
function convertToJST(utcDate: string): string {
  const date = new Date(utcDate)
  const jstDate = utcToZonedTime(date, JST)
  return format(jstDate, "yyyy-MM-dd'T'HH:mm:ss.SSS") + 'Z'
}

// メイン処理
async function main() {
  console.log('Starting to fetch match data...')

  // 環境変数のチェック
  if (!FOOTBALL_DATA_KEY) {
    console.error('FOOTBALL_DATA_KEY is not set. Please set it in your environment variables.')
    process.exit(1)
  }

  // 日付範囲を計算（昨晩終了分から1週間後まで）
  const now = new Date()
  const yesterday = subDays(now, 1)
  const nextWeek = addDays(now, 7)

  const dateFrom = format(yesterday, 'yyyy-MM-dd')
  const dateTo = format(nextWeek, 'yyyy-MM-dd')

  console.log(`Fetching matches from ${dateFrom} to ${dateTo}`)

  const allMatches: Match[] = []

  // 各リーグのデータを取得
  for (const [leagueName, competitionId] of Object.entries(LEAGUE_IDS)) {
    try {
      console.log(`Fetching ${leagueName}...`)
      const matches = await fetchFixturesFromAPI(competitionId, dateFrom, dateTo)
      
      if (matches.length === 0) {
        console.log(`No matches found for ${leagueName}`)
        continue
      }

      console.log(`Found ${matches.length} matches for ${leagueName}`)
      
      for (const match of matches) {
        try {
          const kickoffJST = convertToJST(match.utcDate)
          
          // 日本人所属チェック
          const homeHasJapanese = await checkJapanesePlayers(
            match.homeTeam.id,
            match.homeTeam.name,
            leagueName
          )
          const awayHasJapanese = await checkJapanesePlayers(
            match.awayTeam.id,
            match.awayTeam.name,
            leagueName
          )
          const hasJapanese = homeHasJapanese || awayHasJapanese

          allMatches.push({
            id: match.id.toString(),
            api_match_id: match.id.toString(),
            competition_name: leagueName,
            competition_id: competitionId.toString(),
            round: match.matchday ? `第${match.matchday}節` : null,
            kickoff_datetime_jst: kickoffJST,
            home_team: match.homeTeam.name,
            away_team: match.awayTeam.name,
            home_team_id: match.homeTeam.id.toString(),
            away_team_id: match.awayTeam.id.toString(),
            has_japanese_player: hasJapanese,
            status: match.status,
          })
        } catch (error) {
          console.error(`Error processing match ${match.id}:`, error)
        }
      }

      // API制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Error fetching ${leagueName}:`, error)
      continue
    }
  }

  console.log(`Fetched ${allMatches.length} matches from football-data.org`)

  // Jリーグデータを読み込んで結合
  const jleaguePath = join(process.cwd(), 'public', 'data', 'matches.jleague.json')
  if (existsSync(jleaguePath)) {
    try {
      const jleagueData = JSON.parse(readFileSync(jleaguePath, 'utf-8')) as Match[]
      
      // Jリーグも1週間後まで表示（欧州リーグと同様）
      // 日付範囲でフィルタ（昨日から1週間後まで）
      const filteredJLeague = jleagueData.filter(match => {
        const matchDate = new Date(match.kickoff_datetime_jst)
        return matchDate >= yesterday && matchDate <= nextWeek
      })

      console.log(`Loaded ${filteredJLeague.length} J.League matches (filtered from ${jleagueData.length}, date range: ${format(yesterday, 'yyyy-MM-dd')} to ${format(nextWeek, 'yyyy-MM-dd')})`)
      allMatches.push(...filteredJLeague)
    } catch (error) {
      console.error('Error loading J.League data:', error)
    }
  } else {
    console.log('J.League data file not found, skipping...')
  }

  // ジュピラー・プロリーグ（ベルギー）データを読み込んで結合
  const proleaguePath = join(process.cwd(), 'public', 'data', 'matches.proleague.json')
  const COMPETITION_PROLEAGUE = 'Jupiler Pro League'
  if (existsSync(proleaguePath)) {
    try {
      const proleagueData = JSON.parse(readFileSync(proleaguePath, 'utf-8')) as Match[]
      const filteredProLeague = proleagueData
        .filter(match => {
          const matchDate = new Date(match.kickoff_datetime_jst)
          return matchDate >= yesterday && matchDate <= nextWeek
        })
        .map(match => {
          const homeHasJapanese = hasJapanesePlayerByTeamName(match.home_team, COMPETITION_PROLEAGUE)
          const awayHasJapanese = hasJapanesePlayerByTeamName(match.away_team, COMPETITION_PROLEAGUE)
          return { ...match, has_japanese_player: homeHasJapanese || awayHasJapanese }
        })
      console.log(`Loaded ${filteredProLeague.length} Jupiler Pro League matches (filtered from ${proleagueData.length})`)
      allMatches.push(...filteredProLeague)
    } catch (error) {
      console.error('Error loading Jupiler Pro League data:', error)
    }
  } else {
    console.log('Jupiler Pro League data file not found, skipping...')
  }

  // 日付でソート
  allMatches.sort((a, b) => 
    new Date(a.kickoff_datetime_jst).getTime() - new Date(b.kickoff_datetime_jst).getTime()
  )

  console.log(`Total matches: ${allMatches.length}`)

  // JSONファイルに保存
  if (allMatches.length > 0) {
    // public/dataディレクトリを作成
    const dataDir = join(process.cwd(), 'public', 'data')
    mkdirSync(dataDir, { recursive: true })

    // matches.jsonに保存
    const outputPath = join(dataDir, 'matches.json')
    writeFileSync(outputPath, JSON.stringify(allMatches, null, 2), 'utf-8')
    console.log(`Successfully saved ${allMatches.length} matches to ${outputPath}`)
  } else {
    console.warn('No matches to save')
  }

  console.log('Done!')
}

main().catch(console.error)
