import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import * as cheerio from 'cheerio'
import { Match } from '../lib/types'

// ACL（Elite / Two）: Jリーグ公式サイト（日本のクラブが出場する試合のみ掲載）
const JLEAGUE_CUPS = [
  { name: 'ACL Elite', url: 'https://www.jleague.jp/acle/match/' },
  { name: 'ACL Two', url: 'https://www.jleague.jp/acl2/match/' },
]

// Jリーグカップ（ルヴァンカップ）: Jリーグデータサイト（competition_frame_ids=11）。公式サイトより未来の試合の時刻が早く出る
const LEAGUE_CUP_NAME = 'J.League Cup'
const LEAGUE_CUP_URL = 'https://data.j-league.or.jp/SFMS01/search?competition_years=2026&competition_frame_ids=11&tv_relay_station_name='

// ACLの西地区: Jリーグ公式には日本クラブの出ない西地区が載っていないため、ESPNの公開APIで補う（日付ごとに取得）
const ESPN_ACL = [
  { name: 'ACL Elite', slug: 'afc.champions' },
  { name: 'ACL Two', slug: 'afc.cup' },
]
const ESPN_DAYS_BEFORE = 1
const ESPN_DAYS_AFTER = 14

// 天皇杯: JFA公式サイトの日程JSON
const EMPERORS_CUP_NAME = "Emperor's Cup"
const EMPERORS_CUP_URL = 'https://www.jfa.jp/match/emperorscup_2026/match/schedule.json'

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }

// 全角英数字を半角に、スペースを統一（例: "Ｇ大阪" → "G大阪"）
function normalizeTeamName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ')
}

// 「JSTの数字をそのままISO文字列にする」（表示側の前提に合わせる）
function toJstStorage(y: number, mo: number, d: number, h: number, mi: number): string {
  return new Date(Date.UTC(y, mo - 1, d, h, mi)).toISOString()
}

// Jリーグデータサイトのチーム選択肢からJ1〜J3のクラブ名（略称）一覧を取得（ACLの日本人所属判定用）
async function fetchJClubNames(): Promise<Set<string>> {
  const response = await fetch('https://data.j-league.or.jp/SFMS01/', { headers: HEADERS })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  const $ = cheerio.load(await response.text())
  const names = $('select[name="team_ids"] option')
    .toArray()
    .map(el => normalizeTeamName($(el).text()))
    .filter(Boolean)
  if (names.length === 0) throw new Error('J club list is empty')
  return new Set(names)
}

async function fetchJLeagueCup(name: string, url: string, jClubs: Set<string>): Promise<Match[]> {
  const response = await fetch(url, { headers: HEADERS })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  const $ = cheerio.load(await response.text())
  const matches: Match[] = []

  $('.p-game-schedule__group').each((_, group) => {
    const round = $(group).find('.m-section-header__h2-eyebrow--logo-text-container-sp span').first().text().trim()
    $(group).find('.m-schedule').each((_, el) => {
      const $m = $(el)
      const id = $m.attr('id') || '' // 例: 2026091503（日付8桁 + 連番）
      // 終了済みは status-time（"19:00 KO"）、未開催は time-text（"19:00"）に時刻が入る
      const time = $m.find('.m-schedule__status-time, .m-schedule__time-text').first().text().match(/(\d{1,2}):(\d{2})/)
      if (!/^\d{10}$/.test(id) || !time) return // 時刻未定はスキップ

      const home = $m.find('.m-schedule__team-home [data-media="sp"]').text()
      const away = $m.find('.m-schedule__team-away [data-media="sp"]').text()
      const scores = $m.find('.m-schedule__score').length // 終了済みのみ2つ（ホーム・アウェイ）
      const matchId = `${name.toLowerCase().replace(/\W+/g, '')}-${id}`

      matches.push({
        id: matchId,
        api_match_id: matchId,
        competition_name: name,
        round: round || null,
        kickoff_datetime_jst: toJstStorage(
          +id.slice(0, 4), +id.slice(4, 6), +id.slice(6, 8), +time[1], +time[2]
        ),
        home_team: normalizeTeamName(home),
        away_team: normalizeTeamName(away),
        // Jリーグのクラブが出場する試合のみ日本人所属とする
        has_japanese_player: jClubs.has(normalizeTeamName(home)) || jClubs.has(normalizeTeamName(away)),
        status: scores >= 2 ? 'FINISHED' : 'TIMED',
      })
    })
  })

  console.log(`Extracted ${matches.length} ${name} matches`)
  return matches
}

async function fetchLeagueCup(): Promise<Match[]> {
  const response = await fetch(LEAGUE_CUP_URL, { headers: HEADERS })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  const $ = cheerio.load(await response.text())
  const matches: Match[] = []

  $('table tbody tr').each((index, row) => {
    const cells = $(row).find('td').toArray()
    if (cells.length < 8) return
    const text = (i: number) => $(cells[i]).text().trim()

    // 列: シーズン, 大会, 節, 試合日(例: 26/09/02(水)), K/O時刻, ホーム, スコア, アウェイ
    const date = /^(\d{2})\/(\d{2})\/(\d{2})/.exec(text(3))
    const time = /(\d{1,2}):(\d{2})/.exec(text(4))
    if (!date || !time) return

    const matchId = `leaguecup-${index}-${date[1]}${date[2]}${date[3]}`
    matches.push({
      id: matchId,
      api_match_id: matchId,
      competition_name: LEAGUE_CUP_NAME,
      round: `${text(1).replace(/^ルヴァンカップ\s*/, '')} ${text(2)}`.trim(),
      kickoff_datetime_jst: toJstStorage(2000 + +date[1], +date[2], +date[3], +time[1], +time[2]),
      home_team: normalizeTeamName(text(5)),
      away_team: normalizeTeamName(text(7)),
      has_japanese_player: true,
      status: /\d+\s*-\s*\d+/.test(text(6)) ? 'FINISHED' : 'TIMED',
    })
  })

  console.log(`Extracted ${matches.length} ${LEAGUE_CUP_NAME} matches`)
  return matches
}

