import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import * as cheerio from 'cheerio'
import { format, subDays, addDays } from 'date-fns'
import { Match } from '../lib/types'

const JLEAGUE_URL = 'https://data.j-league.or.jp/SFMS01/search?competition_years=20261&competition_frame_ids=35&competition_ids=707&competition_ids=708&competition_ids=709&tv_relay_station_name='
const COMPETITION_NAME = 'J.League'

// チーム名の正規化（全角/半角、スペースの統一）
function normalizeTeamName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ') // 連続スペースを1つに
    .replace(/[　]/g, ' ') // 全角スペースを半角に
}

// 日付文字列をパース（例: "26/02/06(金)"）
function parseJLeagueDate(dateStr: string, timeStr: string): Date | null {
  try {
    // "26/02/06(金)" から "26/02/06" を抽出
    const datePart = dateStr.split('(')[0].trim()
    if (!datePart || datePart === '未定') {
      return null
    }

    // "26/02/06" をパース（年は20XXとして解釈）
    const parts = datePart.split('/')
    if (parts.length !== 3) {
      return null
    }

    const yearShort = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)

    if (isNaN(yearShort) || isNaN(month) || isNaN(day)) {
      return null
    }

    const year = 2000 + yearShort

    // 時刻をパース（例: "19:00"）
    const timeParts = timeStr.split(':')
    const hour = timeParts.length >= 1 ? parseInt(timeParts[0], 10) : 0
    const minute = timeParts.length >= 2 ? parseInt(timeParts[1], 10) : 0

    if (isNaN(hour) || isNaN(minute)) {
      return null
    }

    // 表示側は「kickoff_datetime_jst の数字をJSTとしてそのまま表示」するため、
    // JSTの日時をそのままISO文字列の数字にする（UTC変換しない）
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute))
    return date
  } catch (error) {
    console.error(`Error parsing date: ${dateStr} ${timeStr}`, error)
    return null
  }
}

// HTMLから試合データを抽出
async function fetchJLeagueMatches(): Promise<Match[]> {
  try {
    console.log('Fetching J.League data from:', JLEAGUE_URL)
    
    const response = await fetch(JLEAGUE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const matches: Match[] = []
    
    // テーブル行を取得（ヘッダー行を除く）
    $('table tbody tr').each((index: number, element: any) => {
      const $row = $(element)
      const cells = $row.find('td').toArray()

      if (cells.length < 8) {
        return // データ行でない場合はスキップ
      }

      try {
        // 列の順序: シーズン, 大会, 節, 試合日, K/O時刻, ホーム, スコア, アウェイ, スタジアム, 入場者数, 中継
        const season = $(cells[0]).text().trim()
        const competition = $(cells[1]).text().trim()
        const round = $(cells[2]).text().trim()
        const matchDateStr = $(cells[3]).text().trim()
        const kickoffTime = $(cells[4]).text().trim()
        const homeTeamLink = $(cells[5]).find('a')
        const homeTeam = homeTeamLink.length > 0 ? homeTeamLink.text().trim() : $(cells[5]).text().trim()
        const score = $(cells[6]).text().trim()
        const awayTeamLink = $(cells[7]).find('a')
        const awayTeam = awayTeamLink.length > 0 ? awayTeamLink.text().trim() : $(cells[7]).text().trim()

        // 日付が未定の場合はスキップ
        if (matchDateStr === '未定' || !kickoffTime || kickoffTime === '-') {
          return
        }

        // 日時をパース
        const kickoffDate = parseJLeagueDate(matchDateStr, kickoffTime)
        if (!kickoffDate) {
          return
        }

        // 正規化
        const normalizedHome = normalizeTeamName(homeTeam)
        const normalizedAway = normalizeTeamName(awayTeam)

        // Match型に変換
        const match: Match = {
          id: `jleague-${index}-${kickoffDate.getTime()}`,
          api_match_id: `jleague-${index}-${kickoffDate.getTime()}`,
          competition_name: COMPETITION_NAME,
          round: round || null,
          kickoff_datetime_jst: kickoffDate.toISOString(),
          home_team: normalizedHome,
          away_team: normalizedAway,
          has_japanese_player: true, // Jリーグは全チーム日本人所属
          status: score && score !== '-' ? 'FINISHED' : 'TIMED',
        }

        matches.push(match)
      } catch (error) {
        console.error(`Error parsing row ${index}:`, error)
      }
    })

    console.log(`Extracted ${matches.length} J.League matches`)
    return matches
  } catch (error) {
    console.error('Error fetching J.League data:', error)
    return []
  }
}

// メイン処理
async function main() {
  console.log('Starting to fetch J.League match data...')

  // 日付範囲を計算（昨日から1週間後まで）
  const now = new Date()
  const yesterday = subDays(now, 1)
  const dateLimit = addDays(now, 7)

  console.log(`Date range: ${format(yesterday, 'yyyy-MM-dd')} to ${format(dateLimit, 'yyyy-MM-dd')}`)

  // Jリーグデータを取得
  const allMatches = await fetchJLeagueMatches()

  // 日付範囲でフィルタ
  const filteredMatches = allMatches.filter(match => {
    const matchDate = new Date(match.kickoff_datetime_jst)
    return matchDate >= yesterday && matchDate <= dateLimit
  })

  console.log(`Filtered to ${filteredMatches.length} matches in date range`)

  // JSONファイルに保存
  if (filteredMatches.length > 0) {
    const dataDir = join(process.cwd(), 'public', 'data')
    mkdirSync(dataDir, { recursive: true })

    const outputPath = join(dataDir, 'matches.jleague.json')
    writeFileSync(outputPath, JSON.stringify(filteredMatches, null, 2), 'utf-8')
    console.log(`Successfully saved ${filteredMatches.length} J.League matches to ${outputPath}`)
  } else {
    console.warn('No J.League matches to save')
  }

  console.log('Done!')
}

main().catch(console.error)
