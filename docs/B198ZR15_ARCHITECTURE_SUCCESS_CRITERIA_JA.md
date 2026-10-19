# MinecraftAIBuilder — R15 実Qwen「次回は何をもって成功とするか」品質評価契約
2026-10-19 / 検証対象は既存の凍結 B198B c01 海沿い巨大未来型公共図書館
独立したR13旧報告と新候補の比較・施工無し・新規実Qwen推論無し

## なぜR15が必要なのか
以前承認された **たった一度の実Qwen** (`qwen3.8:27b`) は、出力上限 **3,072/3,072トークン** に達してJSONが途中終了した。旧生成を後からQwenが成功したと主張してはならない。R9～R10で記述形式（階段/反復）を圧縮し、R11でシステム指示を簡潔にしたが、それは次の実モデル結果をまだ証明していない。R12～R14は安全・軽量で実行せずに検証できる環境を整えた。**R15では、建築としての実用性と独創性を判断する観点を凍結したc01要求に一致させ、実質的な改善と単なる形式修復を切り分ける。**

## 基準対象（固定）
**海沿いに建つ大きな未来型の公共図書館。中央には屋根まで続く巨大な吹き抜けがあり、左右に立体書架、最上階には透き通った星空観察ラウンジを配置。外観は曲線的で統一感を出す。**

- 固定した4個の評価軸：
  1. 図書館として明確に読める公共建築
  2. 中央が単なる塊ではなく大きく抜けている
  3. 展望ラウンジが高層にある
  4. 曲面と階層の外観に統一感がある
- 既存B198W評価ボードの**0～4点**と**15～750文字の部位・位置などの根拠**をそのまま利用。元の書式・点数を再発明しない。
- 今回からの **「オフラインで手動の品質目標を満たした」と仮に判断する目標値**：各軸で最低3点、4点の軸が2つ以上。これは前回の凍結採点指標そのものを変えるのではなく、R15の**次の実モデル試験前の暫定比較目標**（ユーザーが最終採用を決める）。ChatGPTが0～4点を勝手に付けない。
- 0：満たさない／1：大幅に不足／2：一部は満たす／3：おおむね満たす／4：明確に満たす。点数が低ければ次の設計改善へ戻る。人間の4点が多くてもMinecraft施工は承認されない。

## 厳格な段階判定（出力JSONの完成≠建築の成功）
1. **異なる原本を要求**。古いR6 ZIPの再検証・コピー・再圧縮は新しい設計実績として数えない。原文SHA-256と、固定したc01課題SHAが一致することを確認。
2. **構造が完成していること**。ネイティブ推論完了理由と原本の4-key JSON (design,spatialPlan,explanation,assumptions) の完結。単に`3072`に達しなかっただけでも、JSON不正ならHOLD。
3. **B143で厳格に成立する形状**。設計データの正当なソースSHA・幾何SHAを保存。R9の`staircase`、R10の`repeat`を使っても、結果の実ボクセルで正しく検査する。
4. **R3で独立した概念空間の動線検証ができること**。入口の安全な立ち位置、頭上空間、中央の保護空洞、階床・上階・目的地への通路が成立する。モデルが`circulationStrategy`に「通れる」と書いただけでは通行成功にならない。
5. **B198W凍結sourceGoals**。ブロック数・高さ・材質の多様性・形状の多様性を検査。**この数値検査自体で「図書館に見える」「美しい」とは一切判定しない**。重大な形状リスクがあれば人間レビューを要求する。
6. **原本由来の証拠**。R13で原本・固定課題・レビュー用SHA等の不一致をHOLDし、モデル由来はユーザー提供の自己申告として保存。独立したモデル本人性認証はない。
7. **3Dを見た人間によるB198W採点**。4点満点の上記4軸で各3点以上、うち少なくとも2軸が4点。評価根拠は保存した`sourceSha256`+`geometrySha256`と一致する**同じ作品だけ**に付けられる。別の作品の評価を横流しすると拒否する。
8. 上記が揃っても`OFFLINE_HUMAN_REVIEW_TARGET_MET_WORLD_UNVERIFIED`という限定的ステータスのみ。**Minecraft Education実機のブロック形状・材質・衝突・アバター歩行・階段登坂、原作再現や自然言語での追加入力による修正能力は未検証**。最終プロジェクト完成／建築施工の承認をしない。

