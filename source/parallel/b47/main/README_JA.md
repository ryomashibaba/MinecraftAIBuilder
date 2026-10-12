# B47 — 既存プランナーの形状規則との非施工比較

## 実装範囲

B46の5棟30階・175形状パケットを、Windowsスナップショットから取得した`GeneralBuildingPlanner` の**外形処理**および`building-grammar.js`のマス規則と比較する。参照ファイルはSHA-256を固定。**元のプランナーやMinecraft本体はimport／実行しない。** 追加した実装はソース由来の純粋な形状規則の書き起こしで、作業用幾何比較しか行わない。

- `compile-b47.mjs`: 8種類のソース由来マス規則、幅・奥行・階数・seed変化の列挙、30階のフットプリント・外壁線分・屋根の比較、95段階の非施工フェーズ・データ。
- `run-b47.mjs`: 読み取り元の原本ハッシュとB46の再計算を照合。`--export`はファイルがない場合だけ新規書出し。
- `compile-b47.test.mjs`: 比較条件、安全条件、不正入力・改ざん拒否などの焦点テスト。
- `REFERENCE_BUILDING_GRAMMAR_PINNED.txt`: 2026-10-10 Windows原本スナップショット内 `engine\\src\\building-grammar.js` のバイトコピー。**参考テキストであり、直接実行しない。**
- `B47_PINNED_PLANNER_COMPATIBILITY.json`: 非施工比較結果。各棟のshape/seed/variation、出典と屋根分割差の具体的な矩形を収録。

## 主な結果

| Building | 照合した形状規則 | 既定選択で再現 | 明示的なmassing指定 |
|---|---|---|---|
| hotel/candidate-01 | slab | いいえ | 必要 |
| apartment/candidate-01 | courtyard | いいえ（今回のseed/modernモデルでは） | 必要 |
| office/candidate-01 | tower_on_podium | いいえ（今回のseed/modernモデルでは） | 必要 |
| office/candidate-02 | asymmetric_block | いいえ（今回のseed/modernモデルでは） | 必要 |
| office/candidate-03 | slab | はい | 不要 |

- 5棟・30階の占有、屋根投影、外周・中庭のエッジ占有は**参照の純粋な幾何規則ではすべて一致**。
- ただし、**屋根の長方形分割法3か所に違い**（apartment L6, office01 L2, office02 L5）。セル集合は一致しているが、基となる`fill`の分割単位は異なり得る。安易にB46の矩形列を直接施工に渡さない。
- 5棟のマス形状に候補レシピはあるが、**実際のcreateCompositionのseed/style/quality/material、ローテーション、入口位置、全建築モジュールは検証していない。** 「実プランナーで完全一致」とは主張しない。
- `conditionalPhasePreview` の95工程は参照用の外形幾何パケット（基礎5 + [床30、外壁30、屋根30]）であり、ブロックID／ワールド位置／施工命令ではない。

## 次工程 B48

現状のレシピを使い、**開発用の孤立環境で`createComposition`と実プランナーの全形状を比較する差分ハーネス**を設計する。ただし、エンジンにBridge/WS/HTTPを含めず、実施工・実スキャンは厳禁。屋根矩形分割差3か所について元プランナー方式への正規化条件を調べる。並列化よりメインの一本化が効率的ならサブチャットを増やさない。

## 実行

```bash
cd source
node verify-b47-package.mjs
node --test parallel/b47/main/compile-b47.test.mjs
node parallel/b47/main/run-b47.mjs
```

旧`verify-b46-package.mjs`はB47の追加ファイルを拒否する仕様で、凍結原本の検証器を改造してはいけない。

## 安全条件

`NOT_PREPARED` / `BLOCKED 9/9` / `BuildPlan.operations=[]` / `engineCalls=0` / `constructionApproved=false`。原本749ファイル無変更、Windows操作・Minecraft建築・スキャン・Codex利用0。
