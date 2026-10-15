# B133 — 隔離ワールド向け読み取り専用階段BlockStateプローブ

## B132からの最短の前進

B132はWindows上で8枠のオフライン観察記録を入力できたが、Minecraft Educationで実際に状態値をどう確認するかを示せなかった。

B133はゲームへの接続・施工を一切実装せず、既存のWindows配布キットに1回起動のSTART_B133_READONLY_PROBE.cmdを加える。対象座標を1回入力すると、/testforblockの4つの候補コマンドを表示する。ゲーム内での実行・目視・画面撮影は人間が別途承認された独立検証ワールドで行う。4件のうち厳密に1件の一致を確認した場合だけ、既存B130のREADBACK記録ウィザードへ進める。

**Minecraft Education実機での構文動作はまだ確認していない。** B133のCIは生成された文字列とWindows CMD起動だけを検証する。コマンドが動かない・一致しない・複数が一致する場合、状態値は不明のまま。値0をデフォルトで採用してはいけない。

### 技術根拠（外部資料）

- [Microsoft Learn: testforblock](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/commandsreference/examples/commands/testforblock?view=minecraft-bedrock-stable): BlockState条件を受け取る読み取り専用コマンド。
- [Microsoft Learn: Default Block Listings](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/vanillalistingsreference/blocks?view=minecraft-bedrock-stable): minecraft:oak_stairsにはweirdo_directionが存在。
- [Microsoft Learn: Block State List](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockstateandtraitlistings?view=minecraft-bedrock-stable): weirdo_directionは整数0〜3。
- これはBedrock系の公開資料であり、個別のEducation版で4条件が期待どおりの判定になることを保証しない。

## 実機試験に必要な作業（この工程では未実施）

1. **実施前にユーザー承認**。対象は本番とは完全に異なる独立ワールドであり、15棟・66階床・102階段のモデルには触れない。
2. Minecraft Educationで別のクリエイティブ検証ワールドを用意し、必要なチート/コマンド権限を設定。孤立した通常のオーク階段1つを手動で置き、上り方向（EAST/NORTH/WEST/SOUTH）とXYZ座標を確認。
3. Windows配布物を展開し、START_B133_READONLY_PROBE.cmdを一度ダブルクリック。座標を入力。
4. 生成された4本の/testforblock x y z minecraft:oak_stairs ["weirdo_direction" = N]を手動でゲーム内へ入力。構文エラー・0件一致・2件以上一致はHOLD。4通りのテストが正常に評価でき、1つだけ一致した状態値と実際に見た形状を控える。
5. ゲームのスクリーンショットを自身で保存し、B133に戻ってYESで既存B130記録を開く。観察しなければQで終了し、空欄のままにする。
6. 2ラウンド×4方位の8観察枠は、各方位で60秒以上の間隔を空ける。画像・版・時刻・観察形状を記録。これらはあくまで本人申告であり独立認証ではない。
7. 当たり判定と階段走行は**未検証の別課題**。実際の通行が行えたという判定は本工程で絶対に作らない。

## 安全・成果物

- B132の9ファイルのソースハッシュはそのまま検査し、追加B133モジュールにもSHA256ピンを付与。
- B132の正当に更新される受付JSONを旧ハッシュと無理に照合しない。
- 機器認証、実機読み取り確認、実際の通行確認が行えたと扱わない。
- 15棟・66階床・102階段／元の9出口HOLD／施工ゲート9件BLOCKED／readiness=NOT_PREPARED／BuildPlan.operations=[]／worldContacts=0。
- mainへはマージしない。独立世界を作成する・コマンドを送る・実際の施工を行う操作は、別途ユーザー承認まで実施しない。

## 次工程

B133のWindows配布物を使い、まず**1つの承認済みテスト階段**で/testforblock構文が利用可能か・4値から一意の結果が得られるかを実機確認。失敗したら実機の版番号とゲームメッセージをもとに読み取り方法を再設計。成功したら残りの方位・繰り返し観察へ進み、独立した歩行と衝突確認を別の実機検証工程で扱う。
