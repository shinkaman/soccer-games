'use client'

import { useState, useEffect, useMemo } from 'react'
import { Match } from '@/lib/types'
import { format, parseISO } from 'date-fns'

// チーム名の日本語表記マッピング
const TEAM_NAMES_JA: Record<string, string> = {
  // Premier League
  'Arsenal FC': 'アーセナル',
  'Brighton & Hove Albion FC': 'ブライトン',
  'Liverpool FC': 'リバプール',
  'Tottenham Hotspur FC': 'トッテナム',
  'Fulham FC': 'フルハム',
  'Manchester United FC': 'マンチェスター・ユナイテッド',
  'Manchester City FC': 'マンチェスター・シティ',
  'Chelsea FC': 'チェルシー',
  'Newcastle United FC': 'ニューカッスル',
  'West Ham United FC': 'ウェストハム',
  'Aston Villa FC': 'アストン・ヴィラ',
  'Crystal Palace FC': 'クリスタル・パレス',
  'Everton FC': 'エバートン',
  'Leicester City FC': 'レスター',
  'Wolverhampton Wanderers FC': 'ウルバーハンプトン',
  'Leeds United FC': 'リーズ',
  'Southampton FC': 'サウサンプトン',
  'Burnley FC': 'バーンリー',
  'Watford FC': 'ワトフォード',
  'Norwich City FC': 'ノリッジ',
  'Brentford FC': 'ブレントフォード',
  'Nottingham Forest FC': 'ノッティンガム',
  'Bournemouth AFC': 'ボーンマス',
  'Sheffield United FC': 'シェフィールド・ユナイテッド',
  'Luton Town FC': 'ルートン',
  'Ipswich Town FC': 'イプスウィッチ',
  
  // La Liga
  'Real Madrid CF': 'レアル・マドリード',
  'FC Barcelona': 'バルセロナ',
  'Club Atlético de Madrid': 'アトレティコ・マドリード',
  'Atletico Madrid': 'アトレティコ・マドリード',
  'Real Sociedad': 'レアル・ソシエダ',
  'Real Sociedad de Fútbol': 'ソシエダ',
  'Sevilla FC': 'セビリア',
  'Real Betis Balompie': 'ベティス',
  'Villarreal CF': 'ビジャレアル',
  'Valencia CF': 'バレンシア',
  'Athletic Club': 'アスレティック・ビルバオ',
  'CA Osasuna': 'オサスナ',
  'Getafe CF': 'ヘタフェ',
  'Rayo Vallecano': 'ラージョ・バジェカーノ',
  'Girona FC': 'ジローナ',
  'UD Las Palmas': 'ラス・パルマス',
  'RC Celta de Vigo': 'セルタ',
  'Real Valladolid CF': 'バジャドリード',
  'RCD Espanyol': 'エスパニョール',
  'Granada CF': 'グラナダ',
  'UD Almeria': 'アルメリア',
  'Cadiz CF': 'カディス',
  'Deportivo Alaves': 'アラベス',
  'Mallorca': 'マジョルカ',
  
  // Serie A
  'Juventus FC': 'ユベントス',
  'AC Milan': 'ACミラン',
  'FC Internazionale Milano': 'インテル',
  'Inter Milan': 'インテル',
  'AS Roma': 'ASローマ',
  'SS Lazio': 'ラツィオ',
  'SSC Napoli': 'ナポリ',
  'Atalanta BC': 'アタランタ',
  'ACF Fiorentina': 'フィオレンティーナ',
  'US Sassuolo Calcio': 'サッスオーロ',
  'Udinese Calcio': 'ウディネーゼ',
  'Torino FC': 'トリノ',
  'Bologna FC 1909': 'ボローニャ',
  'US Cremonese': 'クレモネーゼ',
  'Hellas Verona FC': 'ヴェローナ',
  'Empoli FC': 'エンポリ',
  'US Lecce': 'レッチェ',
  'Spezia Calcio': 'スペツィア',
  'Salernitana': 'サレルニターナ',
  'AC Monza': 'モンツァ',
  'Genoa CFC': 'ジェノア',
  'Cagliari Calcio': 'カリアリ',
  'Frosinone Calcio': 'フロジノーネ',
  'Parma Calcio 1913': 'パルマ',
  'AC Pisa 1909': 'ピサ1909',
  'Como 1907': 'コモ1907',
  
  // Bundesliga
  'Borussia Dortmund': 'ドルトムント',
  'Eintracht Frankfurt': 'フランクフルト',
  'VfB Stuttgart': 'シュトゥットガルト',
  'VfL Bochum': 'ボーフム',
  'FC Bayern München': 'バイエルン・ミュンヘン',
  'RB Leipzig': 'RBライプツィヒ',
  'Bayer 04 Leverkusen': 'レバークーゼン',
  '1. FC Union Berlin': 'ウニオン・ベルリン',
  'SC Freiburg': 'フライブルク',
  '1. FC Köln': 'ケルン',
  'TSG 1899 Hoffenheim': 'ホッフェンハイム',
  'VfL Wolfsburg': 'ヴォルフスブルク',
  'Borussia Mönchengladbach': 'ボルシアMG',
  'SV Werder Bremen': 'ブレーメン',
  '1. FSV Mainz 05': 'マインツ',
  'FC Augsburg': 'アウクスブルク',
  'VfL Bochum 1848': 'ボーフム',
  '1. FC Heidenheim 1846': 'ハイデンハイム',
  'SV Darmstadt 98': 'ダルムシュタット',
  'FC St. Pauli 1910': 'ザンクトパウリ',
  'Hamburger SV': 'ハンブルグ',
  
  // Ligue 1
  'AS Monaco': 'モナコ',
  'AS Monaco FC': 'モナコ',
  'Stade de Reims': 'ランス',
  'Paris Saint-Germain FC': 'パリ・サンジェルマン',
  'Olympique Marseille': 'マルセイユ',
  'Olympique Lyonnais': 'リヨン',
  'Olympique de Marseille': 'マルセイユ',
  'Racing Club de Lens': 'ランス',
  'RC Lens': 'ランス',
  'OGC Nice': 'ニース',
  'LOSC Lille': 'リール',
  'Lille OSC': 'リール',
  'Stade Rennais FC': 'レンヌ',
  'Stade Rennais FC 1901': 'レンヌ',
  'FC Nantes': 'ナント',
  'Toulouse FC': 'トゥールーズ',
  'Montpellier HSC': 'モンペリエ',
  'FC Lorient': 'ロリアン',
  'Clermont Foot 63': 'クレルモン',
  'RC Strasbourg Alsace': 'ストラスブール',
  'FC Metz': 'メス',
  'Le Havre AC': 'ル・アーヴル',
  
  // Eredivisie
  'AZ': 'AZ',
  'Ajax Amsterdam': 'アヤックス',
  'AFC Ajax': 'アヤックス',
  'PSV Eindhoven': 'PSV',
  'PSV': 'PSV',
  'Feyenoord Rotterdam': 'フェイエノールト',
  'FC Twente': 'トゥウェンテ',
  'FC Twente \'65': 'トゥウェンテ',
  'SC Heerenveen': 'ヘーレンフェーン',
  'Vitesse Arnhem': 'フィテッセ',
  'FC Utrecht': 'ユトレヒト',
  'Sparta Rotterdam': 'スパルタ・ロッテルダム',
  'Heracles Almelo': 'ヘラクレス',
  'NEC Nijmegen': 'NEC',
  'NEC': 'NEC',
  'Fortuna Sittard': 'フォルトゥナ',
  'Go Ahead Eagles': 'ゴー・アヘッド',
  'RKC Waalwijk': 'RKC',
  'FC Volendam': 'フォレンダム',
  'Excelsior Rotterdam': 'エクセルシオール',
  'SBV Excelsior': 'エクセルシオール',
  'PEC Zwolle': 'ズヴォレ',
  'Almere City FC': 'アルメレ',
  'FC Groningen': 'フローニンゲン',
  'NAC Breda': 'NAC',
  
  // Primeira Liga
  'FC Porto': 'ポルト',
  'SL Benfica': 'ベンフィカ',
  'Sporting CP': 'スポルティング',
  'SC Braga': 'ブラガ',
  'Vitória SC': 'ヴィトーリア',
  'FC Famalicão': 'ファマリカン',
  'Rio Ave FC': 'リオ・アヴェ',
  'CD Santa Clara': 'サンタ・クララ',
  'Gil Vicente FC': 'ジル・ヴィセンテ',
  'FC Vizela': 'ヴィゼラ',
  'Boavista FC': 'ボアヴィスタ',
  'Portimonense SC': 'ポルティモネンセ',
  'Casa Pia AC': 'カサ・ピア',
  'GD Estoril Praia': 'エストリル',
  'FC Arouca': 'アロウカ',
  'CD Tondela': 'トンデラ',
  'Moreirense FC': 'モレイレンセ',
  'Farense': 'ファレンセ',
  
  // Championship
  'West Bromwich Albion FC': 'WBA',
  'Hull City AFC': 'ハル',
  'Coventry City FC': 'コヴェントリー',
  'Middlesbrough FC': 'ミドルズブラ',
  'Preston North End FC': 'プレストン',
  'Cardiff City FC': 'カーディフ',
  'Bristol City FC': 'ブリストル・シティ',
  'Sunderland AFC': 'サンダーランド',
  'Swansea City AFC': 'スウォンジー',
  'Millwall FC': 'ミルウォール',
  'Blackburn Rovers FC': 'ブラックバーン',
  'Plymouth Argyle FC': 'プリマス',
  'Birmingham City FC': 'バーミンガム',
  'Huddersfield Town AFC': 'ハダースフィールド',
  'Sheffield Wednesday FC': 'シェフィールド・ウェンズデイ',
  'Stoke City FC': 'ストーク',
  'Queens Park Rangers FC': 'QPR',
  'Rotherham United FC': 'ロザラム',
  'Portsmouth FC': 'ポーツマス',
  'Derby County FC': 'ダービー',
  'Oxford United FC': 'オックスフォードU',
  'Charlton Athletic FC': 'チャールトン・アスレティック',
  'Wrexham AFC': 'ウェクスハム',
  
  // World Cup
  'Japan': '日本',
  
  // その他のチーム（UEFA Champions League、その他）
  'Qarabağ Ağdam FK': 'カラバフ',
  'FC København': 'コペンハーゲン',
  'Galatasaray SK': 'ガラタサライ',
  'FK Kairat': 'カイラト',
  'Royale Union Saint-Gilloise': 'ユニオン',
  'Club Brugge KV': 'クラブブルッヘ',
  'FK Bodø/Glimt': 'ボデ・グリムト',
  'Sporting Clube de Portugal': 'スポルティング',
  'PAE Olympiakos SFP': 'オリンピアコス',
  'Paphos FC': 'パフォス',
  'SK Slavia Praha': 'スラヴィア・プラハ',
  'Real Oviedo': 'オビエド',
  'RCD Mallorca': 'マジョルカ',
  'RCD Espanyol de Barcelona': 'エスパニョール',
  'Elche CF': 'エルチェ',
  'Levante UD': 'レバンテ',
  'Rayo Vallecano de Madrid': 'ラヨ・バレカノ・マドリード',
  'Real Betis Balompié': 'ベティス',
  'Deportivo Alavés': 'アラベス',
  'Sport Lisboa e Benfica': 'ベンフィカ',
  'Sporting Clube de Braga': 'ブラガ',
  'FC Alverca': 'アルベルカ',
  'CF Estrela da Amadora': 'エストレラ・ダ・アマドラ',
  'CD Nacional': 'ナシオナル',
  'Paris FC': 'パリFC',
  'Angers SCO': 'アンジェー',
  'Stade Brestois 29': 'ブレスト29',
  'AFC Bournemouth': 'ボーンマウス',
  'AVS': 'AVS',
  'Telstar 1963': 'テルスター1963',
  
  // J.League (一般的な表記)
  'FC東京': 'FC東京',
  '川崎フロンターレ': '川崎',
  '横浜F・マリノス': '横浜FM',
  '浦和レッズ': '浦和',
  '鹿島アントラーズ': '鹿島',
  'セレッソ大阪': 'C大阪',
  'ガンバ大阪': 'G大阪',
  '名古屋グランパス': '名古屋',
  'サンフレッチェ広島': '広島',
  'ヴィッセル神戸': '神戸',
  '柏レイソル': '柏',
  '大分トリニータ': '大分',
  '湘南ベルマーレ': '湘南',
  '北海道コンサドーレ札幌': '札幌',
  '清水エスパルス': '清水',
  'ジュビロ磐田': '磐田',
  'アビスパ福岡': '福岡',
  '東京ヴェルディ': '東京V',
  'ヴァンフォーレ甲府': '甲府',
  'アルビレックス新潟': '新潟',
  'FC町田ゼルビア': '町田',
  'サガン鳥栖': '鳥栖',
}

