# B113 — ローカル実環境と建築互換性のオフライン診断

## 到達点

概念を施工済みと認証せず、実装時に破綻する階段・廊下・家具の条件を具体化した。B100～B112のソースと凍結原本は変更していない。B113専用の診断・修正案を追加し、元モデルへ適用しない。

- 15案 / 66階 / 279室 / ドア279候補 / 階段102接続 / 家具558アンカー / ベッド300組を継承。
- 6踏み面の底面階段への単純置換は102接続すべてで床上面を1ブロック超過。下側31接続、上側84接続は既存踊り場セルから段への水平距離が1を超える。
- 5ブロック上昇の直線階段を、半段差・支持体・上下踊り場・頭上包絡として検査。必要寸法は幅2×長さ7。上階床と下階天井の開口を別々に計算し、踊り場の支持床は維持する。
- 元の3×3コアを拡張する寸法候補は78接続で見つかった。残る24接続では、室・他コアを避ける同条件の直線案が見つからない。候補には廊下再接続・開口・支持体の統合が必要で、実用階段と認証しない。
- 内装の入口前とベッド側面への接近条件で99室を要修正と診断。アンカー固定のまま2セル目を回転して95室改善、4室は再設計が必要。
- 元ギャラリーの連続セルをBFSで検査。地上第1入口／上階B105主コア接続位置からは35室、各階の全入口／全コアを起点とする和集合では230室へ横接続する。複数コアを起点とする和集合は、一つの入口から建物全体へ行けることを意味しない。
- 室とコアを移動せず、2×2の通路を追加するオフライン案は279室へ横接続する。追加3,660セル、主コア接続位置の変更案3か所。これは大きい再設計案で、床・天井・外装や新しい階段との統合が必要。追加量を施工効率や完成度と取り違えない。

## 環境と引き継ぎの事実

確認日: 2026-10-13（日本時間）。

- 元のローカルWorkフォルダーはWindowsから読み取り可能。ただし `.git` と B112ソースは存在しなかった。ローカルHEAD、作業ブランチ、未コミット差分は「比較不能」。既存ファイルは全て保護し、未追跡ファイルとして新しいGit管理へ取り込まなかった。
- 新規の隔離チェックアウト `b113-local-work` を作成。基準main/HEADは `8b8b1f726fc5cf82b6d3e633f24ca219164983fc`。GitHub mainと指定B112基準は一致、開始時の隔離チェックアウトはclean。作業ブランチは `b113/offline-education-compatibility`。
- 既存GitHub作業ブランチはB101～B112の12本とmain。上書き・削除・force pushはしない。
- Windows 11 build 26200、PowerShell 7.6.5、Node.js 24.18.1、Python 3.13.15、Git利用可。GitHub CLIはPATHで見つからない。GitHubコネクターとGitによるネットワークアクセスを使用。
- Windowsパッケージ登録とAppxManifestは **1.26.3200.0**。Minecraft Education実行ファイルのFileVersion/ProductVersionは **1.26.32.0**。ゲームは起動していない。この記録は今回のWindows観測値であり、CIのLinuxにEducationが存在するという主張ではない。
- B112 CI run `38411320204` の `B112-Integrated-Handoff-Review`、artifact ID `11821238426` の `00_START_HERE_B113_LOCAL_WORK_HANDOFF.md` を取得して読んだ。生成元SHAは上記B112基準と一致。
- B112統合コードもローカル再実行し、279室・102接続・300ベッド・9 BLOCKEDを確認。正本CIの統合JSONのintegrityは `027fcd590ed364656915f39f0e07395e6e54e6a6862c459b29a67ba0d48fbb15`。初回Windows既定言語での生成値とは異なったため、以下の原因を解決して正本の15案へ照合した。
- 元ローカルのエンジン、素材辞書、互換性コード、検証ログの存在を確認。旧設定の `v26.3` は略称で正確な版の証明にならない。旧ログにはワールド情報が含まれ得るため、B113の実機認証として転用・アップロードしない。

