# B10 検証台帳

- B10含むStep8B系190/190 PASS (0 fail/skip)：`B10_STEP8B_190_PASS.tap`
- Step8A通常65/65 PASS：`B10_STEP8A_65_PASS.tap`
- Step8A詳細15/15 PASS：`B10_STEP8A_DETAIL_15_PASS.tap`
- Chromium HTML: 19候補・入力切替・階変更・分解図・差分表示、JS例外0・外部通信0（`set_content`による読み込み。ローカル`file://`直接起動は実行環境制限により未確認）。
- 固定5ソースファイルSHA一致。源コードとZIPの全ファイルSHAは `FILE_SHA256.json` に記録。
- B10 2D差分：5設計×6階、概念対予測123セル、内訳 オフィス02 123、他4案0。概念上の廊下の予測外18セル（オフィス02 各階3）、他カテゴリ予測外0。
- 安全：NOT PREPARED、BLOCKED、operations=[]、commandCount=0。Windows実機は今回操作0回。
- 注：初回の全テスト実行時、過去のB6系7件で `STEP8B_LATEST_EVIDENCE` パス未設定のためテスト実行エラー。正しいスナップショットと実機ログのパスを指定して190件の再実行に成功。初回エラーを機能不良/実機不良と扱わない。
