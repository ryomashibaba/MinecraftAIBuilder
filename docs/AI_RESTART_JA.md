# MinecraftAIBuilder — AI再開入口・現在地（短い更新文書）

**新しいチャットの最初にここを読む。** [固定憲章](AI_PROJECT_CHARTER_JA.md) と併読。毎日の完全統合引き継ぎ文は不要。
この文書は**最後に人がGitHubで確認した時点のスナップショット**であり、自動更新の生データではない。再開時は必ずブランチとActionsを最新確認する。

## 現在地（2026-10-23 JSTに確認）
| 項目 | 確定情報 |
|---|---|
| リポジトリ | [ryomashibaba/MinecraftAIBuilder](https://github.com/ryomashibaba/MinecraftAIBuilder) |
| 継続ブランチ | `feature/b198zr1-protected-architectural-revision` |
| 継続PR | [#128](https://github.com/ryomashibaba/MinecraftAIBuilder/pull/128) — Open / Draft / Unmerged |
| HEAD | [開発ブランチの最新HEADを毎回GitHubで確認](https://github.com/ryomashibaba/MinecraftAIBuilder/commits/feature/b198zr1-protected-architectural-revision)（R98の初期実メッシュ検証対象は `9a2b5de9d8ba41a2b7ca4e626aa9d54ff4ffffdd`） |
| 最新確認済み実装工程 | **B198Z-R99：有限幅／頭上／足元の実三角形検査を実装。全館CI確認中（PASS未宣言）** |
| 次に取り組む工程 | **R99の両OS CIと8経路の実測結果確認→主要障害箇所の形状修正を優先** |
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