## R15で実装した成果
- `source/ai/b198zr15-evidence-quality-target.mjs`:
  `evaluateR15Comparison({baseline,candidate,human})`。baseline/candidateは過去と次回の**R13_OFFLINE_QUALITY_DECISION.json**。humanは任意の、B198W公式画面からダウンロードした**B198W_HUMAN_REVIEW_c01.json**。資料が不完全なら、手動評価を使って不完全なJSONを合格にしない。
- `scripts/b198zr15-compare-saved-reviews.mjs`:
  `node scripts/b198zr15-compare-saved-reviews.mjs --baseline <R13 old JSON> --candidate <R13 new JSON> [--human <B198W JSON>] --out <new distinct directory>`
  元ファイルを変更せず、**R15_OFFLINE_COMPARE.json と R15_OFFLINE_COMPARE.html**を新規保存。HTMLは静的日本語。ネットワーク／モデル呼び出し／JavaScript自動実行なし。
- 主な状態:
  - `HOLD_SAME_RAW_NOT_NEW_GENERATION`: 再監査だけでは新しい建築生成ではない
  - `HOLD_CANDIDATE_SOURCE_OR_PROVENANCE`: 4キー/形状/R3/出所に問題
  - `HUMAN_VISUAL_REVIEW_REQUIRED`: 機械検査のみ合格
  - `REVISE_ARCHITECTURE_HUMAN_TARGET_NOT_MET`: 本来の見た目・機能要件の得点不足
  - `HOLD_HIGH_RISK_GEOMETRY_FINDINGS`: 人間が高評価でも重大な形状上の注意が残る
  - `OFFLINE_HUMAN_REVIEW_TARGET_MET_WORLD_UNVERIFIED`: オフラインの**自己申告された**評価目標に限って達成。実世界は未承認。
- 旧R6未完成から新R6の4-keyが完成したときは `recoveredCompleteFourKeyOutputComparedWithBaseline=true` として**形式面の前進だけ**を記録。`jsonCompletionIsNotArchitecturalImprovementProof=true` を必須出力。

## 検証と誠実な説明
- R15の開発で、**実際の新Qwen設計を作ったとは主張しない**。テストでは旧R6型未完成文字列と、以前ChatGPTが提案したR2図書館（15,312ボクセル、**ASSISTANT-AUTHORED**）を再利用し、今後の比較パイプラインを検証する。
- モック領収書で`USER_SUPPLIED_REAL_MODEL_CLAIM`と書いても、独立した本人性確認は得られない。人間の点数も明示したテスト用ダミーデータであり**実際のレビュアーが評価したものではない**。
- R15の適正なスコア（4,4,3,3等）、低得点、空間計画HOLD、形状SHAの取り違え、旧原本再提出、任意の文字列を含む根拠でのHTMLエスケープ、出力上書き防止などをCIで検査。全体のQwen追加推論は0回。
- 繰り返しのQAで「本物のQwenによる高品質建築」を成し遂げたことにしない。次の真の前進は、**ユーザーが改めて承認した単発の実Qwen R11プロファイル生成の原本をもとに、R13→R15へ評価し、人間が見る**こと。
- 以前の軽量R8/R12/R14 ZIPは改変しない。R15は新しいダウンロードアーティファクトに混ぜない。次回再実行には新しい許可および別の軽量準備が必要。

## 状態
`NOT_PREPARED`、9件の`BLOCKED`、`BuildPlan.operations=[]`、Minecraft World read/write 0、実Qwen追加推論0、Work利用無し、main merge無し。PR #128 は Draft のまま。
