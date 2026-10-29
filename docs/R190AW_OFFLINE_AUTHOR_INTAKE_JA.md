# R190-AW — 保存済み原回答のローカル・無改変B143監査

## 目的
R190-AVのWindows/Ubuntu CI 2/2成功。真正B143は旧AU 12,687セル、新AV 10,602/10,122セル、全3案に開放空庭168列、2幅横断動線、地盤連結がある。一方、実3Dでは大きな無地板と孤立して見える屋根斜材が残る。**AIモデルが独創的な建築を生んだ証拠ではない**。合成案の量産ではなく、今後保存される作者の原回答の直接審査へ移行する。

## 実装
scripts/r190aw-preserved-architect-intake.mjs は既存の2つの独立UTF-8ローカルファイル（モデル回答の原文、ユーザーの元ブリーフ）を読み、各バイト・SHA256を記録する。モデル呼び出し、ネットワーク、世界接触は一切ない。入力を改変せず、新しい出力フォルダへコピーする。過去の失敗を勝手に成功へ変更しない。

受け入れる設計IR：
- **生B143**（minecraftaibuilder-b143-building-dsl-v1）。建築類型、空庭有無、部屋数を固定しない。box/ellipsoid/cylinder/torus/beam/staircase とSOURCE CUTを作者が自由に指定。B143の厳密な文法・実CUTの削除効果・浮遊していないかを検査。用途、実歩行、屋根性能はNOT_TESTED。**美術PASSではない**。
- **AQ**。開放中庭と低層の2幅動線を必須とする限定研究IR。すべての自由建築を表せない。
- **AS/AT/AU**。作者が支持部材の対応、屋根のある機能空間、通り抜ける大空洞を特定した場合に厳格なSOURCE検証を行う。ホストが正解の部材を推測・追加しない。

成功した場合に五方向SVG、真正B143 3D HTML、ソースJSON、元の回答と依頼文のバイト一致コピー、SOURCEレシート（REVIEW.json）を新規ローカルフォルダへ保存する。拒否した場合はHOLDレシートと元文だけ、見せかけの3Dは出さない。任意で期待SHAを指定して一致しなければ出力前に停止する。元ファイルの作者が本当に特定のモデルだったかは証明できず、actuallyModelGenerated=NOT_ESTABLISHED のまま。

## 利用（以前に保存済みの原回答がある場合のみ）

ファイル MODEL_RESPONSE_ORIGINAL.txt と USER_BRIEF_ORIGINAL.txt を別々に保存した上で：

    node scripts/r190aw-preserved-architect-intake.mjs --response "C:\SAVED\MODEL_RESPONSE_ORIGINAL.txt" --brief "C:\SAVED\USER_BRIEF_ORIGINAL.txt" --out "C:\SAVED\new-review"

事前SHAが独立に確定している場合のみ、末尾に --expected-sha 64桁のハッシュ を追加。原回答やユーザーのブリーフを公開CI/PRへアップロードしてはならない。現段階では**新しいモデル推論を自動実行しない**。モデル生成を試す場合は別承認が必要。

生B143は最大128×96×128（境界体積500,000以下）、160部材、160,000占有セルという局所ボクセルの表現であり、自由曲面の連続メッシュ、大規模都市、構造工学、実Minecraft歩行、使用感、美術を網羅しない。元日本語要求を満たしたかも別途人間が審査する。固定の建物テンプレートや自動補修は採用しない。

## 安全
NOT_PREPARED、9 BLOCKED、BuildPlan.operations空、worldContacts/worldWrites=0、modelCalls=0、ART_HOLD、正式美術採用0件。Draft PR #128 OPEN・未マージ。CIは合成モデル回答だけを使用し実ユーザーの原文は使わない。
