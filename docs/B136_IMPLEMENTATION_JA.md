# MinecraftAIBuilder B136 — 実機4方向校正確定＋3段階段の移動軌跡検証

## 2026-10-16 Minecraft Education実機の校正成果

ユーザーが手動設置した通常のオーク階段1個、実機座標 **(123,-60,-18)**、B135で以下4回のWebSocket実応答を取得した。すべての回で **oak_stairs陽性対照statusCode=0**、bedrock陰性対照statusCode=-2147352576、該当するweirdo_directionが一意一致。通信エラーなし。ユーザーが置き直したときの「高い側」の方向を後から直接確認した。

| B135ログ | ユーザーが確認した高い側 | `weirdo_direction` | 実機一致 |
|---|---|---:|---|
| R1 | 東 +X | 0 | YES |
| R2 | 南 +Z | 2 | YES |
| R3 | 西 -X | 1 | YES |
| R4 | 北 -Z | 3 | YES |

証拠の系統：ユーザー提供 `B135_R1_2026-10-16T09-23-20-806Z.json`、`B135_R2_2026-10-16T09-25-23-052Z.json`、`B135_R3_2026-10-16T09-25-31-560Z.json`、`B135_R4_2026-10-16T09-25-39-230Z.json`、続くユーザー自身の4方位確認。**BlockStateと外見上の方位対応は実機照合済み**。JSONには映像・歩行衝突情報は含まれない。認証済みの歩行PASS、102階段全体の建築準備完了とは混同しない。

## B136実装内容

従来のB135キットを**再生成せずに使う**（GitHub Actions成果物 38871411964／`B135-Windows-Controlled-Live-Stair` を取得して正本ハッシュを検証）。B136ではWindowsのCMD1回起動＋Minecraft `/wsserver 127.0.0.1:8000` 接続で実機を検証できる。

- 任意の既存テストワールドのオーク階段1段についてブロックXYZと「高い側の方向」を入力。
- 接続直後に、同じ方向で高さ1ずつ上がる3段（既存階段＋追加2段）のread-only照合を実行。
- 必要なら `!b136-build`：既存の1段は絶対に変更せず、次の2段と必要な頭上空間がすべて空気であることを `testforblock` で確認した後、**最大2個だけ** `setblock`。予定操作は先にステージジャーナルへ保存。空きでなければ中断。
- 上りを始めながら `!b136-up`、下りを始めながら `!b136-down` と送ると、8秒弱にわたり `querytarget @a` で最大32個のXYZとタイムスタンプ差を取得。**1プレイヤー以外／変則的な応答は不明として扱う**。
- 高度、階段方向に沿った水平移動、横ずれ、突然の大移動、欠損を計測。十分に連続した移動なら `MOTION_COMPATIBLE_WITH_STAIR_TRAVERSAL_NEEDS_VISUAL_CONFIRM` として候補表示。
- `!b136-clean`：ローカルに記録した2個だけを、配置直後の正しいブロックであることを照合してから空気へ戻す。設置後に他者が変更したブロックは**削除せず要確認**。初期の既存階段は保持する。
- `!b136-exit`：ゲームとのテスト操作を終了。ステージ未撤去で終了した場合は残るため、cleanを推奨。

### 既存テスト座標を使った東上り例

最初のオーク階段が **(123,-60,-18)**、高い側が東なら、3段構成は次の通り。

| 段 | X | Y | Z | `weirdo_direction` |
|---|---:|---:|---:|---:|
| 1（既存） | 123 | -60 | -18 | 0 |
| 2（空気確認後に追加） | 124 | -59 | -18 | 0 |
| 3（空気確認後に追加） | 125 | -58 | -18 | 0 |

元が東向き以外の場合は、東に変更する必要はなく、入力した高い側の方向に合わせてXまたはZが増減する。**下付き階段のみ受け付け**、上付き（upside-down）なら中断する。

### Windows実行

1. GitHub B136専用Actions 成功後、`B136-Windows-Live-Stair-Traversal` ZIPを展開。
2. `START_B136_TRAVERSAL.cmd` をダブルクリック。階段XYZと高い側 EAST / SOUTH / WEST / NORTH を入力。
3. Minecraft Educationで `/wsserver 127.0.0.1:8000` を実行。CMDに初回3段チェックが出る。
4. 不足していて追加位置が空気の場合のみ `!b136-build`。安全な足場を確認してから歩く。
5. `!b136-up`、`!b136-down` をそれぞれ実行して上り下りをプレイ。
6. `data/B136_Live_Diagnostics` の実機ログを確認。計測後は `!b136-clean`、`!b136-exit` の順に終了。

**重要**：このツールは建材の支持壁やランディングを作りません。ステージの周囲の空気、プレイヤーの転落、Y座標の高さには注意。移動を測定しても当たり判定の全面保証にはならず、人間の操作・映像/移動証拠と照合してから局所PASS候補を審査する。

## 保持する禁止条件

- 元の15棟、66階床、102階段、9 HOLD、9 BLOCKED。
- `readiness=NOT_PREPARED`、main未変更。
- 任意の施工や全体建築への昇格禁止。B136の小規模で空気に限定した実験用ブロック設置と、元プランの建築許可は別物。
- テストワールドはすべて実験用というユーザー確認を尊重。試験ごとの重複承認は不要。
- GitHub Actions CIのmock worldは実機試験とは異なる。B136の移動センサは**今回新たに実機試験する機能**であり、CI成功だけでは実機の歩行成功を主張しない。

## 外部根拠

- Minecraft `setblock` の公式block-state構文: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/commandsreference/examples/commands/setblock?view=minecraft-bedrock-stable
- Block state対応の公式oak_stairsリスト: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/auxvaluetoblockstatemap?view=minecraft-bedrock-stable
- SocketBE APIにある `querytarget` の位置情報読み取り: https://github.com/tutinoko2048/SocketBE/blob/main/src/world/world.ts
