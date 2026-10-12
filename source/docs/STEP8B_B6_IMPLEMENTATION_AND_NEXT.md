# Step 8B/B5.1～B5.6 まとめて実装・回帰QA（2026-10-10）

## 施工禁止・継承原則
- 既存の建築・Legacy・凍結証拠・以前のWindowsスナップショットは**全て読み取り専用**。元ZIPには書き戻していない。
- BuildPlanは常に`{status:"NOT_PREPARED",operations:[],commandCount:0}`。
- Minecraft、Bridge、ビルダー、実プランナーの実行、ワールドスキャン、実ブロックIDの選択は行わない。
- 今回の「静的プランナー契約」と「実プランナー稼働証明」は別物。後者は引き続き未証明。

## B5.1: ソース固定のPlanner契約検査
249ファイルの元WindowsソースインベントリをSHA-256で確認。プランナー、建築文法、座標系の3主要ソースをbyte単位でpin。入口条件、床ごとのunion footprint、回転、材料オプトイン、実施工プラン検証等のコード断片が想定どおり存在することを確認。静的解析のみで生ソースはimportしない。

## B5.2: 出入口・形状・方位の静的互換性
B3の288ケースのvariation・面積・geometryDigestを再計算。一方、「入口が作れるか」は従来未検証だったため、`edges(masks[0])`の北向き露出部分から、`e.end-e.start>=entranceWidth+1`の候補を独立に再現。ホテルの入口幅5に対し、必要連続run長は最低7。

追加1,728ケース＝6寸法(15×12,15×20,16×16,24×20,48×12,48×40)×8形状×4方位×3seed(0,1,5)×3style(modern,urban_japanese,traditional)。**全1,728条件について面積保存はPASS**。うち36件がホテルで実際に登録されている`U_shape`において正面壁幅不足と静的予測。

例: U_shape、幅15、奥行20、6階、urban_japanese、seed=1では必要7セルに対し最長露出run5セル。`createBuildingPlan`実行や生成プランの採取は未実施なので「実機で36件失敗した」という主張はできない。

現行サンプルホテル1、集合住宅1、オフィス3の合計5候補は、静的な入口幅条件のみは満足。オフィスのcandidate-02は概念設計との占有セル差分123セル(1–5階22ずつ、6階13)が残り、未修正。

## B5.3: 材料切替・座標の証拠境界
- `materialPipeline`未指定時はソース上の`legacy`。`phase6c`は明示指定の際のみ。
- `phase6c`実行には検証済みexact assignmentとruntime/command適合の証拠が必要だが今回は呼び出さず、ID/状態を確定していない。
- `rotatePlanPoint`は局所形状回転、`rotateLocal`は世界方位に関係する別契約。二者の一致やMinecraftでのワールド座標・anchorは未証明。

## B5.4: Windows監査ログのトリアージ
- B4.1: Node4件、稼働中エンジン不明。
- B4.2: Node0件、process/listener queryはいずれも成功。ただしPORT queryの成功は待受の存在を保証しない。
- 故障・停止原因・実装不一致と断定しない。エンジン同一性はNOT_PROVEN、再起動指示もない。

## B5.5/B5.6: 異常系QA・非施工代替案
- 異常系: スナップショット改変、候補削除、承認フラグ偽装、B3ハッシュ改変、ポート取得不整合、HTML危険な入力、CLI出力上書き拒否など。
- U字型の狭いホテル案には、**プレビューとしてのみ**敷地幅拡大、スタイル変更、massing変更の候補を提案。元の設計、World、BuildPlanを一切変更しない。
- 例の15×20 U字型/urban_japanese/seed=1のプレビュー対案は、幅19に広げる／`modern`スタイル／`stepped`形状等。施工可能性、ドアや構造の完全QAを保証しない。

## QAと品質限界
**190/190 PASS, fail=0, skip=0** (Node.js v22.16.0 / Linux offline、並列2で実施)。Step8A系80件、B0～B5のStep8B系93件、新規B6系17件。Windows実機で190件を実行したわけではない。スナップショット対象249ソースとB4.1/B4.2のWindowsログをオフライン参照した結果。

## 再現手順（ユーザーのWindows操作は不要）

原本のWindowsSourceSnapshotを安全に展開したディレクトリと、B4.1 / B4.2の原本JSONが必要。コードは原本に書き戻さない。書込先は**新規ディレクトリ**のみ。

```bash
export STEP8B_SOURCE_DIR=/path/to/verified-windows-snapshot
export STEP8B_LATEST_EVIDENCE=/path/to/B42-runtime-evidence.json
node --test --test-concurrency=2 tests/*.test.mjs
node tools/RUN_B6_OFFLINE.mjs "$STEP8B_SOURCE_DIR" /path/to/B4.1-runtime-evidence.json "$STEP8B_LATEST_EVIDENCE" /path/to/new-and-nonexisting-output-dir
node verify-package.mjs
```

## 次工程候補（施工HOLD）
1. 狭いU字型ホテルの入口プレビュー候補を、厳密な面積・露出壁幅条件を維持した範囲で改善。自動施工や自動スタイル変更は禁止。
2. オフィス非対称candidate-02の視覚レビューとの差分123セルをプレビューアダプターで吸収し、concept/engine-source-previewの二層表示を統一。
3. 将来のWindows読み取り専用ランタイム識別は、エンジンが実際に動いている必要性が明確になってから1回にまとめる。ユーザーの無用な再起動・再採取は不要。
4. 材料ID/ワールド・権限/スキャン・内装安全・ユーザー承認7ゲートは依然BLOCKED。新規施工はユーザーの明示承認まで完全HOLD。
