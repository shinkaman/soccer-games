'use client'

import { useState, useEffect, useMemo } from 'react'
import { Match, MatchFilter } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

// リーグ名の日本語表記マッピング
const LEAGUE_NAMES_JA: Record<string, string> = {
  'Premier League': 'プレミアリーグ',
  'UEFA Champions League': 'UEFAチャンピオンズリーグ',
  'Primeira Liga': 'プリメイラリーガ',
  'La Liga': 'ラ・リーガ',
  'Serie A': 'セリエA',
  'Bundesliga': 'ブンデスリーガ',
  'Ligue 1': 'リーグアン',
  'Eredivisie': 'エールディヴィジ',
  'World Cup': 'FIFAワールドカップ',
  'Championship': 'EFLチャンピオンシップ',
  'J.League': 'Jリーグ',
}

// リーグごとの国旗絵文字
const LEAGUE_FLAGS: Record<string, string> = {
  'Premier League': '🇬🇧', // イングランド
  'UEFA Champions League': '🇪🇺', // EU旗（ヨーロッパ）
  'Primeira Liga': '🇵🇹', // ポルトガル
  'La Liga': '🇪🇸', // スペイン
  'Serie A': '🇮🇹', // イタリア
  'Bundesliga': '🇩🇪', // ドイツ
  'Ligue 1': '🇫🇷', // フランス
  'Eredivisie': '🇳🇱', // オランダ
  'World Cup': '🌍', // 地球（世界）
  'Championship': '🇬🇧', // イングランド
  'J.League': '🇯🇵', // 日本
}

// リーグごとの背景色
const LEAGUE_COLORS: Record<string, string> = {
  'Premier League': '#e8f4f8', // 薄い青
  'UEFA Champions League': '#fff4e6', // 薄いオレンジ
  'Primeira Liga': '#e8f5e9', // 薄い緑
  'La Liga': '#fce4ec', // 薄いピンク
  'Serie A': '#f3e5f5', // 薄い紫
  'Bundesliga': '#fff9c4', // 薄い黄
  'Ligue 1': '#e0f2f1', // 薄い青緑
  'Eredivisie': '#fff3e0', // 薄いオレンジ
  'World Cup': '#e1f5fe', // 薄い水色
  'Championship': '#f1f8e9', // 薄い黄緑
  'J.League': '#ffe0e0', // 薄い赤（日本のイメージ）
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<MatchFilter>({
    japaneseOnly: false,
  })

  // リーグ一覧を取得（日本語表記で）
  const competitions = useMemo(() => {
    return Array.from(
      new Set(matches.map(m => m.competition_name))
    ).sort()
  }, [matches])
  
  // フィルタ用のリーグ一覧（日本語表記）
  const competitionsForFilter = useMemo(() => {
    return competitions.map(comp => ({
      original: comp,
      japanese: LEAGUE_NAMES_JA[comp] || comp
    }))
  }, [competitions])

  // フィルタリングされた試合を取得（useMemoで最適化）
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
    try {
      // フィルタが日本語表記の場合は元のリーグ名に変換
      if (filter.competition) {
        const originalName = competitionsForFilter.find(c => c.japanese === filter.competition)?.original
        if (originalName && match.competition_name !== originalName) {
          return false
        } else if (!originalName && match.competition_name !== filter.competition) {
          return false
        }
      }
      if (filter.japaneseOnly && !match.has_japanese_player) {
        return false
      }
      
      // 日付範囲でフィルタ（昨晩終了分から1週間後まで）
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(23, 59, 59, 999)

      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)

      const matchDate = new Date(match.kickoff_datetime_jst)
      if (isNaN(matchDate.getTime())) {
        console.warn('Invalid date in match:', match.id, match.kickoff_datetime_jst)
        return false
      }
      
      if (matchDate < yesterday || matchDate > nextWeek) {
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error filtering match:', match.id, error)
      return false
    }
  })
  }, [matches, filter, competitionsForFilter])

  // データ取得
  useEffect(() => {
    async function fetchMatches() {
      try {
        setLoading(true)
        setError(null)

        // JSONファイルからデータを読み込む
        const response = await fetch('data/matches.json')
        
        if (!response.ok) {
          throw new Error(`Failed to fetch matches: ${response.statusText}`)
        }

        const data: Match[] = await response.json()
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format: expected array')
        }
        
        console.log(`Loaded ${data.length} matches from JSON`)
        
        // 日付でソート
        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a.kickoff_datetime_jst).getTime()
          const dateB = new Date(b.kickoff_datetime_jst).getTime()
          if (isNaN(dateA) || isNaN(dateB)) {
            console.warn('Invalid date found in matches:', a.id, b.id)
          }
          return dateA - dateB
        })

        setMatches(sortedData)
        console.log(`Set ${sortedData.length} matches to state`)
      } catch (err) {
        console.error('Error fetching matches:', err)
        setError('データの取得に失敗しました。データファイルが存在しない可能性があります。')
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [])

  return (
    <div>
      <header className="header">
        <div className="container">
          <h1>サッカー試合日程一覧</h1>
        </div>
      </header>

      <main className="container">
        {error && <div className="error">{error}</div>}

        <div className="filters">
          <div className="filter-group">
            <label htmlFor="competition">リーグ・大会</label>
            <select
              id="competition"
              value={filter.competition || ''}
              onChange={(e) =>
                setFilter({ ...filter, competition: e.target.value || undefined })
              }
            >
              <option value="">すべて</option>
              {competitionsForFilter.map((comp) => (
                <option key={comp.original} value={comp.japanese}>
                  {comp.japanese}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="japaneseOnly"
                checked={filter.japaneseOnly || false}
                onChange={(e) =>
                  setFilter({ ...filter, japaneseOnly: e.target.checked })
                }
              />
              <label htmlFor="japaneseOnly">日本人所属試合のみ</label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">読み込み中...</div>
        ) : filteredMatches.length === 0 ? (
          <div className="no-matches">
            該当する試合が見つかりませんでした
          </div>
        ) : (
          <div className="matches-table">
            <table>
              <thead>
                <tr>
                  <th>LEAGUE</th>
                  <th>KO</th>
                  <th>HOME</th>
                  <th>AWAY</th>
                  <th>JP</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map((match) => {
                  try {
                    const matchDate = parseISO(match.kickoff_datetime_jst)
                    if (isNaN(matchDate.getTime())) {
                      console.error('Invalid date:', match.kickoff_datetime_jst)
                      return null
                    }
                    const dayOfWeek = format(matchDate, 'E', { locale: ja })
                    const day = format(matchDate, 'd')
                    const time = format(matchDate, 'HH:mm')
                    const dateStr = `${day}(${dayOfWeek})${time}`
                    
                    const leagueNameJa = LEAGUE_NAMES_JA[match.competition_name] || match.competition_name
                    const backgroundColor = LEAGUE_COLORS[match.competition_name] || '#ffffff'
                    const flag = LEAGUE_FLAGS[match.competition_name] || '🏳️' // デフォルトは白旗
                    
                    return (
                      <tr 
                        key={match.id}
                        style={{ backgroundColor }}
                      >
                        <td>{flag} {leagueNameJa}</td>
                        <td>{dateStr}</td>
                        <td>{match.home_team}</td>
                        <td>{match.away_team}</td>
                        <td>
                          {match.has_japanese_player && (
                            <span className="japanese-flag" title="日本人所属">
                              🇯🇵
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  } catch (error) {
                    console.error('Error rendering match:', match.id, error)
                    return null
                  }
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
