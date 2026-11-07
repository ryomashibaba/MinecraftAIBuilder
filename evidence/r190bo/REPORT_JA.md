# R190-BO 開発・オフライン実測報告

2026-10-30 JST。開始HEAD `6f8b3ac3b292fa0b72ca8063c24bc966f5b56527`。

**Spatial Assemblyを実ローカルLLM用の型付き単発実行入口へ接続し、通信0の実行前確認と原文保存・派生幾何・HOLDの経路を完成した。実モデルの新形式設計成功は未検証。**

## 今回完了したこと

1. BN形式のexact JSON Schemaを生成し、native Ollama `format`とモデル文脈に渡す経路を追加。短い数式・予算・意味制約を併用し、B143階段の禁止axis、材料欠落、percentの小数等を型で抑制する。
2. 元日本語依頼のSHAをホストが計算してSchemaのconstへ固定。機械的メタデータをモデルの設計作業から外した。
3. 用途、寸法、階・配置、独自外形、空洞、階段、開口はモデルの出力領域のまま。ホストの建物選択・空間補修・階段自動分割なし。
4. 原文・HTTP・派生B143・対応表・真正3D・五投影・旧BC断面／空間中央断面・機能検査・未記入の人間審査を分離。raw SHAとgeometry SHAを混同しない。
5. exact requestと準備固有UUIDによる個別承認待ち、全依存ソースSHA照合、排他的試行ロック、1 POST／GET 0／再試行0を実装。準備生成は実行承認ではない。
6. オフラインprepare／inspect／replayとWindows用CMD、メモリー内偽transport試験、通信禁止ガード、Windows／Ubuntu専用CIを追加。

## 実Windowsの結果

- WindowsのNode **v24.18.1**で新BO13件＋既存BN9件＋BF/BE/BG/BJ/BK/BL37件、**59/59 PASS**。
- 実`RUN_R190BO_OFFLINE_PREFLIGHT.cmd`を通信禁止ガード付きで起動し、元高層ビル依頼・qwen3:14bの確認書を生成。終了コード0。確認書は未承認、通信0。
- `WINDOWS_OFFLINE_TESTS.txt`と`WINDOWS_CMD_PREFLIGHT.txt`に実測出力を保存。
- テスト中のfetch／TCP／TLS／HTTP／UDPを事前拒否。モデル応答試験はメモリー内の偽物で、偽localhostサーバーさえ立てていない。
- 一般依頼のCRLF原文を拒否してしまう初期不備を検出し、改行を保持したまま許容するよう修正した。原依頼の改行正規化やSHA変更はしない。

## BM比較課題の固定

Qwen `qwen3:14b`とGemma `gemma4:26b`それぞれの実行前確認を保存した。いずれも**送信していない**。

| 項目 | Qwen準備 | Gemma準備 |
|---|---|---|
| 元依頼 | BM高層ビル原文 | 同一bytes |
| 依頼SHA | `bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a` | 同左 |
| exact request SHA | `49393557b34e9b3d61d2229c6cffcaa4732cc0d887c536be3ce11cb7a7df8f67` | `d05617f202e7972545fef0b87d7f8c238daa6ee2a731357a9a335afdcadcbebc` |
| Schema SHA | `02947981e9857b993342e69c1550bf218853c051ec8003b21b2486427f017d8f` | 同左 |
| 送信候補bytes | 34742 | 34743 |
| 承認／通信 | 未承認／0 | 未承認／0 |

temperature=0.35、seed=23、num_predict=16384、num_ctx=32768。最大待機15分。現在の導入状態・Ollama版・digest確認も実施していない。BMとIR・型制約・native転送・contextが変わるため、今後新案が成立しても単一要因の改善効果は結論しない。

既存BMのA原文SHA `e54f2abf87d36e0957d8393c960d2fce8075862d00ea1ea736365121a4b6a469`、B原文SHA `8e2590128e8bd932cddc2df595fcc01c3cbd660298cedd445431d0787bb90c86`を維持。BMの全inventoryを照合した。新入口へそのまま渡すと両方`R190BN_FORMAT`でHOLD、補修・新3D生成なし。これは旧形式への追加批判ではなく、旧原文を新形式へ読み替えない境界確認。

## 合成データだけの真正3D結果

