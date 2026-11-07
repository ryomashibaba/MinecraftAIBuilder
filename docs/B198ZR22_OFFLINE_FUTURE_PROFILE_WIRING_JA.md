# MinecraftAIBuilder B198Z-R22 — 次回プロファイルの安全なオフライン統合

## 実装の結論
R21で見つかった **実Qwen原本の材質欠落5・ローカル形状範囲外1・protectedVoidとloungeの衝突候補・入口床の欠陥・大きな曲面質量不足** を、固定形状テンプレートではなくモデルへの一般的な制約として反映した。

- `source/ai/b198zr21-future-architecture-guide.mjs` はR11完全ガイドに付加したガイドとSHAを保存する。R11そのものは変更していない。
- `source/ai/b198s-native-ollama-source.mjs` に **`r22QualityGuide:false`** オプションを追加。
- **デフォルトfalse**。`plannedSourceMode:true` および `addArchitectureGuide:true` が必要。旧`compactPlannedGuide:true`との併用は禁止。
- 新プロファイル選択時のみ `messages[0].content = R21_FUTURE_GUIDE`、それ以外のR11のメッセージ本文は元と同一。
- `requestBudget.r22QualityOutputProfileOptIn` と `requestBudget.r22QualityGuideSha256` にプロファイル証拠を保存する。
- 元の4-key契約・B143形式、Ollamaローカルループバック限定、JSON原文保存、推論回数の安全性、Minecraft施工禁止は不変。

## 実モデルの許可・接続
**R22はオフライン結線のみ**。今回、新しい実Qwen生成権限は承認されていない。

重要な区別：
1. プロファイルを持つネイティブブリッジの機能は実装した。
2. 旧`scripts/b198zr6-authorized-single-r4-capture.mjs` にR22選択肢を追加していない。
3. R16の固定32ファイル・SHA付き過去コミット、R17単発起動、R20配布ZIPは変えていない。
4. 旧R17の承認は消費済み。どの旧起動ファイルを再実行しても、新たな許可にはならない。
5. 将来の試行を実装・配布する際は、独立の**新しい明示承認**、新規一回限りの承認ロック、プロファイルとSHAの厳密検証、前後の証拠保存を要する。
6. 施工権限とは別。ワールド読取・書込0、readiness `NOT_PREPARED`、9ゲート `BLOCKED`、`BuildPlan.operations=[]` を維持。

## オフラインQA
`scripts/b198zr22-profile-offline.test.mjs` がランダムなエフェメラルポートの偽Ollamaのみを使用して以下を検証：
- プロファイル導入時点で実モデルへの通信ゼロ、プロファイル誤設定は送信前に拒否
- 偽モデル送信は1回、systemメッセージはSHA固定した追加ガイドに一致、ユーザー本来の要求は改変しない
- `stream:false`、`think:false`、3072出力トークン、6144コンテキスト
- 偽モデル原本はバイト単位で変更しない
- 元R11も独立の偽モデルテストで完全に元のガイド本文を送信
- 自動retryなし、モデル美観自動承認なし、Minecraft接続・施工なし
- WindowsとUbuntuのCIログをGitHub上で確認して最終判定する

## 厳しい批評
このプロファイルが示せるのは**正しい制約の伝達と旧コード非破壊**だけ。モデルが実際により美しく機能的な3D図書館を生成するかは未確定。

次の主目的は単なる完全JSONではない。出力原文のB143コンパイル・独立R3動線・入口支持・階床接続・大規模な曲面・吹き抜き保全・独自外観を同時に達成すること。B143や審査基準を緩めて見かけ上PASSにしない。次の生成でも自動施工は認めない。
