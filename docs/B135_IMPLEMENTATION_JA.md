# MinecraftAIBuilder B135 — 正負対照付きの実機階段状態校正

## 前工程からの技術的修正

B134のMinecraft Education接続キットはCIとWindows上のSocketBE 2.8.0読み込みに成功している。ただし **Minecraft Educationの実機接続をまだ確認していない**。B134は状態の成功判定に `successCount=0/1` を要求しており、SocketBEの `CommandResult` では `statusCode` と `statusMessage` が定義される一方、`successCount` が常にある保証はない。このままでは、すべての結果が UNKNOWN になる可能性がある。

B135はテストワールドに存在する**オーク階段1個**を対象に、実機で陽性・陰性のコマンド応答を測り、結果のstatusCodeと成功数の矛盾を確認しながら4方向値の候補を求める。新たな証拠があっても本当の向き、階段の上半/下半、プレイヤーの実際の通行能力は自動認証しない。

## Windows最短手順

1. <https://github.com/ryomashibaba/MinecraftAIBuilder/pull/39> の **B135専用Actions** が成功したら、アーティファクト `B135-Windows-Controlled-Live-Stair` をダウンロードしてZIPを展開。
2. `START_B135_CONTROLLED_LIVE.cmd` を**ダブルクリック**。初回のみnpmを利用してSocketBE 2.8.0を取得する。Node.js 22+ が必要。座標はテストワールドの通常のオーク階段のブロック座標を整数3個で入力。
3. 同じWindows PCでMinecraft Educationのテストワールドを開き、ゲームチャットで `/wsserver 127.0.0.1:8000` を実行。接続直後に**1回目の検証が自動開始**。B134で必要だった `!b134` は不要。
4. Windows側に検証結果と保存場所が表示される。ゲーム内で向きを変えた場合、チャットで `!b135` と送ると2～4回目の検証を実施する。4回に達したら自動終了。途中終了は `!b135-stop` またはCtrl+C。
5. 診断JSONは `data/B135_Live_Diagnostics/B135_R*.json`。スクリーンショットと実際に見た階段の向きも別途記録。結果の提示・解析を通して、実物の設置方向と方向値の対応を確認する。

## 6本のゲームへの要求（読み取りのみ）

- `testforblock X Y Z minecraft:oak_stairs` （陽性対照）
- `testforblock X Y Z minecraft:bedrock` （陰性対照：通常のオーク階段が設置済みなら不一致）
- `testforblock X Y Z minecraft:oak_stairs ["weirdo_direction" = 0]`
- 同上で1、2、3の値をそれぞれ検証。

「陽性が成功のstatusCode=0」「陰性が実行失敗系のstatusCode」という形を実機が返した場合のみ較正する。陰性対照の実測失敗コードと状態照合の失敗コードが一致する場合に限ってNO_MATCHとし、成功コード0（成功数が明示されていれば矛盾しない場合）だけをMATCHとする。構文・権限エラー、0件または複数件一致、通信失敗、異なる失敗コード、成功数の矛盾はすべてINCONCLUSIVE。

ゲームごとの返答形式が異なる場合、ユーザーはJSONを示せば判定関数をその実データに基づいて改善できる。ゲームで試していないにもかかわらず実機PASSとは記載しない。

## 施工とデータ保護

- **2026-10-16ユーザー確認：すべてのワールドはテスト用であり、本番ワールドは存在しない。テストのたびの承認は不要。**
- B135自身はゲームへ**読み取り専用 `testforblock` 6本**のみ送信。実機内の階段設置・方位変更は既存テストワールドで人間が行う。WebSocket待受は127.0.0.1のみに制限。
- 最大4回の試験で、最大24本のread-onlyコマンドを送る。結果はJSONのみ、旧B130の記録枠に自動入力しない。
- 15棟・66階床・102階段、元の9 HOLD、9 BLOCKED、`NOT_PREPARED`、`BuildPlan.operations=[]`を維持。PRはDraft、mainはマージしない。
- CIのMock Worldと実機Minecraftは異なる。CIは接続ライブラリのロードとコマンド範囲・Windows起動・ハッシュ改ざん拒否までを確認する。
- 時間のかかるB114–B129の再生成は、成功済みB134成果物が利用可能なら再利用。14日後など成果物が使えなければ再生成する。継承B134ハッシュ検証を必須とし、偽証拠は同梱しない。

## 次の焦点

実際のMinecraft Educationから最初の `B135_R1_*.json` を取得して、接続可否・BlockState構文・実応答コードを判定すること。**これは、さらにオフライン監査を増やすより優先**。その後に本物の歩行・衝突テストと階段レイアウトへの反映を進める。

## 参考

- <https://github.com/tutinoko2048/SocketBE/blob/main/src/types/world/command-result.ts>
- <https://github.com/tutinoko2048/SocketBE/blob/main/src/enums/command-status-code.ts>
- <https://learn.microsoft.com/en-us/minecraft/creator/reference/content/commandsreference/examples/commands/testforblock?view=minecraft-bedrock-stable>
