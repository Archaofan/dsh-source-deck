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
    $baseline = Get-Content -LiteralPath (Join-Path $sandboxRoot 'baseline.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    return [pscustomobject]@{
        Root = $sandboxRoot
        Workspace = $workspaceRoot
        Upstream = Join-Path $sandboxRoot 'upstream'
        HomePath = Join-Path $sandboxRoot 'home'
        UserData = Join-Path $sandboxRoot 'electron-user-data'
        Logs = Join-Path $sandboxRoot 'logs'
        Pnpm = Join-Path $sandboxRoot "tools/pnpm-$($baseline.pnpm)/package/bin/pnpm.cjs"
        Node = (Get-Command node -ErrorAction Stop).Source
        Baseline = $baseline
    }
}

function Get-UpstreamCommit($Paths) {
    # Prefer git; fall back to parsing .git refs (detached HEAD / branch / packed-refs) when git is absent.
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $upstreamPosix = $Paths.Upstream.Replace('\', '/')
        $gitArgs = @('-c', "safe.directory=$upstreamPosix", '-C', $Paths.Upstream, 'rev-parse', 'HEAD')
        $commit = @(& git $gitArgs)
        if ($global:LASTEXITCODE -eq 0 -and $commit.Count -gt 0) { return "$commit".Trim() }
    }
    $gitDir = Join-Path $Paths.Upstream '.git'
    $head = (Get-Content (Join-Path $gitDir 'HEAD') -Raw).Trim()
    if ($head -notmatch '^ref:') { return $head }
    $ref = $head.Substring(4).Trim()
    $refFile = Join-Path $gitDir ($ref -replace '/', '\')
    if (Test-Path -LiteralPath $refFile -PathType Leaf) { return (Get-Content $refFile -Raw).Trim() }
    $packed = Join-Path $gitDir 'packed-refs'
    if (Test-Path -LiteralPath $packed -PathType Leaf) {
        $suffix = ' ' + $ref
        $lines = @(Get-Content $packed | Where-Object { $_.EndsWith($suffix) })
        if ($lines.Count -gt 0) { return ("$($lines[0])" -split ' ')[0] }
    }
    return $null
}

function Assert-SandboxBaseline($Paths) {
    $baseline = $Paths.Baseline
    if ($baseline.version -match '-alpha\.') {
        throw 'Sandbox must match the approved production RC/release baseline; alpha is not supported.'
    }
    if ($baseline.version -ne $baseline.productionVersion) {
        # The sandbox may lead production only when the user explicitly approved
        # that development baseline and the approval pins every version involved.
        $properties = $baseline.PSObject.Properties
        $approval = if ($properties['upgradeApproval']) { $properties['upgradeApproval'].Value } else { $null }
        $relation = if ($properties['sandboxRelation']) { $properties['sandboxRelation'].Value } else { $null }
        $approvedDevUpgrade = $null -ne $approval `
            -and $relation -eq 'ahead-of-production' `
            -and $approval.approvedBy -eq 'user' `
            -and $approval.sandboxVersion -eq $baseline.version `
            -and $approval.productionVersion -eq $baseline.productionVersion `
            -and $approval.productPeerUnchanged -eq $baseline.productionVersion
        if (-not $approvedDevUpgrade) {
            throw 'Sandbox must match the approved production RC/release baseline; alpha is not supported. A newer sandbox baseline requires an explicit user upgrade approval recorded in baseline.json.'
        }
    }
    if (-not (Test-Path -LiteralPath $Paths.Pnpm -PathType Leaf)) {
        throw 'Pinned local pnpm is missing. Restore the sandbox tooling before proceeding.'
    }
    $commit = Get-UpstreamCommit $Paths
    if (-not $commit -or $commit -ne $Paths.Baseline.commit) {
        throw "Upstream commit ($commit) differs from baseline.json ($($Paths.Baseline.commit)). Review an explicit sandbox upgrade first."
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
    $pnpmHome = Join-Path $Paths.Root 'tools/pnpm-home'
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
        PNPM_HOME = $pnpmHome
        PATH = $pnpmHome + ';' + $env:PATH
        npm_config_cache = Join-Path $Paths.Root 'cache/npm'
        npm_config_store_dir = Join-Path $Paths.Root 'cache/pnpm-store'
        ELECTRON_CACHE = Join-Path $Paths.Root 'cache/electron'
        electron_config_cache = Join-Path $Paths.Root 'cache/electron'
        ELECTRON_GET_USE_PROXY = if ($env:HTTPS_PROXY -or $env:HTTP_PROXY) { '1' } else { $null }
        NODE_USE_ENV_PROXY = if ($env:HTTPS_PROXY -or $env:HTTP_PROXY) { '1' } else { $null }
        GIT_CONFIG_COUNT = '1'
        GIT_CONFIG_KEY_0 = 'safe.directory'
        GIT_CONFIG_VALUE_0 = $Paths.Upstream.Replace('\', '/')
        # The 0.2.1 client build resolves its commit through `git rev-parse HEAD`;
        # this machine has no git binary. Upstream supports an explicit commit for
        # non-Git builds, so supply the baseline commit instead of adding a shim.
        DSH_CLIENT_COMMIT_HASH = $Paths.Baseline.commit
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
    # A caller with ErrorActionPreference=Stop turns any native stderr line into a
    # terminating error; child output is redirected, so Continue is correct here.
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        # No local assignment to $LASTEXITCODE: a function-scope assignment shadows
        # the automatic variable that native commands update, hiding failures.
        & $Paths.Node $Paths.Pnpm @CommandArguments *> $logPath
        if ($global:LASTEXITCODE -ne 0) {
            throw "Command failed with exit $global:LASTEXITCODE. See $logPath"
        }
    } finally {
        $ErrorActionPreference = $previousPreference
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
    $logPath = Join-Path $Paths.Logs $LogName
    $stdoutPath = Join-Path $Paths.Root "tmp/desktop-cli-$PID-out.log"
    $stderrPath = Join-Path $Paths.Root "tmp/desktop-cli-$PID-err.log"
    try {
        # electron.exe is a GUI-subsystem binary, so `&` neither waits for it nor
        # defines $LASTEXITCODE. Start-Process -Wait returns a Process with the
        # child's exit code, which is the only reliable failure signal here.
        $argumentsForElectron = @('--expose-internals', (Join-Path $Paths.Root 'scripts/desktop-cli.mjs')) + $CommandArguments
        $process = Start-Process -FilePath $electron -ArgumentList $argumentsForElectron -WorkingDirectory $Paths.Upstream `
            -Wait -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
        $stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw } else { '' }
        $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { '' }
        Set-Content -LiteralPath $logPath -Value ($stdout + $stderr) -Encoding Unicode
        if ($process.ExitCode -ne 0) { throw "Desktop CLI failed with exit $($process.ExitCode). See $logPath" }
    } finally {
        Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
        Set-SandboxProcessEnvironment 'ELECTRON_RUN_AS_NODE' $previousRunAsNode
    }
}
