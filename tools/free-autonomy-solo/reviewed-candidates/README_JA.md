# 2026-11-04 Qwen3:14B公開研究結果・独立SOURCE QA・GPT修正版の厳密な区別

## 固定された事実

- 真正Ollama `qwen3:14b` が生成したMAB V4Hの2つの私有下書きは、Windows上で静的整合性・MJS構文を2/2 PASSした。これは実動作の合格ではない。
- 本人の明示許可により、元のQwen下書き全文2件がコミット `741932d8f0e41efdc5c1fd99bd99ea690cb64720` の公開研究ファイル `tools/free-autonomy-solo/submissions/5efd3971fb604a60af955cfc16a08891.json` で公開された。この公開履歴は保持し、Qwen出力を遡及改ざんしない。
- [元のQwen生成物に対する真正GitHub Docker QA](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41845806261) は **completed / failure**。stage 1 の唯一のテストが `INDEPENDENT_DOCKER_QA_STAGE1_CHECK0_RC1` で失敗し、受理コミット0。Qwenの品質や実装成功として報告しない。
- 公開ソースから原因を解析：stage 1は無関係なトップレベル式で未定義変数 `v` を参照し、Node評価で `ReferenceError: v is not defined` を再現。stage 2は `physical2WideStairTreads > 5` を拒否する新しい条件があり、既存V4H仕様の `mezzanine.rise=6..8` と一致しない（元の検証が要求する段数は `rise+1=7..9`）。
- **別由来の研究候補** `MAB_V4H_ASSISTANT_REVIEWED_REPAIR.mjs` は、上の2か所だけを厳密に修正。stage 1はキーの個数と所有プロパティを判定し、stage 2はsource witnessの存在・型のみを防御的に検査。元の進入路・工事禁止ゲート・オリジナル作者意図・2階用途の正式規格は変更しない。**Qwenモデル自身が出力したコードではなく、アシスタントがレビューして修正したもの**。生成モデルの真偽は独立認証されていない。
- [修正版に対する隔離Docker実SOURCE QA](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41847626931) は **completed / success**。runnerでの真正Node source testが stage 1に対し1件PASS・stage 2に対し1件PASS。各段階の合格後に一時Git clone内だけでコミットし、合計2件。一時Git cloneはrunner破棄に従い消える。テストの入力は公開されたQwen2件の全文・SHAに**完全一致する場合だけ**組み立てた、別由来の確定的な修正版候補。GitHub public sourceへの追加push0・モデル再実行0・有料API0・本人PCコード実行0。
- この SOURCE QA PASS は **既存V4Hの限定された回帰テストが通る**という意味に限る。Minecraft Education実機歩行、建築ART、全ジャンル横断、モデルによる自律修復、長時間無人開発の合格ではない。

## 永続保存と次の工程

- このディレクトリの `MAB_V4H_ASSISTANT_REVIEWED_REPAIR.mjs` は、上記PASS済みの別候補を研究用スナップショットとして保存したもの。元の `source/ai/r125-v4h-mezzanine-author-ir.mjs` は**一切変更せず**、main/正式研究ブランチ/PR・Minecraft実機へ自動採用しない。
- より高度な独立QAや実際の機能改善評価が必要なら、元の固定V4Hソースとこのスナップショットの差分を精査し、研究ブランチ内の隔離テストで再検証する。合格前に自動統合しない。
- ユーザーは今回の証拠提出を完了済み。今後のGitHub上の公開研究資料の解析・安全な隔離候補作成・実CI確認について、**ZIP再ダウンロード・毎回のWindows起動・JSON再アップロードを要求しない**。新しいローカル生成/秘密情報公開/課金/Work/Computer Use/本番やmainへの変更は従来の個別承認を保持する。
- 全体の最上位目的は、2026年12月以降のChatGPT依存低減・追加課金原則ゼロで、同格最重要のMinecraftAIBuilder / Browser Ink TPSに対する長時間自律開発の成立。Strataは手段であり単体完成が目的ではない。ローカルAIは同時に1プロジェクトを担当し、工程ごとに頻繁に切り替えない。
