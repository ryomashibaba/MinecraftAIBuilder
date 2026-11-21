# R190-O：実モデル原文のオフライン多要因診断

## 背景と対象
R190-NでユーザーPCのローカルモデルが最初の回答を生成したが、`R190_SEMANTIC_FIELDS`で3Dを生成せずHOLDになった。原文SHA-256は `a139d86a4e3f9b4c40e0d1478fd55c40d695e1e336380829665833c8b6b0af86`。この回答は**ユーザーPC上にのみ存在する原本でありGitHubには含めない**。このSHAは同一性の検査用であり、モデル身元の証明ではない。

## 実行
既存のチェックアウトで `git pull --ff-only origin feature/b198zr1-protected-architectural-revision` を行ったあと、ルートの **RUN_R190O_OFFLINE_REVIEW.cmd** をダブルクリックする。Node.js以外の環境は不要。自動的に `r190n-local-evidence/r190n-*/R190_M_UNMODIFIED_MODEL_RESPONSE.txt` を探し、対応レシートに記録されたSHAを照合する。明示するときは `node scripts/r190o-offline-review.mjs --raw <saved-original.txt> --out <NEW_FOLDER>`。

新しいモデル推論、ローカルOllamaへの接続、外部API、Minecraft実行、GitHubへのユーザー原文アップロードはすべて0。原文を改変・削除・上書きせず、新規 `r190o-review-*/R190O_DIAGNOSTICS.json` に**すべての検出違反**を記録する。

## 実験設計
1. 元の回答は常に別に保持。必須schema、禁止フィールド、屋根高さ、重複direct-edge、同一棟ファセット＋屋根の衝突を個別列挙。これ以外の未知の矛盾は従来の厳格検査を追加適用し、完全な欠陥検出は主張しない。
2. **HOST-CREATED COUNTERFACTUAL**を別のメモリ上コピーとして生成。たとえば欠けたschemaを足し、個別部屋内のformIntentを**削除**し、明らかに敷地高さを超す場合は部屋高さを変更し、既存の親子辺を重複指定したcrossConnectionsを削除。**形式だけの自動修復ではない**。造形・寸法が失われたことを明記し、モデルがその修正版を設計したと主張しない。
3. 同じ仮想案に対して、従来の `centered`、`negative-tangent`、`positive-tangent` を試す。実際にB143コンパイルと実ボクセル動線監査が成功した配置のみ、`R190O_HOST_SHADOW_<strategy>_3D.html` と5方向SVGを生成。全配置が失敗したら、そのまま原因を記録し、偽3Dを作らない。

## 安全・品質境界
元の回答が正しい建築という認証ではない。仮想案が描画されても `modelAuthoredB143=false`、`originalRealB143Produced=false`、`ART_HOLD`、`minecraftPlayerWalking=NOT_TESTED`、9つのBLOCKED、施工承認false、ワールド接触/書込0。原本の実モデル名は暗号学的には認証していない。独創性や海辺での実物建築の技術妥当性も保証しない。
