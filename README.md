# サッカー試合日程一覧

欧州主要リーグとJリーグの試合日程を一覧表示するWebサイトです。日本人選手が所属する試合を簡単に見つけられます。

## 🌐 公開URL

**https://[username].github.io/SoccerGames**

※ GitHub Pagesでデプロイ後、実際のURLに更新してください

## ✨ 主な機能

- 📅 **試合日程の一覧表示** - 昨日終了分から1週間後までの試合を表示
- 🇯🇵 **日本人所属試合の表示** - 日本人選手が所属する試合にアイコンを表示
- 🔍 **フィルタ機能** - リーグ別、日本人所属試合のみで絞り込み可能
- 🕐 **日本時間（JST）表示** - すべての試合時間を日本時間で表示
- 🎨 **リーグ別カラー表示** - 各リーグを色分けして見やすく表示

## 📊 対象リーグ・大会

### 欧州リーグ

- 🇬🇧 **Premier League** - プレミアリーグ（イングランド）
- 🇪🇸 **La Liga** - ラ・リーガ（スペイン）
- 🇮🇹 **Serie A** - セリエA（イタリア）
- 🇩🇪 **Bundesliga** - ブンデスリーガ（ドイツ）
- 🇫🇷 **Ligue 1** - リーグ・アン（フランス）
- 🇳🇱 **Eredivisie** - エールディヴィジ（オランダ）
- 🇵🇹 **Primeira Liga** - プリメイラ・リーガ（ポルトガル）
- 🇬🇧 **Championship** - EFLチャンピオンシップ（イングランド）
- 🇪🇺 **UEFA Champions League** - UEFAチャンピオンズリーグ
- 🌍 **FIFA World Cup** - FIFAワールドカップ

### 日本リーグ

- 🇯🇵 **J.League** - Jリーグ

## 🛠 技術スタック

- **フレームワーク**: Next.js 14（静的エクスポート）
- **ホスティング**: GitHub Pages
- **データ取得**: GitHub Actions（日次自動更新）
- **データソース**: 
  - football-data.org API（欧州リーグ）
  - data.j-league.or.jp（Jリーグ）

---

## 👨‍💻 開発者向け情報

<details>
<summary>セットアップ手順</summary>

### 必要な環境

- Node.js 20以上
- npm または yarn

### インストール

```bash
npm install
```

### 環境変数の設定

`.env.local`ファイルを作成し、以下を設定：

```env
FOOTBALL_DATA_KEY=your_football_data_key
```

**⚠️ セキュリティ注意**: APIキーはクライアント側（ブラウザ）には公開されません。すべてのAPI呼び出しはサーバーサイド（GitHub Actions）で実行されます。

### ローカル開発

```bash
# 開発サーバー起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

</details>

<details>
<summary>データ取得について</summary>

### 自動データ更新

GitHub Actionsにより、毎日JST 4:00（UTC 19:00）に自動的にデータを取得・更新します。

### 手動データ取得（開発用）

```bash
# Jリーグデータを取得
npm run fetch-jleague

# 全データを取得（欧州リーグ + Jリーグ）
npm run fetch-data
```

### データソース

- **欧州リーグ**: football-data.orgのFreeプランAPIを使用
- **Jリーグ**: data.j-league.or.jpの公開データを使用

**注意**: Jリーグのデータ取得は、公開されているHTMLページから情報を抽出しています。サイト構造の変更により取得できない場合があります。

</details>

<details>
<summary>プロジェクト構造</summary>

```
.
├── app/                    # Next.jsアプリケーション
│   ├── page.tsx           # メインページ
│   ├── layout.tsx         # レイアウト
│   └── globals.css        # グローバルスタイル
├── lib/                    # ライブラリ
│   ├── types.ts           # TypeScript型定義
│   └── japanese-teams.ts  # 日本人所属チームリスト（自動生成）
├── data/                   # 手動編集データ
│   └── japanese.manual.json  # 日本人所属チーム定義
├── scripts/                # データ取得スクリプト
│   ├── fetch-matches.ts   # 試合データ取得
│   ├── fetch-jleague.ts  # Jリーグデータ取得
│   └── build-japanese-teams.ts  # チーム定義生成
├── public/data/           # データファイル（自動生成）
│   └── matches.json       # 試合データ
└── .github/workflows/     # GitHub Actions
    ├── fetch-matches.yml  # データ取得ワークフロー
    └── deploy.yml         # デプロイワークフロー
```

</details>

<details>
<summary>デプロイ方法</summary>

### GitHub Pages

1. リポジトリの「Settings」→「Pages」でGitHub Pagesを有効化
2. Source: GitHub Actionsを選択
3. `main`ブランチにプッシュすると自動的にデプロイされます

### 必要なシークレット設定

GitHubの「Settings」→「Secrets and variables」→「Actions」で以下を設定：

- `FOOTBALL_DATA_KEY`: football-data.orgのAPIキー

</details>

<details>
<summary>制限事項・注意点</summary>

- football-data.orgの無料プランには1日あたりのリクエスト数に制限があります
- 日本人所属の判定は、チーム名ベースで簡易的に実装されています
- データは1日1回更新されます（リアルタイムではありません）
- Jリーグのデータ取得は、公開サイトの構造変更により影響を受ける可能性があります

</details>

---

## 📝 ライセンス

このプロジェクトはオープンソースです。詳細はLICENSEファイルを参照してください。

## 🤝 貢献

バグ報告や機能要望は、Issueでお知らせください。プルリクエストも歓迎します。
