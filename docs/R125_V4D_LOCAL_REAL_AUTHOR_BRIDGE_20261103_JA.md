# V4D 本物のローカルLLM著作を汎用建築SOURCEに接続する橋渡し

**2026-11-03 JST。既存の憲章・戦略v2・R125主経路、過去V4D全候補ART REJECTを保持。** ここで行う作業は見栄えの悪い合成案をまた一つ増やすのではなく、**本物のモデル出力を、短い意味IRを介して既存の汎用3D建築SOURCEへ安全につなぐオプトイン経路**の実装である。

## 1. 何を実装するか

- `source/ai/r125-v4d-relative-author-ir.mjs`：相対配置を持つ短いAUTHOR IR `minecraftaibuilder-r125-v4d-relative-author-intent-v1` を受け入れる。各用途の主従・前後左右の接続、4幅の公的扉、屋根断面・採光・公開庭の庇と柱・用途設備は**すべて入力モデル側で選択**する。HOSTはローカルアンカー(48,42)から確定的に相対位置を算出するだけで、部屋ジャンルや名前に応じた形状のテンプレートを作らない。
- 既存 `r125-v4d-authored-topology.mjs` → `r125-v4d-envelope-integration.mjs` → 真正B143 → 2幅SOURCE動線・各用途設備のサービス位置監査、9 BLOCKED安全ゲートへ連結する。1つでも失敗すれば**入力を直さずHOLD**。未検証のMinecraft世界座標や実施工コマンドは含まない。
- `scripts/r125-v4d-local-architect.mjs`：既存 `preflightR125Ollama` を使用し、正確にモデルが `/api/tags` に列挙された場合だけ、`127.0.0.1` のOllama互換チャットエンドポイントへ最大1件のPOST。JSON形式指定、応答長とtimeoutを制限。自動再POST、追加課金API、外部URL、Minecraftワールド接続は禁止。
- **応答元テキストはモデルが不正JSON、途中打切り、SOURCE不合格の時も先に `MODEL_RESPONSE_ORIGINAL.txt` へそのまま非公開保存**する。成功した場合のみ `AUTHOR_INTENT_ORIGINAL.json` / `TRANSLATED_AUTHOR_GRAPH.json` / `TRANSLATED_AUTHOR_ENVELOPE.json` / `TRUE_B143_SOURCE.json` / `TWO_WIDE_ROUTES_SOURCE.json` / `index.html` を保存する。独立した報告は常に `V4D_LOCAL_AUTHOR_REPORT.json`。成果物をGitHubに自動uploadしない。

## 2. 嘘の成功を避ける強制ゲート

- **Github CIは実Ollamaにアクセスしない。** 自動テストの通信はテスト関数によるフェイク応答であり、たとえ最終B143が正しく出来ても `HOLD_TEST_DOUBLE_NOT_REAL_MODEL` を返す。モデルに署名/暗号的認証が無いため、ローカルの実応答の場合も `declaredProvider` を越えて「本当に特定モデルが著作した」とは断定しない。
- SOURCEが成功した実ローカル応答の状態は `SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED` であり、**ART合格でも、Minecraftで使える施工準備済みでもない**。応答モデル原文を自動で補正してSOURCEをでっち上げない。 `finish_reason=length` は打切り原文を保存して停止。
- 3～5用途ノード、うち開放公開空間1つ以上、屋内用途2つ以上を持つ**公開空間型建築の限定研究**。小さい住宅などあらゆる依頼に使える汎用完成システムではない。常に3～5用途の巨大な箱を作るものになっていないか、独立ARTで審査する。
- 現在のHOST形状制約は軸平行・単層・ローカル領域（Minecraftワールド上の位置を指定しない）。8GB Mac/2B実モデルがこの意味IRを扱えるかは未検証。2026年11月3日までの実機成功R125→B143→Education経路はそのまま保持。

## 3. ローカルで行う場合の最小操作（現時点でユーザー操作は不要）

当該研究ブランチを既に取得した**隔離した作業コピー**で、Windows PowerShellから次の1回のみ実行できる設計。原本ワールドにはアクセスしない。

```powershell
$out = Join-Path $env:USERPROFILE ("Documents\MAB_V4D_PrivateAuthor_" + (Get-Date -Format 'yyyyMMdd_HHmmss'))
node .\scripts\r125-v4d-local-architect.mjs --model "qwen3:14b" --out $out --prompt "小規模な公共文化施設を設計してください。入口、閲覧、制作、屋外の交流空間が実際につながる独自の形態にしてください。"
```

`$out` は**存在していないGitリポジトリ外の私用フォルダ**に限定される。実機が無くてもGitHubでSOURCEコードとテストだけを先行して検証可能。ローカル実行をしたと主張しない。

## 4. 今回のCI受け入れ条件

`scripts/r125-v4d-local-architect.test.mjs` は、短いAUTHOR IRの真正B143変換と3D/動線・外皮・設備サービス接続、入力無修正、偽モデル応答の非昇格、モデル未導入時のPOST=0、JSON打切り原文保護、不正IRの原文保護、localhost以外拒絶、既存フォルダの破壊防止を試す。CI完走の成否はリンクと実行HEADで確認して報告。

固定保護：main不変更、Draft PR #128 Open/Draft/未マージ、元private Qwen原文・凍結V4D案不変更、Education成功経路不変更、NOT_PREPARED／9 BLOCKED／BuildPlan空／worldWrites0、Work事前承認制。**これがユーザーの目標である本当の高品質AI建築の達成を証明するものではない**。
