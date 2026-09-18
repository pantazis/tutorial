$ErrorActionPreference = "Stop"

# ============================================================
# CONTROL
# Set to $true to stop this hook without launching next task.
# Set to $false for normal execution.
# ============================================================
$stopExecution = $false

if ($stopExecution) {
    Write-Output '{"cancel":false}'
    return
}

$projectRoot = Split-Path -Parent (
    Split-Path -Parent $PSScriptRoot
)
$scriptPath = Join-Path $projectRoot "scripts\start-next-task.ps1"
$workflowStatePath = Join-Path $projectRoot "state.json"
$frontendGuidePath = Join-Path $projectRoot "static_ui\.frontend-guide"
$frontendCurrentTaskPath = Join-Path $frontendGuidePath "CURRENT-TASK.md"
$hookLogPath = Join-Path $env:TEMP "cline-task-complete-hook.log"

if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "External script not found: $scriptPath"
}

function Write-HookLog {
    param([Parameter(Mandatory = $true)][string]$Message)

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    $entry = "[$timestamp] $Message"

    for ($attempt = 1; $attempt -le 10; $attempt++) {
        try {
            Add-Content -LiteralPath $hookLogPath -Value $entry -Encoding UTF8
            return
        }
        catch {
            if ($attempt -eq 10) {
                throw
            }
            Start-Sleep -Milliseconds (25 * $attempt)
        }
    }
}

function Get-FrontendTaskDecision {
    if (-not (Test-Path -LiteralPath $frontendCurrentTaskPath -PathType Leaf)) {
        throw "Frontend current task not found: $frontendCurrentTaskPath"
    }

    $currentTask = Get-Content -LiteralPath $frontendCurrentTaskPath -Raw

    if ($currentTask -match '(?im)^\s*STATUS\s*:\s*PROTOTYPE_IMPLEMENTATION_COMPLETE\s*$') {
        return [pscustomobject]@{
            action = 'user_action'
            message = @"
USER_ACTION_REQUIRED: REVIEW_AND_DECIDE_STATIC_HTML_PROTOTYPE

All planned static-prototype implementation tasks are complete. Review the prototype against:
$frontendGuidePath
"@
        }
    }

    $readyTasks = @(
        [regex]::Matches(
            $currentTask,
            '(?im)^##\s+\[\s\]\s+(?<id>FP-\d{3})\b.*$'
        )
    )

    if ($readyTasks.Count -ne 1 -or $currentTask -notmatch '(?im)^\s*STATUS\s*:\s*READY\s*$') {
        throw "Frontend task projection must contain exactly one unchecked FP task with STATUS: READY: $frontendCurrentTaskPath"
    }

    return [pscustomobject]@{
        action = 'user_action'
        message = @"
USER_ACTION_REQUIRED: BUILD_CURRENT_STATIC_HTML_PROTOTYPE_TASK

Build exactly the task projected in:
$frontendCurrentTaskPath

Use the static-only contract in:
$frontendGuidePath

After VERIFY and DONE_WHEN are satisfied, advance exactly one task with the canonical command documented in .clinerules\do.md.
"@
    }
}

try {
    if (Test-Path -LiteralPath $workflowStatePath -PathType Leaf) {
        $decisionJson = & $scriptPath -LaunchDecision
        $decision = ($decisionJson -join "`n") | ConvertFrom-Json
    }
    else {
        Write-HookLog "General workflow state is absent; using the canonical static frontend task projection."
        $decision = Get-FrontendTaskDecision
    }
}
catch {
    Write-HookLog "Preflight failed: $($_.Exception.Message)"
    throw
}

$launchPrompt = $null

if ($decision.action -eq 'user_action') {
    if ($decision.message -match '(?m)^USER_ACTION_REQUIRED:\s*BUILD_CURRENT_STATIC_HTML_PROTOTYPE_TASK\s*$') {
        $launchPrompt = @"
Continue the static frontend prototype implementation in a fresh Cline task.

$($decision.message)

This task is delegated to Cline by the TaskComplete hook. Follow .clinerules\do.md exactly. Read the projected CURRENT-TASK.md named above, implement and verify exactly that one READY task, and use only the canonical complete-frontend-task.ps1 command to record evidence and advance the dependency chain. Do not implement later tasks in the same Cline task. If verification fails, leave the current task READY and report the blocker. After successful canonical completion, finish this Cline task so the TaskComplete hook can launch the newly projected task.
"@
        Write-HookLog "Frontend implementation task is ready; converting the user-action projection into a chained Cline dispatch."
    }
    else {
        Write-HookLog "Workflow paused at the user frontend prototype gate. $($decision.message -replace "`r?`n", ' | ')"
        Write-Output '{"cancel":false}'
        return
    }
}

