# 2026年12月対策 — 完全方針継承・批判的改善・新チャット引き継ぎ正本 V6.0

> **2026-11-07追補（最新検証差分）**：本V6の第2章・第4章・第6章・第8章は**作成時点の履歴**。その後のWindows復元とP3合成鍵復旧の実測、および以後のGitHub優先運用は末尾の**第9章**が優先する。上位の固定方針と権限境界は変更しない。

**統合基準：2026-11-07 JST（本書作成時点）**  
**SCOPE：`DECEMBER_2026`／用途：既存V5.0・過去の単一状況台帳を保持したまま、2026-11-07の新しい検証事実と失敗、次の意思決定を統合する「現行運用の入口」**  
**注記：本書自体は完全な無謬性を保証しない。動的なHEAD・CI・本人Windows状態は後で変わる。状態を主張する前に実際の証拠を再照合する。**

## 0. 新チャットで最初に読む部分（最上位の運用契約）

1. **この会話は「2026年12月対策」の継続**であり、新規企画ではない。一般的な「続けて」「次工程」「全体見直し」で、MinecraftAIBuilderやBrowser Ink TPSの**作品コードを勝手に編集しない**。DECEMBER_2026の費用・モデル利用・自律開発・安全条件・省操作を担当する。
2. **最終目標**：ChatGPT依存を段階的に減らし、月額約3,000円を目安とする既存の通常利用以外の**追加課金を原則0円**にし、学校・就寝中に安全な真正モデル生成→独立QA→必要時の有界修正→検証済み成果保存→次回再開→翌朝報告を成立させる。**テスト件数、CIの成功、GitHubコミット数、Strataの番号は目的ではない。**
3. **MinecraftAIBuilderとBrowser Ink TPSは完全同格**の最重要2件。MABのGitHubに12月対策研究基盤が置かれているからといってMABを上位としない。長時間ローカルモデルは同時に**1案件へ連続集中**し、頻繁に切り替えない。CELESTIAL HALO-9は次点。個別作品の開発は各専用会話が担当。
4. **Strataは将来主力だが未完成**。A18の過去の限定S1真正小推論は記録された成功。A26の物理RAM安全停止、S2真正コード＋独立QA、S3自動修正、S4長時間無人完走は、最新の本人実機証拠がない限り**未実証/HOLD**。Strataを待つだけで他の安全な作品開発を止めない。
5. Qwen3:14Bは**Strata未完成期間の既存承認済みPRIVATE隔離下書きの暫定手段**。GitHub-hosted Qwen3:4b研究は別経路であり、14B実機成功や両作品の完成と混同しない。ローカルQwen/Gemma等の比較やOpenCode無料クラウドは、実在・無料性・品質・本人の資源条件を確認して補助に使う。未確認の有料フォールバックは禁止。
6. **権限境界**：Work/Computer Use、本人Windows変更・権限昇格、Docker導入、モデル変更/ダウンロード、32K/mmap・RAM安全閾値・ページファイル変更、重負荷実推論、Secrets設定、PRIVATE実コードの外部保存、本番公開、main、正式QA、Minecraftワールド、Draft PRのReady/Close/Mergeは**必要な明示承認なしに実行しない**。通常の「続けて」はこれらの承認ではない。公開研究ブランチの無害な静的ツール修正は既存許可範囲に限定。
7. **省操作**：原則Chat側でGitHub/Libraryを自分で読む。既に回答のある事項を再質問しない。ダウンロード→アップロードの往復、スクショ連発、同じ「続けて」要求の増加を避ける。本人Windowsが必要な段階のみ、明確な価値がある**1回のバッチ操作と定型結果1件**を提案する。了承前にPCを触らない。
8. **事実の階層を守る**：mock／オフラインGit／GitHub Windows／Linux実Docker／真正Qwen4B／本人Windows 14B／Strata S2／採用済み作品ART・ゲームプレイ／6時間無人開発は**すべて別階層**。成功を横滑りさせない。日付付き過去の記録を現在の実機状態と呼ばない。分からないことは分からないと記録。
9. 最上位は**明示的ユーザー指示＋V5第0〜9章の固定方針＋本V6の新証拠・改善運用**。V5にはV4/V3/V2/V1の履歴とStrata V2が原文包含されているため、歴史を勝手に改変せず必要時だけ開く。本V6はV5全原文のコピーではなく差分統合。将来の動的事実は実際の最新HEAD/CIが優先。

