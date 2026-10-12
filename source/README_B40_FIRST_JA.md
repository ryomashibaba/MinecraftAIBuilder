# B40 最初に読む — スタック階段と床マスクの統合静的監査

1. `../00_START_HERE.md` → `docs/B40_STAIR_CROSSLEVEL_EVIDENCE.md` → `reports/B40_SUMMARY.json` の順に読む。
2. `runner/step8b-crosslevel-stair-b40.mjs` が純粋なローカル監査モジュール。外部API・Bridge・プランナー実行・ワールドアクセスは行わない。
3. `node verify-b40-package.mjs`、`node --test tests/step8b-crosslevel-b40.test.mjs` で再検証する。

成果：B39の44名目経路を7種類の平面経路に集約、全10条件共通3種類を識別。2～6階の床マスクは各階398セルで変化なし、矩形数は各6→7。上階の概念壁・ドア・EV予約・頭上床の静的衝突は0件。ただし実構造・踊り場・階段ブロックの施工・通行性は**一切証明しない**。

禁止：B39以前の原本646ファイル変更、既存建築/Legacy変更、凍結証拠更新、施工承認、実BuildPlan操作生成、新規建築。9ゲートはBLOCKED、状態はNOT_PREPARED。

次はB41として3種類の共通経路について、実Minecraft階段ブロックの幾何（半段など）・踊り場の曲がり・床支持・材料の静的契約を分離して検証する。必要な根拠が不足した場合は止める。ユーザーWindows操作不要。
