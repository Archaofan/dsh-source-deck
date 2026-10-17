Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Set-SandboxProcessEnvironment([string]$Name, $Value) {
    if ($null -eq $Value) {
        Remove-Item -LiteralPath "Env:$Name" -ErrorAction SilentlyContinue
    } else {
        [Environment]::SetEnvironmentVariable($Name, [string]$Value, 'Process')
    }
}

function Get-SandboxPaths {
    $sandboxRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
    $workspaceRoot = [IO.Path]::GetFullPath((Join-Path $sandboxRoot '../..'))
    $baseline = Get-Content -LiteralPath (Join-Path $sandboxRoot 'baseline.json') -Raw | ConvertFrom-Json
    return [pscustomobject]@{
        Root = $sandboxRoot
        Workspace = $workspaceRoot
        Upstream = Join-Path $sandboxRoot 'upstream'
        HomePath = Join-Path $sandboxRoot 'home'
        UserData = Join-Path $sandboxRoot 'electron-user-data'
        Logs = Join-Path $sandboxRoot 'logs'
        Pnpm = Join-Path $sandboxRoot 'tools/pnpm-11.28.5/package/bin/pnpm.cjs'
        Node = (Get-Command node -ErrorAction Stop).Source
        Baseline = $baseline
    }
}

function Assert-SandboxBaseline($Paths) {
    if (-not (Test-Path -LiteralPath $Paths.Pnpm -PathType Leaf)) {
        throw 'Pinned local pnpm is missing. Restore the sandbox tooling before proceeding.'
    }
    $commit = & git -c "safe.directory=$($Paths.Upstream.Replace('\', '/'))" -C $Paths.Upstream rev-parse HEAD
    if ($LASTEXITCODE -ne 0 -or $commit.Trim() -ne $Paths.Baseline.commit) {
        throw 'Upstream commit differs from baseline.json. Review an explicit sandbox upgrade first.'
    }
}

function Enter-SandboxLease($Paths, [string]$Project, [string]$Action) {
    try {
        $stream = [IO.File]::Open((Join-Path $Paths.Root '.run.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    } catch [IO.IOException] {
        throw 'Shared Desktop sandbox is occupied. Close its current instance or wait for preparation to finish.'
    }
    try {
        $run = [ordered]@{
            schemaVersion = 1
            runId = [guid]::NewGuid().ToString()
            project = $Project
            action = $Action
            launcherPid = $PID
            startedAtUtc = [DateTime]::UtcNow.ToString('o')
            dshHome = $Paths.HomePath
            electronUserData = $Paths.UserData
            version = $Paths.Baseline.version
        }
        $run | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Paths.Root '.active-run.json') -Encoding utf8
        return [pscustomobject]@{ Stream = $stream; Run = $run }
    } catch {
        $stream.Dispose()
        throw
    }
}

function Exit-SandboxLease($Paths, $Lease) {
    try {
        $Lease.Run['finishedAtUtc'] = [DateTime]::UtcNow.ToString('o')
        $Lease.Run | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Paths.Root '.active-run.json') -Encoding utf8
    } finally {
        $Lease.Stream.Dispose()
    }
}

