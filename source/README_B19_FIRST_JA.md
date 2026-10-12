# MinecraftAIBuilder Step 8B/B19 — M3 読み取り専用統合チェックポイント

1. `docs/M3_INTEGRATION_FINDINGS_AND_NEXT.md` を読み、`runner/step8b-planner-contract-m3.mjs` を確認する。
2. 旧B18ソース全381ファイルは変更禁止。旧B17凍結証拠・Legacy・既存建築も変更禁止。
3. `node verify-b19-package.mjs` でパッケージ全体を検証する（Windowsスナップショット不要）。
4. 実機ソースが手元にある場合だけ、`M3_SNAPSHOT_ROOT=/path/to/snapshot node --test tests/step8b-planner-contract-m3.test.mjs` を実行すると7つの重要ファイルを再ハッシュ可能。ソースファイルのコピーは本ZIPに含めない。
5. 新規26テスト、B18関連35テストを実施。B17以前の大型全回帰は今回実行していない。
6. M3は **非施工のアダプターのみ**。本物の建築エンジンに新機能を統合してはいない。実行時エンジン・材料・アンカー・実ブロック量子化・床スラブ階段開口は未検証。
7. 非施工の新規出力が必要なら、`node tools/RUN_M3_OFFLINE.mjs /新規フォルダ [既存Windowsソースのルート]`（出力フォルダは存在していてはいけない）。

常時 `NOT PREPARED` / `BLOCKED` / `operations=[]` / `commandCount=0` / 実ワールド変更なし。
