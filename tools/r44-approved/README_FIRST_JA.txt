MinecraftAIBuilder R44 — OMEN実Qwen単発試験 / 2026-10-20

【このR44の実行許可】
ユーザーはChat内で新規 qwen3.8:27b の推論1回を明示承認済み。
実行はOMEN MAX 16のWindowsローカルOllamaのみ。
Minecraft Educationの接続・読み・施工・破壊は一切不可。
R25過去原本は永久保護。自動再試行と別モデルへの切り替え禁止。

【起動方法】
1. GitHubの tools/r44-approved/START_R44_ONE_QWEN.cmd をファイルとして保存。
2. 保存した START_R44_ONE_QWEN.cmd をダブルクリック。
3. 内容を確認し「YES」と入力してEnter。
4. 自動でSHA固定のソースだけを軽量取得し、模擬モデルの安全QAを行う。
5. 続いてOMENのローカルOllamaへ、qwen3.8:27b の本物の生成要求を最大1回送る。
6. 結果ZIPがExplorerで選択される。名前が _UPLOAD_THIS_RESULT.zip で終わる1つをChatGPTへ提出。

【結果】
%LOCALAPPDATA%\MinecraftAIBuilder\R44_OneShot_Evidence\
に新しい結果フォルダ、使用済みラッチ、結果ZIPを保存する。
GitHubに原本は自動アップロードしない。ChatへユーザーがZIPを提出する。

【必要環境】
Windows PowerShell 5.1、Node.js 24、インターネット（初回軽量取得用）。
ローカル Ollama の 127.0.0.1:11434 で、モデル名が厳密に qwen3.8:27b として存在すること。
不足・接続不可ならHOLD。モデルの自動ダウンロードはしない。

【出力の意味】
B143/R3 の数学的な検証に合格しても、建築の美しさ、独創性、
人間が歩けること、Minecraftで施工してよいことの証明ではない。
R41〜R43の結果、オフライン3DとR13は評価資料であり認証ではない。

【安全な扱い】
YESを入力せず終了したら推論しない。
使用済みロックが作られた場合は失敗しても、同じCMDをもう一度実行しない。
モデル応答が不完全でも原本を勝手に閉じたり修復したりしない。
結果ZIPを提出すれば、追加推論なしで失敗箇所を分析できる。
