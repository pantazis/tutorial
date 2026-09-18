param(
    [long]$OldWindowHandle = 0,
    [switch]$ValidateOnly,
    [switch]$LaunchDecision,
    [switch]$CompleteCurrentTask,
    [string]$Evidence,
    [string]$PrototypePath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
$staticUiRoot = Join-Path $projectRoot 'static_ui'
$guideRoot = Join-Path $staticUiRoot '.frontend-guide'
$currentTaskPath = Join-Path $guideRoot 'CURRENT-TASK.md'
$lifecycleRulePath = Join-Path $projectRoot '.clinerules\do.md'
$validatorPath = 'C:\Users\pvast\Documents\plan maker\scripts\validate-frontend-guide.ps1'
$completionScriptPath = 'C:\Users\pvast\Documents\plan maker\scripts\complete-frontend-task.ps1'
$logPath = Join-Path $env:TEMP 'cline-start-next-task.log'
$legacyClineTasksPath = Join-Path $env:APPDATA 'Code\User\globalStorage\saoudrizwan.claude-dev\tasks'
$vscodeLogsPath = Join-Path $env:APPDATA 'Code\logs'

function Write-LaunchLog {
    param([Parameter(Mandatory = $true)][string]$Message)

    $entry = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'), $Message
    for ($attempt = 1; $attempt -le 10; $attempt++) {
        try {
            Add-Content -LiteralPath $logPath -Value $entry -Encoding UTF8
            return
        }
        catch {
            if ($attempt -eq 10) { throw }
            Start-Sleep -Milliseconds (25 * $attempt)
        }
    }
}

function Assert-FileExists {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Description
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Description not found: $Path"
    }
}

