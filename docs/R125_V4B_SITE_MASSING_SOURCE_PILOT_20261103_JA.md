# R125 V4B — 作者主導の敷地構成・中庭・公共入口 SOURCE 試作（2026-11-03 JST）

## 状態と結論

**保存済み実装：研究用V4Bコンパイラ＋合成5事例の回帰＋真正B143 3Dギャラリー自動出力。GitHub Actionsの正式完走は未確認。**
V4Aの初回GitHub Actions #41584403568も2026-11-03 JST調査時点でQueuedのまま。GitHub全体に多数の待機runがある。キュー待ちのジョブをPASSと書かない。

V4Bは既存のV1/V2/V3/V4A設計原本にパッチを当てる機能ではなく**完全に隔離した新しいオプトインのAUTHOR SITE IR**。元R125 Education実施工経路や元5本のQwen生回答の修正/再実行/上書きを行わない。

## 実装した著作責任と空間要素

- 新 \`source/ai/r125-site-composition-v4b.mjs\` の \`SITE_SCHEMA=minecraftaibuilder-r125-authored-site-v4b\`。作者が2〜4棟の主従立体について **用途/位置X,Z/幅/奥行/屋根高** をすべて選択。HOSTがジャンル名から棟を生成したり配置を自動調整することは禁止。
- 作者が接続木の各「親棟/子棟/接する方位/2幅ドア位置」を明示。実際の隣接線がない、指定ドアが壁外に出る、部屋が面積衝突する、接続を申告していない共有壁はHOLD。
- 作者が主棟の街路側オープンアプローチ（幅・奥行・位置）、**別の屋根がない中庭**（位置・寸法・内部扉方向）、各棟の外壁ガラスを明示。入口の床、左右側壁、中庭の床・空・全周壁・二幅ゲートを**最終B143実ボクセル**で照合。外壁でない場所の窓、既存ドアと窓の交錯、空間の矛盾はHOLD。
- 作者が指定した主棟・別棟・中庭の4用途領域（現在合成3棟例）を入口からの **2-wide supported clear SOURCE pad** で検査。B143元のverifyCompiledと素材/数/境界を継続、Minecraft本当の歩行や外部地面接続とは区別。
- \`authorShip=CALLER_SUPPLIED_AUTHOR_DATA_NOT_REAL_QWEN_VERIFIED\`、世界書込み0、BuildPlan空、9 BLOCKED、NOT_PREPARED、ART NOT_REVIEWED を固定。プレイヤーの実歩行、実外構、美術合格を認定しない。

## 合成5ケースの位置づけ

\`scripts/r125-site-composition-v4b-fixtures.mjs\` は住宅・店舗・研究施設・美術館・駅舎という名で**形状バリエーションを5件作るテストダブル**。寸法・高さと主棟/翼の外形は変わるが、**5件の意味用途をQwen自身が独立して設計した証拠ではなく、5つの完成建築の多様性を示すものでもない**。MODEL POST 0、private raw未使用、世界接触0。

\`scripts/r125-site-composition-v4b-preview.mjs --out NEW_DIR\` は、全件の真正B143 3Dを既存 \`b143-gallery-core.mjs\` と \`b143-viewer-template.html\` でひとつのローカル読取専用HTML \`index.html\` にまとめ、監査レポート \`V4B_SYNTHETIC_SOURCE_REPORT.json\` とともに**新しい空ディレクトリにしか出力しない**。この出力は漫画・手描き建築イラストではなく、実SOURCE geometryの3D（ただしテストダブル）。既存ランチャーとPC/GPU/ワールドには一切触れない。

既存 \`.github/workflows/r125-upper-door-repair-cloud.yml\` に新SOURCEのテスト、合成ギャラリー出力、14日間のArtifact保存を1工程追加。失敗した場合は該当エラーを修正するまでHOLD。

## 正式な次の判定

1. CIの実行完了でV4A/V4BのSOURCE・負例を照合する。遅延や失敗は未検証のまま保留。以前のWindows 5/5と本V4Bを取り違えない。
2. GitHub artifactの本物のB143 3Dを**斜視、入口、上面、中庭、内部の実形状**から厳しく審査する。矩形棟・装飾的な小さな中庭に過ぎないならART REJECT。geometry SHA差だけでは採用しない。
3. Qwenの新しい**意味IR著作**は、ソース安定とマイナス例のCIが確認できた後で、既存ユーザーPCの明示された安全なローカル実行方式からのみ行う。新規推論は最大数を制限し、既存本物5件の幾何SHAと原文を上書きしない。シミュレートされた回答を実Qwenと詐称しない。
4. 屋外高低差、上下階、斜めの翼、複雑な自由曲面、素材/デザインの高度化、実Minecraft施工はV4Bの今回の契約外。R125の現実的な小型Mac対応目標を維持し、別研究で安全ゲートを通ったものだけ統合候補にする。

## 保護契約

\`main\` 変更禁止、Draft PR #128 Open/Draft/Unmerged、旧V1/V2/V3/V4A/凍結Qwen原文/既存Education実機成功保護。Work/Computer Useはユーザーの事前承認なしで使用しない。新モデルPOST0、世界書込0、ART HOLD。
