# R190-CD — 自由設計を優先する独立品質ゲート／過去失敗を負例にする研究

2026-10-31 JST／対象 `ryomashibaba/MinecraftAIBuilder` Draft PR #128。
**目的：建築が作れる新SOURCE形式を追加することではない。設計者（将来は実モデル）が自主決定した建築案を、本人の形状と原本のまま厳密に見抜き、不適合を早く止めること。**

## 出発点と変更してはいけない既判定
- R190-BMのQwen3:14b A/B原回答は実モデル1回ずつ、厳密B143 0/2。再生成や無断補修を行わない。
- R190-BOは任意の日本語自然文をlocal Qwen/Gemmaへ渡すSpatial Assembly＋native JSON Schema＋一回POST承認を既に実装。今回のCDでは**新しい推論をしない**。BOをモデル汎用自由設計の正規入口として保持し、CDはその最終物理成果を監査できる純粋なモデル非依存モジュールにする。
- R190-BQは真正B143最終セルの空間／原依頼の独立監査。R190-BVは2×2足元・高さ2/3セル・上下差±1の保守的到達代理。両方を置換せず、CDではCCの保存済み原本／実voxelを対象に**入口の存在・外部からの空気開口・各用途の真正支持床と空気・入口からの幅2経路・設計者指定階段の遷移差**を横断して検査。
- CCの3D SOURCEはWindows/Ubuntu両SUCCESSであったがA/BともART REJECT。特に上層レストランの支持床＋頭上3セル空間26/292＝8.9％、Bの上層オフィス17/264＝6.4％、機能はREJECT。新CDでこの事実を書き換えず負例として使用。
- BY→CCで共通した失敗：SOURCEの形状表現力（巨大側壁・板・双塔・多角塔・有機塊）向上が、建築としての魅力・公共入口・用途の成立・実モデルの自由設計成功に繋がらなかった。

## 追加する独立審査
`source/ai/r190cd-integrated-quality-gate.mjs` は**入力された最終voxelを読み取り専用で監査する**。箱も階段も床も外殻も生成しない。入口が不明なら`MISSING_AUTHOR_ENTRANCE`で止める。最終voxel SHAが合わなければ拒否。

1. **来歴**：指定元原文bytes SHA、真正最終voxel geometry SHAを別々に照合。ChatGPT作者研究例、実モデルの原文、合成fixtureを同一の証拠出所と扱わない。CCは凍結BM/CB SHA固定参照で保存済みのCC A/Bを再コンパイルして入力し、新たな建物作成ではない。
2. **玄関**：作者が明示した入口候補がない場合は無いと記録し、自動入口追加をしない。作者入口がある場合は2×2支持足元＋3セル頭上空間を実セルで測る。外部からその高度に横方向の2×2×3空気経路があるかも、境界からの別の2Dフラッドフィルで検証する。**外からの地面連続・屋外ブロック・ドア動作等は未試験**。
3. **用途**：ユーザーの自由文とは別に保存されている設計者指定の各用途領域・床Y・ポリゴンを使用。該当用途の実支持床、3セル空間、2×2立脚可、入口からの保守的到達を数える。「レストラン」というラベルは室内機能を証明しない。
4. **経路**：作者指定のCB 267経路点を変更せず、別途R190-BV系の保守的移動`水平1セル・上/下1セル`と照合し、`横2セルで高さ+1`のCB作者研究経路を**そのままMinecraftで歩ける証拠に転用しない**。回避策のホスト自動生成はしない。
5. **主形状／美術**：最終実ボクセル外接範囲など客観データを記録するが、**芸術性・独創性を機械的にPASSにしない**。人間が真正3D/8視点を確認したCCのART REJECTを維持。
6. **安全**：結果に`NOT_PREPARED`／9 `BLOCKED`／`BuildPlan.operations=[]`／`worldContacts=worldWrites=0`／正式ART採用0を明示。数学的代理モデルの合格と実Minecraft歩行・構造認証を厳格に分離。

## オフラインの比較・検証設計
`scripts/r190cd-review.mjs`: CC凍結A/Bを同一ソースで再生成した真正voxel（以前のPR源）を読む。外部入口はCC原本に**書かれていない**ため、入口`[]`として負例評価する。CCの作者でない階段を勝手に推定しない。

`scripts/r190cd-integrated-quality.test.mjs`: 幅2床と実外部水平空気の人工**正制御**、入口未指定、壁で閉ざされた入口、別階の未接続用途、モデルで申告された2セル斜行階段、SHA改変・最終セル重複を負例で検査。これは実Qwen/Gemmaの成功ではない。

`scripts/r190cd-independent-verify.py`: stdlib Pythonで最終voxelを独立に読み、SHA・各用途の「支持床／頭上3セル／2×2候補」の全セルと、CBルート遷移の数を別実装で再集計。**入口0のまま保守的な上階到達を成功扱いしていないこと**も検証。

