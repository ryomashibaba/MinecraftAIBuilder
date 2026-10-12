# B56 — 本番ソース証拠ZIPの直接受入れ（非施工）

B55までは Windows 原本収集ZIPを一度展開する手作業が必要だった。B56は**ZIPを展開せず直接バイト検証**できる。データは読み取るのみ。`import`/`eval`/建築エンジン実行/HTTP/WS/Bridge/Minecraftスキャン/実施工は行わない。

## まず安全な状態を確認

```sh
cd source
node verify-b56-package.mjs
node --test parallel/b56/main/compile-b56.test.mjs
node parallel/b56/main/run-b56.mjs
```

期待は `B56_PACKAGE_PASS`、新規 **43/43 PASS**、`B56_SOURCE_ADMISSION_PASS`。B55の39件はB56開始時に別途PASS済。

## 本番のソースを入手する場合（Windows、未実機検証）

`source/parallel/b56/main/COLLECT_B56_ONEPASS_READONLY.ps1` を実行する。B55の凍結版収集スクリプトを呼び出すのみ。起動前にソース内容や収集範囲を確認すること。

PowerShellのプロジェクトディレクトリが標準位置なら：

```powershell
& ".\source\parallel\b56\main\COLLECT_B56_ONEPASS_READONLY.ps1"
```

異なる場所なら：

```powershell
& ".\source\parallel\b56\main\COLLECT_B56_ONEPASS_READONLY.ps1" -ProjectRoot "C:\任意の\minecraft-ai-builder"
```

プロジェクト名一致をチェックし、Downloadsに証拠ZIPを作成。候補が複数見つかれば誤って別プロジェクトを採用せず停止する。**Windows実機テストは未実施**。ZIPには原本ソースが含まれるので秘密情報がないかアップロード前に確認。

## 証拠ZIPを受け取った後（展開不要）

```sh
node parallel/b56/main/run-b56.mjs --source-zip "/path/to/MinecraftAIBuilder_B55_Readonly_SourceEvidence_....zip"
```

`ZIP` は6要素まで（5つの原本＋B55メタデータ）。ZIP展開・ファイル書き込み・原本実行は一切行わない。格納/deflate形式、CRC32、名前・ローカルヘッダ、実容量と圧縮容量の上限、不正なパス、重複、シンボリックリンク、収集メタデータと原本SHA-256の照合を実施する。任意のZIPを一般目的で開くツールではない。

取得対象の5つは`B55_START_HERE_FIRST.md`に記載。`PINNED_MATCH`は過去の2026-10-10固定版との**バイト一致だけ**を意味し、建築挙動の一致ではない。`VERSION_MISMATCH`は更新版・改変等の可能性があるため自動受入れしない。

## 保持する制約

- `NOT_PREPARED`、M4の9/9件すべてBLOCKED。
- `executionAllowed=false`、`BuildPlan.operations=[]`、施工・スキャン・Bridge/Minecraft接続0件。
- B55以前の全ファイルは完全凍結。B52の15設計案、B53/B54の表示改善案も未承認。
- `composeFacade`の本番原本がないため**本番パリティ=UNVERIFIED**、物理品質=UNKNOWN。
- 「ZIPパリティ確認」と「本番エンジン挙動一致」を混同しない。後者はオフラインで正規出力ケースが得られた場合にのみ次工程で検討する。

## 次工程 B57

本番ファイルが提供された場合、固定SHAの静的契約比較、対応する品質設定、既存の出力ケースのオフライン照合を実施。提供されない場合、レポートや表示候補の再生成だけで実装達成を誇張しない。原本がどこにあるかは現時点では不明。
