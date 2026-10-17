[CmdletBinding()]
param([ValidateSet('Before', 'After')][string]$Phase)
. (Join-Path $PSScriptRoot 'Common.ps1')
$paths = Get-SandboxPaths
$snapshotPath = Join-Path $paths.Logs 'production-paths-before.json'
$observerSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
if ($Phase -eq 'Before') {
    [IO.Directory]::CreateDirectory($paths.Logs) | Out-Null
    $normalHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
    if ([IO.Path]::GetFullPath($normalHome).StartsWith($paths.Root, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Run this check outside the sandbox environment wrapper.'
    }
    $targets = @(
        (Join-Path $normalHome 'profiles/desktop/package.json'),
        (Join-Path $normalHome 'profiles/desktop/cordis.patch.yml'),
        (Join-Path $env:APPDATA '@deepseek-ai/dsh-desktop/desktop/settings.json')
    )
} else {
    $before = Get-Content -LiteralPath $snapshotPath -Raw | ConvertFrom-Json
    if ('observerSid' -notin $before.PSObject.Properties.Name -or $before.observerSid -ne $observerSid) {
        throw 'Observation account differs or is unknown. HKCU/PATH comparisons require Before and After under the same Windows SID.'
    }
    $targets = @($before.files | ForEach-Object { $_.path })
}
$files = @($targets | ForEach-Object {
    [pscustomobject]@{ path = $_; sha256 = if (Test-Path -LiteralPath $_ -PathType Leaf) { (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash } else { $null } }
})
$protocolKey = 'HKCU:\Software\Classes\dsh\shell\open\command'
$protocol = if (Test-Path -LiteralPath $protocolKey) { (Get-Item -LiteralPath $protocolKey).GetValue('') } else { $null }
$current = [pscustomobject]@{ checkedAtUtc = [DateTime]::UtcNow.ToString('o'); observerSid = $observerSid; files = $files; protocolCommand = $protocol; userPath = [Environment]::GetEnvironmentVariable('PATH', 'User') }
if ($Phase -eq 'Before') {
    $current | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $snapshotPath -Encoding utf8
    Write-Output 'Captured production config hashes, protocol handler and user PATH; no credentials read.'
} else {
    $changed = @()
    for ($index = 0; $index -lt $files.Count; $index++) {
        if ($files[$index].sha256 -ne $before.files[$index].sha256) { $changed += $files[$index].path }
    }
    if ($protocol -ne $before.protocolCommand) { $changed += 'HKCU dsh protocol handler' }
    if ($current.userPath -ne $before.userPath) { $changed += 'User PATH' }
    $result = [pscustomobject]@{ checkedAtUtc = $current.checkedAtUtc; unchanged = $changed.Count -eq 0; changed = $changed; scope = 'Three configuration files, dsh protocol handler and user PATH; not a whole-system audit.' }
    $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $paths.Logs 'production-paths-after.json') -Encoding utf8
    $result | ConvertTo-Json -Depth 5
    if ($changed.Count -gt 0) { throw 'Observed production settings changed. Investigate before proceeding.' }
}
