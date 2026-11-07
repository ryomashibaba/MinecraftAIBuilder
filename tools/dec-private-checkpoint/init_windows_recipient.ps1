#Requires -Version 5.1
<#
DECEMBER_2026: one-shot PRIVATE checkpoint recipient setup.
Generates a self-signed public X.509 certificate using an existing OpenSSL,
then protects the local private key with Windows DPAPI (CurrentUser).
Never sends a key or certificate to GitHub, the network, or ChatGPT.

Do not use in a shared Windows account. Run locally as the account that will
later decrypt the private QA artifact. Requires OpenSSL (Git for Windows often
provides it); no package installation or background model execution.
#>
[CmdletBinding()]
param(
    [switch]$VerifyOnly,
    [switch]$ShowPublicCertificate
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Stop-Private([string]$Code) {
    throw "DEC_RECIPIENT_HOLD_$Code"
}

if ([System.Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) {
    Stop-Private 'WINDOWS_REQUIRED'
}
if (-not $env:LOCALAPPDATA) { Stop-Private 'LOCALAPPDATA_UNAVAILABLE' }

$privateRoot = Join-Path $env:LOCALAPPDATA 'FreeAutonomyPrivate\DecCheckpointRecipient'
$certificatePath = Join-Path $privateRoot 'recipient-public.pem'
$dpapiPath = Join-Path $privateRoot 'recipient-private.dpapi'
$entropy = [System.Text.Encoding]::ASCII.GetBytes('DEC-2026-PRIVATE-QA-RECIPIENT-V1')

function Assert-NoReparse([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        $item = Get-Item -LiteralPath $Path -Force
        if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            Stop-Private 'REPARSE_POINT_REFUSED'
        }
    }
}

function Set-OnlyCurrentUserAcl([string]$Path, [bool]$Directory) {
    $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    if (-not $sid -or $sid -notmatch '^S-1-') { Stop-Private 'WINDOWS_SID_INVALID' }
    $grant = if ($Directory) { '*' + $sid + ':(OI)(CI)F' } else { '*' + $sid + ':F' }
    & icacls.exe $Path /inheritance:r /grant:r $grant 1>$null 2>$null
    if ($LASTEXITCODE -ne 0) { Stop-Private 'PRIVATE_ACL_NOT_VERIFIED' }
}

function Find-OpenSSL {
    $candidates = @()
    $command = Get-Command 'openssl.exe' -ErrorAction SilentlyContinue
    if ($null -ne $command) { $candidates += $command.Source }
    $candidates += @(
        (Join-Path $env:ProgramFiles 'Git\usr\bin\openssl.exe'),
        (Join-Path $env:ProgramFiles 'Git\mingw64\bin\openssl.exe'),
        (Join-Path $env:ProgramFiles 'OpenSSL-Win64\bin\openssl.exe')
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            Assert-NoReparse $candidate
            return $candidate
        }
    }
    Stop-Private 'OPENSSL_NOT_INSTALLED_NO_AUTO_INSTALL'
}

function Assert-OpenSSL([string]$Executable, [string[]]$Arguments, [string]$Code) {
    & $Executable @Arguments 1>$null 2>$null
    if ($LASTEXITCODE -ne 0) { Stop-Private $Code }
}

function Check-PrivatePair([string]$Executable, [string]$Certificate, [string]$Key, [string]$Scratch) {
    $msg = Join-Path $Scratch 'fixture-only.txt'
    $cms = Join-Path $Scratch 'fixture-only.cms'
    $decoded = Join-Path $Scratch 'fixture-only-decoded.txt'
    [System.IO.File]::WriteAllText($msg, 'DEC_LOCAL_TEST_NO_MODEL', [System.Text.Encoding]::ASCII)
    Assert-OpenSSL -Executable $Executable -Arguments @('x509','-in',$Certificate,'-noout','-checkend','604800') -Code 'CERT_EXPIRED_OR_INVALID'
    Assert-OpenSSL -Executable $Executable -Arguments @('cms','-encrypt','-aes-256-gcm','-binary','-in',$msg,
                                 '-outform','DER','-out',$cms,'-recip',$Certificate) -Code 'CERT_ENCRYPTION_FAILED'
    Assert-OpenSSL -Executable $Executable -Arguments @('cms','-decrypt','-binary','-inform','DER','-in',$cms,
                                 '-recip',$Certificate,'-inkey',$Key,'-out',$decoded) -Code 'PRIVATE_KEY_MISMATCH_OR_DECRYPT_FAILED'
    if ([System.IO.File]::ReadAllText($decoded, [System.Text.Encoding]::ASCII) -cne 'DEC_LOCAL_TEST_NO_MODEL') {
        Stop-Private 'LOCAL_CIPHER_ROUNDTRIP_FAILED'
    }
}

