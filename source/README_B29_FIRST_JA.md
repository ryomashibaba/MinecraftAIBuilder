# MinecraftAIBuilder — Step 8B/B29 統合引継ぎ

最初にルートの `00_START_HERE.md` を読み、次に `docs/B29_M3_M4_ASSEMBLY_CONTRACT_AND_NEXT.md` を読む。

- B29は室内壁・ドア・階段/床開口/材料の**非施工統一IR**。既存の凍結511ファイルは無変更。
- 5棟30階、壁区画5,704、ドア314、階段25、床開口候補50、共有壁ボクセル3,990を整理。
- オフィス02の外形123/廊下18差分を4案の**未承認レビュー**として保持。
- source 内の `node verify-b29-package.mjs` を優先して実行すること。
- 新規テスト37件＋関連回帰118件=155件PASS。
- M4の9つの施工ゲートは依然BLOCKED。施工命令0件。Windows追加作業不要。
- 次はB30：**実エンジン内部の非施工アダプター**実装。ダッシュボードを増やすより統合コードを優先。

`NOT PREPARED / BLOCKED / NO WORLD / NO EXECUTION / NO LEGACY CHANGE`
