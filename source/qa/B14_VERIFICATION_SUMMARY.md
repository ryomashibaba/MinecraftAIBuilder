# B14 検証結果（2026-10-10）

- B14新規 **23/23 PASS**。異常寸法、部屋・廊下予約重複、ドア境界の異常、改ざん/誤承認、出力保護の拒否を確認。
- B13までの22テストファイル **335/335 PASS**（2並列で各ファイル別に実行）。Step8B従来255 + B14新規23 = Step8B **278 PASS**、Step8A **80 PASS**、合計 **358 PASS**。失敗0、SKIP0。過去の成功数を流用せず同一ターンで再実行。
- Chromium単独HTML: 5建物、6階切替、オフィス02、4改善案、未承認JSONを保存。JS例外0、外部リクエスト0。スクリーンショットは `qa/B14_BROWSER_SMOKE.png`。
- B13原本241ファイルのSHA-256を照合、不変。旧B13独立パッケージ検証 239 file inventory PASS。
- `reports/B14_INPUT_CONTRACT_REPORT.json`: 局所セルで概念境界5,704、名目ドア314、名目上の2D重複0。ただしオフィス02の概念廊下18セルはエンジン予測外形からはみ出し、123セルの外形差分は保持。
- 未検証: Windowsでの直接HTML起動、稼働中エンジン同一性、Minecraft Education材料ID、ワールド座標、実壁/ドア/階段/EV施工と通行安全。
- 実Minecraft施工 0、Windows操作 0。既存建築・Legacy・凍結証拠変更なし。**NOT PREPARED / BLOCKED / operations=[] / commandCount=0**。
