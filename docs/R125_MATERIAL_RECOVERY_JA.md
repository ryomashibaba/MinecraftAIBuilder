# R125 素材復旧 — 安全な実機確認待ち
2026-10-31 JST。既存のQwen花屋（933ブロック）と保存済み原回答、世界、SHAは変更しない。

- R125標準MakeCodeエクスポートは **strict / fail-closed**。B143で利用したstone/glass以外は、v26.33で実機確認後に追加したユーザー申告パレットがなければ `UNVERIFIED_MATERIAL_...` HOLDとなる。未検証材料を黙ってstoneにしない。
- 旧合成デモに限り明示 `legacyStoneFallback:true` で旧石パレットに戻す。マルチマテリアル成功としては扱わない。
- 実使用の材料だけを `blockByName` で解決。プログラムとオフライン報告で抽象材料別/実ブロック別予定数を保存し、mabverifyでは実位置と対応材料数を照合。ただし空気・歩行は別検査。
- 素材名はMakeCode APIに存在しても、Education v26.33での個別対応は別の実機証拠が必要。

## 実機の独立一素材プローブ
コピー済みの**空で平坦なバックアップ済み試験ワールド**だけで実施する。元花屋には絶対に上書きしない。
1. ローカルで `node scripts/r125-material-probe.mjs --block oak_planks --out probe-oak-001`。この名前は未確認候補であり、成功を保証しない。
2. `probe-oak-001/MAKECODE_MATERIAL_PROBE.ts` をCode BuilderのMakeCode JavaScriptに貼付しRun。まだ実書込みなし。
3. 足場のある空気位置（プレイヤー+8,0,+8）で `mabprobe` を一度だけ送信。候補名解決が失敗したら停止、無条件再実行禁止。成功表示と現物素材種類・版・スクリーンショットを記録。
4. 別素材は新しいソース/コピーで一種類ずつ。例 `white_concrete`、`iron_block`、`sea_lantern` は**いずれも未確認候補**。
5. 実機で確認できた材料のみ、下記のJSONをローカルに保存。入力は利用者申告でありコード単体では真偽を証明できない。

```json
{"schema":"r125-education-user-verified-palette-v1",
 "edition":"Minecraft Education","version":"26.33",
 "blocks":{"wood":{"blockName":"oak_planks","evidence":"実機コピー上のPROBE MATCHとスクリーンショットの記録"}}}
```

既存保存済みR125案（新モデル通信不要）：
`node scripts/r125-japanese-makecode.mjs --plan <PLAN.json> --palette <verified-palette.json> --out <NEW_DIR>`
その他B143：
`node scripts/r125-export-education-pilot.mjs --design <DESIGN.json> --palette <verified-palette.json> --out <NEW_DIR>`
使われた未登録材料はHOLD。対応させた材料の名称・予定数・profile SHAはEXPORT_REPORT.jsonへ。別の新規試験コピーへ実施工する前に、出力と原作者指定材料の整合・配置範囲を確認する。

実機プローブと新マルチマテリアル施工は未実施。新推論0、worldWrites0、正式ART認定0、既存R190系NOT_PREPARED/9 BLOCKEDを変更しない。
