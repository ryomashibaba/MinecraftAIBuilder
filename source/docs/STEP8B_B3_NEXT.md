# Step8B/B4 次工程（現状引継ぎ）

1. 最初に `README_FIRST_JA.md`、`docs/STEP8B_B3_GEOMETRY_FINDINGS.md`、`TEST_AND_SAFETY_REPORT.md` を読む。
2. B3で実装した8形状・4方位・seed/style変化の**純粋な非施工プレビュー**を再利用。B2の静的監査を破棄しない。
3. 次の検証優先度: 実行中Windowsプロセスとスナップショットの版照合が安全な read-only 情報だけで成立するか調査。材料・ブロック状態は、既存の過去PASSと現在の検証条件を混同しない。`createBuildingPlan` や `/plan/building` も本段階では**呼び出し禁止**。
4. 施工ワールドや Legacy・凍結証拠は絶対変更禁止。現場スキャンや建築、Bridgeコマンド、パック生成は未承認。
5. 品質維持と高速化: 大きな工程計画は保持、1回の実装は小～中規模に限定。差分QA＋安全否定ケースで効率を上げ、ユーザーWindows操作は避け、必要なら事前検査を固めてワンパスに集約。
6. `NOT PREPARED`; outputs have no executable operations, no world anchor, no actual block IDs. Windows元ソーススナップショットZIPは意図的に非同梱。再検査が必要なときだけ別途添付依頼。
