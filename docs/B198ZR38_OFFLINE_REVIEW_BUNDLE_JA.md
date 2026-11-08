# MinecraftAIBuilder R38 — レビュー監査記録を安全に受け取り、保存、読み直す（完全オフライン）

## 0. 到達点と制限

R37は人間が作成したと**申告される**建築品質レビューと、そのSHA256連鎖を検証した。
R38では、R37のレビュー記録（JSON配列）を**新しいディレクトリに一度だけ**書き出し、ハッシュ・項目数・レビュー元データ・前後の記録のつながりを読み直しで検査する。Windows/Ubuntu双方のNode24のみを利用。インターネット、Ollama、Minecraft、GitHub API、外部ストレージは使わない。

これは**本物の人間の審査を実施したという証拠ではない**。試験用のR37合成レビューと実際のユーザー提出審査を混同しない。

## 1. 入出力ファイル

入力は次の2つのJSONファイル。いずれも**レビュアー側で明示的に用意**する。

- `REVIEW_ENTRIES.json` — R37 `newEntry` を順番に配列へまとめたもの。最低1件・最大24件。
- `REVIEW_PINS.json` — 次のキーのみを含むオブジェクト：

```json
{
  "candidateSha256": "<候補の原文UTF-8 SHA256 64桁>",
  "briefSha256": "<元の日本語要求SHA256 64桁>",
  "r36ReviewEvidenceSha256": "<R36のレビュー証跡JSON SHA256 64桁>"
}
```

※ `<...>` は説明用のプレースホルダー。そのままのファイルは検証できない。

出力は**新規作成されるディレクトリ**内の2ファイルだけ。

- `R38_REVIEW_CLAIMS.json` — R37レビュー記録と3つのSHAピン・安全状態のスナップショット
- `R38_MANIFEST.json` — スナップショットのバイト長・SHA256、連結ログの最終SHA、記録件数などの整合用マニフェスト

**R25の実Qwen生応答、Minecraftワールドデータ、レビュー根拠の実画像はこれらのファイルに含めない。** ただしレビュアーが記録文欄に秘密や個人情報を自ら書き込んだ場合、その記録文は保存されるため、ファイルの取り扱いには注意が必要。

## 2. Windowsでの実行例

プロジェクトのルートでPowerShellを開く。まずR37 `newEntry` を `REVIEW_ENTRIES.json` に配列として、上記3つのピンを `REVIEW_PINS.json` に保存する。

```powershell
node scripts/b198zr38-audit-bundle-cli.mjs pack REVIEW_ENTRIES.json REVIEW_PINS.json R38_REVIEW_BUNDLE_NEW
```

出力結果に `manifestSha256`（64桁）が表示される。**保存先ディレクトリとは別の信頼できる場所に自分で控える**。出力先が存在していた場合は、空でも上書きせず拒否する。

読み直し（下のハッシュ文字列は実際の出力値へ置き換える）：

```powershell
node scripts/b198zr38-audit-bundle-cli.mjs verify R38_REVIEW_BUNDLE_NEW <控えたmanifestSha256> REVIEW_PINS.json
```

成功ステータスは `SUPPLIED_MANIFEST_PIN_MATCHED_NOT_AUTHENTICATED`。これは「提示されたSHAと現在のファイルが一致した」だけであり、第三者の電子署名や改ざん不可の証拠ではない。独立してハッシュを控えていなければ`verify R38_REVIEW_BUNDLE_NEW`で自己整合性を調べられるが、判定は`SELF_CONSISTENT_BUNDLE_UNANCHORED`に留まる。

## 3. 拒否する操作・破損

- 既存ディレクトリを指定して保存する（無条件上書きや自動バックアップは禁止）
- R37履歴の空配列、不正SHA連結、ID重複・時刻順逆転
- 別候補・別の日本語依頼・別R36証跡を1つの保存束に混ぜる
- 保存後にデータ、マニフェスト、項目数を変える
- 外部から提示したマニフェストSHA／3つのピンとの不一致
- スナップショットやマニフェスト以外のファイル、欠落ファイル、シンボリックリンク、上限超過ファイル、不正JSON
- CLIによる自動Qwen推論、モデル自動再試行、Minecraft接続、施工、R25承認復活

新規ディレクトリを確保後、スナップショット→マニフェストの順に書き、最後に再読込で検査する。途中で失敗した場合は**自分が作成した出力ディレクトリ**のみ片付ける。

ローカル上の悪意ある別プロセスとの競合、ディスク障害、外部のバックアップ喪失からの完全な保護を提供するものではない。真正性が必要なら、信頼できる外部の別保存先と電子署名等を別途検討する。

## 4. ソースとQA

- `scripts/b198zr38-audit-bundle-offline.mjs` — 正規化JSON、SHA256マニフェスト、R37検証、保存、再読込
- `scripts/b198zr38-audit-bundle-cli.mjs` — 明示的に呼び出す `pack` / `verify` のみ
- `scripts/b198zr38-audit-bundle-offline.test.mjs` — 合成データによる回帰QA（原本改変、SHA不一致、リンクや欠落、CLI実行、追記形式など）
- `.github/workflows/r38-audit-bundle-offline.yml` — Windows/UbuntuでNode24テスト

R38にレビュー原文を生成するコードはなく、手動によるレビューの提出を必要とする。R25原本は従来通りHOLD。出力に `NOT_PREPARED`・9ゲート`BLOCKED`・`BuildPlan.operations=[]`を維持する。

## 5. 次工程R39

運用で使いやすくするなら、R37 `newEntry` を取り出してR38用入力配列にする手順の簡素化、破損時の「何が壊れたか」の診断、**手動レビュー提出とデータ保存の責任境界の説明**を深める。Qwen再推論とワールド施工はユーザーの別途明示承認なしに行わない。