## 9役割のブロック仕様

以下は**現行Bedrock公式資料の候補**。Education 1.26.32.0での状態受理・設置・挙動は全て **UNVERIFIED**。

| 役割 | 参照ID | 状態候補 |
|---|---|---|
| door | minecraft:spruce_door | minecraft:cardinal_direction、door_hinge_bit、open_bit、upper_block_bit |
| stairs | minecraft:oak_stairs | weirdo_direction、upside_down_bit、minecraft:corner |
| frame | minecraft:oak_planks | なし |
| glass | minecraft:glass | なし |
| bed | minecraft:bed | direction、head_piece_bit、occupied_bit |
| shelf | minecraft:bookshelf | なし |
| desk | minecraft:oak_planks | B110参照を保存。B113机案の構成材とは区別 |
| seating | minecraft:oak_stairs | 階段と同じ |
| generic | minecraft:barrel | facing_direction、open_bit |

状態候補の許容値:

- `minecraft:cardinal_direction`: north/south/east/west。
- `direction`と`weirdo_direction`: 整数0～3。前者の公式汎用対応は0=South、1=West、2=North、3=East。ベッドの足→頭への対応はまだ受理・設置確認が必要。後者の値→上り方向は未確定。
- `facing_direction`: 整数0～5の候補（0=Down、1=Up、2=North、3=South、4=West、5=East）。名前空間付き `minecraft:facing_direction` の文字列状態と混同しない。
- `minecraft:corner`: none/inner_left/inner_right/outer_left/outer_right。Javaの `straight` を渡さない。近接階段による更新と、この値をEducationへ渡せるかは未確認。
- `_bit`列挙値: boolean false/true候補。数値0/1を自動変換しない。

版差の具体例:

1. 現行ブロック一覧のspruce_doorは名前空間付きcardinal状態。公式Aux表は旧 `direction` を記載。別スキーマとして扱う。
2. oak_stairsの現行一覧にはcornerがあるがAux表にはない。旧表からcorner受理を推定しない。
3. Intrinsic一覧の `facing_direction` は文字列記載、States and Traitsの同名は整数記載。樽について現行Traits＋Auxの整数を参照候補にするが、矛盾も診断へ残す。
4. 未知の状態、値型の違い、省略状態、正確な版の不一致は診断エラー。別バージョンへ証拠を自動流用しない。現段階にはEducation VERIFIEDへ昇格するAPIを設けていない。

インストール済みの標準 `resource_packs/vanilla/blocks.json` をゲーム非接続で読んだ。spruce_door/oak_stairs/glass/bed/bookshelf/barrelの描画キーが存在する。一方oak_planks/oak_fence/oak_slabの直接キーは存在しない。**描画キーの有無はランタイムIDの受理や未対応の証明ではない**。辞書SHA256だけを記録し、配布ファイルは複製・アップロードしない。

## ドア・階段・家具の実装条件

ドアは同じx,zでyが1違う上下ペア、upper=false/true、向き・ヒンジ・開閉の整合を検査できる。B110の279ドアは状態値未割当なので、ペアの位置確認と状態の未確認を分ける。入口前の2セルは保守的な接近予約で、ゲームの扉が隣セル全体を掃くという仕様ではない。実際の開いた扉の薄い衝突形状と更新順は次の実機課題。

直線階段のサンプルと掃引包絡は、幅0.6・高さ2の保守的な仮定。底面階段の半段差、上下の支持床への移行を仮定する数学モデルで、ゲームの物理エンジンを再現したものではない。曲がり段の衝突・隣接形状・上り方向を未確認のまま3×3リングを通行可能としない。ただし、あらゆる3×3らせんが不可能と証明したわけでもない。

家具は同じアンカーを再利用し、次の組立候補と占有を明示した。

