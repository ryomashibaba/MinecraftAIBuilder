# B71 — 実ソース5件の静的照合＋非実行の本番接続候補

## 実装範囲

- B67実機収集ZIPを**B68の既存受入れ器**に渡し、SHA-256固定5ファイルの一致・公開識別子を照合。収集ツールの新規作成なし。
- 凍結したB65/B69/B70の壁・開口・床を、**既存データへの参照**から作る `stageSectionRecipe()` に結び付け。原座標は未校正のまま。
- 本番 `GeneralBuildingPlanner.fromComposition()` の候補挿入箇所を特定。ただし実装差分は本番ソースに**未適用**で、実行・import・実ワールド接続はゼロ。
- 原本 `building-grammar.js` の既定 `floorHeight`: hotel=5, apartment=4, office=4。B66/B69の名目5と24階分が異なる。ホテル6階分も外形・回転・材質の一致未検証につきBLOCKED。
- `architectural-library.js` に入口・外観モジュールはあるが、独立した物理ドア・階段モジュールはこの取得範囲に**存在しない**。自動的に代替してはいけない。
- B70の床マスク外廊下予約18セルは引き続きHOLD。

## 実行（ローカル、静的・読み取りのみ）

```sh
cd source
node parallel/b71/main/run-b71.mjs --source-zip ../B71_REFERENCE_PINNED_SOURCE_EVIDENCE.zip
node --test parallel/b71/main/compile-b71.test.mjs
node verify-b71-package.mjs
```

`--write` はB71成果物だけを書き換える開発オプションで、凍結原本に影響しない。`B71_REFERENCE_PINNED_SOURCE_EVIDENCE.zip` はユーザー提供の5ファイルとメタデータのコピー。アップロード済みの内容を持ち回れるよう同梱する。

## B72で本当に必要な作業

完全な本番リポジトリおよび `modules/walls/building-envelope.js`, `engine/src/safety.js`, `engine/src/build-anchor.js`, `engine/src/material-production-binding.js`, 外部実装側のPlanner/Executor接続面を**読み取り専用で**取得する。その後、実外形マスク一致・各フロア高さ・役割マテリアル・ドアの開閉・階段頭上空間を本番のオフライン試験環境で検証する。検証前に `BuildPlan.operations` を生成したり、本番ソースへ直接マージしたりしない。

## 恒久安全条件

`NOT_PREPARED`, 9/9 `BLOCKED`, `executionAllowed=false`, `BuildPlan.operations=[]`, 施工コマンド0、実接続0。原本不変更。
