# B198A — Natural-language AI architecture / model boundary, real source, safe revision

## Purpose and release truth
MinecraftAIBuilder is meant to accept **arbitrary Japanese or English natural language** architectural requests, have a genuine capable language model *author an original* source plan, create a real 3D design within an existing STRICT B143 architectural source compiler, iteratively correct / revise it, then move toward Minecraft Education deployment **only after separate world-specific authorization**.

B198A creates the real, category-neutral **model-adapter + source-verification + atomic revision + offline studio pipeline**. There are no embedded building-type keyword parsers or fake deterministic "AI". The actual LLM reasoning comes from an injected model adapter, which is OPTIONAL until explicitly configured. **GitHub Actions deliberately does NOT run any live provider API calls or spend model tokens**: its model responses are human-authored fixtures for testing integrity, different geometries, adversarial outputs and revision logic. The successful CI does NOT prove live AI prompt compliance or in-game construction.

### User workflow

1. Natural-language prompt, e.g. "木とガラスを融合した近未来の図書館。中央は大きな吹き抜け、屋根には球形の天文台、回遊テラスを配置して".
2. The chosen actual LLM produces a complete **model-authored B143 source document** with primitives such as boxes, torus rings, beams, hollow glass ellipsoids, cylinders and procedural cuts.
3. The engine treats that entire model message as **untrusted data**, enforces the exact B143 schema and original 160,000 occupied-voxel limit / 160 element per-document quota / local bounds / fixed seven materials, compiles it **twice independently** (verification included), and rejects invalid or unsafe candidates. Up to two bounded model attempts are supported; the second receives short diagnostics instead of a silent mutation of old source.
4. A source-pinned **offline interactive 3D viewer** and deterministic design JSON, hashes, safety report are saved **atomically** only if the whole pipeline passes. The output folder must not already exist, so existing designs are never silently overwritten.
5. For revision, pass the original design JSON plus a natural-language request like "真ん中のガラス屋根だけ高く、周辺の石の柱は維持して". The model receives the original source; the engine checks the original design SHA **before** model inference; compares element IDs and contents; blocks silent removal and modifications of protected elements; caps unexpectedly broad changes; and retains the unedited base version on disk. No component-level Python or executable source code is accepted as the model candidate.
6. Exact semantic requirement fulfillment, physically traversable stairs, stability, aesthetics, real world location and Minecraft placement are **not machine-certified** in B198A. Human visual review is still mandatory.

### Real model invocation (optional, API usage billed separately)

This integration uses OpenAI Responses API with a strict outer response JSON schema whose payload is the serialized inner design. **The inner design is independently validated by B143**, not assumed safe because of JSON Schema. The provider uses no default assumed model; explicitly supply a currently accessible model ID. Your ChatGPT subscription is not an API credential.

PowerShell example:

    $env:OPENAI_API_KEY = "paste your own API key locally"
    node scripts/b198a-architect.mjs --prompt "宇宙船港に浮かぶガラスの展望美術館。大きな吹き抜けと立体的なデッキ" --model YOUR_MODEL_ID --out B198A_Glass_Museum_Review

Or save a longer Japanese description to a text file and supply:

    node scripts/b198a-architect.mjs --prompt-file brief.txt --model YOUR_MODEL_ID --out B198A_Museum_V2

Revision example:

    node scripts/b198a-architect.mjs --prompt "外殻の軌道リングを拡大し、中央の基礎は維持" --base B198A_Glass_Museum_Review/source-design.json --protect main-foundation --model YOUR_MODEL_ID --out B198A_Museum_Revision_01

The output folder contains:
- **source-design.json** — exact editable original AI model design document
- **source-proof.json** — B143 geometry hashes, edit diff, model-attempt diagnostic summaries, explicit NOT_PREPARED 9 BLOCKED
- **index.html** — interactive fully standalone actual 3D voxel exterior review (not a generated illustration)

API key remains in process environment; CI has no key or live model and outputs honest fixtures ONLY.

### B198A actual CI scope

The nine provider/model boundary and adversarial tests cover:
- Two genuinely different architectural 3D source designs (open amphitheater and scientific observatory) supplied as **test fixtures**, not as AI model achievements;
- A complete geometric revision with changed ring and an added balcony, exact unchanged base design and protected elements;
- Stale source version rejection *before* any provider call;
- Two-attempt candidate repair only after strict validation failure;
- Commands/world coordinates/executable formats/counterfeit approvals in model output rejected;
- Excess changes, destructive edits, silently shrinking original site rejected;
- Mocked provider HTTP/JSON envelope and secret protection;
- Honest semantic-coverage limits;
- Immutable Minecraft construction safety gates;
- Actual local CLI 3D output and non-overwrite behavior.

Model-authored geometry can still be aesthetically poor or semantically irrelevant; this is why B198B/B198C exist. The B198A fixtures explicitly include an irrelevant-model-vs-prompt case to show **compiler success != natural-language understanding**.

### Existing project untouched

B197 NEBULA ARK (#37) 149,410-source-voxel main model, 5 distinct large original concepts, the B172–B197 architecture documents, 36 original gallery concepts, Draft PR bases, physical prototype and Minecraft Education world files are not modified at all by this phase.

#### Future gates (quality over speed)
- **B198B — Real model evaluation:** user-scoped opt-in model key or supported model runtime, run ten or more genuinely unrelated prompts with rubric for semantic compliance, shapes, varied layouts, actual distinct source volume, floors and style; include challenging Japanese edits, conflicting instructions, timeouts and provider refusals. Never report success from fixture-only tests.
- **B198C — Architecture critic and controlled repair:** geometric negative-space tests, route/floor/headroom occupancy analysis, prompt-specific aesthetic and structural goals as separate unverified judgments, choice of alternate proposals; *not a simple voxel-count maximizer*. Add source comments and regression evidence for attempted versus passing floors.
- **B198D — Production design UX:** iterative visual revision, version comparison, undo/redo and provenance explorer, quick one-action export/review and optional personal model connection without leaking secret.
- **B199 and later — Staged real-world readiness:** design-to-material palette translation, target-world compatibility, collision with terrain, journal-backed preview and restore, and separate world-scoped user approval. B198A carries **zero** WorldEdit, SocketBE, Minecraft command, world position or build operations.

### Supported honest constraints
The current B143 DSL is **not arbitrarily unbounded**. It only supports box/ellipsoid/cylinder/torus/beam with add/cut, seven conceptual materials, <=160 authored elements/document, <=160,000 compiled cells/model, and finite site bounding dimensions; multi-design segmentation cannot automatically claim an executable merged city. B198B should record unmet user requests rather than pretend every possible architectural curve/material/mechanism is already supported.
