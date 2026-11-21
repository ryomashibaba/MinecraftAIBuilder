# B198Z-R60 — 原本に紐付く建築品質の視覚審査（完全オフライン）

2026-10-21 JST。既存Draft PR #128のR59から継続。実Qwen追加推論0、Minecraftワールド接続・読取・施工0。

## R59からの実質的な前進

R59は保存済みR54結果ZIPと、任意の実R48結果ZIPを安全に読み、原本SHAと凍結c01の日本語課題に結び付く事実表を作る。しかし結果表から人間が実際の建築形状を確認できない。R60は評価基準や固定図書館テンプレートを増やさず、既存R7・R51・B198Wに直接つなぐ。

- scripts/b198zr60-evidence-bound-visual-review.mjs：保存ZIPをR59と同じ安全な読み取り処理へ通し、R58比較の原本SHAと選択されたZIP内の生バイトが一致することを再確認。
- 厳格B143 compileDesignとverifyCompiledに合格したソースだけ、R7の正式な「最終概念ボクセル」3DとB198Wの人間審査ボードを生成。
- B143不合格のソースは、R51の「未コンパイル形状の外接範囲」図のみ。実際の最終ボクセル、通路、吹き抜け、床の支持や美しさの成立を偽装しない。
- R60_INDEX.html にR58の凍結4項目比較とR7/R51のリンクを集約。実R48の原本未提出なら、見せかけの過去比較はしない。
- 新規の一時ステージへ結果を生成し、SHA・図面検証すべて成功したときだけ指定の新しい出力フォルダに移す。失敗時に半端な審査を公開しない。
- 入力ZIP、原本、旧承認ロック、過去の失敗記録は変更しない。実モデルAPIへの通信、ワールドAPI操作、モデル再実行はない。

## 開発用コマンド（ユーザー操作は今の工程では0）

node scripts/b198zr60-evidence-bound-visual-review.mjs --r54-zip "/absolute/R54_result.zip" --out "/absolute/new_R60"

実R48原本ZIPがある場合だけ、さらに --r48-zip "/absolute/R48_result.zip" を追加する。未来のR54実Qwen呼び出しには別の明示承認が必須。

## 厳格な限界

本ツールは建築の創造性を自動改善するものではなく、実物に近い根拠を人が審査し、次の設計改善を選べるようにするもの。合成テストは本物のQwen生成品質を証明しない。R7の抽象ボクセル3DをMinecraftの完成建築やアバターの物理的な歩行検証と混同しない。元の日本語要件、図書館の実用性、中央吹き抜け、上階ラウンジ、統一された曲面外観は、独立した人間審査が済むまでNOT_REVIEWEDのまま。

## オフラインQA

- B143不合格でR51のみ生成、最終3Dへの偽昇格なし。
- B143合格でR7最終ボクセル3DとB198W審査ボード生成、合格の人間評価は付与しない。
- 原本SHAチェーンの破損を拒否。途中成果は正式出力に残さない。
- 偽の歴史的実R48原本を拒否。過去の実モデルの作者認証は行わない。
- 既存R58/R59回帰もWindows/Ubuntu Node24で実行。

不変：readiness=NOT_PREPARED、constructionApproved=false、executionAllowed=false、9 gates=BLOCKED、BuildPlan.operations=[]、worldContacts=0、worldWrites=0。PRはDraft維持、mainマージなし。
