$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Set to $true to leave task chaining disabled without blocking Cline completion.
$stopExecution = $false

if ($stopExecution) {
    Write-Output '{"cancel":false}'
    return
}

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$launcherPath = Join-Path $projectRoot 'scripts\start-next-task.ps1'
$hookLogPath = Join-Path $env:TEMP 'cline-task-complete-hook.log'

function Write-HookLog {
    param([Parameter(Mandatory = $true)][string]$Message)

    $entry = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'), $Message
    for ($attempt = 1; $attempt -le 10; $attempt++) {
        try {
            Add-Content -LiteralPath $hookLogPath -Value $entry -Encoding UTF8
            return
        }
        catch {
            if ($attempt -eq 10) { throw }
            Start-Sleep -Milliseconds (25 * $attempt)
        }
    }
}

if (-not (Test-Path -LiteralPath $launcherPath -PathType Leaf)) {
    throw "Frontend task launcher not found: $launcherPath"
}

try {
    $decisionJson = @(& $launcherPath -LaunchDecision 2>&1)
    $decision = ($decisionJson -join "`n") | ConvertFrom-Json
}
catch {
    Write-HookLog "Frontend task preflight failed: $($_.Exception.Message)"
    throw
}

if ($decision.action -eq 'user_action') {
    Write-HookLog "Frontend lifecycle paused for user review. $($decision.message -replace "`r?`n", ' | ')"
    Write-Output '{"cancel":false}'
    return
}
if ($decision.action -ne 'dispatch') {
    throw "Unsupported frontend launcher decision '$($decision.action)'."
}

if (-not ('TaskCompleteWindowNative' -as [type])) {
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
        [void][TaskCompleteWindowNative]::GetWindowThreadProcessId($windowHandle, [ref]$processId)
        if ($processId -ne 0) {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($null -ne $process -and $process.ProcessName -eq 'Code') {
                return $windowHandle.ToInt64()
            }
        }
    }

    $visibleHandles = [System.Collections.Generic.List[long]]::new()
    $callback = [TaskCompleteWindowNative+EnumWindowsProc]{
        param([IntPtr]$CandidateHandle, [IntPtr]$LParam)

        if ([TaskCompleteWindowNative]::IsWindowVisible($CandidateHandle)) {
            [uint32]$candidateProcessId = 0
            [void][TaskCompleteWindowNative]::GetWindowThreadProcessId($CandidateHandle, [ref]$candidateProcessId)
            $candidateProcess = Get-Process -Id $candidateProcessId -ErrorAction SilentlyContinue
            if ($null -ne $candidateProcess -and $candidateProcess.ProcessName -eq 'Code') {
                $visibleHandles.Add($CandidateHandle.ToInt64())
            }
        }
        return $true
    }

    [void][TaskCompleteWindowNative]::EnumWindows($callback, [IntPtr]::Zero)
    $uniqueHandles = @($visibleHandles | Sort-Object -Unique)
    if ($uniqueHandles.Count -eq 1) { return $uniqueHandles[0] }
    return 0
}

$oldWindowHandle = Get-ForegroundVSCodeWindowHandle
$escapedLauncherPath = $launcherPath.Replace("'", "''")
$childCommand = "Start-Sleep -Seconds 10; & '$escapedLauncherPath' -OldWindowHandle $oldWindowHandle"
$encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($childCommand))
$arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encodedCommand)

if ($env:CLINE_TASK_COMPLETE_NO_LAUNCH -ne '1') {
    Write-HookLog 'Starting the delayed launcher for the sole READY frontend prototype task.'
    Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments `
        -WorkingDirectory $projectRoot -WindowStyle Hidden
}
else {
    Write-HookLog 'Launch suppressed by CLINE_TASK_COMPLETE_NO_LAUNCH=1 after successful frontend preflight.'
}

Write-Output '{"cancel":false}'