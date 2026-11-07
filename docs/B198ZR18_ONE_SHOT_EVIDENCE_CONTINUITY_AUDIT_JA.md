# MinecraftAIBuilder — B198Z-R18 証拠保全とR6/R11/R13連携の最終監査

2026-10-19 / Draft PR #128 / **実Qwen呼び出し0・Minecraft接続0・施工0** / 実モデル品質はHOLD

## 狙いと位置づけ

R1〜R17の実装を再作成せず、R17の将来用Windowsランチャーが一回限りの生成に失敗したとき、**原本が欠落しているのに正常終了する／承認消費ロックだけが残り結果ZIPを失う**危険を縮小する。R16固定依存32個、モデル名`qwen3.8:27b`、R11 `r11-compact`、3072/6144制限、旧新Qwen原本の区別は変えない。

## R18で修正した実装上の穴

1. **Node実行の初期異常終了**：R17がatomic lockを作成した直後、Nodeのロードエラー・起動失敗などでR6の出力ディレクトリが作られない場合、以前はZIPを作らず終了していた。R18では同じ一回の結果フォルダーを診断用に確保し、`R18_EARLY_NODE_FAILURE_NO_RAW.txt`、R17 manifest、R18 link auditを含む**診断ZIPを保存してHOLD**する。モデルPOSTが実際に送られたか不明な事例を「0」と偽らず、承認ロックを絶対に解除しない。
2. **証拠チェーンの未照合**：原本ファイルがある場合、`R6_SINGLE_CAPTURE_RESULT.json`、`R11_OFFLINE_COMPLETION_AUDIT.json`、`R13_OFFLINE_QUALITY_DECISION.json`、`R6_R5_UNVERIFIED_CAPTURE_RECEIPT.json`のそれぞれに保存された原本SHA256を、ディスクから計算したSHA256と比較。どれか欠ける・解析不能・不一致なら`HOLD_EVIDENCE_LINKS`とし、Nodeが0終了していてもランチャーをHOLDに変える。
3. **追跡可能性**：全結果ZIPに`R18_OFFLINE_EVIDENCE_LINK_AUDIT.json`、R17 manifestには`offlineEvidenceLinkStatus`/`offlineEvidenceLinkIssues`/`earlyCaptureFolderRecovered`を保存。原本が存在しない正当なpreflight HOLDと、存在すべき原本が欠けたデータ破損を区別。
4. **R15の比較**：旧原本の外部証拠を無断取得・作成しないため、R17は`NOT_RUN_BASELINE_NOT_AUTO_SELECTED`を維持。将来、正しい旧R13＋新R13＋B198W人間評価がそろった場合だけ、既存R15比較器で差分評価する。比較を省いたことを「品質合格」にしない。

## QAの合否根拠

- 実Windows CMD + 偽物のlocalhostサーバーを事前に専有する既存R17試験を拡張。
- 正常な**模擬**4-key原本は、R6/R11/R13/レシートが同一raw SHAと一致し、リンク監査`SHA_LINKED_EVIDENCE_PRESENT`、結果ZIP同梱・再実行禁止を検証。
- Windowsの`node.cmd`テスト専用shimにより、**R6本体が始まる直前に異常終了するケース**を模擬。ロック維持、追加GET/POSTゼロ、診断ZIPが一つ生成されること、同意文字列の再投入でも追加POSTゼロを検査。
- Windows CIがgreenになるまでは実行経路の評価は**PENDING/HOLD**。実Qwen、一般化能力、建築美観、人間評価、Minecraft歩行はCIがgreenになってもすべて**未認証**。

## 既存証拠の出所区別

- 初期3-key実Qwen 14要素：`40810c69e56e59f61704ef0e0a1d96f98a2415aa057a86d7355c44421ab3edbf` / B143範囲違反HOLD。
- R6実Qwen 4-key試行：`d7e4d3adf0d56b7ecb02aff55f72489c2cc4620652aab52004233a40a20b4e73` / 3072/3072・未完成HOLD。
- R2 156要素15,312抽象ボクセル：**ASSISTANT-AUTHORED_REVISION**。実Qwen本人の設計品質評価には使わない。
- R9〜R18で新しい実Qwen推論は行っていない。

## 次へ進むための唯一の不足

実Qwenの`r11-compact`による真の新原本が無いので、4-key完結、汎用R9/R10の自発的利用、用途に適した独創性、実用内部・吹抜け・床・階段・動線、プレイヤー衝突は**不明**。R18を準備の無限連鎖とせず、偽HTTP QAに重大な穴が無ければここで停止し、**新しい実Qwen一回の別途明示承認**を待つ。R17の起動CMDは配布しない。

安全：`NOT_PREPARED`、9/9 `BLOCKED`、`BuildPlan.operations=[]`、`constructionApproved=false`、world contacts/writes 0、mainおよび旧Draftは変更しない。
