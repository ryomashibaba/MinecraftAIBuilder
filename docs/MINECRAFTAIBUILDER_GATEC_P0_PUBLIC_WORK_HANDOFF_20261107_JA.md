# MinecraftAIBuilder — Gate C P0 公開版・Work / Sol 継続引き継ぎ

> **PUBLIC / SANITIZED:** このファイルは公開GitHub向けの作業指針です。PRIVATEのV11・V10正本、PRIVATEソース、モデル生回答、ユーザーのPCパス、Windows監視の生ログ、秘密のハッシュ台帳は収録していません。**この公開版をPRIVATE正本の代替と見なさないでください。**
>
> 対象プロジェクト：`ryomashibaba/MinecraftAIBuilder` のみ。2026-11-07（JST）時点の引き継ぎ。新規企画や方針変更ではありません。

## 1. 最上位の固定方針

- 主経路は **自然文 → ローカルLLM本人の建築著作 → 汎用意味IR → 既存決定的HOST → 真正B143 → 独立SOURCE/機能検査 → 人間ART審査 → Minecraft Education**。短期実装経路は **R125 → B143 → Minecraft Education**。新しいコンパイラへの無断移行、E2/R190への全体移行は禁止。
- **V6を既定、V7は明示オプトイン研究**とし、一般公開・本番施工は行わない。ART-FIRST。箱の使い回しや単なるソース・テスト成功を美術的成功と呼ばない。
- 保護するもの：`main`、凍結されたSOURCE/モデル原文、Windows PRIVATE原本、既存dirty checkout、Minecraft試験世界、他プロジェクトの実行環境、[PR #128](https://github.com/ryomashibaba/MinecraftAIBuilder/pull/128) のOpen/Draft状態。
- 施工の初期状態：`NOT_PREPARED`、`constructionApproved=false`、`executionAllowed=false`、`BuildPlan.operations=[]`、**9ゲートすべてBLOCKED**。
- 追加API課金、実モデル生成、Minecraft接触/書込、PR Ready/Merge、main変更はこの文書で許可されない。安全な独立作業領域内での**ゼロモデル実機ドライラン**のみを次の工程とする。

上位公開資料：[正式憲章](AI_PROJECT_CHARTER_JA.md) / [戦略V2](PROJECT_STRATEGY_V2_JA.md) / [R125短期計画](R125_THIN_VERTICAL_SLICE_PLAN_JA.md)。

## 2. 一次証拠と報告済みの現状を区別する

- 研究ブランチ：`feature/b198zr1-protected-architectural-revision`、PR #128は最後の照会時点でOpen/Draft・未マージ。
- **公開側の直前検証HEAD**：`4daa0e13177a7584dcef360d4c6f1e98dff62188`。このHEADに対する必須CI：
  - [R125 V4D Local Author Bridge — INJECTED TEST ONLY](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/42301264589) — completed/success
  - [Education-first offline QA](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/42301277082) — completed/success
- **重要：この公開引き継ぎ文書をコミットするとHEADが更新される。旧HEADのCI成功を新HEADに流用してモデル実行を許可しないこと。** 実行直前には新HEADと当該HEADの必須2CIを厳密照合する。ドキュメントのみのpushではV4Dのpathsフィルターにより自動実行されない可能性がある。**CIが揃わなければHOLD**。この公開文書を理由にモデルPOSTを開始しない。
- 直近の**ユーザー提示Work報告**ではWindows PRIVATEへの読取と原本整合チェックが成功した一方、`deriveIntegratedShell` は確認済み、`checkResourceSafety` は現行engineからexportされず、Gate C実結合は未証明とされた。これはWork報告に基づく観測で、公開GitHub上のコードやCIだけでは独立立証できない。
- 別OSプロセスでの真正HOST結合・資源の測定出所・異常系停止・長文生成の安全性は**未認定**。モデル著作の新しい建築、ART採用、ワールド施工は**未成立**。

## 3. Gate C P0 — Work / Sol の一括実作業（MODEL POST 0）

Workで既に承認された安全なWindows PCアクセスを使い、以下を**既存PRIVATE原本を改変せず**可能な限り一括実行する。PCに接続できないときは即HOLDし、公開CIやCMDを量産して代替しない。

1. **PRIVATE正本はユーザーのChatGPT Library／承認されたWindows PRIVATE側から読む。** 正式なPRIVATE正本はV11批判的継承、V10完全統合正本、V10 Gate C PRIVATE binding packet。**本ファイルにPRIVATE正本全文はない。** 読めない場合はその事実を報告し、推測で機密契約を埋めない。
2. 現時点の研究ブランチHEAD、PR Draft、同HEADの必須2CIを再確認。既存原本を読取専用で整合監査する。新規作業は**隔離PRIVATE領域**に限定し、既存dirty checkoutと凍結ファイルを変更しない。
3. 既存ENGINE/コンパイラの実SHA、exports、読み込み副作用を原本非改変で監査。`deriveIntegratedShell` と `checkResourceSafety` の契約を区別する。**engineが安全関数をexportしないことを理由に、engine原本へ偽のSAFE関数を追加しない。**
4. 既存独立監視ワーカーの本当のプロセス、測定API、観測エラー処理を確認。必要な場合のみ**隔離PRIVATEアダプタ1件**でengineの真正関数と監視の実測値を結合。監視はWindows上の別OSプロセスで稼働させ、親子PID、ライブheartbeat、単調前進する資源測定時刻、RAM・commit・VRAM・温度等の**測定出所**を検証。古いsummaryの値をライブ測定と称さない。
5. **ゼロモデル呼出しの専用ドライラン**で `checkResourceSafety({model:'qwen3:14b',headSha,oneRequest:true})` と、同 `phase:'DURING_INFERENCE'` を複数回検証する。まだ長文推論の安全認定がないため、返答を**根拠なく `SAFE_FOR_ONE_REQUEST` に固定しない**。
6. 異常系：ワーカー停止、heartbeat停止・古い値・未来時刻、監視ID変更、資源測定時刻が前進しない／欠落、取得失敗、OS権限拒否、ENGINEハッシュ違い、モデルの競合状態不明。いずれも**HOLDに閉じる**ことを確認。
7. 任意の保存済み合成SOURCEのHOST結合は、出所区別と無改変を保つ場合のみ**モデル0回・ワールド0回で最大1件**。合成SOURCEを真人LLMの新著作と呼ばない。
8. 終了時に監視ワーカーを停止し、変更範囲・PRIVATE原本不変を確認する。結果は**匿名allowlist JSONのみ**共有する。

**絶対に避ける誤用：** [`scripts/r125-v7-private-once.mjs`](../scripts/r125-v7-private-once.mjs) は、安全前提が成立するとモデルPOSTを行う実行器であり、Gate C P0のゼロPOSTドライランに直接使わない。クライアントのAbortや`keep_alive:0`だけでサーバー停止・アンロードを証明したと扱わない。

## 4. 判定と報告形式

- **`PRIVATE_HOST_BINDING_DRY_RUN_VERIFIED`** が得られても証明範囲は「PRIVATE HOSTと独立監視のゼロモデル実結合」だけ。実モデル長文生成、停止性能、ART、施工が認定されたことにはならない。
- 実PRIVATEが読めない、実測由来が特定できない、ENGINE/CI/HEADが不整合、ワーカー分離や異常HOLDを実証できない場合は**HOLD**。
- 共有JSONはPRIVATEパス・原文・PID・秘密の機械ID・生ログを入れず、既存Gate C packetのallowlistキー（`status`、`head_verified`、`required_ci_both_success`、`engine_sha_verified`、`private_host_binding_verified`、`independent_process_verified`、`monitor_samples`、`heartbeat_advances`、`unsafe_cases_fail_closed`、`model_post_requests`、`minecraft_contacts`、`minecraft_writes`等）のみ。未実施の項目をPASSと記さない。
- 今回の禁止範囲：**モデルPOST 0、モデル生成0、Minecraft接触0、ワールド書込0、追加課金0**。PR #128はDraft、mainは不変更、9施工ゲートはBLOCKED。

## 5. 公開版の範囲と次の行動

この文書は**公開できる作業指示と安全境界**だけを記したものです。PRIVATE原本3文書が未取得なら、本文を想像で補完せず、本人のLibrary/Windows上の読取ができるWorkセッションで原本確認してください。一般公開GitHubへPRIVATE原文や機器の生ログ、PRIVATEアダプタのソースをpushしないこと。

次の価値ある成果は、追加の資料探しではなく、**Windows PRIVATE上でのゼロモデル真正HOST・独立監視結合**です。条件未達ならHOLDのまま、元方針を変えずに停止してください。