# R125 V4D — CI本物B143 ART独立予備審査（2026-11-03）

**正式技術: SOURCE PASS 1/1（合成AUTHOR試験のみ）。人間ART予備判定: REJECT 1/1。新Qwen追加0、Minecraft実施工0。**

## 事実として検証したもの

- コードcommit: 627c007dbbeb1772d6caf1f41f58a14d46e46484。研究ブランチのみ。
- CI: https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41601328742 は completed/success。V4Dのnode --check、Node正例/負例、真正B143の3D生成/Artifactアップロードの全3ステップSUCCESS。全ワークフローの完全品質PASSという意味ではない。
- V4D Artifact名: R125-V4D-One-Synthetic-Author-Spine-3D-ART-HOLD、ID 13214224396。ZIP SHA256は 2f52f518bcafecfb1c6c119f3b1956626c323dcc72eb680b94ece0b646d75284（GitHub提供digestと取得ZIPを照合）。
- SOURCEレポート: 6,690 B143 voxel、sourceSha256 f9eddaf45970d1e3551fa44423ee38730c6021baac0546fcc1b7137d03a7b2d9、geometrySha256 c6079cf93491a5faff03168197b871ff6333b2e93da5b627f6687d4be1edd39e。屋根高さ10/18/12、X起点22/14/28、実ガラス50 voxel、側面の3開口、屋外2幅支持床パッド72。真正2幅 SOURCE_ROUTES_REACH_ALL_ZONES、readiness NOT_PREPARED、9 BLOCKED、BuildPlan.operations[]、worldWrites0。

## 3Dからの予備ART判定：REJECT

Artifactの index.html に埋め込まれた payload.scenes[0].surface 6,689個の実完成B143表面レコードを再投影し、東/西それぞれの斜視を独立で目視。また同Artifactの実ボクセル SOURCE_VIEWS.svg の上面/北側立面と照合した。外部のAI画像や存在しない装飾は追加していない（再投影は検査用の簡易レンダラーであり、Minecraft実ゲーム画面ではない）。

- **主屋根・外観**：幅の違う3つの箱を高さだけ変えて連結した形が、両側の斜視でも支配的。高層の中央箱以外は広い単一平屋根とほぼ無地の外壁。建築の主役となる非矩形の輪郭・構造・空間の豊かな連続性がない。
- **公共性**：3つのロッジア開口と大庇・支持床は技術的に真正。だが、連続的な公共プロムナード/内外をまたぐ広場と大空洞として立面に表れず、単純な壁の穿孔と床スラブにとどまる。
- **素材・用途**：ガラス50 voxelは本物だが大きな壁の小さい帯にすぎず、3つの用途帯の機能が外部の形態・ファサードから十分に読めない。ガラス増量や色替えは根本原因の解決にならない。
- **相対改善**：V4Cの全て等高・単純庭穴より段差/サイドアクセス/実ガラスのSOURCE表現力は増えた。これらは未だART完成認定の条件ではない。

よって「V4D自体完成」「AIの独立設計」「Minecraftで使える」「現代世界的建築」という主張を禁止する。現時点の人間ART採用0。プロジェクト全体のART HOLD継続。

## 同じ方針で次に取るべき設計改善

1. **3つの箱を保った局所修理は行わない。** 短いAUTHOR意味IRの制御範囲を、非矩形の主要外郭・大きい欠き取り/開放公共断面・立体的な主従 roof geometry（屋根穴だけでない）へ広げる。頂点列の大量出力や用途別完成テンプレートは不可。
2. 真正ボクセルの**視点を通じて読める負空間**と入口→半屋外→用途空間の支持床と2幅通行を同時に示す、同一V4Dの1件の別案からSOURCE検証。失敗時は無修復HOLD。段状箱の再生産が続くなら再度ART REJECT。
3. 意味のある改善を現物で確認できた場合のみ、異なる作者設計の少数（3方向）を同一コンパイラで比較し、次に必要なら本物Qwen/Gemmaを有限回。新実Qwenを大量消費しない。
4. 8GB Mac向け短いIR、R125→B143→Education本番安定系、旧V1〜V4C、ユーザーprivate Qwen、main保護は不変。Work事前承認制、Draft PR #128継続。

画像は検査中の会話成果物であり、GitHub保存済み原証拠は上記のコード、CIとArtifact。全SOURCE原本は常に再生成可能。正式全視点の建築品質保証やゲーム内歩行の証明ではない。
