# R125 V4D — 段状公共スパイン／半屋外ロッジア（第1試作）

2026-11-03 JST。**ART-FIRST / SOURCE研究。V4Cの3/3 ART REJECTは変更しない。**

## 研究目的

V4Cでは「箱＋翼＋巨大な屋根穴」が3案とも美術不採用だった。そこでV4Dの初回は、用途別の完成テンプレート・窓だけの修理・中庭面積の増量をせず、AUTHORが主輪郭の連続形、複数の屋根基準高、水平にずれた主要帯、通り抜ける用途空間、半屋外公共の縁側、深い屋根付きアプローチを短いIRで著作できるかを真正B143で検証する。

## 実装境界

- 新規の独立オプトインSOURCEは source/ai/r125-sculpted-spine-v4d.mjs。V1〜V4C、R125主コンパイラ、Educationアダプタ、privateモデル原文は変更しない。
- AUTHOR指定：3〜5の前後連続する主帯の水平X位置、幅、奥行、屋根Y、機能、接続口の位置、北側公開入口、広場と庇の範囲・高さ、側面のロッジアと開口ベイ、上部ガラス帯の寸法。HOSTが用途名から形状を自動選択しない。
- HOST責務：厳格スキーマ、境界、主要屋根段差、平面セットバック、開口衝突、公共支持床と頭上空気、真正B143の全voxelと2幅SOURCEルート、出所と施工禁止の検証。失敗は修復せずHOLD。
- 制限：まだ矩形主帯の連結であり、真の斜め/曲面、耐荷重、屋根防水、ゲーム内地形・歩行、2階アクセス、実QwenのV4D設計、世界水準ART認証には未対応。「箱の段積み」を超えたとまだ断定しない。

## AUTHORの単一合成テスト（実Qwenではない）

scripts/r125-v4d-synthetic-fixture.mjs に1件のSOURCEテストダブルを追加。帯X=22/14/28、屋根Y=10/18/12、連続した3機能、3つの横抜け開口、屋外の広場と庇、上部50ガラスvoxelをAUTHOR入力で定義。用途名だけを変えて同じ完成テンプレートを複数生成するものではない。計測はSOURCE限定。

GitHub Actionsから index.html（真正B143 3D）、ACTUAL_B143_SOURCE_VIEWS.svg（完成voxelからの上面/北側立面）、V4D_SOURCE_REVIEW.json を同じArtifactへ自動出力。毎工程の手作業スクリーンショットを要求しない。誇張した意匠は描き足さない。

## 独立ゲート

1. A（Node/CI）：正負テスト、verifyCompiled、出力ファイル。Queued/FailedはPASSではない。CI成功前は正式SOURCE PASS未認定。
2. B（SOURCE）：用途帯・半屋外領域への入口起点2幅到達、支持床、頭上空気、庇下の人の通り抜け、実ガラス、全voxelと主輪郭差を検査。実ゲーム歩行は未認定。
3. C（人間ART）：同一縮尺の上面・立面・斜視・入口/ロッジアを評価。巨大な箱3つのままならART REJECT。機械的形状差はART採用の代理指標にしない。
4. D/E（実機・実モデル）：NOT_TESTED。美術表現力の不足を無視してローカルQwen再推論を量産しない。

既定のWorldWrites0、NOT_PREPARED、9 BLOCKED、BuildPlan.operations=[]、施工不可を保持。Draft PR #128はOpen/Draftのまま、研究ブランチへ普通のコミットのみ。mainと既存Education実機成功経路、原本とprivate Qwenを保護。

次の判断は専用CI/Artifactと人間ART評価を先に行う。SOURCEが成立しても見た目が段状ボックスなら改善課題を明示し、3つの独立作者構成や実Qwenへ性急に昇格させない。
