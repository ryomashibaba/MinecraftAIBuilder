# Step 8B/B4 — Windows runtime identity / API 監査（施工禁止）

作業日: 2026-10-10 JST。B3（8形状×4方向×seed/styleの288条件PASS）を継承。今回は **実機の読み取り専用照合用証拠収集・判定コードを整備**。ユーザーのWindowsでのB4証拠採取は**まだ未実施**。

## 実装した契約

1. `tools/COLLECT_WINDOWS_B4_READONLY.ps1`: PowerShell 5.1で8つの許可済み重要ソースのSHA-256、ローカルNode.exeプロセスの概要だけを収集。`Downloads`に **新規のJSON**を1個だけ作成。元ファイル・Legacy・凍結記録は読み取りのみ。HTTP・Bridge・Minecraft・MCP・plan/build/scan 呼び出しなし。結果にはコマンドライン全文・パス・機密情報・環境変数を含めない。
2. `runner/step8b-runtime-b4.mjs`: Windows B4証拠JSONを**別環境で**照合。249件の署名済み旧スナップショット・重要8ソースSHA・静的API契約と突き合わせる。権限違反・キーの改ざん・未知プロセス・ハッシュ差分はfail-closed。
3. `tools/AUDIT_WINDOWS_B4_REPORT.mjs`: 正規化レポートの作成。施工命令数0、`NOT PREPARED`、`deploymentGate=BLOCKED`を強制。
4. `tools/GENERATE_B4_STATIC_AUDIT.mjs`: B4の静的API資料作成。生Windowsソースは統合ZIPに再同梱しない。

## 注目するAPI

スナップショットの `package.json` は `bridge` 起動先を `bridge/src/server-step7j.js` と指定。`bridge/src/general-building.js` に `/plan/building` と `/build/building` があり、後者は `executePlan` へ到達する。**今回このいずれも実行していない**。`/plan/building` も正規plannerを呼び出すため禁止。静的コードの存在は稼働中の API 契約の証明にならない。

## ランタイム照合の限界

- Windowsディスク上のSHA-256一致は、稼働中の Node.js がどのJSコードをメモリにロード済みかまでは証明しない。起動後にソースファイルを変更した場合は特に注意。
- `Win32_Process.CommandLine` は**ローカルの検索にだけ**使用。起動したプロセスに対応する絶対プロジェクトパスを見つけても**ヒューリスティック**（手掛かり）であり、作業ディレクトリやモジュール集合の証明とはしない。
- 権限不足やプロセス不在は別ステータスで出力。`NO_NODE_PROCESS_OBSERVED` を「問題なし」と誤解しない。
- Windowsを操作して収集スクリプトを動かした実機PASSは、現段階では**未検証**。Windowsスクリプトの静的レビューは行っているが、OSによる実走の結果に代えられない。

## 継承した不可変条件

`BuildPlan.status='NOT_PREPARED'`; `operations=[]`; `commandCount=0`; `constructionApproved=false`; `executionAllowed=false`。座標と材料状態は未確定。既存建築・Legacy・凍結証拠は変更しない。新規施工は未承認。

## 次の判断

ユーザーが任意の1回のWindows実行で生成した `MinecraftAIBuilder_Step8B_B4_RuntimeEvidence_*.json` を読み取り、ハッシュ・プロセス・版差分を評価するB4.1へ進む。現時点で**稼働中エンジン一致は未確認**。一部が一致した場合でも `deploymentGate=BLOCKED` を維持。
