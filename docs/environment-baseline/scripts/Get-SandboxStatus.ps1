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
$active = if (Test-Path -LiteralPath $runPath) { Get-Content -LiteralPath $runPath -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }
$baselineProperties = $paths.Baseline.PSObject.Properties.Name
$relation = if ($baselineProperties -contains 'sandboxRelation') { $paths.Baseline.sandboxRelation } else { 'matches-production' }
$approval = if ($baselineProperties -contains 'upgradeApproval') { $paths.Baseline.upgradeApproval } else { $null }
$checks = [ordered]@{
    officialVersion = $paths.Baseline.version
    productionVersion = $paths.Baseline.productionVersion
    matchesProduction = $paths.Baseline.version -eq $paths.Baseline.productionVersion -and $paths.Baseline.version -notmatch '-alpha\.'
    sandboxRelation = $relation
    upgradeApproval = $approval
    occupied = $occupied
    lastRun = $active
    desktopBuilt = Test-Path -LiteralPath (Join-Path $paths.Upstream 'apps/desktop/lib/main.js')
    hostBuilt = Test-Path -LiteralPath (Join-Path $paths.Upstream 'apps/desktop-host/lib/index.js')
    primaryRuntimePrepared = Test-Path -LiteralPath (Join-Path $paths.Upstream 'apps/desktop/.desktop-build/targets/win-x64/runtime/primary-runtime/runtime.json')
    dshHome = $paths.HomePath
    electronUserData = $paths.UserData
    recordedVerification = if (Test-Path -LiteralPath (Join-Path $paths.Root 'status.json')) { Get-Content -LiteralPath (Join-Path $paths.Root 'status.json') -Raw -Encoding UTF8 | ConvertFrom-Json } else { $null }
}
$checks | ConvertTo-Json -Depth 8
