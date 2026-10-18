# B198I — Model-Directed Architecture Program → Strict Real B143 Geometry

## Intent / architectural-quality rationale

B198G's autonomous source repair improved objective floor connectivity, and B198H brought one Japanese prompt into the versioned 3D Studio and provided the frozen 12+4 architecture benchmark. However, compiling legal source, satisfying large voxel counts, or creating connected floors still does not show that the model planned a coherent *building* instead of unrelated solids.

B198I adds a **category-neutral model-authored architectural program before 3D source synthesis**. The model first explains the intended overall visual character and the functional zones, then chooses concrete 3D coordinates where occupied material, open air, and actual usable 2×2 supported floors are essential. This is neither a fixed building template nor a hidden genre router. Existing strict B143 and B198C/B198G source geometry checks run after the model creates the actual design.

**Critical honesty:** an LLM's own plan can be wrong. An independent compiler establishing that the model built its own declared anchors is useful source-level consistency, but DOES NOT prove Japanese request comprehension, aesthetics, architectural function, real Minecraft player walking or physical structural feasibility. Human 3D rubric evaluation is still required.

## Implementation

- `source/ai/b198i-design-director.mjs`
  - Strict bounded architectural-program schema: one original project ID, legal local B143 bounds, 3–12 purpose-described functional zones, and 5–18 self-selected plan source-check anchors.
  - Anchors: `SOLID` = compiled source voxel present; `AIR` = source voxel absent; `SUPPORTED_FLOOR` = all four 2×2 floor cells occupied and all eight 2×2 cells over the next two y-levels empty. No inference about actual player motion.
  - Validates independent zone references, contradictory duplicate-coordinate expectations, bounded coordinates, and floor-headroom extent before any source generation.
  - Reuses genuine B198G strict B143 original source creation and conservative geometric repair. If the model's first compile fails promised anchors, it receives the *actual failed occupied/air/floor points* and may regenerate a **new** original source at most three times. No illicit edit of existing buildings or relaxing B143 limits.
  - Selects best independently verified source by actual plan-anchor count then number of high-risk source findings; no fake semantic score. Returns a source-only `HOLD_SOURCE_PLAN_OR_TOPOLOGY` on incomplete results or `SOURCE_PLAN_ANCHORS_PASS_HUMAN_REVIEW_REQUIRED` when only the model's own source-point obligations and generic topology are satisfied.
- `source/ai/b198i-local-planner.mjs`
  - An optional explicit-model OpenAI-compatible LOCAL chat-completions planner, only literal `http://127.0.0.1:PORT/v1/chat/completions`, redirects forbidden. It never contacts a model on import and never has API keys or world interfaces.
  - Reuses the existing B198G local strict source generator for actual B143 source; unsupported server protocols fail closed.
- `scripts/b198h-local-workflow.mjs`
  - Adds an **opt-in `--directed` flag** for new one-command Japanese prompt → program → original source → existing B198D 3D versioned Studio. Keeps all prior `--prompt` and `--design` workflows and the existing source-approval/reject/Undo/Redo untouched.
  - Records the complete model-proposed plan in `B198I_MODEL_ARCHITECTURAL_PROGRAM.json` and its independently recompiled exact-source result in the project `B198H_INITIAL_MODEL_SOURCE_REVIEW.json`, pinned by SHA.
  - Refuses creation over nonempty previous Studio project. Studio approval concerns the editable **design source** only, not a Minecraft world.
- Two new focused test modules for independent 3D source anchors, intentionally wrong model output, bounded regeneration, strict local model boundary, actual Studio HTTP initialization and HOLD on wrong plan points.

## Opt-in real local use (not executed in GitHub CI)

Start a separately controlled compatible model serving an explicitly chosen local model ID at 127.0.0.1. Then, with an empty/new project directory:

```sh
node scripts/b198h-local-workflow.mjs studio --project ./b198i-my-design --local-model YOUR_LOCAL_MODEL_ID --prompt "海沿いの近未来図書館。中央の大吹き抜け、読書翼、屋上の星空ラウンジを、外観の曲線と室内の移動を考えて設計して" --directed
```

This path sends a model request to the declared **loopback** service only when the user actively runs it. A specific model's support for `response_format: json_object`, quality on Japanese instructions, prompt length, reasoning, and response size is **not verified** here. If the model cannot comply, the source remains on hold or the command fails. There is NO deterministic fake-model fallback. The old non-directed Studio and frozen B198H benchmark remain available.

## Evidence, failures and limits

CI uses explicitly labeled injected test doubles — one source with an occupied voxel where the model's plan promised air, and a regenerated actual B143 source that genuinely corrects that voxel mismatch; more fixtures exercise exact 2×2 headroom, unsupported claims, plan-schema corruption and no remote provider redirect. The existing B198A–H source/Studio tests and desktop/mobile real Chromium regression are also run. **Test fixtures are not independent evidence that an actual local model has learned better design.**

Aesthetics, cultural accuracy, building entrances, realistic stair circulation, user comprehension, model reliability and Minecraft real-world placement remain UNREVIEWED/NOT_RUN. B198E original 4+4 examples and B198H's 12+4 human benchmark rubrics are not overwritten; they are separate comparison reference points for a future truly live A/B run.

## Safety / project continuity

All older Draft PRs and `main` untouched, and new B198I work stacks on the exact B198H HEAD. B143 160 operations and 160,000 occupied-voxel caps are preserved. NEBULA ARK historical sources and its main building untouched. No paid API/Work/Minecraft real world action: `NOT_PREPARED`, nine `BLOCKED`, worldContacts/worldWrites=0, BuildPlan empty, world coordinates null.

## Next quality gate

Run a real explicitly authorized local provider on selected frozen B198B tasks with and without the model-directed program. Compare genuine first-pass source-goal pass rate, declared program-to-source anchors, 3D design quality and independent human visual feedback, using identical task prompts and source hashes. Only evidence from a real model and actual human visual inspection should justify stronger quality claims.
