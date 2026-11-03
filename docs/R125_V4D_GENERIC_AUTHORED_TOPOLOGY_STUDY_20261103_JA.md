# R125 V4D — AUTHOR空間グラフで多用途と公共空間を同時設計する研究

2026-11-03 JST。上位原則は固定憲章、戦略v2、11月3日完全統合引き継ぎ。第四案のSOURCE PASS／真正3D予備ART REJECTを凍結し、同じ箱を何度も修理しない。

## 背景と変更の本質

最初の四案は外郭と屋根の生成を改善したが、固定の左右翼や建築名の違いしかなかった。今回は **作者が自由に選んだ3〜5用途ノードの空間位置と親子/環状接続**をB143へ物理的に変換する研究である。すべての建築用途に同じHOSTロジックを使い、ジャンル別の間取りテンプレートを持たない。

SOURCEモジュール: source/ai/r125-v4d-authored-topology.mjs。AUTHOR IRは短い nodes（用途、位置、面積、屋根断面、公開の空き）/links（方向、共有壁、開口位置）/entry（入口・公開前庭）/windows（選択した外窓）/fixtures（各用途固有の実設備）である。人工的な機能設備は対応するB143の実体を持ち、入口から2幅のSOURCEサービス位置が到達可能か検査する。

## 技術的安全ゲート

各共有壁の物理的接触、未申告の共有壁、建物の実3D重複、2幅の扉開口と支持床、軸に沿う連続屋根、中央の本物の開放空気空間、外部入口から全用途へのSOURCE到達、実ガラス材料、設備へのSOURCE接近を独立監査。欠陥をHOSTが黙って補修してはいけない。

合成作者試験は**独立3構成**: 直列（degree 1-1-2-2、cycle 0）、中心分岐（1-1-1-3、cycle 0）、環状（2-2-2-2、cycle 1）。単なる別タイトルやSHA違いで多様性を証明しない。SOURCE検証と実B143形状を通した上で、3D回転ギャラリー、同一スケール俯瞰、JSON監査を1つのArtifactにまとめる。データはテスト用の合成AUTHORであって実Qwen/Gemmaによる独立設計ではない。

新CI完走前はSOURCE未認定、真正3D独立美術審査前はART NOT_REVIEWED。構造強度・耐候・実Minecraft歩行・Mac 8GB実測は未確認。新Minecraft書込0、初期 readiness NOT_PREPARED、9 BLOCKED、BuildPlan空、施工許可false。main、旧第一〜第四案、R125→B143→Education成功、private Qwen原文は不変更。PR #128 Open/Draft、Work事前承認制。

## 次のゲート

正式CIと実B143 Artifactから、3Dで空間接続が読み取れるか、実設備が機能と結びつくか、外観が建築として成立するかを独立予備ARTで判定。断片化した箱の集まりならART REJECTとし、モデルの能力不測/生成器の表現限界を区別する。モデル実試験を偽装しない。

## 2026-11-03 実CI完走・真のB143複数視点・ART予備REJECT（確定更新）

