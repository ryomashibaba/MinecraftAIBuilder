# B68 — 本番ソース静的API受入れ（非実行）

## 目的
B67が作る `MinecraftAIBuilder_B67_Readonly_SourceEvidence_*.zip` を **元ソースを実行せず** B56の厳格ZIP検査器で受け入れ、5ファイルごとに静的な宣言名・公開名・参照トークンを一覧化する。B65の壁・ドア意図とB66の仮想3Dを、本番コードと照合する次工程への入口。

## 手順
```sh
cd source
node verify-b68-package.mjs
node parallel/b68/main/run-b68.mjs
node parallel/b68/main/run-b68.mjs --source-zip "/path/to/MinecraftAIBuilder_B67_Readonly_SourceEvidence_....zip" --json
```
`--source-zip` は**明示指定したローカルZIPのみ**検証する。`--json` は静的な識別子とハッシュ・診断メタデータのみ出力し、ソースコード本文・文字列定数・JSONの値を出力しない。コードを実行/importすることも、アーカイブ内のコードをディスクへ展開することもしない。

## 機能
- B56原本検証器のCRC / SHA256 / ZIPメタデータ / 不正パス / 展開上限チェックを通したZIPのみ受理
- 5指定ファイル以外は検査しない
- `PINNED_MATCH` / `VERSION_MISMATCH` / `MISSING` を別扱いし、版ずれをPASSにしない
- ES Modules / CommonJSの識別子を安全な文字走査で抽出（**完全なJavaScript構文解析ではない**）
- JSONはキー名だけのホワイトリスト診断で、値・パレット原文を出力しない
- 各機能とB65/B66契約の照合箇所を候補として分類。ただし全件 **runtimeParity: UNVERIFIED** を固定
- `NOT_PREPARED` / M4 9ゲートBLOCKED / `BuildPlan.operations=[]` は変更不可

## 制限事項
B68には本番ソースのZIPが渡されていないため、現時点で入手0/5。機能を検証したのは**合成された偽ソース**であり、元の本番コードとのAPI一致や物理ブロックの施工品質を証明していない。外部JS、関数呼び出し、Minecraft、WebSocket、HTTP、ビルド命令は実行しない。B67 Windowsランチャーの実機検証は別途必要。

## 安全上の注意
B67 ZIPはソース原文を含みうるため、アップロード前に秘密情報を確認する。本モジュール自身は原文を書き出さない。
