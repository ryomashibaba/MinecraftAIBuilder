# V4H 一発著作契約の改善と真正Qwen4Bの再評価 — 2026-11-05

## 固定方針
MinecraftAIBuilderとBrowser Ink TPSは完全同格の最優先2件。ローカルLLMは同時に片方だけ担当する。main、既存開発ブランチ、Education成功経路、原作者回答、Draft PR #128、Pagesを保護。Work/Computer Use個別承認制、追加有料API原則0。SOURCE合格をARTやMinecraft実歩行合格と混同しない。

## 実装
- 研究ブランチ：research/dec-v4h-one-response-author-contract-20261105
- 開始点の開発HEAD：e48d2b72eeb8d9efcfe2a186db9dabff089652b3。開発ブランチ自体は不変更。
- 実ソース：source/ai/r125-v4h-mezzanine-author-ir.mjs。必須JSONキーの厳密な個数とメンバーシップを確認。区切り文字を混ぜたキーによる紛らわしい同等化を拒否する。
- V4Hモデルの指示に、屋内各空間は本人が順序決定する東西南北4つの相異なるwindowPriority配列が必要、屋外sky空間はwindowPriority:nullが必要と明記。自動修復や固定順位・テンプレート選択は追加しない。
- 新規テスト scripts/r125-v4h-window-author-contract.test.mjs 4件、既存4件、合計8件PASS。5ジャンルの合成作者と真正B143ソースを検査。実モデルではない。
- 実装コミット：https://github.com/ryomashibaba/MinecraftAIBuilder/commit/ffa4d2d9b1e9670c6d7dbe170f47a4811eac9d8d
- 独立SOURCE CI：https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41934318682 （completed/success）

## 真正Qwen3:4Bによる1回答の実験
- 修正前： https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41925385789
  1回の真の回答はPRIVATE捕捉。SOURCE不合格コード R125_V4E_RANKED_COVERED_REQUIRES_AUTHORED_FOUR_SIDE_RANKING_0。
- 修正後： https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41934865092
  1回の真の回答。model_calls=1、finish_reason=stop、PRIVATE原文捕捉=true。
  author_status=HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR、source_pass=false。
  不合格コード R125_V4E_RANKED_SPACE_FIELDS_1（2番目の空間のフィールド構造不整合）。
  欠落/予期しない実際のキー名はPRIVATE原文未確認なので不明。独立Docker QAは元SOURCE不合格のため未実施。
  world_writes=0、github_pushes=0、paid_api_calls=0。モデル原文は公開しない。
- 安全な小レシート：https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41934865092/artifacts/13372788688
- 修正後の実験HEAD：f1ba12612ceba22f40b9bfe0a10e2513b53d3a3e

結果が最初の空間のwindowPriority拒否から第2空間のフィールド構造拒否へ変化したことは事実。ただし1試行ずつなので、指示文による改善効果を因果的には証明できない。4BのV4H全建築一発SOURCE成功は0件。追加の小型モデル連続再試行で成功を演出しない。

## 未完了
本人Windowsの真正Qwen3:14Bを使った本物の建築著作は未実行。14Bの成功率は分からない。研究ブランチのSOURCE検証は人間の建築ART、Minecraftワールド、長時間自律コーディングの認定ではない。12月対策研究ブランチの旧SHA固定ランチャーは新V4Hソースを自動追従しないため、別バージョンを同じ成功と呼ばず、次の14B実測時は参照HEADとファイルblobを必ず照合する。


## 2026-11-05 実機14Bの固定ソース1操作入口
- CMD: scripts/DEC_RUN_REAL_QWEN14B_V4H_PINNED_ONCE.cmd はPS1のGit blobを厳密照合して実行する。PS1の研究ソースは固定SHA de28d50c9240dbb95c47732b0456625a70f8a785 からのみ Git fetch し、source blob 934292ca75aed1cc6e374350b9e2fa20121719f8 を独立照合する。branchの動くHEADを信じない。
- local modelは導入済み qwen3:14b のみ（pull無し）。一回答のオリジナル建築を元のV4H契約でSOURCE検証し、PRIVATE原回答と公開可能な短いJSONだけに分離。失敗回答の自動補修・リトライ・Minecraft書込なし。
- 同格最優先のMinecraftAIBuilder/TPSの同時ローカル実行は禁止。FreeAutonomySolo/one-local-project.lock の1-byte OSロックを取得し競合ならHOLD。main、既存開発branch、原本、Education成功施工、PR、Pages、他プロジェクトを不変更。
- Windows ActionsのPowerShell構文・CMD起動自己検査・歴史SHA fetch・V4H実SOURCE回帰はモデル試験ではない。本人Windows Qwen14B本物の推論・3DのART評価・世界内歩行・長時間自律codingは引き続き未実測。
