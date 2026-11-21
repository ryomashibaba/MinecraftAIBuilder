# R160 — 中央通路に依存しない、用途非依存の片側共通ギャラリー

目的は従来R139/R159で固定された中央縦通路型から実際の平面構成を変えること。特定の建物ジャンルや表層装飾ではなく、モデルが建築動線の類型自体を短い意味IRで選択する。

- `--architecture topology` を新設。モデルの `architecture` は `schema, entryHierarchy, daylightStrategy, roofEdge, spatialTopology` の厳密5項目。 `spatialTopology` は `central-spine` / `west-gallery` / `east-gallery`。
- 片側ギャラリーは中央軸ではなく片側に4幅以上の通路、反対側に3つの実室。3室の分割をモデルのroom weightで割り振り、共通ギャラリーから全室に幅2の開口を用意。選択された1組の直接接続も、別の幅2ドアで接続する。入口は選択された前室に実際に開く。
- 4室や接続不能なグラフを3室に黙って削減しない。幅・奥行不足、塞がれた扉、支持床不在、家具到達不可ならHOLD。既存の真正B143を生成・照合し、ソースルート/家具の検査を通す。
- 元Qwen生応答・旧R155/R158/R159モードを一切書き換えない。これはホストの幾何構築であり、実モデルが確かに選んだかどうかは別。CIのHTTP代替は実LLM推論の証拠にはしない。ソース比較画面・ZIPの経路は既存R157を再利用。
- 現段階は小規模**3室**の片側ギャラリーのみ。4室実装、非矩形L字構成、複数入口、階層、敷地外連結、実Minecraft歩行、美術レビュー、汎用性は未検証。ART HOLD、NOT_PREPARED、9×BLOCKED、空BuildPlan、worldWrites=0を維持。Draft PR #128継続。
