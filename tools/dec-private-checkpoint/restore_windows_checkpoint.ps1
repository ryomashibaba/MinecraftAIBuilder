#Requires -Version 5.1
<#
DECEMBER_2026 — Windows-local, fail-closed DPAPI checkpoint recovery.
The owner-private key is unprotected only into an ACL-restricted ephemeral file;
only a sanitized restore status is printed. No model, network, GitHub write,
production source update, or automatic continuation.

Prerequisite: init_windows_recipient.ps1 already ran as this Windows user.
Example (once encrypted artifact and its SHA are independently obtained):
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\restore_windows_checkpoint.ps1 `
    -EncryptedCheckpoint C:\PRIVATE\downloaded.cms `
    -CiphertextSha256 <64 lowercase hex digits> `
    -BaseRepository C:\PRIVATE\audited-public-baseline
The restore root defaults to LOCALAPPDATA\FreeAutonomyPrivate\DecCheckpointRestored.
No actual operation is authorized by merely obtaining this script.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$EncryptedCheckpoint,
    [Parameter(Mandatory=$true)][string]$CiphertextSha256,
    [Parameter(Mandatory=$true)][string]$BaseRepository
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$exitCode = 2
$stage = 'START'
$privateBytes = $null
$temporaryKey = $null
$workDir = $null
$originalPath = $env:PATH

function Hold([string]$Reason) { throw ('DEC_WINDOWS_RESTORE_HOLD_' + $Reason) }
function NoReparse([string]$Value) {
    if (Test-Path -LiteralPath $Value) {
        $node = Get-Item -LiteralPath $Value -Force
        if (($node.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            Hold 'REPARSE_POINT_REFUSED'
        }
    }
}
function CurrentUserOnly([string]$Target, [bool]$Directory) {
    $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    if (-not $sid -or $sid -notmatch '^S-1-') { Hold 'WINDOWS_SID_INVALID' }
    $grant = if ($Directory) { '*' + $sid + ':(OI)(CI)F' } else { '*' + $sid + ':F' }
    $previous = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & icacls.exe $Target '/inheritance:r' '/grant:r' $grant 1>$null 2>$null
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }
    if ($code -ne 0) { Hold 'PRIVATE_ACL_FAILED' }
}
function OpenSslPath {
    $candidateList = @()
    $found = Get-Command openssl.exe -ErrorAction SilentlyContinue
    if ($null -ne $found) { $candidateList += $found.Source }
    if ($env:ProgramFiles) {
        $candidateList += @( (Join-Path $env:ProgramFiles 'Git\usr\bin\openssl.exe'),
                             (Join-Path $env:ProgramFiles 'Git\mingw64\bin\openssl.exe'),
                             (Join-Path $env:ProgramFiles 'OpenSSL-Win64\bin\openssl.exe') )
    }
    foreach ($candidate in $candidateList) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            NoReparse $candidate
            return $candidate
        }
    }
    Hold 'OPENSSL_NOT_AVAILABLE'
}
function PythonPath {
    $result = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($null -eq $result -or -not (Test-Path -LiteralPath $result.Source -PathType Leaf)) {
        Hold 'PYTHON_NOT_AVAILABLE'
    }
    NoReparse $result.Source
    return $result.Source
}
function RunNative([string]$Tool, [string[]]$Args, [string]$ErrorCode) {
    $old = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        # Never forward raw stderr (including local paths or cryptographic details).
        $result = @(& $Tool @Args 2>$null)
        $nativeCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $old
    }
    if ($nativeCode -ne 0) {
        if ($result.Count -eq 1) {
            try {
                $json = $result[0] | ConvertFrom-Json -ErrorAction Stop
                if ($json.status -ceq 'HOLD' -and
                    $json.reason -cmatch '^CHECKPOINT_[A-Z0-9_]{3,120}$') {
                    Write-Host ('DEC_WINDOWS_RESTORE_REJECT_CODE=' + $json.reason)
                }
            } catch { }
        }
        Hold $ErrorCode
    }
    return $result
}

try {
    if ([System.Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) {
        Hold 'WINDOWS_REQUIRED'
    }
    try {
        Add-Type -AssemblyName System.Security -ErrorAction Stop
    } catch { Hold 'DPAPI_ASSEMBLY_UNAVAILABLE' }
    if (-not ('System.Security.Cryptography.ProtectedData' -as [type])) {
        Hold 'DPAPI_TYPE_UNAVAILABLE'
    }
    if (-not $env:LOCALAPPDATA) { Hold 'LOCALAPPDATA_MISSING' }
    $stage = 'ENV_OK'
    if ($CiphertextSha256 -cnotmatch '^[a-f0-9]{64}$') { Hold 'CIPHERTEXT_SHA_INVALID' }

    $recipientRoot = Join-Path $env:LOCALAPPDATA 'FreeAutonomyPrivate\DecCheckpointRecipient'
    $publicCert = Join-Path $recipientRoot 'recipient-public.pem'
    $sealedKey = Join-Path $recipientRoot 'recipient-private.dpapi'
    $keyEntropy = [System.Text.Encoding]::ASCII.GetBytes('DEC-2026-PRIVATE-QA-RECIPIENT-V1')
    foreach ($file in @($recipientRoot, $publicCert, $sealedKey, $EncryptedCheckpoint, $BaseRepository)) {
        NoReparse $file
    }
    $stage = 'INPUT_PATHS_OK'
    if (-not (Test-Path -LiteralPath $recipientRoot -PathType Container) -or
        -not (Test-Path -LiteralPath $publicCert -PathType Leaf) -or
        -not (Test-Path -LiteralPath $sealedKey -PathType Leaf) -or
        -not (Test-Path -LiteralPath $EncryptedCheckpoint -PathType Leaf) -or
        -not (Test-Path -LiteralPath $BaseRepository -PathType Container)) {
        Hold 'REQUIRED_INPUT_MISSING'
    }
    $stage = 'INPUT_FILES_OK'
    $cipher = Get-Item -LiteralPath $EncryptedCheckpoint
    $stage = 'CIPHER_INFO_OBTAINED'
    if ($cipher.Length -lt 32 -or $cipher.Length -gt 20000000) { Hold 'CIPHERTEXT_SIZE_INVALID' }
    $stage = 'CIPHER_SIZE_OK'
    $cipherHash = (Get-FileHash -LiteralPath $EncryptedCheckpoint -Algorithm SHA256).Hash
    $stage = 'CIPHER_HASH_COMPUTED'
    if ($cipherHash.ToLowerInvariant() -cne $CiphertextSha256) {
        Hold 'CIPHERTEXT_SHA_MISMATCH'
    }
    $stage = 'CIPHER_HASH_OK'
    if ((Get-Item -LiteralPath $sealedKey).Length -lt 128 -or
        (Get-Item -LiteralPath $sealedKey).Length -gt 16384 -or
        (Get-Item -LiteralPath $publicCert).Length -gt 16384) {
        Hold 'LOCAL_KEY_SIZE_INVALID'
    }
    # The output root is fixed; never accept an arbitrary location whose ACL
    # might be rewritten or whose PRIVATE Git objects could become public.
    $stage = 'KEY_METADATA_OK'
    $PrivateRestoreRoot = Join-Path $env:LOCALAPPDATA 'FreeAutonomyPrivate\DecCheckpointRestored'
    NoReparse $env:LOCALAPPDATA
    $parent = Split-Path -Parent $PrivateRestoreRoot
    NoReparse $parent
    NoReparse $PrivateRestoreRoot
    if (-not (Test-Path -LiteralPath $PrivateRestoreRoot)) {
        [void](New-Item -Path $PrivateRestoreRoot -ItemType Directory)
    }
    CurrentUserOnly $PrivateRestoreRoot $true
    $stage = 'PRIVATE_ROOT_READY'
    $openssl = OpenSslPath
    $python = PythonPath
    $restoreCli = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\free-autonomy-solo\restore_qwen4b_private_checkpoint.py'))
    if (-not (Test-Path -LiteralPath $restoreCli -PathType Leaf)) { Hold 'RESTORE_CLI_NOT_FOUND' }
    NoReparse $restoreCli

    # A fresh private scratch inside the same owner-controlled, DPAPI-protected
    # subtree. This is a short-lived plaintext OpenSSL key, not a backup.
    $workDir = Join-Path $recipientRoot ('restore-' + [guid]::NewGuid().ToString('N'))
    [void](New-Item -Path $workDir -ItemType Directory)
    CurrentUserOnly $workDir $true
    $temporaryKey = Join-Path $workDir 'temporary-private-key.pem'
    $dpapiBytes = [System.IO.File]::ReadAllBytes($sealedKey)
    try {
        $privateBytes = [System.Security.Cryptography.ProtectedData]::Unprotect(
            $dpapiBytes, $keyEntropy, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
    } finally {
        [Array]::Clear($dpapiBytes, 0, $dpapiBytes.Length)
    }
    if ($privateBytes.Length -lt 100 -or $privateBytes.Length -gt 16384) { Hold 'UNSEALED_KEY_SIZE_INVALID' }
    [System.IO.File]::WriteAllBytes($temporaryKey, $privateBytes)
    CurrentUserOnly $temporaryKey $false
    [Array]::Clear($privateBytes, 0, $privateBytes.Length)
    $privateBytes = $null
    $stage = 'TEMP_KEY_UNLOCKED'

    # Python's subprocess invokes 'openssl' by its CLI name. Keep PATH override
    # scoped to THIS process and restore it on every exit.
    $env:PATH = [System.IO.Path]::GetDirectoryName($openssl) + [System.IO.Path]::PathSeparator + $originalPath
    $arguments = @($restoreCli, '--encrypted', $EncryptedCheckpoint,
                   '--sha256', $CiphertextSha256, '--certificate', $publicCert,
                   '--private-key', $temporaryKey, '--base-repo', $BaseRepository,
                   '--private-root', $PrivateRestoreRoot)
    $stage = 'PYTHON_CALLED'
    $lines = @(RunNative $python $arguments 'RESTORER_REJECTED_CHECKPOINT')
    if ($lines.Count -ne 1) { Hold 'RESTORE_STDOUT_NOT_SINGLE_STATUS' }
    try { $result = $lines[0] | ConvertFrom-Json -ErrorAction Stop }
    catch { Hold 'RESTORE_RESULT_NOT_JSON' }
    if ($result.status -cne 'PRIVATE_QA_GIT_HISTORY_RESTORED_REVIEW_ONLY' -or
        $result.raw_source_executed -cne $false -or
        $result.independent_qa_reexecuted -cne $false -or
        $result.automated_model_resume -cne $false -or
        $result.public_git_pushes -ne 0) { Hold 'RESTORE_CONTRACT_NOT_MET' }
    $stage = 'CONTRACT_ACCEPTED'
    Write-Output 'DEC_WINDOWS_PRIVATE_CHECKPOINT_RESTORE_PASS_REVIEW_ONLY'
    Write-Output ('RESTORED_FINAL_COMMIT=' + $result.final_commit)
    Write-Output ('VERIFIED_SOURCE_STAGES=' + $result.verified_source_stages)
    $exitCode = 0
} catch {
    # Never print original exception, Python/OpenSSL stderr, paths, or key data.
    Write-Output 'DEC_WINDOWS_PRIVATE_CHECKPOINT_RESTORE_HOLD'
    Write-Output ('DEC_WINDOWS_RESTORE_HOLD_STAGE=' + $stage)
    $exceptionType = $_.Exception.GetType().Name.ToUpperInvariant()
    if ($exceptionType -cmatch '^[A-Z]{3,70}EXCEPTION$') {
        Write-Output ('DEC_WINDOWS_RESTORE_EXCEPTION_TYPE=' + $exceptionType)
    }
    # Only constant internal hold reasons; never original exceptions or paths.
    $holdCode = $_.Exception.Message
    if ($holdCode -cmatch '^DEC_WINDOWS_RESTORE_HOLD_[A-Z0-9_]{3,100}$') {
        Write-Output ('DEC_WINDOWS_RESTORE_HOLD_CODE=' + $holdCode)
    }
    $exitCode = 2
} finally {
    if ($null -ne $privateBytes) { [Array]::Clear($privateBytes, 0, $privateBytes.Length) }
    $env:PATH = $originalPath
    if ($null -ne $temporaryKey -and (Test-Path -LiteralPath $temporaryKey)) {
        Remove-Item -LiteralPath $temporaryKey -Force -ErrorAction SilentlyContinue
    }
    if ($null -ne $workDir -and (Test-Path -LiteralPath $workDir)) {
        Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
exit $exitCode