# R44 / B198J follow-up — October 28, 2026

R44 Windows CMD fake-only CI (run 40689803794) stopped before inference:
`R44_EXACT_SOURCE_COUNT_EXPECTED_46_ACTUAL_47_BASE_37_OVERLAY_10`.

The immutable R16/R24/R44 manifests specify 32 / 7 / 10 path entries.
R24 replaces two R16 paths: 32 + 7 - 2 = 37.
R44 replaces one already installed R24 path:
37 + 10 - 1 = **46**. Increasing the expected count to 47
would not be a justified fix.

The observed extra logical key in Windows PowerShell has not been
identified. Inspect only the historic manifests with:
`node scripts/r44-pinned-path-audit.mjs`

To compare paths of an existing isolated R24 staged copy without
modifying it: `node scripts/r44-pinned-path-audit.mjs --installed-base "C:\\absolute\\R24_Mini_44108944d0d9"`.
This checks path names only, NOT installed file-content SHA.
The original R24 `-CheckOnly` and immutable SHA checks remain mandatory.
Historical R44 launcher code must NOT be silently re-pinned; a future
freshly reviewed one-shot consent flow would require separate authorization.

B198J remains a strict HOLD when disconnected same-height public
floors coexist with high-risk source topology. The primary status
remains `HOLD_SOURCE_PLAN_OR_TOPOLOGY` and new independentHoldReasons
provide both failures without falsely elevating either to PASS.

## Windows proof of the exact 47-key failure

Actions run `40693046554` instrumented the actual isolated R24 stage
without changing the historically pinned R44 one-shot runner. Windows
returned **37** actual files, but the passed-in short `Base` path was
114 characters while PowerShell's canonical `Get-Item.FullName` path
was 117. All 37 legacy `Substring(Base.Length+1)` keys began with
an erroneous `d9/` prefix. In particular the existing R24
`source/ai/b198s-native-ollama-source.mjs` did not match R44's overlay
key, so the dictionary claimed 47 paths rather than the true 46.

**Fix for future, newly approved installers:** anchor relative paths to
`(Get-Item -LiteralPath $base).FullName.TrimEnd('\\')`, then derive each
file path relative to that same canonical root. Confirm a component-aware
root prefix, exact 46 SHA pins, and a separate consent boundary. Do NOT
change the historical installer's hash, downloaded binaries, lock, or
model approval. Historical CMD remains fail-closed until a new versioned
launcher with explicit fresh consent is reviewed.