function Invoke-CanonicalFrontendCompletion {
    if ([string]::IsNullOrWhiteSpace($Evidence)) {
        throw 'Evidence is required with -CompleteCurrentTask.'
    }
    if ([string]::IsNullOrWhiteSpace($PrototypePath)) {
        throw 'PrototypePath is required with -CompleteCurrentTask.'
    }

    Assert-FileExists -Path $validatorPath -Description 'Canonical frontend guide validator'
    Assert-FileExists -Path $completionScriptPath -Description 'Canonical frontend task completion script'

    $stagingRoot = Join-Path $staticUiRoot 'scripts'
    $stagedValidatorPath = Join-Path $stagingRoot 'validate-frontend-guide.ps1'
    $createdStagingRoot = $false
    $createdStagedValidator = $false

    if (Test-Path -LiteralPath $stagingRoot -PathType Leaf) {
        throw "Cannot stage the canonical validator because a file exists at: $stagingRoot"
    }

    try {
        if (-not (Test-Path -LiteralPath $stagingRoot -PathType Container)) {
            [void](New-Item -ItemType Directory -Path $stagingRoot)
            $createdStagingRoot = $true
        }
        if (-not (Test-Path -LiteralPath $stagedValidatorPath -PathType Leaf)) {
            Copy-Item -LiteralPath $validatorPath -Destination $stagedValidatorPath
            $createdStagedValidator = $true
        }

        $completionOutput = @(
            & $completionScriptPath -Evidence $Evidence -PrototypePath $PrototypePath `
                -ProjectRoot $staticUiRoot 2>&1
        )
        $completionOutput | Write-Output
    }
    finally {
        if ($createdStagedValidator -and (Test-Path -LiteralPath $stagedValidatorPath -PathType Leaf)) {
            Remove-Item -LiteralPath $stagedValidatorPath -Force
        }
        if ($createdStagingRoot -and (Test-Path -LiteralPath $stagingRoot -PathType Container)) {
            Remove-Item -LiteralPath $stagingRoot -Force
        }
    }
}

function Get-FrontendLaunchDecision {
    foreach ($requiredFile in @(
        @{ Path = $lifecycleRulePath; Description = 'Static frontend lifecycle rule' },
        @{ Path = $currentTaskPath; Description = 'Current frontend prototype task' },
        @{ Path = $validatorPath; Description = 'Canonical frontend guide validator' },
        @{ Path = $completionScriptPath; Description = 'Canonical frontend task completion script' }
    )) {
        Assert-FileExists -Path $requiredFile.Path -Description $requiredFile.Description
    }

    $validationOutput = @(
        & $validatorPath -ProjectRoot $staticUiRoot -GuideRoot $guideRoot 2>&1
    )
    Write-LaunchLog "Frontend guide validation completed: $($validationOutput -join ' ')"

    $currentTask = Get-Content -LiteralPath $currentTaskPath -Raw
    if ($currentTask -match '(?im)^\s*STATUS\s*:\s*PROTOTYPE_IMPLEMENTATION_COMPLETE\s*$') {
        if ($currentTask -notmatch '(?im)^\s*USER_REVIEW_REQUIRED\s*:\s*true\s*$') {
            throw "Terminal frontend task projection does not require user review: $currentTaskPath"
        }

        return [pscustomobject]@{
            action = 'user_action'
            message = @"
USER_ACTION_REQUIRED: REVIEW_AND_DECIDE_STATIC_HTML_PROTOTYPE

All FP-001 through FP-012 implementation tasks are complete. Review the static prototype against the acceptance contract in:
$guideRoot

Do not record CONTINUE or REVISION_REQUIRED automatically. Only the user may make that decision after review.
"@
        }
    }

    $readyMatches = @(
        [regex]::Matches($currentTask, '(?im)^##\s+\[ \]\s+(?<id>FP-\d{3})\s+(?<title>.+)$')
    )
    if ($readyMatches.Count -ne 1 -or $currentTask -notmatch '(?im)^\s*STATUS\s*:\s*READY\s*$') {
        throw "CURRENT-TASK.md must project exactly one unchecked FP-### task with STATUS: READY: $currentTaskPath"
    }

    $taskId = $readyMatches[0].Groups['id'].Value
    $taskTitle = $readyMatches[0].Groups['title'].Value.Trim()
    $prototypePath = Join-Path $staticUiRoot 'prototype'
    $completionCommand = '& "{0}" -CompleteCurrentTask -Evidence "<objective verification evidence>" -PrototypePath "{1}"' -f `
        $PSCommandPath, $prototypePath

    return [pscustomobject]@{
        action = 'dispatch'
        message = @"
Continue the static frontend prototype implementation in this project.

CURRENT TASK: $taskId $taskTitle

Follow this lifecycle rule exactly:
$lifecycleRulePath

Read the sole canonical task projection first:
$currentTaskPath

Implement and verify exactly that one READY task. Read only the guide sections and prototype files named by its READ, REUSE, and TOUCH fields. Preserve completed behavior, do not implement later tasks, and never edit files under .frontend-guide manually.

After every VERIFY item and DONE_WHEN condition passes, advance exactly one task with this project wrapper. It stages the canonical validator temporarily and delegates the only guide mutation to complete-frontend-task.ps1:
$completionCommand

If verification fails, leave the same task READY, preserve useful partial prototype work, and report the blocker. After successful canonical completion, finish this Cline task so the TaskComplete hook can launch the newly projected task. If FP-012 reaches PROTOTYPE_IMPLEMENTATION_COMPLETE, stop for user review and do not record a user decision.
"@
    }
}

function Get-ClineTaskIds {
    $taskIds = @()

    if (Test-Path -LiteralPath $legacyClineTasksPath -PathType Container) {
        $taskIds += @(
            Get-ChildItem -LiteralPath $legacyClineTasksPath -Directory -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty Name
        )
    }

    if (Test-Path -LiteralPath $vscodeLogsPath -PathType Container) {
        $clineLogs = @(
            Get-ChildItem -LiteralPath $vscodeLogsPath -Recurse -File -Filter '*-Cline.log' -ErrorAction SilentlyContinue |
                Where-Object { $_.LastWriteTime -ge (Get-Date).AddDays(-1) }
        )
        foreach ($clineLog in $clineLogs) {
            $matches = Select-String -LiteralPath $clineLog.FullName `
                -Pattern 'Task initialized:\s+(?<taskId>\S+)' -AllMatches -ErrorAction SilentlyContinue
            foreach ($match in $matches.Matches) {
                $taskIds += $match.Groups['taskId'].Value
            }
        }
    }

    return @($taskIds | Sort-Object -Unique)
}

function Get-VSCodeCommand {
    $command = Get-Command 'code.cmd' -ErrorAction SilentlyContinue
    if ($null -ne $command) { return $command.Source }

    $defaultCommand = Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'
    if (Test-Path -LiteralPath $defaultCommand -PathType Leaf) { return $defaultCommand }

    throw "VS Code command-line launcher not found. Expected code.cmd on PATH or at: $defaultCommand"
}

if (-not ('ClineLauncherWindowNative' -as [type])) {
    Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class ClineLauncherWindowNative
{
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool PostMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
}
"@
}

function Get-VSCodeWindowHandles {
    $handles = [System.Collections.Generic.List[long]]::new()
    $callback = [ClineLauncherWindowNative+EnumWindowsProc]{
        param([IntPtr]$WindowHandle, [IntPtr]$LParam)

        if (-not [ClineLauncherWindowNative]::IsWindowVisible($WindowHandle)) { return $true }
        [uint32]$processId = 0
        [void][ClineLauncherWindowNative]::GetWindowThreadProcessId($WindowHandle, [ref]$processId)
        if ($processId -eq 0) { return $true }

        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($null -ne $process -and $process.ProcessName -eq 'Code') {
            $handles.Add($WindowHandle.ToInt64())
        }
        return $true
    }

    [void][ClineLauncherWindowNative]::EnumWindows($callback, [IntPtr]::Zero)
    return @($handles | Sort-Object -Unique)
}

function Close-OldVSCodeWindow {
    param(
        [Parameter(Mandatory = $true)][long]$WindowHandle,
        [Parameter(Mandatory = $true)][long[]]$InitialWindowHandles,
        [Parameter(Mandatory = $true)][long[]]$NewWindowHandles
    )

    if ($WindowHandle -eq 0) {
        Write-LaunchLog 'WARNING Old VS Code window handle was unavailable; leaving existing windows open.'
        return
    }
    if ($WindowHandle -notin $InitialWindowHandles) {
        Write-LaunchLog "WARNING Refusing to close unverified old window handle: $WindowHandle"
        return
    }
    if ($WindowHandle -in $NewWindowHandles) {
        Write-LaunchLog "WARNING Refusing to close a window detected as newly created: $WindowHandle"
        return
    }

    if ([ClineLauncherWindowNative]::PostMessage([IntPtr]$WindowHandle, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)) {
        Write-LaunchLog "Requested graceful close of old VS Code window: $WindowHandle"
    }
    else {
        Write-LaunchLog "WARNING Failed to request close of old VS Code window: $WindowHandle"
    }
}

Write-LaunchLog "Launcher started. projectRoot=$projectRoot oldWindowHandle=$OldWindowHandle"

if ($CompleteCurrentTask) {
    Invoke-CanonicalFrontendCompletion
    exit 0
}

$decision = Get-FrontendLaunchDecision

if ($LaunchDecision) {
    Write-Output ($decision | ConvertTo-Json -Compress)
    exit 0
}

if ($ValidateOnly) {
    Write-Output $decision.message
    exit 0
}

if ($decision.action -eq 'user_action') {
    Write-LaunchLog 'Prototype implementation is complete; waiting for user review without dispatching another task.'
    Write-Host $decision.message
    exit 0
}
if ($decision.action -ne 'dispatch') {
    throw "Unsupported frontend launch decision '$($decision.action)'."
}

$encodedPrompt = [System.Uri]::EscapeDataString($decision.message)
$taskUri = "vscode://saoudrizwan.claude-dev/task?prompt=$encodedPrompt"
$vscodeCommand = Get-VSCodeCommand
$initialTaskIds = @(Get-ClineTaskIds)
$initialWindowHandles = @(Get-VSCodeWindowHandles)
$maximumAttempts = 6
$waitAfterLaunchSeconds = 10
$dispatchSucceeded = $false

for ($attempt = 1; $attempt -le $maximumAttempts; $attempt++) {
    if (-not $dispatchSucceeded) {
        try {
            Write-LaunchLog "Attempt $attempt/${maximumAttempts}: opening project and current frontend task in a new VS Code window."
            $dispatchOutput = @(& $vscodeCommand --new-window $projectRoot --open-url -- $taskUri 2>&1)
            if ($LASTEXITCODE -ne 0) {
                throw "VS Code URI dispatch exited with code $LASTEXITCODE. Output: $($dispatchOutput -join ' ')"
            }
            $dispatchSucceeded = $true
            Write-LaunchLog 'VS Code accepted the Cline task URI; later attempts will only verify launch signals.'
        }
        catch {
            Write-LaunchLog "Attempt $attempt ERROR: $($_.Exception.Message)"
        }
    }

    Start-Sleep -Seconds $waitAfterLaunchSeconds
    $currentTaskIds = @(Get-ClineTaskIds)
    $newTaskIds = @($currentTaskIds | Where-Object { $_ -notin $initialTaskIds })
    $currentWindowHandles = @(Get-VSCodeWindowHandles)
    $newWindowHandles = @($currentWindowHandles | Where-Object { $_ -notin $initialWindowHandles })

    if ($newWindowHandles.Count -gt 0) {
        Write-LaunchLog "SUCCESS New VS Code window detected. taskIds=$($newTaskIds -join ', ') windowHandles=$($newWindowHandles -join ', ')"
        Close-OldVSCodeWindow -WindowHandle $OldWindowHandle `
            -InitialWindowHandles $initialWindowHandles -NewWindowHandles $newWindowHandles
        exit 0
    }
    if ($newTaskIds.Count -gt 0) {
        Write-LaunchLog "SUCCESS New Cline task detected without a safely identifiable new VS Code window. taskIds=$($newTaskIds -join ', ')"
        exit 0
    }

    Write-LaunchLog "Verification $attempt/${maximumAttempts} did not detect a new window or task yet; the old window remains open."
}

if ($dispatchSucceeded) {
    Write-LaunchLog 'SUCCESS VS Code accepted the Cline task URI but reused a window or exposed no detectable launch signal. Existing windows remain open.'
    exit 0
}

$message = "The current frontend task could not be dispatched after $maximumAttempts attempts. See $logPath"
Write-LaunchLog "FAILED $message"
throw $message
