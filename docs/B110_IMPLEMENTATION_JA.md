# B110 — 施工可能な建物に向けたオフラインインターフェース設計

## 背景・目的

B109までで15案の外観と閲覧機能が改善したものの、ドア、階段、家具は「概念的な形」を置いているだけだった。B110では実Minecraft Educationで利用できる建物への移行を見据え、B104の間取り/B103の動線/B105の局所3D構造を起点として**施工可能性を調べるための機能インターフェース仕様**を生成する。認証なしで「完成」と主張しない。

## 実装

- **参照用の9ブロック役割辞書**: oak_door（上下・向き・ヒンジ・開閉）、oak_stairs（向き・上下・角）、oak_planks、glass、bed、bookshelves、deskの材料代理、chairの材料代理、barrel。それぞれブロック名とState名だけを登録し、状態値・施工順・実機適合は一切認証しない。
- **279室分の室内ドア候補**: B104のconceptualDoorOpeningのローカル座標で上下2セルの開口・隣接2セル・B103の廊下接続を検査。
- **地上外部開口の候補**: B103の幅2候補に対応するB105の2段空気セルの存在と廊下接続を確認。実ドア設置不可・避難認証不可を維持。
- **102階段コア接続候補と612概念踏み面**: 元の3×3コア内に限定し、B105の屋根・外壁・家具との衝突、概念接合位置、頭上2セルの局所データを確認。実プレイヤーが登れる形状やheadroomの認証ではない。
- **558家具アンカー**: B105の既存セルを保持し、室目的ごとに寝具・収納・執務・座席などの候補を付与。ベッドは近接2セル候補を監査し、実際に2ブロックのベッドを置いたとは扱わない。
- **15案共通レポート／詳細JSON／日本語チェック表**: GitHub Actions Artifactsから参照。30件追加の退行・整合性テスト、安全ゲート。

## ブロック資料と注意点

1. Bedrockブロック公式資料: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/vanillalistingsreference/blocks?view=minecraft-bedrock-stable
2. Bedrock組み込みBlockState一覧: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/intrinsicblockstateslist?view=minecraft-bedrock-stable
3. Minecraft Education公式更新記録: https://edusupport.minecraft.net/hc/en-us/articles/360047556451-Minecraft-Education-Change-Log

**Bedrock公開資料≠対象Minecraft Education版での実機互換性。**
Education公式記録には26.32などの表記もあるが、利用者ローカル環境の実バージョンは確認していない。B110の参照対象はユーザー指定の「26.3」系に留め、検証済みEducation BlockStateは引き続き0件。資料掲載と、設置・動作・制御可能なState値の認証を混同しない。

## 今後の進行

- **B111**: 施工ではなく、実用的な内部形状の改善と各種レイアウト失敗ケースの是正。室内設備の占有セルやクリアランスのオフライン適合率を高める。
- **B112**: ローカルWork利用前の統合監査と安全な引き継ぎ準備。終了時に「次のB113ではローカルWorkを使う」と明示し、リポジトリSHA・チェック項目・禁止事項をまとめる。
- **B113（Work）**: ローカルMinecraftAIBuilderプロジェクト・Minecraft Education実機・ログへのアクセス可否を確認後、明示的に許可された範囲で互換性調査。無承認のゲーム接続・施工は禁止。

## 保持する重要な安全状態

B100～B109・凍結原本は変更しない。旧296未承認、18保留のまま。readiness=NOT_PREPARED、constructionApproved=false、executionAllowed=false、9ゲートすべてBLOCKED、BuildPlan.operations=[]、commandCount=0、worldCoordinates=null、worldContacts=0。実Minecraftワールド操作0。
