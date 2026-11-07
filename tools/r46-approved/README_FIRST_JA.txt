MinecraftAIBuilder R46 — OMEN MAX 16 / 実Qwen単発生成

今回のR46について、ユーザーはChatで追加のQwen推論を明示承認済みです。
承認対象は qwen3.8:27b のローカルモデル生成 最大1回だけです。
Minecraftのワールド接続・読込・施工は一切含まれません。

実行（安全模擬CIが成功してから）：
1. GitHubの tools/r46-approved/START_R46_ONE_QWEN.cmd をファイルとして保存。
2. OMENでWindowsのOllamaが起動し、qwen3.8:27bが導入済みか確認。
3. ダウンロードしたCMDをダブルクリック。
4. 表示内容を読んで YES と入力し、Enter。
5. ソースSHA検証・偽Ollama安全テスト後、実Qwenへ1要求だけ送信。
6. 正常・異常にかかわらず、保存できた原本/ログを集めた
   R46_*_UPLOAD_THIS_RESULT.zip がExplorerで選択される。
7. そのZIPをChatGPTにアップロード。

実行後の承認消費ロック：
%LOCALAPPDATA%\MinecraftAIBuilder\R46_OneShot_Evidence\R46_APPROVAL_CONSUMED_LOCK.txt

重要：
- 同じR46用CMDを2回起動しない。失敗でも自動再試行禁止。
- R25/R44の原本や別のプロジェクトを一切上書きしない。
- R46の生成結果はB143の形式や空間構造がPASSでも、美観・独創性・
  Minecraftで実際に歩けること、施工許可を証明するものではない。
- モデル事前確認（GET /api/tags）に失敗した場合はロック作成前に停止する。
- 初回ソース取得にはインターネットが必要。モデル自動インストールは行わない。
- 施工ゲートは全9項目BLOCKED、BuildPlan.operations=[]のまま。
