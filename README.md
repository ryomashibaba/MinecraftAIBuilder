# MinecraftAIBuilder

**自然言語 → ローカルLLMによる建築設計 → 本物の3D形状 → 検証 → Minecraft Education試験施工** を目指す既存プロジェクト。Minecraft Java版への対応は後段。

## 今の正式な入口
- [戦略 v2 — 最短実用化・小型LLM共通エンジン](docs/PROJECT_STRATEGY_V2_JA.md) — 開発思想、既存資産、実測指標、安全、段階別通過条件。
- [R125 最短の縦貫MVP実装計画](docs/R125_THIN_VERTICAL_SLICE_PLAN_JA.md) — 具体的な最初のタスクと不合格時の扱い。
- [AI_PROJECT_CHARTER_JA.md](docs/AI_PROJECT_CHARTER_JA.md) — 長期間変えない約束と許可境界。
- [AI_RESTART_JA.md](docs/AI_RESTART_JA.md) — 最新の確認済み工程、HEAD、CI、次の1手。新チャットはここから。

## 方針
LLMの建築発想力を、図書館など一種類の建物専用の数百工程の手作業で置き換えない。B143の既存の3Dコンパイラ、B198Aのソース検証、B198G/Hのローカルモデル接続、B198Bの12作成+4改修課題をできるだけそのまま再利用する。

**Apple Silicon Macの8GB級・2B級4bitローカルLLMで基本建築ができることを目標とする。** 未実測のモデル互換性、RAM消費、成功率、生成速度を達成済みとは言わない。大型Qwen/Gemmaは高度な設計向けに利用できるが、単純な住宅の必須条件にしない。

2026-10-24以降は**Qwen/Gemmaの実推論とMinecraftの試験施工を包括許可済み**。ただしワールドの識別・バックアップ・可逆性・命令数などの技術安全ゲートが通るまではWorld書込は禁止。Open/Draft PR #128、凍結済みソースを維持し、歴史的なR124研究は回帰資料にする。

## 現存する開発コード（過去の実績の範囲）
- `source/ai/b143-building-dsl.mjs`: 6形状＋ADD/CUT、階段、繰返し、真のボクセル化。現状は設計専用で施工計画を生成しない。
- `source/ai/b198g-local-model-adapter.mjs` / `scripts/b198h-local-workflow.mjs`: ローカルモデル境界と設計候補の反復。実Qwen/Gemmaの汎用生成成功を証明したものではない。
- `source/ai/b198b-benchmark-cases.mjs`: 12用途＋改修4件。
- `source/ai/b198j-circulation-proof.mjs`: 同一階の限定通路証拠。ゲーム内で実際に歩けたこととは異なる。

## 旧開発履歴
B100/B143の旧成果と原本、B198Z R1〜R124研究、古いREADMEの施工禁止方針は各履歴文書・Git履歴として保持する。**古い「新規Qwen推論禁止/World施工は再許可必須」という記述より現行憲章の2026-10-24包括許可が優先する**。現在の運用は上記の4つの入口に従う。

CI PASSは建築美術・実Minecraft・真のLLM創造の合格ではない。