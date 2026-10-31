MinecraftAIBuilder R14 MINI — R6結果ZIPをもう一度監査する（初心者向け）
=============================================================

R14ではQwenを絶対に実行しません。Minecraft Educationも起動・変更しません。
以前すでに実行したR6の「UPLOAD_THIS_RESULT.zip」を読むだけです。

【Windowsの使い方】
1. このR14 MINI ZIPをダウンロードして「すべて展開」。
2. SETUP_AND_REAUDIT_R14.cmd をダブルクリック。
3. ファイル選択画面で以前の R6_..._UPLOAD_THIS_RESULT.zip を選ぶ。
4. 初回だけGitHubから約100KBの監査用プログラムをダウンロード（ネット接続が必要）。
5. 後はインターネット接続なしで同じ監査を実行できます。
6. 日本語の品質レポートHTMLが開き、再提出する R14_..._UPLOAD_THIS_AUDIT.zip が選択されます。
7. R14のZIPをこのチャットに送るだけです。

ZIPを SETUP_AND_REAUDIT_R14.cmd のアイコンへドラッグしても実行できます。
PCにはNode.jsが必要です。既存の原本ZIPは変更せず、別の場所に出力します。

重要：
- R14の診断ZIPには元のQwen応答原文は再同梱しません。原本のSHAで参照します。
- 監査でHOLDはエラーではなく「まだ品質の合格を証明できない」ことを意味します。
- 途中で切れたR6のJSONを勝手に修復したり、もう一度Qwenを実行したりしません。
- 新規実Qwen推論には別途の明示承認が必要です。
- Minecraftへの施工は禁止、9 BLOCKED、BuildPlan.operations=[] のままです。
- 建築の美しさや実際に歩けるかは人間と実機の確認が必要です。
