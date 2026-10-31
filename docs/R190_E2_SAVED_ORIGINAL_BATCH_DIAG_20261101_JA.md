# E2実Qwen原本の一括診断（2026-11-01 JST）

目的：先行 `E2_QWEN_REPORT.json` では実モデル1回、原文SHA保存、SOURCE_HOLD の最初の違反 `E2_PROGRAM_ZONE_0` が確定。しかし原文が未提示なので、その具体的な値や別の潜在エラーはまだわからない。推測で直さず、PCに保存済みの元Qwen回答を診断する。

更新後、**`.\RUN_R125_FREE_BUILD.cmd study-e2-diagnose`** を1回実行。最新 `E2-qwen-*` の `E2_QWEN_REPORT.json` と `QWEN_E2_ORIGINAL.txt` を自動発見し、SHA256一致を検査してから、programSpaces全体のzone・witness、エントランス、ガラスの寸法と位置、独立B143契約などをまとめて検査。検出可能な複数の構造問題を同じレポートに集める。対象元ファイルは変更せず、新規 `E2-diagnosis-*` に `E2_ORIGINAL_DIAGNOSIS.json` を保存しExplorerを自動起動。

不正な構造がある限り新たなSOURCEを生成したり、アート採用扱いしたりしない。モデル推論0、Minecraft操作0、MakeCode出力0、ホスト側の建物修復0。SHA違反なら一切診断出力を作らず拒否。

次回以降のE2実モデルHOLDでは、`E2_QWEN_REPORT.json` の `validationIssues` に独立診断の具体項目を記録する。既存の唯一正本SOURCE判定は変えない。仮に構造フィールドが無欠なら、真正SOURCEの物理検査で最初に見つかった問題も追記するが、SOURCE合格と美術合格を混同しない。

原文は今回の添付には含まれないため、現段階でE2_PROGRAM_ZONE_0の数値的な違反原因を断定できない。診断後、その結果を根拠に設計インターフェースの改訂をまとめて行う。安易な自動修復・テンプレート・大量再試行は引き続き禁止。