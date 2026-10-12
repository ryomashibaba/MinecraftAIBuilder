# B4.2 → B4.3 / B5

1. ユーザーが任意の1回のWindows操作で生成する `MinecraftAIBuilder_Step8B_B42_RuntimeEvidence_*.json` を取得。
2. `tools/AUDIT_WINDOWS_B42_REPORT.mjs` をソーススナップショット249ファイルと共にオフライン実行し、8重要ファイルのドリフト、プロセスヒント、待受ポート関連を区別する。
3. ルート束縛された直接起動が観測されても `runtimeIdentity=NOT_PROVEN` として保持。必要なら追加証明の設計を先行し、勝手にBridge/HTTP/Minecraftへ接続しない。
4. プロセス不在／不明なら、起動や再起動を勝手に実施せず、次に必要な証拠を整理する。
5. 今後の改修も、短い差分とQA、明確な保全地点を単位にまとめる。安全承認前の建築・スキャン・コンフィグ書換は一切しない。
