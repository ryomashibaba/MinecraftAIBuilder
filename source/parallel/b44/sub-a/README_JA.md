# MinecraftAIBuilder B44 / SubA: 室内動線統合・壁干渉・D012（非施工）

## 入口

- `circulation-b44a.mjs`：B43/B42/B17/B21を入力とする純粋ローカルグリッド解析。壁所有者→名目部屋ID→近接ドア、L1/D012の分断、6階×2案の入口→全ドア連結性を検査する。Minecraft用の操作・座標・材料は一切出さない。
- `run-offline-b44a.mjs`：B43凍結JSONのSHA256を固定して読み、改変時は例外。引数なしで概要をstdoutに出力する。`--output`はソースツリー**外**の存在しないファイルだけに書く。
- `circulation-b44a.test.mjs`：16件の差分テスト。
- `B44A_CIRCULATION_REVIEW.json`：決定的な非施工デザイン結果（生成済み）。

## メインチャットでの適用（承認ではない）

B43ソースの `source/parallel/b44/sub-a/` に、このフォルダのファイルだけを配置する。他担当フォルダ・凍結manifestを変更しない。

```bash
cd source
node --test parallel/b44/sub-a/circulation-b44a.test.mjs
node parallel/b44/sub-a/run-offline-b44a.mjs
# 任意: ソースツリー外の新規ファイルへ出力
node parallel/b44/sub-a/run-offline-b44a.mjs --output /tmp/B44A_CIRCULATION_REVIEW.json
```

## 判定

B43の上階5フロアは各4壁セル（20合計）が干渉。L1/D012を入口側へ接続する最短候補は11辺・新規廊下6セル・名目壁干渉4セル。各上階9辺・7セル・4干渉と合わせて「短連絡路＋壁再設計」は合計56辺・41セル・24干渉。グラフ上は未承認の施工変更を仮定することで78/78ドア予約への到達が可能になる。

対案「壁を避ける外周迂回」は496辺・新規30セル・壁干渉0だが、外周大迂回と全13ドアへの近接を伴い、実用通路とはみなせない。これも仮定付き78/78である。

**重要：** どちらも物理的通行可能な扉は未証明（`null`）。L1の床マスクはB42の「上階用」床案を代用した**研究用プロキシ**であり、L1の床支持・存在を確定しない。名目部屋IDは壁境界`roomIds`由来であり、部屋ボリューム・必要幅・面積減少は**不明**。すべての変更候補は未適用・未承認。`NOT_PREPARED`、M4 9ゲートBLOCKED、施工操作0件。

## 実装境界

参照するのはB43・B42・B17・B21静的reportのみ（それぞれ実ファイルSHA256で固定）。コードは `source/parallel/b44/sub-a/` に閉じている。SubB, SubC, 実エンジン、建築ブリッジ、実ワールド、Windows実機に接続しない。レポートは代替設計採否の判断材料であり、施工命令に変換することは禁止。
