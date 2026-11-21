# V4D第四案 — AUTHOR断面から連続折板外皮と公的アトリウムを生成

2026-11-03 JST。固定憲章・戦略v2・完全統合引き継ぎを継承。第三案の実CI SOURCE PASS・独立ART REJECTを凍結。

## 根本原因と新方式

第三案は3間隔の太いB143 `beam` 反復で面を見せ、真正斜視で細かい凹凸と格子状反復が支配した。本研究では**同じbeam反復を調整しない**。AUTHORが3区間の中央公共軸、左右用途幅、外周庇・中間折点・大棟の高さ/折点位置を短い意味IRで著作し、HOSTが各断面の折板線を補間する。得られた高さ一定の連続XランだけをB143 `box` に圧縮するので、任意のブロック座標のLLM全直書きも、ジャンル別の幾何テンプレートも不要。

左右に屋内用途翼をもち、中央は施工のために屋根をあとからCUTするのではなく、**最初から空気のまま残す公開の歩行軸**。支持床・2幅経路は実B143で検証。大屋根は厚さ2の連続面、室の外壁と公共側は大きいガラスを実体として構築、前面は屋根付きの半屋外入口と公開広場。少数のAUTHOR断面からの表現力の確認であり、完成建築の自動生成ではない。

## 固定の検証ゲート

- 第四案の合成AUTHOR試験だけを1件実施。AUTHOR原文改変禁止、元第三案とそのSOURCE/ART拒否記録を変えない。実Qwen/Gemma実行なし。
- 真正B143全voxelで全屋根X/Z列の2層の連続性を機械照合し、中央空気の全高さ非占有、2幅支持床、入口から中央/東西用途室3系統の到達、透明ガラスの現物をそれぞれ独立検査。
- 全棟の断面プロフィールや入力異常はHOSTが勝手に補正せずHOLD。B143の160要素・160,000voxel上限、安全ゲート、旧R125 Education安定経路は不変更。
- GitHub Actionsは既存R125専用ワークフローを再使用し、Nodeテスト、旧第三案と新第四案の真正B143単一3D、同一縮尺の上面・正面SVG、監査JSONを1つのArtifactにする。**CI実際完走前はSOURCE PASS未認定。真3Dの独立ART審査前はART NOT_REVIEWED。**

これも世界を操作する経路ではなく `NOT_PREPARED`、9 BLOCKED、BuildPlan空、worldWrites0。Work無断使用禁止、PR #128 Open/Draft、main・旧原本・private Qwen・保存済みEducation成功を保護。視覚品質が未達なら形状合格に昇格させず、同一建物の細かい改修も重ねない。

## 正式CI完走・実ボクセルの第四案独立予備ART判定（2026-11-03）

- 初回 [#41607376589](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41607376589) は合成fixtureのbriefが厳格上限100文字を5文字超過してSOURCE入力HOLD。安全契約を緩めず本文を短くして修正。
- 次の [#41607568228](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41607568228) はNode正例/負例 **3/3 PASS**・B143 SOURCE成立。比較SVGの立面が描画領域を超えたためArtifact生成だけ失敗。座標変換を修正し、元の設計・SOURCEを無変更で再実行した。
- 修正後 [R125 Actions #41607722412](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41607722412) は **completed/success**（対象実装HEAD `11e17a1570e8f2eb1180e9d36cd3f07c538cc009`）。Node正負テスト、SOURCEとB143、同一縮尺比較SVG、真正3D単一HTML、JSON、Artifact保存まで全完走。ほかの数十のActionsを含む「全レポPASS」の意味ではない。
- Artifact `R125-V4D-Fourth-Continuous-Folded-Shell-True-B143-ART-HOLD` ID **13216834546**。GitHub提示のSHA-256と実ダウンロードZIP双方 `d5606b864026f0a8fc5591ce176536b83f902f8f872c23282863387dbcb0bd4e` に一致。真正第四案 geometry SHA `0ce0db9b6e51b7d5ae792bd5a26dd08bca5bec6a30e7c6fffedf32eca028a6b4`、source SHA `8103d23d7c1e5db4335940625acb64c064747ac70827e01bcb7c2dbc3daf2f95`。15,598完成voxel、連続屋根3,560検査、公共sky/床2幅候補312、真正ガラス2,050、3用途SOURCE到達3/3、B143要素118/160。元第三案は21,109voxel・ART REJECTのまま。
- **真正B143 `surface` を東西に相当する正反対の斜視2方向で独立再投影し、同Artifact上面/正面と比較。第四案の予備ARTもREJECT。** 第三案に比べ反復ビームの視覚ノイズは大きく減少し、幅広の連続折板屋根と物理的な中央公開軸は実在。一方、ファサードの広いガラス面・平坦な垂直面は単純で、3区間の屋根境界が不連続に見える。用途（展示/学習/工房）の差、公共滞留・内外の広場体験を実3Dから十分に読めない。床や屋根の数値と美術品質は別であり、正式ART採用は0。
- AI審査は独立した真正voxelの簡易投影を目視した**予備美術判定**であり、ユーザーの正式人間ART合格の代理ではない。Minecraft実機・構造・雨仕舞・実Qwen著作・小型Mac性能は未実証。新しい実Qwen POST 0、ワールド書込0。設計段階は `NOT_PREPARED`／9 BLOCKED／BuildPlan空。

### 次の実装の門（小改造の反復を停止）

最終外形が単に「屋根を整えたガラス翼」になる問題は、第四案の同一物体をさらに装飾しても解決しない。次は **単一の固定左右翼スキーマ自体の限界**を解消し、用途に応じた複数の空間接続トポロジー・公共断面・建物の出入り・設備の実体を、短いAUTHOR IRで設計し統合する研究へ進める。3つ以上の用途で設計が本当に違うことを比較し、SOURCE成立後に人間ARTで確認できた場合にだけ本物Qwen/Gemmaの有限試験を開始する。高品質な既存Education縦貫MVPを止めず、原本・main・Draft PR・Work事前承認をすべて保護する。
