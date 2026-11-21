# MinecraftAIBuilder — R39 レビュー提出の簡素化と破損診断（完全オフライン）

## 1. 変更の目的

R37で人間が入力したと**申告される**建築品質レビューの結果を、R38では提出用の `ENTRIES.json` 配列と `PINS.json` に手動整理する必要があった。

R39では、R37の返却結果（`newEntry`を含むJSON）を**そのまま1ファイルで提出**できるようにした。また、R38の監査束について、読み直しに失敗した際の原因を「ファイル欠落」「JSON破損」「SHA不一致」「R37履歴改変」などに分類する**非破壊・読み取り専用診断**を実装した。

これは監査作業の補助であり、建築品質PASS、評価者本人確認、外部タイムスタンプ、実Qwen改善、ワールド施工を証明しない。

## 2. Windowsでのコマンド操作

PowerShellをプロジェクトのルートで開く。最初にR37の返却JSONを `R37_RESULT.json` として保存しておく。

### 保存を1コマンドで実行

```powershell
node scripts/b198zr39-review-submission-cli.mjs submit R37_RESULT.json R39_NEW_BUNDLE
```

- R37結果から`newEntry`を取り出す。
- 記録順、R37のSHA連鎖、候補・日本語要求・R36証跡の3つのSHAをR38で再検査する。
- **存在しない新しいフォルダー** `R39_NEW_BUNDLE` を作成する。既存フォルダーは空でも拒否する。
- `R38_REVIEW_CLAIMS.json` と `R38_MANIFEST.json` を書き、すぐ読み直して検査する。
- 表示された `manifestSha256` を**保存フォルダーと別の場所に自分で記録する**。

R37結果が複数ある場合は、時系列順のJSON配列を入力できる。ただし**最初の記録から全履歴が揃っていなければ拒否**。不足した以前の記録をAIが生成したり、連鎖を自動修正したりしない。

### 外部から控えたSHAピンを照合しながら保存

```powershell
node scripts/b198zr39-review-submission-cli.mjs submit R37_RESULT.json R39_NEW_BUNDLE REVIEW_PINS.json
```

`REVIEW_PINS.json`の形式はR38と同じ（`candidateSha256`, `briefSha256`, `r36ReviewEvidenceSha256` の3つの64桁SHA）。指定値がR37結果と違う場合は保存前に拒否する。

ピンファイルを省略した場合はレビュー申告にある3つのSHAから自動導出する。**自動導出は独立検証ではない**。出力の`pinMode`は `DERIVED_FROM_UNVERIFIED_REVIEW` になり、真正性や人間審査の証明を与えない。

### 非破壊診断

```powershell
node scripts/b198zr39-review-submission-cli.mjs diagnose R39_NEW_BUNDLE
```

保存フォルダーと別に控えたSHAがあれば：

```powershell
node scripts/b198zr39-review-submission-cli.mjs diagnose R39_NEW_BUNDLE <控えたmanifestSha256>
```

3つの外部SHAピンも一緒に照合したい場合：

```powershell
node scripts/b198zr39-review-submission-cli.mjs diagnose R39_NEW_BUNDLE <控えたmanifestSha256> REVIEW_PINS.json
```

マニフェストSHAを控えていないが3つのピンだけ照合したい場合、SHAの位置に `-` を指定できる。

```powershell
node scripts/b198zr39-review-submission-cli.mjs diagnose R39_NEW_BUNDLE - REVIEW_PINS.json
```

診断は書込をせず、修復も一切しない。破損が見つかると終了コード1、JSON内`status`が`HOLD_BUNDLE_DIAGNOSTIC`になる。問題がない場合も、結果は「現時点のファイル内容の整合性」を示すだけで、第三者認証ではない。

## 3. 診断コードの意味

| `diagnosticCode` | 内容と対応 |
|---|---|
| `SELF_CONSISTENT_UNANCHORED` | 保存束は自己整合しているが、別の場所に控えたマニフェストSHAを照合していない |
| `SUPPLIED_PINS_MATCH` | 提示されたSHA等と現在の束が一致。ただしピンの真正性は未検証 |
| `DIRECTORY_OR_FILE_MISSING` | 指定フォルダーやファイルが見つからない |
| `BUNDLE_FILE_SET` | 必須ファイルの欠落や余分なファイルがある。欠落名や余分な名前を出力する |
| `INVALID_JSON` | JSONとして読めない。元の提出原本から作り直す |
| `NON_CANONICAL` | 保存形式や改行がR38の正規表現と異なる |
| `UNSAFE_FILE` | シンボリックリンク、空ファイル、通常ファイル以外、上限超過など |
| `R37_HASH_CHAIN` | 記録のSHA、順序、ID、内容が一致しない |
| `MIXED_SOURCE` | 異なる候補・日本語依頼・R36証跡が混在 |
| `MANIFEST_MISMATCH` | 件数、スナップショットの長さ・SHA等が一致しない |
| `MANIFEST_EXTERNAL_PIN` | 別に控えたマニフェストSHAと不一致 |
| `EXPECTED_SOURCE_PINS` | 外部から控えた候補・依頼・R36のSHAと不一致 |
| `SNAPSHOT_SCHEMA`, `SAFETY_STATE` | 保存内容の形式、安全情報が想定と違う |

**自動修正・自動再保存・SHAの付け直しは行わない**。修復すると改変前の検証対象を失うため、元の提出データを確認し、必要なら新しい別フォルダーへ再提出する。

## 4. R39で保護する境界

- 実Qwen再推論なし。R25の一回限りの承認は消費済み。
- Minecraftワールド接続・読取・編集・施工なし。
- 未提出レビューの捏造なし。R37結果から新規の人間レビュー本文を作らない。
- レビューが「許容可能」だと申告していても、建築品質合格として自動認定しない。
- SHAが一致してもレビュー担当者・作成日時の真正性を認証しない。
- R37のレビュー記録と、その引用欄に書かれた文字列は保存する。私的な情報や秘密を入力しないよう注意する。

返却する安全状態は従来通り `NOT_PREPARED`、9ゲート `BLOCKED`、`BuildPlan.operations=[]`。R25原本HOLDを変更しない。

## 5. 成果物

- `scripts/b198zr39-review-submission-offline.mjs` — R37結果の展開、厳格連鎖検査、提出と非破壊診断
- `scripts/b198zr39-review-submission-cli.mjs` — 明示的な `submit` / `diagnose` CLI
- `scripts/b198zr39-review-submission-offline.test.mjs` — 合成データによる提出・誤入力・破損診断・CLI操作の回帰テスト
- `.github/workflows/r39-review-submission-offline.yml` — Node24 / Windows・Ubuntu、実QwenとMinecraft接続なし

## 6. 次工程 R40候補

レビュー提出の際、独立ピンの確認漏れを減らし、**外部に控えたマニフェストSHAと監査束の照合手順の一貫性**を改善できる。実モデル推論やMinecraft操作の許可はR40へ自動で持ち越さない。
