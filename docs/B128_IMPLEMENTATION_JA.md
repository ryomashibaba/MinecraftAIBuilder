# B128 — Minecraft Education階段Readback記録の安全な受付・整合性検証

## 目的

B127は半段階段の設計代理形状40サンプルを照合し、BlockState値と実機上昇方向との対応を24通りの未認証候補として残した。B128は将来、**独立した実機校正で取得した観察を申告形式で受け取り**、B127の元データと矛盾しないかをオフラインで検証する。今回はWindowsやMinecraft Educationへの接続・配置・実測は**行わない**。

## 追加機能

- B127 reportのSHA256ハッシュと一致するものだけを入力対象とする。1バッチ16記録まで、各記録4観察まで。
- editionはMinecraft Educationのみ、バージョンは明示、specimenScopeはISOLATED_NON_PRODUCTIONのみを受理する。
- weirdo_direction=0〜3、上り方向EAST/NORTH/WEST/SOUTH、前半段・後半段の観察、および画像を識別するSHA256文字列を厳格に検証。
- 重複記録・画像ハッシュの使い回し・矛盾した方位対応・別バージョン混入・実世界座標やコマンドの埋め込みを拒否する。
- 記録が0件なら未校正の24通りをそのまま出力。1方向の申告なら候補6通り、4方向の申告なら形式上1通りまで絞れる。ただし**単なる申告と整合する候補**であり実機認証ではない。
- B128_Empty_Receipt_Template.jsonにはデータを捏造せず空のreceiptsを記載する。
- 保存前に全15棟・66階・102階段およびB127/B126証拠チェーン、9件の施工禁止ゲートを検証する。

## 記録の構造

最上位はschema, sourceB127Integrity, receiptsだけ。receiptはreceiptId (例: LAB-OBS-001), sourceB127Integrity, edition, version, specimenScope, observedAt (UTC ISO8601), observationsを持つ。観察はstateValue, observedAscent, observedUpperHalfShape, readbackClaimed=true, evidenceSha256, traversalClaimを持つ。

本工程は実際のreadbackを取得しない。ファイル入力は明示的に与えられたJSONに限定し、32 KiB以下とする。記録は未認証の人間申告扱いで、画像SHA256の真正性や画像内容も検査しない。実際の環境を偽装できないという保証はない。

## 施工禁止と未認証

実機接続や配置はゼロ。生成するoperations=[]、worldCoordinates=null、worldContacts=0、BuildPlan.operations=[]、readiness=NOT_PREPARED、9件のBLOCKEDを維持する。BlockStateに関するバージョンごとの実際の受付、物理当たり判定、踏面通行、ドア、上階床の支持力、建築施工可能性はすべて未認証。

次段階は、安全な独立試験と明確な利用者の許可によって観察を得たうえで、記録の画像・ログ真正性を別途検証すること。B128はその試験を自動で開始しない。