function Push-SandboxEnvironment($Paths) {
    $updates = @{
        DSH_HOME = $Paths.HomePath
        DSH_DESKTOP_USER_DATA_DIR = $Paths.UserData
        DSH_DESKTOP_OPEN_DEVTOOLS = '0'
        DSH_DESKTOP_MAIN_INSPECT_PORT = '19329'
        DSH_DESKTOP_RENDERER_DEBUG_PORT = '19322'
        DSH_DESKTOP_HOST_INSPECT_PORT = '19330'
        APPDATA = Join-Path $Paths.Root 'appdata'
        LOCALAPPDATA = Join-Path $Paths.Root 'localappdata'
        TEMP = Join-Path $Paths.Root 'tmp'
        TMP = Join-Path $Paths.Root 'tmp'
        XDG_CACHE_HOME = Join-Path $Paths.Root 'cache'
        PNPM_HOME = Join-Path $Paths.Root 'tools/pnpm-home'
        npm_config_cache = Join-Path $Paths.Root 'cache/npm'
        npm_config_store_dir = Join-Path $Paths.Root 'cache/pnpm-store'
        ELECTRON_CACHE = Join-Path $Paths.Root 'cache/electron'
        electron_config_cache = Join-Path $Paths.Root 'cache/electron'
        ELECTRON_GET_USE_PROXY = if ($env:HTTPS_PROXY -or $env:HTTP_PROXY) { '1' } else { $null }
        NODE_USE_ENV_PROXY = if ($env:HTTPS_PROXY -or $env:HTTP_PROXY) { '1' } else { $null }
        GIT_CONFIG_COUNT = '1'
        GIT_CONFIG_KEY_0 = 'safe.directory'
        GIT_CONFIG_VALUE_0 = $Paths.Upstream.Replace('\', '/')
        DSH_DESKTOP_DEV_APP = $null
        DSH_DESKTOP_MANDATORY_UPDATE_CONFIG = $null
        DSH_DESKTOP_APP_ID = $null
        ELECTRON_RUN_AS_NODE = $null
        DEEPSEEK_API_KEY = $null
        DEEPSEEK_BASE_URL = $null
        OPENAI_API_KEY = $null
        ANTHROPIC_API_KEY = $null
        GH_TOKEN = $null
        GITHUB_TOKEN = $null
    }
    $original = @{}
    foreach ($entry in $updates.GetEnumerator()) {
        $original[$entry.Key] = [Environment]::GetEnvironmentVariable($entry.Key, 'Process')
        Set-SandboxProcessEnvironment $entry.Key $entry.Value
    }
    foreach ($relative in @('home', 'electron-user-data', 'appdata', 'localappdata', 'tmp', 'logs', 'cache', 'tools/pnpm-home')) {
        [IO.Directory]::CreateDirectory((Join-Path $Paths.Root $relative)) | Out-Null
    }
    return $original
}

function Pop-SandboxEnvironment($Original) {
    foreach ($entry in $Original.GetEnumerator()) {
        Set-SandboxProcessEnvironment $entry.Key $entry.Value
    }
}

function Invoke-SandboxPnpm($Paths, [string[]]$CommandArguments, [string]$LogName) {
    $logPath = Join-Path $Paths.Logs $LogName
    Write-Host "Running: pnpm $($CommandArguments -join ' '); log: $logPath"
    & $Paths.Node $Paths.Pnpm @CommandArguments *> $logPath
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit $LASTEXITCODE. See $logPath"
    }
}

function Invoke-SandboxDesktopCli($Paths, [string[]]$CommandArguments, [string]$LogName) {
    $electron = Join-Path $Paths.Upstream 'apps/desktop/node_modules/electron/dist/electron.exe'
    $support = Join-Path $Paths.Upstream 'apps/desktop/.desktop-build/targets/win-x64/runtime'
    $bin = Join-Path $support 'bin'
    [IO.Directory]::CreateDirectory($bin) | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $Paths.Upstream 'apps/desktop/scripts/node-bin') -File | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $bin $_.Name) -Force
    }
    $previousRunAsNode = [Environment]::GetEnvironmentVariable('ELECTRON_RUN_AS_NODE', 'Process')
    [Environment]::SetEnvironmentVariable('ELECTRON_RUN_AS_NODE', '1', 'Process')
    try {
        $logPath = Join-Path $Paths.Logs $LogName
        & $electron '--expose-internals' (Join-Path $Paths.Root 'scripts/desktop-cli.mjs') @CommandArguments *> $logPath
        if ($LASTEXITCODE -ne 0) { throw "Desktop CLI failed with exit $LASTEXITCODE. See $logPath" }
    } finally {
        Set-SandboxProcessEnvironment 'ELECTRON_RUN_AS_NODE' $previousRunAsNode
    }
}
