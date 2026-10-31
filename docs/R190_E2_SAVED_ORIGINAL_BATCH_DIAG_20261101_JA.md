# E2実Qwen原本の一括診断（2026-11-01 JST）

目的：先行 `E2_QWEN_REPORT.json` では実モデル1回、原文SHA保存、SOURCE_HOLD の最初の違反 `E2_PROGRAM_ZONE_0` が確定。しかし原文が未提示なので、その具体的な値や別の潜在エラーはまだわからない。推測で直さず、PCに保存済みの元Qwen回答を診断する。

更新後、**`.\RUN_R125_FREE_BUILD.cmd study-e2-diagnose`** を1回実行。最新 `E2-qwen-*` の `E2_QWEN_REPORT.json` と `QWEN_E2_ORIGINAL.txt` を自動発見し、SHA256一致を検査してから、programSpaces全体のzone・witness、エントランス、ガラスの寸法と位置、独立B143契約などをまとめて検査。検出可能な複数の構造問題を同じレポートに集める。対象元ファイルは変更せず、新規 `E2-diagnosis-*` に `E2_ORIGINAL_DIAGNOSIS.json` を保存しExplorerを自動起動。

不正な構造がある限り新たなSOURCEを生成したり、アート採用扱いしたりしない。モデル推論0、Minecraft操作0、MakeCode出力0、ホスト側の建物修復0。SHA違反なら一切診断出力を作らず拒否。

次回以降のE2実モデルHOLDでは、`E2_QWEN_REPORT.json` の `validationIssues` に独立診断の具体項目を記録する。既存の唯一正本SOURCE判定は変えない。仮に構造フィールドが無欠なら、真正SOURCEの物理検査で最初に見つかった問題も追記するが、SOURCE合格と美術合格を混同しない。

原文は今回の添付には含まれないため、現段階でE2_PROGRAM_ZONE_0の数値的な違反原因を断定できない。診断後、その結果を根拠に設計インターフェースの改訂をまとめて行う。安易な自動修復・テンプレート・大量再試行は引き続き禁止。
## 保存済み実モデル診断の取得後に確定した事実（2026-11-01 JST）

ユーザーが提出した `E2_ORIGINAL_DIAGNOSIS.json` を根拠に、実モデル原本のSHA256 `ced1a8a2fcbb8b1ebd07bf0729cc73ad3a0f9cd073ba775658d0fdb5921cae3c` がローカル診断で一致したことを確認。元の `SOURCE_HOLD / E2_PROGRAM_ZONE_0` は維持。診断報告には7件の違反が記録されている。

- `programSpaces[0].zone=[0,22,16,4]` のz開始値22と奥行4は、原本の敷地奥行24を越えるため不正。対応する `witness=[2,20]` は当該zone外。
- `entrance.approachPad=[12,0,22,2,2]` と `arrivalPad=[12,2,22,2,2]` は5整数であり、契約上の2整数 `[x,z]` と一致しない。
- `glazedOpenings[2].width=1` および `glazedOpenings[3].width=1` は最小2の制約を満たさない。

これは**原本そのもののレビュー結果ではなく原本をローカルで検証した診断レポート**であり、モデル応答の他の造形・用途の質を断定しない。構造エラーが先にあるためSOURCE物理監査は `SKIPPED_INVALID_INPUT`、美術 `NOT_REVIEWED` のまま。既存原本に対する新モデル呼び出しはゼロ、Minecraft操作ゼロ。

### 次の実装方針（E2 prompt v2、モデル再試行なし）

1. 著作者への出力契約に `[x,y,z]`（B143形状）、`[x,z,width,depth]`（zone）、`[x,z]`（witness/entrance pad）の違いを明示し、敷地内区画・2×2 witness包含の不等式と窓幅2以上を事前チェック項目にした。固定住宅・研究施設テンプレートやホスト幾何補修は追加しない。
2. 実診断の5分類7違反を合成データで一括再現し、診断が複数の失敗を見つけても正式SOURCEと建築美術に偽のPASSを与えない回帰テストを追加。
3. 原本・SHA・既存検査ゲート・E1原本を一切変更しない。次の実Qwen POSTは未実施であり、この修正でモデル品質が上がったとの主張は**できない**。CI結果と改訂版の実モデル証拠が揃うまで `SOURCE_HOLD / ART_HOLD` を維持する。

実モデル再実験では、従来の `study-e2` 入口を明示的に起動する必要がある。原本自動修復・自動再試行・Minecraft書込は行わない。更新後も main と Draft PR #128 を維持する。

## E2実機次工程の一括起動・Chat原本ハンドオフ（2026-11-01 JST）

`RUN_E2_NEXT_SAFE.cmd` を追加。正規Windowsプロジェクトフォルダ上で対象ブランチ・Git clean・fast-forward-only取得・独立オフラインE2テストを順番に検査し、不成立の場合は**モデル送信前に停止**する。成功時のみ、既存の `r190-e2-qwen-study.mjs` によりローカルQwen設計依頼を最大1回実行する。強制リセット・強制push・main変更なし。

`E2_CHAT_HANDOFF.json` を同じ `E2-qwen-*` フォルダに保存する。従来の凍結 `QWEN_E2_ORIGINAL.txt` と `E2_QWEN_REPORT.json` に加えて、SHA256、厳格SOURCE結果、診断と**モデル原文をそのまま含む単一アップロード用JSON**。原文JSON自体が壊れていてもHOLDと診断を保持し、事前のモデル接続失敗なら偽原文を生成しない。

本工程の実モデル新規POSTは未実施であり、合成CIの成功を美術・実Minecraftの成功に読み替えない。ARTは独立の人間審査が終わるまでHOLD。世界接触・施工・MakeCode書込を禁止する旧安全条件は維持。
