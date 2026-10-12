# B44 Main: ChatGPT 3チャットの非施工統合

## 統合済みの範囲

- サブA (`../sub-a/`)：集合住宅6階・78ドアの条件付き動線計算。短連絡路は壁24セル改修を仮定。長距離迂回は比較用。
- サブB (`../sub-b/`)：5棟30階の床・外形・屋根投影・室内候補をまとめた純粋な形状IR。旧B17対B29/B31に118ドア候補相違。
- サブC (`../sub-c/`)：M4-01～09をすべてBLOCKEDにする過去証拠の事前照合、非実行IRの厳密バリデータ。
- メイン (`integrate-b44.mjs`)：A・B報告を原点データから再生成して検証、Cへは最小限の読み取り専用レビュー包絡だけを渡す。建築コマンド変換なし。5棟のうちAの動線検証は1棟のみ。

## インターフェース上の既知不一致

サブCの生IR入力検査は、サブAの原報告に対し `MISSING_BLOCKED_STATUS`（安全状態がネストされた場所にあるため）、サブBの原報告に対し `EXECUTABLE_PAYLOAD`（`exteriorEntryPlacement:'UNKNOWN'` が禁止フィールド語彙に一致するため）を返す。これは**自動採用しなかった**理由であり、不審な安全条件を解除する理由ではない。

そこでメイン側で、A/Bの自己検証と入力のハッシュ固定再生成を**先に通した場合だけ**、Cの既存の厳密チェックに安全なレビュー包絡を渡す。実際の元報告がCに直接受理されたことは主張しない。Cファイルを改変していない。

## メインの再実行

`source` で実行：

```bash
node verify-b43-package.mjs
node --test parallel/b44/sub-a/circulation-b44a.test.mjs parallel/b44/sub-b/structure-b44.test.mjs parallel/b44/sub-c/sub-c.test.mjs parallel/b44/main/integrate-b44.test.mjs
node parallel/b44/main/run-b44-main.mjs
```

`run-b44-main.mjs` はデフォルトでJSON要約をstdoutに表示するだけ。`--output` はメイン所有フォルダ内の**存在しない新規ファイル**にしか書き込めず、`wx` 排他作成。Minecraft、Bridge、Windows、実プランナーを呼ばない。

## 次工程

1. メインは5棟30階の非施工共通プランナー（ソースでの意図と生成候補の差分）を優先。5棟全体の外観・屋根・素材に承認可能な設計候補が不足している。
2. サブA: D012を含む78/78は概念経路。特にL1用の代用床、壁24セルの移設、部屋面積・通行幅が未検証。
3. サブB: 118/314のドア世代差分と50床開口/25階段接合の支持、外観モジュールの素材・窓・屋根を非施工で調整。
4. サブC: 普通ドア・階段/スラブの実stateとWindows実行中のプロセス同一性は未検証。M4全9ゲートを維持。生IRスキーマの語彙に関する誤検出の改善はサブC担当で次回明確に検討可能。

## 絶対安全

**NOT_PREPARED / BLOCKED / 9 M4 BLOCKED / BuildPlan.operations=[] / engineCalls=0 / 実施工0**。B43原本とサブA/B/Cは変更しない。これは設計・静的レビューの統合であり、建物やゲームの物理検証ではない。
