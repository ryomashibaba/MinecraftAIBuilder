# R125 実Qwen研究施設 — Education実施工の部分成功（2026-11-02 JST）

> **証拠区分：ユーザー提供のMinecraft Education実機スクリーンショット2枚を会話で視認。スクリーンショットの画像そのもの、非公開Qwenの生回答、ローカルワールド座標は公開GitHubへ保存しない。今回のテキスト報告のみを保存する。**

## 既知の正本と固定方針

- 研究ブランチ：`feature/b198zr1-protected-architectural-revision`、Draft PR #128。main・既存凍結原本の変更禁止。
- 実モデル要求：ローカルの `qwen3:14b`、1モデル呼出し、単階研究施設、実験室と観測記録室、鋸歯状屋根下の実高天井（ローカルモデルの独立提供元認証は未取得）。
- プライベート研究ディレクトリ：ユーザーのWindows PCにのみ保持。外部に非公開モデル原文をアップロードしない。
- 保護対象の計画・ボクセル：
  - plan SHA-256: `1226b760fb876add58ad2b298dfcc56d31e97bd5a37dcea6cf8cae0db6738324`
  - B143 SOURCE SHA-256: `be0510039769319840820f6d94aa24cc911c5f2fdb4499f5703eb11923967821`
  - B143 geometry SHA-256: `0d1788e45f5632461a2733b28caa9c655197e0db2a672bce1e088ce4e8ac4028`
  - MakeCode SHA-256: `758846e068c25ce1c13436808032c5cd2e4adfdfc6e99d51bc1e012c345e64d8`
  - 施工予定: **2,089セル、62直方体、実機パレット white_concrete 660 / iron_block 1413 / glass 16**。
- 試験ワールド：「minecraftaibuildertest のコピー」のユーザー承認済みコピー。書込前に実世界名、`.mcworld` エクスポート（72,756バイト）、ZIP root `levelname.txt` / `level.dat` 読み取り、およびモデル出力・MakeCode SHA照合を実施。ZIPが読めることは復元試験の成功ではない。

## 今回のゲーム内スクリーンショットで直接確かめたこと

1. Minecraft Educationの実際のゲーム画面に建物が**出現**している。複数本の鋸歯状・段状の金属風屋根、単階外壁、一部ガラス窓が目視可能。
2. ゲーム内のチャットに `mabset` → `Test-world anchor saved. Area 31x9x22; type mabbuild explicitly.` とある。
3. その後の **有効な** `mabbuild` に対し、`Checking empty area` → `Safety preflight layer 1 / 9`、`3 / 9`、`5 / 9`、`7 / 9`、`9 / 9` → **`Preflight passed. Placing planned blocks now.`** → **`Placing attempted. Type mabverify; do not run mabbuild again.`** がある。
4. ユーザーは続けて `mabverify` をチャット入力したが、提供されたスクリーンショットには**検査の結果行が写っていない**。検証完了したと断定できない。
5. 2枚目はチャットを閉じた明るい外観。実際の形状は屋根が主役で、鉄ブロックの帯が連続している。設計自体の独創性・外観の質を自動PASSにはしない。

## 正式な評価境界

| 独立ゲート | 今回言えること | 未認証 |
| --- | --- | --- |
| A SOURCE | 保存済み実Qwen原文から真正B143再コンパイル一致、必要用途床に問題なし | ゲーム内での素材・全位置照合 |
| B 真正3D SOURCE | 実高天井空気476セル、屋根下縦連続2幅候補75、SOURCEで2室到達 | ゲームの物理的な歩行と各室の利便 |
| C 人間ART | 2方向の外観を目視できる | **ART HOLD**。用途表現・意匠の完成度・室内デザイン未審査 |
| D Education | **安全事前検査完了、配置処理の完了メッセージ、建物の外観実在を確認** | `mabverify` 結果、予定2,089セル完全一致、実入口→2室実歩行、復元実証 |
| E モデル出所 | ローカルQwen3:14Bと記録、オリジナル原文保存、単一応答・HOST共通B143生成器 | 第三者によるローカルモデルの独立実行認証・3用途一般化 |

**判定：`EDUCATION_REAL_WORLD_PLACEMENT_VISUALLY_CONFIRMED_VERIFY_PENDING`**

「mabbuild実行ログ・実建物の外観を目視」までは実証された。**`mabverify` 成功／2,089セル完全一致／実歩行／ART完成／ワールド復元PASSではない。**

## 次の一手（既存物の検証だけ。無断の再施工禁止）

1. **`mabbuild` は再実行しない。** ゲームのチャットで先ほど入力した `mabverify` の**最終応答**を確認してスクリーンショットを取得。検証終了待ちのときは追加の検証命令を連打しない。
2. `Positions and material counts match. Inspect air/entrances/rooms.` と実際に出た場合のみ、「予定セル・素材一致（ゲームAPI経由）」を限定的にPASSへ更新。HOLDまたは無応答なら停止し、ログを保存。自動復元・再実行はしない。
3. 実プレイヤーが外部入口から侵入し、実験室・観測記録室の双方へ到達できるか、頭上の高空間が開いているかをそれぞれ視認。**座標や写真は公開リポジトリに置かない**。
4. 外観・室内意匠を人が審査。現状は規則的な金属帯・規格箱の疑いが強く、美術品質を合格にしない。必要なら次建物で汎用表現能力を改善（旧成果の改竄禁止）。
5. 他用途（入口付き店舗、二階住宅）へ同じ汎用経路を展開。3棟完工したと早合点しない。

## 安全上の注記

B143 SOURCEの `readiness=NOT_PREPARED`、9 `BLOCKED`、空の `BuildPlan.operations` はデザイン専用安全ゲートであり、今回の実機で**SOURCE設計内ゲートを勝手に解除したという意味ではない**。明示した別のEducation MakeCode試験ワールド経路でユーザーが `mabset` / `mabbuild` を実行した。実ワールド接続/BuildPlanの区分を保つ。MakeCodeにはバックアップの自動復元機能がなく、外部敷地・世界名チェックもゲーム内では不十分。
