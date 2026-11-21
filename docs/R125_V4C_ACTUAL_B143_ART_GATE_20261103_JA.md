# R125 V4C — 真正B143 3Dに基づく独立ART審査とV4D研究ゲート

2026-11-03 JST。**判定：合成SOURCE TECH PASS 3/3、ART REJECT 3/3。実Qwen V4C 0、実Minecraft NOT_TESTED。**

## 本当に確認したもの

- GitHub Actions [#41596939516](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41596939516) のジョブ完走は `completed/success`。V4A・V4B・V4C・PowerShellの既存回帰を含む全手順成功。
- V4C Artifact **R125-V4C-Three-Distinct-Synthetic-Source-Topologies-ART-HOLD**、ID **13213215256**。ZIP SHA-256 `bae7414c7562df5a9a6756f57461222571f9c4198607d058b4d7983b27166261`。
- ZIP内の `index.html` SHA-256 `6e0839f3822990cd90792d10f465ace7627f5a5fe88d4290798ab93181bcddd7`、`SOURCE_TOP_VIEWS.svg` SHA-256 `6875cbefa010a49f269625a0f51f8ffa91ae9c08c07a6233af09086db91a5899`、`V4C_SOURCE_REVIEW.json` SHA-256 `65e75dde5b3bb5ae8b7a5bcdcc212856e44dc8132e2de15b9859e341fbe9d160`。
- `index.html` に埋め込まれた `payload.scenes[].surface` の真正B143占有ボクセルのみを等角投影へ再描画。再投影PNGの SHA-256 `53d2e8ee6c4e17253d32b9370ebb84070a2e1a3bf59bb7948daac747535e541d`（PNGは会話成果物でGitHubには未保存）。存在しない素材や仮想の建築ディテールは描き足していない。元ArtifactはGitHub Actions retention 14日で消えるので SHAとコンパイラ/フィクスチャを長期再現入口とする。

## 3つの正しいSOURCEと美術上の不採用

| 合成構成 | 真正B143全voxel | 中庭有効床+空 block² | 公共前庭支持床 block² | ガラス実voxel | ART |
| --- | ---: | ---: | ---: | ---: | --- |
| 東・南分岐 | 4,038 | 64 | 112 | 0 | REJECT |
| 西・北分岐 | 4,681 | 90 | 112 | 0 | REJECT |
| 南→東直列 | 5,152 | 110 | 180 | 0 | REJECT |

**事実としての改善**：旧V4B（中庭2〜3 block²、合成5件の接続トポロジー1種）と異なり、V4Cでは明示的に異なる3種類の接続を実コンパイルし、64〜110 block²の屋根が本当に抜けた中庭と112〜180 block²の支持床付き前庭を生成。B143 SOURCE/2幅動線の技術実験として再現性のある成果。

**3Dからの目視ART判定**：すべて巨大な軸平行直方体の主棟＋小さな直方体翼＋平坦屋根の四角い穴であり、主役を定義する輪郭、視点ごとの立面構成、意図した中庭体験、屋内外の明確な序列、使いたくなる建築のファサードが不足。実ボクセルは3棟とも**ガラス0 voxel**、屋根材は同一のmetal、外壁はほぼ一様なconcrete。3つの接続関係は正当に異なるが、建築言語と用途の異なる魅力的な3案ではない。

このため **SOURCE PASS ≠ ART PASS**。庭が広がった数値だけで美術合格とはしない。今回は3D外観に限定する予備の人間審査であり、Minecraftプレイヤーが内部・中庭を実際に歩けることや実地の照明を認定しない。ART採用は0件。

## 原因の境界

SOURCE側で確かめた制約：`r125-void-massing-v4c.mjs` は形状として床・四方壁・屋根の**6直方体/棟**を作り、その屋根の矩形を除去する。モデルにフリーフォームの輪郭や屋根段差、コロネード、水平層/テラス、日射/動線と一体の公共断面を著作させるIRがない。入口は単一階北壁の2幅。3合成ケースの材料も同一選択を使用。このSOURCE制約と選ばれたテストデータでART不採用になるのは自然であり、**Qwenの設計能力を今回の結果から断定しない**。

## 次の開発 V4D — 承認済み方針に沿った設計要件

1. **大きな単純箱を壊す本当のAUTHOR自由度を先に証明**。建物の主要輪郭・上下の段差、奥行あるアプローチ/公共の半屋外領域、複数の空洞の連続性などを、設計者が用途に依存しない短い意味IRで選択できること。小突起や中庭の面積を増やすだけの変更は不採用。初回は「負空間のつながり」と「立面の主従」を1つの建物で可視化し、検証が通ってから複数用途へ拡張。
2. **HOSTが建築案を捏造しない**。位置・形状・目的はAUTHORが宣言し、HOSTは安全なB143の真のボクセル化、2幅アクセス、支持床・頭上空気・開口衝突・上限などを検査してfail-closed。既存の中庭/入口の必要証拠を薄めず、SOURCEが成立しない場合はHOLD。
3. **ARTとSOURCEは別ゲート**。最初の比較は同じ視点で3D・上面・正面・入口側・空洞内側。単なるSHA/色差ではPASS不可。複数用途の合成フィクスチャで同一設計の使い回しを禁じ、その後に少数のQwen本物原文で独立設計を試す。SOURCEテストが通っても審査者がART REJECTを維持できる。
4. **費用と操作を抑える**。Mac/低リソース環境のR125薄い主経路を維持。クラウド高額モデル/Workは自動投入しない。CI artifactから再現可能な実ボクセル画像を自動生成し、ユーザーに毎回スクショを要求しない。

## 保護・非昇格

main変更禁止。Draft PR #128 Open/Draft/Unmerged維持。既存R125→B143→Education実機成功、V1〜V4C、private Qwen originalは保護。新実Qwen POST0、Minecraft world writes 0、`NOT_PREPARED` / `9 BLOCKED` / `BuildPlan.operations=[]`、施工禁止／Work事前承認制。V4C自体はART REJECT、V4Dは次の研究方向であって完成済みではない。
