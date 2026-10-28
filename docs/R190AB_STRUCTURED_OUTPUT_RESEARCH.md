# R190-AB — Qwen3:14b 厳格JSON出力と建築能力の分離研究

## 根拠と研究上の問題

R190-AA pilot-01は実Qwenの原文2,581バイト、SHA256 `0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17` を保存したが、B143で0/1コンパイル。 `evidence/r190aa/pilot-01/` の報告・監査・原文を正本とする。JSON構造は `attempt/maxAttempts` が余分、schema=`b143`、3個のcutに`material:null`、staircase axis=`y`。さらに切削空洞の非交差、南側開口なし、到達点が固体内、床の重複が見つかった。**失敗は形式と空間設計の両方**。

R190-AAのWindows側には `scripts/r190aa-local-work-pilot.mjs` と `*.test.mjs` の未コミット修正がある。**この2ファイルを上書き・checkout・resetしないこと。** R190-ABは別ファイル・別実験ディレクトリで、既存のpilot-01も変更しない。

## 今回の比較条件

**R190-AB**では、元pilot-01と同じ日本語図書館課題・同じ `qwen3:14b` を使用し、OpenAI互換APIの一般JSONモードでなく、Ollamaのネイティブ `POST http://127.0.0.1:11434/api/chat` で `format: <JSON Schema>` を指定する。制約をモデルが満たすかは未実証であり、必ず現地検証する。

スキーマはB143の6形状（box, ellipsoid, cylinder, torus, beam, staircase）をサポート。ADD要素には必須material、CUTにはmaterialなし、staircaseはADD専用でaxis x/z。全ての返信トップレベルは `design/explanation/assumptions/spatialPlan` の4キーのみ。内部制御フィールド `attempt/maxAttempts` を要求ペイロードに含めない。位置・空間のアイデアはモデルが選択し、ホストは事後検証のみ。スキーマでは幾何の交差・動線・屋根の魅力までは保証しない。

新規試行はローカルでの明示的な `--run` のみ。実験名は一意で、一度使ったら**どんなHOLD結果でも再実行禁止**。自動ダウンロード・自動モデル変更・リトライなし。ネットワークは127.0.0.1:11434の `/api/tags` と `/api/chat` のみ。モデル回答は完全な原文を変更せず保存し、SHAを記録する。

## 実行手順（ローカルWorkだけが実機実行）

1. 正規フォルダ `C:\Users\ryoma\Projects\MinecraftAIBuilder` で `git status --short`、ブランチ、HEAD、未コミットの2ファイルを確認する。未コミット変更は保持。GitHub側の新規研究ファイルを取り込むときに未コミット内容を上書きする恐れがある場合は止め、状況を報告。
2. GitHubのR190-AB FAKE ONLY専用Actions結果を確認する。`node --test scripts/r190ab-structured-output-pilot.test.mjs` が通ったことを確認。
3. 推論なし:`node scripts/r190ab-structured-output-pilot.mjs`。原文保存先は無視対象の `r190ab-local-evidence/`。
4. **ユーザーが実Qwenの1件試行を明示許可した場合に限り**実行:

```powershell
Set-Location "C:\Users\ryoma\Projects\MinecraftAIBuilder"
node scripts/r190ab-structured-output-pilot.mjs --run --study contract-01 --model qwen3:14b
```

5. `r190ab-local-evidence/contract-01/`の `R190AB_ATTEMPT.json`、`MODEL_RESPONSE_ORIGINAL.txt`（取得できた場合）、`R190AB_RESULT.json`、コンパイル後のみ生成される真正B143 HTML/SVGを検証する。
6. 旧pilot-01の原文と独立に比較する。**A: 構文適合性（厳格なソース）**、**B: 建築機能（空洞・到達・階段・屋根）**、**C: 美術魅力（人間評価）**に分けて判定し、1件のみで一般成功率を主張しない。

実験でOllamaが複雑なJSON Schemaを受け付けない、出力が空、モデルが失敗する場合はその1件をHOLDとして記録。スキーマ弱体化、同名再試行、原文を補修した3D生成はしない。

## GitHub上のR190-AA集計修正とローカル差分の共存

R190-AAのGitHub側でも、**実際の原文SHAを持たない1件だけの失敗をCAPTUREDとして数えない**変更と、その回帰テストを追加した。Windowsの未コミット2ファイルと修正目的が同じため、次にローカルWorkで同期する際は必ず差分同士を比較し、実装の重複・片方の改善の取りこぼしを避ける。

1. まず `git status --short` と `git diff -- scripts/r190aa-local-work-pilot.mjs scripts/r190aa-local-work-pilot.test.mjs` で未コミット内容を読む。差分はローカルの既存証拠フォルダ外にも安全にバックアップする。
2. `git fetch origin feature/b198zr1-protected-architectural-revision` は変更を作業ファイルに上書きしないが、`git pull`、`reset --hard`、`checkout -- <file>` はこの段階では実行しない。
3. ローカル修正とGitHub修正を、差分とテスト結果で照合。両方の意味が同一なら重複適用せず、独自の追加修正があれば保護して手動統合する。
4. GitHubのAAとAB専用ActionsがともにSUCCESSとなったことを確認し、ローカルの該当テストも実行してから、新しい実験を判断する。未解決の変更を破棄しない。

R190-ABにはローカルOllamaが返す `total_duration`、`load_duration`、`prompt_eval_count`、`prompt_eval_duration`、`eval_count`、`eval_duration` を可能な範囲で保存する。単位はdurationがナノ秒、個数がトークン数。追加で測るprovider区間の壁時計時間とは区別し、Ollama申告値であることを明記する。ネイティブAPIの複合JSON Schema（特にoneOf）のローカル版での対応はまだ未実測のため、初回の失敗はHOLDとして保存し、勝手な再試行で隠さない。

## 制約と採用条件

`readiness=NOT_PREPARED`、`constructionApproved=false`、`executionAllowed=false`、9 `BLOCKED`、空 `BuildPlan.operations`、worldContacts=worldWrites=0。正式美術採用0件、ART HOLD、Minecraft施工禁止。CIのfake-only成功は実Qwen品質合格を意味しない。

**正式な次の判断**：R190-ABで構文は改善しても、実室内・動線・非対称性・美しさが未改善なら、B143直接設計に依存する方式の限界として、モデル自体が空間プログラムから幾何まで一貫して生成する別方式の比較研究を優先する。
