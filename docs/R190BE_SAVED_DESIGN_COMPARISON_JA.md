# R190-BE — 保存原文による直接B143／設計先行比較

2026-10-29 JST。既存のDraft PR #128、`feature/b198zr1-protected-architectural-revision`を継続。基準HEADは`4b3833d4f4c4c338e757376ab232c49ef4da0431`。

## 目的と今回の到達点

建築品質を改善したかは、モデルの文章や監査項目数では判断できない。BDで接続した設計先行方式を、元の日本語依頼からの直接B143方式と、保存原文・真正3D・同じ既存測定器で比較する入口を実装した。新しいモデル推論は実施していないため、品質向上そのものは未立証。

Workへ引き継いだ理由は、同じ作業チャット内でコード変更、GitHubコミット、Ubuntu/Windows CIの確認を継続するため。実験承認やユーザー側の実行操作を省略する目的ではない。新しいインストーラー、ZIP配布、ユーザーへのコマンド実行依頼は追加していない。

## 最初に確認した失敗と修正

- PR #128はOPEN、Draft、未マージ、指定ブランチのHEADは基準と一致。
- 前回BD CI [#40860737403](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40860737403)のUbuntu失敗をログで確認し、ローカルで再現。成功用fixtureが高さ2の領域の70%を到達可能と宣言したが、立脚位置は床面の36/72=50%。検証器のHOLDは正しい。fixtureの機能領域を立脚面の高さ1へ変更し、70%の要求を維持。高さ2で過大申告するケースは新規回帰としてHOLDを確認。**検証器・合格閾値・既存実モデル原文は変更していない。**
- 前回BC CI [#40860737580](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40860737580)はUbuntu成功、確認時点Windows待機。
- 既存H回帰がWindowsで`URL.pathname`から`C:\C:\...`を作っていたため、`fileURLToPath`へ修正。
- Windowsでファイルシンボリックリンクを作れない環境に対応し、権限不足のときだけリンク専用サブテストをSKIPと明示。その他の保存・改ざん・上書き拒否検証は継続する。Linuxではリンク拒否検証を必須で実行する。

## 実装

`scripts/r190be-saved-design-comparison.mjs`は保存済みファイルだけを読む。モデル実行フラグや自動検索・再生成・代替案選択はない。

1. BC準備済みフォルダーの元依頼・設計先行プロンプトを既存BDの照合器で確認。
2. Aの保存プロンプトが元依頼の完全一致、Bが既存BCの設計先行プロンプトの完全一致であることを検証。似た依頼を同一条件と扱わない。
3. 原文・プロンプト・安全レシートのSHAと完了の申告を確認。レシートは署名なし、モデル名も自己申告であることを表示する。
4. 既存B143コンパイラ・R4・BC検査を再実行。保存済みPASSラベルを鵜呑みにしない。
5. 既存R190-Tの物理ボクセル比較、既存ギャラリーの回転3D、既存R164の五方向投影、BC断面を出力。新しい監査器や建築プリミティブを増やさない。
6. 原依頼SHAと両案の原文／形状SHAに結びついた未採点の人間審査票を出力。用途適合、内部体験、造形的一貫性、独創性について、0〜4の採点欄と実際の観察証拠欄を空欄で渡す。自動ART判定は行わない。

R4不合格でも完了した有効B143があれば参考3Dを表示し、各案のR4／断面HOLDを維持する。不完全回答や無効B143からは3Dを作らない。同じ形状のメタデータ変更は`NO_PHYSICAL_CHANGE_ART_HOLD`。形状差・数値差があっても`winner=NOT_ESTABLISHED`。原文は出力直前にも再照合し、入力フォルダー内や既存出力への書き込みを拒否する。

```text
node scripts/r190be-saved-design-comparison.mjs --prepared BC_PREPARED_DIR --baseline SAVED_DIRECT_CAPTURE_DIR --candidate SAVED_BD_RUN_DIR/model-original --out NEW_COMPARISON_DIR
```

`--baseline`や`--candidate`の省略は欠測としてHOLDを出力する。指定したパスの破損・改ざん・プロンプト不一致は出力前に拒否する。実推論を承認したコマンドではない。

## 実保存原文で確認したこと

ユーザーの既存`r190aa-local-evidence/pilot-01/library`を読み取り専用で検査。原文SHAは公開済みAA原本と同じ`0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17`。結果を`evidence/r190be/SAVED_AA_BASELINE_ONLY.json`へ記録した。

- Aは既存実Qwenの保存原文だが、`B143_SCHEMA_OR_MODE`で不合格。元形状を修理してモデル成功にしない。
- Bの実設計先行回答は未取得。`HOLD_MISSING_SAVED_PAIR`を記録し、A/Bの架空の比較画像を作らない。
- 元原文は読み取り前後のSHA一致。新規実推論0、形状補修0、Minecraft接触0。
- 今回の実原文検査は**欠測・不適合の証拠**であり、モデルの建築品質が改善した証拠ではない。

## 検証と限界

ローカルWindowsの対象回帰は49件、47 PASS、権限不足のファイルリンク専用2件SKIP、失敗0。ネイティブ通信の回帰はテスト自身の模擬HTTPサーバーだけを使用し、実Ollamaを呼んでいない。

専用BE CIはUbuntu 24.04／Windows latest、Node 22でBD・BC・H・T・BEをまとめて実行する。既存の一つの共有fixtureから比較画面を作り、`SYNTHETIC_ONLY.txt`付き成果物として保存する。合成ケースは通信・保存・表示の検証専用で、建築作品の量産やモデル能力の実証ではない。CI実結果は完了後に確認する。

既存レシートではモデルdigest、生成時の全sampling設定、context・output予算等を両案で保証できないため、**同じモデル名でも因果的な方式比較とは認定しない**。同条件の新規比較には別途明示承認と事前に固定した条件記録が必要。単一ペアでモデル汎用性は証明できない。モデル自己申告の用途領域とBCの同一高さ2幅動線は、独立した用途評価・階段到達性・実ゲーム歩行の代わりにならない。

## 維持する状態

`ART HOLD`、正式採用0。`NOT_PREPARED`、9 `BLOCKED`、`constructionApproved=false`、`executionAllowed=false`、`BuildPlan.operations=[]`、`worldContacts=worldWrites=0`。Minecraft施工・ワールド操作禁止。新規Qwen/Gemma推論は別途明示承認が必要。main変更、force push、マージ、Draft解除は行わない。