function Verify-DpapiKey([string]$Executable, [string]$Scratch) {
    Assert-NoReparse $certificatePath
    Assert-NoReparse $dpapiPath
    if (-not (Test-Path -LiteralPath $certificatePath -PathType Leaf) -or
        -not (Test-Path -LiteralPath $dpapiPath -PathType Leaf)) {
        Stop-Private 'KEYPAIR_NOT_INITIALIZED'
    }
    $protectedBytes = [System.IO.File]::ReadAllBytes($dpapiPath)
    if ($protectedBytes.Length -lt 128 -or $protectedBytes.Length -gt 16384) {
        Stop-Private 'DPAPI_KEY_SIZE_INVALID'
    }
    $clearBytes = $null
    $tempKey = Join-Path $Scratch 'test-temporary-key.pem'
    try {
        $clearBytes = [System.Security.Cryptography.ProtectedData]::Unprotect(
            $protectedBytes, $entropy, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
        [System.IO.File]::WriteAllBytes($tempKey, $clearBytes)
        Set-OnlyCurrentUserAcl $tempKey $false
        Check-PrivatePair $Executable $certificatePath $tempKey $Scratch
    } finally {
        if ($null -ne $clearBytes) { [Array]::Clear($clearBytes, 0, $clearBytes.Length) }
        if (Test-Path -LiteralPath $tempKey) { Remove-Item -LiteralPath $tempKey -Force }
    }
}

Assert-NoReparse $env:LOCALAPPDATA
$parentRoot = Split-Path -Parent $privateRoot
Assert-NoReparse $parentRoot
Assert-NoReparse $privateRoot

if (-not (Test-Path -LiteralPath $privateRoot)) {
    [void](New-Item -Path $privateRoot -ItemType Directory -Force)
}
Set-OnlyCurrentUserAcl $privateRoot $true
$openssl = Find-OpenSSL

if (-not $VerifyOnly -and -not $ShowPublicCertificate) {
    if ((Test-Path -LiteralPath $certificatePath) -or (Test-Path -LiteralPath $dpapiPath)) {
        Stop-Private 'ALREADY_EXISTS_NEVER_OVERWRITE'
    }
    $workDir = Join-Path $privateRoot ('setup-' + [guid]::NewGuid().ToString('N'))
    [void](New-Item -Path $workDir -ItemType Directory)
    Set-OnlyCurrentUserAcl $workDir $true
    try {
        $key = Join-Path $workDir 'candidate-private.pem'
        $cert = Join-Path $workDir 'candidate-public.pem'
        $protected = Join-Path $workDir 'candidate-private.dpapi'
        Assert-OpenSSL -Executable $openssl -Arguments @('req','-x509','-newkey','rsa:3072','-nodes','-sha256',
                                 '-days','365','-subj','/CN=Dec2026PrivateQA',
                                 '-keyout',$key,'-out',$cert) -Code 'KEYPAIR_GENERATION_FAILED'
        Set-OnlyCurrentUserAcl $key $false
        Set-OnlyCurrentUserAcl $cert $false
        Check-PrivatePair $openssl $cert $key $workDir
        $keyBytes = [System.IO.File]::ReadAllBytes($key)
        try {
            $dpapiBytes = [System.Security.Cryptography.ProtectedData]::Protect(
                $keyBytes, $entropy, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
            [System.IO.File]::WriteAllBytes($protected, $dpapiBytes)
            Set-OnlyCurrentUserAcl $protected $false
        } finally {
            [Array]::Clear($keyBytes, 0, $keyBytes.Length)
            Remove-Item -LiteralPath $key -Force -ErrorAction SilentlyContinue
        }
        Move-Item -LiteralPath $cert -Destination $certificatePath
        Move-Item -LiteralPath $protected -Destination $dpapiPath
        Set-OnlyCurrentUserAcl $certificatePath $false
        Set-OnlyCurrentUserAcl $dpapiPath $false
        Verify-DpapiKey $openssl $workDir
        Write-Output 'DEC_RECIPIENT_DPAPI_LOCAL_KEY_SETUP_PASS'
        Write-Output 'SECRET_PRIVATE_KEY_NEVER_UPLOADED'
    } finally {
        if (Test-Path -LiteralPath $workDir) {
            Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
} else {
    $testDir = Join-Path $privateRoot ('verify-' + [guid]::NewGuid().ToString('N'))
    [void](New-Item -Path $testDir -ItemType Directory)
    Set-OnlyCurrentUserAcl $testDir $true
    try {
        Verify-DpapiKey $openssl $testDir
        Write-Output 'DEC_RECIPIENT_DPAPI_LOCAL_KEY_VERIFY_PASS'
    } finally {
        Remove-Item -LiteralPath $testDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-Output ('PUBLIC_CERT_PATH=' + $certificatePath)
Write-Output 'PRIVATE_KEY_LOCAL_ONLY_DPAPI_PROTECTED'
Write-Output 'GITHUB_SECRET_NOT_CONFIGURED_NO_MODEL_EXECUTION'
if ($ShowPublicCertificate) {
    # Public certificate only; never print a PEM private key or protected blob.
    Get-Content -LiteralPath $certificatePath -Raw
}