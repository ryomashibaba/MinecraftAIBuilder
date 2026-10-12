# Step 8B/B7.1–B7.6 — オフライン建築プレビュー統合（2026-10-10）

## 第一原則
**施工禁止。** BuildPlan.status=`NOT_PREPARED`, operations=`[]`, commandCount=`0`, deploymentGate=`BLOCKED`。既存建築、Legacy、元凍結証拠、Windows側ソース/実機ログは一切変更せず、新しいオフラインファイルだけを作成した。元のB3/B6レポートは固定SHAで監査し、ユーザーの設計選択は自動変更しない。

## B7.1–B7.6 実装
1. **B7.1** 原本のWindowsスナップショット249件のSHA照合と、B3ホテル・集合住宅・オフィス／B6レポートの凍結SHAピン。元の単純checksumを計算し直した改ざんもピンで拒否。
2. **B7.2** 5候補について概念矩形とエンジンソースから独立再現済み矩形を統一グリッドに射影。1～6階の差分マスクを階別生成。`B`共通、`C`概念のみ、`S`ソースのみ、`.`空き。既存の概念設計を**全く上書きしない**。エンジン予測を表示の主基準にするだけ。
3. **B7.3** 北東南西のローカル回転後でも、コンセプト/ソース/差分セル数が一致することを確認。world anchor / terrain / world orientation は一切設定しない。
4. **B7.4** U字型ホテルの6寸法×4方向×3seed×3styleの216条件を再点検。以前B6の1,728条件中の問題36件と一致。ソースの公開されている出入口北側露出run条件の**静的ミラーのみ**。実際の入口moduleや施工安全を証明したものではない。
5. **B7.5** 問題36条件それぞれについて、候補生成前チェックおよびseed変更・style変更・敷地幅拡大・massing変更の**提案だけ**を生成。各候補の露出runを再計算し、ユーザーの明示的な設計判断が必要だと表示。元設計は不変。自動適用0件。
6. **B7.6** シングルファイルHTMLダッシュボードを作成。候補選択、階切替、概念/ソース/差分の重ね合わせ、ローカル回転後の表示、入口失敗36条件の提案一覧に対応。ネットワーク・Builder・APIへの接続なし。

## 非自明な追加確認
- オフィス `candidate-02` の非対称形状は、概念の翼部幅5に対してWindowsソース予測は6。概念のみ占有は階別 `[22,22,22,22,22,13]` で合計**123セル**。B7は表示をエンジン予測に合わせたが、**元の設計を修正して差分をゼロにしたわけではない**。
- ホテルサンプルは`slab`を明示指定している。Windowsソースの`createComposition`は、プログラムごとのmassings候補を自動選択に使う一方、**明示massingは全体レジストリで検証する**ため、`slab`をホテルで即非対応とは判定できない。B7は `EXPLICIT_ENGINE_REGISTERED_ONLY` と表記する。これは実施工保証ではない。
- 既存5候補の入口幅前提はB6から変わらず。36件の予測不足は境界探索で発見した未採用候補についてのもの。

## QAの正確な範囲
- **このターンでB7含むStep8B系135/135 PASS、FAIL0、SKIP0**（Linux Node.js 22、読み取り専用）。B7新規25件を含む。
- 過去のB6（Step8A系80を含む）190/190 PASSのTAPを継承。
- **Step8A系80件のこのターンでの一括再実行はタイムアウトし、全件PASSと主張しない**。前回の証拠は有効な過去時点のものとして区別。
- Windowsで新規試走・実際のPlanner実行・Bridge接続はしていない。稼働中エンジン同一性は依然未証明。

## 主な成果物
- `runner/step8b-review-b7.mjs`: 非施工二層形状＆入口代替案レポート
- `runner/step8b-visual-b7.mjs`: オフライン比較HTML生成
- `tools/RUN_B7_OFFLINE.mjs`: 新規ディレクトリのみへの安全な結果出力
- `tests/step8b-review-b7.test.mjs`: B7新規25テスト
- `reports/B7_RECONCILED_REVIEW.json`: B7静的レポート
- `previews/B7_DUAL_LAYER_REVIEW.html`: ダウンロードしてブラウザで開く単独HTML
- `qa/B7_STEP8B_DIFFERENTIAL_QA.tap`: このターンで実行した135テストの実証
- `FILE_SHA256.json`, `verify-package.mjs`: パッケージのSHA固定

## 再実行（必要な場合のみ）
生ソース ZIPはこの軽量チェックポイントに同梱していない。元の `MinecraftAIBuilder_Step7S_Windows_SourceSnapshot_20261010_182754_46acb598.zip` を**安全な新規フォルダ**に別途展開し、`STEP8B_SOURCE_DIR`で指定する。生Windows実機ログはB7だけなら不要。

```bash
export STEP8B_SOURCE_DIR=/path/to/verified-windows-snapshot
node --test --test-concurrency=4 tests/step8b*.test.mjs
node tools/RUN_B7_OFFLINE.mjs "$STEP8B_SOURCE_DIR" /path/to/not-existing-output-directory
node verify-package.mjs
```

## 次工程 B8（推奨）
B7の非施工プレビューに、候補生成UIとコンプライアンスチェックを集約し、デザイン選択をレビュー記録として保存する。**自動施工への接続や既存の凍結設計の自動書換えはしない。** 安全ゲート8項目のうち施工に関わる7項目は引き続き未解決。現時点でWindows操作は不要。