- ベッド: 足・頭の隣接2セル、両セルの支持と側面接近を予約。枕側・睡眠・スポーン挙動は未認証。
- 本棚: bookshelfを2段にする陳列。コンテナー機能を持つ収納とは説明しない。
- 机: oak_fence支柱＋oak_slab天板、保守的に高さ2を予約。スラブの上下と支柱上への設置可否は未確認。
- 椅子: oak_stairsの装飾椅子。通常ブロックのみでプレイヤーの着席機能を提供すると認証しない。
- 収納: barrelの1セルと接近側。開口向き・操作・中身へのアクセスは実機未検証。

残る4室はHOTEL_V3のL1 S004/S005、APARTMENT_V3のL3/L4 S004。アンカー固定の2セルベッド回転だけでは両家具への側面接近を確保できない。ベッド数の削減、アンカー移動、室寸法変更の比較が次のオフライン課題。

## 実行と確認

リポジトリルートから:

```text
node --test source/parallel/b113/main/compile-b113.test.mjs
node scripts/verify-b113-safety.mjs
node scripts/verify-freeze.mjs
```

テストは元B111を一度だけ生成して全15案を診断し、JSON・15案CSV・代表5案の日本語レポートを `b113-review-output` に出す。開発時の親キャッシュはローカルartifactsに限り、15案の固定ソースSHA・B110/B111ダイジェストを照合する。通常実行とCIはキャッシュ無し。既存のB92～B112 QAを改変せず、B113専用CIを追加した。

初回B113 CIはWindows生成時のダイジェストと不一致で失敗した。B102の部屋用途とB104の同点選択に、言語指定なしの `localeCompare` が使われているため、Windowsのja-JPとLinuxのen-USで配列順が変わることを特定した。失敗は無視せず、B112正本CI成果物との全15案照合で確認した。

B113ではWorkerの独立したJavaScript環境で、言語未指定の比較にだけen-USを明示し、B111を再生成する。呼び出し元のString/Intlや凍結ソースは変更しない。Workerは外部プロセス、ネットワーク、Minecraftへ接続しない。正本CIのB110/B111ダイジェストと一致する値を固定し、Windows側の異なる生成値を正本へ昇格させない。テスト開始時に一度だけ再生成し、その処理が失敗した場合も再生成を各テストで繰り返さない。

実機未認証の認可昇格、ハッシュ再計算を伴う安全値の改ざん、凍結ファイルの変更を失敗させる。常にNOT_PREPARED、9 BLOCKED、constructionApproved=false、executionAllowed=false、worldContacts=0、worldCoordinates=null、BuildPlan.operations=[]、commandCount=0。旧296未承認・18保留も維持。

## 次工程の優先順

1. 別途承認されたEducation 1.26.32.0の専用試験環境で、ドア上下・向き・ヒンジ・更新順・開閉通行を確認。
2. 5上昇の直線階段、上り方向、頭上空間、上下支持床と開口を確認。
3. ベッド2セルと枕側・側面接近・使用を確認。
4. 机の支持、樽の向きと操作、本棚・椅子の機能制約を確認。
5. オフラインでは、24接続の代替階段と4室の内装、追加通路を外装・床・天井に統合する設計へ進む。

実機の対象ワールド・操作範囲・目的・影響を具体化して明示承認を得るまで、本体起動、ワールド読取、WebSocket接続、座標変換、ブロック設置/破壊を行わない。B113では一切実施していない。

## 公開一次資料

- [Bedrockブロック一覧](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/vanillalistingsreference/blocks?view=minecraft-bedrock-stable)
- [Intrinsic状態一覧](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/intrinsicblockstateslist?view=minecraft-bedrock-stable)
- [状態・Traits一覧](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockstateandtraitlistings?view=minecraft-bedrock-stable)
- [旧Aux対応表](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/auxvaluetoblockstatemap?view=minecraft-bedrock-stable)
- [Education更新履歴](https://edusupport.minecraft.net/hc/en-us/articles/360047556451-Minecraft-Education-Change-Log)

閲覧日2026-10-13。公開stable資料は将来更新されるので、候補ドメインのスナップショットと観測版をコードに固定。公式Bedrock記載とEducation実機認証は最後まで区別する。
