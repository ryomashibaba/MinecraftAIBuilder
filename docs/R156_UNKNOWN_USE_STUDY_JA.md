# R156 未知用途3件の実LLM設計比較

目的：住宅・店舗・研究施設の用途別新規課題を、まったく同一の既存R134/R139/R155モデル→意味IR→B143生成パイプラインへ渡し、原文と3Dを比較する。旧Qwenの保存済み回答・R155ホスト研究案を実モデルの新成果として数えない。

ローカルOllamaが入っているPCのリポジトリ直下で、`node scripts/r156-unknown-use-study.mjs --model qwen3:14b` と一度実行する。対応する他のインストール済みモデルなら `--model gemma4:26b` 等へ変更可能。既存のCLI/エンジンを再利用し各用途1応答・自動再試行なし。ソースは原本非破壊、出力は一意の新規ディレクトリ。ユーザーMinecraftワールドへのアクセスなし。

出力：`R156_STUDY_MANIFEST.json`, `R156_REVIEW_FIRST_JA.md`、用途別 `MODEL_RAW_ORIGINAL.txt`、`R134_MODEL_REPORT.json`、成立時の真正B143 `DERIVED_B143_SOURCE.json`・`index.html` 等。各用途のモデル指定設備・実室・入口関係・屋根IR、元応答SHA、独立ソース/幾何SHAを確認。粗い「形態指紋」からタイトル・室名・説明文を除き、同一形へ収束した可能性を検知する。ただし**形が異なることは現実的な建築品質の証明ではない**。

CIはモデルを呼ばず偽HTTPで配線とフェイルクローズを検証するだけ。CIの模擬回答と実Qwen/Gemmaの新規応答は別証拠。美術はART HOLD、実Minecraft歩行は未試験、実モデルの汎用性も未認証。施工は `NOT_PREPARED`、9ゲート `BLOCKED`、`BuildPlan.operations=[]` を維持。Draft PR #128はマージしない。

後続：実LLM三用途の原文を揃え、実3Dを目視・動線・材質・用途で判定し、改善が共通エンジンに必要ならその原因だけ直す。Macで動く小型モデルも**別の実測**で比較する。
