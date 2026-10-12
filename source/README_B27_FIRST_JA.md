# MinecraftAIBuilder — Step 8B/B27 M4 read-only Windows evidence gate

## 最初に

1. `../00_START_HERE.md` と `docs/B27_M4_RUNTIME_EVIDENCE_NEXT_JA.md` を読む。
2. 凍結済みB26を `node verify-b26-package.mjs` で検証。
3. B27差分QA: `node --test tests/step8b-m4-evidence-gate-b27.test.mjs tests/step8b-m4-windows-collector-contract-b27.test.mjs`
4. `node verify-b27-package.mjs` でB27の凍結原本・QA・レポートを検証。

## B27で新しくできたこと

- Windows PowerShell 5.1向け候補収集器を改善。固定9ファイルのハッシュ、過去材料プロファイルの集計、Nodeプロセスと8000/8765ポートの匿名**件数**のみを収集。コマンドライン内容・ローカルパス・材料の生データはJSONに保存しない。
- B26の9ソースハッシュと日時付き実機証拠を別々に照合する**B27証拠判定器**を追加。不正なJSON項目、期限切れ時刻、操作・権限フラグ偽装、矛盾する件数は拒否。
- 9つの安全ゲートは引き続き全部BLOCKED。ソース一致／プロセス名の類似／古い材料記録の一致は稼働中コードやドア施工の証明ではない。
- 新規44件、B26回帰58件、B25回帰48件、計150件のLinux/NodeオフラインQA PASS。
- 模擬JSONを使ったCLI実行PASS。**WindowsでのB27 `.ps1` 実行は未検証**。

## Windows（ユーザー側で1回だけ実行が必要なとき）

Downloadsに `MinecraftAIBuilder_Step8B_B27_M4_OnePass_READONLY.ps1` を保存し、Windows PowerShellで:

```powershell
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\MinecraftAIBuilder_Step8B_B27_M4_OnePass_READONLY.ps1"
```

正常なら `MinecraftAIBuilder_Step8B_B27_M4_RuntimeEvidence_*.json` がDownloadsに**新規作成**される設計。既存ファイルとプロジェクトには書き込まない。JSONを確認し、機密情報がないことを確認してから添付する。

`tools/AUDIT_B27_WINDOWS_READONLY.mjs <JSON入力の絶対パス> <新規出力JSONの絶対パス>` で照合する。14日より古いログは拒否。エラーの場合はPowerShellのエラー全文を提示して調査。

## 継続される未解決

M4-01～M4-09はすべてBLOCKED。ドア材料・上下状態・支持・階段床開口・ワールド原点・オフィス02外形と廊下・新規建築の明示承認はいずれも未解決。

**NOT PREPARED / BLOCKED / BuildPlan.operations=[] / commandCount=0**。Minecraft/Bridgeへのアクセス・新規施工・Legacy変更・凍結原本更新なし。
