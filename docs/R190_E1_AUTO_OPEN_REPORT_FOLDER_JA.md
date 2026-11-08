# E1実行後の成果フォルダ自動表示

Windows 11でCLIコマンドを直接実行すると、保存処理が完了した時点で、`E1_REVISION_REPORT.json`、`E1_TWO_STAGE_REPORT.json`、`E1_STUDY_REPORT.json` の実在する保存先フォルダをエクスプローラーで自動表示する。SOURCE完成が一部・0件のHOLDでもレポートが存在すれば開く。

対象コマンド:
- `node scripts/r190-e1-revise-saved.mjs` （保存済み改訂結果）
- `.\RUN_R125_FREE_BUILD.cmd study-two-stage`
- `.\RUN_R125_FREE_BUILD.cmd study-three`

フォルダは固定パスではなく今回の実際の出力先 `result.dir` に基づく。Windows以外のCIと、モジュール関数を直接呼ぶオフライン試験では何も開かない。Windowsでは `explorer.exe` に親フォルダを単一引数で安全に渡し、シェル文字列を実行しない。呼び出し失敗でもモデル判定・既存レポート・ワールド状態は不変。非表示にしたい場合はPowerShellで `$env:MAB_NO_AUTO_OPEN='1'` を設定。

すでに保存済みのレポートやMinecraftには影響しない。SUCCESSやART認定を意味しない。