# B198Z-R57 — 実Qwen未承認の未来用CMD候補・Windows一操作QA

## 位置づけ

既存プロジェクト `ryomashibaba/MinecraftAIBuilder`、Draft PR #128、`feature/b198zr1-protected-architectural-revision`。新規Minecraft施工・接続・実Qwen推論は一切実行しない。R25/R44/R46/R48の原本・使用済み承認を改変しない。

前工程のR56フル経路CI（Run **39589340421**）は、Windowsの単発PowerShellランナー検証とWindows/UbuntuのR54回帰を含む **3/3 PASS**。次はユーザーが将来、本当に一操作で起動できるかの**CMD最外層**を検証する必要がある。

## R57で行ったこと

- `tools/r57-future/START_R54_ONE_QWEN_FUTURE_ONLY.cmd` を新設。過去のR48 CMD実績を利用し、**R56のPowerShellラッパーを固定コミット・Git blob SHAで取得してから**実行する一ファイル方式をR54向けに準備。
  - 固定PowerShell: `63418118c09ccadc7576188cf0c4f146178be180`、blob SHA `503a1d25b028300c1fee8d5f8f7f6d5b2614002d`
  - 実Qwenの新規Chat内明示承認がある場合に限り、ユーザーのローカル`YES`確認の後でR54ラッパーへ進む。承認がない現段階では**配布・実行を案内しない**。
  - 中間のR55 SHA固定ソース（467ファイル）、R50プログラム先行の設計指示、R47ネイティブJSON Schema、原本SHA保存、R49監査、R51/R52自動診断・結果ZIPまでを一つの経路に接続。
  - 自動再試行・モデル変更・前の承認の流用はしない。R54用ロックは実モデル要求前に作成し、再度の生成は拒否。
- `scripts/b198zr57-future-cmd-one-click-fake.test.mjs` を新設。Windowsの`127.0.0.1:11434`を**Node内の偽Ollamaが先に確保できたときだけ**CMDを起動。環境変数`LOCALAPPDATA`は一時隔離ディレクトリ。
  1. `NO`入力ではモデルHTTPのGET/POST 0。
  2. テスト用`YES`入力後は、既存の厳格JSON SchemaとR50システム指示を持つPOST 1、GET 1。
  3. R55ソースの467ファイル、原本SHA、R54消費ロックと監査の一致を確認。
  4. B143境界外の**合成失敗原本**をモデルから受けた場合、結果ZIPの中にR51診断図・R52レシート・無改変原本が揃うことを展開して確認。
  5. 同じテストロックで再度`YES`入力しても新たなGET/POSTを行わない。
  6. **実ユーザーのOllamaや消費ロックへ接続できない**よう、一時フォルダと先行バインドの両方が必須。
- CIは既存`.github/workflows/r54-future-program-one-shot-fake-only.yml`に**R57専用Windows job**を追加。既存R54/R56の回帰ジョブを保持。

## 安全条件とゲート

- 今回、実QwenへのHTTP POST=**0**、Minecraft read/write=**0**。CLIのトークンは模擬CI用の文字列であり、実ユーザーから承認済みであることを意味しない。
- 次の実Qwenはユーザーからの**新しい明示承認**が必要。承認されるまではCMD本体をユーザーへ送らず、実起動を促さない。
- 旧R48原本・ZIP・消費済み承認を改変せず、mainやFreezeも変更しない。
- `NOT_PREPARED`、施工9ゲート`BLOCKED`、`constructionApproved=false`、`executionAllowed=false`、`BuildPlan.operations=[]`を維持。
- B143構文・R3動線の検証、建築の美観・独創性・図書館としての実用性は別判定。R57模擬CIがPASSしても実Qwenの品質は未検証。

## 次の工程

R57 Windows最外層CIを確認。失敗していれば修復。合格後も新たな実Qwen承認が得られるまではソース準備・比較設計・合成QAだけを継続し、ユーザーにファイル操作は要求しない。
