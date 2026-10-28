# R190-AE 保存済み回答のオフライン診断

この文書はコードの動作と合成テストの説明のみを含む。
ユーザーの実モデル原文、原文ハッシュ、実行メタデータ、個別診断結果は公開しない。

## 診断の契約

`scripts/r190ae-saved-semantic-diagnose.mjs`は保存済みの3ファイルを読む。
`MODEL_RESPONSE_ORIGINAL.txt`、`R190AB_ATTEMPT.json`、`R190AB_RESULT.json`が必要。
診断は標準出力のみで、入力ファイルを書き換えない。プロバイダ・Minecraftへの通信はない。

- 原文の固定SHAと実バイト数、attempt/result/responseの契約とschemaを照合する。
- prompt/model/taskのレシート間一致、3階層の安全条件と9ゲートを検査する。
- 実行前後の3ファイルSHAを比較する。改変・混在・不正UTF-8・過大ファイルは拒否する。
- レシートは署名なし。モデル本人認証やプロバイダ消費の独立証明にはならない。
- 診断は静的・助言的。すべての幾何制約、日本語要求、美術品質を証明しない。

AEでは形状・屋根・窓・追加接続は省略可能。AD診断の必須条件を誤って適用しない。
選択した任意配列は空にせず、選択しない場合はそのプロパティを省略する。
ADの必須条件と既存format/hashは維持し、室関係の診断パスの添字を修正した。

窓は`baseY>=5`、`baseY+height<=room.height-1`、
`offset>=2`、`offset+width<=wall span-2`が必要。
診断器は許容baseY上限と必要室高を返すが、室や窓を動かしたり縮小したりしない。
entry rootには`parentId:null, side:null`が必要。
親子接続は既に直接接続を作るため、追加接続に同じ組を指定してはいけない。

AEの実行時室数を、既存の公開format通り3〜6室に合わせた。
窓のガイダンスを明確化し、formatとそのSHAは維持した。
ガイダンス変更後の将来request SHAは変わるが、過去のrequest SHAを書き換えない。

## 利用方法

完全なcheckoutから、保存済みフォルダの絶対パスと、手元で固定した原文SHAを指定する。

```powershell
node scripts/r190ae-saved-semantic-diagnose.mjs --study "C:\PATH\TO\SAVED_STUDY" --expected-sha YOUR_64_DIGIT_ORIGINAL_SHA256
```

診断成功の終了コード0は「診断完了」の意味で、設計合格ではない。
保存済みのHOLD・最初のエラーも変更せず出力する。
直接CLIはGit通信も不要。

Windowsラッパーは`-Diagnose -Flexible`に対応し、明示`-DiagnosisSha`が必要。
`-Run`併用は拒否する。ラッパーは既存と同じGit取得経路を使用するため、
完全オフラインの場合は上記の直接CLIを使う。

## 合成テストとCI

`scripts/r190ae-saved-semantic-diagnose.test.mjs`は手作りの合成原文・偽レシートだけを使う。
入口の関係、複数窓の高さ、冗長な親子リンクを一度に列挙し、
任意項目の省略、原本バイト保持、レシート改変拒否、UTF-8・容量制限、
実CLI、Windows PowerShellの引数ガードを検証する。
関連AB/AC/AD/AEと共通幾何・保存済みリプレイのローカル回帰は66件成功。
GitHub ActionsではLinuxとWindowsで同じ合成テストを実行する。
実ユーザー原文やローカル報告をCIへ渡さない。

NOT_PREPARED、9 BLOCKED、BuildPlan空、ART_HOLD、Minecraft歩行未検証を維持する。
この工程は実モデル呼び出し、原文修正、施工、マージを行わない。
