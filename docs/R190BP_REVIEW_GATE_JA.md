# R190-BP — 誤合格を防ぐ建築審査入口（2026-10-30 JST）

R190-BOの実装と証拠を維持したまま、capture/replay後の `REVIEW.html` を追加。実モデル新推論なし。

- 原依頼・モデル原文・SHA・出所・原本と派生B143の対応・真正3D・五方向SVG・限定的なR4/旧BC・未記入の美術審査に一画面からアクセス可能。
- 原文のHTML特殊文字は表示時にエスケープ。原ファイルやSHAは変更しない。合成例はSYNTHETICと表示する。
- B143が有効で機能HOLDのときの参考3DはHOLDを明示。元回答形式不正や途中例外なら3Dを表示しない。
- CLIから返るHOLDの終了コードは2。JSONレシートは保持し、プロセス成功と誤認させない。
- BOの個別承認、1 POST、再試行0、原本保存、NOT_PREPARED・9 BLOCKED・BuildPlan空・Minecraft書込0は不変。
- 専用の既存BO Windows/Ubuntu CIで通常成功・HOLD・HTMLエスケープの回帰を検査する。CI結果はコミット後に別途確認。
- 建築美術や実モデル汎用能力を新しく証明した工程ではない。ART HOLD継続。
