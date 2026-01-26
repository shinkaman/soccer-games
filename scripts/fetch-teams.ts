import { loadEnvConfig } from '@next/env'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// 環境変数の読み込み
loadEnvConfig(process.cwd(), true)
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY || process.env.FOOTBALL_DATA_API_KEY
const API_BASE_URL = 'https://api.football-data.org/v4'

// football-data.org Freeプランで取得可能なリーグのコード
const LEAGUE_CODES: Record<string, string> = {
  'UEFA Champions League': 'CL',
  'Primeira Liga': 'PPL',
  'Premier League': 'PL',
  'Eredivisie': 'DED',
  'Bundesliga': 'BL1',
  'Ligue 1': 'FL1',
  'Serie A': 'SA',
  'La Liga': 'PD',
  'Championship': 'ELC',
  'World Cup': 'WC',
}

interface Team {
  id: number
  name: string
  shortName: string
  tla: string
  crest: string
}

interface TeamsResponse {
  teams: Team[]
}

// APIからチーム一覧を取得
async function fetchTeamsFromAPI(competitionCode: string): Promise<Team[]> {
  if (!FOOTBALL_DATA_KEY) {
    console.error('FOOTBALL_DATA_KEY or FOOTBALL_DATA_API_KEY is not set')
    return []
  }

  const url = `${API_BASE_URL}/competitions/${competitionCode}/teams`
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': FOOTBALL_DATA_KEY,
      },
    })

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`Rate limit reached for competition ${competitionCode}, waiting...`)
        await new Promise(resolve => setTimeout(resolve, 60000)) // 1分待機
        return []
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data: TeamsResponse = await response.json()
    
    return data.teams || []
  } catch (error) {
    console.error(`Error fetching teams for competition ${competitionCode}:`, error)
    return []
  }
}

// メイン処理
async function main() {
  console.log('Starting to fetch team data...')

  // 環境変数のチェック
  if (!FOOTBALL_DATA_KEY) {
    console.error('FOOTBALL_DATA_KEY or FOOTBALL_DATA_API_KEY is not set. Please set it in your environment variables.')
    process.exit(1)
  }

  // public/data/teamsディレクトリを作成
  const teamsDir = join(process.cwd(), 'public', 'data', 'teams')
  mkdirSync(teamsDir, { recursive: true })

  // 各リーグのチームデータを取得
  for (const [leagueName, code] of Object.entries(LEAGUE_CODES)) {
    try {
      console.log(`Fetching teams for ${leagueName} (${code})...`)
      const teams = await fetchTeamsFromAPI(code)
      
      if (teams.length === 0) {
        console.log(`No teams found for ${leagueName}`)
        continue
      }

      console.log(`Found ${teams.length} teams for ${leagueName}`)
      
      // JSONファイルに保存
      const outputPath = join(teamsDir, `${code}.json`)
      writeFileSync(outputPath, JSON.stringify(teams, null, 2), 'utf-8')
      console.log(`Successfully saved teams to ${outputPath}`)

      // API制限を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Error fetching ${leagueName}:`, error)
      continue
    }
  }

  console.log('Done!')
}

main().catch(console.error)
