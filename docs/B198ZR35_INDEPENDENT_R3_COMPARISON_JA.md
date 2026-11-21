# B198Z-R35 — 独立R3契約を使った候補比較（オフライン）

## 目的

R34はモデル自身が宣言したspatialPlanのR3 PASSを、独立評価PASSと混同しないよう制限した。
R35では候補原文のSHA256を照合した後、**外部で別途用意したR3契約**を、実B143コンパイル済みsourceSha256に厳格に紐づけて再評価する。

## 実装

- `scripts/b198zr35-independent-contract-comparison-offline.mjs`：R34を先に実行し、形式的に通過した候補だけに独立契約を適用。
- `scripts/b198zr35-independent-contract-comparison-offline.test.mjs`：9テスト。中庭・連絡橋・環状通路の合成正例、独立契約の欠落、古いSHA、厳しい経路制限、機能領域不成立、偽装されたMODEL_DECLARED著者、候補原文SHA不一致、入口不成立、全安全境界。
- `.github/workflows/r35-independent-contract-comparison-offline.yml`：Windows・UbuntuのNode24テスト。

## 判定

| 条件 | R35結果 |
|---|---|
| 独立契約なし | `NO_INDEPENDENT_CONTRACT` |
| 候補原文SHAまたは宣言R3が失敗 | `HOLD_CANDIDATE_NOT_FORMALLY_ELIGIBLE` |
| 契約がMODEL_DECLAREDまたは不正schema | `HOLD_UNTRUSTED_CONTRACT_AUTHORSHIP_OR_SCHEMA` |
| 独立契約sourceSha256が候補と違う | `HOLD_INDEPENDENT_SOURCE_SHA_STALE` |
| モデル自己宣言はPASSだが、独立R3が不成立 | `HOLD_INDEPENDENT_FUNCTIONAL_CONTRACT` |
| 独立R3の形式条件を満たす | `INDEPENDENT_FORMAL_PASS_PROVENANCE_UNVERIFIED` |

**重要な限界**：契約に`INDEPENDENT_REVIEW_DRAFT`と記されていても、その文字列だけでは本当に独立した人間が作ったことを認証できない。合成試験の`TEST_FIXTURE`も本物の第三者評価ではない。そのためR35は`independentAuthorshipAuthenticated=false`を必ず返し、正式な品質承認には昇格させない。

R35は外部契約を自動生成・自動修復・自動再pinしない。結果は形式的な幾何学・到達可能性の評価であり、実Minecraft歩行、外観の良さ、ユーザー要求の達成、実Qwen改善を証明しない。

## 以前の工程との区別

- R25原本：実Qwen一回のみ、厳格B143でCUT材質違反5件、HOLD。
- R27：原本をメモリ上で仮想修正した診断。原本そのものの成功ではない。
- R32：手書きの3合成建築。実B143/R3/R4の動作を確認。
- R34：原文SHAとモデル宣言R3までの比較。独立R3は未実施。
- **R35：外部契約を与えた場合に、宣言R3と独立R3を分けて判定できるようにした。**

## 次工程 R36

独立契約を用意する担当者向けに、**モデルのspatialPlanをそのまま複写しない評価手順**、最低限の採点根拠、契約の作成時刻と原本ハッシュの証跡を整理する。実Qwen再推論やMinecraft操作は引き続き行わない。

安全状態：`NOT_PREPARED`、9ゲート`BLOCKED`、`BuildPlan.operations=[]`、R25推論承認は消費済み。モデル呼出し0、ワールド接続・読取・施工0。
