# B112 — 全体統合・施工禁止監査およびローカルWork引き継ぎ基準

## この工程の目標

- B100～B111を保護したまま、建物15案・66概念階・279室の状態を一元化する。
- B109外装の実測セルと表示用形状、B110ドア/階段/家具の位置関係、B111家具占有と室内通行性について、候補ID・元モデルSHA256・階数・室数を突き合わせる。
- 過去の「ブラウザ表示で描画できた」「オフラインの動線が通る」ことを、Minecraft Education実機施工・本物のドア/階段/ベッド動作の認証として扱わない。
- ローカルWork用MinecraftAIBuilderプロジェクトへの引き継ぎ情報を整え、次のチャットでB113専用プロンプトを準備できる状態にする。

## 追加ファイル

- source/parallel/b112/main/b112-readiness-audit.mjs：B109/B110/B111の15案を厳格に突合。B111ソース設計・B110ダイジェスト・B109構造証拠の独立検証。9ゲート・実機未認証を再チェック。
- source/parallel/b112/main/compile-b112.mjs：横断監査を実行し、5成果物（統合JSON、15案CSV、日本語統合レポート、B113の00_START_HERE、Work事前点検）を出力。
- source/parallel/b112/main/compile-b112.test.mjs：新規30件（総606件）の出典・ハッシュ・安全・レポート出力・引き継ぎ安全のテスト。
- scripts/verify-b112-safety.mjs：凍結形状不変、未承認の施工/実機操作が無いことを再確認。
- GitHub Actions artifact: B112-Integrated-Handoff-Review

## B112で確認する事実

B109: 9,203屋根元セルと3,134窓元セルの出所が15案に対応。概念的な見た目の改善でありMinecraftの実ブロック認証ではない。

B110: 279室のドア候補、102の垂直接続、612の踏み面図、558の家具アンカーの継続保存を確認。いずれも実機未認証。

B111: 279室のローカルグリッド上の経路と300案の隣接2セルベッド候補を、IDとダイジェストに基づいて照合。1セル幅の経路と本当の階段・人の通行・避難安全を区別する。

## B113への移行タイミング（ユーザー合意）

**B112は通常チャット＋GitHubで完了する。B112完了時に、必ず「次のB113ではローカルWorkを使用します」と明示する。**

**次のチャットでは開発に着手せず、既存ローカルWork用MinecraftAIBuilderプロジェクトに貼り付ける正確なプロンプトを作成する。**

B113はGitHub mainのB112マージ済みコミットSHAとローカルGitの差分を最初に確認し、ファイルを保護する。正確なMinecraft Educationインストール版と既存ローカル素材辞書の確認は、必要な読み取り権限を確認してから実施する。Minecraft本体やワールドへの接続・コマンド送信・施工は別の明示承認なしには行わない。

## 永続的な安全条件

- B100～B111の凍結原本・既存実装を変更しない。
- 296未承認候補/18保留室を解除しない。
- readiness=NOT_PREPARED; constructionApproved=false; executionAllowed=false。
- 9 gates BLOCKED; BuildPlan.operations=[]; commandCount=0; worldCoordinates=null; worldContacts=0。
- Education 26.3系の正確なインストール版、実BlockState、扉開閉、階段移動、ベッドの衝突、避難安全、人間による建築品質の認証は未実施。
- ワールド・認証トークン・個人情報・秘密のローカルログはGitHubへアップロードしない。
