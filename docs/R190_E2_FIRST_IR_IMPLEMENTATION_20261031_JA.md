# E2-1: AI著作3D・SOURCE研究の実装仕様（2026-10-31 JST）

## 著作責任
source/ai/r190-e2-architecture.mjs は旧R190とは独立したOPT-IN新形式。モデルが直接B143の3D要素（box / cylinder / ellipsoid / torus / beam / staircase, add/cut）を選択。建築用途・機能領域と2×2歩行証拠、敷地境界入口、物理ガラス窓の位置も設計データに明記する。ホストはプリミティブ・装飾・壁を自動挿入しない。programSpaces.zone はあくまで機能領域の範囲であり、壁や建物の自動生成指示ではない。

## 実証するもの
B143真正SOURCE構築、原文不変更、ハッシュ検証、外側敷地境界から入口、各機能空間まで2×2歩行パッドのBFS実ソース到達、証拠パッド上部の屋根、ガラス材と内外の空気、採光外側レイ上の障害物、窓の上下支持を各独立監査。結果は SOURCE_READY_ART_HOLD（技術のみ）であってART PASSではない。

## 未証明・絶対に過大評価しないもの
初期E2は単一床高さY=1とsource-witnessだけ。真の全領域耐候性、構造強度、階段実通行、複層建築、家具、実Minecraftプレーヤーの通行は未検証。プリミティブ素材はB143で表示可能でもMinecraft Educationの使用許諾・実ブロックIDの検証証拠ではない。MakeCode未出力、施工禁止。今回の合成fixtureは Qwenの実著作ではない。

## 証拠の再現
オフライン検査テスト: node --test scripts/r190-e2-architecture.test.mjs scripts/r190-e2-offline-source.test.mjs

実モデルが新形式を著作した場合のSOURCE-only保存: node scripts/r190-e2-offline-source.mjs C:\ABSOLUTE\MODEL_PLAN.json

成功した場合は新E2-source-フォルダへモデル/呼出者原本、原本SHA、SOURCEデータ、B143シーン、物理監査、3Dビューアを保存。HOLDなら原本とエラーを残し、誤った3Dを完成品として出力しない。Windowsで自動的に出力フォルダを開く。旧E1成功原本は保護する。

## 次工程
基礎テストPASSを条件に、モデルが自分の用途・立体形状・開口を著作するQwen実モデル1件の実証を行う。合成SOURCE合格をモデル能力や美術品質の合格に読み替えない。