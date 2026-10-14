# B71–B74 保存ソースの来歴監査（2026-10-15）

> **公開判定は HOLD。** これは既存ソースを変更しない監査記録であり、Public化・Minecraft操作・施工を許可しない。
> `readiness=NOT_PREPARED`、施工9ゲート `BLOCKED`、`BuildPlan.operations=[]` を維持する。

## 確認済み：ソースが持ち込まれた経路

1. B71 `source/parallel/b71/main/README_JA.md` には「ユーザー提供」の `B71_REFERENCE_PINNED_SOURCE_EVIDENCE.zip` を利用し、5ファイルをSHA-256照合したと記載されている。B71報告書には `evidenceZipSha256=2bb665badb3519af829ca842ac6ac4cf3893407ff366c341473716eb8a012168`、`filesPinned=5` が記録される。
2. B72は不足依存を追加収集し、ピン留めした5ファイルを変更せずに保持したと説明している。
3. B73 `B73_OFFLINE_PREFLIGHT_REPORT.json` は追加依存25ファイル、元の本番ソース5ファイル、合計30のJavaScript/JSONファイルを固定したと記録している。静的依存グラフは完全な実行時依存グラフではない。
4. B74の `runtime_evidence/B72_DEPENDENCY_MANIFEST.json` には追加25ファイルのパス、ハッシュ、および静的グラフがある。同じスナップショット配下の23 JavaScriptファイルを静的に調べ、直接の外部パッケージimport、別の著作権・ライセンスヘッダーを確認できなかった（**独自著作物である証明ではない**）。
5. B74 `catalog/sources/manifest.json` のMicrosoftDocs出典文書は、元の本番ソースとは別扱いにする。再配布している3つのMarkdownコピーについてはリポジトリルートの `THIRD_PARTY_NOTICES.md` を参照。

## 所有者への確認と公開範囲（2026-10-15）

所有者は、この会話で旧Windows版のコードについて「基本的に自分とChatGPT・Codex等のAIで開発し、再配布許可が不明な第三者コードをコピーした認識はない」と明示した。これはプロジェクト全体の本人申告であり、30ファイルの個別著作権を独立に証明するものではない。具体的な第三者の権利上の疑義が確認されたときは該当ファイルに限定して調査する。

所有者は、全21既存ブランチ、過去のコミット・Draft PR・Actions履歴／ログ／残存成果物、Minecraft Educationの32試験座標と検証日時を含む公開範囲を了承した。リポジトリのPrivate→Public切り替え自体は**別の明示承認が必要**である。

## 残る権利上の確認

- 「ユーザーから提供されたZIP」であることと「ZIP内の全ファイルの著作権または再配布許可をユーザーが保有する」ことは**同義ではない**。5ファイルおよび追加依存25ファイルの原本、作成者、第三者コードの有無を確認する。
- 元ソースの実体を収録した原本ZIPは、このGitHubリポジトリの現行ツリーには見当たらない。ハッシュが一致するだけでは、その出所・ライセンスを法的に確定できない。
- `catalog/education.json` はMinecraft Educationの過去の検証記録（966件、32個のユニークなワールド内テスト座標）である。外部ドキュメントのCC BY 4.0をこの記録へ自動適用しない。所有者はこの記録を含む公開範囲を了承済み。
- GitHub Actionsの外部 `uses:` やテスト時に取得するPlaywright等の依存は、現時点でソースの同梱を意味しない。将来バンドルするときは改めて各ライセンスを確認する。
- ユーザー保有コードに対して、MicrosoftDocsのMIT/CC BY 4.0を一括適用しない。プロジェクト独自コードの再利用ライセンスは所有者が別途決定する。

## 次の公開判定ゲート

1. **権利確認**：所有者による上記の申告を取得済み。全ファイルの独立の権利証明ではなく、具体的な疑義が見つかった場合のみ追加確認する。
2. **情報公開範囲確認**：旧ブランチ・PR・Actions・テスト座標／日時／結果を含めて所有者が了承済み。既知機密パターンの明確な一致はないが、未知パターンは未保証。
3. **公開対象監査**：成功Actionsの未確認ログと過去成果物をリスク優先でチェックする。
4. **ブランチ整理案**：既にある `audit/public-release-notices-20261014` と `audit/prepublic-notices-storage-20261014` は破壊的統合や削除をせず、必要な文書の正本を選択して将来の正式レビューへ引き継ぐ。
5. **最終承認**：main固定SHAを起点とした監査ブランチにこの文書を含むMarkdown3件だけを追加することは所有者が2026-10-15に許可。mainマージ・Public化は別途の明示承認があるまで行わない。B113/B114/main、Git履歴、課金設定、Minecraftの安全ゲートは変更しない。

### 証拠位置

- `source/parallel/b71/main/README_JA.md`
- `source/parallel/b71/main/B71_PINNED_SOURCE_ADAPTER_REPORT.json`
- `source/parallel/b72/main/README_JA.md`
- `source/parallel/b73/main/B73_OFFLINE_PREFLIGHT_REPORT.json`
- `source/parallel/b74/main/runtime_evidence/B72_DEPENDENCY_MANIFEST.json`
- `source/parallel/b74/main/runtime_evidence/catalog/sources/manifest.json`

以上はリポジトリ内の記録および静的照合に基づく。元ZIPのライセンス・作者を直接検証したものではない。
