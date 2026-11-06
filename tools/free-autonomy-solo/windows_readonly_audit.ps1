# One-command, read-only Windows readiness probe. No installs or model requests.
# Project selection is intentionally absent: this probe changes neither project.
[CmdletBinding()]
param([string]$StrataSourceRoot = '', [switch]$MemoryPressureHints)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
function Available([string]$name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }
$receipt = [ordered]@{
  schema = 'free-autonomy-windows-readonly-audit-v1'
  status = 'HOLD'
  git_command = (Available 'git')
  python_command = (Available 'python')
  docker_command = (Available 'docker')
  docker_engine = $false
  linux_containers = $false
  qa_image_present = $false
  opencode_image_present = $false
  host_ollama_api = 'NOT_CHECKED'
  local_model_count = 0
  real_model_calls = 0
  docker_execution_performed = $false
  project_files_modified = $false
  strata_readonly_memory = [ordered]@{
    state = 'UNKNOWN'
    physical_available_gib = $null
    commit_headroom_gib = $null
    entry_guard_met_at_snapshot = $false
    live_inference_authorized = $false
    snapshot_proves_future_load_safety = $false
  }
  strata_reported_source_pins = [ordered]@{
    state = 'NOT_REQUESTED'
    a26_sha_matches_reported_patch = $false
    vertical_sha_matches_reported_patch = $false
    verifies_actual_runtime_source = $false
  }
}
if ($receipt.docker_command) {
  $output = (& docker version --format '{{.Server.Version}}' 2>$null | Out-String).Trim()
  $receipt.docker_engine = ($LASTEXITCODE -eq 0 -and [bool]$output)
  if ($receipt.docker_engine) {
    $mode = (& docker info --format '{{.OSType}}' 2>$null | Out-String).Trim()
    $receipt.linux_containers = ($LASTEXITCODE -eq 0 -and $mode -eq 'linux')
    if ($receipt.linux_containers) {
      & docker image inspect node:22-bookworm-slim 1>$null 2>$null
      $receipt.qa_image_present = ($LASTEXITCODE -eq 0)
      & docker image inspect ghcr.io/anomalyco/opencode:2.0.0 1>$null 2>$null
      $receipt.opencode_image_present = ($LASTEXITCODE -eq 0)
    }
  }
}
try {
  $response = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 4
  if ($null -ne $response.models) {
    $receipt.host_ollama_api = 'HTTP_OK'
    $receipt.local_model_count = @($response.models).Count
  } else { $receipt.host_ollama_api = 'INVALID_RESPONSE' }
} catch { $receipt.host_ollama_api = 'UNREACHABLE' }
if ($receipt.git_command -and $receipt.python_command -and $receipt.linux_containers -and $receipt.qa_image_present -and $receipt.opencode_image_present -and $receipt.host_ollama_api -eq 'HTTP_OK') {
  $receipt.status = 'READ_ONLY_HOST_PREFLIGHT_PASS__DOCKER_AND_LLM_STILL_UNTESTED'
} else { $receipt.status = 'HOLD_READ_ONLY_HOST_PREREQUISITES_INCOMPLETE' }

# Strata-only read-only snapshot. This is NEVER an active-load or A26 PASS.
# Win32_OperatingSystem.FreePhysicalMemory is KiB; commit counters are bytes.
# FreeVirtualMemory must not be substituted for true commit headroom.
try {
  $osMem = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop
  $perfMem = Get-CimInstance -ClassName Win32_PerfFormattedData_PerfOS_Memory -ErrorAction Stop
  $freeKiB = [double]$osMem.FreePhysicalMemory
  $committed = [double]$perfMem.CommittedBytes
  $limit = [double]$perfMem.CommitLimit
  if ([double]::IsNaN($freeKiB) -or [double]::IsInfinity($freeKiB) -or
      [double]::IsNaN($committed) -or [double]::IsInfinity($committed) -or
      [double]::IsNaN($limit) -or [double]::IsInfinity($limit) -or
      $freeKiB -lt 0 -or $committed -lt 0 -or $limit -le 0 -or $committed -gt $limit) {
    throw 'UNAVAILABLE_MEMORY_COUNTERS'
  }
  $physicalGiB = $freeKiB / (1024 * 1024)
  $commitGiB = ($limit - $committed) / 1GB
  $receipt.strata_readonly_memory.physical_available_gib = [math]::Round($physicalGiB, 3)
  $receipt.strata_readonly_memory.commit_headroom_gib = [math]::Round($commitGiB, 3)
  # This read-only field reports the saved Strata A12 start_gate (7/8 GiB).
  # The separate December solo_agent uses its own 4/4 GiB preboot gate.
  # Neither snapshot proves active-load 3/2 GiB safety or authorizes inference.
  $receipt.strata_readonly_memory.entry_guard_met_at_snapshot = ($physicalGiB -ge 7 -and $commitGiB -ge 8)
  if ($receipt.strata_readonly_memory.entry_guard_met_at_snapshot) {
    $receipt.strata_readonly_memory.state = 'READ_ONLY_BASELINE_GATE_ONLY__NOT_A26_PASS'
  } else {
    $receipt.strata_readonly_memory.state = 'HOLD_READ_ONLY_BASELINE_BELOW_PREBOOT_MINIMUM'
  }
} catch {
  $receipt.strata_readonly_memory.state = 'UNKNOWN_MEMORY_SENSOR_UNAVAILABLE'
}

