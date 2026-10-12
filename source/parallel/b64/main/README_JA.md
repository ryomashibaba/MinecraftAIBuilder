# B64 Concept Room Footprint Atlas（施工禁止）

## 新規実装
- `compile-b64.mjs`：Step8A `samples/{hotel,apartment,office}/review.json` の各部屋矩形をセルの所有者IDへ変換。B10基準マスクとB17内部IRの廊下・昇降設備・ドアID/座標を独立照合。
- `run-b64.mjs`：B63のSHA固定マニフェストから、対象JSONを直接ハッシュ照合して読み込み、B64結果を再計算する読み取り専用のCLI。
- `B64_CONCEPT_ROOM_OWNERSHIP.json`：5棟×6階の部屋矩形314室・占有6,462セル・概念ドア314件、B10の概念外形と参照ソースの差123セル、およびB62/63の廊下3案の概念セル分類を記録。
- `viewer-b64.mjs`, `B64_CONCEPT_ROOM_ATLAS.html`：ローカル平面レビュー。5棟・6階・候補3案を切替。外部ネットワークやブロック配置なし。
- `compile-b64.test.mjs`：再現性、範囲・所有重複、参照IR一致、施工禁止、改ざん拒否を含む専用60テスト。

## 結果と重要な限定
- 原本のStep8Aレビュー内の概念室について、5棟30階で314室・6,462セル。室間、元の廊下、階段/EV予約の重複は0。
- B62の3セル案はStep8AモデルでEV予約3セル、4セル案は階段予約3セル・元の廊下1セルを含む。5セル案 `(19,20)..(23,20)` は全て `UNASSIGNED_CONCEPT_FLOOR` で、概念室0、概念階段0、EV予約0。
- B63の仮想壁厚0.125セル、仮想通路幅1.25セルでのEV予約衝突4セルという結果は維持。**概念部屋矩形の照合は実施工可能性や本番エンジンの部屋配置一致を保証しない。**
- B10の全体概念/ソース外形差123セルはそのまま保持。旧B42上階60ドア、B43の未承認廊下35/間仕切り20候補、本番ファサード原本欠落は未解決。

## 再現
```
cd source
node verify-b64-package.mjs
node --test parallel/b64/main/compile-b64.test.mjs
node parallel/b64/main/run-b64.mjs
```
HTMLは `parallel/b64/main/B64_CONCEPT_ROOM_ATLAS.html` を開く。file://起動は検証環境の制約で未検証、ChromiumのHTML注入表示で操作確認済。

恒久安全：`NOT_PREPARED`、9ゲートBLOCKED、`BuildPlan.operations=[]`、Bridge/施工/スキャン実行0。本番ソース `architectural-quality.js` / `architectural-library.js` の原本は未取得。
