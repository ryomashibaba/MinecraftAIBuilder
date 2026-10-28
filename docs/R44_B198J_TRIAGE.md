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
