# MinecraftAIBuilder

**Minecraft Education Edition first · Java Edition later · source repository**

## Development baseline
- B100: universal architectural concept IR, 5 purposes × 3 designs, **not Minecraft world-ready**.
- Existing 296 room candidates remain unapproved; 18 held rooms remain held.
- `readiness=NOT_PREPARED`; all 9 construction gates remain `BLOCKED`; no world connection or commands authorized.
- Full original B100 archive is preserved separately, not re-committed into the everyday Git history.

## Offline QA

Run from repository root:

```bash
node scripts/verify-freeze.mjs
node scripts/verify-safety.mjs
cd source
node --experimental-vm-modules --test parallel/b{92,93,94,95,96,97,98,99,100}/main/compile-b*.test.mjs
```

On Windows, use GitHub Actions for the portable exact test invocation in `.github/workflows/qa.yml`.

## Development workflow

Use `feature/b101-*` branches; make pull requests; preserve B100 frozen code and pinned reports. Use the CI status and factual 3D review, not test counts alone, to judge readiness. Never push credentials or historical evidence ZIPs. The verified initial import contains a selected B100 source/fixture snapshot; excluded files remain in the original archive and are listed in `docs/B100_IMPORT_EXCLUSIONS.json`.

**CI PASS is not construction approval.** Minecraft live operations require a separate explicit authorization.

## Publication and licensing

This repository contains source code and offline verification records for MinecraftAIBuilder. The project does **not** currently declare a license for its own code; public visibility alone does not authorize reuse, modification, or redistribution. For included third-party documentation and the corresponding attribution and licenses, see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The publication safety review and source-provenance notes are in [docs/PUBLIC_RELEASE_AUDIT_JA.md](docs/PUBLIC_RELEASE_AUDIT_JA.md) and [docs/B71_B74_SOURCE_PROVENANCE_REVIEW_JA.md](docs/B71_B74_SOURCE_PROVENANCE_REVIEW_JA.md). Public visibility does not change the construction safety gates or authorize Minecraft world operations.