- 研究実装コミット [b83bf04c](https://github.com/ryomashibaba/MinecraftAIBuilder/commit/b83bf04c2052a08ff00ce406613314afe264e919)。専用 [R125 Actions #41610782194](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41610782194) は **completed/success**。新生成器の3種の合成SOURCE正例/負例テスト、同一真正B143ギャラリー、同縮尺SOURCE上面、証拠JSON、Artifactアップロードがすべて成功。これは専用R125 CIであり、他の並列ワークフローをすべて認定したという意味ではない。
- Artifact 名 R125-V4D-Three-Independent-Authored-Spatial-Graphs-True-B143-ART-HOLD、ID **13219416378**。GitHub返却SHA-256と実ダウンロードZIPのハッシュは一致：**c2468f43d3dbfe5c65acff443eeabdf33ed65d36566cf39e981d54fe5bc0474b**。原本はSOURCE-onlyの再構築可能なコード・3合成fixture。圧縮Artifactは保存期限14日、長期証拠はこの文書・コード・Gitコミットで保持。

| 合成作者試験 | B143完成voxel | graph度数と閉路数 | 物理扉床検査 | 二幅到達 | 実ガラス | 実用途設備SOURCE接近 | sky支持床候補 |
|---|---:|---|---:|---|---:|---:|---:|
| SERIAL | 7,297 | 1-1-2-2 / cycle 0 | 6セル（扉3） | 4/4用途 | 72 | 4/4 | 336 |
| STAR | 7,581 | 1-1-1-3 / cycle 0 | 6セル（扉3） | 4/4用途 | 66 | 4/4 | 354 |
| LOOP | 6,602 | 2-2-2-2 / cycle 1 | 8セル（扉4） | 4/4用途 | 63 | 4/4 | 318 |

実際のSOURCE geometry SHA-256：
- SERIAL：2f3a1f5358dcb80e91c1b8378157a131b64591bbb805528a54d292a97942e8fe
- STAR：073af9ff82583e52c1c09ed1f3dcb8bf83f8cccb366f94cfb833f5c8d24d4b21
- LOOP：fe6d1647a1cad2b719b1458c237187a023d0a3ae38086fc6b38b8e597b2fe87d

### 独立真正ボクセルの斜視2方向からの美術審査

Artifact内の最終B143 surfaceから、同じスケールの等角2方向を新しい架空オブジェクトなしで再投影し、真正上面SVGと照合した。**これらの投影はMinecraft Education実機画像ではない。**

- SERIAL：直列に連結した屋内施設と独立空庭が見える点はSOURCEで前進。しかし外観は単純な直方体と折板屋根の逐次連結で、用途・都市的動線と細部の建築言語が読めない。
- STAR：中央の分岐核から2つの用途翼と公開庭へのAUTHORトポロジーは3案中最も明瞭。ただし大きな無地の外壁、立体性のない中庭・接合部、屋根の不連続により、美術品質としての公共建築らしさは成立しない。
- LOOP：単なる名前のループではなく、4つの実SOURCE共有壁開口を持つ閉路が存在。だが外観は4つの矩形が縁を接する形で、空庭との一体感・正面入口の存在感・機能用途の差が十分ではない。人間がMinecraft内を一周して歩けたという実証ではない。
- **独立AI予備ART判定：SERIAL / STAR / LOOP ともREJECT（3/3）**。真正SOURCE成功と実3Dを見ることを別ゲートとしており、正式なユーザー本人の美術合格審査を代行しない。ART正式採用0件。

### 課題の共通原因と次の実装優先順位

1. 特定建物の形態追加ではなく、**共通AUTHOR IRが「外殻・用途設備・大きな屋内外公共通路の立体断面」を同時に著作できるようにする**。ノードは現状単層矩形、設備は小さな真のB143ブロックであり、実用途を十分示していない。実SOURCE到達PASSを用途が完成した証明にしない。
2. **屋根の高さと外壁上端の連続性、開口と公共側のファサード、複数棟の屋根の継ぎ目**を真正3Dで修正・検証する。細い階段状の屋根反復や屋根下の大きな隙間、箱の配色だけに戻らない。
3. 3用途横断の意匠・機能改善を確認し、独立ARTが明確に改善した場合だけ、新しい本物Qwen/Gemma生成を有限回行う。現在の3例はSOURCE試験としてのみ採用し、**AIモデルによる汎用建築生成3/3達成という虚偽の昇格を禁止**。

固定: 研究ブランチのみ変更、Draft PR #128 Open/Unmerged、main・凍結原本・R125→B143→Education実機成功を不変更。新実Qwen0、新Minecraft施工0、worldWrites0、NOT_PREPARED・9 BLOCKED・BuildPlan空。Work事前承認。
