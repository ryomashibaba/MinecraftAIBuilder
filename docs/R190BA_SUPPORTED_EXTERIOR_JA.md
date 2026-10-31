# R190-BA — 空気と歩行可能な外部通路を区別する SOURCE 最終ボクセル検査

基準日: 2026-10-29 JST。既存 Draft PR #128、HEAD 77585ca122e34236f36a248376ac2cf9bbf18fd6 から研究継続。R190-AZの真正Ubuntu/Windows CIは2/2 SUCCESS。

## なぜこの修正が必要か
R190-AZは最終B143の支持床と入口到達のプロキシを評価するが、外部への入口の判定に使う modelDeclaredEntranceHorizontalAirToBoundaryProxy は同じ高さの **空気のみ** を4近傍で辿る。敷地境界まで床が続かない空中経路であっても true になり得る。これはR190-T・AZでもプロキシと正しく注記され、実Minecraft入場の証拠には使用されていないが、今後モデルの宣言した入口を審査する際に独立の「実支持・幅2」の厳しい証拠が必要。

## 実装
`scripts/r190ba-supported-exterior-source.mjs` は入力の original UTF-8 bytes と SHA256 を固定した後、既存R190-AZへ渡して厳密B143検証を行う。上流B143が不正ならそのまま HOLD_UPSTREAM_INVALID_SOURCE とし、外部経路を推測して補修しない。正しいB143だけを最終コンパイルし、モデル自身が宣言した entrance の y 高さで 2x2 の全4床セルが支えられ、頭上 y/y+1 の8セルが空いている歩行パッドを SOURCEから求める。entranceセルを含むすべての有効2x2開始位置をグラフの出発点として、4近傍の平坦な水平BFSで真の設計ローカル境界までつながるパッドだけを承認。入口から境界までの全パッド座標を witness に保存する。
この方法はカテゴリや建築物の数、庭の有無、固定形状テンプレートを要求しない。ソースgeometryをホストで一切修理しない。

## 反証実験
合成の有効B143の中には、R190-AZが 'SOURCE_MODEL_CLAIMS_PHYSICAL_PROXIES_PASS_ART_HOLD' かつ 'entranceToBoundaryAirProxy=true' とする場合でも、**幅2の実支持床は外までつながっていない**ものが存在する。BAでは HOLD_NO_SUPPORTED_TWO_WIDE_FLAT_PATH_TO_BOUNDARY に拒否。モデル自身に幅2の外部プロムナードを元ソースとして追加した別の合成例は、source-supported 2-wide boundary witness を得る。幅1だけの外部床や途中に柱・壁がある例は拒否される。テストはすべて合成データの反例で、Qwen/Gemmaが高品質な建築を出力できる証拠にはならない。

## 保守的な限界
B143 boundsの境界はローカル設計範囲の端を意味するだけであり、実Minecraft地面や都市の道路ではない。今回の2幅検証は**高さ一定の水平面だけ**で、階段、スロープ、垂直動線、ジャンプ、通常Minecraftの当たり判定、手すりや避難安全を証明しない。モデルが複数レベルを意図した場合は単にNOT_CERTIFIEDであり、実物の不可能性を証明したことにはならない。建築美術の良さ、雨・風対策、独創性、モデルの由来、機能の適合も一切認定しない。

## 安全と運用
元のR190-AAモデル原文 (2581 bytes / SHA256 0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17) は READ ONLY。不正B143のため今後もHOLD。CI artifactには原文を重複公開せず、派生2ファイルだけ保存する。新モデル推論0、Minecraft接触0、施工0、NOT_PREPARED、9 BLOCKED、BuildPlan空、ART_HOLD、正式採用0、PR未マージ。
