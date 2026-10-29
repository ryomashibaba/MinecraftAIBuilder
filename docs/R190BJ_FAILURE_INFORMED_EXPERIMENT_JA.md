# R190-BJ — 失敗型に基づく新しい設計先行候補（オフライン準備）

基準：2026-10-29 JST。既存Draft PR #128（未マージ）、既存ブランチ継続。品質・美術優先／モデル自身の設計／汎用性／安全を維持する。

## 判定の根拠（保存済み実Qwen原文）
`evidence/r190aa/pilot-01/MODEL_RESPONSE_ORIGINAL.txt` を SHA256 `0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17` として扱う。BHは最上位キー、B143スキーマ、CUT material:null、階段axis:y、入口と上階目的地のADD-BOX内衝突、頭上空気が高さの上限を越えるという**原文上の失敗型**を示した。原文が不正なため完成ボクセルや歩行を証明してはいない。

## BJの具体的な改善
既存BCの設計先行プロンプト（モデルが用途→空間→断面→質量・空洞を設計）をベースに、**観測された失敗型からだけ**以下の一般的な自己点検を追加した。

- B143 schemaと4最上位キーの厳密さ
- CUTのmaterial省略、階段axis=x/z、立脚座標と床支持・頭上空間
- 目的地y+headroomの高さ上限と、最終ADD/CUT後の実空洞
- 美術・用途・独自設計の優先、失敗は隠さず未成立と明記

形状、座標、用途、屋根、建築カテゴリをホストから指定しない。**長い指示が品質を上げるかは不明**であり、これはあくまで未検証の候補である。過去のQwen失敗は別の依頼・モデル条件であり、新しい要求への性能一般化を証明しない。

## 技術と既存成果の再利用
新設 `scripts/r190bj-failure-informed-prompt.mjs` はオフラインのみ。元日本語依頼と保存原文の厳密なSHAを受け取り、BCと別フォルダーへ以下を保存する。

`ORIGINAL_BRIEF.txt`、`DESIGN_FIRST_PROMPT.txt`、`R190BJ_ARCHIVED_ORIGINAL.txt`（元バイトをそのままコピー）、`R190BJ_ARCHIVED_DIAGNOSIS.json`、`R190BJ_PROMPT_RECEIPT.json`。

既存 `inspectR190BDPrepared` がBCまたはBJを別種のSHA付き入力として判定し、BFの`--prepare`/独立A・B capture/compare、BEの真正3D・5投影・断面、BGの人間審査まで**既存実装を再利用**できる。BJを既存BC原文に見せかけないため、BF側の候補種別とBE reportの `candidatePromptKind` を明記する。

## オフライン準備（新規実モデル推論は禁止）
```powershell
node scripts/r190bj-failure-informed-prompt.mjs --brief PATH_TO_BRIEF.txt --brief-sha SHA256_OF_BRIEF --archived-original evidence/r190aa/pilot-01/MODEL_RESPONSE_ORIGINAL.txt --archived-sha 0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17 --out NEW_BJ_PREPARED_DIR
node scripts/r190bf-controlled-pair.mjs --prepare --prepared NEW_BJ_PREPARED_DIR --model qwen3:14b --out NEW_BJ_PROTOCOL_DIR
node scripts/r190bf-controlled-pair.mjs --capture --prepared NEW_BJ_PREPARED_DIR --protocol NEW_BJ_PROTOCOL_DIR --side A --out NEW_A_CAPTURE_DIR
node scripts/r190bf-controlled-pair.mjs --capture --prepared NEW_BJ_PREPARED_DIR --protocol NEW_BJ_PROTOCOL_DIR --side B --out NEW_B_CAPTURE_DIR
```

後半2行は承認フラグを指定していないため**通信0、出力作成0**である。承認前に実推論するスクリプトやワールド施工を作らない。将来モデル実行を行う際はA/Bそれぞれに当該範囲の明示的承認が必要で、独立した2呼び出し・再試行0を維持する。

## 比較と限界
BJは**直接B143 A方式対、失敗型を考慮したBJ-B方式**の実験候補。従来のBC-B方式と同じ試験ではないので、BJがBCより優れていると主張しない。同じ元日本語依頼・モデル要求値・保存原文・SHA・真正3D・人間評価を監査する。合成テストの成功は通信制御の証明にすぎず、美観や汎用設計能力の改善を証明しない。

## 安全
`readiness=NOT_PREPARED`、`constructionApproved=false`、`executionAllowed=false`、ゲート9個BLOCKED、`BuildPlan.operations=[]`、`worldContacts=worldWrites=0`、`ART HOLD`、正式美術採用0。main変更、マージ、Draft解除、force push、無承認Qwen/Gemma推論、Minecraft接触は禁止。
