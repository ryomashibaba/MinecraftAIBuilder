# R190 E1 第4回Qwen実出力（2026-10-31 JST）

ユーザーのE1_STUDY_REPORT(1).jsonから確認: `E1-three-use-7iEUZp`。qwen3:14b 3回、SOURCE 0/3。モダン住宅 `R190_SEMANTIC_GLAZING_OUT_OF_WALL`、花屋と研究室 `R190_SEMANTIC_GLAZING_NOT_EXTERIOR`。全ての`validationIssues`は空。原文3件は今回添付されておらず、実際の壁寸法・隣接部屋IDは不明。

第4回では過去3回と異なる、**実3Dの窓仕様が解決しない**根本問題が明瞭。故障を「モデルの不注意」で片付けて追加推論を無制限に繰り返すのではなく、平面配置を先に確定→真正外壁の窓候補をREAD ONLY計算→モデル自身が明示選択→最終厳格検証の二段階化へ移る。

第一実装：既存モデル原文を変えない`diagnoseR190E1Plan`で水平／垂直窓範囲と、検証済み配置図上の遮蔽部屋IDを出す。同時に`r190E1WindowSlotCandidates`で既存部屋を動かさず、入口面・他室占有を除いた外壁窓候補を列挙（モデル選択前に施工不可・候補だけでART PASSではない）。二段階のモデル呼出し／統合実行はこのコミットでは未接続。main・原本・世界不変更。