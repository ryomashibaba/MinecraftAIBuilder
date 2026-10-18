# B198T — Actual Qwen source proposal metadata rescue, provenance and strict independent geometry safety

## Actual user evidence from the uploaded B198S ZIP

User trial with the real local `qwen3.8:27b` **returned the complete model response**. Model: 1 local `/api/chat` request, **92,403 ms**, `MODEL_RETURNED`, `doneReason=stop`, **1,385 generated tokens**, **19.15 tokens/second**, model loading **17.678 seconds**, prompt processing **2.362 seconds** (744 tokens), generation **72.342 seconds**, full response **3,697 characters**. `think:false` was requested; no guarantee the actual model obeyed it.

However, old B198S benchmark returned `HOLD_NO_COMPILED_SOURCE` with `B198A_CANDIDATE_REJECTED_AFTER_1_ATTEMPTS_B143_TITLE_OR_BRIEF`. The uploaded ZIP contained **NO model source JSON or HTML** because strict B143 rejected the candidate. No actual compiled architecture, visual semantic scoring or walking test can be inferred from this run. Original metadata is not included, so the precise text field failing is not independently known. This is categorically different from earlier 302-second `fetch failed`/360-second deadline issues: the inference transport is now functioning.

## Diagnosed code defect in B143

Previously the validator was:

```js
const strictName=x=>typeof x==='string'&&x.length>=1&&x.length<=100&& ...;
yes(strictName(d.title)&&strictName(d.brief)&&d.brief.length<=500,'TITLE_OR_BRIEF');
```

Despite the explicit **500-character brief specification**, `strictName(d.brief)` made the *effective brief maximum 100*. This can reject an otherwise valid 101–500-character descriptive brief with the same ambiguous `B143_TITLE_OR_BRIEF` error. B198T fixes the validator by parameterizing `strictName(x,maxLength)` and enforcing `title <=100` / `brief <=500`, still disallowing unsafe `<`, `>` and control characters, still requiring nonempty text. All geometry, work and world safety bounds are unchanged. Regression explicitly checks brief lengths 101, 250, 500 and rejects 501, and checks title 101 remains rejected.

## Bounded transparent repair after the true 500-char limit

`source/ai/b198t-metadata-only-repair.mjs` is opt-in only through the B198S SourceProbe's native response bridge, not a global/hidden compiler normalization. It parses full model JSON, insists on the exact original 3 envelope keys and an actual `design.elements` array. It **never alters the geometry**:

- If a safe, nonempty `title` is over 100 or a safe, nonempty `brief` is over 500, truncate **only those surplus characters** (UTF-16 surrogate-aware), then pass the entire resulting design through the original B198A structure gate and independently recompile with B143.
- Reject invalid/unparseable JSON, unexpected outer keys, wrong-field types, unsafe control/markup characters, empty text, corrupt geometry or extra invented source fields as before. No synthetic generic building, no filling absent text, no model-generated geometry edits.
- Record before/after *whole response* SHA, before/after B143 source JSON SHA, preserved element-array SHA, changed field name and precise original/repaired lengths. Raw text is never dumped into model telemetry. Original model-authored elements and all coordinates/materials are verified exactly unchanged.
- Surface a **distinct** `SOURCE_COMPILED_AFTER_METADATA_ONLY_REPAIR_HUMAN_REVIEW_REQUIRED` result if the repaired source compiles. This is not the same as a perfectly unchanged model response. A clean model source still uses `SOURCE_COMPILED_HUMAN_ARCHITECTURE_REVIEW_REQUIRED`. Neither certifies resemblance to requested Japanese architecture.
- Existing source-only viewer and frozen c01 benchmark remain in force. No extra model request is made; no hidden retry under the hood.

New B198S source prompt also explicitly tells the real model `title <=100`, `brief <=500`, and recommends much shorter Japanese titles and descriptions to avoid truncation. It does not reduce number of actual geometric primitives or constrain the architectural idea.

## User optional re-test

```powershell
$p = Join-Path $env:TEMP 'B198M_RUN_LOCAL.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/feature/b198t-provenance-preserving-metadata-repair/tools/B198M_RUN_LOCAL.ps1' -OutFile $p
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p -Mode SourceProbe -Model 'qwen3.8:27b'
```

This does invoke the real local model **one time** and can take several minutes. In the last live trial, the completed response took 92.4 seconds, but that number is an observation, not a guarantee. The B198S `-SourceTimeoutSeconds 300` bound remains. If a source compiles, the launcher prints the 3D viewer and `B198S_UPLOAD_THIS_RESULT.zip` path. If model JSON is malformed or geometry fails validation, it still returns an honest HOLD with SHA and error evidence, not a fabricated building.

## Safety, CI, lifecycle

- All tests mock Ollama as a **deterministic test double**. No CI inference should be treated as the user model's architecture quality. Windows test intentionally uses model-authored overlong title and brief in the mock, and requires proof of **both repaired strings**, the unchanged geometry, successful B143 compile, a genuine offline HTML view and ZIP, and exactly one model call.
- No new model, remote API, Work execution, Minecraft world connection, write, approval, main merge or destructive edits to existing Draft branches. Not prepared and all 9 BLOCKED gates remain.
- The existing approved dependency chain is B198R #120 -> B198S #121 -> B198T new Draft. The previous B198S original branch is not mutated.

Next proper quality gate: **inspect the first independently compiled real source 3D viewer**, score fidelity to the frozen Japanese library prompt (void, shelving zones, top star-view lounge, curved coherent exterior), then improve freeform model prompting/effective geometry. Do not repeat benchmark-wide calls or produce false quality scores without live source proof.
