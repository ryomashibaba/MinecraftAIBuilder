# Step8B/B4.2 — Runtime signal contract (offline only)

## 実機B4.1の未解決事項

2026-10-10 19:21:44 +09:00のB4 JSONは、Node 4件・固定エントリーポイント候補0を報告。4プロセスの所属と起動中コードの中身は不明。ソース8/8一致は**ディスク上のバイト一致**の証明であり、Node実行中メモリを証明しない。

## B4.2で追加する手掛かり

1. 直接起動／ラッパー起動エントリーポイントの固定集合: `bridge/src/server-step7j.js`, `bridge/src/server-step7o.js`, `mcp/src/server-step7f.js`, `scripts/start-dedicated-canary.js`, `bridge/src/server.js`。
2. 起動コマンドにプロジェクトの絶対ルート＋エントリーポイントが含まれるか。CLIテキストは偽装・不正確な場合があるため**安全な証明には使わない**。
3. npm/pnpm/yarnで `bridge`, `bridge:canary`, `mcp` というスクリプト名が見つかるか。カレントディレクトリはわからないため**未束縛扱い**。
4. Win32_Processにおける親プロセス種別（NODE/CMD/POWERSHELL/OTHER/UNKNOWN）。親子関係も固有識別ではない。
5. WindowsのローカルTCP待受情報（8000, 8765）のPID所有。**ネットワーク接続なし**。これらは既定値であり、環境変数等で変更され得る。待受の所有だけではMinecraftAIBuilderの証明ではない。
6. 収集上限100プロセスを超えた場合 `PROCESS_INVENTORY_INCOMPLETE`。アクセス拒否は `PROCESS_QUERY_UNAVAILABLE`。いずれも成功とはしない。

## 分類

- `POSSIBLE_PROJECT_LAUNCH_NOT_ATTESTED`: コマンドラインにルート束縛された既知の起動先があり、重要ソースの変更時刻がプロセス開始以前。あくまで可能性。
- `PROJECT_LAUNCH_STALE_OR_AGE_UNKNOWN`: 起動先は強く示唆されるが、後からファイルが更新、または起動時刻不明。
- `UNBOUND_PROJECT_LAUNCH_HINT`: 相対起動先・npm名・ルートのみによる弱い手掛かり。
- `LISTENER_PORT_ONLY_UNATTRIBUTED`: 既定ポート待受PIDのみ。
- `NODE_PRESENT_PROJECT_IDENTITY_UNRESOLVED`: Nodeは観測、上記ヒントなし。
- `NO_NODE_PROCESS_OBSERVED`, `PROCESS_QUERY_UNAVAILABLE`, `PROCESS_INVENTORY_INCOMPLETE` はそれぞれ区別する。

## プライバシーと誤判定防止

- 収集器はコマンドライン／親コマンドライン／フルパス／環境変数／ローカルIPアドレス／トークン／ワールド位置を**一切エクスポートしない**。
- 証拠JSONはPID・日時・起動先の固定相対名・ヒューリスティックな列挙値・既定ポート番号・ソースハッシュのみ。
- レポートに `BuildPlan.operations`, コマンド実行、ワールド座標、材料ID、HTTPリクエスト、Minecraft接続を作らない。
- 収集器のsafetyフィールドは意図の宣言であり、システム内の他プロセスがワールドへアクセスしていないことの独立証明ではない。

## Windows実機テスト

B4.2収集スクリプトはWindows未実行のため、動作・コマンドライン取得権限・`Get-NetTCPConnection`の可用性は未検証。オフラインテストがPASSしても実機の動作と照合済みの証明にはならない。
