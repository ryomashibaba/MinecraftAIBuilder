# B198Z-R51 — B143失敗原本のための「閲覧可能な形状範囲図」

## R51の目的

R25、R44、R46、R48の実Qwen試験では、B143コンパイルHOLDのために通常の厳格なR7 3Dビューアが生成できなかった。具体的な設計の誤りを**視覚的に確認する手段**が不足していた。

R51では、**モデルが出力したB143要素の外接範囲を表示する、完全オフラインの2Dインタラクティブ図面**を新設。コンパイルできない原本でも表示でき、R49の全要素の境界違反、入口／目的地、保護空洞と照合しやすくした。実Qwen追加推論、Minecraft操作、原本の補正は一切しない。

## 操作しやすい機能

- **XZ平面図のY高さスライダー**：各要素の外接直方体がそのY層に存在するかを絞る。R48のような`y=height`範囲外も閲覧できる。
- **XY正面投影**：屋根、階段と建物の高さ関係、B143宣言範囲から外れた部分を色分けで表示。
- **ADD／CUT／宣言空洞**の外接矩形、宣言入口・目的地の記号表示。入口と目的地の破線は位置関係のみで、実際に通行できる経路とは絶対に呼ばない。
- **R49診断**：全範囲外の要素ID・座標、数学的に到達不可能な宣言上限、領域IDの重複、空洞の再占有候補を一緒に表示。
- **凍結B198Bの人間評価基準**：設計要求c01〜c12を元の日本語のまま表示。モデルの自己宣言した`spatialPlan`が原要求を上書きしない。

## 新規ファイル

- `source/ai/b198zr51-uncompiled-storyboard-template.html`：外部画像、CDN、外部CSS/JSなしの1ファイルHTML（SVG描画、Yスライダー、シンプルなホワイト背景）。
- `scripts/b198zr51-uncompiled-envelope-storyboard.mjs`：原本SHAの保存、B198B評価基準との関連、R49の要素外接域の導出と安全な埋め込み、未使用の新規フォルダにのみ書き出し。
- `scripts/b198zr51-uncompiled-envelope-storyboard.test.mjs`：R48型の合成範囲外サンプル、R49の矛盾、スクリプトインジェクション抑止、原本が不変か、再実行時の同一ファイル上書き禁止を検証。
- `.github/workflows/r51-uncompiled-source-storyboard-offline.yml`：Windows/Ubuntu双方でR49/R50回帰も実施。
- R49の`localEnvelope`を**exportするだけ**の変更。既存判定ロジックは変更しない。

## 検証の限界

**この図面の矩形は全6種類のB143 shapeの「XYZ外接包絡域」であり、実際の最終ソリッドセルを表さない**。特に球、トーラス、直線階段、ビーム、CUT後の空洞、透過ガラスは矩形の形と異なる。

R51で表示できても、B143の実コンパイル、R3の支持床/頭上空間/歩行、元の依頼への忠実性、意匠品質は未検証のまま。B143に合格した場合は、引き続き正式なR7 3Dと人間レビューを優先する。

## 実行例（ソース原本を保全し、利用者に強制しない）

Node.js 24以上のオフライン検査：
```
node scripts/b198zr51-uncompiled-envelope-storyboard.mjs --raw-file "R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt" --out "R51_new_review"
```

出力`R51_new_review/R51_UNCOMPILED_SPATIAL_STORYBOARD.html`をローカルブラウザで開く。元ファイルは読み取り専用で、既存の出力先フォルダへの上書きは拒否する。

**現時点ではユーザーへ新たな操作を要求しない**。将来の単発実Qwen試験が明示承認される場合、失敗結果のZIPにこの図面を自動同梱することを検討する。

## すべての安全条件は変更なし

過去R25/R44/R46/R48のモデル原本・使用済み承認ロックと凍結Gitブランチは不変。実Qwen追加0回。Minecraft world接続0/施工0。readiness=NOT_PREPARED、施工ゲート9/9 BLOCKED、BuildPlan.operations=[]、constructionApproved=false、executionAllowed=false。R51の図は人間の建築審査を促す資料であって許可や成功認定ではない。
