# B19 / M3 差分検証

- 新規26/26 PASS。`qa/B19_M3_NEW_TESTS.tap`。
- B18幾何35/35 PASS。`qa/B19_M2_REGRESSION.tap`。
- 元のB18 ZIPを実行前に検証済み：379ファイル+その他の原本2ファイルで安全な復元性を確認。
- 元のB18と凍結ソース・証拠は一切変更せず追加ファイルだけで構成。
- Windowsソース7ファイルのSHA-256照合成功、ただし稼働中Node.js・Bridge一致は証明していない。
- 継続ブロック10項目、`NOT PREPARED`, `operations=[]`, `commandCount=0`。
- 過去の408件全回帰は**今回未実行**。B17以前の成功記録を今回の実行結果に加算しない。
