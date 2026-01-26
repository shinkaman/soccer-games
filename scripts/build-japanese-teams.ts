import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface JapaneseTeamsData {
  [leagueName: string]: string[]
}

// メイン処理
function main() {
  console.log('Building japanese-teams.ts from manual data...')

  // data/japanese.manual.jsonを読み込む
  const manualDataPath = join(process.cwd(), 'data', 'japanese.manual.json')
  
  let manualData: JapaneseTeamsData
  try {
    const fileContent = readFileSync(manualDataPath, 'utf-8')
    manualData = JSON.parse(fileContent)
  } catch (error) {
    console.error(`Error reading ${manualDataPath}:`, error)
    process.exit(1)
  }

  // TypeScriptファイルの内容を生成
  const entries = Object.entries(manualData)
    .map(([league, teams]) => {
      const teamsStr = teams.map(team => `    "${team}"`).join(',\n')
      return `  "${league}": [\n${teamsStr}\n  ]`
    })
    .join(',\n')
  
  const tsContent = `// このファイルは自動生成されます。手動で編集しないでください。
// 編集する場合は data/japanese.manual.json を編集し、
// npm run build-japanese-teams を実行してください。

export const JAPANESE_TEAMS: Record<string, readonly string[]> = {
${entries}
} as const
`

  // lib/japanese-teams.tsに書き込む
  const outputPath = join(process.cwd(), 'lib', 'japanese-teams.ts')
  writeFileSync(outputPath, tsContent, 'utf-8')
  
  console.log(`Successfully generated ${outputPath}`)
  console.log(`Generated ${Object.keys(manualData).length} leagues`)
  console.log(`Total teams: ${Object.values(manualData).flat().length}`)
  console.log('Done!')
}

main()
