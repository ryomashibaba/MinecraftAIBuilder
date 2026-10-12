# B106 — 建物15案を閲覧するオフライン3DプレビューとEducation互換性調査

## 何が使えるようになったか
B105の建物全体3Dセルを**データから直接描画**できるオフラインHTMLビューアーを生成する。5用途×3案＝15案。外観と屋内を同じローカル3D座標で切り替え、視点回転・拡縮、階ごとのカット、壁・窓・屋根・出入口の空気領域・家具候補・居室床・共用廊下・階段コアの表示切替を行う。ネット接続と外部ライブラリ不要。

### 実装
- source/parallel/b106/main/b106-review-scene.mjs：B104+ B105由来のローカル3Dボクセルを表示用にパック。SHA256で全シーンのセル、集計と安全フラグを固定。居室/通路の床、階段コア位置は「視覚ガイド」であり、実B105建築材料ボクセルとは統計上区別。
- source/parallel/b106/main/review-template.html：HTML Canvas上で実在する概念セルを投影する、オフライン・ゼロ依存ビューワー。独立した建物の架空の装飾や完成済み家具は描かない。
- source/parallel/b106/main/compile-b106.mjs：15案/66仮想階の統計・品質監査を生成。--write-preview で b106-preview-output/ に自己完結型HTMLとJSONレポートを保存。
- source/parallel/b106/main/compile-b106.test.mjs：新規30件。既存412件と合計442テスト。
- scripts/verify-b106-safety.mjs：全9ゲート、レビューの非施工性、実ブロック0、実BlockState認証0を再確認。
- .github/workflows/qa.yml：CIが15案のHTML+JSONを出力し、GitHub Actionsの Artifacts の B106-3D-Offline-Review から確認可能。利用者のWindowsで毎回テストは不要。

## Minecraft Educationの実ブロック照合
**対象バージョンの識別ラベル：26.3。これはバージョン固定の実データが取得・検証されたことを意味しない。**
B106では Microsoft Learn の Bedrock Stable ブロック識別子ドキュメントを情報源として候補名（例：stone、glass）だけを記録した読み取り専用レジストリを作成した。Bedrock Stableの一覧は、そのままEducation 26.3での実動作を保証しない。実ブロックの向き/ドア/階段/水没/窓の状態定義は未照合のため、検証済BlockStateは **0**。ブロックの置換・空気の設置・ワールド呼び出しは全面禁止。

資料：
- https://learn.microsoft.com/en-us/minecraft/creator/commands/enums/block?view=minecraft-bedrock-stable
- https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Reference/Content/BlockReference/Examples/BlockStatesAndPermutations.md

## レビューの意味と限界
プレビューはB105設計IRの確認用であり、Minecraft Educationのスクリーンショットでも完成建築の証明でもない。屋根の荷重支持・気密/雨仕舞、階段の上下移動、ドアの開閉、窓の透過、家具の実形状、室内の完成、避難性能、外観の人間評価は未認証。
レビュー画面で表示が良さそうでも施工許可にはならない。見栄え・完成度については実データに対応した画像を確認して改善する次工程が必要。

## 安全・不変
凍結原本とB100～B105は変更しない。旧296未承認候補・18保留候補は未承認維持。
readiness=NOT_PREPARED、9ゲートBLOCKED、BuildPlan.operations=[]、commandCount=0、worldCoordinates=null、worldContacts=0、constructionApproved=false、executionAllowed=false。実ワールド接続・施工0。

## 次
B107はまずB106ビューアーで建物5用途15案の外観/内部を見比べ、屋根外形、窓パターンの粗さ、家具の抽象性、実階段と踊り場の未完成を機能別に修正する。実施工解禁ではなく完成品質の向上を優先。
