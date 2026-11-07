# B198Z-R44 — 新しい明示承認に基づく実Qwen単発生成の準備と一操作Windows実行

## 今回のユーザー承認

ユーザーは「次の工程へ作業を進めてください / Qwen推論に明示承認」と指示した。
**新規のR44単発 `qwen3.8:27b` ローカル推論1回**を対象とする。
旧R25の承認は使用済みであり再利用しない。
新承認はMinecraftワールドの接続・読み取り・書き込み・施工の許可ではなく、有料APIや別モデルへの切替も認めない。
一回のモデル呼出しがHOLD/失敗/timeoutであっても自動再試行しない。

## R44で実装した差分

- `source/ai/b198s-native-ollama-source.mjs` に明示opt-inの `r44SpaceGuide` を追加。R11/R21/R23と排他的。従来のプロファイル内容を変えない。
- `scripts/b198zr44-consented-single-qwen.mjs` がR44専用新承認を検査、ローカル `127.0.0.1` の`/api/tags`読み取りだけでモデル存在確認、その後`wx`の承認消費ロックを作成して、`/api/chat`へ**最大1 POST**を要求。
- 凍結ベンチマーク`c01`の海沿いの未来型公共図書館（中央巨大吹き抜け、左右立体書架、最上階星空ラウンジ、曲線的外観）を使用。ユーザーの自由要求に対する汎用AIの品質を比較する単一基準であり、テンプレート選択ロジックではない。
- 出力制限`3072`、文脈`6144`、`think:false`、`temperature:0.35`、`timeout:300s`。旧試行との比較のため出力予算は変更しない。
- 受信したモデルの生文字列は**一切補正せず、厳格なB143検査より先に**`R44_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt`に保存。元のR25原本には触れない。
- 厳格B143とR3の成立性を判定。後段でR41（空間失敗原因）、R42（省略可能なソース記述）、R43（実ボクセルの断面）、R13（人間評価待ち）および成立する場合のR7 3D視覚化を保存。
- R3/形式合格でもモデル作者の認証、Minecraft実歩行、美観、独創性、人間品質承認は自動認定しない。原因不明の失敗はHOLDとし、生成し直さない。

## OMEN向けWindows運用

`tools/r44-approved/START_R44_ONE_QWEN.cmd` を1ファイルだけ保存しダブルクリックする。
- 通信前にNode.js 24とWindows PowerShellを確認。
- ユーザーのChat承認とは別に、ローカル端末で`YES`を入力して初めて新しい一回を実行する。
- CMDは固定コミットからPowerShellランナーを取得してGit blob SHAで確認。ランナーはSHA固定のR44 source-onlyインストーラを取得。
- インストーラは旧R24の検証済み37ファイルにR44の独立した10ファイルをSHA固定で上書き・追加し、**計46ソースファイル**を別フォルダに置く。R24/R16/凍結原本は上書きしない。
- Nodeの偽HTTPテストを実行してから`qwen3.8:27b`の実モデル呼び出しに進む。実モデルがOllamaの一覧になければ消費ロックより前にHOLD。
- 推論結果の原本、署名無し比較レシート、分析レポート、あるなら3Dビューアを含む**結果ZIP 1個**を作りExplorerで選択する。ユーザーはそのZIPをこのChatに提出する。
- 失敗時も使用済みロックは保持。**R44は決して再実行しない**。通信が行われたか不明な場合も成功を主張しない。
- 再利用する`R24`インストーラにより初回のみネット接続・軽量ファイル取得が必要。モデルの自動ダウンロードやAPI課金は行わない。

## 安全なCIの区別

- `scripts/b198zr44-consented-single-qwen.test.mjs`: Linux/Windowsで注入した偽Ollamaのエフェメラルポートを使う。実モデルの命令は送らない。
- `scripts/b198zr44-windows-one-click-fake.test.mjs`: Windowsで偽サーバーを`127.0.0.1:11434`へ**先に確実にbind**してから起動する。bindできない時は実CMDを起動せず、外部のOllamaへ誤POSTしない。
- これらのCIはユーザーの本当のOMEN環境や実Qwenの性能を証明しない。

## 永続する安全条件

```
readiness=NOT_PREPARED
constructionApproved=false
executionAllowed=false
gates=BLOCKED x 9
BuildPlan.operations=[]
automaticRetries=0
modelCallsInGitHubActions=0 (real model)
Minecraft world contacts/writes=0
```

## 次の確認

1. 同じPR #128の最新コミットとWindows/Ubuntu CIを確認。
2. CI成功後、`START_R44_ONE_QWEN.cmd`への固定GitHubソースURLと保存・実行手順を提示。
3. ユーザーOMENの実Qwen推論が実施されるまで「実モデル品質改善」は**未確認**。
4. 結果ZIPが届いたら原本SHA・R44ロック消費・実際のモデル診断・失敗分類を確認し、人間による3D外観/内部審査に進む。
5. 新しい承認なしに再推論せず、施工も別の明示承認・9ゲートPASSまで完全HOLD。
