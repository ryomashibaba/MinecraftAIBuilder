# B126 — Minecraft Education階段のBlockState候補と上階床整合性

起点はB125 Draft PR #29、HEAD d7596287f36d3ec6109c8d0d6bd4be444915f6f2。15棟、66階、102階段の原台帳を維持し、唯一の限定3D設計候補を対象に階段ブロックの設計上の配置整合性を調べる。

## 実装内容

- ストレート半段モデルは5段×2レーン、設計ローカルの10候補セルをB114の回転規則から導く。
- generic Bedrockに実在するminecraft:oak_stairsとweirdo_direction候補0/1/2/3、upside_down_bit=falseを候補メタデータに記録する。
- 設計上の上階床セルと階段候補ブロックが同居する場所を判定し、B125の8セル仮想開口に含まれない重なりを衝突としてカウントする。
- 元B105ソースボクセルと新階段候補が重なるセル、保護元廊下・B113修復廊下・保護室・着地点を切る仮想床開口はすべてHOLDとして座標付きで出力する。
- 折返し階段に対しては、向きやコーナー状態、踊り場の詳細が未確定なので勝手なBlockState割当てをせず明示的なHOLDにする。
- 9件の独立テストと5件の全棟検証、元のB114-B125生成と凍結ファイル整合性をCIで実行し、JSON・CSV・日本語レビューを保存する。

## 事実の根拠

Microsoft Learn、Bedrock vanilla block一覧: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/vanillalistingsreference/blocks?view=minecraft-bedrock-stable
Microsoft Learn、Aux値からBlockStateへの表: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/auxvaluetoblockstatemap?view=minecraft-bedrock-stable
Microsoft Learn、setblockの任意BlockState指定: https://learn.microsoft.com/en-us/minecraft/creator/commands/commands/setblock?view=minecraft-bedrock-stable

以上はBedrock一般資料。Minecraft Education 1.26.32.0における実機BlockState受付・weirdo_directionと設計上の上り方向の対応・自動corner・当たり判定は別途実機検証が必要であり、同一だと断定しない。

## 施工禁止ゲート

NOT_PREPARED。原9件すべてBLOCKED、BuildPlan.operations=[]、worldContacts=0、実世界座標なし。出力するセルは設計ローカルであり施工命令ではない。元mainや既存PRの変更・マージなし。

## 次工程

BlockState候補の実機校正方法と、今回見つかった上階床の非承認重なりやB105ソースとの競合解決案を、独立した計画として確定する。安全な1領域の実施工は現時点では未承認。