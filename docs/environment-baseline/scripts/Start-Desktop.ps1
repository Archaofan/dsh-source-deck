[CmdletBinding()]
param(
    [ValidatePattern('^[a-z0-9][a-z0-9-]*$')][string]$Project = 'dsh-source-deck',
    [switch]$CheckOnly
)
. (Join-Path $PSScriptRoot 'Common.ps1')
$paths = Get-SandboxPaths
Assert-SandboxBaseline $paths
$projectRoot = Join-Path $paths.Workspace $Project
if (-not (Test-Path -LiteralPath $projectRoot -PathType Container)) { throw 'Project directory does not exist.' }
if ($CheckOnly) {
    [pscustomobject]@{ project = $Project; baseline = $paths.Baseline.version; dshHome = $paths.HomePath; electronUserData = $paths.UserData } | ConvertTo-Json
    return
}
foreach ($relative in @('apps/desktop/lib/main.js', 'apps/desktop-host/lib/index.js', 'apps/desktop/.desktop-build/targets/win-x64/runtime/primary-runtime/runtime.json')) {
    if (-not (Test-Path -LiteralPath (Join-Path $paths.Upstream $relative) -PathType Leaf)) { throw "Desktop is not prepared: $relative" }
}
$lease = Enter-SandboxLease $paths $Project 'desktop'
$savedEnvironment = Push-SandboxEnvironment $paths
$testWorkspace = Join-Path $paths.Root "test-workspaces/$Project"
[IO.Directory]::CreateDirectory($testWorkspace) | Out-Null
$profileDirectory = Join-Path $paths.HomePath 'profiles/desktop'
[IO.Directory]::CreateDirectory($profileDirectory) | Out-Null
$patchPath = Join-Path $profileDirectory 'cordis.patch.yml'
if (-not (Test-Path -LiteralPath $patchPath)) {
    $documentsDirectory = $testWorkspace.Replace('\', '/')
    @(
        '# Shared sandbox first-use workspace: keep the default outside system Documents.',
        '- id: workspace-controller',
        '  config:',
        ('    documentsDirectory: "' + $documentsDirectory + '"')
    ) | Set-Content -LiteralPath $patchPath -Encoding utf8
}
Push-Location $paths.Upstream
try {
    Write-Host "Sandbox test workspace: $testWorkspace"
    Write-Host 'Use this test workspace in the Desktop workspace picker. Exit through the Desktop menu to release the shared sandbox.'
    Invoke-SandboxPnpm $paths @('run', 'start:desktop') 'desktop.log'
} finally {
    Pop-Location
    Pop-SandboxEnvironment $savedEnvironment
    Exit-SandboxLease $paths $lease
}
