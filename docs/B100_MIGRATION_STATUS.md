# B100 GitHub migration status

- GitHub repository: `ryomashibaba/MinecraftAIBuilder` (PRIVATE).
- Bootstrap commit: `5a3aa4a21662c5147b76e88c0e67fbc71471be60`.
- **Status: Awaiting audited source import.** The bootstrap README alone is not a functional build.
- Source: verified B100 immutable archive; 1,613 files, 251/251 historical tests PASS.
- Prepared selected offline code and pinned JSON fixtures. Exclude historical ZIPs/TAP logs/generated HTML and binaries from daily Git.
- A single Windows import command is needed because ChatGPT's container cannot reach github.com directly. This operation does **not** use the Minecraft transport.
- After source import: `.github/workflows/qa.yml` will run frozen-file hash verification, construction-safety checks and all 251 offline tests automatically.
- All construction gates remain BLOCKED. Previous 296 unapproved rooms plus 18 held rooms remain unchanged. `readiness=NOT_PREPARED`, `BuildPlan.operations=[]`, `worldCoordinates=null`, no live world operations.

Do not mistake the bootstrap commit for a completed migration, nor a QA PASS for construction permission.
