# Third-Party Notices

This file documents third-party material included in MinecraftAIBuilder. It is **not** a license for the MinecraftAIBuilder source code.

## MicrosoftDocs/minecraft-creator: Minecraft block reference documents

- Source repository: https://github.com/MicrosoftDocs/minecraft-creator
- Pinned source revision: `1dfc5c4fa1cd75cabe558b08adee3420264ff0b5`
- Licensor: Microsoft Corporation and contributors
- License for documentation and non-code content: **Creative Commons Attribution 4.0 International (CC BY 4.0)** — https://creativecommons.org/licenses/by/4.0/
- Original legal notices: https://github.com/MicrosoftDocs/minecraft-creator/blob/1dfc5c4fa1cd75cabe558b08adee3420264ff0b5/ThirdPartyNotices.md
- Full CC BY 4.0 license text in the source repository: https://github.com/MicrosoftDocs/minecraft-creator/blob/1dfc5c4fa1cd75cabe558b08adee3420264ff0b5/LICENSE
- Source repository's separate MIT license for code (not applicable merely because a file is a documentation table): https://github.com/MicrosoftDocs/minecraft-creator/blob/1dfc5c4fa1cd75cabe558b08adee3420264ff0b5/LICENSE-CODE

The following complete documentation copies are included without modification, as verified by exact byte-for-byte source comparison at the pinned revision:

1. `source/parallel/b74/main/runtime_evidence/catalog/sources/BlockStateAndTraitListings.md`
   - Upstream path: `creator/Reference/Content/BlockReference/Examples/BlockStateAndTraitListings.md`
   - Original metadata: `author: chipotle`; `ms.author: mikeam`
2. `source/parallel/b74/main/runtime_evidence/catalog/sources/IntrinsicBlockStatesList.md`
   - Upstream path: `creator/Reference/Content/BlockReference/Examples/IntrinsicBlockStatesList.md`
   - Original metadata: `author: iconicNurdle`; `ms.author: mikeam`
3. `source/parallel/b75/main/evidence/Blocks.md`
   - Upstream path: `creator/Reference/Content/VanillaListingsReference/Blocks.md`
   - Original metadata: `author: mammerla`; `ms.author: mikeam`

Per-file provenance information, including upstream URLs and SHA-256 digests, is also recorded in
`source/parallel/b74/main/runtime_evidence/catalog/sources/manifest.json`.
The project additionally contains block-related catalogs and offline analysis based on reference information; this notice does not imply that all project-created outputs are themselves copies of the upstream documentation.

The listed author metadata is preserved for attribution purposes, but it is not an assertion that the metadata names exhaustively identify all copyright holders.

Microsoft, Mojang, and Minecraft-related names and marks are the property of their respective owners. The above licenses do not grant any trademark rights. MinecraftAIBuilder is an independent project and is not affiliated with or endorsed by Microsoft or Mojang.

## Other project components

The source repository includes architectural computation code, offline reports, example SVGs, and Minecraft Education verification evidence. No ownership or reuse license for this project-created material is granted by this third-party notice. Original authorship/provenance of earlier locally imported source snapshots remains subject to the separate publication audit documented in `docs/PUBLIC_RELEASE_AUDIT_JA.md`.

GitHub Actions references public tooling such as `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `browser-actions/setup-chrome@v1`, and installation of `playwright-core@1.56.1` during CI. These dependencies are obtained at workflow runtime, not included here as vendored package copies. Their separate licensing and security maintenance remain the responsibility of their upstream projects.