## 1. 読むべき正本と根拠

- **固定方針・歴史の完全正本**：ChatGPT Library `DECEMBER_2026_COMPLETE_POLICY_HANDOFF_V5_20261106_JA.md`（約303 KB、2066行）。別名 `(1)` も同内容の保存版。**V5の第0〜9章は原則最初に読む**。その付録は単一状況台帳／Strata V2／V4以下を包含。
- **差分付き単一状況台帳**：ChatGPT Library `DECEMBER_2026_SINGLE_STATUS_LEDGER_20261105_JA.md`（11/06までの追記あり）。**最新HEADとみなさず、時点付き証拠として扱う**。
- **このV6**：新チャットで最初に読む現行の短い入口。GitHub研究ブランチに保存される場合、`docs/december_2026/DECEMBER_2026_CRITICAL_HANDOFF_V6_20261107_JA.md`。同一本文をLibraryにも保管。これら2つを二重の独立した方針にしない。
- **12月研究repo**：`https://github.com/ryomashibaba/MinecraftAIBuilder`、研究branch `research/dec-free-autonomy-solo-pilot-20261104`。
- **MAB作品本体**：`feature/b198zr1-protected-architectural-revision`、[Draft PR #128](https://github.com/ryomashibaba/MinecraftAIBuilder/pull/128)。**本12月スコープでは作品コードを書かない**。
- **Browser Ink TPS作品本体**：`https://github.com/ryomashibaba/browser-ink-tps`、最新研究系列 `research/t21-integrated-a1-c-patrol-four-mode-20261105`、[Draft PR #5](https://github.com/ryomashibaba/browser-ink-tps/pull/5)。**本12月スコープでは作品コードを書かない**。
- Strataの現在のWindowsファイル・状態は**この公開GitHubだけでは断定できない**。Strata専用会話と当該実機の権限が付与された最新証拠が優先。

## 2. 2026-11-07 の実測台帳（当日の読み取り。未来の現在値ではない）

| 区分 | 実証された範囲と証拠 | 未達または留保 |
|---|---|---|
| 12月研究branch | 2026-11-07の確認HEAD **`eb663f43292503b8ce4c720ce385ab04f25a4e3c`**。前の保存基準 `433f909...` から18コミット進んだ記録がある。**本V6作成後に変更され得る**。 | 後続commitがあれば必ず再照合。README/過去HEADを現行の絶対値にしない |
| Linuxオフライン復元 | [#42325453699](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/42325453699)：**23/23** Python/Git/OpenSSL合成回帰成功。 | 真正生成コード・Windows実機証明ではない |
| 合成暗号化復元＋実Docker QA | [#42326566279](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/42326566279)：23/23＋合成GitコードのLinux Docker正常・失敗ケースPASS。 | 本人Windows、Qwen実コード、ART認定ではない |
| 本番用暗号化関数→復元関数の往復 | [#42327959344](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/42327959344)：合成4段階Git履歴を実保存関数でCMS暗号化→実復元関数で復元→SHA維持。改ざん拒否。23/23回帰とDocker合成QAもPASS。 | **実Qwen4B成果物**の暗号化アップロード・復元は**未実施** |
| Windows DPAPI鍵初期化 | [#42330749073](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/42330749073)：使い捨てGitHub WindowsでRSA鍵→CurrentUser DPAPI保護→検証→OpenSSL往復成功、平文鍵は最終保存先に残らない。 | 本人PCでの鍵作成、バックアップ/復旧計画、GitHub Secrets登録、実モデルへの許可は**未実施** |
| Windows DPAPI鍵→実復元CLI結合 | 新規`tools/dec-private-checkpoint/restore_windows_checkpoint.ps1`とテストを作成したが、**CI失敗を繰返した**。最新取得できた[#42332391783](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/42332391783)は**failure**、HOLDコード **`CHECKPOINT_IMPORTED_BASE_MISMATCH`**（Python復元器が固定公開Git基点をbare repoにfetchした後のSHA照合で停止）。 | **この復元経路はPASSではない。** 最新コードの再検証、原因の限定再現・最小修正が必要。ログ上の停止はGit基点取り込み照合であり、秘密鍵漏洩・ホスト実コード実行の証拠ではない |
| GitHub Qwen3:4b真正生成 | 過去の真のLinux CPUモデル試行に限り、モデル要求や2サイクル/一部SOURCE QAが記録。代表的な[#42306171984](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/42306171984)は**最終FAILURE**：1サイクル完了、次のドラフト不合格、owned container cleanup verification不成立。 | 「2サイクルの現行成功」「保存済み実コード」とは言えない。失敗時にCIのPRIVATE生成コードは持続しない。意図せぬモデルCI自動起動の反省を必ず継承 |
| 事前承認安全ゲート | 専用`.github/workflows/dec-real-qwen4b-two-cumulative.yml`は専用request pathのみpush対象にし、受取人証明書/明示承認の事前チェックがあり、公開repoの認証情報やsourceを直接出さない設計。`real_qwen4b_two_cumulative_ci.py`も未承認時に停止するよう修正。 | 証明書の有効性・存在確認と**実際の本人同意**は別。Secrets設定・PRIVATE成果の公開リスク評価・本人鍵の安全なバックアップ未実証。workflow_dispatchのdefault branch要件に注意 |
| Strata | **A18の過去S1小推論PASS**。2026-11-05 A26では稼働中物理RAM空き **2.303 GiB ＜安全下限3 GiB**でHOLD、コード生成・独立QAは未達（V5記録）。 | 11/07現在の本人Windows状態はこの監査では**不明**。専用Strata会話の新証拠でのみ更新。安全下限を下げたり無断再試行したりしない |
| MAB/TPSの同格性 | 11/07の読取専用branch SHA：MAB作品研究 `795e68c08ecb33095a48a84f0c103fc39544a125`、TPS研究 `8805b4253eb48487c294a32b1b91f65330fc71c2`。いずれも**当該時点のbranch SHAだけ**。 | この12月会話では作品実装・最新ART/ゲームプレイの採否まで検証していない。各専用会話を正本とする |
| R55の別系統CI | 11/07の多数の研究pushで `.github/workflows/r55-future-source-preflight.yml` が自動起動し**繰り返しfailure**。例[#42332390757](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/42332390757)。 | **無関係だから完全に無視してよいとは限らない**が、本12月研究の成功証明とは別。必要な場合だけ故障理由を1回検証し、毎pushに再実行させる経路を増やさない |

**課金・操作の限定事実**：上記Chat+GitHub研究作業では有料API要求と本人PC操作は観測0。GitHub-hosted Actionsは複数回起動しており、その無料枠・実際の請求額が0円かどうかは**契約・利用明細を未確認なので断定しない**。別の有料消費を伴う可能性があるCI連発は最小化する。

## 3. 批判的評価と、方針を変えずに修正する点

### 問題A：研究基盤の増築が自律開発の実成果を上回った

23件PASSやDocker合成QA、実CMS往復は真の限定成果。しかし数十commit・多数CI失敗の後も、真正Qwen4B成果物の保存・復元・QA・再開は成功していない。**安全テストの増加をユーザー価値の改善と取り違えた**。**改訂**：新しい番号・監督器・似たCIは原則停止。次に変更してよいのは、真の阻害要因に直結する**既存コードの一括修正**だけ。変更前にテスト用Gitを隔離再現し、ローカル/単発CIで原因を証明してからpush。短いコミットごとの重複CIを防ぐ。

### 問題B：Windows復元器の「診断を小出しにして再実行」

Windows CIではOpenSSLのstderr、DPAPIアセンブリ、Python/import、Get-FileHash依存、PowerShellのstdout型、Git基点取り込み照合の順に停止。個別の修正はそれぞれ安全性を改善したが、**根因の切分けよりCI回数が先行した**。最終的な`CHECKPOINT_IMPORTED_BASE_MISMATCH`の原因は**まだ不明**。**改訂**：Python本体の`FETCH_HEAD`比較とWindows Gitの挙動、固定基点SHAが同一オブジェクトとしてfetchされたかを**秘密なしの短い合成再現**で調べる。単にエラーメッセージを足すだけのpushをしない。原因と最小の修正案が特定されるまでWindows復元認定HOLD。

### 問題C：MAB側だけで研究成果が増え、同格のTPSに役立つか不明

MAB研究repo内のQwen4B/建築SOURCE専用パイプラインは、そのままBrowser Ink TPS向け自律開発の成功ではない。**改訂**：12月研究は横断の費用・安全・自律化技術を担い、実際の作品へ適用する判断は各専用会話。将来の採用評価はMAB/TPS双方に**共通の最小実証基準**を設けるが、プロジェクト固有の品質条件を同一視しない。独立したTPS作品実装に無断で進まない。

### 問題D：実保存の機密性・復旧性が完成していない

公開repoのArtifactは暗号文でも閲覧者の範囲・保持日数・鍵の漏洩リスクが残る。RSA証明書を暗号化に使っても、秘密鍵がDPAPI CurrentUserにしか存在しなければWindows再インストールやアカウント喪失で復旧できない恐れ。**改訂**：OWNERが理解して個別に承認するまでは公開artifact保存・Secrets設定・本人鍵生成を開始しない。真正運用前に、暗号文の公開範囲・保存期限・キーと復旧手段・漏洩対策を**短い1件の承認パケット**にまとめる。承認がなければHOLD。PRIVATEを既存公開Gitへ押し出すことは禁止。

### 問題E：GitHub Actionsの自動起動境界に失敗があった

過去、研究ブランチのpushが意図せず真正Qwen4B CPU実行を起動した。後に専用request pathへ修正されたが、あらゆるpushにR55の既存FAILが連動する事態は継続。**改訂**：push前に研究branchの全workflowの`on`と`paths`を必ず読取監査。**doc-only change + `[skip ci]`**を基本とし、真正モデルを起動する承認requestファイルは**明示許可後にのみ**操作。無関係なCI再実行を進捗に数えず、Actions利用枠も無限無料とは仮定しない。

### 問題F：ユーザーの作業を本当に減らせていない

GitHub操作0回でも、毎回「続けて」指示と不完全な引き継ぎの繰返しを要求すると省操作ではない。**改訂**：通常はChat/GitHub/Libraryで自力に資料探索→原因確定→関連箇所の一括修正→1回の検証→1件の要約。必要なときのみユーザーへ明確な価値のある**単発承認または1回の実機バッチ**を出す。秘密の提出やマニュアルログ編集を要求しない。ユーザー外出中は本人Windows必須工程をHOLDにして、許可済みread-only/静的作業へ移る。

### この改善方針の自己批判（誤用禁止）

- **「新しいCI禁止」は絶対ルールではない**：真の障害を独立に検証する最小テストは必要。ただし1つの原因に対する多段CIの量産は禁止。
- **「操作0回」は承認省略の口実ではない**：秘密鍵登録、PRIVATE成果の外部保存、Windows実機、モデル呼び出しを通常の「続けて」だけで解禁しない。
- **「Strata優先」は本体改造の無断許可ではない**：StrataのS2〜S4は専用会話で現行コードと安全証拠を確認する。本12月研究と役割を混同しない。
- **「MABとTPS同格」は工数の機械的50:50ではない**：同時1案件・連続集中・安全な再開状態を守り、各作品の本当の品質価値を追う。
- **「暗号化済みなら公開してよい」は誤り**：暗号化は機密管理の一部であり、秘密鍵の保全・ユーザー承認・公開範囲・保持期間の設計が揃わなければHOLD。
- **「将来12月までに全面完成」と宣言しない**：必要時間・成功確率は根拠がないため**わからない**。真正の技術的通過点だけを評価する。

## 4. 今後の実行順序（新企画ではなく工程の再優先付け）

### P0：この新チャットへ安全に移行する（即時）

1. 最初にV6第0〜4章を読み、LibraryのV5第0〜9章と最新台帳を継承。**歴史の付録は必要な時だけ参照**。
2. GitHub研究HEADと該当Windows CIの**現在**の結論を1回照合。古い`eb663f...`を最新と決めつけない。MAB/TPSは同格を確認するが、作品コードは読取のみ。
3. 失敗が残れば`CHECKPOINT_IMPORTED_BASE_MISMATCH`を**HOLDとして継承**し、過去の合成Linux PASSと混同しない。

### P1：Windows Git基点取り込み失敗を**小さく再現して原因確定**

- 現在の復元コードの`restore_checkpoint()`がbare repoに固定基点をfetchし、`git rev-parse FETCH_HEAD`と期待SHAを比べる箇所を確認。Windows Gitのstdout/改行、`FETCH_HEAD`の解釈、リポジトリSHA・object format・名前解決・Git環境・CIの生成基点を、**鍵不要の合成bare repo**だけで比較。
- 原因不明のまま試行回数を増やさない。失敗再現・予想・修正案を1組にまとめ、最低限のオフラインローカルテスト→必要ならWindows専用CI**1回**だけ実施。
- この時点で真正Qwenモデル、ユーザーWindows、PRIVATE成果、Secrets、mainには一切触れない。
- 真の問題が解けなければ`HOLD_WINDOWS_RESTORE_BASE_IMPORT`を維持し、同じ診断pushを連発しない。

### P2：確認済みの合成Windows DPAPI→暗号化保存→復元→QA安全境界（条件付き）

- P1の修正がPASSした場合だけ、Windows CIで「合成4段階QA済みGit履歴を実保存関数でCMS暗号化→DPAPI秘密鍵で復号→既存Python復元器→正確なgit HEAD/proof→二重復元拒否・SHA不一致拒否」まで1バッチ検証。
- GitHub Windows runner上の鍵は**完全に使い捨て合成鍵**。秘密は標準出力、actions artifact、git、チャットへ出さない。後続Linux Docker合成QAの既存成功を再試験で水増しせず、必要なら同一検証の境界だけ確認。
- 明確な結果がPASSになるまで**本人Windows導入へ進めない**。

### P3：本物のQwen成果保存の意思決定（**ここで初めて承認が必要**）

- 所有者のWindows鍵バックアップ・復元方式、公開暗号文の取り扱い、GitHub Secrets登録の意味・可否、runnerの利用枠/費用、実CPUモデル試行の上限を1回の短い承認資料に統合。
- 無断でWindows鍵生成/Secretsアップロード/承認request path変更をしない。暗号化結果をユーザーに公開設定のまま保存してよいと仮定しない。
- 所有者の一度の明示承認で安全条件を満たせる場合だけ、**限定1回**の真正モデル実行→独立SOURCE QA→実暗号化保存→同一Git基点復元→再QAを実証。失敗ならデータと権限を保護してHOLD、異なるモデルへ有料フォールバックしない。

### P4：Strata主力化と両作品への実用展開（別担当と同期）

- Strata専用会話でS2→S3→S4の安全ゲートと本人実機証拠を継続する。A26の過去RAM停止2.303/3GiBを条件変更なしで再試行しない。起動前7/8GiB・稼働中3/2GiBの保存版安全規約と、別12月研究監督器の4/4GiBを混同しない。現行本人実行版は未確認のため断定しない。
- MAB/TPSを同格に、必要なモデルの実利用価値・QA品質・保存・再開・人間操作数・費用を比較する。作品の正式ART/ゲーム成果はそれぞれ専用会話が審査。HALO-9他は次点。
- 11月末〜12月1日に一度だけ、当時の公式利用枠/無料条件、実AI能力、使用額、安全状況を比較し、未実証を無理に主力へ昇格させない。

## 5. 実行の絶対ルール・成功/停止の契約

- **一度の工程＝意味ある成果1件**：最大の阻害原因、手を入れた既存箇所、独立の再現と評価、最後のHEAD/CI、ユーザー操作・費用、次の唯一の価値ある工程を短く報告。コミット数を成果にしない。
- **証拠階層**：`STATIC` / `SYNTHETIC_GIT` / `CI_WINDOWS_DPAPI` / `CI_LINUX_REAL_DOCKER` / `REAL_QWEN4B` / `USER_WINDOWS_LOCAL_MODEL` / `INDEPENDENT_SOURCE_QA` / `REAL_PROJECT_ART_OR_GAMEPLAY` / `LONG_UNATTENDED`を混ぜない。通常の成功表示に必ず修飾語を付ける。
- **保存条件**：偽造不能の必要なGit SHA/ソースSHA、SOURCE ONLYの独立QA、所有Docker終了、PRIVATE境界、本人承認、復号可能性を確認する。公開branchへ未審査生成ソースをpushしない。真の公開artifactへの保存は承認別枠。
- **権限は最小**：GitHub研究ブランチの通常commitのみ既存許可範囲。`main`/force push/PR本体/原本/PRIVATE本体を無断操作しない。Work/Computer Useは毎回事前に承認。ユーザーのローカル保護鍵へは直接アクセスしない。
- **CIコスト**：全workflowsのトリガーと費用影響をpush前に確認。原因のわからない重い再試行禁止。docs/hand-off保存は**[skip ci]**を使い、公開model起動が0件であることを事後検証。
- **権限不明・モデル課金不明・安全未証明**ならその操作だけ**HOLD**。より低リスクな実際の原因分析は続ける。ストーリー上の「完璧」を目標ではなく**反証できる完成条件**に変える。

## 6. 新しいチャットへ貼る最短開始指示（本人操作1回）

> **2026年12月対策 `SCOPE=DECEMBER_2026` の継続です。新企画ではありません。** GitHub `ryomashibaba/MinecraftAIBuilder` の研究ブランチ `research/dec-free-autonomy-solo-pilot-20261104` にある `docs/december_2026/DECEMBER_2026_CRITICAL_HANDOFF_V6_20261107_JA.md` を全文読み、ChatGPT Library の `DECEMBER_2026_COMPLETE_POLICY_HANDOFF_V5_20261106_JA.md` の第0〜9章、過去の状況台帳と必要な付録を継承してください。最新GitHub HEAD・該当CI・権限を再照合し、最新のWindows復元HOLD `CHECKPOINT_IMPORTED_BASE_MISMATCH` を、秘密・モデル呼び出しなしの最小再現で調べてください。原因未確定なら連続CIを回さずその経路をHOLDにしてください。MinecraftAIBuilderとBrowser Ink TPSは完全同格、Strataは将来主力、追加課金原則0円。通常の「続けて」で作品コードを編集しないでください。main/PRIVATE/作品原本/正式QA/本番、Work・Computer Use、モデル・Secrets・重負荷試行は既存承認境界を厳守。本人操作を原則0回にし、進捗は真正証拠とHOLDを区別して1件だけ報告してください。

## 7. 新チャットで質問しなくてよい事項

- 12月対策の目的、月約3,000円・追加課金原則0円、MAB/TPS完全同格、Strata将来主力、ローカル同時1案件、Work事前承認、ゲーム本体は別会話、本人操作削減という大方針は**既に確定**。
- Qwen3 14B PRIVATE V6の保存済み候補とQA未合格、S1過去実証とA26既往RAM HOLD、GitHub合成暗号化復元PASSとWindows DPAPI復元未合格も既に記録済み。
- GitHub/Libraryを読める限り、古いファイルをユーザーに再添付させない。ここでの新規PC操作・新たな費用・秘密の送信を要求しない。

## 8. 最終監査と謙抑

本V6の更新で、**「Windows DPAPI鍵管理がPASS」と「DPAPI鍵で本物の復元器を経由した復元がPASS」を厳格に分離**した。最新の復元はGit基点SHA照合でHOLDなので、仕組みの完全完成とは主張しない。正式な自律開発の到達度は従来のS2〜S4未実証という境界を維持する。バックアップ・鍵・費用・モデル承認・本番採用を勝手に進めない。未解決問題を本当に減らす次の工程は小さな再現と一括検証であり、CI/監督器の数量増加ではない。

**これまでの歴史はV5原本に保存されたまま、本V6は最新の評価・失敗・意思決定に一本化する。文書作成そのものを自律開発成功と数えない。**

## 9. GitHub優先の作業とP3の最新差分（2026-11-07 JST、検証済み範囲のみ）

### 9.1 2026年12月対策のGitHub-first運用（所有者の2026-11-07指示）

- **作業・共有・次チャットの第一入口はこの公開研究ブランチの既存V6**とする。新規ZIP/添付の受け渡し、別名正本や小型監督器の増殖を避け、必要な実装は既存スクリプトを最小修正してGitHubで追跡する。main、MAB/TPS作品本体、既存PRは保護する。
- **Library V5全文と単一状況台帳はそのまま公開GitHubに転記しない**。個人PCの内部状態、PRIVATE実装や未公開の証拠に関わる可能性があるため、正本はLibraryに保持する。GitHub V6は安全な運用上の要約・差分のみを公開する。Work側でLibrary全文を開けない場合は、閲覧できない部分を推測せず、V6の最上位固定条件と本章の差分で許可済みの限定作業を継続し、欠けた具体的なPRIVATE情報が本当に不可欠な操作のみHOLDとする。
- **原則GitHub操作はChat側で行う**。Work/Computer Useが必要なのは、本人Windows/Secrets/BillingのUIなどGitHubコネクターだけでは扱えない操作に限る。単なる「続けて」は機密・Windows・費用・main変更の新しい許可ではない。別途2026-11-07に限定承認されたP3は、その条件と上限を超えない。
- GitHub Actionsの標準ランナー利用資格だけを根拠に**アカウント全体の実請求0円**を確定しない。Artifactの容量・保持・公開範囲・支払方法・費用上限を実利用条件で確認するまで真正P3起動はHOLDする。

### 9.2 GitHub読取可能な真正の差分証拠

以下は特定SHAに紐づく過去の確定済み実行結果であり、後続の最新HEADは毎回確認する。

| 検証範囲 | 研究コミット／Actions | 合否と認定上限 |
|---|---|---|
| 浅いGit基点をbare repoへ取り込むWindows合成復元の修正 | `01d55037b9dad8d9ab66312cc5f1846928bbd5c4` / [run #42339479197](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/42339479197) | **Windows synthetic PASS**。固定基点取り込み失敗を修正。本人PC・真正Qwenではない |
| 本番用のCMS暗号化関数→Windows DPAPI→実復元器→合成4段階Git履歴と改ざん/重複拒否 | `928c723dd7320052c8c04581103243ba8fb7a7f8` / [run #42349086056](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/42349086056) | **Windows synthetic 4-stage PASS**。モデル0、実Docker QAなし |
| パスフレーズ暗号化PKCS#8バックアップ→検証→同一runnerの別Windows保存先にDPAPI再登録、前項の4段階復元維持 | `0d349c390a1572560591e614ecbadd2b0d350eef` / [run #42353687546](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/42353687546) | **Windows synthetic backup/recovery PASS**。別PC/別ユーザー復元は未証明、本人の鍵ではない |

- 現状の研究用既存スクリプト：`tools/dec-private-checkpoint/recovery_windows_recipient.ps1`、`tools/dec-private-checkpoint/init_windows_recipient.ps1`、`tools/dec-private-checkpoint/restore_windows_checkpoint.ps1`、`tools/dec-private-checkpoint/test_windows_checkpoint_restore.py`。
- **2026-11-07 Work実機観測**：Computer Useで本人Windowsのアプリ一覧取得に成功した記録がある。ただしCIMはアクセス拒否で、本人の既存鍵・実機資源・DPAPI復元・GitHub Secrets・請求設定は未検証。これは**接続確認**であり**本人PC P3成功**ではない。
- **真正Qwen3:4B成果の暗号化保存・本人鍵復元・独立SOURCE QAは未実施**。Strata S2〜S4、MAB/TPS正式ART/ゲーム完成も本12月経路で認定しない。R55の別CI failureを全CI成功と混同しない。

### 9.3 P3で残る唯一の実行ゲートと次工程

- 2026-11-07の所有者から**一回限定P3の承認**あり：本人Windowsの鍵生成/バックアップ/復旧確認、GitHub Secretsの安全な設定、Qwen3:4Bの**最大45分、1 run**、**暗号化済み**QA checkpointだけの公開GitHub Artifact保存（既存保持上限90日）、復元と独立SOURCE QA。ただし**追加課金原則0円、漏洩防止、復号可能性、公開内容の限定**は継続条件。秘密鍵・パスフレーズ・モデル原文はChat/GitHubへ送らない。
- **未解除ゲート**：本人Windowsの受取鍵と暗号化バックアップの実在・再検証、GitHubのSecrets設定を扱えるUI/接続権限、GitHub Actions/Artifactの**本人アカウントの請求・容量**、成果の復元先。現在のGitHubコネクターにはSecrets/Billingの安全な書込み・参照APIがない。
- 真正実行の既存起点は `.github/workflows/dec-real-qwen4b-two-cumulative.yml`。普通の研究pushではモデルは起動しない。**明示承認済み条件を現行環境で再確認した後でのみ**専用 `.github/dec-qwen4b-approved-run-request.json` の操作を検討。独断でrequestファイルを作成しない、無審査の自動起動をしない。
- **再開はGitHubを先に調べ、本人操作は必要な1回のUIバッチに集約**する。CIMが拒否されても直ちに新監督器・新CIを追加しない。秘密・権限・請求が確認できなければP3真正部分をHOLDとする。このHOLDは第9.2節の合成Windows PASSを取り消さない。
