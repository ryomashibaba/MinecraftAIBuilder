# B66 — ローカル3Dの内部部材アセンブリ（絶対非施工）

## 新規実装
B65の `nominalWalls` と `openingPorts` をIDと部屋参照を保ったまま、**仮想3Dウォールパネル**と**ドアの空洞・上部パネル**へ変換。床マスク・314室・概念廊下・階段・EV予約を同じ座標系に表示し、5棟・30階を切り替えられるスタンドアロンHTMLを作成。

- `compile-b66.mjs`：施工命令を一切出さない仮想ローカル3D幾何コンパイラ。各壁は「厚さ0.125・長さ1・高さ3」、ドア候補は「下部2.25の空洞＋上部0.75の仮想まぐさ」。フロアピッチ5。いずれもMinecraft実ブロック寸法ではなく、表示だけの**仮定**。
- `render-b66.mjs`：ローカル3Dの俯瞰表示。5棟、各6階、床・壁・開口、4方向の視点、拡大縮小。単一HTML、外部リソースなし。
- `run-b66.mjs`：B64/B65原本のSHAを照合して実行する決定的な読み取り専用ランナー。CLI引数禁止。
- `B66_LOCAL_3D_ASSEMBLY.json`：決定的な仮想3Dアセンブリ。部材ID、面の局所AABB、概念部屋・設備予約、保留証拠、全安全ゲートBLOCKED。
- `B66_INTERIOR_3D_REVIEW.html`：ネットワーク不要のビューア。
- `compile-b66.test.mjs`：52件のテスト。
- `verify-b66-package.mjs`：B65原本ソースハッシュ固定、B66新規ソース固定、決定的なレポート/HTML再生成・不正ファイル検出。

## 主な数字
- 壁境界5,704件 → 仮想壁パネル5,390 + 仮想まぐさ314。
- 開口の仮想空洞314件、階間予約25本、概念部屋314室。
- 仮想壁体積2050.6875、仮想空洞88.3125（仮想セル体積単位）。両者の和が未開口の壁体積2139と厳密に一致。

## 実行・検証
```sh
cd source
node verify-b66-package.mjs
node --test parallel/b66/main/compile-b66.test.mjs
node --test parallel/b65/main/compile-b65.test.mjs
node parallel/b66/main/run-b66.mjs
```

## 重要な制約
この仮想3Dは**Minecraftブロック配置を実行しない**。通路幅、階段、ドアの開閉、支持構造、素材、実ワールド座標、外壁 `composeFacade` への忠実性を検証していない。B42旧モデル上階60件の未接続、およびB62の迂回案の施工可否は未解決。

本番エンジン原本の受入れ用コードは以前の `parallel/b55` / `parallel/b56` に保持したまま変更なし。Windows実機収集ZIPが必要。まず既存 `COLLECT_B56_ONEPASS_READONLY.ps1` を Windows 実機で **読み取り専用** 実行するか、原本を安全に受け取る必要がある。B66では現実環境に接続していない。

`NOT_PREPARED`, 9 M4 gates `BLOCKED`, `executionAllowed=false`, `BuildPlan.operations=[]`, `worldContacts=0`, `engineCalls=0` を強制維持。
