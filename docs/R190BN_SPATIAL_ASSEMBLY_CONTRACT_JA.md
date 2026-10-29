# R190-BN 空間・階構成先行の入力契約（研究用）

ネットワーク・Minecraft操作を持たない新しい研究形式。実モデル品質は未検証。
`source/ai/r190bn-spatial-assembly.mjs` の `compileR190BNAssembly` が唯一の変換実装。

## 設計者とコンパイラの分担

設計者は用途・空間体験から、階の立脚高さ、各空間の平面位置・空気寸法、材料・厚さ、主要空洞、開口、各階段フライト、踊り場、外形を決める。コンパイラはその数値から形状を決定論的に展開する。用途名から形や配置を選ばず、欠けた入口・床・階段・支持体を補わない。

従来の「roomという名前の固体」を、**床の上にある空気空間**へ置き換えた入力方式である。既存の不正B143をこの形式へ読み替える機能はない。

## 入力

UTF-8 JSON原文bytesと、改変しない元日本語依頼bytesを別々に渡す。

| フィールド | 設計者が指定するもの |
|---|---|
| schema | `minecraftaibuilder-r190bn-spatial-assembly-v1` |
| id / title / brief | ID・題名・設計者の短い説明（briefは元依頼原本と別） |
| originalBriefSha256 | 別保存する元依頼のUTF-8 bytesのSHA256 |
| bounds | width / height / depth。既存B143制約と同じ |
| intent | use / experience / massing / circulation。各8～350文字、use+空白+experience合計350文字以下。自動切詰めなし |
| levels | `{id,standingY}` の一覧。高さはブロック座標、階数ではない |
| spaces | 下表の空間一覧。用途・位置・大きさを設計者が決定 |
| operations | 順序付きの enclosure / flight / primitive。自動配置はない |
| entrance / headroom | 入口の立脚点[x,y,z]と必要頭上空気2または3 |
| destinations | 既存R4の `{id,point,maximumPathSteps}`。設計者が座標を選ぶ |
| protectedVoids | 既存R4の `{id,origin,size,maxOccupiedCells}`。最終形状で照合 |
| assumptions | 設計者の未成立事項・仮定を文字列配列で保持 |

空間は `{id,levelId,purpose,origin:[x,z],size:[width,depth],clearHeight,minimumReachablePositions,minimumReachablePercent}`。
`origin/size` は外側の固体寸法ではなく、使う予定の**空気の平面範囲**。立脚高さはlevelIdから唯一に定まる。
到達要求は1以上の整数、percentは1～100の整数。空間の合格や美しさをモデルの閾値だけで独立認定するものではない。

## 形状操作

`enclosure` は `{kind:"enclosure",id,spaceId,thickness,materials:{floor,wall,roof}}`。
設計者が選んだ空間の立脚高さをy、厚さをtとすると、支持床上端はy-1、内部空気はyからy+clearHeight-1、屋根下端はy+clearHeight。
外側原点は[x-t,y-t,z-t]、外寸は[width+2t,clearHeight+2t,depth+2t]。厚さ1～4、全材料は既存B143の許可値。
直接B143のshellへ変換し、床・屋根の材料が壁と違う場合だけ、その明示材料の面を上書きする。巨大な固体を先に充填しない。

`primitive` は `{kind:"primitive",element:B143要素}`。box / ellipsoid / cylinder / torus / beam / staircase と既存repeatをそのまま保持する。
閉じた直方体だけに限定しないため、非矩形の外形・主要空洞・開放床・曲面・梁・開口は作者がprimitiveで構成できる。
階段は既存B143のaxis=x/z、steps2～32等を守り、各フライトと踊り場・床開口を作者が別途指定する。ホストによる自動分割・移設はしない。

`flight` は `{kind:"flight",id,fromLevelId,toLevelId,start:[x,z],end:[x,z],width,treadDepth,material}`。
作者が接続する下階/上階と水平の両端点を選ぶ。上階立脚y−下階立脚y+1をsteps、始点/終点が違う水平軸をaxis、その符号をdirectionとして機械的に導く。
終点は最上段の最後のセル。水平距離はsteps×treadDepth−1と一致する必要がある。両端点が対角、階高と長さが不整合、32段超なら拒否する。
下階の立脚y−1を階段origin.yとするため、床と階段が同じ高さ参照を共有する。踊り場・床開口・上階までの残りの階段は自動追加しない。

enclosureは選択した場合だけ生成する。space宣言だけでは床・壁・屋根を作らない。別の形の空間を作者のprimitiveだけで作ることも可能。
**全operationの後の最終ボクセル**で、各spaceの支持床と指定clearHeight全体の空気を調べる。後続の固体で塞がった部屋はHOLDになる。

## 出力と境界

原文SHA、元依頼SHA、階・用途宣言の原値、各生成要素と元operation/spaceの対応表、派生B143/R4、形状SHAを返す。
派生出力は `DETERMINISTIC_B143_FROM_AUTHOR_SPATIAL_ASSEMBLY`。モデル自身が直接書いたB143原文とは呼ばない。

支持・到達は既存R4の最終ボクセル検査を再利用する。単一セル立脚点の抽象経路であり、幅2の連続経路や実Minecraft歩行ではない。
既存BCの「同じ高さの幅2経路」は変更しない。多層の上階がBCでは未到達のままでも、その結果を改ざんしてPASSにしない。

高さ96、16万途中占有、50万bounds体積、160要素、work175万、24機能領域など、既存ターゲットの限界は残る。範囲外は縮小・切断せず拒否する。
レベルを宣言しただけでは、実在する階やアクセスを保証しない。構造耐力・日照・避難・バリアフリー・美術・用途適合・モデル独創性は別途検証が必要。

## 実行例（合成データだけ・推論なし）

```powershell
node scripts/r190bn-offline-design-study.mjs --out NEW_DIRECTORY
node --test scripts/r190bn-spatial-assembly.test.mjs
python scripts/r190bn-projection-contact-sheet.py NEW_DIRECTORY
```

保存済みの合成入力例は `evidence/r190bn/synthetic-*/ORIGINAL_ASSEMBLY.json`。
これらは試験専用で、ランタイムが建築カテゴリに応じて選ぶテンプレートではない。
既存BFの実推論入口やモデルのsystem指示には接続していない。新形式の実モデル実験には、原文の捕獲・出所の区別・固定条件・試行範囲を事前に準備し、個別承認が必要。
