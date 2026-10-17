[CmdletBinding()]
param()
. (Join-Path $PSScriptRoot 'Common.ps1')
$paths = Get-SandboxPaths
Assert-SandboxBaseline $paths
foreach ($unsupported in @(
    @{ version = '0.2.1-alpha.5'; productionVersion = '0.2.1-alpha.5' },
    @{ version = '0.2.0-rc.2'; productionVersion = '0.2.0-rc.1' }
)) {
    $unsupportedPaths = Get-SandboxPaths
    $unsupportedPaths.Baseline.version = $unsupported.version
    $unsupportedPaths.Baseline.productionVersion = $unsupported.productionVersion
    $rejected = $false
    try { Assert-SandboxBaseline $unsupportedPaths } catch {
        $rejected = $_.Exception.Message -like 'Sandbox must match*'
    }
    if (-not $rejected) { throw 'An alpha or mismatched production baseline was accepted.' }
}
$original = [Environment]::GetEnvironmentVariable('DSH_HOME', 'Process')
$saved = Push-SandboxEnvironment $paths
try {
    if ($env:DSH_HOME -ne $paths.HomePath -or $env:DSH_DESKTOP_USER_DATA_DIR -ne $paths.UserData) { throw 'Isolated paths were not applied.' }
    $runAsNodeAbsent = & $paths.Node -e "process.stdout.write(String(!Object.hasOwn(process.env,'ELECTRON_RUN_AS_NODE')))"
    if ($LASTEXITCODE -ne 0 -or $runAsNodeAbsent -ne 'true') { throw 'Electron run-as-Node flag was not actually removed.' }
} finally {
    Pop-SandboxEnvironment $saved
}
if ([Environment]::GetEnvironmentVariable('DSH_HOME', 'Process') -ne $original) { throw 'Caller environment was not restored.' }
$lease = Enter-SandboxLease $paths 'verification' 'lock-test'
try {
    $blocked = $false
    try { $second = Enter-SandboxLease $paths 'other' 'lock-test' } catch { $blocked = $true }
    if (-not $blocked) { $second.Stream.Dispose(); throw 'Concurrent sandbox use was allowed.' }
} finally {
    Exit-SandboxLease $paths $lease
}
Write-Output 'PASS: production RC baseline, rejection of alpha/mismatched versions, isolated paths, child-process environment, environment restoration and exclusive lease.'
