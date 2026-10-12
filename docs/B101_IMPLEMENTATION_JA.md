# B101 — 汎用居室条件と幅2セル動線のオフライン検証

## 方針（2026-10-12）
Minecraft Education版を優先。Java版は将来対応。特定集合住宅の設計を標準形にしない。B100の五用途（住宅・ホテル・集合住宅・オフィス・図書館）、全15形状案に共通の検証APIを適用する。

## 実装
- source/parallel/b101/main/b101-programme-route.mjs:
  - normalizeProgramme：居室用途、必須室数、最小面積、階制限、名目入口・外周露出の入力検証。
  - allocateProgramme：最大二部マッチングで一つの居室を複数用途に重複利用しない。条件を満たせないときは HARD_CONSTRAINTS_UNMET と不足数・理由を返す。既存の形状は変更しない。
  - parseProgrammeJapanese：限定した数字付き室数・室面積のみ解釈するルールベースパーサー。未解析数値条件は unknownNumberClauses として残す。
  - auditCandidateRoutes：隣り合う2x2の通行領域をグラフ探索し、名目2セル入口候補から共通コアの予約領域へ至る経路を判定する。外周につながる1階の外部出口候補も別途抽出し、中庭の空洞は外部と誤認しない。
- source/parallel/b101/main/compile-b101.mjs：B100の凍結報告を読んで5用途×3案を再現性を持って比較。
- scripts/verify-b101-safety.mjs：B101専用の施工禁止検証。B100の凍結ファイルを変更しない。
- .github/workflows/qa.yml：B92-B101の287テストとB101施工禁止ゲートをCIへ追加。

## 注意：実装が証明していないこと
本実装はあくまで仮想設計の検証。
- 平面上の幅2セル経路は、現実のMinecraftのドア、階段、エレベーター、避難経路、2ブロックの頭上空間を証明しない。
- 外壁と面した出口候補は、地形・高低差・屋外アクセス・ドア枠を検証していない。
- 面積は矩形平面のセル数。家具、壁厚、実3Dの空き領域は考慮していない。
- 今回の部屋割当ては既存の仮想室の再利用に過ぎず、要求に合わせて新しく間取りを生成する機能はB102以降。
- 外観の美しさや実際の建築的多様性は今回のテストだけでは証明できない。

## 不変の安全条件
B100までの凍結ソース、296室の未承認候補と18室の保留候補は変更禁止。
readiness=NOT_PREPARED、9ゲートBLOCKED、BuildPlan.operations=[]、commandCount=0、worldCoordinates=null、worldContacts=0、constructionApproved=false。
Minecraftワールド接続・新規実施工は0。

## 次工程（B102）
1. 既存室の再配分だけでなく、要求された室数・面積に合わせる新しい配置合成エンジン。
2. 真の3D床/壁/空気/開口/頭上2ブロックの衝突検査。
3. 外部出入口・複数コア・上下階動線の設計と、名目動線と実物理的動線の峻別。

日常開発はGitHubブランチ＋PR＋Actionsとし、統合ZIPは節目のバックアップに限定する。