// チーム名を日本語表記に変換する関数
function getTeamNameJa(teamName: string): string {
  return TEAM_NAMES_JA[teamName] || teamName
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
  const [japaneseOnly, setJapaneseOnly] = useState(true)

  // フィルタリングされた試合を取得（useMemoで最適化）
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
    try {
      if (japaneseOnly && !match.has_japanese_player) {
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
  }, [matches, japaneseOnly])

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
                  <th>L</th>
                  <th>KO</th>
                  <th>HOME</th>
                  <th>AWAY</th>
                  <th 
                    className={`jp-header ${japaneseOnly ? 'jp-active' : ''}`}
                    onClick={() => setJapaneseOnly(!japaneseOnly)}
                    title={japaneseOnly ? '全試合を表示' : '日本人所属試合のみ表示'}
                  >
                    <span className="jp-toggle">
                      <span className="jp-label">JP</span>
                      <span className="jp-indicator">{japaneseOnly ? '✓' : ''}</span>
                    </span>
                  </th>
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
                    const day = format(matchDate, 'dd')
                    const time = format(matchDate, 'HH:mm')
                    const dateStr = `${day} ${time}`
                    
                    const backgroundColor = LEAGUE_COLORS[match.competition_name] || '#ffffff'
                    const flag = LEAGUE_FLAGS[match.competition_name] || '🏳️' // デフォルトは白旗
                    
                    return (
                      <tr 
                        key={match.id}
                        style={{ backgroundColor }}
                      >
                        <td>{flag}</td>
                        <td>{dateStr}</td>
                        <td>{getTeamNameJa(match.home_team)}</td>
                        <td>{getTeamNameJa(match.away_team)}</td>
                        <td style={{ textAlign: 'center' }}>
                          {match.has_japanese_player && '🇯🇵'}
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
