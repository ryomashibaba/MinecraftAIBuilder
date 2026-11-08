# MinecraftAIBuilder B198Z-R23 — 次回単発実Qwenの証拠経路（今回の実行は0回）

## 絶対条件
- **R17で明示承認した実Qwen 1回は消費済み**。本ファイルの存在は、次の実Qwen推論への新たな許可ではない。
- R23の実Qwen利用前に、その回の新しい明示承認をユーザーから得ること。
- 実施してよい対象は将来の `qwen3.8:27b` の設計原本生成1回のみ。Minecraft Education世界の読取・施工は別の許可と9ゲート確認がない限り禁止。
- `NOT_PREPARED`、9 `BLOCKED`、`BuildPlan.operations=[]`、worldReads=worldWrites=0。

## 新規経路
1. `scripts/b198zr6-authorized-single-r4-capture.mjs` に明示プロファイル `r22-quality` を追加。**このプロファイルは旧R6の文字列 `I_APPROVE_ONE_LOCAL_MODEL_REQUEST` を受け付けない**。新規R23用文字列のみ有効。
2. デフォルトの `r8-original` と既存 `r11-compact` は改変せず、過去R16のSHAピンを動かさない。
3. プロファイル選択時は `r22QualityGuide:true` と検証済みガイドSHAを持つB198Sのローカルブリッジで1回だけ生成する。R22改善ガイド以外のテンプレートは導入しない。
4. `scripts/b198zr23-future-one-shot.mjs` は別の新規文字列を要求し、**先に読み取り専用GETで正確なモデル名を確認**。未インストールなら承認ロックは未消費、生成POSTは0回。
5. モデル検出後にローカルフォルダーに `R23_APPROVAL_CONSUMED_LOCK.txt` を `wx`（CreateNew）で作成。同一フォルダーではそれ以降の追加要求を拒否。例外やHOLDでロックを解放しない。
6. 旧R6の原本保存・R11/R13互換の品質評価・R7ビジュアル（条件付き）を再利用し、R23専用の静的故障診断・証拠連鎖監査・マニフェストを別途生成する。
7. 設計がコンパイル/到達性でHOLDでも原本と監査は残す。**自動修復・別の推論リトライは一切行わない**。

## 生成される証拠
- `R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt`（モデルが実際に返したときのみ）
- `R6_FROZEN_REQUEST.json`、`R6_SINGLE_CAPTURE_RESULT.json`
- `R6_R5_UNVERIFIED_CAPTURE_RECEIPT.json`（モデル同一性の電子署名ではない）
- `R13_OFFLINE_QUALITY_DECISION.json`、`R13_OFFLINE_QUALITY_OVERVIEW.html`
- `R23_SOURCE_FORENSICS.json`（旧R17の欠落材質・範囲・空洞矛盾を再チェック。静的解析に過ぎない）
- `R23_EVIDENCE_CHAIN_AUDIT.json`（原本SHAと各派生JSONのsha、プロファイル、モデル、実行安全性）
- `R23_ONE_SHOT_MANIFEST.json`（消費済みロック、新旧承認分離、HOLD理由と原本SHAを保持）

証拠リンクPASSは建築品質PASSではない。R13がHOLDならR23は `HOLD_SOURCE_OR_GEOMETRY`。原本の欠落/改竄/証拠欠落なら `HOLD_EVIDENCE_CHAIN`。

## 現工程の範囲
- 今回は **Node内部の将来用実行経路とCIの模擬HTTP** を実装するだけ。実Ollamaサーバーへの接続0、実Qwen推論0、Minecraftの施工0。
- **ユーザー向けの実R23ランチャー配布・実行は保留**。将来、別の明示承認を受けた時点で、Windows 1操作・固定SHAピン・HOLDを含む結果ZIPを検証したものだけを提供する。
- 旧R17ランチャーは使い直さない。既存の保存済みR17原本SHA `66410c2ec29ea2b31e7317989723073af3628f8f18f0e351760d12a8e9e13cbb` は一切変更しない。
- 無料のローカル推論のみ。外部API、課金、モデルダウンロード、GPUロード、世界接続をCIで行わない。

## 次の意味あるゲート
新実Qwen出力で **B143適合、独立R3動線、保護空洞、接続階段、現実的な立体内部、用途に合った独創的外観** が改善するかを測定し、旧R17と違う形状・SHAが出て初めて実質改善として扱う。合成テストのPASSは将来の実モデル品質を一切証明しない。
