# B4 Windows操作は一度だけでよい

Windowsの最新版プロジェクトをそのまま読み取り、実機B4 JSONを1つDownloadsに出力する。Minecraftを起動する必要はない。プロジェクトや世界データは書き換えない。

1. 成果物から単体の `MinecraftAIBuilder_Step8B_B4_Collect_READONLY.ps1` を Downloads に置く。
2. PowerShell（通常権限）で次の1行を実行。

```powershell
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\MinecraftAIBuilder_Step8B_B4_Collect_READONLY.ps1"
```

3. 新規に作成される `MinecraftAIBuilder_Step8B_B4_RuntimeEvidence_*.json` の内容を確認して、このチャットに添付。

実行前に `COLLECT_WINDOWS_B4_READONLY.ps1` を読んで確認可能。収集範囲はファイルSHAとNodeプロセスの限定情報だけ。API・Bridge・Minecraft・MCP・スキャン・建築呼出しは0。ユーザーの追加作業を強制するものではなく、JSONの受領まで実機一致は未確認。

スクリプトエラーが出た場合は出力を送る。自己判断で新規施工を再開しないこと。
