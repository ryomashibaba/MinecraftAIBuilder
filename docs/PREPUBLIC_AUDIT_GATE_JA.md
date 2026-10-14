# MinecraftAIBuilder — 公開前ライセンス・Actions保存容量監査メモ（2026-10-14）

> **監査用の非破壊的な文書のみ。Public化を許可しない。Minecraftへの接続・操作・施工は禁止。**

## 基準 / 安全

- 監査ブランチ: `audit/prepublic-notices-storage-20261014`。作成時の親: B114 `8515c877dd7fb2ff609c9124031c917ea1254ffa`。
- `main` `8b8b1f726fc5cf82b6d3e633f24ca219164983fc`、B113 `cabf06efc1f656c24f3d0851ddfc993696785ff7` は未変更。既存PRは未マージ。
- `readiness=NOT_PREPARED`、9施工ゲート `BLOCKED`、`BuildPlan.operations=[]`。世界接続・命令生成・施工なし。
- 履歴中のGmail著者メールはユーザーが公開許容。メールのみを理由とする履歴書換えはしない。
- 公開設定・課金設定・ワークフロー・履歴・既存ファイルの変更禁止。

## 確定：MicrosoftDocs文書

- `source/parallel/b74/main/runtime_evidence/catalog/sources/BlockStateAndTraitListings.md`
- `source/parallel/b74/main/runtime_evidence/catalog/sources/IntrinsicBlockStatesList.md`
- `source/parallel/b75/main/evidence/Blocks.md`
- 指定した上流のGitコミット `1dfc5c4fa1cd75cabe558b08adee3420264ff0b5` とGit Blobの内容が完全一致。
- 上流 `LICENSE` は CC BY 4.0、`LICENSE-CODE` は MIT。上流 `ThirdPartyNotices.md` も確認済み。
- 根拠・出典・権利者と非改変表示をルートの `THIRD_PARTY_NOTICES.md` に明記した。

## 公開前に残る第三者著作物の権利確認

- B71–B74で取り込まれた元の本番コード（B71基幹5ファイル＋B73追加依存25ファイル）の**権利保有者・再配布可能性**は未確定。
- `source/parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json` はSHA256と依存関係を記録するが、法的な所有権やライセンス証明ではない。
- これらがユーザー自身に権利のあるソースか、他の第三者プロジェクトのコードかを原本ソースと照合する。明確になるまではMIT等を一括適用しない。
- `catalog/education.json` はMinecraft Education v26.3の966件の検証記録を含む。プレイヤー名・メール・秘密鍵・IPに該当する既知のパターンは検出しなかったが、検証位置（32ユニーク座標）と日時を含む。公開を別途判断する。

## GitHub Actionsの容量分析

**2026-10-14 GitHub APIで読み取り確認した事実**

- 過去ラン: 226件、うち成功205件・失敗21件。
- 成功した全体QAラン: 162件。2026-10-13 14:00 UTC以降に51件。
- 最新全体QA `38523343572` は9成果物で **4,344,538 bytes**（約4.34 MB）。
- 最新B113 `38523343495`: 97,155 bytes。
- 最新B114 `38523343496`: 348,728 bytes。
- QAの成果物の大半は `retention-days: 14`。B112とB113/B114専用成果物は21日。
- 3ワークフローは標準 `ubuntu-latest`。有料のlarge runner、GPU runner、self-hosted runnerの設定は確認できない。
- `qa.yml` は `push`（main/feature/migration）と `pull_request` の両方で起動する。PRブランチ更新による重複実行に注意。
- B113 workflowはすべてのPRで起動するため、B113が無関係なPRでも負担となり得る。
- 全ランを通した保管容量の合計は未取得。アカウント単位のストレージ消費やGitHub Packages使用量を確認できていないので、残容量は断定しない。

**計算上の目安（現在値ではなく将来の上限・リスク評価）**

- GitHub FreeのActions/Packages共通保存枠は500MB、GitHub Proは1GB。キャッシュは別枠。
- 全体QAの最新規模がそのまま残れば、約115〜121回分で500MB付近に達する（MBとMiBの換算方法で差が出る）。他リポジトリやPackages分は別途消費する。
- `ubuntu-latest` 標準ランナーの実行分数はPublicリポジトリでは無料。ただし大型ランナーはPublicでも有料。
- 保存枠超過と分数上限は別の制約。Privateで起きている全ジョブ実行前ブロックをストレージ原因と断定しない。

参照: [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)／[Larger runners](https://docs.github.com/en/actions/concepts/runners/larger-runners)

## B115以降に提案する非破壊的な容量抑制（未実装）

1. PRの通常QAでは生成済みのスクリーンショット群を毎回長期保存しない。証拠が必要な場合だけアップロードし、重要なmain/手動監査ランだけ長めに保持。
2. 検査の証拠を削減する場合でも、回帰テストや安全ゲート自体は省略しない。
3. 非重要なPR成果物は短い保存日数（例えば2日）を候補とし、正本の監査証拠だけ14〜21日保持する。
4. `concurrency` とPR対象パスで不要な重複実行を減らす。ただし安全ゲートを誤ってskipしないよう、B115で小規模に検証する。
5. **既存の成果物・ログ・履歴は勝手に削除しない**。保存容量の削減を目的に課金設定変更や有料ランナー導入をしない。

## 公開判断（現時点）

**HOLD**。MicrosoftDocsについて必要な通知案を用意したが、取り込まれた本番コード30ファイルの権利確認、残存成果物・ログ、独自コードのライセンス選択、実機検証エビデンスの公開可否を確認する必要がある。Public化は別途ユーザーの明示的な承認が必要。
