# R190-BR — native JSON Schemaの重複提示を減らす、通信0の比較実装

2026-10-30 JST。R190-BQ（実ボクセル独立審査）を保持して継続する。

## 直接の対象
R190-BMの本物のQwen3:14b高層ビルA/Bでは厳密B143成立0/2。上下階・空間・階段・構造的外形が不成立。R190-BOは新Spatial Assemblyと native `format: JSON Schema` を導入したが、モデルへの実送信は0だった。

R190-BOの実行リクエストは同じフルJSON Schemaを (a) native Ollama `format` と (b) user message内 `JSON Schema=...` に重複提示していた。モデルへの文字情報が長くなると、利用可能な文脈・メモリ資源・アーキテクチャ記述に不利かもしれない。ただし、重複提示がモデルの型遵守に有利な可能性もあり、**どちらが実際に優れるかは推論なしでは判断できない**。

## 実装した二つの選択肢
- `repeated`（既定）：旧BO互換。user messageにもフルSchemaを複写する。旧仕様を削除しない。
- `native-only`（明示的な比較候補）：フルSchemaはnative `format` のみに保持。user messageはホストSHAと元依頼だけ。systemの`SPATIAL_GUIDE`、型、材料、階段制限、作者の設計権限、モデル/seed/context/output予算は完全に同じ。

生成物では、`schemaPrompt`・`userMessageBytes` とexact request SHAをpreflightに記録。inspect時はモード・本文bytes・依存コードSHA・JSON Schema・元依頼SHAを再構築して照合する。既存BOの承認フレーズは使い回せない。モード変更は送信依頼bytesを変えるので新しい固有UUID・個別承認が必要。

## 通信0での操作

```powershell
node scripts/r190bo-spatial-local.mjs prepare --model qwen3:14b --out NEW_BR_NATIVE_PREFLIGHT --schema-prompt native-only
node scripts/r190bo-spatial-local.mjs inspect --prepared NEW_BR_NATIVE_PREFLIGHT
node scripts/r190bo-spatial-local.mjs prepare --model qwen3:14b --out NEW_BO_REPEATED_PREFLIGHT
```

`node scripts/r190bo-offline-study.mjs --out NEW_BR_OFFLINE_STUDY` は、既存の合成BN・未修理BM原本比較に加えて、両モデルタグ（Qwen3:14b/Gemma4:26b）について `repeatedWireBytes`、`nativeOnlyWireBytes`、`savedWireBytes`、system/Schema/元依頼不変条件、distinct SHAを `STUDY.json` 内に保存する。バイト削減は**送信要求の長さ**であり、実際のモデル側トークン量やVRAM消費量、品質向上率ではない。別のモデルやバージョンへの一般化を主張しない。

## 実験の安全境界
- 新しいQwen/Gemma実モデル推論0、HTTP 0。元BMの原文・HTTP/INVENTORYを変更しない。
- native `format` の実Ollama対応・モデルのJSON遵守・設計の独創性・建築機能改善は未知。模型代理・合成成功を実モデル成功と言わない。
- exact request + UUID単発承認の事前確認、1 POST上限、再試行0、ネットワーク禁止CI、原文保全、HOLDの非0終了コード、BN/BQ検査、Minecraft施工禁止を維持。
- 以前生成したpreflightは新コードのsourcePins照合により拒否されうる。**古いpreflightを使い回さず、新しいコードで作り直して新たな個別承認を求めること。**
- 完了判定は既存Windows/Ubuntu専用CIに追加したモード比較・個別承認拒否・改変拒否・実CLIの回帰による。CI合格を美術PASSと誤認しない。

## 次の本質的工程
ユーザーの明示個別承認とローカル実行環境が整えば、一度だけ新形式の原回答を生成し、元原文をそのまま保存して、上位用途・立脚階・室内空気・大広間・動線・外形と美術を独立評価する。今回の二方式は統制された**実モデル**比較をまだ行っていないため優劣は未決定。
