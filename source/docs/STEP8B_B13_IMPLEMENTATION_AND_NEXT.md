# Step 8B/B13 実装・次工程

## 調査範囲
Windows収集元の実ファイルに対し、次の5個のSHA-256を照合した（固定値: `runner/step8b-module-contract-b13.mjs`）。
- `engine/src/general-building-planner.js`
- `engine/src/building-grammar.js`
- `engine/src/architectural-quality.js`
- `modules/architectural-library.js`
- `styles/urban_japanese.json`

汎用プランナーは床・外壁・外部入口の発行経路を持つ。一方、**調査した汎用プランナーと建築モジュール登録範囲では** 室内間仕切り・各室ドア・階段ブロック組み立て・EV機構の発行処理は特定できなかった。プロジェクト全体で実装不存在とは断定しない。実プランナーは実行していない。

## B13実装
- B13.1 B12のハッシュ／設計凍結根拠を保持し、Windows実体の固定ハッシュを記録
- B13.2 外部構造／室内モジュールの能力契約7分類
- B13.3 概念上の314ドア点、30階・25階間階段リンク・5 EV予約と実施可能性を分離
- B13.4 office02は `urban_japanese` style proportion=1, seed=0 により概念wing5→予測wing6。123セルの外形差分と18セルの廊下予約はみ出しを静的検算
- B13.5 原案保持、廊下端補正、概念外形リベース、両方を組合せた4種類の**未適用**案を比較
- B13.6 未承認・署名なし JSON 出力、改ざん拒否、安全ゲート固定
- B13.7 単独HTML／CLI／335件QA／Chromium実操作／ZIP復元

## 限界
概念的な外形差分が0になっても、施工アルゴリズムの物理安全・ドア開口・壁厚・実階段・頭上空間・EV動作を証明しない。非施工レビューを自動的に採択・設計反映しない。

## 次工程 B14
外形・概念室内の**モジュール入力契約**（座標/高低差/衝突規則/材料対応）をオフラインの型付きデータとして定義。実施工機能の実装は、施工禁止のままレビュー出力のみに限定。稼働中エンジンとワールドの実機一致は別ゲートで保留。

既存建築・Legacy・凍結証拠変更なし、Windows追加操作0回、`NOT PREPARED` / `BLOCKED` / operations=[] / commandCount=0。
