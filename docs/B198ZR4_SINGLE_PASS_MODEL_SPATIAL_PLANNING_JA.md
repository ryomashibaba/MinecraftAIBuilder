# MinecraftAIBuilder — B198Z-R4（2026-10-19）

## 目的
B198Z-R3 は設計後の空間検査を実現した。R4 では **モデル自身が「何をどこに作り、どう通るか」という設計計画を先に構想し、その計画に対応するB143形状を同じ一つの応答に出力**できる任意の生成経路を追加した。

ただし、これが Qwen の実能力向上を証明したわけではない。実 Qwen 推論ゼロ、Minecraft 操作ゼロ、課金 API ゼロ、Work ゼロ。

## 絶対に維持すること
- 正本 `ryomashibaba/MinecraftAIBuilder`、Draft PR #128、base は Draft PR #127 の B198Y。既存PRや main は変更しない。
- 実Qwen 14要素の元原本 `40810c69e56e59f61704ef0e0a1d96f98a2415aa057a86d7355c44421ab3edbf` は変更せず保護。R1とR2は ASSISTANT-AUTHORED_REVISION。Qwenの成功例と混同禁止。
- `NOT_PREPARED`、9 gate `BLOCKED`、`BuildPlan.operations=[]`、worldContacts/writes=0、legacy/B99/B100/FAILED journal凍結。
- 固定の建築用途テンプレート、キーワードに応じた完成形状の生成は禁止。未知ジャンルにも一般化する。

## R4の構成
- `source/ai/b198zr4-planned-source.mjs`: opt-in の **4-key** `{design,explanation,assumptions,spatialPlan}` JSON に限定。モデル自身が発明した `designIntent/massStrategy/circulationStrategy`、入口、保護空洞、行先、実際に歩けるべき機能ゾーンを保持する。B143オリジナルの7フィールド形状スキーマは維持する。
- `source/ai/b198g-local-model-adapter.mjs` の `plannedSourceMode:true` は四項目を解析。false が従来の完全な三項目モデル応答で、**既定値を変えない**。
- `source/ai/b198s-native-ollama-source.mjs` の `plannedSourceMode:true` は構造化された空間計画指示を native 127.0.0.1 ローカル経路へ送る。二重推論・自動再試行・モデル変更はしない。三項目モードは維持する。
- `reviewR4PlannedProposal` は真の B143 コンパイラで最終ボクセルを構築し、モデルの主張した `spatialPlan` を R3 汎用検査で検証。**実行前に独立レビュー担当が用意した契約**を与えることもでき、モデル自身の甘い達成基準でバイパスは不可能。実モデルの「自作プラン」は `MODEL_DECLARED_UNVERIFIED` と明記。
- `scripts/b198zr4-offline-replay.mjs` は保存された 4項目原出力を無推論でレビュー。元文字列を完全保存し、元原文SHA256、幾何SHA、モデルの計画、別の審査結果を分離。原本を上書きしない。

## 実装コールの動線（あとから**明示的**に承認する場合）
R4モデルから得る JSON は、従来B198A/B198Sに自動適用しない。内部APIへ `plannedSourceMode:true` を**両方**渡す必要がある。自動切替不可。ユーザーによるモデル実行許可が出るまでは、実27B Qwenを呼ばない。

保存済み4項目出力だけをローカルで審査する例（モデルを起動しない）：

```bash
node scripts/b198zr4-offline-replay.mjs \
  --original /path/to/captured-planned-model-original.json \
  --out /path/to/fresh-review-folder
```

実Qwenの以前の三項目原本に R4の `spatialPlan` は存在しない。この原本が「R4合格」になったと見せかける変換は行わない。

## QAと正直な限界
CIは fixture HTTP server を使い、現実の native プロトコルに沿った **単一リクエスト**、`think:false`、4項目の実受信、0回のQwen呼出、R3判定、独立レビューによる棄却、従来の三項目モード維持を確認する。
試験用パビリオンはテストフィクスチャであり、モデルの想像力・実Minecraft歩行・3D意匠品質やユーザー要求の意味的一致を証明しない。4項目要求は生成トークンを圧迫しうるため、実 Qwen に投入した時の品質/速度は**未計測**。

## R5の価値ある次工程
実Qwenの高負荷推論許可を得るまでは、R4導入による一回生成が図書館以外で完成度を上げるかは未知。必要なら、同じユーザー要求に対する旧3項目基準対R4計画付き1応答を明確に区別した評価票を準備してから、許可された **1回** のQwen本番推論で証拠を取る。無断で起動しない。
