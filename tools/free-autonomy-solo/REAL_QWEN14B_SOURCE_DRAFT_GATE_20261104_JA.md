# 2026年11月4日 — 本物のMAB/TPSソースに対するQwen14B二段階下書き経路

## 最上位固定方針

ChatGPTへの依存を減らし、無料クラウドまたはローカルLLMによる長時間自律開発を成立させる。Strataは手段であり目的ではない。MinecraftAIBuilderとBrowser Ink TPSは完全同格の重要2件。ただしローカルAIは一度に片方だけを長時間担当する。追加有料API原則なし、Work/Computer Useは事前承認。main、既存成果、Minecraft Education成功施工経路、T20本番、正式PR、Pagesを保護する。SOURCE合格はART/実機/180秒4v4合格ではない。

## 今回のソース実装

- draft_real_project_local14b.py：選択した一つの実プロジェクトの固定ソースに対し、導入済みのQwen3:14bなどから2段階続けてJSON find/replace提案を生成する。最大4 POST。実Ollamaは127.0.0.1限定、モデルpullなし、追加課金なし。
- prepare_pinned_real_project.pyとREAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json：新規の私有Gitクローンでコミット、branch、source blob SHA、remoteとclean worktreeを検証。各モデル応答直後にも再照合。
- 操作対象は重要名が保持された一意の文字列置換に限定。無変更、空文字、過大、複数ヒット、API名削除は拒否する。以前のfree autonomy監督器と同じOSロックを用い、別モデル/別プロジェクトの同時実行を防ぐ。
- modelのコード案はGit worktreeではなくPRIVATEのdraft_1.private.txt / draft_2.private.txtとdiff_1.private.patch / diff_2.private.patchだけに保存。model生成コードの実行、Node/Vitest QA、Git commit、pushは行わない。
- 完了時ステータス TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY は、生成された下書きが構造的な保護ゲートを通ったことだけを示す。作品品質、修正効果、真正QA、GitHub保存、長時間自律開発は未認定。

## 固定GitHub正本

- MAB: feature/b198zr1-protected-architectural-revision の確認時点のSHA fe1682e15ffa063f4dc415b06c4d76a54737a06e。対象 source/ai/r125-v4h-mezzanine-author-ir.mjs、Git blob 4cbcbb448737b314b6d5d4bfcdc367e9b1b45f52。以前のad070 HEADから更新したが対象ソースのblobは同じ。
- TPS: research/t21-b406-single-session-real-enemy-range-audit-20261103 のSHA 0942eca28ca3cc2c66cc754c0d6d8e6fdedb6c07。対象 src/app/B193SourceCoopMode.ts、Git blob 9e2fe93e6e85cb12ffb27ac1d2506c87ee10bca4。研究branch名B406にかかわらずB423までのSOURCE replay関連コードを含む。
- これらの固定コミットは意図的な再現性確保であり、未来のブランチ更新を自動追従するものではない。GitHub再照合で変更があれば別途正本の再検証を行う。

## 検証と限界

- 本物の隔離Git fixtureで両プロジェクトに相当するソースパスに2件ずつ下書きを作るMock試験。作業ツリー・Git HEAD・原本不変更と、1プロジェクト排他、複数ヒット/無変更/危険契約削除の拒否を検証。
- GitHub Windows2022でmandatory file byte lock時のPermissionErrorを確認し、ANOTHER_LOCAL_PROJECT_ALREADY_RUNNINGへ変換する修正を加えた。最新CIはActionsにて別途確認。
- 過去の真正Qwen3:1.7bは小さい公開練習課題で1工程のみQA済みローカルGit commit。2工程連続は未実証。今回のWindows Qwen14B実呼出しはまだ行っていない。
- 本工程は未信頼AIコードをWindowsホストで直接実行しない。独立QA・研究コミット・無人開発への移行は次の隔離検証ゲート。安全なSOURCE下書きをART認定や実ゲームの品質に昇格させない。

## 操作を最小化する実行入口

RUN_QWEN14B_REAL_SOURCE_DRAFT_ONCE.ps1 はProjectにminecraftaibuilderかbrowser-ink-tpsの片方を指定する。必要なPython・Git・Ollamaは既存導入済みのものだけ利用する。スクリプトと固定マニフェストは正本のGit SHAで検査してから動かす。結果はSHAREABLE_DRAFT_RESULT.jsonを示すので、原文やスクリーンショットは不要。
