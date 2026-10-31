# R190-BH — 真正な過去の失敗から改善点を絞り、A/B比較〜人間批評を一体化する

基準日：2026-10-29 JST。既存Draft PR #128、feature/b198zr1-protected-architectural-revision。実Qwen/Gemmaの新しい呼び出し・Minecraftワールド操作・main変更は禁止。ART HOLD・正式美術採用0。

## これまでの反省に対する方針
R190-BC〜BGで、設計先行プロンプト、同条件の直接B143/R4モデル研究、保存原文比較、真正3D、五方向投影、断面、人間採点画面が段階的に実装された。しかし成果は模擬通信が中心で、**本当のモデル設計が綺麗になったという証拠はまだない**。さらにBF比較の後にBGの別コマンドが必要だった。各工程の独立性は維持しながら、手作業を減らし、実際の保存モデル原文で失敗理由を可視化する。

## 工程1：BFの比較からBGの人間審査画面へ自動接続
`scripts/r190bf-controlled-pair.mjs`が従来の`compareR190BESaved`を実行した直後、**両候補に真正B143がある場合だけ**、同じ比較フォルダー配下に`R190BG_HUMAN_REVIEW/R190BG_REVIEW.html`を生成する。
この追加の経路は `scripts/r190bg-source-anchored-review.mjs` の既存ビュー/審査コードを再利用し、専用の固定ディレクトリ名だけを例外的に許可する。既存のA/B原文、BE比較証拠、3Dビューは上書きしない。人間レビューが作れない組み合わせは`HOLD_NO_VALID_B143_PAIR`で、架空の3Dを補完しない。
有効なB143だがR4/動線がHOLDの案は、欠陥を批評できるように原物のまま人間審査画面へ表示する。ただし工学・歩行・建築用途・美術の合格とはしない。

## 工程2：保存済みの実Qwen原本を、直さずに多面的診断
新設 `scripts/r190bh-actual-original-postmortem.mjs` は、実際に保存された `evidence/r190aa/pilot-01/MODEL_RESPONSE_ORIGINAL.txt` をSHA256 `0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17` で照合し、B143/R4の原文契約を解析する。必ず元のバイト列のまま読み、元形状を生成・補修しない。

保存原文から直接確認された問題の種類：
- 最上位に規定外の `attempt`、`maxAttempts` がある。
- `design.schema` が正規の `minecraftaibuilder-b143-building-dsl-v1` ではなく `b143`。
- 3件のCUTの `material:null` は、材質キー自体が許されないという契約と矛盾。
- `staircase.axis` はB143でx/zのみ許可されるのにy。
- 入口 `[10,0,10]` はリテラルの追加BOXである基礎・床と重なる。
- 読書室目的地 `[10,14,10]` は上階の床のリテラルBOXと重なり、高さ16に対して立脚高さ14＋要求頭上空気3が境界を越える。

上のBOX交差は**原文のADD-BOXへの直接的な位置比較**であり、不正なB143原文から完成済みボクセルを逆生成したのではない。CUTを適用した最終形状の証明とは扱わない。原文が無効な限り、この工程は3Dを捏造しない。

## 工程3：回帰の証拠
`scripts/r190bh-actual-original-postmortem.test.mjs` は実原本の元ハッシュ、別々の不一致、入力改変拒否、未生成の3D、9つのBLOCKEDゲートを実行時に確かめる。既存 `scripts/r190bf-controlled-pair.test.mjs` に、1回の比較でBGの原形状コピー/審査画面まで生成されることを検査する。GitHub ActionsはUbuntu 24.04とWindows latestで、**偽モデルの通信テスト＋この実保存原文の読み取り試験だけ**を実行し、診断JSONをアーティファクトとして保存する。実推論を開始する権限をCIに与えない。

## 次の改善方向と限界
新しいモデルの命令を固定形状や建物カテゴリへ誘導するのではなく、観測された失敗（スキーマ・CUT・階段軸・入口座標・頭上空間・実支持床）を発生率として評価し、どの指示に効果があったかを新規真正回答で比較する。既存1件の不正原文だけではモデル全体の性能、設計先行の改善、美観・人間体験の良さは証明できない。
本工程が終わったら、実験者がR190-BFでユーザー承認済み各1回のモデル回答を得た場合に限り、同じBF比較操作によって本物のB143、五方向投影、断面、BG人間審査画面を一括生成できる。再試行・Minecraft施工・自動ART認定はない。

## 安全境界
`NOT_PREPARED`、`constructionApproved=false`、`executionAllowed=false`、9×`BLOCKED`、`BuildPlan.operations=[]`、`worldContacts=0`、`worldWrites=0`、`ART_HOLD`、正式美術採用0。PR #128はDraft・未マージ。main、強制pushは変更しない。
