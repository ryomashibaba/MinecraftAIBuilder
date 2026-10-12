# B27 / M4.1–M4.3 実装・検証記録と次工程

## 事実の出所

- B26パッケージが保持する2026-10-10取得のWindowsソース9ファイルのハッシュとEducation v26.3の過去の材料集計のみを比較基準とする。
- Windows実機の**B27**プロセスログは、現時点でユーザーから受け取っていない。今回のCLIスモークは模擬入力であり、実機PASSとはしない。
- B26の原本486ファイルと過去の凍結証拠をバイト単位で維持する。

## M4.1 収集器の入力と出力

`tools/COLLECT_B27_M4_WINDOWS_READONLY.ps1` は通常のWindows PowerShell 5.1で実行する読み取り専用の候補。

- project markerとpackage.jsonの名前を検査し、固定9ファイルをSHA-256で照合するための情報を抽出する。
- ファイルの変更時刻とサイズを読み取り前後で比較し、読み取り中の更新を検出したときは `CHANGED_DURING_READ` を出す（完全な競合防止ではない）。
- アーカイブされた材料レコードのIDを出力せず集計だけ保存する。
- プロセスのコマンドラインはメモリ内で照合して匿名件数へ集約し、文字列やユーザーパスは出力しない。ポート8000/8765はローカル待受の**件数**だけを取得する。接続は行わない。
- Downloadsに新規ファイルをCreateNewで作成するだけ。プロジェクトとMinecraftの書き込みはなし。
- 実機動作未確認: PowerShell文法の静的点検12件のみ。実際の実行成功はWindows証拠受領後に判定。

## M4.2 自動判定

`runner/step8b-m4-evidence-gate-b27.mjs` の厳密な許可フィールド検査を導入。

- 収集時刻が明示的タイムゾーン付きで、未来5分超や経過14日超なら拒否。
- 9ソースが完全一致でも状態は `ALL_9_DISK_HASHES_MATCH` であり、loaded runtimeの同一性はfalse。
- プロファイル一致は `ARCHIVED_PROFILE_COUNTS_MATCH_NOT_LIVE_PROOF`。材料施工可能とは判定しない。
- 9ゲートは永続的にBLOCKEDであり、新規計画、ワールド座標、材料ID、施工承認は出力しない。
- Windowsからの変更/欠落ソースは `SOURCE_DRIFT_DETECTED` / `SOURCE_DATA_INCOMPLETE` として識別する。

## M4.3 差分QA

- B27新規：証拠判定32件＋収集器静的契約12件 PASS。
- B26の既存2テスト群58件 PASS。B25の関連48件 PASS。
- 150件合計は**Linuxオフライン環境の実行結果**であり、Windows実機PASSと混同しない。
- 合成模擬入力でCLIの排他的JSON保存動作を確認。模擬例を実機証拠として提出・報告しない。

## 次の実質的な工程

1. ユーザーがB27 PowerShell収集器を一度だけ実行し、そのJSONを添付する。Minecraft・Bridgeの起動やAPI呼び出しは不要。
2. B27判定器で9ハッシュ・過去材料・Node/待受件数を照合し、どの不整合を修正すべきか特定する。Node検出0でも「実行していない」ことの完全証明とはしない。
3. 本当に実装すべき施工前の残課題（通常ドアの上下状態の検証、階段開口、材料、原点、Office02）を静的実装で集約する。ワールド変更に必要なテストは**隔離環境と明示承認が得られるまでHOLD**。

`NOT PREPARED / BLOCKED / execution not permitted / no world access / no construction.`
