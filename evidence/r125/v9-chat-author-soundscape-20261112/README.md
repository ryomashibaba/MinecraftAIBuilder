# V9 チャットAI独立原案 — サウンドスケープ資料館

このチャットAIが著作したV6原案。ローカルQwenの回答・既存fixture・PRIVATE設計を転用していない。出所は自己申告で、第三者によるモデル認証ではない。ローカルQwenの完全V6 SOURCE成功として数えない。

`ORIGINAL_V6.json` → 既存 `materializeV4JParentIndexAuthor` → 共通 `compileCivicArcadeAuthorIntent` → `TRUE_B143_PRODUCT.json`。原文無補修。`B143_DESIGN.json` は同一productのdesign抽出。独立Python再構築では7,926セルの形状・材料・layer・SHAが一致し、外部入口から5用途ゾーン・6サービス面への2幅／3空気セルのSOURCE動線を確認した。実ゲームの衝突物理・音響・設備操作・構造設計・正式QAの代替ではない。

人間は実形状の外観・内部画像を見て **「試験施工候補として採用」** と回答した。`HUMAN_ART_ACCEPTANCE.json` が同一SOURCE／geometry SHAに拘束する。元の生成物に残る `NOT_REVIEWED` / `ART_HOLD` は生成時点の記録として保存し、上書きしない。この採用はMinecraft書き込み承認ではない。

## 試験施工パケット（未実行）

- Computer Useで既存アプリを起動し、タイトル画面 **v26.33** を視認。ワールド未入場。
- 既存v26.33申告済みパレットを使用。stone 3,490 / iron_block 2,744 / oak_planks 1,512 / glass 180。素材の黙示置換なし。表示用3Dの金属色とゲーム内iron_blockの色は異なる。
- 外接範囲61×31×57、184直方体Keep配置。原SOURCEを[-17,-1,-32]だけ平行移動し、最低層を足元へ合わせる。mabsetの位置からX+8..+68、Y+0..+30、Z+8..+64。試験敷地として外接範囲全体を確保する。
- 明示選択した柱状検査は地面から各列最上セルまで（内部空洞を含む）24,734空気セル＋2,072支持セル。未使用列・屋根上の空気は対象外。40,000空気セル上限を維持。すべて検査してから配置する。
- 新規の専用平坦試験ワールドとそのバックアップが必要。実world ID・敷地・バックアップ・復元・Static TypeScriptコンパイル・所要時間は未確認。自動rollbackなし。異常時はCode Builderの停止操作を使い、部分施工から再実行せずバックアップへ戻す。協調停止の実機保証はない。
- **書き込み未承認／未実行**。独立9ゲートBLOCKED・空BuildPlanを維持。SOURCE、素材既往証拠、人間ART、今回の実機施工を区別する。

再生成（リポジトリroot、存在しないローカル出力先を指定）：

```powershell
node scripts/r125-export-education-pilot.mjs --design evidence/r125/v9-chat-author-soundscape-20261112/B143_DESIGN.json --palette configs/r125-education-verified-palette-v26.33.json --placement grounded-source-footprint --out <FRESH_LOCAL_OUTPUT_DIR>
python evidence/r125/v9-chat-author-soundscape-20261112/independent_source_qa.py
python evidence/r125/v9-chat-author-soundscape-20261112/independent_education_packet_qa.py
```

スクリプト生成・オフライン監査の成功は試験施工の実行許可・完了を意味しない。
