# MinecraftAIBuilder — AI再開入口・現在地（短い更新文書）

**新しいチャットの最初にここを読む。** [固定憲章](AI_PROJECT_CHARTER_JA.md) と併読。毎日の完全統合引き継ぎ文は不要。
この文書は**最後に人がGitHubで確認した時点のスナップショット**であり、自動更新の生データではない。再開時は必ずブランチとActionsを最新確認する。

## 現在地（2026-10-24 JSTに確認）
| 項目 | 確定情報 |
|---|---|
| リポジトリ | [ryomashibaba/MinecraftAIBuilder](https://github.com/ryomashibaba/MinecraftAIBuilder) |
| 継続ブランチ | `feature/b198zr1-protected-architectural-revision` |
| 継続PR | [#128](https://github.com/ryomashibaba/MinecraftAIBuilder/pull/128) — Open / Draft / Unmerged |
| HEAD | [開発ブランチの最新HEADを毎回GitHubで確認](https://github.com/ryomashibaba/MinecraftAIBuilder/commits/feature/b198zr1-protected-architectural-revision)（R98の初期実メッシュ検証対象は `9a2b5de9d8ba41a2b7ca4e626aa9d54ff4ffffdd`） |
| 最新確認済み実装工程 | **B198Z-R115：R113実源CIは直近確認でqueued。R114の3ペイン×6視点描画修正済み。R115は衝突源R93の庇と書架上端を接合保持のまま一体で上げる4つの実3D建築案を実装。元床/家具/入り口不変・実源両OSの判定待ち／美術HOLD** |
| 次に取り組む工程 | **R113とR115の両OS実メッシュCIから庇の頭上Ray・旧5経路非悪化を検証し、単なる数値PASSではなく同一カメラの実3D美術比較も行う。候補不採用ならHOLDを維持。人の美術・実歩行・荷重は未認証** |
| 施工・モデル | NOT_PREPARED / 9 BLOCKED / BuildPlan空。新たな実Qwen/Gemma禁止。World接続/読取/書込禁止 |

**最新情報への直リンク：** [ブランチの現在地](https://github.com/ryomashibaba/MinecraftAIBuilder/tree/feature/b198zr1-protected-architectural-revision) ／ [Actions一覧](https://github.com/ryomashibaba/MinecraftAIBuilder/actions) ／ [PR #128](https://github.com/ryomashibaba/MinecraftAIBuilder/pull/128)

## R96が実際に達成したこと / 達成していないこと
- 独立研究《潮光の裂帆図書館》：R94の4,446三角形→R95の4,608→R96の4,692（旧4,608を変更せず84面の開口意匠追加）。7開口を維持、7×9本の局所視線検査成功。
- R96の実ソース：[実装](../scripts/b198zr96-window-structure-and-light-study.mjs)／[設計書](B198ZR96_WINDOW_ARCHITECTURAL_SURROUND_JA.md)／[R95設計書](B198ZR95_SEVEN_DAYLIGHT_SLOTS_JA.md)。
- **未解決：** R96の全館6視点実形状美術審査、屋根/頭上高（右最上層tier3など）、窓周りの本物の荷重支持、利用者幅・室内滞在・上下移動、実Minecraft歩行。美術 = NOT_REVIEWED。
- これは**Qwenが生成した新モデルではない**。実Qwen由来の失敗原本は凍結保持し、B143 HOLD。
- [R60軽量CI（HEAD b2e247、Windows＋Ubuntu成功）](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39914890947)。これは軽量スモーク中心であり、**R58〜R96の全履歴回帰を合格した意味ではない**。全履歴の最新版での成功は未確認。

## R97現在地（2026-10-23 JST）

- [R97実装](../scripts/b198zr97-multiview-mesh-review.mjs) / [テスト](../scripts/b198zr97-multiview-mesh-review.test.mjs) / [設計書](B198ZR97_MESH_BOUND_SIX_VIEW_REVIEW_JA.md)。R94/R95/R96の**実三角形4,446/4,608/4,692面**から、正面・斜視・側面・俯瞰・反対向き外形・右上層tier3局所拡大の**同一カメラ/同一縮尺6視点×3版**を生成する研究実装。結果を既存R60一操作レビューに追加するコードを導入。
- [初回R97全館生成のUbuntu実行](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39940423587)：全館形状の比較テスト自体は約174秒でPASS。ただし同じ古いコミットのCIは「証拠不足入力のエラー文字列を限定しすぎたテスト」が1件FAIL。該当テスト修正済み。
- 通常Push/PRのR97は軽量検査のみとし、**全館生成の重いテストは手動の完全回帰へ**戻した。R97本体はJSON証拠再計算とHTML6視点出力を共有して無駄な再計算を削減。
- [R97軽量CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39940965462)はWindows/Ubuntu両方成功。R97/R98の実出力の独立美術審査は未実施。R97を美術合格やQwen生成成功へ昇格しない。
- R60への統合後、R94〜R96 OBJとR97比較HTMLがレビュー画面に揃う。実人体頭上高・経路・窓支持/採光・Minecraft実歩行は未認証。R98の新形状修正は未開始。

## R98現在地（2026-10-23 JST）

- R97最新軽量CIの[Windows/Ubuntu両OS成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39940965462)を確認。ただし完全履歴回帰や人間による美術審査ではない。
- [R98屋根ロフト実装](../scripts/b198zr98-elevated-right-crown.mjs) / [専用テスト](../scripts/b198zr98-elevated-right-crown.test.mjs) / [設計書](B198ZR98_ELEVATED_RIGHT_CROWN_JA.md)。元R96全館4,692面を保護し、右側上部の実頂点を最大0.085正規化単位の局所滑らかな形に持ち上げる比較候補を追加。改修前後の頭上方向の交差と7室×9本の視線を再測定する。改善を観測しなければHOLD。
- R60一括レビューへR98候補の**実OBJ、証拠JSON、6視点のR95/R96/R98比較HTML**を追加。元Qwen出力・旧R95/R96/97成果物を変更しない。
- [R98の初期実メッシュ検証CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39942654481)は**Windows/Ubuntu両方SUCCESS**。R98ソースから実三角形の変化、実交差に基づく頭上プローブ改善（少なくとも0.02正規化単位）、7室×9本の視線未悪化、原本保護をテスト。R60へ統合した全レビューの実出力と独立美術審査は別途未実施。構造/実歩行/Minecraft/実Qwen生成能力も未認証。R98は美術HOLDであり施工不可。
- 通常Push/PRのCIは再び軽量テスト中心、全館幾何/歴史回帰は手動workflow_dispatchに維持。R99は有限幅・有限高さの入口→7室→ラウンジの機能検証を優先候補とする。

## R99現在地（2026-10-23 JST、CI結果未確認）

- [R99本体](../scripts/b198zr99-finite-volume-route-witness.mjs)／[専用テスト](../scripts/b198zr99-finite-volume-route-witness.test.mjs)／[仕様](B198ZR99_FINITE_VOLUME_ROUTE_REVIEW_JA.md)。R92の入口→左右7閲覧室＋ラウンジ計8経路を、R98実建築三角形に対し**中央・両端の足元と頭上、横断方向の限定レイ**で調査する。
- 正規化単位での仮の半幅0.023／高さ0.135。Minecraftブロックやメートルではない。局所レイの成功も人間の有効通行幅や全連続経路の認証にはならない。認証済み目的地は常時0、判定HOLD。
- R60一括レビューへのR99表示導線追加。新しいGitHub PRやZIP、CMD、実Qwen推論やワールド操作はなし。
- [初回R99全館回帰CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39946180591) は確認時点でqueued。**Windows/Ubuntu結果、8経路の実測検出件数、実HTML審査はまだ未確定。** 未検証の成功件数を記載せず、確定した結果だけで次工程を選ぶ。
- R98初期ジオメトリの[両OS成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39942654481)は維持。ただし独立美術評価と実Minecraft歩行認証は保留。

## R100現在地（2026-10-23 JST、実メッシュQA待ち）

- [R100ソース](../scripts/b198zr100-source-gallery-shoulders.mjs)／[専用テスト](../scripts/b198zr100-source-gallery-shoulders.test.mjs)／[設計書](B198ZR100_GALLERY_SHOULDERS_JA.md)。R99の正規化半幅0.023に対しR88連絡床の実半幅は0.016。R98元メッシュをそのまま残し、7連絡通路に外側への追加床帯を構築する比較研究。
- 各候補で実床未検出の減少、頭上・横断の交差非増加、中央保護空洞へ入らないことを個別判定。差分が無効なら不採用。**実モデルで少なくとも1経路の証拠改善**を全館テストの条件にしており、実行結果が出るまでは成功としない。
- R60レビューにR100候補のOBJ/JSON/6視点比較HTMLを追加。既存Draft PR #128継続。元Qwen・R98以前の成果物は非改変。
- [R100実モデル検証CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39947874799) は確認時点でqueued。通常CIは原則軽量、今回の測定を含むコミットだけ実メッシュ回帰を追加している。成功件数、Windows/UbuntuのPASSともに**未確定**。
- R99の全館8経路は別途[CI待ち](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39946559669)。R100が一部で床改善しても、全館の人間歩行・建築美術・構造耐荷・汎用AI生成能力は未認証。次の設計修正は**取得できた問題地点**に基づいて選ぶ。

## R101現在地（2026-10-23 JST／未検証）

- [R101専用回帰テスト](../scripts/b198zr101-route-coverage-regression.test.mjs)／[修正資料](B198ZR101_ROUTE_COVERAGE_QA_JA.md)。R99の床判定線が足元から上に伸び、低い障害物を床と誤認する可能性を排除。床レイ始点を足元+0.024から+0.002正規化単位に変更。
- 垂直方向のみの源経路区間・急勾配>0.28・24分割では0.07間隔を守れない長い区間を**明示的に不完全検査のHOLD**として数え、R100で改善案を誤採択しない。
- [R101最新CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39950219073) は確認時queued。人工形状の回帰テストを追加したが**結果は未確認**。R100の全実メッシュでの少なくとも1件改善を要求する重いテストは既存の手動全履歴回帰へ戻した。初回R100試験もqueuedのまま。検証結果を想像してPASSにしない。
- 変更はR99/R100の研究用検証コードとテスト、ワークフローのみ。旧モデル/実Qwen/Gemma/ワールド/施工は手を付けず、安全ゲート9件BLOCKEDを維持。

## R102現在地（2026-10-23 JST）

- 事後確認：R99の[軽量Windows/Ubuntu CI成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39946559669)。R100の[実メッシュを含むWindows/Ubuntu CI成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39947874799)。R100は実R88接続のうち少なくとも1件で局所的床プローブ改善を確認するassertを通過。**改善した実件数と完全8経路の通行可能性は未認証**。
- R101の[専用CI（両OS成功）](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39950219073)を確認。床の誤認防止、垂直/急坂/疎サンプルHOLD検査を含む。後続の最新HEADの全履歴成功を意味しない。
- [R102実形状](../scripts/b198zr102-tapered-gallery-aprons.mjs)／[専用テスト](../scripts/b198zr102-tapered-gallery-aprons.test.mjs)／[仕様](B198ZR102_GALLERY_APRON_TRANSITIONS_JA.md)。R100の矩形床帯を元R88の細い床へ徐々につなぐ候補。新しい三角形は片側4面・左右計8面。源R98は4,692面の完全prefix。
- R101厳格床プローブで改善が証明でき、元R100改善値の60%以上を保ち、頭上・横断の問題が増えず、吹抜け保護帯を維持したときのみテーパ採用。失敗ならR100矩形案を維持。R100で却下した候補は作り直さずHOLD。
- R60一括レビューへR102の実OBJ/JSONとR98/R100/R102六視点比較HTMLを追加。実メッシュのテーパ採択件数、実HTMLの人間美術審査、最新CI成功は**未確認**。
- 元Qwen/B143、Minecraft、原本・mainは非変更。9ゲートBLOCKED、NOT_PREPARED、実推論/施工0。

## R103現在地（2026-10-23 JST）

- [R102軽量CI（Windows/Ubuntu成功）](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39952046303)を確認。ただし元R88から7経路全体の実メッシュ試験ではない。
- [R103元床端面診断](../scripts/b198zr103-source-junction-integrity.mjs)／[専用テスト](../scripts/b198zr103-source-junction-integrity.test.mjs)／[設計書](B198ZR103_SOURCE_GALLERY_JUNCTION_JA.md)。元R98内のR88研究デッキ実三角形で、入口側と室内側の幅0.032の端辺を確認。R102追加床の左右の端頂点も別途照合。端辺と接合点の両方を観察できない新規テーパを採用しない。
- 7目的地の正確な接合検査、元の実床端辺を確認した件数、R102の採用/矩形維持件数を同じR102証拠JSONとレビューHTMLに追加。**未実施の実3D人間美術/実歩行検査をPASSにしない。**
- [R103実7通路CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39956894901)を一度通常pushで起動（確認時点queued）。実際の件数はまだ未確認。以後のpushのR103は軽量モックのみに戻し、完全実モデル回帰は既存手動workflow_dispatchで行う。新規ワークフロー/ZIP/CMDは追加なし。
- 元Qwen/B143、main、Minecraft世界は未変更。NOT_PREPARED、9 BLOCKED、BuildPlan空、実モデル追加推論0。

## R103実7経路の確定計測（2026-10-23 JST）

[Windows/Ubuntuとも成功した実メッシュCI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39956894901)の両OSジョブログで**同値**を確認：
- R102の採用テーパ 3室（左tier1、右tier1、右tier3）／矩形維持0／旧HOLD4。元R88の端辺を確認6/7、採用された接合床の端点一致3/3、採用済みの接合不良0。
- 右翼tier2のみ「元R88端辺なし」。歴史的R91が同区間の旧R88終端2面を置換したことと一致。右翼tier2は今後も旧R88の線を捏造せず、現行のR91源メッシュを使う。
- R104の補修後の右翼tier2を改善として採用できたかどうか、全館の実際の通行安全と美術は**なお未判定**。

## R104現在地（2026-10-23 JST／新しい実メッシュQA待ち）

- コード再照合で見つけた**具体的な差異：R91は右翼tier2でR88元終端2枚を除外し、R91専用の床三角形2枚を用いて元パッド内へ絞った。** R103は旧R88の端面を要求するため、旧線に基づく候補の現行床への接続を証明できない。
- [R104実装](../scripts/b198zr104-r91-active-throat-repair.mjs)／[専用テスト](../scripts/b198zr104-r91-active-throat-repair.test.mjs)／[理由と設計](B198ZR104_R91_ACTIVE_THROAT_REPAIR_JA.md)。元R98の正規4692三角形を完全prefixとするR104別モデルで、R103端点接続証明のない追加床を保留し、右翼tier2現行R91の2枚のソースから中央拡幅、両端は元の端辺を保持する12実三角形を候補生成。元床支持レイが改善・衝突非悪化など満たした場合のみ追加。
- R60一括レビューのR102比較画面でR98/R102/R104同一6視点を表示し、R104の実OBJ/JSONを追加して参照できる。**元R98/R102の成果物はそのまま別ファイルとして保存**。
- [R103実7経路CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39956894901)は本更新時点で未完了。R102の[軽量Windows/Ubuntu CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39952046303)は成功済み。
- R104の人工形状スモークだけでなく、前のコミットの通常CIで実R98→R102→R104の**全源メッシュ回帰を1回投入**。この更新からR104も通常CIは軽量テストへ戻し、重い全館回帰は既存手動workflow_dispatchに残す。結果が出たら採否件数を記載。結果が出るまで人工形状以外の件数を断定しない。
- Qwen/Gemma追加実推論0、Minecraft世界接続/読込/書込0、原本保護、NOT_PREPARED、9 BLOCKED、BuildPlan.operations=[]。

## R105の確定した問題と現在地（2026-10-23 JST）

- R104の[実全メッシュWindows/Ubuntuテスト成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39958650488)。両OSの実ログ同値：R102由来の3連絡床（左tier1、右tier1、右tier3）は保持、無証拠で除外した追加床は0。**右翼tier2：元床未検出0、頭上の交差1、現行R91床を広げる候補でも床改善0、追加面0、HOLD**。
- 観測から、右翼tier2について次に必要なのは「床の拡幅」ではなく**頭上で何に当たっているか（屋根／手すり／他）を実形状から確定すること**。ヒット元を見ずに屋根を動かしたり階段を増やしたりしない。
- [R105実装](../scripts/b198zr105-active-r91-throat-width-selection.mjs)／[R105テスト](../scripts/b198zr105-active-r91-throat-width-selection.test.mjs)。源R104/R91の正しい場所に対し拡幅ピーク5候補を実Rayで検査。いずれも元の床未検出を減らさない場合は追加しない。実頭上交差Rayがヒットした元の三角形の種類と位置もログとJSONへ記録。
- R60の同一レビュー内にR105新候補OBJ、実測JSON、R102/R104/R105六視点の比較を組み込み。既存R98/R100/R102/R104のファイルや原本は上書きしない。R105の実7経路CIもこの工程のコミットで一度通常プッシュから起動済み。ただし**R105最新実モデル結果は未確認**、通常PR/Pushはその後軽量に戻す。重い完全回帰は同じ手動workflow_dispatchに残す。
- 構造、人の移動、デザイン美術、AI汎用生成、Minecraft実機施工は認証不可／HOLD。Qwen/Gemma追加推論0、ワールド操作0、NOT_PREPARED、9ゲートBLOCKED、BuildPlan空。

## R106確定原因と修正候補（2026-10-23 JST）

- R105の[実メッシュWindows/Ubuntu両OS成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39960220420)をログで確認。右tier2の頭上交差（研究用）の**元メッシュ三角形4158、種類right_R87_READING_TABLE_NOT_OCCUPANCY、交点(0.5231758, 0.4734807, -0.7406061)**。床未検出0、頭上交差1、5種類の拡幅はすべて0改善・不採用。**屋根でも手すりでもなくR87の読書テーブルが原因**。
- [R106実装](../scripts/b198zr106-reading-table-doorway-reflow.mjs)／[専用テスト](../scripts/b198zr106-reading-table-doorway-reflow.test.mjs)／[設計書](B198ZR106_READING_TABLE_REFLOW_JA.md)。対象のR87テーブル上面1＋側面6の実7三角形だけを隔離。元R98モデル4692面とR105モデルは別に保持。テーブルの支持床がRayで確認できる場所へ移設を14候補試し、無理なら当該家具のみ除外した研究案を比較。床/頭上/横断の実Rayが改善しない案は採用しない。
- R106は元テーブルを除いた時点で**元R98の完全prefixではなくなる**ので、旧SHAと元7面、変更後SHA、残る元三角形の完全一致を保存する。旧原本は一切変更しない。R60にR104/R105/R106の同一六視点比較とR106 OBJ/JSONを追加した。
- [R106全館実モデルCI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39962533812)は確認時点でqueued。**実際の修正採否や美術品質は未判定**。通常CIは一度重い実テストを投入し、その後は軽量スモークへ戻す。元Qwen/B143・Minecraft実ワールドは未変更、NOT_PREPARED、9ゲートBLOCKED、BuildPlan空。

## R107現在地（2026-10-23 JST）

- R106の最初の[実メッシュCI（不合格）](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39962533812)は、テストがトップレベルの戻り値ではなくreportに存在しないhistoricR98SourceFacesを参照した**検査コードのミス**。productionの家具変更処理の失敗と取り違えない。[参照修正した再実行CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39964461711)が**Windows・UbuntuともSUCCESS**。元R98の465...ではなく**正確に4692面**の保存SHAも照合。
- 実R106証拠：右翼tier2の現行R91経路で、R87テーブル上面4158＋側面6面を x+0.045、z+0 だけ移設。**頭上Ray1→0／床未検出0→0／横断Ray0→0**。当該家具は撤去していない。14移設候補のうち3座標が元の局所検査を通過。
- [R107実装](../scripts/b198zr107-compact-reading-table-recovery.mjs)／[専用テスト](../scripts/b198zr107-compact-reading-table-recovery.test.mjs)／[設計書](B198ZR107_R91_FIVE_LANE_REVIEW_JA.md)。既存のR91実通路の左右オフセット−0.035／−0.023／0／+0.023／+0.035の5本を旧R105とR106へ当て、元R106が検証済みだった3座標を再選別。中央線の改善を維持したまま他4本で新しい床/頭上/横断の交差を増やさない場合のみ採用候補。
- R60一括比較の中へR105/R106/R107同カメラの6視点、R107 JSON/OBJを追加。旧R98/R105/R106は非変更。コンパクト家具案は**元家具を撤去した場合だけ**の研究分岐であり、現在の主実装では撤去なし。
- [R107全実メッシュCI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39965968797)が**Windows／UbuntuともSUCCESS**。両OSのログで同一の実値を確認。右tier2のテーブル再配置を x+0.045, z-0.055 とする候補が選出され、5本の頭上交差合計がR105の5／R106の3／R107の2に減少。左右それぞれの行は、offset -0.035: 0/1/0、-0.023: 1/0/0、0: 1/0/0、+0.023: 2/1/1、+0.035: 1/1/1（R105/R106/R107）。床未検出・横断交差は全5本でそれぞれ0。ただし**右側2本は頭上交差が残るため、全館通行と美術品質はHOLD**。通常CIは軽量へ戻し、手動全履歴回帰に重いテストを維持。
- Qwen/Gemmaの追加実推論0、Minecraftワールド操作0、原本・main保護、NOT_PREPARED／9ゲートBLOCKED／BuildPlan.operations=[]。

## R108実装と未完了検証（2026-10-23 JST）

- [R108コード](../scripts/b198zr108-r91-right-lane-hit-triage.mjs)／[テスト](../scripts/b198zr108-r91-right-lane-hit-triage.test.mjs)／[理由・範囲](B198ZR108_RIGHT_LANE_SOURCE_HIT_TRIAGE_JA.md)。R107で残った右翼tier2 +0.023 と +0.035 の頭上交差を、同じ5本の実R91通路とR99レイで確認し直す。各ヒットについて現行面番号／種類／交点／原本R98の同形状番号を記録し、レイ出力が途中打ち切りならHOLD。**R108は実形状を一切変更しない**。
- 既存R60一括レビューのR102比較画面に `R108_R91_RIGHT_LANES_EXACT_HIT_EVIDENCE.json` を追加。原本R98、R105〜R107の既存比較出力は保持。新しいワークフロー/ZIP/CMDは増やさず、PR/Pushは軽量テストへ復帰。重い回帰は手動workflow_dispatchを保持。
- [R108実メッシュ診断CI（commit 7018319、Windows/Ubuntu）](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39968239566) は再開文書更新時に**queued／結果未確定**。同コミットの[別トリガー](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39968246083)も結果待ち。原因の部材、交点の実値、R108最新HEADでの両OS PASSは断言しない。診断CIが済んだら実ログで値を検証する。
- R108追加前のR107全源メッシュは[Windows/Ubuntu両方成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39965968797)。変更されたR102レビュー導線の[軽量R60 CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39967932656)は成功。ただしR108実ソース検証、全履歴/3D美術/歩行認証とは別。CI定義の一時的なYAML誤記に伴う失敗2件（39967972312/39968058324）は修正後に構文解決済み。最新ジョブ結果と区別する。
- 次工程は**計測された種類の当該部材のみ**を候補修正。現行2ヒットの位置・分類を見ずに屋根・床・家具を推測改修しない。5本の床欠落/頭上/横断と家具の読書機能を比較し、改善しなければHOLD。独立の人間美術評価、全館8経路、実歩行、構造、モデル汎用能力はHOLD。
- Minecraft世界操作・新規Qwen/Gemma推論・ローカルWork・施工0。**NOT_PREPARED / constructionApproved=false / executionAllowed=false / 9 BLOCKED / BuildPlan.operations=[]**。main/凍結原本非改変、PR #128 Draft・未マージ。

## R109実装・実メッシュ結果待ち（2026-10-23 JST）

- R108の[確定CI（Windows/Ubuntuとも成功）](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39968239566)をログまで確認。右tier2 +0.023 の残り1件は**現行面4530、R98源面4537、R94本物のテラス上しきい**（交点 x0.5404279/y0.4590857/z-0.6865773）。+0.035 の残り1件は**現行面4148、R98源面4148、R87連続閲覧床**（交点 x0.5367014/y0.4595392/z-0.6751706）。双方とも家具/屋根ではない。線の足元参照 y0.4467679 に対し実床面は約y0.459であり、経路標高とのずれを無視して床を削るのは危険。
- [R109実装](../scripts/b198zr109-realfloor-referenced-r91-route.mjs)、[テスト](../scripts/b198zr109-realfloor-referenced-r91-route.test.mjs)、[詳細](B198ZR109_REAL_FLOOR_DATUM_COMPARISON_JA.md)。R108で確定した床2枚を起点に、同じ5本の経路のうち2本を**元R87/R94/R91実床高へ寄せた研究用代理線**として別に再評価。5点の実床一致、勾配、元の床欠落/頭上/横断Rayとの非悪化、同じ観察点数を検査し、成立しない案はHOLD。**床メッシュは一枚も削除/変更しない。**
- 既存R60の同一レビューに`R109_R91_REAL_FLOOR_DATUM_COMPARISON_EVIDENCE.json`を追加。[R109実源Windows/Ubuntu CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39969992086) は**確認時queued、結果未確定**。[同HEADの別トリガー](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39970000334)も確認時queued。軽量CIは復帰し、完全実メッシュの手動R60回帰にはR109テストを残した。PASS件数・代理線で改善した値はログ確認まで主張しない。
- R109代理経路が減らせたとしても、元のR107実床/頭上問題、現実の入口段差、実アバターの継続通行、建築独創性/美術の人間審査、Qwenの汎用生成能力の合格ではない。源に接続した本物の局所面の修正が必要かは数値と3D美術比較後に判断。Qwen/Gemma追加推論0、Minecraft読取/接続/書込/施工0、ローカルWork0、9 BLOCKED、NOT_PREPARED、BuildPlan空。PR #128 Draft継続。

## R110源床連続経路設計（2026-10-24 JST／実メッシュ結果待ち）

- R109の[実メッシュCI 39969992086](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39969992086)はWindows/UbuntuともSUCCESS。両ジョブで同じ観測：旧R107の5本の頭上Ray合計2、R109条件付き比較では1。右+0.023はR94しきい面に合わせて**頭上1→0**／足元未検出0／横断0、右+0.035はR94しきい→R87テラス床を両端に合わせても**頭上1残留**。よってR109を全線の改善完了と認定しない。
- [R110実装](../scripts/b198zr110-source-contoured-right-room-approach.mjs)／[テスト](../scripts/b198zr110-source-contoured-right-room-approach.test.mjs)／[資料](B198ZR110_SOURCE_CONTOURED_APPROACH_JA.md)。R109未解決の右+0.035についてR91実床の2端・9観測地点の本物のR94/R87/R91三角形に沿って、高さオフセット4候補を比較。各点の横方向±0.023と中央の3サンプル実床近接、隣接勾配≦0.28、連続R99プローブ、5本旧線不変を条件として採否を判定。**まだ実建築を改変せず、通れば研究用OBJ polylineとJSON、通らなければHOLD**。
- R60/R102既存レビューに`R110_R91_SOURCE_CONTOURED_ROUTE_EVIDENCE.json`と経路OBJ（床でない線）を追加。R98/R107/R109の3D原本/家具/床の全三角形は変更なし。Push/PRは軽量スモークへ復帰し、手動完全回帰にR110追加。R110初回実源比較の[Actions 39976426159](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39976426159)と[39976436857](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39976436857)は再開文書更新時点でqueued。**採用候補の有無・実測の改善を推測しない**。
- この研究は単位なしの代理通路であり、物理的な連続床、支持荷重、実人体/実Minecraft歩行、独創性・美術、原本Qwenの汎用能力はすべて未認証・HOLD。新規Qwen/Gemma推論、Minecraft接続/読取/書込/施工、ローカルWorkの実施なし。NOT_PREPARED／9 BLOCKED／BuildPlan空、PR #128はDraft未マージ維持。

## R111実装・源形状再評価（2026-10-24 JST／実メッシュ判定待ち）

- R110の[Windows/Ubuntu実源CI #39976426159](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39976426159)は両OS成功、ログ同値。右翼tier2 R91→R94/R87の9地点すべて横幅3点で床有／最大源勾配0.125942。ただし4つの高さ候補0.003/0.004/0.005/0.006はすべて頭上Ray7・床未検出0・横断0で不採用。旧R109の+0.023側条件付き成功と、+0.035側のHOLDを混同しない。
- [R111実装](../scripts/b198zr111-reversible-floor-finish-transition.mjs)／[専用検証](../scripts/b198zr111-reversible-floor-finish-transition.test.mjs)／[資料](B198ZR111_REVERSIBLE_FLOOR_FINISH_TRANSITION_JA.md)。R110の7交差の実三角形番号/kindを検証し、**全交差が源の真正テラスに裏付けられたR87またはR94の薄い床仕上げだと証明できる場合だけ**、つながった仕上げ三角形の高さを源床+0.001/+0.002とする**実3D比較案**を作成。源R98本体、R107歴史形状、読書家具、入口門柱、元の床を残す。5経路床/頭上/横断非悪化とR110の幅3点・9地点・勾配・頭上の改善を求める。条件不足は形状不変HOLD。
- R60の既存画面にR111 JSON/OBJ、および合格候補が存在したときだけ同カメラ比較図を追加。旧ZIP/CMD/Workflowを増やさず既存Windows/Ubuntu CIの当該コミットへR111の実源1回試験を投入し、その後はPush/PR軽量スモークへ復帰。手動の完全回帰にはR111実源テストを保持。現時点の[Actions #39978338498](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39978338498)と[#39978346028](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39978346028)は最終確認でqueued。**R111による形状変更の採否・7件のsource種類・新しい通行性能は未確定**。コードコミット成功を実QA成功と混同しない。
- 現行建築の美術・独創性・人体歩行・荷重支持・Minecraft教育版検証、Qwen/Gemmaの汎用建築能力はHOLD/未検証。施工・ワールド接続/読取/書込・追加推論・ローカルWork禁止、NOT_PREPARED・9 BLOCKED・BuildPlan空、PR #128 Draft・未マージは継続。

## R112実形状への修正（2026-10-24 JST／初回実源結果待ち）

- R111[Windows/Ubuntu実メッシュCI #39978338498](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39978338498)は双方SUCCESS、ログが一致。R110の7頭上ヒットは**全部R93右翼灯籠庇**の同一現行三角形4474（`right_R93_ANGLED_LANTERN_CANOPY_ART_STUDY`）。R87/R94の床仕上げを疑ったR111は原因違いだったため**形状変更0、HOLD**。実床9地点×横幅3は実源が見つかり勾配0.125942、交差7件は消えていない。
- [R112の実形状実装](../scripts/b198zr112-lantern-canopy-clearance.mjs)／[テスト](../scripts/b198zr112-lantern-canopy-clearance.test.mjs)／[設計](B198ZR112_LANTERN_CANOPY_RELIEF_JA.md)。問題のR93灯籠庇の共有辺連結トライアングルを取得し、**書架の外側取付点を残して内側張り出し縁だけ後退**する4案（係数0.35/0.55/0.75/0.88）を実メッシュ比較。旧R107の5本の床/頭上/横断Ray非悪化、R110の連続床/勾配/頭上Ray改善、無関係の元床・家具・外殻・玄関非変更を必須にする。基準源のR98/R107形状は別保持。採用根拠なしなら元形状のままHOLD。
- R60の既存同一レビューにR112 JSON/3D比較OBJ、採用時のみ同カメラ比較図を追加。初回両OS実源試験は[Actions #40024243758](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024243758)と[#40024249354](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024249354)に固定。**この文書更新時点では実値・採用不明**。通常Push/PRは軽量テストへ復帰し、手動の全歴史回帰にR112実源テストを残した。
- アート品質と人の連続移動/頭上空間/荷重・支持・Minecraftワールド施工・実LLM汎用建築能力はHOLD。NOT_PREPARED／9 BLOCKED／BuildPlan空、新規推論・ワールド接続/読取/書込/施工・ローカルWork 0、main/凍結原本/PR #128 Draft維持。

## R113内側採光稜線の3D改修（2026-10-24 JST／実源CI結果未確定）

- R112の[実メッシュCI #40024243758](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024243758)でWindows/Ubuntuが共にSUCCESS、実ログ一致。R93灯籠庇の共辺2三角形（4473/4474）について内側の張り出し縁を0.35/0.55/0.75/0.88だけ後退させた4形状は、全てR110コンター経路の**頭上Ray7→7**、床欠落0、横断0、旧5本の各Rayは非悪化。**4案とも不採用、R112で採択した形状改変は0**。単に庇を狭めるのは有効でないと判明。
- [R113実装](../scripts/b198zr113-pitched-lantern-daylight-canopy.mjs)／[テスト](../scripts/b198zr113-pitched-lantern-daylight-canopy.test.mjs)／[資料](B198ZR113_PITCHED_LANTERN_DAYLIGHT_JA.md)では、R112の局所・共辺・棚縁保護を維持し、内側採光稜線の後退と高さ増分を同時に設計。4案（0.55/+0.06, 0.65/+0.09, 0.75/+0.12, 0.88/+0.15；正規化値）。旧R107 5通路のRay非悪化、R110の実床9地点×3サンプル/勾配/頭上改善、外壁屋根マージン確保を厳格に要求。**実際の3D形状を比較し、条件が足りなければHOLD・旧形状を完全保持**。
- 既存R60レビューにR113 JSONとOBJ、採用された場合のみR107との同カメラ比較を追加。[一度だけの実源CI #40024745083](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024745083)、[#40024765222](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024765222)は再開文書更新時点でqueued。**採用数・頭上改善数は未確認であり断言しない**。Push/PRは軽量試験に戻し、既存R60手動フル回帰に重いR113を継続。
- 元R98/R107/R112・凍結B143/Qwen、main、旧Freezeは非変更。実モデルによる未知用途への生成能力、人体の実歩行/荷重、建築美術（正面/斜視/側面/内部/入口）の独立判断はすべて未認証。施工・Minecraftワールド接続読取書込・追加モデル推論・ローカルWorkを行わずNOT_PREPARED／9ゲートBLOCKED／BuildPlan空。PR #128はDraft・未マージ。

## R114六視点レビューの採択時不具合を修正（2026-10-24 JST）

- R113の源メッシュ4候補のWindows/Ubuntu CI [#40024745083](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024745083) と [#40024765222](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024765222) は**R114作業時点でqueued、数値未確認**。R113の形状採用は未確定。古いR112が7→7で不採用だった事実は維持。
- 新たに、R111/R112/R113のR60レビューで**形状変更が成功した場合だけ**、既存R97描画器が要求する3形状ではなく2形状を渡して `THREE_SOURCE_VARIANTS_AND_DETAIL_FOCUS_REQUIRED` エラーになる不具合を発見。先行R111/112はHOLDのため露呈していなかった。**成功経路の回帰欠落**をそのまま残さない。
- [R114実装](../scripts/b198zr114-actual-three-pane-art-review.mjs)／[テスト](../scripts/b198zr114-actual-three-pane-art-review.test.mjs)／[資料](B198ZR114_TRUE_THREE_PANE_ARCH_REVIEW_JA.md)。元の実全館メッシュ、改修後の実全館メッシュ、実変更部分の源三角形だけを抽出したCLIPPED局所面の**3ペイン×同一カメラ6視点**へ統一。変更元のkind・SHA/全館非変更範囲・六視点の面数を照合し、比較元を捏造しない。R60同一レビューと `R114_REAL_THREE_PANE_ARCHITECTURE_REVIEW_EVIDENCE.json` に統合。
- R114専用quick testを既存Windows/Ubuntuの軽量Push/PR CIへ、同テストを従来の手動フル回帰へ追加。完了まではテスト成功を主張しない。**新たな建築修正を採用したわけではない**。人の美術判定や3D構造・屋根・実Minecraft動線を6視点の画家順SVGで認証しない。
- 引き継ぎは本ファイルを継続更新。R113の実源Ray改善/棄却を確かめた後だけ次の形状意思決定に進む。旧R98/Qwen・R107、main/Freeze、PR Draftを保持。NOT_PREPARED／BLOCKED×9／BuildPlan空／追加推論0／Minecraft世界操作0／ローカルWork0。

## R115実形状の本棚一体型・高窓庇研究（2026-10-24 JST／実源CI未確定）

- R113源メッシュ4候補[初回実源CI #40024745083](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024745083)と[R114の修正CI #40025353582](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40025353582)は本工程着手時点でqueued。**前工程の形状採用・改修成功を主張しない**。
- [R115実装](../scripts/b198zr115-integral-lantern-clerestory.mjs)／[試験](../scripts/b198zr115-integral-lantern-clerestory.test.mjs)／[説明](B198ZR115_REAL_INTEGRAL_LANTERN_CLERESTORY_JA.md)。R111で**同一R93庇面4474への実交差7件**とR112での**内縁のみ後退4案7→7の失敗**に基づき、R93のキャノピーだけでなく、その**真正の共辺接合を持つ書架壁の上端**も一緒に上げる局所造形を実装。屋根・読書用途・書架壁を消さず、壁の下端、実床、書机、玄関、外殻を完全保持する。4候補は正規化上昇+.07/+ .10/+ .13/+ .16。原本R98・R107のSHA、真正源4三角形（キャノピー2＋書架壁2）の共有上端と他面の不変性、旧5経路のRay非悪化、R110の実床9×3と交差改善、屋根マージンを保証できない案はHOLD。
- 既存R60レビューへR115 JSONと全館候補OBJを追加し、候補が検証に採択されたときだけR114の**元全館／変更後全館／変更面のみの実源3ペイン×6視点**を作成。R114にはR115の書架壁kindの保護された差分だけ追加許可。R115の専用quick試験を既存軽量PR CIと既存手動フル回帰へ、実源試験は**このR115コミットのpushだけ**を条件に追加し、以降の通常pushで重いテストを繰り返さない。ZIP/CMD/Workflowの増設なし。
- **この時点でR115の実測値・選ばれた建築案は未確定**。GitHub Actionsの実行範囲・実ログを確認してからのみ採否を公表。c01はLLM新規生成ではなく独立手続き型の研究であり、建築の独創性/人体実歩行/荷重/実Minecraft/汎用生成は未認証。NOT_PREPARED、9 BLOCKED、BuildPlan空、Qwen/Gemma0、Minecraft接続読取書込施工0、ローカルWork0、main/Freeze/凍結原本保存、PR#128 Draft継続。

## 直近CIの注意点（2026-10-23時点。変化したら再確認）
- [R44 Windows CMD](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39914804614)：46を期待、実ファイル47で `R44_EXACT_SOURCE_COUNT_EXPECTED_46_ACTUAL_47_BASE_37_OVERLAY_10`。ファイル数合わせではなく期待リストと実マニフェストを照合する。
- [B198H Chromium](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39914803840)：Playwright 1.56.1が当該Ubuntu 26.04のChromium導入に非対応。ブラウザ審査自体はこのCIで未実施。
- [R55 workflow](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39914889413)：失敗状態。取得結果から根因を断定できない。
- PR本文はR1〜R17中心で、後続R77〜R96の要約が古い。再開時に整える価値がある。

## R97の残作業とR98への移行条件
1. 現在HEADとPR #128、最新CIを再照合。
2. R97で生成される6視点×3版の比較HTMLを実際に開き、同一カメラ/倍率と形状描画を人が確認する。新規建築画像を生成して証拠と混同しない。
3. R95で見つかった右側最上層tier3の頭上外殻交差、7室の通行/視線/窓部支持の形状上の問題を目視と実メッシュで検討。
4. 明確な欠点と優先順位をまとめ、R98で形状修正する対象を絞る。審査していない美術をPASSにしない。
5. 既存R60レビューの導線を再利用し、新規ZIP・CMD・モデル推論・Minecraft接続を増やさない。
6. R97の最新HEADでのCI結果と実HTML美術審査を区別して報告し、重要な改善対象が明確になってからR98へ移る。

## 次の研究段階（変更可能な計画）
- R98：R97で証拠の得られた美術/頭上高/接合上の重要欠点を比較バリアントで直す。
- R99：入口→左右7層→上階ラウンジの有限幅・有限頭上空間の利用性を独立に再審査する。
- R100以降：図書館に依存しない「自然言語→独自建築構想→用途/内部統合→実3D→レビュー→修正」の汎用生成能力に研究を戻す。新たな実Qwen推論は必ず個別の明示承認が必要。

## ここをどう更新するか
- **日次更新しない。** 新しいチャットへ移るだけなら文書変更は不要。
- 実装と検証に意味ある節目（例：R97完了）ができた時だけ、この「現在地・次工程・CIの注意点・未解決」の事実を短く更新。コミットのたびに巨大な全履歴を書き直さない。
- 新旧の食い違いではGitHub最新HEAD/当該コード/Actionsが優先。安全方針は固定憲章を優先。履歴の詳細は既存のR番号doc/Gitコミットへ参照させる。
- `README.md`は入口リンク以外を毎回編集しない。更新でワークフローを増やさない。

## 新チャットで送る最短メッセージ
> MinecraftAIBuilderを継続。GitHubの `docs/AI_RESTART_JA.md` と `docs/AI_PROJECT_CHARTER_JA.md` を読み、PR #128の最新HEAD・CIを再確認して次工程を進めて。安全境界を維持。
