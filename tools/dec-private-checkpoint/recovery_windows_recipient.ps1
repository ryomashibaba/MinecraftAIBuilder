#Requires -Version 5.1
<#
DECEMBER_2026 P3: password-encrypted, OFFLINE recovery backup for a DPAPI recipient.
No model, network, GitHub Secret, admin elevation or repository write.
Use a strong, separately stored passphrase. Keep the recovery directory OFF GitHub.
The backup consists of encrypted PKCS#8 private key and PUBLIC certificate.
Export, Verify, and Import must be deliberate separate actions; never overwrite a key.
Example: .\recovery_windows_recipient.ps1 -Operation Export -RecoveryDirectory E:\PrivateDecKeyBackup
This script does not automatically save a backup outside this computer.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('Export','Verify','Import')][string]$Operation,
    [Parameter(Mandatory=$true)][string]$RecoveryDirectory,
    [System.Security.SecureString]$Passphrase
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Hold([string]$Code) { throw ('DEC_RECOVERY_HOLD_' + $Code) }
function NoReparse([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        $node = Get-Item -LiteralPath $Path -Force
        if (($node.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            Hold 'REPARSE_POINT_REFUSED'
        }
    }
}
function OwnerAcl([string]$Target, [bool]$Directory) {
    $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    if (-not $sid -or $sid -cnotmatch '^S-1-') { Hold 'INVALID_WINDOWS_USER' }
    $grant = if ($Directory) { '*' + $sid + ':(OI)(CI)F' } else { '*' + $sid + ':F' }
    $old = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & icacls.exe $Target '/inheritance:r' '/grant:r' $grant 1>$null 2>$null
        $status = $LASTEXITCODE
    } finally { $ErrorActionPreference = $old }
    if ($status -ne 0) { Hold 'OWNER_ONLY_ACL_FAILED' }
}
function FindOpenSSL {
    $candidates = @()
    $located = Get-Command 'openssl.exe' -ErrorAction SilentlyContinue
    if ($null -ne $located) { $candidates += $located.Source }
    if ($env:ProgramFiles) {
        $candidates += @(
            (Join-Path $env:ProgramFiles 'Git\usr\bin\openssl.exe'),
            (Join-Path $env:ProgramFiles 'Git\mingw64\bin\openssl.exe'),
            (Join-Path $env:ProgramFiles 'OpenSSL-Win64\bin\openssl.exe'))
    }
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            NoReparse $candidate
            return $candidate
        }
    }
    Hold 'OPENSSL_MISSING_NO_INSTALL'
}
function OpenSSL([string[]]$ArgsList, [string]$Reason) {
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $opensslExe
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    foreach ($part in $ArgsList) {
        if ($part -match '["' + [char]13 + [char]10 + ']') {
            Hold 'UNSAFE_COMMAND_ARGUMENT'
        }
    }
    $info.Arguments = (($ArgsList | ForEach-Object { '"' + $_ + '"' }) -join ' ')
    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $info
    try {
        if (-not $proc.Start()) { Hold $Reason }
        if ($null -ne $plainPassphrase) {
            $proc.StandardInput.WriteLine($plainPassphrase)
        }
        $proc.StandardInput.Close()
        if (-not $proc.WaitForExit(120000)) {
            try { $proc.Kill() } catch {}
            Hold 'OPENSSL_TIMEOUT'
        }
        if ($proc.ExitCode -ne 0) { Hold $Reason }
    } finally {
        $proc.Dispose()
    }
}
function VerifyPair([string]$Certificate, [string]$PlainKey, [string]$Scratch) {
    $message = Join-Path $Scratch 'synthetic-check.txt'
    $sealed = Join-Path $Scratch 'synthetic-check.cms'
    $decoded = Join-Path $Scratch 'synthetic-check-decoded.txt'
    [System.IO.File]::WriteAllText($message,'DEC_RECOVERY_SELFTEST_ONLY',
        [System.Text.Encoding]::ASCII)
    OpenSSL @('x509','-in',$Certificate,'-noout','-checkend','0') 'CERT_INVALID'
    OpenSSL @('cms','-encrypt','-aes-256-gcm','-binary','-in',$message,
        '-outform','DER','-out',$sealed,'-recip',$Certificate) 'PAIR_ENCRYPT_FAILED'
    OpenSSL @('cms','-decrypt','-binary','-inform','DER','-in',$sealed,
        '-recip',$Certificate,'-inkey',$PlainKey,'-out',$decoded) 'PAIR_DECRYPT_FAILED'
    if ([System.IO.File]::ReadAllText($decoded,[System.Text.Encoding]::ASCII) -cne
        'DEC_RECOVERY_SELFTEST_ONLY') { Hold 'PAIR_ROUNDTRIP_MISMATCH' }
}
if ([System.Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) {
    Hold 'WINDOWS_REQUIRED'
}
try { Add-Type -AssemblyName System.Security -ErrorAction Stop }
catch { Hold 'DPAPI_ASSEMBLY_MISSING' }
if (-not ('System.Security.Cryptography.ProtectedData' -as [type])) {
    Hold 'DPAPI_UNAVAILABLE'
}
if (-not $env:LOCALAPPDATA) { Hold 'LOCALAPPDATA_MISSING' }
if (-not [System.IO.Path]::IsPathRooted($RecoveryDirectory)) {
    Hold 'RECOVERY_DIRECTORY_MUST_BE_ABSOLUTE'
}
$recover = [System.IO.Path]::GetFullPath($RecoveryDirectory)
$recoverParent = [System.IO.Path]::GetDirectoryName($recover)
NoReparse $recoverParent
NoReparse $recover
if (-not (Test-Path -LiteralPath $recoverParent -PathType Container)) {
    Hold 'RECOVERY_PARENT_MISSING'
}
$root = Join-Path $env:LOCALAPPDATA 'FreeAutonomyPrivate\DecCheckpointRecipient'
$outer = Split-Path -Parent $root
NoReparse $env:LOCALAPPDATA
NoReparse $outer
NoReparse $root
if ([System.IO.Path]::GetFullPath($root).TrimEnd('\') -eq
    $recover.TrimEnd('\')) { Hold 'BACKUP_CANNOT_BE_KEY_ROOT' }
$public = Join-Path $root 'recipient-public.pem'
$dpapi = Join-Path $root 'recipient-private.dpapi'
$backupKey = Join-Path $recover 'recipient-private-encrypted.pk8'
$backupCert = Join-Path $recover 'recipient-public.pem'
$entropy = [System.Text.Encoding]::ASCII.GetBytes('DEC-2026-PRIVATE-QA-RECIPIENT-V1')
if ($null -eq $Passphrase) {
    $Passphrase = Read-Host -Prompt 'Recovery passphrase (24+ ASCII characters)' -AsSecureString
}
$bstr = [IntPtr]::Zero
$plainPassphrase = $null
$workDir = $null
$createdBackup = $false
$backupComplete = $false
try {
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Passphrase)
    $plainPassphrase = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    if ($plainPassphrase.Length -lt 24 -or $plainPassphrase.Length -gt 1024 -or
        $plainPassphrase -cnotmatch '^[\x21-\x7e]+$') {
        Hold 'PASSPHRASE_REQUIRES_24_PRINTABLE_ASCII_CHARS'
    }
    $opensslExe = FindOpenSSL
    if (-not (Test-Path -LiteralPath $root -PathType Container)) {
        [void](New-Item -Path $root -ItemType Directory)
    }
    OwnerAcl $root $true
    if ($Operation -eq 'Export') {
        if ((Test-Path -LiteralPath $recover) -or
            -not (Test-Path -LiteralPath $public -PathType Leaf) -or
            -not (Test-Path -LiteralPath $dpapi -PathType Leaf)) {
            Hold 'EXPORT_INPUT_MISSING_OR_DEST_EXISTS'
        }
        NoReparse $public
        NoReparse $dpapi
        [void](New-Item -Path $recover -ItemType Directory)
        $createdBackup = $true
        OwnerAcl $recover $true
    } else {
        if (-not (Test-Path -LiteralPath $recover -PathType Container) -or
            -not (Test-Path -LiteralPath $backupKey -PathType Leaf) -or
            -not (Test-Path -LiteralPath $backupCert -PathType Leaf)) {
            Hold 'BACKUP_INPUT_MISSING'
        }
        NoReparse $backupKey
        NoReparse $backupCert
        if ($Operation -eq 'Import' -and
            ((Test-Path -LiteralPath $public) -or (Test-Path -LiteralPath $dpapi))) {
            Hold 'OWNER_KEY_EXISTS_NEVER_OVERWRITE'
        }
    }
    $workDir = Join-Path $root ('recovery-' + [guid]::NewGuid().ToString('N'))
    [void](New-Item -Path $workDir -ItemType Directory)
    OwnerAcl $workDir $true
    $temporaryKey = Join-Path $workDir 'temporary-private-key.pem'
    $certificate = if ($Operation -eq 'Export') { $public } else { $backupCert }
    if ($Operation -eq 'Export') {
        $sealed = [System.IO.File]::ReadAllBytes($dpapi)
        $private = $null
        try {
            $private = [System.Security.Cryptography.ProtectedData]::Unprotect(
                $sealed,$entropy,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)
            [System.IO.File]::WriteAllBytes($temporaryKey,$private)
            OwnerAcl $temporaryKey $false
        } finally {
            [Array]::Clear($sealed,0,$sealed.Length)
            if ($null -ne $private) { [Array]::Clear($private,0,$private.Length) }
        }
        VerifyPair $certificate $temporaryKey $workDir
        OpenSSL @('pkcs8','-topk8','-v2','aes-256-cbc','-iter','350000',
            '-in',$temporaryKey,'-out',$backupKey,'-passout','stdin') 'BACKUP_ENCRYPT_FAILED'
        OwnerAcl $backupKey $false
        [System.IO.File]::Copy($public,$backupCert,$false)
        OwnerAcl $backupCert $false
    } else {
        OpenSSL @('pkcs8','-in',$backupKey,'-out',$temporaryKey,
            '-passin','stdin') 'BACKUP_PASSWORD_OR_CIPHERTEXT_INVALID'
        OwnerAcl $temporaryKey $false
        VerifyPair $certificate $temporaryKey $workDir
    }
    if ($Operation -eq 'Import') {
        $private = [System.IO.File]::ReadAllBytes($temporaryKey)
        try {
            $sealed = [System.Security.Cryptography.ProtectedData]::Protect(
                $private,$entropy,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)
            $candidate = Join-Path $workDir 'candidate-private.dpapi'
            [System.IO.File]::WriteAllBytes($candidate,$sealed)
            OwnerAcl $candidate $false
            if ((Test-Path -LiteralPath $public) -or (Test-Path -LiteralPath $dpapi)) {
                Hold 'OWNER_KEY_EXISTS_NEVER_OVERWRITE'
            }
            [System.IO.File]::Copy($backupCert,$public,$false)
            OwnerAcl $public $false
            [System.IO.File]::Copy($candidate,$dpapi,$false)
            OwnerAcl $dpapi $false
            $unsealed = [System.Security.Cryptography.ProtectedData]::Unprotect(
                [System.IO.File]::ReadAllBytes($dpapi),$entropy,
                [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
            try {
                if (([System.BitConverter]::ToString(
                        [System.Security.Cryptography.SHA256]::Create().ComputeHash($private))) -cne
                    ([System.BitConverter]::ToString(
                        [System.Security.Cryptography.SHA256]::Create().ComputeHash($unsealed)))) {
                    Hold 'DPAPI_REIMPORTED_KEY_MISMATCH'
                }
            } finally { [Array]::Clear($unsealed,0,$unsealed.Length) }
        } finally {
            [Array]::Clear($private,0,$private.Length)
            [Array]::Clear($sealed,0,$sealed.Length)
        }
    }
    if ($Operation -eq 'Export') {
        $header = [System.IO.File]::ReadAllText($backupKey)
        if (-not $header.StartsWith('-----BEGIN ENCRYPTED PRIVATE KEY-----')) {
            Hold 'ENCRYPTED_PKCS8_HEADER_MISSING'
        }
        $backupComplete = $true
        Write-Output 'DEC_RECOVERY_ENCRYPTED_BACKUP_EXPORT_PASS'
    } elseif ($Operation -eq 'Verify') {
        Write-Output 'DEC_RECOVERY_ENCRYPTED_BACKUP_VERIFY_PASS'
    } else {
        Write-Output 'DEC_RECOVERY_IMPORTED_TO_NEW_DPAPI_OWNER_PASS'
    }
    Write-Output 'NO_PRIVATE_KEY_OR_PASSPHRASE_UPLOADED'
} finally {
    $plainPassphrase = $null
    if ($bstr -ne [IntPtr]::Zero) {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    if ($null -ne $workDir -and (Test-Path -LiteralPath $workDir)) {
        Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    if ($createdBackup -and -not $backupComplete -and
        (Test-Path -LiteralPath $recover)) {
        Remove-Item -LiteralPath $recover -Recurse -Force -ErrorAction SilentlyContinue
    }
}
