[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidatePattern('^[a-z0-9][a-z0-9-]*$')][string]$Project,
    [Parameter(Mandatory)][string]$PackagePath
)
. (Join-Path $PSScriptRoot 'Common.ps1')
$paths = Get-SandboxPaths
Assert-SandboxBaseline $paths
$projectRoot = [IO.Path]::GetFullPath((Join-Path $paths.Workspace $Project))
$package = (Resolve-Path -LiteralPath $PackagePath).Path
$prefix = $projectRoot.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
if (-not $package.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetExtension($package) -ne '.tgz') {
    throw 'Only a packed .tgz inside the named project is accepted.'
}
$lease = Enter-SandboxLease $paths $Project 'plugin-install'
$savedEnvironment = Push-SandboxEnvironment $paths
Push-Location $paths.Upstream
try {
    Invoke-SandboxDesktopCli $paths @('add', $package) 'plugin-install.log'
    Write-Host 'Installed only into the sandbox desktop profile. Start Desktop and verify the result.'
} finally {
    Pop-Location
    Pop-SandboxEnvironment $savedEnvironment
    Exit-SandboxLease $paths $lease
}
