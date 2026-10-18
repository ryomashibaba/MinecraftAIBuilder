# B198Y — 最初の実Qwen建築ソースを失わず回収する

## 継続元
B198X Draft PR #126 / `4451c3a8939687ad09c56a8e836f264b114584c2` から積み上げ。mainは使用せず、旧Draft群をマージしない。B198Xと同じ自由日本語→独立B143コンパイル→3D人間レビュー→元ソース保護付き修正という正規経路を維持。

## 何を変えたか
1. `tools/B198M_RUN_LOCAL.ps1` のSourceProbeに予期しない例外が起きても、出力フォルダができた後なら `B198S_UPLOAD_THIS_RESULT.zip` の回収を**一度だけ**試みる。保存済み `B198U_ORIGINAL_MODEL_RESPONSE.txt` / 正規化候補 / trace / 部分サマリー / HOLD理由を可能な範囲で同梱する。元のファイルを変更・上書きしない。
2. 不明な呼出回数は `UNKNOWN`、再コンパイル結果は `UNVERIFIED`、出力状態は `HOLD_SOURCEPROBE_NOT_CERTIFIED` と表示する。エラーでAI建築が成功したように見せない。レスポンスが**一度も返らなければ**生JSONはないと正しく表示する。
3. 旧B198V/WとB198X Windows CIが新規インストーラーを参照するときの旧v1/v2/v3パス不一致を解消。B198Yは改変防止SHAキャッシュを尊重し、既存v1〜v3を変更せず `offline-workbench-v4` に導入する。Windows CIでは、実LLMなしの意図的なHOLDでも回収ZIPが生成されることを試験。

## 今回の作業範囲外
本物の `qwen3.8:27b` の追加実行、新しい建築の成功、美観合格、施工成功は**一切主張しない**。原本B99/B100・296候補・18保留・旧成功建築・FAILED journalは不変。新規Minecraft接続/施工・削除は無承認で実行禁止。全9ゲート `BLOCKED`、`NOT_PREPARED`。

## Windowsでの使い方（ユーザーが操作すると決めたときのみ）

まずv4を導入する。このインストールはモデル推論を呼ばない。Node.js 22以上が必要。

```powershell
$p = Join-Path $env:TEMP 'B198Y_INSTALL_OFFLINE.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/feature/b198y-first-real-source-recovery/tools/B198V_INSTALL_OFFLINE.ps1' -OutFile $p
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p -Model 'qwen3.8:27b'
```

`Documents/MinecraftAIBuilder-B198V/offline-workbench-v4` 内に3つのCMDができる。既存v3は保持する。

- `REPLAY_LATEST_OFFLINE.cmd`: Documents/MinecraftAIBuilder-B198M以下にB198U以降の原本応答が保存済みなら、モデル0回でB143コンパイルと3Dレビューを再作成する。未保存なら `NO_PREVIOUS_CAPTURED_MODEL_SOURCE` が正しい結果。
- `RUN_ONE_REAL_MODEL_ONCE.cmd`: **ユーザーが明示的に起動する時だけ**Qwenの単独生成を実行する。自動リトライなし。入力は凍結済みc01未来公共図書館。新規課金API不要。数分かかる場合がある。成功・通常HOLD時は既存アップロードZIP、異常HOLD時はB198Y回収ZIPを生成する。未応答なら生ソースは存在しない。
- `PREPARE_QUALITY_REVISION.cmd`: 本当に人間が3Dを評価したB198W評価JSONから、ゼロ推論でSHA固定の改修ブリーフを作る。モデル修正と施工は自動実行しない。

**提出物は `B198S_UPLOAD_THIS_RESULT.zip` または `B198U_UPLOAD_THIS_REPLAY.zip` の一方のみ。** 3Dがまだ無いなら採点を求めない。生JSONが含まれているHOLDは、次工程でモデル追加実行なしに原因を特定する。生JSONが無いHOLDは原理的に元モデルの建築を復元できない。

## 次の合格判定
(1) 独立B143でソース・幾何SHA再計算PASS → (2) 人間が3D外観・内部・吹き抜け・ラウンジ・用途への忠実性を評価 → (3) 低評価なら元ソースと選択された保護部材のSHAを保持して改修 → (4) 図書館以外にも横展開。固定建物カテゴリへの退化は禁止。