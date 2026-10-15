# B134 — Minecraft Education実機・階段5照合のWebSocket導入

## 目的

B133ではWindows側で/testforblockの文字列を表示しただけだった。B134は2026年10月16日のユーザー許可（本番ワールドはなく、すべてテストワールド）に沿い、既存のテストワールドからSocketBE 2.8.0のWebSocket接続を受け付け、ゲーム内の階段1座標に対して読み取り専用コマンドを**実際に送信できるWindowsツール**を追加する。

**GitHub Actions CIではMinecraft Educationを操作しない。** CI成功はゲーム内で接続・照合した証拠ではない。

## Windowsでの最短操作

1. B134 Actions成果物ZIPを展開し、WindowsでSTART_B134_LIVE_PROBE.cmdを起動。
2. 座標を一度入力。既存のテストワールド内にオーク階段があればそれを使用。初回起動時はsocket-be 2.8.0依存ライブラリをnpmから取得（ネットワーク接続が必要）。
3. Minecraft Educationを開き、/wsserver localhost:8000 を入力。既に他の開発ツールが8000番ポートを占有していれば、そちらを終了してから試す。
4. ゲーム内チャットに !b134 を一度送る。B134は指定座標に5回だけtestforblockを送る。
5. 返答はdata/B134_Live_Diagnostics/へJSON保存。B130の8観察枠に自動転記しない。実際の版とレスポンスが確認できれば次の実機向き校正に進む。

## 送信するコマンド

- 対象がminecraft:oak_stairsであるかどうかのベース確認1件
- weirdo_direction = 0、1、2、3の照合4件
- コマンド実行APIにはtestforblockだけを渡し、setblock、fill、tp、execute等は許可しない。
- 数値は安全な3整数座標だけ受け付け、外部コマンドや任意チャット内容をゲームコマンドにしない。

## 結果の取り扱い

- SocketBEで受け取るコマンド結果にstatusCodeが非負かつsuccessCountが**整数で0または1として明示**される場合だけ判定する。
- ベース照合が一致して、方向値4件のうち成功1件・不一致3件であれば「方向値候補」を診断報告に残す。それでも画像・実際の方位・上下形状・歩行と衝突は未検証として扱う。
- JavaScriptの通信失敗、コマンド構文エラー、権限不足、statusMessageだけの返答、成功数が不明、0件/複数件一致は**不明**。推測で0を採用しない。
- 2ラウンド×4方角の観察受付は既存B130/B129に委ね、未確認のレポートを自動的に正本へ転記しない。

## 安全

- 元の15棟66階床102階段、9 HOLDと9 BLOCKED、NOT_PREPAREDを変更しない。BuildPlan.operations=[]。
- テストワールドの小規模な設置・撤去・歩行実験はユーザー許可済み。ただしB134プログラム自身はブロック操作しない。
- 起動したWindowsツールはMinecraftのWebSocket接続が来るまで待つが、チャット !b134 以外ではコマンドを送らない。動作後は終了する。
- 将来的に歩行可能性の本物の証拠を取り、原設計へ安全に反映する必要がある。B134の接続成功だけで102階段の全体施工を解除しない。

## 参考資料

- https://www.npmjs.com/package/socket-be （2.8.0）
- https://learn.microsoft.com/en-us/minecraft/creator/reference/content/commandsreference/examples/commands/testforblock?view=minecraft-bedrock-stable

未解決：Minecraft Educationの使用版でWebSocketが接続可能か、statusCode/successCountがどの形式で返るか、実階段の移動・当たり判定。これらを実機で調べることが次工程の最優先。
