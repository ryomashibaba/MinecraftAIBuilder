# B48 — 凍結原本を変更しない正規化・参照セレクター・屋根/入口境界

## 何を増やしたか

B47の幾何一致を使い、**データとして利用しやすい、施工不可の canonical geometry**を生成する。

1. **形状セレクターの純粋な実装:** 2026-10-10取得 `building-grammar.js` の program / seed / preferred / explicit massing / variation の静的規則をB48独自コードへ安全に移植。参照ライブラリはimportしない。`style.architecture.proportion=0` を明示的な未検証前提とする。素材・styleルール・palette・qualityは実行しない。
2. **床/屋根矩形を参照の row-scan 規則へ正規化:** 全5棟30階でB46のセル集合と出典の占有が一致することを確認し、既存B46は改変せずB48のみに canonical な矩形群を保持。屋根3か所だけ矩形の並べ方が変わる。
3. **屋根境界の非施工候補:** `GeneralBuildingPlanner` の `clear(t)` 接合面回避条件を純粋なローカルセル幾何へ翻訳。塔が続く面の接合部を屋根手すりの候補にしない。604単位の候補は素材・高さ・手すり・設置の承認ではない。
4. **入口になる外壁面の候補:** 参照プランナーと同じ、北向き露出辺／開口幅／候補ソートによる参照フロント面を抽出。入口の正確な位置を決める`quality.entranceBias`が取得できないため、実ドア位置は決めない。
5. **不変ソース検査:** B47全757ファイルの内容ハッシュを保存したまま、追加B48コード・レポート・テストを厳密にmanifestへ登録。B47検証器そのものは一切編集しない。

## 検証済みの数値

| 測定 | B48の値 |
|---|---:|
| 5棟 / 階層 | 5 / 30 |
| 元の床セル | 12,778 |
| 元の屋根セル | 2,228 |
| 元の外壁辺単位 | 3,022 |
| canonical形状による矩形グループ変更 | **屋根の3件** |
| 屋根接合条件適用後の境界候補 | 604単位 |
| 原本の実プランナー呼出 | 0 |
| ワールド更新 | 0 |
| 施工命令 | 0 |

データは`B48_CANONICAL_GEOMETRY_REPORT.json`。各階の`canonical.floorRectangles`と`canonical.roofRectangles`は**ローカル設計座標の2D長方形**であり、Minecraftに渡してはいけない。`unplacedRoofBoundaryCandidates`は境界線の候補であり、物理的な屋根部材やブロック操作ではない。

## B48実行（Node標準モジュールだけ）

```bash
cd source
node verify-b48-package.mjs
node --test parallel/b48/main/compile-b48.test.mjs
node parallel/b48/main/run-b48.mjs
```

`--export`はレポートが存在しないときだけ`wx`で書き出す。元のZIP内では出力は既に保存されている。引継ぎ時は**必ずB48用検証器**を使うこと。旧B47検証器はB48の新しいファイルを予期せず拒否するので、走らせてエラーになっても凍結原本を編集しない。

## 安全・制約

- `NOT_PREPARED`維持、M4-01〜09全件`BLOCKED`、`BuildPlan.operations=[]`、`engineCalls=0`。
- Minecraft Education、Bridge、WebSocket、HTTP、Windows操作、スキャン・施工を一切行わない。
- 参照grammar / planner / geometry envelopeのSHA-256照合以外は元ソースを直接実行しない。
- **実`createComposition` / `GeneralBuildingPlanner`本体、素材、各種ファサードモジュール、屋根部材、入口バイアス、支持・扉・階段、ワールド座標は未検証**。パリティ100%や施工可能とは宣言しない。
- 既存建築、Legacy、凍結したB47までのコード・成果・原本は全て不変。

## 次のB49候補（実施工なし）

B48の canonical geometry を基準に、スタイル設定の実データと `qualityComposition` の静的な断面入力が取得できる場合だけ、**素材未設定の抽象的なファサード・入口モジュール配置候補**の形状一致まで照合する。まず十分なピン留めソースがあるかを確認し、不十分なら「未検証」として止める。広範な偽の施工テストよりも、ゲームに接続しない大きな幾何モジュール統合を優先。
