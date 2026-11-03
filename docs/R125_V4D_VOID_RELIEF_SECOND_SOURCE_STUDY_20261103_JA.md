# R125 V4D 第二案 — 非矩形外郭と実開放公共トランセクト SOURCE 研究

2026-11-03 JST。固定憲章・戦略v2・11月3日完全統合正本を継承。**V4D初回はCI SOURCE PASS / ART REJECT、凍結したまま**。

## 何を実装したか

* 既存の `r125-sculpted-spine-v4d.mjs` / 初回合成フィクスチャ / 旧比較のSHAを変更せず、`source/ai/r125-v4d-void-relief.mjs` で同一V4Dの**明示オプトイン第二著作案**を実装。ラベルを変えただけの5棟、装飾/色だけの改修、E2全座標直書きではない。
* 作者IRは `base`、`publicVoid`（どの主帯を横断するか、開始位置・幅・用途）、`edgeRelief`（主帯、東西側、開始位置、段階的な外縁inset）を指定。HOSTは空洞の意匠選択をしない。正確なB143ボクセル化・壁断面の閉じ方・支持床と2幅経路の検査のみ担当。
* **上部屋根と外壁そのものを横断CUT**して床Y=1を保持。構造や防水を認定しないが、全幅横断の真の空気体積と2幅SOURCE支持床を最後のvoxelで照合。別主帯の物理的な床/屋根端を削り、段階的に内側へ移動する境界壁と折返し壁を追加して、実平面輪郭を非矩形化。実ガラスが失われていないことも最後のvoxelで監査。
* `scripts/r125-v4d-void-relief.test.mjs` にSOURCE/形状差・旧形状の再現・フェイルクローズ負例。専用レビューは本物のB143二案を同一3Dビューワと同縮尺実ボクセル上面SVG、JSONに出力。既存R125 GitHub Actionsへ接続し、旧V4DのArtifactと別保存。

## 成功と呼べる範囲

GitHub Actionsで実際に完走するまでは **新候補 SOURCE未認証**。正しい値はCIの新runとArtifactのJSONから更新する。コード・テストをコミットしただけでPASSとしない。ビジュアルは最後の本物の3Dを見た後に別途独立審査する。既存V4D初回ART REJECTは一切変更しない。

候補は合成AUTHOR試験、実Qwen/Gemmaの今回の回答 **0回**、真のMinecraft施工・歩行 **0回**。ART **NOT_REVIEWED**。世界は `NOT_PREPARED`、9 BLOCKED、BuildPlan空、WorldWrites0。実構造安全/雨仕舞/地形と人の体験は未認証。実Qwenは、ARTの明白な不合格を越えて表現力が示されてから少数実行。

## 固定保護

研究ブランチへの通常コミットのみ。PR #128 Open/Draft/未マージ、base固定、main、R125→B143→Educationの既存実機成功、旧V1〜V4D初回、保存済みPRIVATE実Qwen生回答・失敗原本を変更しない。Workは事前承認制。ユーザーにスクショ・ZIPを要求しない。

## 2026-11-03 CI実証・真正3D独立予備ART審査

- 実際の初回実装コミット [659591cc6ec0](https://github.com/ryomashibaba/MinecraftAIBuilder/commit/659591cc6ec010f22ea286437add7ca954aedc1a) は、R125専用 [Actions #41603430205](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41603430205) で **completed/success**。新旧V4D Node正負例、真正B143ギャラリー、SVG、JSON、artifactアップロードまで全工程成功。これはSOURCE試験であり、Minecraft実機動作/完成建築の保証ではない。
- Artifact **R125-V4D-Second-Synthetic-Author-Nonrectangular-Void-ART-HOLD** ID 13215523011、取得ZIP SHA256 `a27ec9f0d0a8d2fead28f868e62bf877e852fc6799929c3238f3ff22750a2273`（GitHub提供digestと取得ファイルの照合済み）。
- 真正B143最終6,139 voxel（初回V4Dは6,690 voxel）。第二案 geometry SHA `03f77bc2fc786265980538a7cc509055c056233fcfba6e96eac734e50e6c6289`、source SHA `a8aaf068e0c5c62dd98bb9f801acb8a0f92d31e9a639c88478e5d93bf1e08c77`。上部を開放した全幅トランセクトの実2幅床315セル、屋根/床非矩形外縁42セル、折れ12回、ガラス16 voxel維持、入口→全プログラムのSOURCE到達PASS。
- **真正ボクセルの東西斜視および上面を独立再投影して確認した美術判定は ART REJECT。** トランセクトの空気量と床は本物だが、実3Dの主像は依然として3つの大きい矩形建築群と平坦な壁・屋根。蛇行した外縁は小さく、公共空洞が都市的に体験できる迫力ある立体連続性/主従ファサードを生んでいない。「建築品質を突破した」や「モデル著作を実証した」とは言わない。旧初回V4DのART REJECTも固定。
- **次のART-FIRST方針：** 小庇/色/小さな外縁凹凸を増量しない。AUTHOR短い意味IRで主外郭全体の非矩形マスと、公共広場→深い半屋外通過空間→利用可能な大きい内部空洞を立体的に一体著作する能力の最小再設計が必要。実Qwenを追加消費する前に真正3Dで質を判断。第二案の修正は、テストフィクスチャを製品レビューから分離する技術整理のみで形状そのものは不変。
- 正式ART採用0、実Qwen新呼出0、Minecraft施工/歩行0、Work不使用、main・旧V4D原本・Education縦貫成功保護。技術的初期安全フラグ `NOT_PREPARED`／9 BLOCKED／BuildPlan空／worldWrites0 は不変。
