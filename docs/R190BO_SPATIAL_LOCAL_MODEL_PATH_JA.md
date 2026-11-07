# R190-BO — Spatial Assembly と実ローカルLLM入口の接続

2026-10-30 JST。開始HEAD `6f8b3ac3b292fa0b72ca8063c24bc966f5b56527`。
既存Draft PR #128、`feature/b198zr1-protected-architectural-revision`上で開発。

**新しい実行経路と通信0の実行前確認を実装した。実Qwen/Gemmaによる新形式の設計成功はまだ未検証。実Ollamaへの通信・推論は0、ART HOLD。**

## 確認した既存研究

- R190-BMのWindows実機Qwen3:14b、高層ビルA/B各1回は原文取得2/2、厳密B143成立0/2。Aのschema欠落、Bの階段材質欠落に加え、高さ・階構成・中身の充填・入口と経路の問題がある。新形式の合成成功を旧実モデルの成功へ読み替えない。
- R190-BNは作者が空間の空気寸法、立脚高さ、外皮、フライト、開口等を選び、決定論的にB143へ写す新形式。従来のsemanticのホスト配置やB143の塊への用途名付けとは異なる。既存BN変換器・B143・R4・BCの判定を変更していない。
- BMのINVENTORY掲載ファイルすべてを毎回SHA照合。元A/B、各HTTP原本、既存証拠・BNの保存済み合成結果も無改変。

元依頼は次のUTF-8 bytesをそのまま再利用する。末尾改行も変更しない。

```text
大きめの、都会にある高層ビルを作って
一階と二階は大広間で、三階以上の階はオフィス、最上階付近はレストランが欲しい
かなり大規模でかなり高くして
```

SHA256 `bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a`。
汎用入口の`--brief FILE`では別の自由な日本語依頼も受け取る。高層ビルの語に応じて建物や床構成を選ぶ分岐はない。

## 実装の分担

`source/ai/r190bo-spatial-model-contract.mjs`はJSON Schemaと短い横断制約を作る。Ollama native `/api/chat`の`format`へSchemaオブジェクトを渡し、同じSchemaをユーザーメッセージにも提示する。自由文の注意書きだけに型遵守を任せない。

- 型：exact object、required、additionalProperties=false、整数範囲、材料enum、ADD/CUT別variant、6形状別の許可フィールド、階段axis=x/z・2..32段、到達percent=1..100整数を伝える。
- 機械的情報：元依頼SHAをホストがUTF-8 bytesから計算し、メッセージとSchemaのconstへ固定する。モデルは提示値をコピーする。モデルにハッシュ計算を求めない。
- 設計：用途、空間寸法、階高さ、配置、外形、主要空洞、各フライトと踊り場、床・外壁の開口、目的地と検査領域はすべてモデルが選ぶ。座標入りの建物例・固定室数・階数・完成テンプレートは送らない。
- Schema単独で表せない参照整合、use+experience合計、形状の境界、フライトの距離式、途中占有、展開要素数・work、最終空気と支持床・経路は既存BN/B143/R4が検証する。生成Schemaは型を限定する入力支援であり、正式なコンパイラを置き換えない。
- Schemaは既存契約の生成用部分集合。検査用idはBNと同じ小文字ハイフン形、CUTの無意味なshell=0も出力候補から除外する。既存B143の受理範囲を変更していない。

