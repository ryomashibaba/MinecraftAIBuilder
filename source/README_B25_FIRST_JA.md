# MinecraftAIBuilder B25 / M3-G — 読み取り専用・統合接合ルール

**最初に `docs/B25_M3G_JUNCTION_COMPILER_AND_M4.md` をお読みください。**

今回はB24の候補データを再計算し、重複している壁セル3,990件へ、**仮の代表所有者を一意に割り当て、元の壁所有情報をすべて保持**しました。これらはすべて同じ部屋所属の境界でしたが、Minecraft Education上の接合品質・材料一致が確認されたわけではありません。

`reports/B25_JUNCTION_COMPILER_LEDGER.json` には各重複セルの完全な根拠、314ドアの未確定ブロック状態、50階段床開口候補を保存しています。`reports/B25_SUMMARY.json` が要約です。

## 安全なオフライン検証

```powershell
node verify-b25-package.mjs
node --test tests/step8b-m3g-b25.test.mjs
```

別ディレクトリに要約を再生成する場合だけ：

```powershell
node tools/RUN_B25_OFFLINE.mjs <新規の絶対パス>
```

ソースフォルダや既存の出力先は拒否します。Minecraft・Bridgeへの接続はありません。

### 次工程

M4の実機確認は未実施です。材料ID、ドア上下ブロック・向き・蝶番、支持と階段床開口、world anchorを静的に照合してから1回の読み取り専用検査にまとめます。**施工を許可しないまま**進めます。

`NOT PREPARED / BLOCKED / BuildPlan.operations=[] / commandCount=0`
