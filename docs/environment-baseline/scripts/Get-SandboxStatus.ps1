[CmdletBinding()]
param()
. (Join-Path $PSScriptRoot 'Common.ps1')
$paths = Get-SandboxPaths
$occupied = $false
try {
    $probe = [IO.File]::Open((Join-Path $paths.Root '.run.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    $probe.Dispose()
} catch [IO.IOException] { $occupied = $true }
$runPath = Join-Path $paths.Root '.active-run.json'
$active = if (Test-Path -LiteralPath $runPath) { Get-Content -LiteralPath $runPath -Raw | ConvertFrom-Json } else { $null }
$checks = [ordered]@{
    officialVersion = $paths.Baseline.version
    occupied = $occupied
    lastRun = $active
    desktopBuilt = Test-Path -LiteralPath (Join-Path $paths.Upstream 'apps/desktop/lib/main.js')
    hostBuilt = Test-Path -LiteralPath (Join-Path $paths.Upstream 'apps/desktop-host/lib/index.js')
    primaryRuntimePrepared = Test-Path -LiteralPath (Join-Path $paths.Upstream 'apps/desktop/.desktop-build/targets/win-x64/runtime/primary-runtime/runtime.json')
    dshHome = $paths.HomePath
    electronUserData = $paths.UserData
    recordedVerification = if (Test-Path -LiteralPath (Join-Path $paths.Root 'status.json')) { Get-Content -LiteralPath (Join-Path $paths.Root 'status.json') -Raw | ConvertFrom-Json } else { $null }
}
$checks | ConvertTo-Json -Depth 8
