# R125 — 好きな日本語依頼からLLM→MakeCodeまで（保護付き試験版）

2026-10-31 JST。前提は「Minecraft Educationに希望建築を作れるようにする」。技術検証・CIの増殖を最終目的にしない。

## 今回の到達点
- Qwenによる花屋933予定ブロックの旧実機初回施工成功。入口・室内移動・用途設備は未確認。原本凍結。
- 合成3素材建築：502予定セル（stone348/oak_planks144/glass10）、2026-10-31ユーザー提示実機スクリーンショットで木材の屋根・石の壁・ガラス窓と `Positions and material counts match` を確認。詳細は `docs/R125_THREE_MATERIAL_REAL_WORLD_PASS_20261031_JA.md`。
- `configs/r125-education-verified-palette-v26.33.json` に木材のみ実機確認したブロック名を記録。stone/glassは原エクスポーター既知。その他は未確認、無断のstone代替なし。
- `scripts/r125-free-build.mjs` と `RUN_R125_FREE_BUILD.cmd` で、毎回自由な日本語の小規模建築依頼を入力し、**ローカルOllamaに一度送信**→原応答保存→R125 ArchitecturePlan→B143→安全エクスポートMakeCodeまで準備する。出力は別フォルダに毎回新規保存、実機施工は手動。

## Windowsでの実行
前提：Node.js 24、Ollama稼働、`qwen3:14b` が `http://127.0.0.1:11434` 上で利用可能。GitHubのDraft PR #128の対象ブランチでコードがそろっていること。ローカルに未コミット作業がある場合、現行ブランチを `git merge`、`git reset`、`git stash` で無条件に変更しない。必要なら独立のGit worktreeから実行する。

1. `RUN_R125_FREE_BUILD.cmd` を開く。あるいは `node scripts/r125-free-build.mjs`。
2. 日本語で希望する小規模建築を入力してEnter。モデルの新規回答は1回だけ。自動再試行、モデルの自動切替え、テスト世界への接触なし。
3. 成功時、ログに表示した `MAKECODE_EDUCATION.ts` を開く。ユーザーの元依頼は `REQUEST.json` の `originalPrompt` に保存し、モデルへ実際に送った材料制約付き依頼は `sourcePrompt` に別記。生のLLM応答は `MODEL_RESPONSE_ORIGINAL.txt` に保持。
4. 出力レポートの原出力SHA、生成MakeCodeのSHA、ブロック別予定数を確認し、バックアップ済みの**新しい空の試験世界コピー**にMakeCodeを貼り付ける。
5. `mabset` で位置を固定。設計範囲を必ず確認し `mabbuild` は1回だけ実行。進捗を確認し、`Placing attempted` の後に `mabverify`。外形と入口・室内の通行可否は別途目視/操作検証。
6. `HOLD` 時は同じワールドへの再施工なし。保存済み成果物・ログを確認して原因から直す。

## 正確な現行制限
- 1～2階、平面16～32ブロック幅、各階2つの用途空間。自由な巨大都市・任意階数・全建築様式はまだ対象外。
- 床壁屋根に使える実機検証済み材料は `stone` と `oak_planks`、窓の `glass` のみ。他素材が指定必須の場合に黙って別素材へ変更するのは禁止。モデル回答が制限外ならHOLD。
- LLMの作品品質・要求一致・入口歩行・設備の保証は未達。作者が設計した用途と3Dの一致は目視チェックが必要。
- この処理でMinecraftへの自動world writeはゼロ。MakeCode側はコピー世界のみ、明示コマンドと安全な事前検査・Keepで実行。
- 既存のR190-BO等に固有の同意・nonceルール、main保護、Draft PR保護、原回答SHA保護は変更しない。モデル通信はR125系の新規自由依頼に限る。

**開発判断**：一つの合成家屋の再試験を繰り返すのでなく、まず独立した新規日本語依頼を1件以上試し、実機に建てられたかと建築用途が成立したかで次の投資を決める。