Ollama公式の[Structured outputs説明](https://ollama.com/blog/structured-outputs)にあるnative `format`契約を使用する。実Ollama版・実モデルがこのSchemaを解釈できることは未検証。非対応時はHTTP原文とHOLDを残し、jsonモードへの自動切替・再送はしない。

## 通信0の入口と、将来の個別承認

`RUN_R190BO_OFFLINE_PREFLIGHT.cmd`は完全checkout内だけで、BM原依頼とqwen3:14bの実行前確認を生成する。Nodeがない・ソースがない場合は終了し、ダウンロードやモデル探索はしない。既存出力は上書きせず拒否する。

```powershell
node scripts/r190bo-spatial-local.mjs prepare --model qwen3:14b --out NEW_QWEN_PREFLIGHT
node scripts/r190bo-spatial-local.mjs prepare --model gemma4:26b --out NEW_GEMMA_PREFLIGHT
node scripts/r190bo-spatial-local.mjs inspect --prepared NEW_QWEN_PREFLIGHT
```

`ORIGINAL_BRIEF.txt`、完全な`EXACT_REQUEST.json`、`OUTPUT_SCHEMA.json`、`PREFLIGHT.json`、日本語確認を保存する。Qwen/Gemmaの完全タグを指定し、cloudタグは拒否する。実行前確認で/api/tags、/api/version、/api/ps等を呼ばない。インストール状態・現在のdigest・モデル身元は未確認と記録する。

既定要求はtemperature=0.35、seed=23、num_predict=16384、num_ctx=32768、stream=false。待機上限15分。BMとはIR・native転送・Schema・contextが異なるため、同じ課題でも統制されたA/Bや因果的優劣の証明とは扱わない。BMの導入済みモデル情報は過去の観測に過ぎない。

将来の`run --prepared DIR --approval PHRASE --out NEW_DIR`は、**その準備について人間が別途承認した後だけ**使用する。今回そのコマンドは実モデルに対して実行していない。承認フレーズはexact request SHAと準備ごとのUUIDに結びつき、同じ依頼でも以前の準備・BMの承認を流用できない。文字列による明示操作ゲートであり、人間の身元を暗号認証する機能ではない。エージェントが生成ファイルの値を読み取ったことは実行許可にならない。

実行時には依頼・リクエスト・Schemaと、コンパイラ／評価器／レンダラーを含む静的依存ソース全体のSHAを再照合する。変更があれば接続前に拒否する。`ATTEMPT_CONSUMED.json`を排他的に作成してから127.0.0.1:11434/api/chatへ最大1 POST。GET 0、リダイレクト禁止、再試行0。通信エラーでもロックを消さず、同じ準備で再送できない。新しい準備にも新しい個別承認が必要。

## 原文と派生成果物の出所

| 保存物 | 出所と意味 |
|---|---|
| EXACT_REQUEST / PREFLIGHT | ホストが事前固定した送信bytes、型・予算・承認待ち・ソースSHA |
| PROVIDER_HTTP_BODY | 実行した場合のみHTTP本文そのもの。応答内容やthinking等の自己申告もここに保存 |
| MODEL_ORIGINAL | message.contentをJSONデコードした文字列を変更せずUTF-8保存。HTTP本文とは別SHA |
| CAPTURE | 原文／依頼SHA、完了理由、出所、HOLD理由、設計補修なし、未認定事項 |
| DERIVATION | 作者operation/space→生成B143要素対応、階・用途の原値、各SHA |
| DERIVED_B143_PROPOSAL | 作者Spatial Assembly数値からの決定論的B143/R4。モデルが直接書いたB143原文ではない |
| DERIVED_3D / 五方向SVG | 同一の厳密B143の実ボクセルを表示。3Dは表面セル描画、検査は全セル |
| DERIVED_SECTION | 既存BCの入口z面と同一高さの幅2経路。多層R4と別判定 |
| DERIVED_SPACE_SECTIONS | 作者空間の中央z面を規則で選んだ全高実断面。設計変更0、選択式を保存 |
| FUNCTIONAL_REVIEW | 最終空気容量・支持床と作者申告のR4単一セル経路。独立した用途適合審査ではない |
| HUMAN_REVIEW_TEMPLATE | 原依頼・原文・形状SHAへ固定した未記入の依頼忠実性／美術審査欄。架空採点なし |
| INVENTORY | 各保存ファイルの実bytes数・SHA256 |

原文を検査前に保存する。不正JSON・旧形式・ハッシュ不一致・階段や材料の不適合では原文を保全してHOLD。完了理由length、done=false、HTTPエラー、モデルタグ不一致は、内容が完全なJSONに見えても派生コンパイルしない。HTTP自体が不正、内容なし、通信失敗ではHTTPや失敗記録だけを保存し、存在しないモデル原文を捏造しない。

BN数値がコンパイル可能でも最終空間・経路が不成立ならHOLDのまま診断用派生幾何を残せる。欠けた階段・入口・床の追加、材料・寸法・軸の変更、JSON fence除去、別建物への置換、自動再試行はない。

```powershell
node scripts/r190bo-spatial-local.mjs replay --prepared PREPARED_DIR --original SAVED_ORIGINAL.txt --out NEW_REPLAY
```

これは無通信での再検査。保存原文の出所やprovider完了を独立認証できないため`SAVED_SOURCE_UNVERIFIED`と記録し、実モデルの新規成功として数えない。過去BMのA/Bは新BN形式でないため、そのままHOLD、真正3Dなし。

## オフライン研究と判定限界

`node scripts/r190bo-offline-study.mjs --out NEW_STUDY`は、BM原依頼のQwen/Gemma実行前確認、旧A/Bの無補修拒否、BN既存合成2例のリプレイをまとめて作る。成功する2作品は**SYNTHETIC_TEST_FIXTURE**であり、BM高層ビルの代替作品でもモデル生成でもない。

2層合成例は作者のy=1/9、空気・床・フライト・踊り場・開口を保ってR4技術代理検査が成立する。一方で上階の旧BC平面経路はHOLDを維持する。横長の別合成例ではellipsoidとガラス開口を保持し、箱だけの方式に限定されないことを確認する。いずれも原依頼忠実性・美術・実モデル汎用性のPASSではない。

実モデルが高層ビル依頼の二つの大広間、上層オフィス、最上部レストラン、全用途への連続経路、魅力的な外形を自力で成立させるかは**個別承認後の未実施研究課題**。技術チェックだけでそれらを認定しない。構造耐力、採光、避難、幅2の連続階段動線、Minecraft実歩行も未認証。

## 検証と保存

新BOテスト13件、既存BN9件、BF/BE/BG/BJ/BK/BL37件の計59件を対象とする。JSON型の伝達、CRLF原依頼の保持、過去承認拒否、準備改変、1 POST、通信失敗でのロック、切断・形式失敗の原文保全、偽3Dなし、2層と非箱形状、実CLI、既存証拠SHAを確認する。

専用GitHub ActionsはWindowsとUbuntu、Node24で同じテストと成果物生成を実施し、Windowsでは実CMDも起動する。`r190bo-deny-network.mjs`をテスト・研究・CMDへ事前ロードし、fetch/HTTP/TCP/TLS/UDPをソケット作成前に拒否する。モデル応答テストはメモリー内の偽transportのみで、localhostに偽サーバーも立てない。GitHubのcheckout・ランタイム準備・成果物保存自体の通信とは区別する。

実行結果・CI URLは`evidence/r190bo/REPORT_JA.md`へ記録する。今回main変更・マージ・force pushなし。NOT_PREPARED、9 BLOCKED、BuildPlan.operations=[]、Minecraft接触・施工0、ART HOLD、正式美術採用0。
