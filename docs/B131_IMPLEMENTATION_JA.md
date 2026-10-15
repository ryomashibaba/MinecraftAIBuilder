# B131 — Windows実行環境での起動検証とオフライン校正記録ツールの堅牢化

B130 Draft PR #34 (`dab52c2baa7cf55f9b00ba98a8066ec18badcfc2`)をbaseとする。mainと先行PRは変更しない。

## 前工程の未解決事項

B130でWindows用の`START_B130_LAB.cmd`とノード実装を作成したが、前回はLinux GitHub Actions上でのパッケージ整合性テストだった。B131は生成したパッケージそのものを実際の`windows-latest` GitHub Actionsランナーにダウンロードし、Windowsの`cmd.exe`で起動診断する。

## 具体的な実装

- **Windows本体で試験**：GitHub ActionsのWindowsジョブで、空白を含むフォルダーに配布物を展開。`cmd.exe /d /c START_B130_LAB.cmd --check`を実行してJSON結果と終了コードを検証。
- **起動診断モード**：`START_B130_LAB.cmd --check`なら日本語対話・pauseを表示せず、実機校正記録0件・未実施8枠・方向候補24通り・worldContacts=0を読み取り表示。
- **Node.js環境判定**：Nodeが未インストールまたは22未満の場合はエラー終了。無効な引数は安全停止し、途中で記録ファイルを変更しない。
- **通常起動**：引数なしで従来のB130ウィザードを開き、手動で指定された証拠画像のみをローカル保存する。
- **パッケージのSHA256一覧**：launcher、README、B129の原典、空の観察JSON、5つのランタイムモジュールについて配布時の内容ハッシュを記録し、更新・欠損を検出。
- **日本語ガイド**：`B131_WINDOWS_START_HERE_JA.txt`に診断コマンドとMinecraft実機未認証である旨を明示。

## 安全・限界

これらの動作は完全にオフラインであり、GitHub ActionsのWindowsランナーでMinecraft Educationを起動・インストール・操作しない。ゲーム内の階段BlockState読み取り、物理的な階段通行、画像内容の真正性、実機校正は**未実施**。

原15棟・66階床・102階段、NOT_PREPARED、9つのBLOCKEDゲート、BuildPlan.operations=[]、worldContacts=0を維持。Windows上の実際の画面対話・手動Minecraft実験はまだ未確認。