async function fetchEspnWestAcl(name: string, slug: string): Promise<Match[]> {
  const matches: Match[] = []
  const now = new Date()

  for (let offset = -ESPN_DAYS_BEFORE; offset <= ESPN_DAYS_AFTER; offset++) {
    const day = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000)
    const ymd = day.toISOString().slice(0, 10).replace(/-/g, '')
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${ymd}`
    const response = await fetch(url, { headers: HEADERS })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status} (${url})`)
    const data = await response.json()

    for (const event of data.events || []) {
      const competition = event.competitions?.[0]
      if (competition?.group?.name !== 'West Region') continue // 東地区はJリーグ公式から取得

      const home = competition.competitors.find((c: any) => c.homeAway === 'home')
      const away = competition.competitors.find((c: any) => c.homeAway === 'away')
      if (!home || !away) continue

      const matchId = `${name.toLowerCase().replace(/\W+/g, '')}-espn-${event.id}`
      matches.push({
        id: matchId,
        api_match_id: matchId,
        competition_name: name,
        round: event.season?.slug === 'league-stage' ? 'リーグステージ 西地区' : `${event.season?.slug || ''} 西地区`.trim(),
        // ESPNはUTC → JSTの数字をそのまま保存
        kickoff_datetime_jst: new Date(new Date(event.date).getTime() + 9 * 60 * 60 * 1000).toISOString(),
        home_team: normalizeTeamName(home.team.displayName),
        away_team: normalizeTeamName(away.team.displayName),
        has_japanese_player: false, // 西地区には日本人所属チームなし
        status: competition.status?.type?.state === 'post' ? 'FINISHED' : 'TIMED',
      })
    }
  }

  console.log(`Extracted ${matches.length} ${name} West Region matches (ESPN)`)
  return matches
}

async function fetchEmperorsCup(): Promise<Match[]> {
  const response = await fetch(EMPERORS_CUP_URL, { headers: HEADERS })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  const data = await response.json()
  const matches: Match[] = []

  for (const m of data.matchScheduleList.matchSchedule) {
    // 日時未定（"未定"）や、対戦相手が未確定（"No.85の勝者"）の試合はスキップ
    const date = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(m.matchDate)
    const time = /^(\d{1,2}):(\d{2})$/.exec(m.matchTime)
    if (!date || !time || /^No\.\d+/.test(m.homeTeamName) || /^No\.\d+/.test(m.awayTeamName)) continue

    const matchId = `emperorscup-${m.matchNumber}`
    matches.push({
      id: matchId,
      api_match_id: matchId,
      competition_name: EMPERORS_CUP_NAME,
      round: m.matchTypeName,
      kickoff_datetime_jst: toJstStorage(+date[1], +date[2], +date[3], +time[1], +time[2]),
      home_team: normalizeTeamName(m.homeTeamName),
      away_team: normalizeTeamName(m.awayTeamName),
      has_japanese_player: true,
      status: m.matchStatus === '試合終了' || m.score?.homeScore !== '' ? 'FINISHED' : 'TIMED',
    })
  }

  console.log(`Extracted ${matches.length} ${EMPERORS_CUP_NAME} matches`)
  return matches
}

async function main() {
  console.log('Starting to fetch Japanese cup match data...')
  const all: Match[] = []

  let jClubs = new Set<string>()
  try {
    jClubs = await fetchJClubNames()
  } catch (error) {
    console.error('Error fetching J club names (ACL matches will not be flagged):', error)
  }

  for (const cup of JLEAGUE_CUPS) {
    try {
      all.push(...(await fetchJLeagueCup(cup.name, cup.url, jClubs)))
    } catch (error) {
      console.error(`Error fetching ${cup.name}:`, error)
    }
  }
  for (const acl of ESPN_ACL) {
    try {
      all.push(...(await fetchEspnWestAcl(acl.name, acl.slug)))
    } catch (error) {
      console.error(`Error fetching ${acl.name} West Region:`, error)
    }
  }
  try {
    all.push(...(await fetchLeagueCup()))
  } catch (error) {
    console.error(`Error fetching ${LEAGUE_CUP_NAME}:`, error)
  }
  try {
    all.push(...(await fetchEmperorsCup()))
  } catch (error) {
    console.error(`Error fetching ${EMPERORS_CUP_NAME}:`, error)
  }

  if (all.length === 0) {
    console.warn('No cup matches to save')
    return
  }

  const dataDir = join(process.cwd(), 'public', 'data')
  mkdirSync(dataDir, { recursive: true })
  const outputPath = join(dataDir, 'matches.japancups.json')
  writeFileSync(outputPath, JSON.stringify(all, null, 2), 'utf-8')
  console.log(`Successfully saved ${all.length} cup matches to ${outputPath}`)
}

main().catch(console.error)
