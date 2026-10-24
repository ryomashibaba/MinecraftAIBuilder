# B198Z-R54 — 建築プログラム先行の次回Qwen実行器候補（実モデル未実行）

## 状態

日付：2026年10月21日 JST。既存 `ryomashibaba/MinecraftAIBuilder` Draft PR #128 上での開発継続。

- **R53の最終Windows/Ubuntu CIはともにPASS**。模擬Qwen 1回、保存した原本のSHA、B143失敗時のR51自動診断図、R52を用いたWindows ZIP生成と展開、承認再使用拒否を確認。
- **本番R54の承認はユーザーからまだ得られていない**。今回の作業は候補コード・CIのみ。旧R48の承認は使用済みで、R54の実推論に流用しない。
- 実モデル `qwen3.8:27b` の追加要求0、Minecraft接続0、施工0。今回も実ユーザーの作業0。

## なぜR54を作るか

R25、R44、R46、R48は正式B143コンパイル失敗で、使える公共図書館として合格していない。モデルのJSON形式はR47 Schemaで改善したが、R48では`y=height`屋根、負のZ階段、空洞の埋戻し、不可能な宣言動線が残った。

R50では「発想→住める空洞→支持された床・入口・上下移動→質量ある外観→最終ADD/CUTとspatialPlan」という**汎用の建築設計順序**を指示する研究用ガイドを作成し、Windows/Ubuntuの模擬CIでプロファイルの排他性を確認。**実Qwenによる品質改善は依然として未検証**。

R54は、次回別途明示承認された場合にだけこのR50ガイドを採用し、従来の同じ図書館c01・同じトークン条件でR48と比較するための独立した候補。

## 新しい候補と検証

- `scripts/b198zr54-future-program-first-once.mjs`：新しい独立同意文字列 `I_APPROVE_R54_ONE_LOCAL_QWEN_REQUEST`、独立の消費ロック、厳密`qwen3.8:27b`のみ、ローカル`127.0.0.1`のみ。新しい同意がない限り問い合わせしない。現時点で同意は**得ていない**。
- `r50ProgramFirstGuide:true`を唯一の設計プロファイルとして採用し、Ollamaの`format`へR47ネイティブJSON Schemaを指定。R48の`r47SchemaFormat:true`プロファイル・旧原本・旧ロックは変更しない。
- 最大1回の生成。事前モデル存在チェック `GET /api/tags`、生成前に不可逆ロック、失敗でも再試行・代替モデル・クラウドAPI利用不可。`num_predict=3072`、`num_ctx=6144`、`think:false`、`temperature:0.35`、`stream:false`を維持。
- オリジナルの未加工出力を原本ファイルへ`wx`で先保存。B143/R3に加えてR41/R42/R43/R45/R47/R49の監査、成功時だけ正式なR7 3D。**宣言基準が合格しても本来の日本語依頼・意匠の人間審査は別**。
- `scripts/b198zr54-future-program-first-once.test.mjs`：偽Ollama・空きポートだけを使い、R50指示全文とR47 Schemaを照合、1 POST、原本SHA保存、旧同意拒否、欠けたモデルの事前HOLD、再利用拒否。
- `scripts/b198zr54-future-one-shot-auto-zip.fake.test.mjs`：合成`B143_OUTSIDE_LOCAL_BOUNDS`原本を敢えて出す偽Ollamaに対し、R54の保存→Windows PowerShell R52同梱→ZIP展開→図面・監査SHAを確認。B143成功の場合は正式R7ビューアを優先。
- `.github/workflows/r54-future-program-one-shot-fake-only.yml`：UbuntuとWindowsでR52/R53を含めた回帰確認。**本物のQwenやユーザーOMENに接続しない。**

## 1回操作化する将来の工程

新しいユーザー承認を得たときに初めて、R54のソース・依存関係の不変コミットとblob SHAを固定し、Windowsの実機起動CMD（1ファイル）を作る。CMDからSHA検査済みローカルソースと、生成後のR52`ARCHIVE_WITH_R51_DIAGNOSTIC_OFFLINE.ps1`を呼び、原本SHA監査→図面（失敗時のみ）→結果ZIP生成→Explorer選択まで全自動化する。

**今回のR54は未承認なので、本番CMDはまだ発行しない。** 模擬CIで合格した事実と、実ユーザー環境でQwenが問題なく生成できることは別。R48の固定実行器を変更したり、旧同意や原本を使い回したりしない。

## 合格条件

- B143全形状範囲と最終ボクセルが実測PASS。
- R3の実到達・保護空洞と新R49の数学的必要最短歩数に矛盾がない。
- 図書館の要求を満たす本棚・利用可能な空間・最上階ラウンジ・曲線的統一外観が実際の3D形状で確認できる。
- 見栄えと独創性は自動的に「PASS」としない。人間が図面・3Dを評価するまで保留。

不変：`NOT_PREPARED`、`constructionApproved=false`、`executionAllowed=false`、9ゲート`BLOCKED`、`BuildPlan.operations=[]`、世界読み取り/書き込み0。
