# B129 — 教育版階段の最小反復校正パケット（世界への操作なし）

この工程はB128 Draft PR #32 (`828b86f92edbe3e94dc4061ae52f0ce72f885c31`)からの追加差分。main、先行Draft PR、原設計は不変。実機操作やMinecraft worldへの接続、ブロック設置、施工命令を一切行わない。

## B128からの実質的な進展

B127で元の5段×2幅・40点サンプルと一致した設計代理の階段上半形状を元に、Minecraft EducationでのBlockState方向実験に必要な8件の観察枠を自動生成する。これまでの単なる値申告から、**2独立ラウンド×4方向・時刻間隔・踏面の観察一致**を確認できるようにした。

1. 実験枠 LAB-R1-EAST, NORTH, WEST, SOUTH と LAB-R2-EAST, NORTH, WEST, SOUTH を作成。
2. それぞれMinecraft Education版、UTC実施時刻、readbackされた状態値0〜3、実物の前後半踏面形状、固有の画像またはその他根拠データのSHA256を記録する設計。実際のデータは今回はゼロ。
3. B128の強制スキーマ検査により、別バージョン混入・重複ハッシュ・矛盾した上昇方向・実世界座標・コマンド混入を拒否。
4. 各方角のラウンド2がラウンド1の少なくとも60秒後であること、申告された踏面が元の設計代理形状と一致することを確認。欠落・前後逆・未観察をHOLDとして扱う。
5. 8件の値が揃いすべて申告上の整合性を満たしても結論は **READY_FOR_INDEPENDENT_MANUAL_EVIDENCE_REVIEW_NOT_CERTIFIED**。実機のBlockState確定、画像の真正性、通行検証、実施工承認にはならない。
6. 単なる人の申告で実機証拠があるように見せないよう、CIでは空の受付ファイルと未実施の日本語観察票を出力する。

## 出力

- B129_Isolated_Calibration_Protocol.json：八観察枠とプロトコルSHA256。
- B129_Manual_Calibration_Worksheet_JA.md：Windows実験時に必要な記録項目。ゲーム操作コマンドは含まない。
- B129_Empty_Receipt_Batch.json：B127参照ハッシュだけを記載し、receipts=[]。
- B129_Repeatability_Gate_Offline_Report.json：15棟102階段66階の原台帳、未実施枠、方向候補、安全状態。

## 実機に進むための境界

この段階で新しいMinecraftの操作を利用者に要求しない。将来の独立検証ワールドで行う実験は、明確な利用者承認、対象領域、手動操作、観察の真正性の別確認を必要とする。実験によって通行可能性や実素材の支持条件まで確認されたことにはならない。

**安全状態：NOT_PREPARED、9ゲートBLOCKED、BuildPlan.operations=[]、worldContacts=0、main未マージ。**