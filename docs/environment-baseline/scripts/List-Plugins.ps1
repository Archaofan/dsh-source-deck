[CmdletBinding()]
param()
. (Join-Path $PSScriptRoot 'Common.ps1')
$paths = Get-SandboxPaths
Assert-SandboxBaseline $paths
$lease = Enter-SandboxLease $paths 'shared' 'plugin-list'
$savedEnvironment = Push-SandboxEnvironment $paths
Push-Location $paths.Upstream
try {
    Invoke-SandboxDesktopCli $paths @('list', '--depth', '0') 'plugin-list.log'
    Get-Content -LiteralPath (Join-Path $paths.Logs 'plugin-list.log')
} finally {
    Pop-Location
    Pop-SandboxEnvironment $savedEnvironment
    Exit-SandboxLease $paths $lease
}
