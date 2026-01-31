import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { format, subDays, addDays } from 'date-fns'
import { Match } from '../lib/types'

const PROLEAGUE_URL = 'https://www.proleague.be/jpl-kalender'
const COMPETITION_NAME = 'Jupiler Pro League'

// Next.js の __NEXT_DATA__ 内の型（試合は module.data.matches のフラット配列）
type NextDataRound = {
  id?: string
  name?: string
  [key: string]: any
}

interface NextDataMatch {
  homeTeam?: { name?: string }
  awayTeam?: { name?: string }
  date?: string
  time?: string
  period?: { type?: string }
}

/** module.data の型（rounds と matches を両方持つ） */
type NextDataModuleData = {
  rounds?: NextDataRound[]
  matches?: NextDataMatch[]
}

function normalizeTeamName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
}

// APIの time は UTC (例: "2026-01-31T15:00:00Z") → JST に変換し、保存用は「JST時刻をUTC形式で保存」
function utcToJstStorage(utcIso: string): string {
  const utcDate = new Date(utcIso)
  const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000)
  return jstDate.toISOString()
}

async function fetchProLeagueMatches(): Promise<Match[]> {
  try {
    console.log('Fetching Pro League data from:', PROLEAGUE_URL)

    const response = await fetch(PROLEAGUE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    )
    if (!nextDataMatch || !nextDataMatch[1]) {
      throw new Error('__NEXT_DATA__ not found in HTML')
    }

    const nextData = JSON.parse(nextDataMatch[1]) as {
      props?: {
        pageProps?: {
          data?: {
            page?: {
              grids?: Array<{
                areas?: Array<{
                  modules?: Array<{
                    data?: NextDataModuleData
                  }>
                }>
              }>
            }
          }
        }
      }
    }

    const moduleData =
      nextData.props?.pageProps?.data?.page?.grids?.[0]?.areas?.[0]?.modules?.[0]
        ?.data
    const rawMatches = (moduleData?.matches ?? []) as NextDataMatch[]
    if (!rawMatches.length) {
      console.warn(
        'No matches in __NEXT_DATA__. module.data keys:',
        Object.keys(moduleData ?? {})
      )
      return []
    }

    const matches: Match[] = []
    for (let i = 0; i < rawMatches.length; i++) {
      const m = rawMatches[i]
      const home = m.homeTeam?.name ?? ''
      const away = m.awayTeam?.name ?? ''
      const timeStr = m.time ?? m.date
      if (!home || !away || !timeStr) continue

      const kickoffJst = utcToJstStorage(timeStr)
      const status =
        m.period?.type === 'FullTime' ? 'FINISHED' : 'TIMED'

      matches.push({
        id: `proleague-${i}-${Date.now()}`,
        api_match_id: `proleague-${i}-${Date.now()}`,
        competition_name: COMPETITION_NAME,
        round: null,
        kickoff_datetime_jst: kickoffJst,
        home_team: normalizeTeamName(home),
        away_team: normalizeTeamName(away),
        has_japanese_player: false,
        status,
      })
    }

    console.log(`Extracted ${matches.length} Pro League matches`)
    return matches
  } catch (error) {
    console.error('Error fetching Pro League data:', error)
    return []
  }
}

async function main() {
  console.log('Starting to fetch Jupiler Pro League match data...')

  const now = new Date()
  const yesterday = subDays(now, 1)
  const dateLimit = addDays(now, 7)

  console.log(
    `Date range: ${format(yesterday, 'yyyy-MM-dd')} to ${format(dateLimit, 'yyyy-MM-dd')}`
  )

  const allMatches = await fetchProLeagueMatches()

  const filteredMatches = allMatches.filter((match) => {
    const matchDate = new Date(match.kickoff_datetime_jst)
    return matchDate >= yesterday && matchDate <= dateLimit
  })

  console.log(
    `Filtered to ${filteredMatches.length} matches in date range`
  )

  if (filteredMatches.length > 0) {
    const dataDir = join(process.cwd(), 'public', 'data')
    mkdirSync(dataDir, { recursive: true })
    const outputPath = join(dataDir, 'matches.proleague.json')
    writeFileSync(
      outputPath,
      JSON.stringify(filteredMatches, null, 2),
      'utf-8'
    )
    console.log(
      `Successfully saved ${filteredMatches.length} Pro League matches to ${outputPath}`
    )
  } else {
    console.warn('No Pro League matches to save in date range')
  }

  console.log('Done!')
}

main().catch(console.error)
