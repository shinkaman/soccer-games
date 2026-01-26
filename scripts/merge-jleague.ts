import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { Match } from '../lib/types'
import { format, subDays, addDays } from 'date-fns'

// メイン処理
async function main() {
  console.log('Merging J.League data into matches.json...')

  const dataDir = join(process.cwd(), 'public', 'data')
  const matchesPath = join(dataDir, 'matches.json')
  const jleaguePath = join(dataDir, 'matches.jleague.json')

  // matches.jsonを読み込む
  if (!existsSync(matchesPath)) {
    console.error('matches.json not found')
    process.exit(1)
  }

  const matches: Match[] = JSON.parse(readFileSync(matchesPath, 'utf-8'))
  console.log(`Loaded ${matches.length} matches from matches.json`)

  // Jリーグデータを読み込む
  if (!existsSync(jleaguePath)) {
    console.error('matches.jleague.json not found')
    process.exit(1)
  }

  const jleagueData: Match[] = JSON.parse(readFileSync(jleaguePath, 'utf-8'))
  console.log(`Loaded ${jleagueData.length} J.League matches`)

  // 日付範囲を計算
  const now = new Date()
  const yesterday = subDays(now, 1)
  const jleagueDateLimit = addDays(now, 21)

  // Jリーグデータをフィルタ（昨日から21日後まで）
  const filteredJLeague = jleagueData.filter(match => {
    const matchDate = new Date(match.kickoff_datetime_jst)
    return matchDate >= yesterday && matchDate <= jleagueDateLimit
  })

  console.log(`Filtered to ${filteredJLeague.length} J.League matches (date range: ${format(yesterday, 'yyyy-MM-dd')} to ${format(jleagueDateLimit, 'yyyy-MM-dd')})`)

  // 既存のmatchesからJリーグを除外（重複を避けるため）
  const matchesWithoutJLeague = matches.filter(m => m.competition_name !== 'J.League')
  console.log(`Removed ${matches.length - matchesWithoutJLeague.length} existing J.League matches`)

  // Jリーグデータを結合
  const allMatches = [...matchesWithoutJLeague, ...filteredJLeague]

  // 日付でソート
  allMatches.sort((a, b) => 
    new Date(a.kickoff_datetime_jst).getTime() - new Date(b.kickoff_datetime_jst).getTime()
  )

  console.log(`Total matches: ${allMatches.length}`)

  // 保存
  writeFileSync(matchesPath, JSON.stringify(allMatches, null, 2), 'utf-8')
  console.log(`Successfully saved ${allMatches.length} matches to ${matchesPath}`)
  console.log(`J.League matches: ${allMatches.filter(m => m.competition_name === 'J.League').length}`)
}

main().catch(console.error)
