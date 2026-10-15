# B116 — 15棟の幅2廊下と局所3D代理モデルの独立監査

B115の11件の2D候補について、B114資料を固定ハッシュで確認し、B113参照モデル、B104の元床マスク、B105の構造・家具代理ボクセル、移動階段の踏み面AABBを別工程で再生成して照合する。

- 元の階段、部屋、コア、床、廊下は書き換えない。位置は**世界座標ではなく局所設計座標**。
- 概念床マスク上の幅2通路、2ブロックの頭上空間、B105静的代理形状、B114仮想床開口、B114仮想階段踏み面を判定する。
- 競合時は `DESIGN_REVIEW_REQUIRED` として問題の種類と位置を記録する。0件でも `NO_CONFLICT_IN_SCOPED_SOURCE_PROXIES` と呼び、実Minecraftの歩行を認証しない。
- 全階段の床開口・支持ピア、室内仕上げ壁・新しい外装、Bedrockの階段と扉のBlockState、実際のプレイヤー当たり判定は**未検証**。
- NOT_PREPARED、9ゲートBLOCKED、worldContacts=0、BuildPlan.operations=[]、旧296未承認・18室HOLDを維持。
- Github Actionsが完走するまでは統合PASSと呼ばない。B114・B115・mainは不変。Draft PRのみ。
