# B100 → GitHub migration

1. Source: `MinecraftAIBuilder_B100_Universal_Architecture_Education_First_Integrated_Handoff_20261012.zip` (the immutable original).
2. Imported content: select source scripts, read-only source adapters, and pinned JSON fixtures. 251 tests passed on this selected snapshot.
3. Large generated visual reviews, TAP logs, binaries, screenshots, and bundled evidence ZIPs remain out of Git. See `B100_IMPORT_EXCLUSIONS.json`.
4. Do not equate partial source import with a formally audited upstream open-source release. No public sharing permitted without separate license/provenance review.
5. New development is Education-first; Java Edition is deferred.
6. B99 and B100 frozen sources are protected by SHA256 manifest and `scripts/verify-freeze.mjs`; the initial import must not mutate these files.
7. Pull requests are used for new B101+ code. CI is offline and has no Minecraft connection. Original world data and user credentials are never required.

The initial source import needs a single Windows-side Git authentication/push. The provided `RUN_IMPORT_B100_WINDOWS.cmd` performs the copy and Git actions after verifying the manifest. It does not run Minecraft or alter the original ZIP.
