# B119 — 保留された9出口：階段本体・踊り場・床開口・上下幅2通路の同時3D再設計

## 確認した前提
- B118の全件データでは、原位置の9出口を保護したまま幅2通路を延ばす方法が全件不成立。最大2マスの「出口位置変更」だけの参考案は7件だが、階段全体の踏面・支持・人体モデルを移していないので認証不可。
- B117の102階段・816開口候補・204保持する踊り場セルは施工されていない。
- B115〜B118のCI、2026-10-15時点の総合QAは成功報告がある。ただし実機Minecraftの建築・移動検証を含まない。

## B119で追加するもの
- 9保留出口を対象に、対象階段1本全体の位置を距離3以内で移動し、4方向に向けた実際の半ブロック踏面・サンプル人体AABB・側方支持を3Dに変換して再生成する（B114の符号付グリッド変換を再利用）。
- 上下階のB104床マスク、保護室、他コア、ほか101本までの既存/仮想階段、B105外壁・家具などのボクセル、人の2ブロック頭上領域、B117の他階段開口候補を照合する。
- 上階の支持床2セルを保護し、別途B117床開口案を生成する。B114で提案済みの廊下追加候補も障害になり得るものとして保護する。
- 上階・下階**両側**に幅2の連続した通路があるかをB118の独立ルート探索で判定する。元の9件だけ片側が治っても、反対側が接続不能なら成功候補から除外する。
- 候補数・理由別の不採用件数・近い候補の否決要因を全15棟/102階段参照、9保留出口についてJSON/CSV/日本語Markdownとして記録する。

## この工程で認証できないこと
実Minecraft Educationにおける階段BlockState・昇降当たり判定、踊り場の実際の床支持、柱・外装/屋根/室内仕上げ、全建物の施工済みネットワークとの整合、プレイヤー実機動作、指示前の世界変更。全候補は **LOCAL_GEOMETRIC_CANDIDATE_ONLY** としてレビューのみ。元の9件は依然 **HOLD**。

## 永久保持
`NOT_PREPARED`、9施工ゲート`BLOCKED`、`BuildPlan.operations=[]`、`worldContacts=0`、旧296未承認・18室HOLD。mainやB113〜B118に変更・マージを行わない。公開済みリポジトリへの新規Draft PRのみ。

## オフライン再現
```sh
node --test source/parallel/b119/main/b119-full-stair-3d-search.test.mjs
node source/parallel/b114/main/b114-batch-review.mjs
node source/parallel/b117/main/b117-fleet-review.mjs
node source/parallel/b118/main/b118-fleet-review.mjs
node source/parallel/b119/main/b119-fleet-whole-stair-review.mjs
node --test source/parallel/b119/main/b119-fleet-whole-stair-review.test.mjs
```

各検証はPC上でのオフライン幾何演算だけであり、Minecraftへ接続する必要はない。
