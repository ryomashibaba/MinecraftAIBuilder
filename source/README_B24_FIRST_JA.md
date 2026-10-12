# MinecraftAIBuilder — B24 / M3-F 非施工アセンブリ

**最初に `docs/B24_M3F_FINDINGS_NEXT.md` を読んでください。**

このチェックポイントは、B23で作られた118件のドア移設候補を、凍結済み5棟・30階の壁所有・ドア開口・階段床板候補と一括照合したものです。実施工可能なBuildPlanではありません。

- ドア／壁のモデル上の重複：236→0 ボクセル
- **壁／壁の重複所有：3,754→3,990 ボクセル（+236）** — 接合・所有ルール未解決
- 階段の床開口：25階間／50候補セル、実際の床変更 **0**
- 階段候補と仮想壁の重複：0（Minecraftでの通行性は未証明）
- 関連テスト: B24 35件 + B21 44件 + B22 30件 + B23 34件 = **143/143 PASS**

## 検証

```powershell
# ZIPを解凍したsourceフォルダ内で行う非施工ローカル検査。Windows操作は今は不要。
node verify-b24-package.mjs
node --test tests/step8b-m3f-b24.test.mjs
```

出力を別フォルダに生成する場合に限り `node tools/RUN_B24_OFFLINE.mjs <未作成の絶対パス>`。

**`NOT PREPARED` / `BLOCKED` / `BuildPlan.operations=[]` / `commandCount=0`。**
既存建築、Legacy設定、B23以前の凍結証拠を変更しない。施工・接続・ワールドアクセスの承認は存在しない。
