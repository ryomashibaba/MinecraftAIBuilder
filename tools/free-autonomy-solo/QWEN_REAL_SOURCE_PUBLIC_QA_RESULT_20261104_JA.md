# 2026-11-04｜真正Qwen3:14B 2段階ソース修正案の公開研究QA・独立修正結果

> **判定：Qwenが生成した元の2件はSOURCE QA不合格。別由来の人間/アシスタントレビュー修正案のみ、既存SOURCE QAで2段階PASS。アート・Education実機・長時間自律開発は未合格。**

## 固定証拠と出自

| 項目 | 固定証拠 |
| --- | --- |
| 実モデル（本人Windows/Ollama自己報告） | `qwen3:14b`。モデル身元の独立暗号学的証明なし |
| 元ソース | `fe1682e15ffa063f4dc415b06c4d76a54737a06e`, `source/ai/r125-v4h-mezzanine-author-ir.mjs` |
| Qwen Stage 1 SHA256 | `03b73c926cb507b9fc0bed50c3a9b38cf5cada631b15a428b9e3f240fe8098cc` |
| Qwen Stage 2 SHA256 | `5b8468783df8126d6e053bf7d37b4c9b74fd543bdd345d5898ac88fe022df6d6` |
| 両Qwen案の公開保存 | [公開研究ブランチのコミット 741932d8](https://github.com/ryomashibaba/MinecraftAIBuilder/commit/741932d8f0e41efdc5c1fd99bd99ea690cb64720)（Git履歴から通常は削除不可） |
| 元の独立SOURCE QA | [GitHub Actions #41845806261](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41845806261) → **FAILURE / `INDEPENDENT_DOCKER_QA_STAGE1_CHECK0_RC1` / 合格stage=0** |
| 別候補の修正SOURCE QA | [GitHub Actions #41847626931](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41847626931) → **SUCCESS / 2段階・各1 QAコマンドPASS** |
| 修正候補の出自 | `ASSISTANT_REVIEWED_REPAIR_FROM_FAILED_QWEN_NOT_QWEN_INFERENCE`、新たなモデル推論 **0** |

## 元のQwen修正の何が問題だったか

1. **stage 1 — 実行前に未定義変数参照**：`exact` 関数の改修で、既存関数末尾の式と噛み合わず、トップレベルに `Object.keys(v)...` が孤立した。MJSの構文検査は通過するが、モジュールロード時には `v` が定義されておらず `ReferenceError` が発生する。独立SOURCE QAは段階1で不合格。
2. **stage 2 — 元設計と矛盾する階段制約**：既存仕様 `rise=6..8` → 必要段数 `rise+1=7..9`。Qwenは段数 `>5` を拒否する条件を追加した。元stage 1でテスト停止したので元stage 2単独のDocker動作失敗は**直接実測していない**が、明白な制約矛盾をソースから確認。

## 別候補（Qwenの成功として数えない）

- stage 1: 元 `exact` を、入力が通常オブジェクトであること・キー数と指定フィールド名の全一致を確認する検証に差し替える。孤立した式は含まない。
- stage 2: `upper.sourceWitness` が実際に存在する通常オブジェクトであることを検証する。既存 `physical2WideStairTreads===rise+1` 制約は維持し、不正な `>5` 上限を採用しない。
- 再構築処理は公開Qwen案と元コミット・元ペイロードSHA256・2件のSHA256・文字列差分を**すべて厳密照合**。合わなければHOLDで停止。
- 修正Stage 1 SHA256 `1436fb88c36cf1a8c9e6bd34b91ef0bedb50cd65fa51f7c9f70b1c21ea43e874`。
- 修正Stage 2 SHA256 `20edf82e7640621f041eda3e735527a2ff0193ba85d663943d65d7ec27d9d7e4`。
- 実装は [reviewed_qwen_mab_repair_qa.py](./reviewed_qwen_mab_repair_qa.py)、対象不一致・改変検出などの回帰テストは [test_reviewed_qwen_mab_repair_qa.py](./test_reviewed_qwen_mab_repair_qa.py)。変更は研究ブランチ、既存Qwen履歴は不変。

## Docker SOURCE QAの実測範囲

- GitHub-hosted Ubuntu / `node:24-bookworm-slim`。元ソースを固定Gitコミットから新しいcloneへ取得し、各別候補を試験用cloneに順次適用する。
- Dockerは **ネットワーク `none`**、ソース読取専用、モデル推論・有料API・外部pushなし。
- `node --test scripts/r125-v4h-mezzanine.test.mjs` が **修正候補の両段階で成功**。このコマンドは既存の、5ジャンルを用いた合成建築・階段・安全ゲート等を確認するテスト群を実行する。
- GitHubランナー使い捨てclone内の確認用ローカルコミットが2件作成された。`main`、R125→B143実機成功経路、研究ブランチ上のゲーム本体、Minecraft World、Draft PR #128は変更なし。
- **未確認**：本人のEducation実機、Minecraftでの歩行、建築の著作的・視覚的品質、ブラウザ実行体験、長時間自律開発の信頼性、実モデルの再現性、別ジャンルへの一般化。QAコマンド数は「独立したテストケース数」ではない。

## 以後の効率方針（重要）

- **現在、本人に追加操作は求めない**。既に公開された検証素材についてはGitHub Actionsのジョブ・ログ・成果物をGitHubコネクタから検査し、GitHub研究ブランチ上で安全な修正とテストを進める。毎回のZIP・CMDダウンロード、スクリーンショット、同じログのJSON添付を要求しない。
- ローカルモデルのさらなる真正推論を必要とする段階だけは、こちらからユーザーWindows上のOllamaを直接操作できないため、**一度の起動設定**が別途必要。研究ブランチ内での継続QA/保護ガードを先に充実させ、工程ごとの人間承認待ちを最小化する。
- ただし **既存の公開同意を、未来の無制限な新規ソース公開の承認に拡張しない**。`main`/本番/追加課金/Work・Computer Use起動は既存ルールに従う。
- MinecraftAIBuilderとBrowser Ink TPSは同格の最重要2件。ただしローカルLLMは一度に一プロジェクト、長時間連続運用を原則とする。**Strataは目的ではなく手段**。

## 最新判定

`QWEN_ORIGINAL_SOURCE_QA=REJECT`、`ASSISTANT_REVIEWED_TWO_STAGE_SOURCE_QA=PASS`、`EDUCATION_PHYSICAL_TEST=NOT_TESTED`、`ART_ACCEPTANCE=NOT_TESTED`、`AUTONOMOUS_DEV_CERTIFIED=NOT_TESTED`。結果を混同して採用しない。
