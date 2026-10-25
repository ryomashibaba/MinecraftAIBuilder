# MinecraftAIBuilder — AI再開入口・現在地（短い更新文書）

**新しいチャットの最初にここを読む。** [固定憲章](AI_PROJECT_CHARTER_JA.md) と併読。毎日の完全統合引き継ぎ文は不要。
この文書は**最後に人がGitHubで確認した時点のスナップショット**であり、自動更新の生データではない。再開時は必ずブランチとActionsを最新確認する。

## 現在地（2026-10-24 JSTに確認）
| 項目 | 確定情報 |
|---|---|
| リポジトリ | [ryomashibaba/MinecraftAIBuilder](https://github.com/ryomashibaba/MinecraftAIBuilder) |
| 継続ブランチ | `feature/b198zr1-protected-architectural-revision` |
| 継続PR | [#128](https://github.com/ryomashibaba/MinecraftAIBuilder/pull/128) — Open / Draft / Unmerged |
| HEAD | [開発ブランチの最新HEADを毎回GitHubで確認](https://github.com/ryomashibaba/MinecraftAIBuilder/commits/feature/b198zr1-protected-architectural-revision)（R98の初期実メッシュ検証対象は `9a2b5de9d8ba41a2b7ca4e626aa9d54ff4ffffdd`） |
| 最新確認済み実装工程 | **B198Z-R124 実源Windows/UbuntuテストSUCCESS。ただし65%読書座面の3案すべて頭上Ray5件でHOLD。PR/CIのPASSは建築品質PASSではない。R124は資料保存・回帰基準として保持し、以後の主開発対象から図書館を外す** |
| 次に取り組む工程 | **R125：既存B143＋B198G/Hを使う最短MVP。実Qwen/Gemma→新規非図書館建築の真正3D→安全なMinecraft Education試験施工の未接続部分を確認・実装。8GB Mac小型LLM目標を同時に設計**。詳細は [R125計画](R125_THIN_VERTICAL_SLICE_PLAN_JA.md) |
| 施工・モデル | **2026-10-24 Qwen/Gemma実推論・Minecraft試験施工の包括許可あり（都度承認不要）。** 準備性と各種技術安全ゲートは別途必要。現行コードのNOT_PREPARED / 9 BLOCKEDは自動PASSではない |

**最新情報への直リンク：** [ブランチの現在地](https://github.com/ryomashibaba/MinecraftAIBuilder/tree/feature/b198zr1-protected-architectural-revision) ／ [Actions一覧](https://github.com/ryomashibaba/MinecraftAIBuilder/actions) ／ [PR #128](https://github.com/ryomashibaba/MinecraftAIBuilder/pull/128)





## R138 — two-wing branching topology made real from exact 3 archived Qwen3-14B semantic designs (2026-10-25 JST)
- R137 is confirmed fully GREEN: 54/54 + 111/111 source-only tests. CI built six real B143 source scenes from three SHA-pinned user Qwen14B replies. Derived furnished voxels: 2921 / 3103 / 2874, with 4 functional rooms and all 8 original Qwen-selected semantic features each. Host-corrected depths: 22→27, 20→29, 20→26; first also corrected roof material `sawtooth` to existing `metal`. These outputs are actual compiled host derivatives, NOT original replies passing unaided nor artistic PASS, and world writes=0.
- The next real limitation is R134's forced single-row 3/4-room plan, leading to indistinguishable elongated rooms and semantically wrong entry-zone ordering. New generic R138 branch topology *physically changes* internal walls into a four-wide central pedestrian spine serving side-by-side rooms in two rows, with actual two-block physical doorways, no genre-specific room lookup, and independent B143 source route verification.
- `source/ai/r138-branching-topology.mjs` is a provenance-explicit host-generated alternative. Original Qwen floorplan, exact room identifiers, purposes, 8 equipment choices, material expression, original R137 geometry hashes and raw response SHA are immutable. `scripts/r138-user-branch-comparison.mjs` recompiles alternate model-intent-preserving 3D for all 3 real captured Qwen cases and outputs a side-by-side 6-scene rotating visual review `R138-REAL-QWEN14B-STRIP-VS-BRANCH-3D` plus geometry evidence. This must be used for human art review; neither compiled topology nor route certification implies in-game player motion or aesthetic approval.
- R138 derivation intentionally requires Z-oriented 3/4-zone source plan and a large enough shell footprint (width≥24, depth≥24), rather than pretending universal adjacency graph support. Extending to true model-chosen spatial placement graphs, semantic entrance requirements and irregular massing requires another real design-IR capability step after inspecting output.

## R137 critical preflight contract fix (2026-10-25 JST)
- CI replay caught a more fundamental R134 input-contract mismatch than roof and footprint: fresh natural-language briefs were allowed up to 800 chars, but `validateR134MultiZonePlan()` reused a 180-char per-room description limit for the WHOLE brief. The user-supplied real R136 test briefs were 384/303/303 chars; all three stopped immediately on that field before roof/footprint could even be validated. The roof/footprint discrepancies remain real LATENT errors, not the first observed failure cause. R134 now accepts a full 800-char brief, retains it in provenance/plan, limits only the display-oriented B143 `design.brief` to its pre-existing 500-char bound, and keeps the B143 title max100. The 180-char per-room purpose limit remains in place.
- Added regression validating the real previously blocked long brief contract and full brief preservation, without changing earlier saved sources. Re-run all user captured three JSON outputs through R137 bounded recovery after this fix.

## R137 — user-provided REAL Qwen3 14B R136 failure diagnosis, original source replay (2026-10-25 JST)
- The user ran the requested LOCAL three-brief Qwen experiment and uploaded `r136-real-20261025-122420.zip`. Real Ollama `qwen3:14b` was auto-selected from installed models (Gemma4 26B, Qwen3.8 27B, Qwen3 14B). Three actual model POSTs produced meaningful 4-room plans with 8 objects each, but ALL three source compiles HOLD before 3D. Times: 24.214/14.016/13.836 seconds, total 52.444 seconds. Case #1 incorrectly emitted `materials.roof:'sawtooth'` equal to `form.roofProfile`, and used 4 rooms with depth22 where R134 minimum source-only is23. Cases #2/#3 used 4 rooms of depth20 (requires at least23, likely larger for assembled furniture). No original 3D or Minecraft world generated; 9 gates blocked.
- Critical evidence-classification BUG: R136 classed genuine failed model responses as `HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE` simply because `modelAuthoredProgram=false` on compilation failure. Fix uses actual injected provider flag instead. A failed real model is REAL INFERENCE + SOURCE HOLD, not synthetic. Preserve original raw captures SHA and provenance. No retrospective inflation of historical run.
- R137 introduces bounded host layout recovery that can (a) replace a duplicated roof profile name in the roof material field with the existing, valid wall material when it exactly matches the form profile, (b) grow ONLY the model's existing partition axis length up to the explicit site maximum to fit the UNCHANGED rooms and real assembled equipment. Every modification and original raw SHA recorded; remaining unsupported layout/unsafe code stays HOLD. Replays 3 original user-uploaded exact Qwen JSON responses from a SHA-checked compressed fixture via the already-verified B143/route/furniture/gallery code; archive is evidence data, not a fictional model reply or fresh inference.
- Original material/footprint errors remain model mistakes. Any repaired 3D is a HOST-DERIVED derivative of actual model intent, NOT a fully model-authored correct footprint, full aesthetic approval, real Mac-2B capability or Minecraft success. The user is not asked for another local run merely to reprocess unchanged captured responses. Next prioritize real visual inspection of recovered 3D and address overly uniform room topology, then genuine model comparison.

## R136 — actual Ollama Qwen/Gemma one-command cross-brief evidence runner (2026-10-25 JST)
- The R135 FULL CI, including the 3 omitted R134 test suites now correctly registered, passed (54 + 101 source-only tests, not a real model run). `scripts/r136-local-evidence.mjs` provides one self-contained command to run the existing R134/R135 genuine localhost Ollama pipeline across three independent, unseen user briefs and inspect true source/3D versus raw model reply and failure causes. Builds one local `r136-real-<timestamp>` report directory with an index.html side-by-side gallery and R136_SUMMARY.json; no manual ZIP, fixture source editing, GitHub upload, construction or repeated flags.
- Model discovery reads local /api/tags via the existing R125 preflight; auto-selects an installed Qwen/Gemma small candidate if available, otherwise a larger installed model (explicitly labeled NOT a 2B or Mac-8GB proof). `--model <exact Ollama model name>` pins a chosen existing model. One sequential inference per brief; current 3 briefs deliberately cover resilience innovation, biomaterial research, and public experimental education without any genre template in the B143 compiler.
- Preflight unavailable, no Qwen/Gemma, or requested model absent => HOLD without generation. Each model response, plan/3D source, equipment intent and checksum is already saved by the reused R134/R135 runner; model errors and completed cases remain independently inspectable. Provider identity is NOT independently authenticated, and software tests inject a fake provider; no fake small-model claim. Source PASS does NOT certify creative architecture/art, real Minecraft movement, model Mac 8GB perf or world writes; 9 gates remain BLOCKED.
- The next actual capability hinge is to EXECUTE the one command on a local installed model, inspect the real model-produced 3D and empirical errors, then improve the most important observed bottleneck. This GitHub-only chat cannot call the user's localhost Ollama or their Minecraft world. Do not add another abstract benchmark until actual outputs exist.

## R135 CI coverage correction — R134 new test suites were not in node --test (2026-10-25 JST)
- Audit identified that syntax-check and path filters included R134 tests, but the main `node --test` command had accidentally omitted ALL three R134 new suites. Earlier 137/137 numbers describe ONLY the tests executed, not evidence of R134 unit regression success. The historical CI source 3D gallery was executed, but the unregistered unit tests cannot be claimed to have passed.
- Added `scripts/r134-multi-zone-plan.test.mjs`, `scripts/r134-fresh-model-pilot.test.mjs` and `scripts/r134-multi-zone-gallery.test.mjs` explicitly to the actual test runner alongside R135. Treat R134/R135 as pending until the new workflow passes. No test skip or gate downgrade.

## R135 — fresh original room plan AND useful physical room equipment in one model reply (2026-10-25 JST)
- R134's `runR134FreshModel` now accepts the optional `--equipment assembled` flag, keeping its older default unmodified. In furnished mode, ONE short localhost model response selects the new 3/4-room spatial program and one-or-more per-room equipment semantic intents (5 generic roles, no building-type templates). The untrusted response is captured byte-for-byte before validation; the host compiles the new R134 shell into B143, then uses existing R130 assembled solids and R125 2-wide source route/service checks. It refuses model output that forgets a room, invents a zone or asks for arbitrary code.
- Saves BOTH original unfurnished shell (`shell.html`) and actually furnished B143 rotating design (`index.html`), the model's semantic equipment decisions, derived B143 voxels, source access and hashes, in one save-once results folder. This moves beyond empty labeled rooms; NOT a human art approval or proof of a player-usable furnished building.
- Synthetic test doubles exercise three- and four-room generic plans and malicious/truncated model output. They are explicitly HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE; real Qwen/Gemma 2B, Mac 8GB and Minecraft game remain unmeasured, and all 9 world-write gates BLOCKED. Original frozen 14B historical source and #128 Draft PR unchanged. Further progress must prioritize actual 2B model/source evaluation, human 3D review and safe test-world bridge, not adding more source-only mock tests.

## R134B - genuinely fresh user brief -> one local model response -> new real 3/4-room B143 (2026-10-25 JST)
- Added `scripts/r134-fresh-model-pilot.mjs` as ONE local loopback-only model call, with read-only exact Ollama preflight. The user's fresh natural-language brief and site bounds go to the model, NOT a frozen Qwen source plan; model proposes room purposes/order/relative sizes, envelope orientation, material choices and roof/facade. The host stamps the original brief and safely validates/compiles via the R134 generic 3/4-room B143 compiler. Record unmodified raw answer before parsing, keep detailed source/route and rotating 3D HTML; no world I/O.
- CLI: `node scripts/r134-fresh-model-pilot.mjs --model qwen3.5:2b --brief "Invent a compact field laboratory with three distinct areas" --out NEW_FOLDER`. The model MUST actually be present in Ollama; if not, stop without POST. GitHub CI provides only explicit fake-provider tests and therefore DOES NOT establish 2B/Mac/Gemma actual accuracy.
- Added `scripts/r134-multi-zone-gallery.mjs`, a three-scene source-pinned review of true 3/4 zone B143 structures under different axis/weights/roofs/facades, published as `R134-NEW-MULTIZONE-THREE-3D-SCENES`. This demo's IR is author-authored, not new LLM output. Real player navigation, full aesthetics, 2+ storeys, generic arbitrary adjacency and Minecraft world are NOT verified.
- Efficiency and safety: share the B143 viewer, source QA and existing CI, keep zero world writes, 9 BLOCKED gates, no old fixture or PR merge changes. Follow-up should be empirical local small-model generation and visual inspection before adding more abstractions.

## R134 - generic 3/4-room compact spatial program (2026-10-25 JST)
- Implemented `source/ai/r134-multi-zone-plan.mjs`. A new isolated compact IR accepts 3 or 4 distinct use-zones, arbitrary activity purposes, x/z orientation, integer relative area weights, simple envelope material and roof/facade intent. A single generic B143 compiler makes actual walls, supported floor, roof, 2-block interior openings, outdoor entrance and glazing. Source-graph routes are required for every actual room. It rejects footprints too small for usable rooms rather than shrinking to labels.
- The historical two-room R125 ArchitecturePlan compiler and all actual Qwen saved fixtures are unchanged; the new result intentionally exposes the prior source product contract so existing R125 source-route/entrance QA, R130 assembled equipment and R129 independent feature QA can be reused without reimplementing them. No house/shop/library-specific floorplans in the engine; test all z/x 3/4-room programs and source geometry changes from varying weights.
- This is real new 3D generation capability on host-authored short IR, NOT yet a real 2B/Qwen/Gemma inference result or Minecraft-world usage. Single-storey only; 2+ floors and generalized room adjacency graphs still unsupported. Aesthetic design still NOT_REVIEWED; all 9 safety gates blocked, BuildPlan empty.
- Next development should connect a local small-model response to this new program from a fresh user brief, and independently test whether unseen three/four-room briefs produce satisfactory space intent. Do not spend many rounds adding only fixture checks.

## R133 — one-shot uncoached small-LLM spatial planning and semantic equipment (2026-10-25 JST)
- Added `scripts/r133-spatial-onepass.mjs`: a single localhost Ollama POST returns one short JSON object with zoneOrders and objects, without exposing the original splitAxis or the independent evaluation goals to the model. A 2B-class response can choose the floorplan direction and equipment together. No genre-specific plan routing or custom LLM voxel code. Reuse R132 source recompilation, R130 assembled equipment, R129 independent source acceptance and B143 offline rotating review.
- The optional independent criteria are loaded from a separate file, never sent to the model. The shop fixture `scripts/fixtures/r133-shop-independent-goals.json` specifies front/back along z and two substantive equipment roles. An alternative model response along x is permitted to generate 3D but remains `HOLD_INDEPENDENT_FUNCTIONAL_REQUIREMENTS` instead of fake success. Source provenance, raw answer, SHA hashes, independent evidence and an HTML 3D candidate are saved in a new non-overwriting output directory.
- The Chat/GitHub execution environment does not have the user's local Ollama or Minecraft socket; CI executes clearly marked injected test-double requests (shop correct/wrong and multi-level research) but is NOT a real Qwen/Gemma 2B run and NOT user-world construction. To execute against user's exact locally installed model, use one command with `--model`, `--plan`, `--goals` and a new `--out`; no other setup script was added. Model name must appear in local Ollama /api/tags; unavailable models fail closed without a POST.
- Safety remains NOT_PREPARED / 9 BLOCKED / empty BuildPlan. No additional arbitrary-code execution, cloud endpoint, fixed building library, protected-source change, PR merge, or model provenance inflation. Follow-up priority: REAL small model run, compare prompt-to-IR-to-3D outcomes, then broaden restrictive two-zone massing. Do not count synthetic test pass as 2B success.

## R132 - independent spatial intent realized in B143 3D (2026-10-25 JST)
- New generic `source/ai/r132-spatial-relations.mjs` accepts explicit zone-order relations from a caller, never infers spatial semantics from name strings. Under current two-zone-per-level IR, it sets the requested x/z split and near/far zone ordering as the MINIMAL change and recompiles the whole B143 building into a separately hashed derivative. Impossible, cross-level, conflicting and untrusted relations HOLD.
- R132 review compares the genuine saved Qwen shop with assembled equipment but wrong left/right floorplan, then with recomposed front-to-back floorplan, with the same real source voxel compiler, R125 source routes and R129 independent geometry acceptance. The original 933 voxel Qwen source remains byte-for-byte immutable; the new spatial correction is HOST/CALLER derived, **not newly generated by the model**.
- Source-only front/back evidence plus entry-to-all-zone circulation must both pass; the amended source includes an entrance fix only if bounded repair finds it. A three-scene offline B143 rotating comparison and independent JSON are built by CI as `R132-QWEN14B-SPATIAL-ORDER-3D`. Aesthetics and Minecraft physics are not certified; local real-model calls=0, world writes=0, 9 BLOCKED.
- Efficiency check: reuse the ArchitecturePlan compiler, source route checks, visual gallery and independent acceptance; no shop-named hardcoded placement logic, no whole-project rewrite. The NEXT major gap is to collect this spatial IR intent directly from a real 2B/14B Qwen or Gemma call and eventually allow richer plan topology, not to perpetually audit historical fixtures.

## R131 - six-scene real Qwen source 3D comparison (2026-10-25 JST)
- Added scripts/r131-real-3d-comparison.mjs and a connected CI evidence artifact. The two immutable real Qwen14B source plans (shop: 933 voxels, research: 2936) are paired with source-derived compact and assembled furniture scenes: six rotating local HTML viewers plus an iframe-based side-by-side index and precise JSON results.
- The same independent criteria measure each derivative: per-zone item count, minimum 8 real new voxels per required role, one reachable two-wide pad and explicit shop z-axis front-back ordering. The historic shop is split sideways; even when its added equipment is larger, the spatial ordering remains HOLD. Increasing voxels is NOT a certification of useful equipment or design aesthetics.
- Source provenance: the original plans were model-authored in 2026-10-24 evidence; every furniture-intent fixture in this comparison is host/human authored, not new Qwen inference. User visual review remains NOT_REVIEWED, Minecraft world writes=0, all 9 gates BLOCKED, BuildPlan empty.
- Efficiency choice: reuse B143 offline 3D viewer, existing source hashes, general feature compiler, independent audit and the previous review artifact name; avoid a new UI engine or second test suite. After reviewing the visual result, priority moves to a real local Qwen/Gemma source run and whole-building spatial creativity, not more abstract unit probes.

## R130 — 複合設備の真正3D表現 / 効率戦略再監査（2026-10-25 JST）
- 戦略v2の「LLMは短い意味IR、共通エンジンは3D幾何」「ジャンル固定しない」「原本SHA不変」「CIと実機の評価を分ける」「工程数でなく能力を伸ばす」を再確認。R126〜R129は検査側が先行し、設備が単なる数個の直方体に留まる効率上の偏りを認定。
- R129 CI #40148347068 は4件FAIL: B143のvoxel materialは文字列ではなく数値ID。既存ゲートを緩めず正式MATERIALS IDと比較する修正を実施。修復CI [#40149004627](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40149004627) SUCCESS。
- R130で既存の短いモデル出力と完全に別の「呼出側の幾何表現モード」を分離し、任意の \`--detail assembled\` から共通の複合設備（支持脚つき作業面、棚板、段状展示、操作盤、背もたれ等）をB143複数ソリッドで組立。**部屋名/店舗/住宅/研究用途によるコード分岐なし。** R125旧v1は変更せず、v2は別スキーマ・派生ソースとして処理。
- 追加設備の各B143部品と実voxel material IDをR129独立QAでも再コンパイルし、数だけでなく実ボクセルとアクセスを確認する。source onlyであり、機材の実操作・視覚品質・Minecraft実プレイヤー歩行を証明するものではない。構想の美術評価・実ローカルQwen設備IR・8GB Mac 2B・Minecraft試験施工は未実施。
- 今後の順序：既存3用途を使って見た目の多視点比較 → 本物のローカルモデルが出した設備IRで再検証 → 最短MVP施工橋。検査器だけを何工程も続ける旧ループに戻さない。試験ワールド特定/スナップショット/バックアップ/復帰等が欠ける限り NOT_PREPARED / 9 BLOCKED / worldWrites0 を維持。

## R129 Independent functional intent and true B143 geometry evidence (2026-10-25 JST)
- A category-independent functional acceptance engine verifies independently supplied requirements: zone equipment role/count, actual additional voxel volume, remaining reachable two-wide clear paths, and real front/back or left/right zone ordering. Source coordinates and voxels, not the LLM descriptions or self-declared successes, are evaluated.
- The previously named front/back shop is actually split left/right; an independent z-axis requirement therefore remains HOLD. Too-few pieces and tiny fixtures are independently detected. A matching requirement is only SOURCE_ONLY_REQUIREMENTS_MET_REAL_FUNCTION_UNVERIFIED, never an in-world functional or artistic certification.
- The local R127 workflow accepts optional --requirements INDEPENDENT_SPEC.json; original model raw output and independent test requirements remain separate, evidence saved to INDEPENDENT_FUNCTIONAL_ACCEPTANCE.json. Without a spec it is NOT_EVALUATED, not PASS.
- Pinned original Qwen home/shop/research SHA and voxel counts are not altered. No real new Qwen inference, no Mac 2B benchmark, no Minecraft contact or writes. NOT_PREPARED / nine BLOCKED / empty BuildPlan remain unchanged.

## R128 機能設備の実アクセス・高密度配置Source QA（2026-10-25 JST）
- R127の[GitHub Actions #40143280425](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40143280425) はSUCCESS（テストダブルであり新たな実Qwen推論なし）。
- [共通機能設備生成器](../source/ai/r125-functional-layer.mjs)を改良。従来4隅の優先配置と原本回帰を維持したまま、4隅で置けない場合は領域の縁に沿って候補を探索。独立した設備5件以上も同一領域に配置できる可能性を広げる。配置都合で元ボクセルを破壊しない。
- [Source経路監査](../source/ai/r125-source-routes.mjs)に任意の設備「利用側」ターゲットを追加。入口から各機能領域までに加え、各設備の正面・側面に**支持された横2幅・頭上2空気ブロックの経路グラフ**で実際に到達できるかを判定。設備が見えるだけ・部屋には入れるだけの偽PASSを回避。候補が不可なら次位置、全候補不可ならHOLD。
- これはなお限定Source探索であってMinecraftの実歩行・操作範囲・美術・設備の本物の機能ではない。現時点で5役割の小型ボクセル設備を実用設備と認証しない。Qwen/Gemma設備生成の実測、実3Dの人間審査、元ワールドバックアップ/復帰を次の重要な検証とする。Minecraft worldWrites0、NOT_PREPARED・9 BLOCKED維持。

## R127 LLMによる設備意味IR → 汎用B143生成（2026-10-25 JST）
- [1回のローカルLLM設備推論](../scripts/r125-feature-model-pilot.mjs)を実装。任意の既存ArchitecturePlan JSONを読み、ゾーンID・用途・追加の機能要求から、モデルは座標無しの短い \`{"objects":[{"id":"...","zoneId":"...","role":"...","corner":"..."}]}\` のみを出力する。元計画のSHA・schemaは信頼できる呼出側が固定し、既存の共通設備B143コンパイラへ渡す。ジャンル別生成器の追加なし。
- 入口修復は元Qwen設計を変更せず派生ソースとして適用。生のモデル応答、機能IR、3D HTML、ボクセル数、元SHA、2幅Source経路QAを新しい別フォルダに証拠保存。未検証の役割/閉塞/不正なJSONはHOLD。小型LLM向け出力上限768 token、1回の推論のみ、127.0.0.1以外は拒否。
- **CIはテストダブル**であり新しい実Qwen推論は未実施。設備計画の汎用性・美術・実Minecraft歩行は未認証。worldWrites0、NOT_PREPARED、9ゲートBLOCKED、BuildPlan空を継続。
- ローカル試験例: \`node scripts/r125-feature-model-pilot.mjs --model qwen3:14b --plan scripts/fixtures/r125-qwen14b-shop-20261024.json --out r127-shop-features-001\`。同じCLIは任意の適合ArchitecturePlanにも使用でき、既存出力を上書きしない。
- 次の課題は実Qwen/Gemma設備推論と3用途の評価、利用目的に応じた設備の数量/配置の強化、真正3Dの美術審査。現在の汎用5役割/各1〜6ボクセルは実務設備として不足し、これを完成品とは扱わない。

## R126 3D改善前後のオフライン美術レビュー（2026-10-25 JST）
- [実モデル2用途の改善前後4シーン](../scripts/r125-functional-preview.mjs)を新設。実Qwen14B店舗・研究所の**元のB143ソースとSHAを変えず**、別の機能設備IRの派生版も2個生成。各シーンを独立したB143 HTMLにするので、ギャラリー表示の都合で設計IDとソースSHAを偽装・変更しない。GitHub Actions成果物`R125-QWEN14B-SHOP-RESEARCH-FUNCTIONAL-3D`に`index.html`と4 HTMLを出力する。
- 新しいQwen呼び出しは**0回**、展示用設備IRは人間が定義したテスト入力。モデルが設備を発想した結果ではない。研究所旧入口はHOLDのまま記録、修復済み派生案だけSOURCE ROUTE PASS。美術品質とMinecraft実機移動は未認証。worldWrites0。

## R126 実3用途で初めて検出した入口閉塞と保全付き派生修復（2026-10-25 JST）
- 2026-10-25 新規2幅Source経路検査は、**実Qwen旧住宅と研究施設で外部入口のx=11,12と、内部x=12の仕切壁が重なるため、入口の2幅が内部へ続かない**と実測検出（店は初期から入口到達PASS）。旧局所QAのPASSはこの入口の不具合を検知していなかった。最初のR126 CIは期待値が誤り、テスト2件が失敗した。**これは検査器を緩めないで記録すべき実設計不具合**。
- [派生Source修復](../source/ai/r125-entrance-repair.mjs)：元プラン/元B143とSHAを**完全保全**し、別候補B143で幅2の正面CUTだけを移動。新旧ドア域以外のvoxel差分があればREJECT。入口から全部屋と上階への保守的2幅パッド連続グラフ成立を確認できるまでHOLD。施工作業・LLM再実行なし。
- この経路は「2wide x向き足場＋1セルの段差移動」を扱うソース解析で、全方向の幅、Minecraft操作、ワールド接続は依然未認証。閉塞は偽PASSさせず、元住宅・研究施設のsourceは失敗記録のままピン留めする。

## R126 シンプル機能IRとソース経路QA（2026-10-25 JST）
- 新規 [R125機能IR B143レイヤー](../source/ai/r125-functional-layer.mjs)：`{schema,basePlanSha256,objects:[{id,zoneId,role,corner}]}` を厳格検査し、work-surface / equipment-bank / display-stand / storage-rack / seating を汎用実ボクセルで生成。実LLMの文章から暗黙に機能を推測したり、住宅／店舗／研究所の固定様式で切り替えたりしない。**本工程の設備意図はテストfixture側の明示入力であり、実Qwenが設備IRを出した実績ではない**。
- [実ソース経路グラフ](../source/ai/r125-source-routes.mjs)は入口内側から支持床2ブロック幅(x軸)、上方2ブロック空き、移動先の高さ差±1のグラフで全zoneまで到達可能かを数え、壁閉塞はHOLD。階段の5段/上下接続もsourceのみ確認。**全方向2幅や実Minecraftプレイヤーの経路、屋外地形の安全は認証しない**。
- 新機能の配置は既存B143ソース/voxel SHAを変更しない**別派生モデル**としてのみ追加。追加予定位置が埋まっている／支持床無し／既存の入口→zone経路が断たれる場合は位置変更、それも不可ならHOLD。原建築3件は当時の元SHAを回帰テストに保持し、施工は`NOT_PREPARED`／9 BLOCKED／worldWrites0。
- 次は設備特徴量の任意プロンプトを実LLMへ渡す経路、モデル2B目標、そして美術とMinecraft実プレイヤー動線の別々の検証。単に設備が出来たことを完成品と主張しない。

## R125 実Qwen3用途と美術審査の到達点（2026-10-24 JST）
- OMENでQwen14Bを実行し、店舗1階933 voxel（35.313秒）／研究施設2階2,936 voxel（8.059秒）の**真正B143シーン**を得た。旧住宅2620 voxelとあわせて3用途3件。モデル追加推論2回、Minecraft worldWrites=0。
- 詳細と必須の品質不足は [3用途実測審査](R125_REAL_THREE_USE_REVIEW_20261024_JA.md)。**用途別の設備が実体化せず、売場/バックヤードは左右配置なのにfront/backという名前、実体はいまだに箱型が中心**。general B198C HIGHは研究所の段状屋根で1件。ソースQA PASS≠建築用途/美術/実ゲーム歩行PASS。次は共通IRから機能設備の実体化・経路QA。Open/Draft PRを維持し、施工は9 BLOCKED。

## R125 異用途3件の実モデル再現性比較（2026-10-24 JST）
- [2用途ワンコマンドパイロット](../scripts/r125-multiuse-pilot.mjs)、[localhost/stub回帰](../scripts/r125-multiuse-pilot.test.mjs)。既に本物のQwen14Bで住宅`Lumina Residence`が生成済みなので、**住宅再推論なし**で保存済みユーザー提供住宅計画のSHA/2620セルを再利用。新規`entry-shop`（平屋の店舗）と`research-studio`（二階建て研究施設）を同じ既存`runR125SemanticPilot`経由で**最大2回**のみ実モデル要求。建物カテゴリによるエンジン振り分けは禁止・同一IR+コンパイラを使用。
- 実行例（Windows OMENにOllama実模型ある場合）: `node scripts/r125-multiuse-pilot.mjs --model qwen3:14b --out r125-multiuse-001`。必ず既存結果フォルダを上書きせず、店舗・研究施設それぞれの`ARCHITECTURE_PLAN.json`、`B143_SOURCE.json`、`index.html`、QAを保存。`R125_MULTIUSE_REPORT.json`に原文保存、真のmodelCalls、座標/幾何SHA、ソースQA、実行時間、PROVENANCEを集約。fixture-only CIでは実推論成功としない。
- 本工程では**実店舗・研究施設Qwen推論をまだ行っていない**。PC操作にアクセスできる場合のみ1回の一括コマンドで実測する。施工は引き続き`NOT_PREPARED`／9 BLOCKED／worldWrites 0。CIのテストは構造プロトコル検証であり、3用途の実モデル評価と美術審査を代替しない。

## R125 セットバック外部動線と床・屋根QA分離（2026-10-24 JST）
- 実Qwen住宅から派生した3外観案にB198C HIGH 1件ずつあり、比較ギャラリーCI成功＝建築合格ではなかった。新しいセットバック上階のテラスには外部への2幅ドアが欠けているリスクがあるため、`upper-terrace-access`を幾何源でCUTし、床の2wide通過・上下階・着地点を再検査する。
- B198Cの一般的HIGHは**削除・隠蔽しない**。新しい[ArchitecturePlan用途階QA](../source/ai/r125-architecture-plan.mjs)では、`program[].standingFloorY`の1階/2階を独立に検査し、本当にフロア分断があればHOLD。一方屋根上の段状表面は**EXTERIOR REVIEW REQUIRED**として区別し、安全や美術を自動合格させない。元計画は無変更、Minecraft worldWrites=0。

## R125 表現拡張の実3D比較ギャラリー（2026-10-24 JST）
- [オフライン比較生成](../scripts/r125-expression-gallery.mjs)と[独立検証](../scripts/r125-expression-gallery.test.mjs)を追加。実Qwen14Bの`Lumina Residence`原文24×28を固定し、元の1案＋共通幾何エンジンの表現パラメータを変えた**3派生案**を、既存B143の一つの4場面オフラインHTMLビューにまとめる。
- 元案だけが**Qwen14B実創作の意味設計**。派生3案は**AIを再実行した結果ではなく、AIの元計画を入力した共通エンジンの能力比較**。混同しないようJSONにprovenanceを記録。素材・外観・ボクセル・ソースSHA・構造診断・美術未審査を個別保存。
- CI成功時は同じ[GitHub Actions B198Gソース回帰](../.github/workflows/b198g-quality.yml)に`R125-EXPRESSION-FOUR-3D-VIEWS`アーティファクトを保存し、ユーザーが`index.html`をブラウザで開いて各案を目視比較できる。ローカルOllama実行不要、ワールド操作なし。最終美術審査とワールド施工は未実施。

## R125 汎用建築表現の拡張（2026-10-24 JST）
- ArchitecturePlanに**任意**の `expression:{setbackSide,setbackDepth,roofProfile,roofAxis,facadeLanguage}` を追加。上階の片側セットバック（2〜4セル）、独立の屋根輪郭（flat/ridge/sawtooth、x/z軸）、壁面リズム（plain/fins/screen）の幾何形状を同一共通エンジンが生成。**住宅名・店舗名による固定テンプレート振分けはしない**。
- 以前の実Qwen14B住宅の`expression`未指定時は従来の`compileArchitecturePlan`経路を維持し、**Source SHA / Geometry SHA / 2620セル完全一致を継続保証**。新たな表現はソース幾何を変えることが必須で、形状に対応したB143/Circulation QAを併用。外観の「美術PASS」やワールド実歩行は自動認証しない。
- 新規のローカルQwen呼出しは今回のGitHub CIでは行わない。次に実推論で新`expression`付き案を生成して既存のオフライン3Dビューで美術審査する。セットバック上のデッキ等は安全性未認証で、Minecraft施工は9 BLOCKED。

## R125 実Qwen14B 2,620ボクセル結果に基づく誤判定修正（2026-10-24 JST）
- ユーザーOMENで実`qwen3:14b`→IR生成→真正B143 compileを**14.613秒・2,620ボクセル**で初回実測。提供された`ARCHITECTURE_PLAN.json`は`residential-2024a / Lumina Residence` 24×28、1階x50%・2階z40%、木床/石壁/コンクリート屋根。保存済み`B198C_GEOMETRY_CRITIQUE.json`は`Y=2:378 / Y=7:383 / Y=12:525`候補の3高度にそれぞれ単独成分あり、従来グローバルshare `525/1286=0.4082` を同一階分断として誤認し、`FRAGMENTED_PUBLIC_SOURCE_FLOORS` HIGH 1件。**これは階を跨いだ誤判定であり、真の上下階歩行の証明ではない**。
- B198Cはグローバル比率の従来統計を残すが、HIGH判定を**同じstandingY内の複数連結成分と比率**で判定するよう修正。従来同一高度の本当の分断HIGHは維持。実IR全文を回帰fixture [ここ](../scripts/fixtures/r125-qwen14b-residential-2024a.json) に固定し、実測ソースSHA・幾何SHA・2620セルが再現されることも検査。
- R125計画の幾何源から**段ごとの支持・頭上2セル空気・上階着地点・各部屋区画の2×2支持・仕切り通路**をSource検査で区別して計算。モデル名や住宅ラベルに応じて検査を無効化しない。2階へ本当に歩けるか、屋根へのアクセス、外部の地形・入口、Minecraft物理・美術は未検証のまま。必要な場合は`HOLD_SOURCE_CIRCULATION`で停止。既存ワールドへの書込0／9 BLOCKED／Draft PR #128維持。
- ローカルPCは既存`r125-semantic-20261024-191231`を**再生成せず保存**。今後は必要時に最新コードでこのPLANをオフライン再評価する。古い`B198C_GEOMETRY_CRITIQUE.json`の結果は当時の実測として改変しない。

## R125 実Qwen → 短いArchitecturePlan → 真正3D、単一入口（2026-10-24 JST）
- [実ローカル意味設計パイロット](../scripts/r125-semantic-pilot.mjs) と [オフライン+localhost HTTP回帰](../scripts/r125-semantic-pilot.test.mjs) を追加。Ollamaの実モデル名をexact照合し、**1回だけ**OpenAI互換loopback呼出し(`reasoning_effort:none`, `max_tokens:1536`, 120秒)で短いArchitecturePlanを生成。厳格なIRバリデータ→B143の真正voxel→B198Cの独立ソースQA→既存3D HTMLビューまで自動作成。URLは明示的`127.0.0.1`以外不可。
- CLI（**OMENに既存Ollamaモデルがある環境のみ**）:`node scripts/r125-semantic-pilot.mjs --model qwen3:14b --out r125-semantic-house-001`。出力に`MODEL_RESPONSE_ORIGINAL.txt`、`ARCHITECTURE_PLAN.json`、`B143_SOURCE.json`、`B143_SCENE.json`、`ZONE_PROGRAM.json`、`index.html`と独立検査・REPORT。失敗時は原文を保存可能な限り保存してHOLD。出力先既存は拒否。ダミーテストの原文を「実Qwen成功」に読み替えない。
- この工程のGitHub Actions検査は**fixture / localhost test**であり、初回実Qwen14Bがこの短いIRを生成した実績とは区別する。設計図の美術性やMinecraftプレイヤーの実歩行は未検証、World BuildPlanは空/9 BLOCKED。MVP施工完了ではない。

## R125 最小意味設計（ArchitecturePlan）の真正3D化（2026-10-24 JST）
- [R125共有エンジン](../source/ai/r125-architecture-plan.mjs) と [独立真正ボクセルQA](../scripts/r125-architecture-plan.test.mjs)を新設。固定した建物の「住宅・店・研究所」は一切入力せず、モデル（または呼出し元）が**用途・室名、水平分割の向き、占有率、階数、外形寸法、素材**を短いIRで選び、汎用エンジンが厳密B143を生成する。
- 初期能力は**16〜32幅×奥行、1〜2階、各階2機能ゾーン**に限定。共通で支持床・頭上空気・外壁・仕切り開口・外部玄関開口・壁をくり抜いた窓とガラス・屋根を生成。2階の場合は階段5段（踏面深さ1）の真正ウェッジ、上階床の5セル長シャフト、着地点を組み合わせる。全てコンパイル・ソースSHAで検証し、`BuildPlan=[]`／9 BLOCKEDを維持。
- エンジンは**完成建築の証明ではない**：部屋の家具・造形美術・敷地面形状・階段のMinecraft内プレイヤー歩行・上下階到達・小型LLM実生成は未検証。語句を特定の間取りに変換するキーワードルーターはない。次は実Qwenの短いArchitecturePlanをローカルで生成し、B143ビューとQAを保存する一本の接続。範囲外の用途はこの原型で強制変換せずHOLD。

## R125 Qwen14B保存原文の多層診断（2026-10-24 JST）
- ユーザー提供済みの本物の `MODEL_RESPONSE_ORIGINAL.txt`（住宅1件、3,384文字）を確認。B198A最初の失敗は `assumptions` が文字列（正規形は文字列配列）。それ以外に、**design.idのアンダースコア、全15部材で`type:"add"`と`mode`欠如、階段にmaterial欠如・局所z範囲超過**がある。二階床のy=0,1、入口/窓の追加ソリッド、詰まったroomボックス等も人間利用空間として問題。真正3Dには未到達。**この原文から形式だけを直して建築合格とはしない**。
- 既存B198G system指示に**B143のmode/material/id/bounds/空室・開口・階分離の契約**を明示。変換器と厳格検査は緩和せず、固定住宅テンプレートは導入しない。
- [原文オフライン再診断](../scripts/r125-offline-replay.mjs) は同じ保存テキストを**改変・AI再呼出し・施工せず**解析し、B198Aの最初の実際の失敗と多数の独立形式/空間上のリスクを個別に記録。実行例：`node scripts/r125-offline-replay.mjs --raw "r125-qwen14b-20261024-181344/home-two-level/MODEL_RESPONSE_ORIGINAL.txt" --out "r125-qwen14b-diagnosis.json"`。結果は新規ファイルのみ。原文自体を自動修復して再ビルドする機能ではない。
- 次の優先課題は**建築を発想するLLMと正確な3D部材・床・開口・階段を作る共通エンジンを分離する短いArchitecturePlan IR**の小規模原型。数十工程の追加や同一住宅の無限修正はしない。世界書込0／試験施工未実施。

## R125 Qwen14Bの設計原文・前提条件形式の確認（2026-10-24 JST）
- ユーザーOMENで実モデル`qwen3:14b`を1回実行し、住宅ケースは**64,579msでモデル応答を保存**（`originalRawCaptured=true`）。ただし`B198A_CANDIDATE_REJECTED_AFTER_1_ATTEMPTS_B198A_UNTRUSTED_ASSUMPTIONS`のため、ソースおよび3Dは未検証／未生成。これはタイムアウトではない。
- B198Aの契約は`assumptions`を**0〜12件の文字列配列、各250字以下**に制限。B198G system promptにこの型・長さの説明が不足していたので明示し、通常の厳格B198A検証は**緩和しない**。模型の類型固定も行わない。
- **保存済み原文**`r125-qwen14b-20261024-181344/home-two-level/MODEL_RESPONSE_ORIGINAL.txt`の実際の`assumptions`型および他の設計フィールドは未閲覧。既存の原文を改変したりQwenを再呼び出ししたりせず、現物の中身を確認したうえでオフラインの再評価・必要最小限の規格修正を選ぶ。Minecraft書込0／9 BLOCKED。

## R125実Qwen 14B 初回診断（2026-10-24 JST）
- ユーザーOMENが最新HEAD `6a12bb4` をfast-forward取得後、インストール済み `qwen3:14b`（Ollama報告9.3GB）で住宅1例を実際に要求。上位結果は `COMPARISON_SOURCE_RESULTS_READY_REVIEW_REQUIRED`、しかし実際のcase statusは**`HOLD_GENERATION_OR_REVIEW`／`sourceSha256=null`／modelCallCount=1／worldWrites=0**。これは**建築ソース未成立**であり、上位表示は集計不具合だった。タイムアウトとは断定せず、`r125-qwen14b-20261024-181344/home-two-level/R125_REPORT.json` の `reason` と原文保存有無を次に確認する。
- 本修正は上位statusをHOLDとして厳密に集計し、子の `reason`／`elapsedMs`／`originalRawCaptured` を転記。真正ソースSHAと幾何SHAが存在し、全ケースのsource statusが人間レビュー待ちであるときのみ比較準備OKを返す。元の出力証拠は変更せず、モデルの再実行は必要なし。図書館専用修正なし・Minecraft実施工なし。

## R125実Qwen初回タイムアウトと改善（2026-10-24 JST）
- ユーザーOMENで`qwen3.8:27b`を**実呼出し1回**実施。Ollama `/api/tags`モデル確認とリポジトリ取得は成功。住宅例は`HOLD_LOCAL_TRANSPORT`／本体`B198A_CANDIDATE_REJECTED_AFTER_1_ATTEMPTS_This operation was aborted`／`elapsedMs=300032`。これは**既存の300秒deadlineでAbortした直接証拠**。モデルが内部でどこまで推論したか・CPU/GPUオフロード・速度は未確認。元応答は未着で`originalRawCaptured=false`／真正3Dなし／worldWrites=0／9 BLOCKED。
- 同じ27Bで300秒待つ試行を繰り返さない。OllamaのOpenAI互換APIにある `reasoning_effort:'none'` + `max_tokens:4096` を**R125 pilot経路のみ**で指定し、上限180秒へ変更。これらは推論軽量化・生成長さ上限の診断条件であり、成功保証ではない。旧B198Gアダプタ通常運用には設定を強制せず、任意オプションのみ追加。モデル設定は`REQUEST.json`に残す。モデルが未対応なら通常エラー/再タイムアウトの可能性を示す。
- 次のユーザー操作は**まず`ollama ps`と`ollama list`でProcessor/GPUオフロードと小型モデルの有無を取得するだけ**。現段階で重い27Bを再生成しない。R125単独の正確な締切Abortは`HOLD_MODEL_TIMEOUT`で区別する。実Minecraft・美術・Mac8GBは一切未検証。

## R125 実LLM初回測定の省操作化（2026-10-24 JST）
- [1コマンドのローカル実験入口](../scripts/r125-pilot.mjs) と [独立テスト](../scripts/r125-pilot.test.mjs) を追加。Ollama `GET /api/tags` の**読取専用**検出で正確なモデル名を照合し、存在しなければ**生成POST 0**でHOLD。モデル存在はGPU推論成功や真正プロバイダ証明ではない。
- 通過した場合、初期設定で非図書館の**小さな二階建て住宅1件**、`--cases 3` 指定で店舗・小研究施設を含む計3件を**異なる自然言語要求で独立生成**。既存R125→B198G/B143→真正ボクセル→3Dレビューと失敗の原文保存を使い、住宅テンプレートや部材固定ルータを新設しない。推論応答の上限はこの実験入口に限り300秒（既存単独R125は120秒）とし、低速環境の途中打切りを減らす。テスト用関数注入を使った実験結果は、たとえプロバイダ名が実モデル風でも`HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE`として保存し実LLM成功にはしない。出力 `R125_PILOT_REPORT.json` に件数・モデルID・Source / 3D / Human art / Minecraft / Macを分離。自動リトライ、モデル自動切替、課金API、Minecraft書込なし。
- ローカルPC実行例（リポジトリの最新版を取得済みでNode.js/Ollamaが起動している場合のみ）：`node scripts/r125-pilot.mjs --model qwen3.8:27b --out r125-live-001`。デフォルトは1モデル要求、追加試験 `--cases 3` は必要に応じて使用。既存PR #128に保存したプログラムはChatからユーザーPCへ自動実行できないため、**実Qwen/Gemma推論・実Minecraft・Mac測定は未実施**。
- 既存B198G CIは模擬タグ/モデル応答のみ。ローカル実モデルの結果が得られたら大型B143直接JSONの可否・失敗原因を確認し、証拠が出た場合だけMac 2B向け短いArchitecturePlan IRへ進む。世界書込は引き続き9 BLOCKED。

## R125 試験ワールド差分橋の研究段階（2026-10-24 JST）
- [オフライン差分生成器](../scripts/r125-world-diff.mjs)／[専用回帰](../scripts/r125-world-diff.test.mjs) を追加。真正B143 source + compiler sceneを再検証し、**正確に指定されたテストworldId/座標範囲/バックアップ参照/配置前セル一覧**が揃った場合だけ、1024セル以下の記号的な配置差分と逆順復元差分を作成。B143の空BuildPlanは変更しない。
- この差分は**Minecraftコマンドではなく、実ワールドへの書込も実行も不可**。入力スナップショットの真正性、World ID、復元バックアップ、Educationの実ブロックID、環境内動線は未証明。出力`HOLD_WORLD_SNAPSHOT_UNVERIFIED`、9 BLOCKED、`executionAllowed=false`、0ワールド操作を維持。偽の「バックアップ済み」や偽のreadbackを成功として扱わない。
- R125ローカル生成回帰CIと同じ既存B198Gジョブへ短いテストを追加。実モデルを呼んだ実績ではない。次はCIでこの橋の実テストを確認し、Ollamaが接続された環境で1棟の実生成を計測する。専用試験ワールドの書込接続は未確認。

## R125 最初の実装（2026-10-24 JST）
- [ワンステップ入口](../scripts/r125-mvp.mjs) と [回帰テスト](../scripts/r125-mvp.test.mjs) を既存PR #128 に追加。新規・非図書館の自然言語要求に対し既存B198Gの**ローカル127.0.0.1限定**モデル接続を1回呼び、B198A/B143で原本を検査し、既存B198Cで実ボクセル構造の限定QA、B143オフライン3DビューとSHA付き証拠を新規出力先にまとめる。モデル出力が不正でも可能な範囲で原文とHOLD理由を保存し、既存出力は上書きしない。固定住宅テンプレートは導入していない。
- 出力例（**Ollama実機がある環境でのみ実行**）：`node scripts/r125-mvp.mjs --prompt "小さな二階建て住宅を、玄関と二つ以上の使える室内、窓、屋根、階段を持つ構成で設計して" --model qwen3.8:27b --out ./r125-house-001`。別用途も同じ入口を使う。2B級Mac対応、意味IRへの変更は**実モデルの初回失敗原因を測る前に実装しない**。
- `R125_WORLD_PREVIEW.json` はB143の真正局所ボクセル位置とSHAに結びついた**未接続施工候補の記録のみ**。対象worldId・anchor・backupRef未同定、ブロック変換・空き区画・原本バックアップ・停止/復元未検証のため、9 BLOCKED／NOT_PREPARED／施工命令0／ワールド接触0を維持。Minecraft試験施工完了とは記録しない。
- 本時点で**GitHubコードのコミット成功のみ確認**。R125専用Nodeテストは既存の軽量[B198G CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/workflows/b198g-quality.yml)に追加したが、実行結果は最終確認待ち。モックHTTP試験と**本物のQwen/Gemma推論は別**。このChatからユーザーPCのOllama・Minecraft Educationには接続できず、実モデル推論・実施工・Macの8GB実測は未実施。今後は実モデルで非図書館1例を生成・評価し、3用途へ横展開、世界識別・バックアップ・復元が成立した試験区画に限って施工ゲートを構築する。費用API/ローカルWork不要、旧原本/main/図書館研究に変更なし。




## 2026-10-24 確定新方針 — 最短実用化戦略 v2
- **最優先で読む:** [戦略 v2](PROJECT_STRATEGY_V2_JA.md) / [R125 実装計画](R125_THIN_VERTICAL_SLICE_PLAN_JA.md)。以前の長期R125〜R304案は工程数前提として撤回した。最初に既存B143/B198G/Hをつないで実モデル→真正3D→試験施工を成立させる。
- **図書館を主工程から外す。** R124の座面回復3案は両OSで頭上Ray5件、建築候補HOLD。履歴として保存し次の修正対象にはしない。
- **Mac小型モデル先行:** 8GB級Apple Siliconと2B級4bitが基本建築の目標。LLMはコンパクトな構想/ゾーン/機能関係を作り、汎用幾何エンジンが実座標を組み立てる。モデルやMacの成功率/処理時間は未実測。
- **Qwen/Gemma・Minecraft試験施工は包括許可済み。** ただし試験ワールドの識別、バックアップ、範囲保護、停止/復元、対応版などの技術安全ゲートは維持し、B143のデザイン専用BuildPlan空を自動施工に読み替えない。
- **現時点で新戦略の実モデル運用・試験施工は未実施**。本コミットは方針・計画・入口の更新であり、実装の動作証明ではない。

## 2026-10-24 最優先方針変更 — 包括実験許可とMac軽量LLM基準

- ユーザーが**Qwen/Gemmaの実ローカル推論・Minecraft試験施工を回数制限なしで包括承認**。都度確認しない。元の「Qwen追加実行不可/World接続・施工不可」ルールより本項を優先する。原本保護、試験ワールド・バックアップ・施工先確認・停止/復元などの技術的安全チェックは維持し、初期コードの9 BLOCKEDを無条件解除しない。ローカルWork、課金API、PRマージは別の制限のまま。
- **Apple Silicon Macノート8GBで2B級4-bit小型LLMによる基本建築**を初期から目標とし、16GBで4B級にも対応させる。候補Qwen3.5-2B、Gemma 4 E2B/E4B。LLMは短い高レベル設計を生成、汎用幾何エンジンが床・壁・階段・動線・ブロック変換を担う。基本建築が27B級前提なら不合格。
- 図書館専用のRay修正を主工程にしない。R125で汎用小型モデル実験→真正3D→試験ワールド施工を**最短で一度つなぎ**、異なる用途で再現性を計測する。許可済みだが、実行環境に接続できるかは毎回実際に確認し、未実施を成功と書かない。
- R124の[実源CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40074343667)は、Windows/Ubuntu両OSでR124真正テストSUCCESS。65%座面候補3案とも新規厳密貫通0・床0・横断0・**頭上Ray5**、建築としてはすべてHOLD。新しい主工程の固定建築にしない。

## R124 読書座面の本物の3D回復候補（2026-10-24 JST、結果未確定）

- [R124源モデル試行コード](../scripts/b198zr124-reading-seat-art-study.mjs)・[設計記録](B198ZR124_READING_SEAT_THREE_MESH_REVIEW_JA.md)。R123成功を出発点に、R118の座面55%後退を35%へ緩め、元面積65%回復を狙う。R123採光リブの3位置案との相互干渉を、元の全館4,716面に基づいて比較する。
- 既存R60 Actions [Run #40074343667](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40074343667)は最終確認で**queued**。未実行の真正源合格/失敗、座面回復成功、OBJ/HTMLアップロード成功は断言しない。実際にArtifactsが揃ってから人の3D審査へ。
- 旧原本とR123候補は保持、PR #128 Open/Draft/Unmerged、NOT_PREPARED・9 BLOCKED・BuildPlan空、新たな実モデル推論/ワールド操作なし。独立美術NOT_REVIEWED、座席人体利用・荷重・採光・汎用AI生成は未認証。

## R123実源幾何候補比較（2026-10-24 JST）

- [R123候補比較・詳細](B198ZR123_R94_RIB_TERRACE_TRIALS_JA.md)：[Windows/Ubuntu SOURCE CI #40073301165](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40073301165) は**両方SUCCESS**。R122の新規貫通2組を実源で再現後、先端の前方調整候補で新規貫通0、R110床/頭上/側方0、旧5経路非悪化。3案が局所幾何候補、1案は残存リブ面積の条件で不採用。候補SHAは `c9c4a31acae3676a5b7fb1062d808186b9b1b8f9f3ff26b9cc79bd7ae940bddb`。
- **元実メッシュは不変・建築合格HOLD**。R123候補は先端2面の差分。既存座面は45%に縮小したまま。独立美術NOT_REVIEWED、人体の歩行・荷重・採光・全館自己交差・Minecraft実使用・AI自身の汎用創造力は未認証。次のR124は読書空間と多視点美術へ。

## R122実3D監査（2026-10-24 JST）

- [R122実源交差レビュー](B198ZR122_R120_SOURCE_FACET_COLLISION_REVIEW_JA.md)：R121実OBJを比較。改修R94リブ4535/採光エッジ4536は未改変の上層テラス3477と新規に厳密交差する2組を確認。読書座面幅/面積も約45%に縮小。**R120はHOLD**。
- R121 [Windows/Ubuntu既存SUCCESS](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40069281457)をR122の新規CI成功と混同しない。美術NOT_REVIEWED、歩行・支持・Minecraft実使用・AI汎用生成は未認証。R123は新規貫通を解消する意味ある候補比較へ。

## R96が実際に達成したこと / 達成していないこと
- 独立研究《潮光の裂帆図書館》：R94の4,446三角形→R95の4,608→R96の4,692（旧4,608を変更せず84面の開口意匠追加）。7開口を維持、7×9本の局所視線検査成功。
- R96の実ソース：[実装](../scripts/b198zr96-window-structure-and-light-study.mjs)／[設計書](B198ZR96_WINDOW_ARCHITECTURAL_SURROUND_JA.md)／[R95設計書](B198ZR95_SEVEN_DAYLIGHT_SLOTS_JA.md)。
- **未解決：** R96の全館6視点実形状美術審査、屋根/頭上高（右最上層tier3など）、窓周りの本物の荷重支持、利用者幅・室内滞在・上下移動、実Minecraft歩行。美術 = NOT_REVIEWED。
- これは**Qwenが生成した新モデルではない**。実Qwen由来の失敗原本は凍結保持し、B143 HOLD。
- [R60軽量CI（HEAD b2e247、Windows＋Ubuntu成功）](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39914890947)。これは軽量スモーク中心であり、**R58〜R96の全履歴回帰を合格した意味ではない**。全履歴の最新版での成功は未確認。

## R97現在地（2026-10-23 JST）

- [R97実装](../scripts/b198zr97-multiview-mesh-review.mjs) / [テスト](../scripts/b198zr97-multiview-mesh-review.test.mjs) / [設計書](B198ZR97_MESH_BOUND_SIX_VIEW_REVIEW_JA.md)。R94/R95/R96の**実三角形4,446/4,608/4,692面**から、正面・斜視・側面・俯瞰・反対向き外形・右上層tier3局所拡大の**同一カメラ/同一縮尺6視点×3版**を生成する研究実装。結果を既存R60一操作レビューに追加するコードを導入。
- [初回R97全館生成のUbuntu実行](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39940423587)：全館形状の比較テスト自体は約174秒でPASS。ただし同じ古いコミットのCIは「証拠不足入力のエラー文字列を限定しすぎたテスト」が1件FAIL。該当テスト修正済み。
- 通常Push/PRのR97は軽量検査のみとし、**全館生成の重いテストは手動の完全回帰へ**戻した。R97本体はJSON証拠再計算とHTML6視点出力を共有して無駄な再計算を削減。
- [R97軽量CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39940965462)はWindows/Ubuntu両方成功。R97/R98の実出力の独立美術審査は未実施。R97を美術合格やQwen生成成功へ昇格しない。
- R60への統合後、R94〜R96 OBJとR97比較HTMLがレビュー画面に揃う。実人体頭上高・経路・窓支持/採光・Minecraft実歩行は未認証。R98の新形状修正は未開始。

## R98現在地（2026-10-23 JST）

- R97最新軽量CIの[Windows/Ubuntu両OS成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39940965462)を確認。ただし完全履歴回帰や人間による美術審査ではない。
- [R98屋根ロフト実装](../scripts/b198zr98-elevated-right-crown.mjs) / [専用テスト](../scripts/b198zr98-elevated-right-crown.test.mjs) / [設計書](B198ZR98_ELEVATED_RIGHT_CROWN_JA.md)。元R96全館4,692面を保護し、右側上部の実頂点を最大0.085正規化単位の局所滑らかな形に持ち上げる比較候補を追加。改修前後の頭上方向の交差と7室×9本の視線を再測定する。改善を観測しなければHOLD。
- R60一括レビューへR98候補の**実OBJ、証拠JSON、6視点のR95/R96/R98比較HTML**を追加。元Qwen出力・旧R95/R96/97成果物を変更しない。
- [R98の初期実メッシュ検証CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39942654481)は**Windows/Ubuntu両方SUCCESS**。R98ソースから実三角形の変化、実交差に基づく頭上プローブ改善（少なくとも0.02正規化単位）、7室×9本の視線未悪化、原本保護をテスト。R60へ統合した全レビューの実出力と独立美術審査は別途未実施。構造/実歩行/Minecraft/実Qwen生成能力も未認証。R98は美術HOLDであり施工不可。
- 通常Push/PRのCIは再び軽量テスト中心、全館幾何/歴史回帰は手動workflow_dispatchに維持。R99は有限幅・有限高さの入口→7室→ラウンジの機能検証を優先候補とする。

## R99現在地（2026-10-23 JST、CI結果未確認）

- [R99本体](../scripts/b198zr99-finite-volume-route-witness.mjs)／[専用テスト](../scripts/b198zr99-finite-volume-route-witness.test.mjs)／[仕様](B198ZR99_FINITE_VOLUME_ROUTE_REVIEW_JA.md)。R92の入口→左右7閲覧室＋ラウンジ計8経路を、R98実建築三角形に対し**中央・両端の足元と頭上、横断方向の限定レイ**で調査する。
- 正規化単位での仮の半幅0.023／高さ0.135。Minecraftブロックやメートルではない。局所レイの成功も人間の有効通行幅や全連続経路の認証にはならない。認証済み目的地は常時0、判定HOLD。
- R60一括レビューへのR99表示導線追加。新しいGitHub PRやZIP、CMD、実Qwen推論やワールド操作はなし。
- [初回R99全館回帰CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39946180591) は確認時点でqueued。**Windows/Ubuntu結果、8経路の実測検出件数、実HTML審査はまだ未確定。** 未検証の成功件数を記載せず、確定した結果だけで次工程を選ぶ。
- R98初期ジオメトリの[両OS成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39942654481)は維持。ただし独立美術評価と実Minecraft歩行認証は保留。

## R100現在地（2026-10-23 JST、実メッシュQA待ち）

- [R100ソース](../scripts/b198zr100-source-gallery-shoulders.mjs)／[専用テスト](../scripts/b198zr100-source-gallery-shoulders.test.mjs)／[設計書](B198ZR100_GALLERY_SHOULDERS_JA.md)。R99の正規化半幅0.023に対しR88連絡床の実半幅は0.016。R98元メッシュをそのまま残し、7連絡通路に外側への追加床帯を構築する比較研究。
- 各候補で実床未検出の減少、頭上・横断の交差非増加、中央保護空洞へ入らないことを個別判定。差分が無効なら不採用。**実モデルで少なくとも1経路の証拠改善**を全館テストの条件にしており、実行結果が出るまでは成功としない。
- R60レビューにR100候補のOBJ/JSON/6視点比較HTMLを追加。既存Draft PR #128継続。元Qwen・R98以前の成果物は非改変。
- [R100実モデル検証CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39947874799) は確認時点でqueued。通常CIは原則軽量、今回の測定を含むコミットだけ実メッシュ回帰を追加している。成功件数、Windows/UbuntuのPASSともに**未確定**。
- R99の全館8経路は別途[CI待ち](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39946559669)。R100が一部で床改善しても、全館の人間歩行・建築美術・構造耐荷・汎用AI生成能力は未認証。次の設計修正は**取得できた問題地点**に基づいて選ぶ。

## R101現在地（2026-10-23 JST／未検証）

- [R101専用回帰テスト](../scripts/b198zr101-route-coverage-regression.test.mjs)／[修正資料](B198ZR101_ROUTE_COVERAGE_QA_JA.md)。R99の床判定線が足元から上に伸び、低い障害物を床と誤認する可能性を排除。床レイ始点を足元+0.024から+0.002正規化単位に変更。
- 垂直方向のみの源経路区間・急勾配>0.28・24分割では0.07間隔を守れない長い区間を**明示的に不完全検査のHOLD**として数え、R100で改善案を誤採択しない。
- [R101最新CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39950219073) は確認時queued。人工形状の回帰テストを追加したが**結果は未確認**。R100の全実メッシュでの少なくとも1件改善を要求する重いテストは既存の手動全履歴回帰へ戻した。初回R100試験もqueuedのまま。検証結果を想像してPASSにしない。
- 変更はR99/R100の研究用検証コードとテスト、ワークフローのみ。旧モデル/実Qwen/Gemma/ワールド/施工は手を付けず、安全ゲート9件BLOCKEDを維持。

## R102現在地（2026-10-23 JST）

- 事後確認：R99の[軽量Windows/Ubuntu CI成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39946559669)。R100の[実メッシュを含むWindows/Ubuntu CI成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39947874799)。R100は実R88接続のうち少なくとも1件で局所的床プローブ改善を確認するassertを通過。**改善した実件数と完全8経路の通行可能性は未認証**。
- R101の[専用CI（両OS成功）](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39950219073)を確認。床の誤認防止、垂直/急坂/疎サンプルHOLD検査を含む。後続の最新HEADの全履歴成功を意味しない。
- [R102実形状](../scripts/b198zr102-tapered-gallery-aprons.mjs)／[専用テスト](../scripts/b198zr102-tapered-gallery-aprons.test.mjs)／[仕様](B198ZR102_GALLERY_APRON_TRANSITIONS_JA.md)。R100の矩形床帯を元R88の細い床へ徐々につなぐ候補。新しい三角形は片側4面・左右計8面。源R98は4,692面の完全prefix。
- R101厳格床プローブで改善が証明でき、元R100改善値の60%以上を保ち、頭上・横断の問題が増えず、吹抜け保護帯を維持したときのみテーパ採用。失敗ならR100矩形案を維持。R100で却下した候補は作り直さずHOLD。
- R60一括レビューへR102の実OBJ/JSONとR98/R100/R102六視点比較HTMLを追加。実メッシュのテーパ採択件数、実HTMLの人間美術審査、最新CI成功は**未確認**。
- 元Qwen/B143、Minecraft、原本・mainは非変更。9ゲートBLOCKED、NOT_PREPARED、実推論/施工0。

## R103現在地（2026-10-23 JST）

- [R102軽量CI（Windows/Ubuntu成功）](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39952046303)を確認。ただし元R88から7経路全体の実メッシュ試験ではない。
- [R103元床端面診断](../scripts/b198zr103-source-junction-integrity.mjs)／[専用テスト](../scripts/b198zr103-source-junction-integrity.test.mjs)／[設計書](B198ZR103_SOURCE_GALLERY_JUNCTION_JA.md)。元R98内のR88研究デッキ実三角形で、入口側と室内側の幅0.032の端辺を確認。R102追加床の左右の端頂点も別途照合。端辺と接合点の両方を観察できない新規テーパを採用しない。
- 7目的地の正確な接合検査、元の実床端辺を確認した件数、R102の採用/矩形維持件数を同じR102証拠JSONとレビューHTMLに追加。**未実施の実3D人間美術/実歩行検査をPASSにしない。**
- [R103実7通路CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39956894901)を一度通常pushで起動（確認時点queued）。実際の件数はまだ未確認。以後のpushのR103は軽量モックのみに戻し、完全実モデル回帰は既存手動workflow_dispatchで行う。新規ワークフロー/ZIP/CMDは追加なし。
- 元Qwen/B143、main、Minecraft世界は未変更。NOT_PREPARED、9 BLOCKED、BuildPlan空、実モデル追加推論0。

## R103実7経路の確定計測（2026-10-23 JST）

[Windows/Ubuntuとも成功した実メッシュCI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39956894901)の両OSジョブログで**同値**を確認：
- R102の採用テーパ 3室（左tier1、右tier1、右tier3）／矩形維持0／旧HOLD4。元R88の端辺を確認6/7、採用された接合床の端点一致3/3、採用済みの接合不良0。
- 右翼tier2のみ「元R88端辺なし」。歴史的R91が同区間の旧R88終端2面を置換したことと一致。右翼tier2は今後も旧R88の線を捏造せず、現行のR91源メッシュを使う。
- R104の補修後の右翼tier2を改善として採用できたかどうか、全館の実際の通行安全と美術は**なお未判定**。

## R104現在地（2026-10-23 JST／新しい実メッシュQA待ち）

- コード再照合で見つけた**具体的な差異：R91は右翼tier2でR88元終端2枚を除外し、R91専用の床三角形2枚を用いて元パッド内へ絞った。** R103は旧R88の端面を要求するため、旧線に基づく候補の現行床への接続を証明できない。
- [R104実装](../scripts/b198zr104-r91-active-throat-repair.mjs)／[専用テスト](../scripts/b198zr104-r91-active-throat-repair.test.mjs)／[理由と設計](B198ZR104_R91_ACTIVE_THROAT_REPAIR_JA.md)。元R98の正規4692三角形を完全prefixとするR104別モデルで、R103端点接続証明のない追加床を保留し、右翼tier2現行R91の2枚のソースから中央拡幅、両端は元の端辺を保持する12実三角形を候補生成。元床支持レイが改善・衝突非悪化など満たした場合のみ追加。
- R60一括レビューのR102比較画面でR98/R102/R104同一6視点を表示し、R104の実OBJ/JSONを追加して参照できる。**元R98/R102の成果物はそのまま別ファイルとして保存**。
- [R103実7経路CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39956894901)は本更新時点で未完了。R102の[軽量Windows/Ubuntu CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39952046303)は成功済み。
- R104の人工形状スモークだけでなく、前のコミットの通常CIで実R98→R102→R104の**全源メッシュ回帰を1回投入**。この更新からR104も通常CIは軽量テストへ戻し、重い全館回帰は既存手動workflow_dispatchに残す。結果が出たら採否件数を記載。結果が出るまで人工形状以外の件数を断定しない。
- Qwen/Gemma追加実推論0、Minecraft世界接続/読込/書込0、原本保護、NOT_PREPARED、9 BLOCKED、BuildPlan.operations=[]。

## R105の確定した問題と現在地（2026-10-23 JST）

- R104の[実全メッシュWindows/Ubuntuテスト成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39958650488)。両OSの実ログ同値：R102由来の3連絡床（左tier1、右tier1、右tier3）は保持、無証拠で除外した追加床は0。**右翼tier2：元床未検出0、頭上の交差1、現行R91床を広げる候補でも床改善0、追加面0、HOLD**。
- 観測から、右翼tier2について次に必要なのは「床の拡幅」ではなく**頭上で何に当たっているか（屋根／手すり／他）を実形状から確定すること**。ヒット元を見ずに屋根を動かしたり階段を増やしたりしない。
- [R105実装](../scripts/b198zr105-active-r91-throat-width-selection.mjs)／[R105テスト](../scripts/b198zr105-active-r91-throat-width-selection.test.mjs)。源R104/R91の正しい場所に対し拡幅ピーク5候補を実Rayで検査。いずれも元の床未検出を減らさない場合は追加しない。実頭上交差Rayがヒットした元の三角形の種類と位置もログとJSONへ記録。
- R60の同一レビュー内にR105新候補OBJ、実測JSON、R102/R104/R105六視点の比較を組み込み。既存R98/R100/R102/R104のファイルや原本は上書きしない。R105の実7経路CIもこの工程のコミットで一度通常プッシュから起動済み。ただし**R105最新実モデル結果は未確認**、通常PR/Pushはその後軽量に戻す。重い完全回帰は同じ手動workflow_dispatchに残す。
- 構造、人の移動、デザイン美術、AI汎用生成、Minecraft実機施工は認証不可／HOLD。Qwen/Gemma追加推論0、ワールド操作0、NOT_PREPARED、9ゲートBLOCKED、BuildPlan空。

## R106確定原因と修正候補（2026-10-23 JST）

- R105の[実メッシュWindows/Ubuntu両OS成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39960220420)をログで確認。右tier2の頭上交差（研究用）の**元メッシュ三角形4158、種類right_R87_READING_TABLE_NOT_OCCUPANCY、交点(0.5231758, 0.4734807, -0.7406061)**。床未検出0、頭上交差1、5種類の拡幅はすべて0改善・不採用。**屋根でも手すりでもなくR87の読書テーブルが原因**。
- [R106実装](../scripts/b198zr106-reading-table-doorway-reflow.mjs)／[専用テスト](../scripts/b198zr106-reading-table-doorway-reflow.test.mjs)／[設計書](B198ZR106_READING_TABLE_REFLOW_JA.md)。対象のR87テーブル上面1＋側面6の実7三角形だけを隔離。元R98モデル4692面とR105モデルは別に保持。テーブルの支持床がRayで確認できる場所へ移設を14候補試し、無理なら当該家具のみ除外した研究案を比較。床/頭上/横断の実Rayが改善しない案は採用しない。
- R106は元テーブルを除いた時点で**元R98の完全prefixではなくなる**ので、旧SHAと元7面、変更後SHA、残る元三角形の完全一致を保存する。旧原本は一切変更しない。R60にR104/R105/R106の同一六視点比較とR106 OBJ/JSONを追加した。
- [R106全館実モデルCI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39962533812)は確認時点でqueued。**実際の修正採否や美術品質は未判定**。通常CIは一度重い実テストを投入し、その後は軽量スモークへ戻す。元Qwen/B143・Minecraft実ワールドは未変更、NOT_PREPARED、9ゲートBLOCKED、BuildPlan空。

## R107現在地（2026-10-23 JST）

- R106の最初の[実メッシュCI（不合格）](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39962533812)は、テストがトップレベルの戻り値ではなくreportに存在しないhistoricR98SourceFacesを参照した**検査コードのミス**。productionの家具変更処理の失敗と取り違えない。[参照修正した再実行CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39964461711)が**Windows・UbuntuともSUCCESS**。元R98の465...ではなく**正確に4692面**の保存SHAも照合。
- 実R106証拠：右翼tier2の現行R91経路で、R87テーブル上面4158＋側面6面を x+0.045、z+0 だけ移設。**頭上Ray1→0／床未検出0→0／横断Ray0→0**。当該家具は撤去していない。14移設候補のうち3座標が元の局所検査を通過。
- [R107実装](../scripts/b198zr107-compact-reading-table-recovery.mjs)／[専用テスト](../scripts/b198zr107-compact-reading-table-recovery.test.mjs)／[設計書](B198ZR107_R91_FIVE_LANE_REVIEW_JA.md)。既存のR91実通路の左右オフセット−0.035／−0.023／0／+0.023／+0.035の5本を旧R105とR106へ当て、元R106が検証済みだった3座標を再選別。中央線の改善を維持したまま他4本で新しい床/頭上/横断の交差を増やさない場合のみ採用候補。
- R60一括比較の中へR105/R106/R107同カメラの6視点、R107 JSON/OBJを追加。旧R98/R105/R106は非変更。コンパクト家具案は**元家具を撤去した場合だけ**の研究分岐であり、現在の主実装では撤去なし。
- [R107全実メッシュCI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39965968797)が**Windows／UbuntuともSUCCESS**。両OSのログで同一の実値を確認。右tier2のテーブル再配置を x+0.045, z-0.055 とする候補が選出され、5本の頭上交差合計がR105の5／R106の3／R107の2に減少。左右それぞれの行は、offset -0.035: 0/1/0、-0.023: 1/0/0、0: 1/0/0、+0.023: 2/1/1、+0.035: 1/1/1（R105/R106/R107）。床未検出・横断交差は全5本でそれぞれ0。ただし**右側2本は頭上交差が残るため、全館通行と美術品質はHOLD**。通常CIは軽量へ戻し、手動全履歴回帰に重いテストを維持。
- Qwen/Gemmaの追加実推論0、Minecraftワールド操作0、原本・main保護、NOT_PREPARED／9ゲートBLOCKED／BuildPlan.operations=[]。

## R108実装と未完了検証（2026-10-23 JST）

- [R108コード](../scripts/b198zr108-r91-right-lane-hit-triage.mjs)／[テスト](../scripts/b198zr108-r91-right-lane-hit-triage.test.mjs)／[理由・範囲](B198ZR108_RIGHT_LANE_SOURCE_HIT_TRIAGE_JA.md)。R107で残った右翼tier2 +0.023 と +0.035 の頭上交差を、同じ5本の実R91通路とR99レイで確認し直す。各ヒットについて現行面番号／種類／交点／原本R98の同形状番号を記録し、レイ出力が途中打ち切りならHOLD。**R108は実形状を一切変更しない**。
- 既存R60一括レビューのR102比較画面に `R108_R91_RIGHT_LANES_EXACT_HIT_EVIDENCE.json` を追加。原本R98、R105〜R107の既存比較出力は保持。新しいワークフロー/ZIP/CMDは増やさず、PR/Pushは軽量テストへ復帰。重い回帰は手動workflow_dispatchを保持。
- [R108実メッシュ診断CI（commit 7018319、Windows/Ubuntu）](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39968239566) は再開文書更新時に**queued／結果未確定**。同コミットの[別トリガー](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39968246083)も結果待ち。原因の部材、交点の実値、R108最新HEADでの両OS PASSは断言しない。診断CIが済んだら実ログで値を検証する。
- R108追加前のR107全源メッシュは[Windows/Ubuntu両方成功](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39965968797)。変更されたR102レビュー導線の[軽量R60 CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39967932656)は成功。ただしR108実ソース検証、全履歴/3D美術/歩行認証とは別。CI定義の一時的なYAML誤記に伴う失敗2件（39967972312/39968058324）は修正後に構文解決済み。最新ジョブ結果と区別する。
- 次工程は**計測された種類の当該部材のみ**を候補修正。現行2ヒットの位置・分類を見ずに屋根・床・家具を推測改修しない。5本の床欠落/頭上/横断と家具の読書機能を比較し、改善しなければHOLD。独立の人間美術評価、全館8経路、実歩行、構造、モデル汎用能力はHOLD。
- Minecraft世界操作・新規Qwen/Gemma推論・ローカルWork・施工0。**NOT_PREPARED / constructionApproved=false / executionAllowed=false / 9 BLOCKED / BuildPlan.operations=[]**。main/凍結原本非改変、PR #128 Draft・未マージ。

## R109実装・実メッシュ結果待ち（2026-10-23 JST）

- R108の[確定CI（Windows/Ubuntuとも成功）](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39968239566)をログまで確認。右tier2 +0.023 の残り1件は**現行面4530、R98源面4537、R94本物のテラス上しきい**（交点 x0.5404279/y0.4590857/z-0.6865773）。+0.035 の残り1件は**現行面4148、R98源面4148、R87連続閲覧床**（交点 x0.5367014/y0.4595392/z-0.6751706）。双方とも家具/屋根ではない。線の足元参照 y0.4467679 に対し実床面は約y0.459であり、経路標高とのずれを無視して床を削るのは危険。
- [R109実装](../scripts/b198zr109-realfloor-referenced-r91-route.mjs)、[テスト](../scripts/b198zr109-realfloor-referenced-r91-route.test.mjs)、[詳細](B198ZR109_REAL_FLOOR_DATUM_COMPARISON_JA.md)。R108で確定した床2枚を起点に、同じ5本の経路のうち2本を**元R87/R94/R91実床高へ寄せた研究用代理線**として別に再評価。5点の実床一致、勾配、元の床欠落/頭上/横断Rayとの非悪化、同じ観察点数を検査し、成立しない案はHOLD。**床メッシュは一枚も削除/変更しない。**
- 既存R60の同一レビューに`R109_R91_REAL_FLOOR_DATUM_COMPARISON_EVIDENCE.json`を追加。[R109実源Windows/Ubuntu CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39969992086) は**確認時queued、結果未確定**。[同HEADの別トリガー](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39970000334)も確認時queued。軽量CIは復帰し、完全実メッシュの手動R60回帰にはR109テストを残した。PASS件数・代理線で改善した値はログ確認まで主張しない。
- R109代理経路が減らせたとしても、元のR107実床/頭上問題、現実の入口段差、実アバターの継続通行、建築独創性/美術の人間審査、Qwenの汎用生成能力の合格ではない。源に接続した本物の局所面の修正が必要かは数値と3D美術比較後に判断。Qwen/Gemma追加推論0、Minecraft読取/接続/書込/施工0、ローカルWork0、9 BLOCKED、NOT_PREPARED、BuildPlan空。PR #128 Draft継続。

## R110源床連続経路設計（2026-10-24 JST／実メッシュ結果待ち）

- R109の[実メッシュCI 39969992086](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39969992086)はWindows/UbuntuともSUCCESS。両ジョブで同じ観測：旧R107の5本の頭上Ray合計2、R109条件付き比較では1。右+0.023はR94しきい面に合わせて**頭上1→0**／足元未検出0／横断0、右+0.035はR94しきい→R87テラス床を両端に合わせても**頭上1残留**。よってR109を全線の改善完了と認定しない。
- [R110実装](../scripts/b198zr110-source-contoured-right-room-approach.mjs)／[テスト](../scripts/b198zr110-source-contoured-right-room-approach.test.mjs)／[資料](B198ZR110_SOURCE_CONTOURED_APPROACH_JA.md)。R109未解決の右+0.035についてR91実床の2端・9観測地点の本物のR94/R87/R91三角形に沿って、高さオフセット4候補を比較。各点の横方向±0.023と中央の3サンプル実床近接、隣接勾配≦0.28、連続R99プローブ、5本旧線不変を条件として採否を判定。**まだ実建築を改変せず、通れば研究用OBJ polylineとJSON、通らなければHOLD**。
- R60/R102既存レビューに`R110_R91_SOURCE_CONTOURED_ROUTE_EVIDENCE.json`と経路OBJ（床でない線）を追加。R98/R107/R109の3D原本/家具/床の全三角形は変更なし。Push/PRは軽量スモークへ復帰し、手動完全回帰にR110追加。R110初回実源比較の[Actions 39976426159](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39976426159)と[39976436857](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39976436857)は再開文書更新時点でqueued。**採用候補の有無・実測の改善を推測しない**。
- この研究は単位なしの代理通路であり、物理的な連続床、支持荷重、実人体/実Minecraft歩行、独創性・美術、原本Qwenの汎用能力はすべて未認証・HOLD。新規Qwen/Gemma推論、Minecraft接続/読取/書込/施工、ローカルWorkの実施なし。NOT_PREPARED／9 BLOCKED／BuildPlan空、PR #128はDraft未マージ維持。

## R111実装・源形状再評価（2026-10-24 JST／実メッシュ判定待ち）

- R110の[Windows/Ubuntu実源CI #39976426159](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39976426159)は両OS成功、ログ同値。右翼tier2 R91→R94/R87の9地点すべて横幅3点で床有／最大源勾配0.125942。ただし4つの高さ候補0.003/0.004/0.005/0.006はすべて頭上Ray7・床未検出0・横断0で不採用。旧R109の+0.023側条件付き成功と、+0.035側のHOLDを混同しない。
- [R111実装](../scripts/b198zr111-reversible-floor-finish-transition.mjs)／[専用検証](../scripts/b198zr111-reversible-floor-finish-transition.test.mjs)／[資料](B198ZR111_REVERSIBLE_FLOOR_FINISH_TRANSITION_JA.md)。R110の7交差の実三角形番号/kindを検証し、**全交差が源の真正テラスに裏付けられたR87またはR94の薄い床仕上げだと証明できる場合だけ**、つながった仕上げ三角形の高さを源床+0.001/+0.002とする**実3D比較案**を作成。源R98本体、R107歴史形状、読書家具、入口門柱、元の床を残す。5経路床/頭上/横断非悪化とR110の幅3点・9地点・勾配・頭上の改善を求める。条件不足は形状不変HOLD。
- R60の既存画面にR111 JSON/OBJ、および合格候補が存在したときだけ同カメラ比較図を追加。旧ZIP/CMD/Workflowを増やさず既存Windows/Ubuntu CIの当該コミットへR111の実源1回試験を投入し、その後はPush/PR軽量スモークへ復帰。手動の完全回帰にはR111実源テストを保持。現時点の[Actions #39978338498](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39978338498)と[#39978346028](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39978346028)は最終確認でqueued。**R111による形状変更の採否・7件のsource種類・新しい通行性能は未確定**。コードコミット成功を実QA成功と混同しない。
- 現行建築の美術・独創性・人体歩行・荷重支持・Minecraft教育版検証、Qwen/Gemmaの汎用建築能力はHOLD/未検証。施工・ワールド接続/読取/書込・追加推論・ローカルWork禁止、NOT_PREPARED・9 BLOCKED・BuildPlan空、PR #128 Draft・未マージは継続。

## R112実形状への修正（2026-10-24 JST／初回実源結果待ち）

- R111[Windows/Ubuntu実メッシュCI #39978338498](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39978338498)は双方SUCCESS、ログが一致。R110の7頭上ヒットは**全部R93右翼灯籠庇**の同一現行三角形4474（`right_R93_ANGLED_LANTERN_CANOPY_ART_STUDY`）。R87/R94の床仕上げを疑ったR111は原因違いだったため**形状変更0、HOLD**。実床9地点×横幅3は実源が見つかり勾配0.125942、交差7件は消えていない。
- [R112の実形状実装](../scripts/b198zr112-lantern-canopy-clearance.mjs)／[テスト](../scripts/b198zr112-lantern-canopy-clearance.test.mjs)／[設計](B198ZR112_LANTERN_CANOPY_RELIEF_JA.md)。問題のR93灯籠庇の共有辺連結トライアングルを取得し、**書架の外側取付点を残して内側張り出し縁だけ後退**する4案（係数0.35/0.55/0.75/0.88）を実メッシュ比較。旧R107の5本の床/頭上/横断Ray非悪化、R110の連続床/勾配/頭上Ray改善、無関係の元床・家具・外殻・玄関非変更を必須にする。基準源のR98/R107形状は別保持。採用根拠なしなら元形状のままHOLD。
- R60の既存同一レビューにR112 JSON/3D比較OBJ、採用時のみ同カメラ比較図を追加。初回両OS実源試験は[Actions #40024243758](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024243758)と[#40024249354](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024249354)に固定。**この文書更新時点では実値・採用不明**。通常Push/PRは軽量テストへ復帰し、手動の全歴史回帰にR112実源テストを残した。
- アート品質と人の連続移動/頭上空間/荷重・支持・Minecraftワールド施工・実LLM汎用建築能力はHOLD。NOT_PREPARED／9 BLOCKED／BuildPlan空、新規推論・ワールド接続/読取/書込/施工・ローカルWork 0、main/凍結原本/PR #128 Draft維持。

## R113内側採光稜線の3D改修（2026-10-24 JST／実源CI結果未確定）

- R112の[実メッシュCI #40024243758](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024243758)でWindows/Ubuntuが共にSUCCESS、実ログ一致。R93灯籠庇の共辺2三角形（4473/4474）について内側の張り出し縁を0.35/0.55/0.75/0.88だけ後退させた4形状は、全てR110コンター経路の**頭上Ray7→7**、床欠落0、横断0、旧5本の各Rayは非悪化。**4案とも不採用、R112で採択した形状改変は0**。単に庇を狭めるのは有効でないと判明。
- [R113実装](../scripts/b198zr113-pitched-lantern-daylight-canopy.mjs)／[テスト](../scripts/b198zr113-pitched-lantern-daylight-canopy.test.mjs)／[資料](B198ZR113_PITCHED_LANTERN_DAYLIGHT_JA.md)では、R112の局所・共辺・棚縁保護を維持し、内側採光稜線の後退と高さ増分を同時に設計。4案（0.55/+0.06, 0.65/+0.09, 0.75/+0.12, 0.88/+0.15；正規化値）。旧R107 5通路のRay非悪化、R110の実床9地点×3サンプル/勾配/頭上改善、外壁屋根マージン確保を厳格に要求。**実際の3D形状を比較し、条件が足りなければHOLD・旧形状を完全保持**。
- 既存R60レビューにR113 JSONとOBJ、採用された場合のみR107との同カメラ比較を追加。[一度だけの実源CI #40024745083](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024745083)、[#40024765222](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024765222)は再開文書更新時点でqueued。**採用数・頭上改善数は未確認であり断言しない**。Push/PRは軽量試験に戻し、既存R60手動フル回帰に重いR113を継続。
- 元R98/R107/R112・凍結B143/Qwen、main、旧Freezeは非変更。実モデルによる未知用途への生成能力、人体の実歩行/荷重、建築美術（正面/斜視/側面/内部/入口）の独立判断はすべて未認証。施工・Minecraftワールド接続読取書込・追加モデル推論・ローカルWorkを行わずNOT_PREPARED／9ゲートBLOCKED／BuildPlan空。PR #128はDraft・未マージ。

## R114六視点レビューの採択時不具合を修正（2026-10-24 JST）

- R113の源メッシュ4候補のWindows/Ubuntu CI [#40024745083](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024745083) と [#40024765222](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024765222) は**R114作業時点でqueued、数値未確認**。R113の形状採用は未確定。古いR112が7→7で不採用だった事実は維持。
- 新たに、R111/R112/R113のR60レビューで**形状変更が成功した場合だけ**、既存R97描画器が要求する3形状ではなく2形状を渡して `THREE_SOURCE_VARIANTS_AND_DETAIL_FOCUS_REQUIRED` エラーになる不具合を発見。先行R111/112はHOLDのため露呈していなかった。**成功経路の回帰欠落**をそのまま残さない。
- [R114実装](../scripts/b198zr114-actual-three-pane-art-review.mjs)／[テスト](../scripts/b198zr114-actual-three-pane-art-review.test.mjs)／[資料](B198ZR114_TRUE_THREE_PANE_ARCH_REVIEW_JA.md)。元の実全館メッシュ、改修後の実全館メッシュ、実変更部分の源三角形だけを抽出したCLIPPED局所面の**3ペイン×同一カメラ6視点**へ統一。変更元のkind・SHA/全館非変更範囲・六視点の面数を照合し、比較元を捏造しない。R60同一レビューと `R114_REAL_THREE_PANE_ARCHITECTURE_REVIEW_EVIDENCE.json` に統合。
- R114専用quick testを既存Windows/Ubuntuの軽量Push/PR CIへ、同テストを従来の手動フル回帰へ追加。完了まではテスト成功を主張しない。**新たな建築修正を採用したわけではない**。人の美術判定や3D構造・屋根・実Minecraft動線を6視点の画家順SVGで認証しない。
- 引き継ぎは本ファイルを継続更新。R113の実源Ray改善/棄却を確かめた後だけ次の形状意思決定に進む。旧R98/Qwen・R107、main/Freeze、PR Draftを保持。NOT_PREPARED／BLOCKED×9／BuildPlan空／追加推論0／Minecraft世界操作0／ローカルWork0。

## R115実形状の本棚一体型・高窓庇研究（2026-10-24 JST／実源CI未確定）

- R113源メッシュ4候補[初回実源CI #40024745083](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024745083)と[R114の修正CI #40025353582](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40025353582)は本工程着手時点でqueued。**前工程の形状採用・改修成功を主張しない**。
- [R115実装](../scripts/b198zr115-integral-lantern-clerestory.mjs)／[試験](../scripts/b198zr115-integral-lantern-clerestory.test.mjs)／[説明](B198ZR115_REAL_INTEGRAL_LANTERN_CLERESTORY_JA.md)。R111で**同一R93庇面4474への実交差7件**とR112での**内縁のみ後退4案7→7の失敗**に基づき、R93のキャノピーだけでなく、その**真正の共辺接合を持つ書架壁の上端**も一緒に上げる局所造形を実装。屋根・読書用途・書架壁を消さず、壁の下端、実床、書机、玄関、外殻を完全保持する。4候補は正規化上昇+.07/+ .10/+ .13/+ .16。原本R98・R107のSHA、真正源4三角形（キャノピー2＋書架壁2）の共有上端と他面の不変性、旧5経路のRay非悪化、R110の実床9×3と交差改善、屋根マージンを保証できない案はHOLD。
- 既存R60レビューへR115 JSONと全館候補OBJを追加し、候補が検証に採択されたときだけR114の**元全館／変更後全館／変更面のみの実源3ペイン×6視点**を作成。R114にはR115の書架壁kindの保護された差分だけ追加許可。R115の専用quick試験を既存軽量PR CIと既存手動フル回帰へ、実源試験は**このR115コミットのpushだけ**を条件に追加し、以降の通常pushで重いテストを繰り返さない。ZIP/CMD/Workflowの増設なし。
- **この時点でR115の実測値・選ばれた建築案は未確定**。GitHub Actionsの実行範囲・実ログを確認してからのみ採否を公表。c01はLLM新規生成ではなく独立手続き型の研究であり、建築の独創性/人体実歩行/荷重/実Minecraft/汎用生成は未認証。NOT_PREPARED、9 BLOCKED、BuildPlan空、Qwen/Gemma0、Minecraft接続読取書込施工0、ローカルWork0、main/Freeze/凍結原本保存、PR#128 Draft継続。

## R116：R113実源CIの致命的中断原因を修復（2026-10-24 JST／修正後の実測未確定）

- [R113旧CI #40024745083](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024745083) はWindows/UbuntuのR113重い実源テストが両方FAIL、双方で`B198ZR112_AUTHENTIC_R93_CANOPY_TRIANGLE_AND_BOUNDED_RETRACTION_REQUIRED`を記録。R113候補率0.65がR112 helperで許可されていなかったため、**2案目で例外が出て全4案比較が中断**した。これは頭上7件が幾何的に解決できないとの実測とは異なり、CIが途中で壊れたソース上のバグ。R113が改善したとは言えない。
- [R112の源庇 helper](../scripts/b198zr112-lantern-canopy-clearance.mjs) の研究候補4つはそのまま維持。R113から`allowR113Intermediate=true`を明示した場合に限り、前工程R113で固定した率0.65を許容する。範囲外の量は拒否。R113の各候補について実源roof margin/共辺/試験経路で既知のB198ZR112/113拒否があれば当該案HOLDとして残し**他の候補まで検証を止めない**。未知の例外は黙殺しない。R113全4件の採否数を検査し、0.65の短い局所試験を追加。
- 一度だけのR116修正後R113実源両OS試験を既存R60ワークフローへ登録。旧R115の[実源試験#40026557584](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40026557584)、R114の[軽量CI#40025353582](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40025353582)はR116作業開始時点でqueued。**修正後R113のHEAD/実源判定、R115新造形の判定はいずれも未確定**。HOLDや未完了を美術認証・Qwen汎用生成改善にしない。
- 原本R98/Qwen/Freeze、R107、mainを保護。PR #128 Draft/未マージ。NOT_PREPARED、9 BLOCKED、BuildPlan空。追加Qwen/Gemma推論0、Minecraft世界の接続/読取/書込/施工0、ローカルWork0。

## R117：源の頭上交差が残る実部材を特定（2026-10-24 JST）

- [R116/R113 source CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40028599761) は両OS成功。R113の後退・内縁持上げ4候補は全て頭上7→7、床欠落0、横断0、旧5通路非悪化、全案HOLD。[R115 source CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40026552643)も両OS成功。書架上端・庇一体持上げ4候補は全て頭上7→7、他のprobe悪化なし、全案HOLD。**CI成功を建築性能の改善としない**。
- [R117 real source scanner](../scripts/b198zr117-post-canopy-real-source-hits.mjs)／[test](../scripts/b198zr117-post-canopy-real-source-hits.test.mjs)／[資料](B198ZR117_SOURCE_REATTRIBUTION_JA.md)。旧R107の真正SHAを保持したまま、R113最大（0.88/+0.15）・R115最大（+0.16）の研究用実メッシュから、交点7件のsource kind/index/XYZと実変更面XYZを記録。旧面に当たり続けるのか、別面へfirst-hitが移動したのかを切り分ける。採否はR117 CI実測待ち。
- 施工・Minecraft世界操作・追加Qwen/Gemma推論・Workは0、NOT_PREPARED/9 BLOCKED/BuildPlan空。美術・人の歩行・支持は全HOLD、Draft PR #128維持、main/Freeze/B143原本未変更。

## R118の建築改修：庇から連続座面へ移った7交差に対処（2026-10-24 JST）

- [R117両OS CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40037989415)は成功。R113最大ピッチ改修およびR115最大本棚一体上昇のどちらも、元のR93庇4474から**実R93連続座面4476へ7件全てfirst-hitが移動**した。旧R113/R115は頭上7→7のため不採用。これまでの原因の見落としを修正し、座面張り出しに直接取り組む。
- [R118実3D修正](../scripts/b198zr118-reading-seat-clearance.mjs)／[テスト](../scripts/b198zr118-reading-seat-clearance.test.mjs)／[資料](B198ZR118_READING_SEAT_CLEARANCE_JA.md)。R115高窓の実源庇4面＋R93源4476に共辺で連なる連続座面帯を保持し、座面手前縁の35/55/70/82%後退を試験する。座面そのものを削除せず、背面の書架と足元の真正床・入口・外殻は非変更。残存座面幅0.0085以上（研究用正規化量）・旧幅17%以上を要求。美術/人間に使えるサイズは未認証。
- 既存R60レビューにR118 JSON/OBJを追加。真正床9×幅3と実源Ray・旧5通路の非悪化に合格し頭上7件が減った候補だけ形状採択。採択時のみR114の元全館/候補全館/局所変更面の3ペイン6視点を生成。CI quickは通常push/PR、重いR118 sourceは指定push一度だけ、既存手動fullにも追加。**本引き継ぎ作成時点ではR118候補の採否・CI結果は未確認。**
- 人体歩行・座り心地・構造・Minecraft実使用・Qwen/Gemma汎用モデル能力は未認証、c01はコード独立研究。NOT_PREPARED／9 BLOCKED／BuildPlan空／モデル推論0／ワールド接続・読取・書込・施工0／ローカルWork0。PR #128 Draft・main/Freeze/B143原本保持。

## R119：2箇所目の読書座面源4535を比較（2026-10-24 JST）

- [R118実源CI #40039411668](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40039411668)はWindows/Ubuntu両方SUCCESS、ただし4案とも頭上7→7でHOLD。座面後退35%ならfirst-hit源4476＋4535、55/70/82%なら源4535のみ。床欠落0・横方向交差0・旧5経路非悪化。
- [R119実源2座面案](../scripts/b198zr119-two-reading-bay-setback.mjs)／[テスト](../scripts/b198zr119-two-reading-bay-setback.test.mjs)／[工程資料](B198ZR119_TWO_BAY_SEAT_CLEARANCE_JA.md)。R115庇上昇とR118元座面4476の55%後退を行った上で、4535が本当にR93連続座面であり、独立の真正共辺帯である場合のみ第二帯を35/55/70/82%後退。座面・床・開口・書架を消さず、源面kindと四隅、残存奥行きを保護。元R107/R98原本は不変。差分は庇／書架頂／座面だけに制限し、実Rayと既存5経路の非悪化で採否。
- R119 source JSON/OBJと採択時の3ペイン6視点を既存R60レビューへ統合。**この文書の時点でR119実メッシュCI・採否は未確定**。過去のCI PASSは形状改善・人体通行・美術完成を意味しない。
- NOT_PREPARED、9 BLOCKED、BuildPlan空、Qwen/Gemma実推論0、ワールド接続/読取/書込/施工0、Work0。main/Freeze/B143元モデル保持、PR#128 Draft。

## R120：原因は2番目のベンチではなくR94吊り下げ採光リブ（2026-10-24 JST）

- [R119実メッシュCI #40049744767](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40049744767)は両OS成功。初めて真のsource **4535 = `right_R94_SUSPENDED_LIGHT_RIB_NOT_HEADROOM_CERTIFIED`** と三角形頂点XYZを実測（座面ではない）。R119は2つ目の座面を削らずHOLD。因果の順序はR93庇4474→R93ベンチ4476→R94採光リブ4535。元R93庇と座面の元建築は保持。
- [R120実形状](../scripts/b198zr120-r94-suspended-light-rib-relief.mjs)／[テスト](../scripts/b198zr120-r94-suspended-light-rib-relief.test.mjs)／[設計](B198ZR120_R94_LIGHT_RIB_JA.md)。R115の庇＋書架頂実源上昇0.16、R118のベンチ前縁55%後退、R94吊り下げ採光リブ4535と連続採光エッジ4536の屋内頂上昇+0.045/0.070/0.100/0.135を**同一3Dメッシュ**で比較。屋外側の取り付け点、R94入口柱、座面、実床は保護。頂点の共用、面積・屋根余白の拒否を実装。
- 旧R107/R98 SHA、真の床9×幅3点、源Ray床0・側面0・頭上7減少、旧5源通路の非悪化が全て必要。採択時のみR60既存JSON/OBJとR114同カメラ3ペイン×6視点へ。既存R60にquick、初回push限定のsource-test、手動full回帰を統合。**本時点でR120実源CI・形状採否未確定**。
- c01はQwen生成能力ではない。美術/人の通行/構造/実ゲームはNOT_REVIEWED/HOLD、NOT_PREPARED／9 BLOCKED／BuildPlan空／追加推論0／ワールド接続/読取/書込/施工0／Work0。main/Freeze/B143原本保護、PR #128 Draft継続。

## R121：R120実3Dで初の頭上Ray7→0、形状の継ぎ目と美術比較へ（2026-10-24 JST）

- [R120 Windows/Ubuntu実源CI #40050564935](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40050564935)で4案のうちR94採光リブ+0.100と+0.135が**真正R110の頭上Ray7→0**、床0・側面0・旧5経路非悪化。小変化量+0.100のR120源メッシュSHA256 `f83df1cea30da0e149ccd2159667bb8230cd5b3c1f444a774fdaa24d332588b2` が幾何検証候補。変更源面は4471〜4476,4535,4536の8枚。+0.045/+0.070は7件残留・不採用。
- [R121実源の建築接合・6視点化](../scripts/b198zr121-r120-source-art-packet.mjs)／[テスト](../scripts/b198zr121-r120-source-art-packet.test.mjs)／[説明](B198ZR121_R120_SOURCE_ART_PACKET_JA.md)。元R107/凍結R98 SHAを再検証し、変わる8枚と旧共有辺/頂点との接続を元メッシュと照合する。R114の元全館/候補全館/変更8面を6方向×同カメラ・実頂点投影で生成。既存R60内の**R121初回だけ**Actions artifactに証拠JSON、6視点HTML、元OBJ、候補OBJ、差分OBJを保存（保持30日）。新workflowなし、手動ユーザーZIPなし。GitHub上にはコード・検査・比較資料を継続保存。
- **R121実源CIのWindows/Ubuntu両方成功、5組の旧共有辺と9組の旧頂点関係で切れ0件（[Actions #40069281457](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40069281457)）。5ファイルの同内容成果物をOS別にアップロード済み（各約848KB、Actions保持30日）**。R120のRay PASSは実歩行の連続掃引・採光性能・荷重安全性・人の独立美術評価ではない。美術NOT_REVIEWED、工事NOT_PREPARED、9 BLOCKED、BuildPlan空、モデル推論0、ワールド0、ユーザーPC Work0。旧main/Freeze/B143凍結元Qwenを改変せず、PR#128はDraft。

## 直近CIの注意点（2026-10-23時点。変化したら再確認）
- [R44 Windows CMD](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39914804614)：46を期待、実ファイル47で `R44_EXACT_SOURCE_COUNT_EXPECTED_46_ACTUAL_47_BASE_37_OVERLAY_10`。ファイル数合わせではなく期待リストと実マニフェストを照合する。
- [B198H Chromium](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39914803840)：Playwright 1.56.1が当該Ubuntu 26.04のChromium導入に非対応。ブラウザ審査自体はこのCIで未実施。
- [R55 workflow](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39914889413)：失敗状態。取得結果から根因を断定できない。
- PR本文はR1〜R17中心で、後続R77〜R96の要約が古い。再開時に整える価値がある。

## R97の残作業とR98への移行条件
1. 現在HEADとPR #128、最新CIを再照合。
2. R97で生成される6視点×3版の比較HTMLを実際に開き、同一カメラ/倍率と形状描画を人が確認する。新規建築画像を生成して証拠と混同しない。
3. R95で見つかった右側最上層tier3の頭上外殻交差、7室の通行/視線/窓部支持の形状上の問題を目視と実メッシュで検討。
4. 明確な欠点と優先順位をまとめ、R98で形状修正する対象を絞る。審査していない美術をPASSにしない。
5. 既存R60レビューの導線を再利用し、新規ZIP・CMD・モデル推論・Minecraft接続を増やさない。
6. R97の最新HEADでのCI結果と実HTML美術審査を区別して報告し、重要な改善対象が明確になってからR98へ移る。

## 次の研究段階（変更可能な計画）
- R98：R97で証拠の得られた美術/頭上高/接合上の重要欠点を比較バリアントで直す。
- R99：入口→左右7層→上階ラウンジの有限幅・有限頭上空間の利用性を独立に再審査する。
- R100以降：図書館に依存しない「自然言語→独自建築構想→用途/内部統合→実3D→レビュー→修正」の汎用生成能力に研究を戻す。新たな実Qwen推論は必ず個別の明示承認が必要。

## ここをどう更新するか
- **日次更新しない。** 新しいチャットへ移るだけなら文書変更は不要。
- 実装と検証に意味ある節目（例：R97完了）ができた時だけ、この「現在地・次工程・CIの注意点・未解決」の事実を短く更新。コミットのたびに巨大な全履歴を書き直さない。
- 新旧の食い違いではGitHub最新HEAD/当該コード/Actionsが優先。安全方針は固定憲章を優先。履歴の詳細は既存のR番号doc/Gitコミットへ参照させる。
- `README.md`は入口リンク以外を毎回編集しない。更新でワークフローを増やさない。

## 新チャットで送る最短メッセージ
> MinecraftAIBuilderを継続。GitHubの `docs/AI_RESTART_JA.md` と `docs/AI_PROJECT_CHARTER_JA.md` を読み、PR #128の最新HEAD・CIを再確認して次工程を進めて。安全境界を維持。
