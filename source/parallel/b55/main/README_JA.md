# B55 — 本番ソース原本受入れと未確認項目ゲート（非施工）

## 今回の実装

B54の設計レビュー指標を増やす代わりに、B13のWindows検証済み**5ファイルのSHA256固定値**を再利用する、ハッシュ付き本番ソース受入れ機構を実装。提供したコード自体は読み込まず、バイトSHA256のみを照合する。取得できた場合も本番パリティや動作検証は **UNVERIFIED** のまま。ソース、正規生成結果、稼働中プロセスの同一性はそれぞれ別の証拠が必要。

- 入力：`engine/src/general-building-planner.js`、`engine/src/building-grammar.js`、`engine/src/architectural-quality.js`、`modules/architectural-library.js`、`styles/urban_japanese.json`。
- 結果：`PINNED_MATCH`、`VERSION_MISMATCH`、`MISSING`、`UNSAFE_LINK`、`OVERSIZE` 等をファイル単位に分類。内容/絶対パスはレポートに埋め込まない。
- 8つの能力・証拠ギャップを明示し、ソース照合から施工許可への自動昇格を常時禁止。
- 既存15案/5棟30階は未承認のまま凍結。Minecraft接続・スキャン・施工・Planner import/実行は0回。

## 最短コマンド（このZIP内で実行可能）

```sh
cd source
node verify-b55-package.mjs
node --test parallel/b55/main/compile-b55.test.mjs
node parallel/b55/main/run-b55.mjs
```

期待：`B55_PACKAGE_PASS` / **39/39 PASS** / `B55_SOURCE_GATE_PASS`。標準レポートは`parallel/b55/main/B55_PRODUCTION_SOURCE_GATE.json`。

## 実際の原本ソースを後日入手した場合

ZIPの中の `source/parallel/b55/main/COLLECT_B55_PINNED_SOURCE_READONLY.ps1` はWindows専用の読み取り専用収集器。Minecraftやサービスには触れず、既定のDocuments\\MinecraftAIBuilderの**指定5ファイルだけ**をDownloadsに1 ZIPとして作成。実際のプロジェクトフォルダが異なる場合には `-ProjectRoot` を付ける。**このB55工程では実行していない。**

収集ZIPをこの統合ZIPとは別に展開したとき、ディレクトリを指定して：

```sh
node parallel/b55/main/run-b55.mjs --evidence /path/to/extracted-evidence
```

展開ソースは決して `import` / `eval` / 実行しない。ZIPには元ソースが含まれるので**秘密情報がないことをアップロード前に確認する**。`VERSION_MISMATCH` は失敗ではなくバージョン差異の記録。ハッシュ一致でも出力の本番一致・実体動作確認は追加証拠まで未検証。

## 次工程 B56

実ソース入手後は出典バイト照合→静的関数契約抽出→正規出力との一致テスト（Minecraft非接続）の順。入手できない場合、既知の不足事項を繰り返し計測するのではなく、外部証拠待ちと既存設計凍結を明確に維持する。

## 安全

`NOT_PREPARED`, M4 **9/9 BLOCKED**, `executionAllowed=false`, `BuildPlan.operations=[]`, `worldCoordinates=null`, `materialIds=[]`, API/Bridge/WS/HTTP、ゲーム操作、スキャン0回。B54とそれ以前は改変しない。
