# B130 — Windowsワンクリック階段校正記録キット（Minecraft無接続）

## 何ができるようになったか

B129までに設計した「二回×四方向=8観察枠」の校正表を、実際のWindowsで入力・画像ハッシュ管理できる単体配布キットにまとめた。ZIP形式のGitHub Actions artifactを展開し、`START_B130_LAB.cmd`を**ダブルクリックするだけ**で記録ウィザードが開く。Node.js 22以降必須。

ただし、ウィザードはMinecraft Educationを起動・接続・遠隔操作・撮影・ブロック設置・world変更しない。Minecraft実機検証は別途明示されたテスト用ワールドで、安全な手動実験として認められるまで実施しない。記録がない現状、何も入力せずQで終了する。

## ワンクリックキット

- `START_B130_LAB.cmd`: Node存在確認とオフライン記録ウィザード起動だけ。
- `README_FIRST_JA.txt`: Windowsでの利用方法・重要な安全制限。
- `B129_Isolated_Calibration_Protocol.json`: B127/B129に固定されたハッシュ、8枠の申告プロトコル。
- `B129_Manual_Calibration_Worksheet_JA.md`: 実機記録項目の日本語手引き。
- `data/B130_Observation_Receipts.json`: 実測記録未提供のため `receipts=[]` の状態で作成。
- `source/parallel/...`: 5つの必要なJSモジュールを再現性を保って収録（外部Nodeパッケージなし）。

## 証拠収集

人が隔離された実験でreadbackした事実を `READBACK` で明示し、Minecraft Education版、状態値0〜3、観察した踏面形状、すでに撮影したローカル画像のパスを入力する。最後に `YES` と明示した場合のみ、選んだ画像をローカルの`evidence/`へコピーしSHA256を算出する。

証拠画像はPNG/JPEG/WebPのみ、上限25MiB。コピーされた画像は都度ハッシュ再計算され、改竄検出・証拠使い回し検出が働く。ネットワーク送信・画面自動撮影・ホームディレクトリ一括検索・Minecraftプロセス起動は実施しない。

## 受付の制限

- 実機readbackの未実施、未入力、状態値不正、重複枠、別のEducation版、B127のハッシュ不一致、証拠ハッシュ使い回し、上昇方向の矛盾は登録せず停止。
- 同じ方角の2ラウンドが60秒未満ならHOLD、元設計の半段形状と一致しない場合もHOLD。
- 証拠画像のハッシュ一致は画像の真正性・見た目の妥当性・Minecraft実験の事実を保証しない。仮に8件の人間申告が一致しても `READY_FOR_INDEPENDENT_MANUAL_EVIDENCE_REVIEW_NOT_CERTIFIED` のまま。
- 自動化は入力整理まで。Educationのブロック配置、物理衝突、踏面通行・床支持・実現性の認証には別実験が必要。

## CIと保護事項

B130は12件のウィザード/ローカル証拠検証と3件の配布パッケージ検証を実装。CIではB114〜B129の元ソースデータを再生成し、B129の原典ハッシュ・15棟・66階床・102階段・9 BLOCKED・NOT_PREPAREDを検証する。

worldContacts=0、BuildPlan.operations=[]、main/先行PR不変更。実際のワールド操作は未承認・未実施。今回の成果はWindows操作を1回化した**受領環境**であって、Minecraft実機が完成したことではない。