| 観測 | 2層閲覧・展示の合成例 | 横長コンコースの合成例 |
|---|---|---|
| 出所 | SYNTHETIC_TEST_FIXTURE | SYNTHETIC_TEST_FIXTURE |
| 作者指定立脚y | 1／9 | 1 |
| 空間面積 | 各288セル | 1160セル |
| 全clearHeightの遮蔽セル | 0／0 | 0 |
| 支持床欠落 | 0／0 | 0 |
| R4到達域 | 各288／288＝100% | 1160／1160＝100% |
| 目的地までの抽象最短経路 | 46歩 | 68歩 |
| 派生要素数 | 12 | 7 |
| 最終技術代理検査 | 成立 | 成立 |
| 旧BC平面アクセス | 上階HOLDを維持 | 成立 |
| 美術・依頼忠実性 | 未認定／ART HOLD | 未認定／ART HOLD |

両例とも既存BN試験用入力を無改変再利用した。高層ビルの建築例をホストが代作したものではない。実モデルがこれを設計した事実はない。各`derived/`のINVENTORYで出力bytesを固定。

閲覧入口は`REVIEW.html`、全体記録は`STUDY.json`。五投影は`DERIVED_front/rear/west/east/roof.svg`。全空間の中央z断面は`DERIVED_SPACE_SECTION_z*.svg`で、入口面だけでは見えない上階の空気も実ボクセルから確認できる。

## HOLDの確認

欠落／過去承認、準備のrequest・brief・Schema・source hash改変は接続前に拒否。同じリクエストでも前のUUID承認は次の準備を実行できない。通信失敗・HTTP不正は試行ロックを消費し、モデル原文がなければ捏造しない。

不正JSON、誤った依頼SHA、禁止材料、階段の斜め両端、percent=0.8は原文をそのまま保存してHOLD、代替3Dなし。done=false、length、HTTP500、モデル名不一致は完全に見える原文でもコンパイルしない。上階空間へ2016セルを充填する合成不具合は機能HOLDで、ホストが空気へ切り直すことはない。

## GitHub検証

専用workflow `r190bo-spatial-local.yml`の[実行 #40961560402](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40961560402)は**Windows／UbuntuともSUCCESS、2/2ジョブ成功**。検証対象コミットは`789e0926ea79dbab3dd121d7d86d7c987a5b76aa`、中核実装は`c76e2a7`。

両OSでBO13＋BN9＋既存37＝**59/59 PASS**。両方とも無通信の研究成果物を生成・アップロードし、Windowsでは実CMDも成功。`CI_WINDOWS_UBUNTU.json`、`CI_WINDOWS_UBUNTU_LOG.txt`、`CI_ARTIFACTS.json`を保存した。コンソール記録だけ改行をLFにそろえた。モデル原文・元依頼bytesは変更していない。

| GitHub保存済み成果物 | bytes | ZIP digest |
|---|---:|---|
| R190BO-OFFLINE-NO-MODEL-ubuntu-24.04 | 147480 | `sha256:106b6373066ea97de3c8aa8356136efae7cf83d54cbc33f77922e7d81c10ea74` |
| R190BO-OFFLINE-NO-MODEL-windows-latest | 147472 | `sha256:cb6316a5b8a58b01c42a444444bdc310708f05414408a70dc9b9b4b6fc1cd707` |

専用CIの成功を全体ALL GREENとは呼ばない。`CI_OVERALL_SNAPSHOT.json`の取得時点で81 workflow中15成功・1失敗・10実行中・55待機。失敗は今回変更していない既存`r55-future-source-preflight.yml`。全体CIの最終成功を主張しない。

公開前に自動承認レビューで原文の公開範囲への懸念が出たため、`PUBLICATION_AUDIT.json`で16ファイルすべてを開始HEADの**既存公開済みGit blob bytes**と照合した。BM原文／原依頼とBN合成入力の完全一致、新規非公開モデル原文0を証明した後、通常pushが承認・完了した。新規実モデル原文を公開したものではない。

## 未達と次の判定

実Qwen/GemmaがBNを理解して、自由日本語から独創的で原文に忠実な建築を成立させる能力はまだ未実証。今回はユーザーの「個別承認前は実Ollama通信禁止」を守って実推論しなかった。追加実験が必要な場合は、保存済みのexact request・予算・出所・1回制限を具体的に確認できる状態にしたうえで個別承認を得る。

実モデルによる高層ビルの技術成立後にも、低層2つの大広間・上層オフィス・上部レストランの用途と連続経路、実際の規模感、外形の独創性・魅力を原文と真正3Dから別審査する。技術PASSを美術PASSへ昇格しない。

実Ollama通信0、実モデル推論0、Minecraft接触・施工0、正式美術採用0。ART HOLD、NOT_PREPARED、9 BLOCKED、BuildPlan.operations=[]。main変更・PRマージ・force pushなし、既存Draft PR #128を維持。
