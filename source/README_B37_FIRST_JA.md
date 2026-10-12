# MinecraftAIBuilder — B37 非施工・踊り場候補チェックポイント

## 最初に読む
1. ZIPルートの `00_START_HERE.md`
2. `docs/B37_LANDING_ENVELOPE_AND_GATE.md`
3. `reports/B37_SUMMARY.json`

## 今回追加したもの
- `runner/step8b-landing-envelope-b37.mjs`：B36断面・B17廊下予約・B31床マスクのSHA-256固定入力に基づき、階段出入口の廊下側 **1×2 / 2×2概念領域**を診断する純粋な非施工コード。
- `reports/B37_LANDING_ENVELOPE_REPORT.json`：集合住宅2～6階のA/B案の概念候補。
- `tests/step8b-landing-envelope-b37.test.mjs`：異常入力・改ざん・施工許可偽装を含む差分QA。
- `verify-b37-package.mjs`：旧B36原本・B37成果・テスト証拠・安全条件の検査。

## 検証
```sh
cd source
node verify-b37-package.mjs
node --test tests/step8b-landing-envelope-b37.test.mjs
```

## 結果の限界
2×2領域の存在は**通路予約セルの平面上での幾何的な成立**に過ぎない。床支持、壁開口、構造強度、実階段の上下到達性、実ブロック材料・状態、Minecraft内通行の証明ではない。B37でA/Bのいずれも採用・施工しない。

**`NOT PREPARED` / BLOCKED / 9条件未解決 / BuildPlan.operations=[] / Windows操作0回**。
