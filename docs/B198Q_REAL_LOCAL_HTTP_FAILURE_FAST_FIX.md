# B198Q — Real local-model network failure diagnosis

## Observed evidence: user-uploaded B198M trial (Qwen3.8 27B)

Actual paired B198K manifest and B198M summary record SIX local model requests:

| Request | Duration | Actual outcome |
|---|---:|---|
| Direct architecture creation | 302,860 ms | fetch failed |
| Directed architectural program | 217,728 ms | RETURNED |
| Directed source attempt 1 | 302,855 ms | fetch failed |
| Directed source attempt 2 | 302,678 ms | fetch failed |
| Directed source attempt 3 | 302,014 ms | fetch failed |
| Directed source attempt 4 | 302,160 ms | fetch failed |

Total observed model-request time **1,730,295 ms = 28m50.295s**. No B143 building compiled; no architectural quality measured. All five source failures closely cluster at **302 seconds**, despite an explicitly configured 360-second abort deadline. This strongly suggests Node's Undici fetch response-header timeout (~300 s), but the old logs omitted the nested failure cause. A local Ollama server disconnect is still a possibility. Do not claim definitive proof of the root cause yet.

## Repair delivered

1. New source/ai/b198q-loopback-http.mjs: native node:http POST transport for caller-opted-in CLI. Avoids fetch's hidden HTTP header deadline. It uses the adapter's explicit abort signal across response headers and body; no auto-retry, no redirects/proxy/remote hosts, no credentials. Strict numeric 127.0.0.1 HTTP chat completion URL only, request max 128 KiB, response max 512 KiB. All network failures have stable B198Q_LOCAL_TRANSPORT_ error prefixes.
2. B198A and B198I generator loops no longer treat fatal local network failure as source JSON/geometry failures. They stop instead of making repeated expensive requests.
3. B198K records TRANSPORT_FAILURE and the actual duration. With Pilot --stop-on-timeout the directed arm is skipped when the direct request lost its connection; no false quality scores.
4. Windows PowerShell 5.1 launcher retains GitHub ZIP download, Expand-Archive, B143 proof and local evidence ZIP. The new branch includes this fix without changing previous Draft PRs.

## Optional next test

Only if the user agrees to another costly local model run:

```powershell
$p = Join-Path $env:TEMP 'B198M_RUN_LOCAL.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/feature/b198q-long-local-http-transport-failfast/tools/B198M_RUN_LOCAL.ps1' -OutFile $p
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p -Model 'qwen3.8:27b'
```

IMPORTANT: Replacing the HTTP transport may prevent the *artificial* five-minute failure but does not make a 27B local model infer faster. Actual model completion times, Ollama service stability and architecture quality remain unknown until another successful source result.

Automated CI uses an explicitly labeled HTTP test double, not a real model. It covers delayed headers, explicit abort, broken socket, no remote URLs/redirects, guard validation and no repeated requests after transport break. Windows real PowerShell 5.1 exercises original GitHub source ZIP download and upload ZIP production.

Safety unchanged: Work not used, no paid APIs, no world contact or construction, worldWrites 0, NOT_PREPARED, nine BLOCKED gates, main and past Draft PRs untouched.
