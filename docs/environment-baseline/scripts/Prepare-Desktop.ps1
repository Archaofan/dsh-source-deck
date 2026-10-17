[CmdletBinding()]
param()
. (Join-Path $PSScriptRoot 'Common.ps1')
$paths = Get-SandboxPaths
Assert-SandboxBaseline $paths
$lease = Enter-SandboxLease $paths 'shared' 'prepare'
$savedEnvironment = Push-SandboxEnvironment $paths
Push-Location $paths.Upstream
try {
    Invoke-SandboxPnpm $paths @('install', '--frozen-lockfile', '--store-dir', (Join-Path $paths.Root 'cache/pnpm-store'), '--reporter', 'append-only') 'install.log'
    Invoke-SandboxPnpm $paths @('run', 'build') 'build.log'
    Invoke-SandboxPnpm $paths @('--filter', '@deepseek-ai/dsh-desktop', 'exec', 'install-electron') 'electron-install.log'
    Invoke-SandboxPnpm $paths @('--filter', '@deepseek-ai/dsh-desktop', 'run', 'prepare:primary-runtime') 'primary-runtime.log'
    Write-Host 'Desktop preparation finished. Start separately to verify Electron and Host readiness.'
} finally {
    Pop-Location
    Pop-SandboxEnvironment $savedEnvironment
    Exit-SandboxLease $paths $lease
}
