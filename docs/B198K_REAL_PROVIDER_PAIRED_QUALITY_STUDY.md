# B198K — Real local-model paired architecture trial: direct B198H vs. directed B198I/B198J

## Objective and fixed development policy

The highest-priority remaining research question is whether the increasingly sophisticated architectural-planning pipeline **actually makes better buildings for arbitrary Japanese prompts**. Previous B198G–J CI used *explicit deterministic test doubles*, so it proved DSL/geometry/controller correctness but **did not answer that question**. B198K adds an executable source-backed same-prompt A/B trial and evidence-first human comparative 3D review; it does not fabricate a quality conclusion or pay for API inference.

B198K stacks directly on the B198J Draft PR, preserving original B197 NEBULA ARK and 36 historic designs. The sole authority for the test questions is the existing frozen B198B 12 creation genres plus 4 dependent follow-up revisions. No prompt rewrites, category routers or fixed source-building templates are introduced.

## Opt-in use after a compatible local model is running

From the repository root, with a free output directory name:

```sh
node scripts/b198k-local-comparison.mjs --model YOUR_ACTUAL_LOCAL_MODEL_ID --out ./b198k-new-review
```

Defaults to 12 independent original Japanese buildings + their 4 dependent revisions, attempted under *both* paths: up to 32 source cases, with honest per-case source/model failure states. A quick smaller run can use `--cases 1` to include c01 and r01, or `--no-revisions` to exclude dependent revisions. Alternative localhost port: `--endpoint http://127.0.0.1:12345/v1/chat/completions`. All model calls are opt-in; no calls occur when this file is imported, and all endpoints are validated as numeric 127.0.0.1 with redirects forbidden.

The local model must support OpenAI-compatible `/v1/chat/completions` and structured JSON. Model availability, current installed model versions and actual generated architectural quality are **NOT_RUN / UNKNOWN** until a genuine local execution occurs. Running the CLI will consume local model inference compute (not billed tokens).

The run creates an **entirely new folder** with `direct/` and `directed/` per-case strict B143 source JSON and standalone 3D HTML; an offline `index.html` case selector displaying both distinct source-rendered 3D viewer iframes; and `B198K_PAIRED_SOURCE_COMPARISON.json` containing all frozen case IDs, exact prompt digest, source and geometry SHA, source-goal counts, high-risk source critic findings, request counts, and unmatched/missing pairs. It refuses overwriting an earlier trial before contacting a provider. Both existing strict B143 source validation and source-only protection controls remain in effect, even if a live model returns invalid JSON or fails to follow instructions.

## Experiment design and caveats

**Direct arm**: existing B198H frozen benchmark with the existing B198A model-source converter (max one invalid source retry by default), strict B143 compilation, source-goal diagnostics and guarded revisions.

**Directed arm**: same original Japanese prompt, separate model-authored architectural program (B198I) with source-check anchors, model-authored B143 design and B198J two-wide public-floor connection proof. Up to three generated original design candidates; each candidate can include up to one B198G geometry-repair round. Four revisions use the same original frozen revision prompts, B198A strict source updates, and a stronger inherited *all voxels + unchanged material + previous floor/headroom* guard.

**Critical fairness limitation:** this initial A/B trial is an *engineering workflow comparison*, **not a randomized controlled study with equal tokens or equal number of model requests**. The directed workflow contains a planner and more candidate attempts than the direct path, and it may have significantly more context/compute. Logs explicitly report both retry budgets and actual invocation counts. Differences cannot be attributed exclusively to better architectural reasoning without further budget-matched controls. Do not report automatic improvement percentages from this alone as causal evidence.

Review interface alternates which arm appears as A or B based on stable case-ID hashing to reduce simple left/right bias; it does **not** guarantee a fully blind human experiment. It displays the original Japanese task and frozen human criteria, then requires explicit 0–4 ratings and at least 25 characters of concrete observations for **each** criterion in **both** source-backed 3D viewers. A preference or 'tie / neither' choice also needs written evidence. A human can export a local JSON review; it is labeled *self-reported* and not auto-certified. No default score, fabricated reviewer, auto winner, model-only semantic grade, or benchmark PASS arises from source counts or generated HTML.

The A/B viewer has **independent camera controls** in each iframe (not automatically synchronized). Its separate 3D scenes are actual B143 geometry, not still images. A valid semantic judgment about ease of navigation, aesthetics or Japanese cultural identity still needs human inspection, potentially followed by Minecraft in-game testing under a separate explicitly approved world. No in-game walking tests are included.

## Safeguards and known limitations

- Existing frozen B198B benchmark cases and original source materials unchanged, prior Draft PR bases unchanged, `main` never merged automatically.
- Original source maximum 160 elements and independent 160,000 occupied voxels. Larger jobs require modules, not expanding the caps.
- Model responses and generated plans are *untrusted*, passed through original strict compilation and guarded revision checks.
- Failures remain separately visible per case; a successful arm must not mask failure in the other. No completed output path is overwritten.
- CI exercises mock local-compatible generators only. Any claimed real provider success is labelled merely `EXPLICIT_LOCAL_LOOPBACK` with `localModelIdentityNotIndependentlyAuthenticated: true`. Tests never claim OpenAI responses or human ratings.
- Minecraft Execution readiness remains `NOT_PREPARED`, nine `BLOCKED`, `worldWrites=worldContacts=0`, `worldCoordinates=null`, and empty BuildPlan.
- No Work mode was used, no paid API invoked and no local host run has been performed from this Chat session.

## Next quality phase

After a real compatible local model is explicitly available and the B198K A/B study run, human reviewers should judge the actual 3D scenes against the preserved frozen criteria. Only then should B198L prioritize improvements indicated by *observed* failures, such as incomplete stair access, sealed room layouts or unconvincing exterior massing. Avoid adding additional synthetic audit layers unless the real evidence points to a specific architectural failure.
