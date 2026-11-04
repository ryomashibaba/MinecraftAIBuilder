# One-command, read-only Windows readiness probe. No installs or model requests.
# Project selection is intentionally absent: this probe changes neither project.
[CmdletBinding()]
param()
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
$receipt | ConvertTo-Json -Depth 6
