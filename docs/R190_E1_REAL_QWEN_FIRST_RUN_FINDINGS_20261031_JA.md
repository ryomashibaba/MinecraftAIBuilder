# E1実機第1回（2026-10-31 JST）— Qwen3:14b 非破壊検証

実機フォルダ `MinecraftAIBuilder-E1-Outputs/E1-three-use-T8BFe8` をユーザーから受領し、3件の原文と個別ログを確認。

| 用途 | SHA256 (original) | HOLD | 根本原因（元JSONの目視調査） |
|---|---|---|---|
| modern-home | f47b6ca5c0c864443e4b8b411bbef70f14cb34db7daa8375a61982427dc90f55 | R190_SEMANTIC_PROGRAM | `living_room` にアンダースコア。保存原本には高さ6の収納室と、同一部屋のroof/formIntent競合もある |
| flower-shop | c1aada140ab18c4238bfa1fc2dd90acd3cd6462397d02e03cb10a2ca08b4865f | R190_SEMANTIC_GLAZING_NOT_EXTERIOR | `workshop` のwest窓は接続元 `entrance` に面し、実外壁ではない |
| research-lab | e7af04688fc24362908e28ba1e2354df44bb4fad9fdfae104b3163db14273199 | R190_SEMANTIC_IDENTITY | `shinkan_lab` にアンダースコア |

確定事項: Ollama `qwen3:14b` に3回実要求し原文3件を取得。SOURCE完成0/3、Minecraft施工・実歩行・人間美術審査はゼロ。すべての理由は安全側の拒否であり、エンジンのクラッシュではない。原文はローカルに保持しGitHubには転載しない。

対策: SYSTEM契約に厳密なkebab-case ID正規表現、全部屋高さ下限、親子共有壁を外壁と誤認しない窓位置、roof/facet競合禁止、回答前自己点検を明文化。**これは次回成功を保証しない。** 後処理で原設計の自動改変や、失敗時の隠れたモデル再試行を実装しない。E1は同じ3用途・同じモデルで再計測し、原文／SHA／HOLDを独立比較する。
