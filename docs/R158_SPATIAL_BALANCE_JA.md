# R158：実室の左右幅を用途非依存の意味IRで選ぶ

R139/R155では中央通路・左右の室幅がほぼ固定で用途が異なっても形態が収束しやすい。R158は既存短い建築意図に `spatialBalance:balanced|left-wide|right-wide` を追加し、同じ単発LLM返信から実B143室・通路・扉・設備・屋根を生成する。モデルは座標を出さず、ホストが一貫した3Dに変換する。旧R155/保存Qwenを変更しない。

敷地幅28〜32の時に左右の室幅を2セル分変えられ、それ以下は非対称を選択した場合HOLDにする。成功時の構造・経路検査は実Minecraft歩行や美術PASSを意味しない。R157の1クリックモデル実験は新 `--architecture spatial` を選ぶ。ART HOLD／NOT_PREPARED／9 BLOCKED／空BuildPlan／worldWrites=0／Draft PR #128保護。より自由な間取りは後工程の課題。