`.github/workflows/r190cd-integrated-gate.yml`: Windows/Ubuntu、Node24、Python3.13、ネットワーク通信拒否のテスト・SOURCE再コンパイル・CD研究・独立監査、旧CC原本とCD scorecardをartifactに保存。結果がSUCCESSであっても「**失敗した建築を正しく不採用にできた**」証拠であり建築ART PASSではない。

## 次に本当の自由設計へ進むための条件
- BOの任意日本語原文・厳密モデル原回答・3D派生・原本SHAを保つこと。今後個別承認でQwen/Gemmaの実回答ができた場合のみ同じCD監査に入力する。unknown briefに高層ビル用途の定型を勝手に割り当てず、依頼側／設計者側の意図を独立人間審査する。
- 実ユーザーの元依頼に対し、作者ではなく**モデルが実際に自由な設計案を出し、無修理の真正3Dが成立**することが必要。modelCalls=0の今回工程では何ができたかを取り違えない。
- 建築ARTを次の階層へ上げるためには、同じ設計案を8方向の視認で審査し、斜め・側面・内部を含めて新たな構想の魅力が明確であること。単純塊を反復して施工・パッチで救済しない。
- **この工程自体はSOURCE表現の技術勝負を続けるより、失敗の再発を防ぐ「モデル設計→物理的正しさ→美術」を一本につなぐ品質契約の整備。** 機能や施工の本当のPASSではない。

## 不変ルール
`main`・全BM/BY/BZ/CA/CB/CC原本は無変更。Draft PR #128を維持。外注なし。新Qwen/Gemma実POSTはBO exact SHA/UUIDに結び付けた個別承認なしに実施しない。ワールド・Minecraft接触0。設計SOURCEの勝手な構造修復・汎用要求の固定カテゴリ化は禁止。

## 追加：本来のAI自由設計への接続（BN/BO read-only adapter）

`source/ai/r190cd-bn-adapter.mjs` は`compileR190BNAssembly`の元Spatial Assemblyと既存真正B143結果を変えずに、`levels`→立脚Y、`spaces`→モデル指定空間ポリゴン、`entrance`→**モデルが本当に提示した入口**を品質ゲートへ接続する。異なる用途を固定の高層ビルテンプレートへ押し込まず、元の目的名・階と床の高さを保存。CBの階段ノード267点はこのBN/BO経路へ自動生成しない。BN作者が指定した`flight`の個数は記録するが、完成した通行ルートへ水増ししない。

重要：**B143の幾何ハッシュは`SHA256(JSON.stringify({design,primitives}))`であり、CCの幾何ハッシュは`SHA256(JSON.stringify(primitives))`**。両方を同じと偽装するとBNの正しい真正元回答を誤拒否する。CDはそれぞれのハッシュ規則を独立検証し、B143では元の`verifyCompiled`を先に再実行。分析用のボクセル単独SHAを別記録する。BNの立脚Y=1に対応する床の高さY=0や、境界に接する作者領域も検査可能にした。モデルの目的説明文最大250文字を勝手に切らない。

新しい`scripts/r190cd-bn.test.mjs`は旧BNの「下階展示＋上階閲覧」と「横長公共コンコース」という**2つの異なる合成作者入力**を実際にBN/B143へ再コンパイルしてCDで監査する。原本置換・設計/依頼SHA改変・最終セル改変は負例として拒否。これらは`SYNTHETIC_TEST_FIXTURE`で、AIが未知の依頼を自律設計した成功ではない。旧BOの利用承認ガード・既存実行入口・SOURCE pins・ネットワークAPIは改変しない。新CD専用CIで既存のCC不採用2案と併せて独立検査する。

---

## オフライン一括実行入口（モデル送信0）

`scripts/r190cd-offline-raw-review.mjs` を追加。保存済みの作者/モデル候補原文と任意の日本語依頼ファイルを**変更せず**受け、BN厳密コンパイラ→独立B143原本再検証→CD品質監査を1コマンドで実行する。

```powershell
node scripts/r190cd-offline-raw-review.mjs --brief ORIGINAL_BRIEF.txt --original SAVED_ORIGINAL.json --out NEW_CD_REVIEW
```

- 正しいBN sourceなら `UNALTERED_SOURCE.txt` / `ORIGINAL_BRIEF.txt` / `DERIVED_VOXELS.json` / `CD_SCORECARD.json` / `ASSESSMENT.json` を同一新規フォルダへ。**正式状態は常にHOLD**で、出所は`SAVED_SOURCE_UNVERIFIED`、現実のプロバイダ認証・自由設計成功ではない。
- 不正JSON・BM旧形式・SHA誤り・設計不成立では、出力フォルダに**そのままの元原文・依頼bytesとHOLD原因のみ**。真正3Dや採択データを捏造しない。出力は新規のみ、上書き拒否。再試行で欠けた設計を埋めない。
- Qwen/GemmaへのOllama POST、GET、モデル読み込み、ワールド接続なし。旧BOの申請承認nonce・sourcePins・公式成果物・端末コマンド・モデル設計方式を変更しない。
- テストは実際にBNコンパイルする2種類の合成作者SOURCEと、不正元原文・不一致依頼SHAの負例。成功した合成テストをモデル成功と呼ばない。

