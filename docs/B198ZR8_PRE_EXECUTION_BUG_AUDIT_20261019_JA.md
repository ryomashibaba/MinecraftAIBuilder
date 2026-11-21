# B198Z-R8 — 実Qwenを起動する前の基本バグ監査
2026-10-19 / ユーザーの承認：`qwen3.8:27b` によるローカルの建築設計 **1回のみ**。Minecraft施工は恒久的にHOLD。

## 大前提
今回の調査・修正・GitHub Actions CIでは、実Qwenの推論を**一度も実行していない**。ChatではWindows PCのローカルOllamaを直接起動できないため、承認を受けてもこのGitHub作業では推論回数0。ユーザーの1回の承認枠は未使用。

## 調査対象
- `scripts/RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd` — Windowsの実際のコマンド、文字列承認、GUID保存先、PowerShell ZIP化・ファイル表示
- `source/ai/b198zr8-read-only-model-preflight.mjs` — Ollama一覧をGET、モデル未導入時のPOST抑止
- `source/ai/b198s-native-ollama-source.mjs` — Ollama native HTTP、推論1回、think:false、原文の無改変保存
- `source/ai/b198g-local-model-adapter.mjs`、`scripts/b198zr6-authorized-single-r4-capture.mjs` — R4 JSON、B143/R3、エラー、SHA、ファイル/受入
- `scripts/b198zr7-offline-visual-review.mjs` — 実概念セル→ブラウザ3Dと凍結B198Bの手動品質審査
- `source/ai/b198zr5-model-comparison.mjs` — 本物のQwen元原本とR4試験結果の区別

## 見つけて修正した問題

### 1. モデル一覧確認のタイムアウトで誤ったエラー名
- 元コードはタイムアウト→ソケット切断→接続失敗イベントという順序により、`HOLD_TAGS_TIMEOUT` を `HOLD_LOCAL_OLLAMA_UNREACHABLE` と誤記録しうる。
- タイムアウト原因を先に確定するよう修正。`scripts/b198zr8-read-only-preflight.test.mjs` に意図的に固まるHTTPサーバを使った回帰テストを導入。
- 処理はGET `127.0.0.1:11434/api/tags` のみ。実モデルをロードせず、未導入ならPOSTゼロ、インストール無しの自動ダウンロードも行わない。

### 2. Windows CMD→PowerShell ZIPの実環境テスト不足
- R1–R8初版はJavaScriptのモックCIのみで、Windows CMDユーザー入力・PowerShell圧縮の実際の連結を未検証。
- `scripts/b198zr8-windows-launcher-smoke.test.mjs` + 既存GitHub CIのWindowsジョブを追加。
- テストは **Windowsに先に偽のOllama HTTPサーバを127.0.0.1:11434で独占起動**。bindできなければCMDを起動しない（本物のOllamaへ誤送信しない）。
- 実Windows CMDに「不正な承認文→POST0」、続けて「有効な承認文→GET一覧1＋擬似生成POST1」を送信。PowerShell ZIPを展開し、原文、SHA、B198W評価票、オフライン3D、NOT_PREPARED、worldWrites0を検査。
- 追加で、一覧からQwenモデルを外して再実行した**別の模擬操作**を検査。認可文を入力してもGETだけ、生成POST増加0、HOLDレポートと診断ZIPを作成したか確認。
- これはGitHubのWindowsランナーであり、ユーザーの実PCを遠隔操作したわけではない。

### 3. Qwenが有効なB143形状＋不正な空間計画を返すと3Dプレビューを失う
- R4の4項目JSONが無効な場合、原文は保存されていたが、`design` が有効でも視覚評価ファイルを作れなかった。単発の高負荷推論を無駄にする問題。
- 原文を一切修正せず、`design` だけを独立B143でコンパイルできた場合は3D `index.html` と人間評価票を保存する**限定的な救済**を実装。
- **R4モデル出力としては引き続きHOLD**。空間計画の欠落や不正を合格扱いしない。`sourcePreviewSalvagedFromUnacceptedR4Envelope:true` と明示し、原文SHAと形状SHAを分離。
- B143形状も不正なら3Dを生成しない。元のモデル出力は原文のまま保持。

## CIで本当に確認した事実
- 実Windowsランナーでの `.cmd` 起動、承認文字列、模擬HTTP GET+POST、PowerShell ZIP、ZIP展開と内容検査がPASS。
- 未導入Qwenとして登録された偽サーバでは、GET後にPOSTを送らず、HOLDとZIPを作ることがPASS。
- タイムアウトの正しい分類、途中で返された不正なJSON/空間計画でも原文保持、追加推論ゼロ、Minecraft接続ゼロをPASS。
- 旧B198S、R3、R4、R5のリグレッションをCIで再実行。テストは**偽モデルを使用**し、実Qwenの建築センスやGPUメモリを判定していない。
- CIが複数コミットで起動するため、最終成功確認はこのレポートと同じ最新HEADの結果で判断すること。

## まだ未知の事柄（バグが無いという証明ではない）
1. 実Windows PCでのOllama起動状況、`qwen3.8:27b` 正式タグ、27BのGPU/メモリ収容。タグ一覧の存在はロード可否を保証しない。
2. 実モデルが3072出力トークンで4項目（空間計画+全3D形状）の完全なJSONを返せるか。失敗しても自動でトークン増量・再推論しない。
3. 実モデルの3D美観、構造的な魅力、階間の実Minecraftブロック/アバター歩行。B143/R3のPASSはゲーム実機PASSではない。
4. GitHub ActionsのWindows検証がユーザー固有のOllama／Windowsアカウント／ドライブ権限を保証するわけではない。

## 次の操作（実Qwenはまだ走っていない）
ユーザーは本チャットですでに、**Qwenローカル建築生成1回**に明示承認済み。追加で何度も許可を求めない。ただし、Windowsでのローカル実行はユーザー自身が行う。最新のPR #128ブランチを自分のPCに反映し、`scripts/RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd` を起動して画面の承認文字列を手入力する。1個できる `*_UPLOAD_THIS_RESULT.zip` をこのチャットに添付する。

Minecraft起動、建築施工、Minecraftワールド読み書き、モデルの自動ダウンロード、課金API、Work、自動再試行や2回目のQwen推論は一切含まない。`NOT_PREPARED` / nine `BLOCKED` / `BuildPlan.operations=[]` を維持する。
