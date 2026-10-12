# MinecraftAIBuilder

**Private development repository — B100 migration in progress.**

Goal: build high-quality, structurally diverse Minecraft buildings from Japanese-language briefs, with complete interiors and safe construction. **Minecraft Education Edition is the first production target; Java Edition is deferred.**

## Current state

- B100 frozen source is being prepared for initial import; this repository does **not** yet contain the full B100 implementation.
- No Minecraft world operations are authorized. Construction remains `NOT_PREPARED`; all nine construction gates remain `BLOCKED`.
- Legacy 296 room candidates and 18 held rooms are unapproved and must not be modified or promoted.
- B100 complete original ZIP remains the external restore point.

## Next

1. Import the sanitized B100 source snapshot using the verified migration kit.
2. Run 251 offline tests in GitHub Actions.
3. Continue B101 work using branches and pull requests. ZIP archives are reserved for milestone backups.

**Do not treat a CI pass as construction permission.**