---


## R190-CD 密閉入口を到達起点にしない回帰補強（2026-10-31 JST）
- 独立ゲートの監査で、外部水平空気連通がない作者入口も保守的到達BFSの起点になり、閉じた部屋の到達セルを過大計上し得ることを発見。形状・原回答を変えず、**作者明示入口の2×2支持足元と境界からの同高度2×2×3水平空気連通の両方**が確認できる場合だけ到達起点にする。外部路面の支持、ドア操作、現実の歩行までは依然未試験。
- 閉じた入口だけの負例と「有効な外部入口＋密閉された別入口」の混合負例を追加し、室内到達を誤認しない回帰を作成。複数の有効入口があるときの入口別到達数は**全起点の和集合**であり、入口別個別認定ではない旨を結果に明記。executionAllowed=false をCDと一括オフライン審査に明示。
- この修正自体のWindows/Ubuntu専用CIは**本コミット時点未確認**。既存CI #41079427106（BN接続）／#41079857037（保存原文入口）は両方SUCCESSだが旧HEADの結果。最新HEADが通るまでは新修正をTECH PASS扱いしない。ART/機能/Minecraft施工は引き続きHOLD/REJECT・無承認推論0・世界接触0。

## R190-CD BO保存レシートからの無通信・正本付き一括連携（2026-10-31 JST）
- 新規 `scripts/r190cd-bo-capture-review.mjs` は既存BOの**保存済み** `CAPTURE.json`／`INVENTORY.json`／`MODEL_ORIGINAL.txt`／`ORIGINAL_BRIEF.txt` をread-only照合し、原依頼と原回答のbytes-SHA、manifest全ファイルのbyte数・SHA、未申告ファイル・シンボリックリンクを検査。旧BOの事前承認、sourcePins、通信・モデル契約、過去原本は変更しない。
- 使用：`node scripts/r190cd-bo-capture-review.mjs --capture SAVED_BO_CAPTURE_DIR --out NEW_CD_REVIEW`（**新規出力のみ**）。BOの真正B143幾何SHAが保存済みの場合のみ、そのSHAと新たなBN厳密コンパイルのSHAが一致する場合に限ってCD最終voxel監査へ進む。SHAが無い・違う・原文不正なら**元bytesだけを保持してHOLD、偽3Dなし**。結果の `BO_CAPTURE_BINDING.json` は原本/manifest SHAと照合結果を記録するが、保存ファイルのLOCAL_PROVIDER申告だけではモデル著者の独立認証ではない。
- 同じ専用CIに本物のBO `prepare`→`replay`→CD処理を追加（Qwen/Gemmaタグを用いた**異なる日本語依頼の合成fixture**）。原文変更・保存レシート改ざん・幾何SHAすり替え・元幾何証拠欠落・未申告ファイル・出力上書きの負例も追加。テストが通っても実Qwen/GemmaへのPOSTは0、建築ART/依頼忠実性/実歩行の成功0、施工0。**本変更のCIはコミット前時点で未実行・未認証**。

## R190-CD BO既存派生成果と設計証拠の別実装照合・人間審査パケット（2026-10-31 JST）
- 旧保存BO `CAPTURE.json` の幾何SHAと元原文だけでなく、`DERIVED_B143_PROPOSAL.json`（同じ原文から無修復で再構築した設計全文）、`FUNCTIONAL_REVIEW.json`（BN空間/機能値）、`PHYSICAL_PROGRAM_REVIEW.json`（独立BQ計測値）を**同条件で再計算**し、逐語JSON構造一致を要求する。前のINVENTORYを後から再ハッシュしても異なる派生設計/機能報告は拒否。既存BOレシートの status/HOLD と申告originは保存するが、provider真正性を自動認証しない。
- 幾何が本当に生成できる場合だけ `MANUAL_REVIEW_QUEUE.json` を作り、原日本語依頼SHA、BO元原文SHA、真正幾何SHA、作者主張用途、各用途の支持床+頭上空気/幅2到達、原作者の入口、保存済みBOビューのファイルSHA、未実証項目を記録。**既存5投影・HTML Viewerは真正8方向の撮影/内部の目視審査ではない**。美術・原依頼への適合は人間の視認と根拠照合までHOLD。合成fixtureをART/実Qwen設計合格と呼ばない。
- ネットワーク防止条件（既存NODE_OPTIONS）、BOの承認nonce、mainと凍結原本、Minecraftワールド禁止は一切変更しない。今回変更の新CIは実行確認まで未判定。成功後も建築合格ではなく照合器限定合格。
