# R190-BF: 設計先行と直接B143の同条件・保存原文比較プロトコル

2026-10-29 JST / Draft PR #128 / SOURCE ONLY / ART HOLD

## 全体計画と反省
R190-BDは設計先行プロンプトと1回のモデル生成経路を接続した。R190-BEは保存済みB143の真正3D・五投影・断面の比較を実装した。しかし実モデルの設計先行候補はまだ存在しない。合成形状・検査数・CI成功をもって建築美や実用性が向上したと主張してはいけない。
BFでは新しい建築の形やDSLをホストが設計せず、両方式のモデル生成条件をそろえて真正なAI設計を比較できる研究経路に集中する。

## 実装
新設：scripts/r190bf-controlled-pair.mjs と、その合成通信回帰テスト。既存R190-H直接B143、R190-BDの入力SHA検証、R190-BEの真正3D比較を再利用する。

1. 準備：元の日本語依頼・設計先行プロンプトのSHA256を固定し、モデル名、temperature=0.35、seed、max_tokens、localhostエンドポイントをmanifestに保存。新規推論なし。
2. A/B別個捕獲：Aは元日本語依頼の完全一致、Bは既存BC設計先行プロンプトの完全一致。どちらも承認フラグがない限りネットワーク0・出力作成0。明示承認があっても片側1回、出力を事前予約、自動再試行0。モデル原文は変更しない。送信直前の正確なHTTP JSONもSHA付きで保存。
3. 比較：A/Bの保存送信body・システム指示・モデル名・温度・seed・出力上限・元プロンプトを照合。互いに同一の要求設定と確認された原文を既存BE比較器へ渡し、真正3D・五投影・断面・未採点人間審査票を生成。モデル呼び出し0。

## 使用方法（実モデル呼び出しは未承認・未実行）
以下のコードブロック中、BC_DIRは既存R190-BCの準備済みディレクトリ、NEW_*は存在しない新規ディレクトリを表す。

```powershell
node scripts/r190bf-controlled-pair.mjs --prepare --prepared BC_DIR --model qwen3:14b --seed 23 --max-tokens 8192 --out NEW_PROTOCOL_DIR
node scripts/r190bf-controlled-pair.mjs --capture --prepared BC_DIR --protocol NEW_PROTOCOL_DIR --side A --out NEW_A_DIR
node scripts/r190bf-controlled-pair.mjs --capture --prepared BC_DIR --protocol NEW_PROTOCOL_DIR --side B --out NEW_B_DIR
node scripts/r190bf-controlled-pair.mjs --compare --prepared BC_DIR --protocol NEW_PROTOCOL_DIR --a NEW_A_DIR --b NEW_B_DIR --out NEW_COMPARISON_DIR
```

**実Qwen/Gemmaを使う明示的な別途承認がある場合に限り**、各capture行へ --confirm-one-local-request を追加できる。今回このフラグは使用せず、CIもローカル模型通信のみとする。

## 因果推定上の限界
同じモデル名・temperature・seed・max_tokens・システム指示を要求しても、実際のモデルdigestやOllamaがseedを尊重したこと、GPU/ランタイム、非決定性、出力打切りの一致はまだ証明できない。したがって生成条件の要求値を固定しただけで品質改善や因果関係を認定しない。同一合成fixtureのA/B比較は NO_PHYSICAL_CHANGE_ART_HOLD が正常な結論。
実モデル原文にB143契約違反、上階の支持床や入口・動線の矛盾があってもホストが形状を修復して成功扱いせず、HOLDをそのまま保存する。
今後、モデルが書いた真正3Dを用途適合・実際の内部体験・質量と空洞と支持の一貫性・独創性で独立に人間採点し、初めて美術的な優劣を評価する。

## 安全と既存CIの未解決事項
NOT_PREPARED、constructionApproved=false、executionAllowed=false、9 BLOCKED、BuildPlan.operations=[]、worldContacts=0、worldWrites=0、ART HOLD・正式採用0。Minecraftワールド操作・施工禁止。main変更、force push、PRマージ・Draft解除禁止。
別系列にR44ソース数46対47、B198L Chromium導入失敗があり、BF成功をALL GREENとしない。既存保護境界を緩めて見かけだけPASSにしない。
次の有効な工程は、今回のBF合成CIを確認してから、ユーザーが各モデル試行を個別に承認した場合のみ実モデル原文を取得し、既存BEビューアで美術と実機能を評価すること。
