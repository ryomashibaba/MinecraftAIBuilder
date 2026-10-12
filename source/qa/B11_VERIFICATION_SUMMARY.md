# B11 QA 総括

- B11新規テスト 20/20 PASS。
- Step8B系 210/210 PASS、0 fail, 0 skip (`B11_STEP8B_ALL.tap`, exit=0)。
- Step8A通常 65/65 PASS、0 fail, 0 skip (`B11_STEP8A_CORE.tap`, exit=0)。
- Step8A詳細座標 15/15 PASS、0 fail, 0 skip (`B11_STEP8A_DETAIL.tap`, exit=0)。
- **合計 290/290 PASS。**
- Chromiumで5候補選択、6F/1F切替、HTML静的マスク、未承認JSONダウンロード。JS例外0・外部通信0。file://直接起動は環境制限で未試験。
- 入力改ざん（B10 SHA、報告書再ハッシュ）を拒否。既存ソース変更なし、施工許可なし、operations=[]。
- B11 CLIは未作成の新規ディレクトリだけに2ファイル生成。元の設計ファイルは読み取り専用。
