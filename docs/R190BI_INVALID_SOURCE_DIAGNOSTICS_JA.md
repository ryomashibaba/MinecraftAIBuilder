# R190-BI — 不正なモデル原文を残すA/B比較と証拠鎖の明示

2026-10-29 JST。既存Draft PR #128、R190-BHを再利用。ART HOLD、施工HOLD、新規Qwen/Gemma推論なし。

## 目的
BF→BE→BGの統合はBHで成立済みであり、再実装しない。以前はA/Bの一方が不正B143の場合、BEのHOLD記録は残る一方、BGの真正3D人間審査画面を作成できず、なぜ失敗したかを当該比較フォルダーだけから読み取りづらかった。またBF報告からBE比較JSONの保存バイト列を直接照合するハッシュがなかった。

## 実装内容
- BF比較後、BEの元依頼SHA、設計先行プロンプトSHA、A/B保存原文SHAがBFで検査した証拠と完全一致することを検証する。不一致なら安全停止。
- BEの比較JSON保存バイト列のSHAを `R190BF_CONTROLLED_PAIR.json` に `savedComparisonReportSha256` として記録する。
- B143不正の側だけ、既存BHの原文限定診断をSHA一致済みの保存生バイトに実行。元原文を書き換えず、`R190BI_A_INVALID_SOURCE_DIAGNOSTIC.json`／`R190BI_B_INVALID_SOURCE_DIAGNOSTIC.json` を比較フォルダーに置く。BF報告は側ごとのファイル名・SHA・診断状態を保持。
- BGが作られたときは、その実際の保存manifestバイト列がBGから返ったSHAに一致することをBF報告へ併記する。
- 無効なB143の診断は**3D復元・修復・モデルが設計した建築の完成・ART PASSを意味しない**。BHの字句的な重なりは完成ボクセルの証明でもない。モデル通信もMinecraft操作も行わない。

## テストと限界
合成fixtureによるA/B成功比較では診断が生成されず、BE/BG証拠ハッシュが一致することを検証する。不正JSON `{"invalid":true}` の片側比較ではBGを生成せず、元原文のSHAを保持したBH診断をBF報告と一致させる。これは**合成通信テスト**であり、新たな実モデルA/B比較や建築美術の向上を示すものではない。保存receiptは署名されておらず、実際のモデルdigestや通信相手の真正性は独立確認されない。

## 次
新規実モデル推論の範囲別承認が得られるまでは研究・診断のみ。真正A/Bに成功した場合は既存BGで人間が実3D・内部・空間・美術を評価する。モデル回答が不正なら今回のBI診断を改変せず保存し、次の設計方法研究に活用する。安全境界はNOT_PREPARED／9 BLOCKED／BuildPlan空／worldContacts=0／worldWrites=0／officialArtAdoptions=0を維持。
