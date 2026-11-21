# B198Z-R41 — 建築生成品質へ戻る：空間先行の短い候補と失敗フィードバック

## 狙い

R25実Qwen原本（SHA256 `444b14eaedf1136a1cee5eeab94c7b76db51fcd2d3519820ba807727e55817d6`）は、CUTへのmaterial混入でB143 HOLD。R26のメモリ内仮想修正後も内部中実、入口不成立、読書領域とラウンジの満杯、経路断絶が残った。これ以上の監査記録の包装ではなく、次回の**別途承認される**モデル生成を改善する実用的な方向へ移る。

## 今回の実装

- `source/ai/b198zr41-architecture-authoring-candidate.mjs`: 固定ジャンルや座標を含まない、四キーJSON向けの**独立した短縮生成候補**を追加。R11/R21/R30は変更しない。
- 指示内容は「独創的な建築構成 → 支持された床と実際に空いている室内 → 階段と着地床 → 開口とCUT → 機能領域」の思考順序を強調。構文の必須項目を簡潔にまとめ、最後のADDでCUTが再び埋まる誤りを予防する。
- `inspectR41Candidate(raw)`: 保存済みモデル原本等を**無改変・オフライン**でB143/R3/R4へ渡し、構文違反、入口不成立、空洞の埋め戻し、到達できない目的地、使えない機能領域へと分類した改善ヒントを返す。原本の補正・再生成・自己承認はしない。
- `scripts/b198zr41-architecture-authoring-candidate.test.mjs`: 既存R32手書き合成中庭を利用し、正常な抽象経路、CUT.material違反、後続ADDの中庭埋め戻し、入口y=0、未完成JSONを検査。
- `.github/workflows/r41-architecture-authoring-offline.yml`: Ubuntu / Windows Node24で、このテストのみを実行。Ollama、Minecraft、外部APIを呼ばない。

## 現在の判定と注意

- R41生成指示候補は `NOT_ENABLED`。実Ollama生成への接続も、これを使う承認も行わない。
- B143/R3/R4での合成ケースPASSは、「Qwenが高品質な建築を生成できた」という証明ではない。
- ガイドのUTF-8バイト数は測定するが、実モデルのトークン数、コンテキスト適合性、応答完了率、成功率、造形美改善は**未測定**。
- `inspectR41Candidate`の結果が形式的PASSであっても、独立した人間の建築審査と後日の新しいQwen試験が必要。
- 原本R25や既存凍結資産は変更しない。施工可能化は行わない。

## 安全条件

```text
readiness=NOT_PREPARED
constructionApproved=false
executionAllowed=false
gates=BLOCKED x9
BuildPlan.operations=[]
R41 additional model calls=0
R41 worldContacts=0
R41 worldWrites=0
```

## 次工程（R42の方向）

テストで検証できる範囲と未検証の範囲を区別し、独創的な曲面・複合空間を小さい出力で表せるか、出力予算と空間成立性の両立を研究する。実Qwenの追加推論が必要になった段階で、モデル名・指示SHA・消費回数・原本保全・比較基準・手順を示し、**新たな明示承認を得るまで実行しない**。
