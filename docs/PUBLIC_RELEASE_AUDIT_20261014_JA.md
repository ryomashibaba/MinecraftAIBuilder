# MinecraftAIBuilder 公開前監査 — 2026-10-14

> **公開判定：HOLD（保留）**。この文書と第三者通知の追加は公開承認ではありません。
> Minecraftへの接続・操作・施工、PRのマージ、Git履歴書換え、削除、課金設定変更、
> リポジトリのPublic化は実施しないでください。

## 1. 凍結基準

- Private repository: `ryomashibaba/MinecraftAIBuilder`
- `main`: `8b8b1f726fc5cf82b6d3e633f24ca219164983fc`
- B113 Draft PR #13: `cabf06efc1f656c24f3d0851ddfc993696785ff7`
- B114 Draft PR #14: `8515c877dd7fb2ff609c9124031c917ea1254ffa`（B113上の積み重ね型）
- 本監査ブランチの基点はB114 SHA。凍結原本は変更しない。
- 構築許可: `readiness=NOT_PREPARED`、9ゲート `BLOCKED`、
  `BuildPlan.operations=[]`。どの監査結果もMinecraft施工を許可しない。
- 著者のGmailアドレスはユーザーにより公開許容済み。メールだけを理由に履歴を書き換えない。
- リポジトリのPublic化は**別途明示承認が必要**。

## 2. 今回追加したもの

- `THIRD_PARTY_NOTICES.md` — MicrosoftDocs由来の原本3件の出典、
  原本リビジョン、著者メタデータ、ライセンス、無改変を明示。
- GitHub Actions、凍結ソース、実機検証データの内容は変更しない。
- プロジェクト全体にMITその他のライセンスを勝手に付与しない。

## 3. 監査済みの証拠と限界

| 対象 | 観測 | 限界 |
| --- | --- | --- |
| Git最新B114ツリー | 911ファイルを列挙 | パターン検査は未知の秘密情報を保証しない |
| 到達可能履歴 | 15ブランチ・125コミット（前工程） | 異常な機密形式は検出規則外の可能性 |
| GitHub Actions | 226ラン・失敗21ラン（前工程） | 成功205ランのログ全件は未確認 |
| 失敗21ラン | 実行前失敗12件、実行ログあり9件。9ログの既知秘密情報パターン一致なし | パターン検査の範囲のみ |
| 成功ランの成果物 | 前工程で11 ZIP・計85内部ファイルを検査 | その他の過去ラン成果物は未確認 |
| MicrosoftDocs | pinned upstream `1dfc5c4fa1cd75cabe558b08adee3420264ff0b5` の3 Markdown原本とローカルを完全照合 | 原本3件以外は自動的に同じ許諾とみなさない |
| B74 runtime snapshot | 23 JSファイルのimport先は相対パスまたはNode標準モジュール。直接の外部パッケージimportなし | **コードそのものの著作者・再配布権は未確認** |
| B74 education.json | 966件の過去試験記録、32個のユニークな検証座標、2026-09-27〜28の日時 | Minecraft内座標・操作ログをPublic化してよいか所有者判断待ち |
| 大容量JSON | 前工程で10ファイルのパターン検査 | 任意の文字列・画像内個人情報を完全排除できない |

## 4. 第三者資料と依存の棚卸し

**確認済み：** 以下の原本文書3件はMicrosoftDocs `minecraft-creator` から取得。
それぞれ完全一致を再照合した。CC BY 4.0への帰属表示は
`THIRD_PARTY_NOTICES.md` に追記済み。
- B74 `BlockStateAndTraitListings.md`
- B74 `IntrinsicBlockStatesList.md`
- B75 `Blocks.md`

B74 `sources/manifest.json` には5つの外部Markdown出典のURL/ハッシュがあるが、
`AuxValueToBlockStateMap.md` と `BlockStatesAndPermutations.md` は
同フォルダに文書本文を格納していない。B75の `Blocks.md` は別位置に存在する。

**見つかった外部実行時依存：**
`actions/checkout@v4`、`actions/setup-node@v4`、
`actions/upload-artifact@v4`、`browser-actions/setup-chrome@v1`、
テスト用の `playwright-core@1.56.1`。
CIで外部から取得して実行する依存であり、この事実だけでは
ソースやライブラリのリポジトリ同梱を意味しない。

**未確認：** B74内の保存された23 JSと周辺の設定データの真正な著作権帰属、
他の各時期の生成コード・サンプルSVGの由来、全てのアセットの再配布権。
外部import不在やファイル名のみから所有者を決めない。

## 5. Public化前の必須ゲート

- [x] MicrosoftDocsの3原本・リビジョン・CC BY 4.0を特定
- [x] 原本3件に対する第三者通知を監査ブランチに追加
- [ ] B74保存コードとサンプル図の出自・権利、独自コードのライセンス方針を確認
- [ ] 実機検証の32座標と操作結果を履歴ごと公開するか明示決定
- [ ] Actionsの未確認ログ・過去成果物・PR関連情報を残存リスクに応じて精査
- [ ] 公開ブランチに同じ通知を取り込む方法とREADMEのPrivate表記を整理
- [ ] GitHubで公開する対象履歴・ブランチ・Actions情報を最終レビュー
- [ ] ユーザーが**リポジトリのPublic化そのものを明示承認**

## 6. CIと安全境界

今回の監査ブランチでは新規のMarkdownファイル以外を変更しない。
監査ブランチは `audit/**` であり、既存 `qa.yml` の
`push` 対象 `main` / `feature/**` / `migration/**` に含まれない。
PRは作成せず、請求・Actions設定は変更しない。施工ゲートを解除しない。

B115以降の開発は、安全審査とPublic化の明示承認後に再開する。