# Optional SHA-only check. The caller supplies an explicit absolute Strata
# source root. Matching the reported patch is NOT proof of active runtime path.
# Never print source, config, paths, secrets, PIDs, or model responses.
if (-not [string]::IsNullOrWhiteSpace($StrataSourceRoot)) {
  $receipt.strata_reported_source_pins.state = 'HOLD_SOURCE_UNVERIFIED'
  try {
    if (-not [System.IO.Path]::IsPathRooted($StrataSourceRoot)) { throw 'NOT_ABSOLUTE' }
    $checks = @(
      @('a26', 'overnight/a26_owned_repair.py', 'b2a2f6b722399bd2b1df00828204e11634453125e39ee6812c033b365ec8c829'),
      @('vertical', 'overnight/vertical_slice.py', '012ff14cd72380a09cf3c17c19ef7f90b014b37ffa0903608543f73c3650352c')
    )
    foreach ($item in $checks) {
      $target = Join-Path -Path $StrataSourceRoot -ChildPath $item[1]
      if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw 'MISSING_SOURCE' }
      $digest = (Get-FileHash -LiteralPath $target -Algorithm SHA256 -ErrorAction Stop).Hash
      $matched = ($digest.ToLowerInvariant() -ceq $item[2])
      if ($item[0] -eq 'a26') { $receipt.strata_reported_source_pins.a26_sha_matches_reported_patch = $matched }
      if ($item[0] -eq 'vertical') { $receipt.strata_reported_source_pins.vertical_sha_matches_reported_patch = $matched }
    }
    if ($receipt.strata_reported_source_pins.a26_sha_matches_reported_patch -and
        $receipt.strata_reported_source_pins.vertical_sha_matches_reported_patch) {
      $receipt.strata_reported_source_pins.state = 'HASH_MATCH_REPORTED_PATCH_ONLY__RUNTIME_PATH_UNVERIFIED'
    } else {
      $receipt.strata_reported_source_pins.state = 'HOLD_SOURCE_HASH_DIFFERENT'
    }
  } catch {
    $receipt.strata_reported_source_pins.state = 'HOLD_SOURCE_PATH_OR_HASH_UNAVAILABLE'
  }
}

# Opt-in, one-shot read-only process-group hints. This NEVER attributes an
# A26 failure, initiates a model, changes memory, or authorizes a retry.
# WorkingSet64 includes shared pages: group sums MUST NOT be treated as
# unique physical RAM or as proof of the process causing an A26 hold.
# Do not disclose executable names, process IDs, paths or command lines.
if ($MemoryPressureHints) {
  $hint = [ordered]@{
    state = 'UNKNOWN_PROCESS_SENSOR'
    sampled_utc = [DateTime]::UtcNow.ToString('o')
    metric = 'WORKING_SET64_SHARED_PAGES_MAY_REPEAT'
    proves_a26_failure_cause = $false
    proves_safe_live_inference = $false
    categories = @()
  }
  try {
    $totals = [ordered]@{
      browser = [long]0
      wsl_virtualization = [long]0
      local_model = [long]0
      docker = [long]0
      developer_tools = [long]0
      other = [long]0
    }
    $counts = @{}
    foreach ($category in @($totals.Keys)) { $counts[$category] = 0 }
    $processes = @(Get-Process -ErrorAction Stop)
    if ($processes.Count -eq 0) { throw 'NO_PROCESS_SNAPSHOT' }
    foreach ($proc in $processes) {
      try {
        $bytes = [double]$proc.WorkingSet64
        if ([double]::IsNaN($bytes) -or [double]::IsInfinity($bytes) -or $bytes -lt 0) { continue }
        $name = [string]$proc.ProcessName
        $category = 'other'
        if ($name -match '^(chrome|msedge|firefox)$') { $category = 'browser' }
        elseif ($name -match '^(vmmem|vmmemWSL|wslhost|wslservice)$') { $category = 'wsl_virtualization' }
        elseif ($name -match '^(ollama|ollama app|ollama_llama_server|llama-server|LM Studio|LM Studio Helper|lmstudio|lms)$') { $category = 'local_model' }
        elseif ($name -match '^(Docker Desktop|com\.docker\..*)$') { $category = 'docker' }
        elseif ($name -match '^(python|pythonw|python3|node|Code|Code - Insiders)$') { $category = 'developer_tools' }
        $totals[$category] = [long]($totals[$category] + [long]$bytes)
        $counts[$category] = [int]($counts[$category] + 1)
      } catch {
        # Partial access is not interpreted as proof about an individual process.
        continue
      }
    }
    foreach ($category in @($totals.Keys)) {
      $hint.categories += [ordered]@{
        category = $category
        process_count = [int]$counts[$category]
        working_set_gib = [math]::Round($totals[$category] / 1GB, 3)
      }
    }
    $hint.state = 'READ_ONLY_GROUP_SNAPSHOT_NOT_ATTRIBUTION'
  } catch {
    $hint.state = 'UNKNOWN_PROCESS_SENSOR'
  }
  $receipt.strata_process_memory_hint = $hint
}
$receipt | ConvertTo-Json -Depth 6
