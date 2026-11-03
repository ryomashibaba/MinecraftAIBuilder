# R125 V4D 第二案 — 非矩形外郭と実開放公共トランセクト SOURCE 研究

2026-11-03 JST。固定憲章・戦略v2・11月3日完全統合正本を継承。**V4D初回はCI SOURCE PASS / ART REJECT、凍結したまま**。

## 何を実装したか

* 既存の `r125-sculpted-spine-v4d.mjs` / 初回合成フィクスチャ / 旧比較のSHAを変更せず、`source/ai/r125-v4d-void-relief.mjs` で同一V4Dの**明示オプトイン第二著作案**を実装。ラベルを変えただけの5棟、装飾/色だけの改修、E2全座標直書きではない。
* 作者IRは `base`、`publicVoid`（どの主帯を横断するか、開始位置・幅・用途）、`edgeRelief`（主帯、東西側、開始位置、段階的な外縁inset）を指定。HOSTは空洞の意匠選択をしない。正確なB143ボクセル化・壁断面の閉じ方・支持床と2幅経路の検査のみ担当。
* **上部屋根と外壁そのものを横断CUT**して床Y=1を保持。構造や防水を認定しないが、全幅横断の真の空気体積と2幅SOURCE支持床を最後のvoxelで照合。別主帯の物理的な床/屋根端を削り、段階的に内側へ移動する境界壁と折返し壁を追加して、実平面輪郭を非矩形化。実ガラスが失われていないことも最後のvoxelで監査。
* `scripts/r125-v4d-void-relief.test.mjs` にSOURCE/形状差・旧形状の再現・フェイルクローズ負例。専用レビューは本物のB143二案を同一3Dビューワと同縮尺実ボクセル上面SVG、JSONに出力。既存R125 GitHub Actionsへ接続し、旧V4DのArtifactと別保存。

## 成功と呼べる範囲

GitHub Actionsで実際に完走するまでは **新候補 SOURCE未認証**。正しい値はCIの新runとArtifactのJSONから更新する。コード・テストをコミットしただけでPASSとしない。ビジュアルは最後の本物の3Dを見た後に別途独立審査する。既存V4D初回ART REJECTは一切変更しない。

候補は合成AUTHOR試験、実Qwen/Gemmaの今回の回答 **0回**、真のMinecraft施工・歩行 **0回**。ART **NOT_REVIEWED**。世界は `NOT_PREPARED`、9 BLOCKED、BuildPlan空、WorldWrites0。実構造安全/雨仕舞/地形と人の体験は未認証。実Qwenは、ARTの明白な不合格を越えて表現力が示されてから少数実行。

## 固定保護

研究ブランチへの通常コミットのみ。PR #128 Open/Draft/未マージ、base固定、main、R125→B143→Educationの既存実機成功、旧V1〜V4D初回、保存済みPRIVATE実Qwen生回答・失敗原本を変更しない。Workは事前承認制。ユーザーにスクショ・ZIPを要求しない。
