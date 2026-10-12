# B44 SubC — Education Edition互換証拠 + 非実行IRバリデータ

## 適用範囲と安全性

B43凍結レポートの**読み取り専用**照合と、サブA/B設計IRの**オフライン受理判定**だけを提供する。現行Minecraft Education v26.3は**過去記録の版名**であり、現在のWindows実機・ゲーム/エンジンに同じ版がロードされているとは証明されない。静的バリデータの受理は施工承認や実際の歩行/階段/ドア動作の認証ではない。

- 常に `NOT_PREPARED` / M4-01〜M4-09 全て `BLOCKED` / 施工0件 / エンジン0呼出し。
- 対象モジュールはMinecraft/Bridge/Socket/HTTP/プロセス起動・pack生成の呼び出しを持たない。
- `run-offline-preflight.mjs` は指定した既存レポートを読み、標準出力へ非実行JSONを出すだけ。**原本に書き込まない**。
- A/B入力は外部データとして扱い、ネストされた権限昇格・material/block ID・state実値・世界位置・操作命令をrejectする（fail closed）。

## 配置とコマンド

ZIP内 `changes/source/parallel/b44/sub-c/` を、検査済みのB43 `source/parallel/b44/sub-c/` に置く（B43原本と他サブ担当のディレクトリは触らない）。以下はレビュー用のNode単体コマンドで、Minecraft実行/接続なし。

```sh
cd source
node --test parallel/b44/sub-c/sub-c.test.mjs
node parallel/b44/sub-c/run-offline-preflight.mjs --source .
node parallel/b44/sub-c/run-offline-preflight.mjs --source . --role sub-a --ir /path/to/A-review-only.json
node parallel/b44/sub-c/run-offline-preflight.mjs --source . --role sub-b --ir /path/to/B-review-only.json
```

`--ir` はまだ届いていないA/Bの実成果について将来使うオプション。必須の受理条件は `minecraftaibuilder-...-vN` スキーマ、明示 `constructionApproved:false` / `executionAllowed:false`、明示的な `NOT_PREPARED`・`BLOCKED`・レビュー専用statusのいずれか。未記述・曖昧な安全状態は拒否する。コードは一切修正・補完・実行せず、レビュー合格フラグのみ返す。

## 出力

- `evidence-report.json`: B26/B28/B29/B43の照合ピン、9つのM4 BLOCKEDゲートの理由と未証明事項、各compatibility checkの状態、歴史的profile内verified/unsupported集計と現在のunknown状態。
- `safety-validator.mjs`: A/B IRと凍結B43設計IRに使える純粋・再帰的なfail-closed checker。
- `preflight.mjs`: SHA-256ピンと報告の安全性を検査し、完全に非実行の9ゲートJSONを返す。
- `run-offline-preflight.mjs`: 上2つのオフライン専用CLI。保存済み報告以外にB43原本を変更しない。
- `sub-c.test.mjs`: 原本2種の正常受理と攻撃/未知の拒否、証拠ハッシュ改ざん拒否等。
- `qa-results.json`: 実行済みのオフラインテスト概要。

### 判定語彙

`verified` は**対象scope内だけの確定**。`archive-v26.3-profile` の verified は2026-10-10のアーカイブカタログ記録が照合された意味であり、現在のゲームに配置できる証明ではない。`unsupported` はアーカイブ内139件の履歴分類で、特定ドアや階段や現在のバージョンをunsupportedと推測したものではない。未証明の実ドアやstairs/slabのstate、collision、支持、live runtime、world anchorはすべて `unknown`。普通ドアstateの過去正確記録0件は、存在しない証明ではなく未知。

## 統合上の制限

- サブA/Bの**実際の差分IRはこのZIPに含まれない**。今回受理済みは合成A/B例と凍結B43の設計IR2種であり、実A/B IRの実行結果は未検証。
- フォーム全件への未知の任意キーに完全対応するコンパイラではない。今後のA/Bスキーマに正当な新規フィールドを追加した場合、false positiveが起きても安全状態を緩めずサブCルールを見直す。
- バリデータはレビュー可能性だけを判定し、設計の妥当性、材料の合法性、実ドアの向き、上下ブロック状態、半ブロック、階段の足場、実プレイヤーの移動、実施権限を保証しない。