if ($decision.action -eq 'complete') {
    Write-HookLog "Workflow is complete; no new Cline task was launched."
    Write-Output '{"cancel":false}'
    return
}

if ($decision.action -ne 'dispatch' -and $null -eq $launchPrompt) {
    throw "Unsupported launcher decision '$($decision.action)'."
}

if (-not ("TaskCompleteWindowNative" -as [type])) {
    Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class TaskCompleteWindowNative
{
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
}

function Get-ForegroundVSCodeWindowHandle {
    $windowHandle = [TaskCompleteWindowNative]::GetForegroundWindow()

    if ($windowHandle -ne [IntPtr]::Zero) {
        [uint32]$processId = 0

        [void][TaskCompleteWindowNative]::GetWindowThreadProcessId(
            $windowHandle,
            [ref]$processId
        )

        if ($processId -ne 0) {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

            if ($null -ne $process -and $process.ProcessName -eq "Code") {
                return $windowHandle.ToInt64()
            }
        }
    }

    $visibleVSCodeHandles = [System.Collections.Generic.List[long]]::new()

    $callback = [TaskCompleteWindowNative+EnumWindowsProc]{
        param(
            [IntPtr]$candidateHandle,
            [IntPtr]$lParam
        )

        if ([TaskCompleteWindowNative]::IsWindowVisible($candidateHandle)) {
            [uint32]$candidateProcessId = 0

            [void][TaskCompleteWindowNative]::GetWindowThreadProcessId(
                $candidateHandle,
                [ref]$candidateProcessId
            )

            $candidateProcess = Get-Process `
                -Id $candidateProcessId `
                -ErrorAction SilentlyContinue

            if (
                $null -ne $candidateProcess -and
                $candidateProcess.ProcessName -eq "Code"
            ) {
                $visibleVSCodeHandles.Add(
                    $candidateHandle.ToInt64()
                )
            }
        }

        return $true
    }

    [void][TaskCompleteWindowNative]::EnumWindows(
        $callback,
        [IntPtr]::Zero
    )

    $uniqueHandles = @(
        $visibleVSCodeHandles |
        Sort-Object -Unique
    )

    if ($uniqueHandles.Count -eq 1) {
        return $uniqueHandles[0]
    }

    return 0
}

$delaySeconds = 10

$oldWindowHandle = Get-ForegroundVSCodeWindowHandle

$escapedScriptPath = $scriptPath.Replace("'", "''")

if ($null -ne $launchPrompt) {
    $encodedPrompt = [System.Uri]::EscapeDataString($launchPrompt)
    $taskUri = "vscode://saoudrizwan.claude-dev/task?prompt=$encodedPrompt"
    $escapedProjectRoot = $projectRoot.Replace("'", "''")
    $escapedTaskUri = $taskUri.Replace("'", "''")
    $childCommand = `
        "Start-Sleep -Seconds $delaySeconds; " +
        "& code --new-window '$escapedProjectRoot' --open-url -- '$escapedTaskUri'"
}
else {
    $childCommand = `
        "Start-Sleep -Seconds $delaySeconds; " +
        "& '$escapedScriptPath' -OldWindowHandle $oldWindowHandle"
}

$encodedCommand = [Convert]::ToBase64String(
    [Text.Encoding]::Unicode.GetBytes($childCommand)
)

$arguments = @(
    "-NoProfile"
    "-ExecutionPolicy"
    "Bypass"
    "-EncodedCommand"
    $encodedCommand
)

if ($env:CLINE_TASK_COMPLETE_NO_LAUNCH -ne "1") {
    if ($null -ne $launchPrompt) {
        Write-HookLog "Starting the delayed launcher for the next frontend implementation task."
    }
    else {
        Write-HookLog "Preflight requested a fresh Cline task; starting the delayed launcher."
    }
    Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList $arguments `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden
}
else {
    Write-HookLog "Launch suppressed by CLINE_TASK_COMPLETE_NO_LAUNCH=1 after successful dispatch preflight."
}

Write-Output '{"cancel":false}'
