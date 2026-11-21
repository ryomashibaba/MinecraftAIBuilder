# MinecraftAIBuilder — V4C 主従棟・実用中庭・公共前庭の独立SOURCE研究

2026-11-03 JST。**現在の判定：SOURCE研究／ART HOLD／実Qwen著作0件／ワールド書込0。**

## V4Bからの変更理由

V4B合成5件の正式SOURCE技術検証は成功したが、3D美術は5/5 REJECT。全件が中央の箱＋東・南の箱に似た構成で、中庭の有効内部はわずか2〜3 block²だった。原因をQwen本体に帰属させず、今回のV4Cでは意味のある公共空洞と著作された異なる主従関係を共通IRに導入する。

## 実装と設計責任

- source/ai/r125-void-massing-v4c.mjs：旧V1〜V4Bとは別のオプトイン実装。AUTHORが2〜5棟の用途、X/Z位置、幅、奥行、屋根高さ、親子の接続、入口、主棟内の中庭と屋外前庭をすべて明記する。HOSTは建物の名前からデザインを選ばず、無効なプランを勝手に補正しない。
- B143真正ボクセルから床・壁・屋根を生成し、屋根を本当に取り除いて中庭を空に開く。中庭の実内部は最低49 block²、入口前の支持床付き公共前庭は幅10〜22×奥行6〜16 block。壁、2幅ゲート、玄関、つながる室の全てを最終ボクセルとSOURCEルート監査で検証する。
- scripts/r125-v4c-structural-fixtures.mjs：**モデル出力ではない**3つの個別著作テストケース。east-south-court（主棟から東・南分岐）、west-north-court（主棟から西・北分岐）、serial-court（主棟→南翼→東翼）という異なる接続トポロジーを持つ。
- scripts/r125-v4c-void-massing.test.mjs：真正B143、3種類の接続、2幅SOURCE動線、庭と前庭の支持床・空、無効入力に対するHOLD、旧施工安全契約を検証。
- scripts/r125-v4c-source-review.mjs：1回の実行で真正B143 3Dのindex.html、実ボクセル上面一枚比較SOURCE_TOP_VIEWS.svg、機械可読V4C_SOURCE_REVIEW.jsonを生成。架空の装飾・美術合格を付け足さない。既存GitHub Actionsに統合している。

## 暫定SOURCE測定値

| 合成構成 | 中庭の有効床・空 block² | 屋外前庭の支持床 block² |
| --- | ---: | ---: |
| east-south-court | 64 | 112 |
| west-north-court | 90 | 112 |
| serial-court | 110 | 180 |

上記は実際のB143変換器とルート監査を使った暫定検証値で、ハッシュ関数のみ代替した検証環境から得た。**正式Node CIは別判定**。前工程V4Bの2〜3 block²からは規模が改善しても、人間が使いたくなる建築を保証しない。

## 正式な次のゲート

1. GitHub Actions [#41596939516](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41596939516) は起動を確認した段階で、**完走結果はまだ未確認**。失敗した場合は根本原因を直してから再実行する。
2. 真正3Dの正面・上面・斜視・入口・中庭をV4Bと比較して、ARTと用途表現を厳しく審査する。箱型構成や空洞配置が本質的に足りない場合はART REJECTし、数値だけで採用しない。
3. 実Qwenでの新著作はまだ行わない。IRと真正SOURCEの品質が成立した後で、モデル生回答を改変せず、有限の新規推論と原本SHA管理を通して検証する。

## 固定安全境界

R125→B143→Minecraft Educationの既存実機成功経路、元V1〜V4B、ユーザーprivate Qwen原文、main、Draft PR #128（Open/Draft/Unmerged）は変更禁止。ワールド書込0、NOT_PREPARED／9 BLOCKED／BuildPlan空、Minecraft実歩行NOT_TESTED、ART HOLD、Work/Computer Use事前承認制。現実の地形との接続や構造強度は未検証。V4Cは単層・軸平行矩形主体であり、世界的建築品質を達成したものではない。
