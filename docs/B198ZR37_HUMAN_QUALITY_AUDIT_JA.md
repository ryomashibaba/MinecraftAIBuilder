# B198Z-R37 — 建築品質レビュー申告と監査記録の分離（完全オフライン）

## 目的

R36までは「B143の形式」「独立R3での動線」「独立レビュー作成経緯の自己申告」を検査していた。一方、**美しさ・独創性・元の日本語依頼との一致・使いやすさ**は、ボクセルの幾何チェックだけでは評価できない。

R37は外部の人間が用意した**建築品質レビューの申告**を、R36までの検証結果と別の記録として残す。AIがレビュー文や合格判定を自動生成する仕組みではない。モデル呼出し・Minecraft接続・施工は一切しない。

## 独立した4つの観点

| 軸 | レビュアーが見る点 |
|---|---|
| ORIGINALITY | 用途や元依頼に対し独創性があり、決まりきったテンプレートではないか |
| BRIEF_ALIGNMENT | 依頼の要件・空間用途・設計意図との一致 |
| SPATIAL_USABILITY | 人が実際に使う空間として妥当か（R3の抽象経路PASSと区別） |
| VISUAL_COHERENCE | 建物全体の質量・外観・空間表現の統一感 |

各軸について `MEETS` / `REVISION` / `UNASSESSED` の1つを申告し、文章の根拠と、提出された証跡ハッシュを関連づける。記録全体の決定は `ACCEPTABLE_CONCEPT` / `REVISE` / `REJECT` / `UNDECIDED`。
`ACCEPTABLE_CONCEPT` には4軸すべて `MEETS` が必要。決定が `REVISE` または `REJECT` なら1軸以上 `REVISION` が必要。
**これらはあくまでレビュアーによる申告値であり、ソフトウェアが品質を保証した点数ではない。**

## R37の必須条件

1. R36の `REVIEWER_EVIDENCE_CONSISTENCY_PASS_AUTHORSHIP_UNVERIFIED` がなければ拒否。
2. レビュー原文、候補データのSHA、ユーザーの要求SHA、R36の証跡パケットのSHAがすべて一致していること。
3. レビュアー申告名・申告日時（UTC）、4軸の評価理由、参照証跡の種類・SHA・説明文を必須とする。
4. 証跡の実際のファイルをR37が取得したり認証したりはしない。SHAは**提出者が示した文字列・参照値**でしかない。
5. レビューからMinecraft実行権限や新たなQwen推論承認へ昇格する道を一切設けない。

## 監査ログ（ハッシュチェーン）

`assessR37HumanQualityAudit()` は、レビュー記録が与えられた場合にのみ、追加用の`newEntry`を返す。ログの外部保存は行わない。
`newEntry`には連番、直前の記録のSHA256、今回の申告記録、今回の記録のSHA256を収録する。
`verifyR37Ledger()` は、履歴の順序・重複レビューID・時刻順・SHA整合をチェックする。

**重要：このハッシュチェーンは真正な「改ざん不可能ログ」ではない**。外部の信頼できる場所に最終ハッシュを固定していなければ、第三者が記録全体を書き換えて再ハッシュすることは可能。外部固定・電子署名・本人確認・公的タイムスタンプ・永続ストレージはR37に存在しない。ログをユーザーが保存したと主張する機能もない。

## 判定

| 返却ステータス | 意味 |
|---|---|
| `HOLD_R36_NOT_ELIGIBLE` | 上流の独立レビュー証跡が不合格 |
| `HOLD_LEDGER_INTEGRITY` / `HOLD_LEDGER_MIXED_SOURCE` | 履歴改変や異なる案件の混在 |
| `HOLD_QUALITY_REVIEW_FIELDS` | 証跡、4軸評価、理由、決定が不足または矛盾 |
| `HOLD_QUALITY_REVIEW_PINS` | R36・設計原文・元依頼のSHA不一致 |
| `HOLD_QUALITY_REVIEW_TIME_ORDER` | 自己申告した時刻の順序が逆転 |
| `HOLD_DUPLICATE_REVIEW_ID` | 同じレビューIDを重複登録 |
| `QUALITY_ACCEPTABILITY_CLAIM_RECORDED_NOT_CERTIFIED` | 「許容可能」との**申告を記録**。AIによる建築品質認証ではない |
| `QUALITY_HOLD_CLAIM_RECORDED` | 再検討・拒否・未決定という申告を記録 |

`humanArchitecturalQualityApproved`は、肯定的なレビュー申告があっても常に`false`。品質を最終確定する機能は実装しない。

## ファイル・CI

- `scripts/b198zr37-human-quality-audit-offline.mjs` — 品質申告をR36証跡と結び、検証・ハッシュチェーン化
- `scripts/b198zr37-human-quality-audit-offline.test.mjs` — 12件の合成QA。レビュー無し、評価矛盾、証跡参照不足、偽装承認フィールド、レビュー履歴改変、別案件混入、時刻異常などを検査
- `.github/workflows/r37-human-quality-audit-offline.yml` — Node24 / Windows・Ubuntu、実Qwenなし、実Minecraftなし

## R38以降の検討候補

運用面を充実させるなら、実ユーザーのレビュー項目を**人が入力する手順書**と、人間が提出した根拠画像などの外部証跡確認を別途検討する。R37の合成レビュー記録を、本物のレビュアーが行った評価のように提示することは禁止。

固定安全状態：R25原本HOLD、新規Qwen推論0、Minecraft接続・読取・変更0、`NOT_PREPARED`、9ゲート`BLOCKED`、`BuildPlan.operations=[]`。
