# B65 — Internal Assembly Intent Compiler（非施工）

## 目的
B17 `wallBoundaries` / `roomDoorInterfaces` とB64概念部屋占有を、将来の本番アダプターが対照できる**用途別・識別子付き論理部材**に正規化します。施工命令は一切生成しません。これまでの概念データをMinecraftの壁・ドア・階段が実装済みと扱う機能ではありません。

## 生成物
- `compile-b65.mjs`: エッジの一意性、部屋側/廊下側、開口候補の1対1リンク、予約階間25本を検証して、非施工の`nominalWalls`, `openingPorts`, `nominalVerticalLinks`を作成。
- `run-b65.mjs`: B64 SHA固定原本のみに依存した読み取り専用実行。引数/ネット接続なし。
- `B65_INTERIOR_ASSEMBLY_INTENTS.json`: データ成果物。`BuildPlan.operations=[]`, `executionAllowed=false`。壁・ドア・階段にMinecraftブロックID・実ワールド座標・施工手順はなし。
- `compile-b65.test.mjs`: 53件の独立した差分・改ざん・安全検証。
- `verify-b65-package.mjs`: 全凍結ソースとB65成果物のSHAチェック、再コンパイルによる一致、禁止されたソース追加を検出。

## 実績
5棟30階、314室、5,704概念境界（5,390壁意図＋314開口意図）、階間25接続予約。全て**模式上の対象**。B62の5セル未承認候補との関連する壁境界も参照IDで保持。

## 実行
```sh
cd source
node verify-b65-package.mjs
node --test parallel/b65/main/compile-b65.test.mjs
node parallel/b65/main/run-b65.mjs
```
既存B64テストは`node --test parallel/b64/main/compile-b64.test.mjs`。**実機の生成コードは呼ばないでください。**

## 本番との限界
`architectural-quality.js`, `architectural-library.js`, `composeFacade`, 本番の壁厚/開口/階段/材料/実座標の原本なし。論理壁境界はブロック設置計画ではない。B42未解決60件およびB43の変更案未承認は引き続きHOLD。Windows側でB55/B56収集スクリプトを実行し、ハッシュ固定した原本ZIPを渡すことが本番統合の依存条件。

## 安全
`NOT_PREPARED`、全9ゲートBLOCKED、`BuildPlan.operations=[]`、Minecraft／Bridge／HTTP／WebSocketアクセス0件、凍結原本未編集。B65で承認しない。
