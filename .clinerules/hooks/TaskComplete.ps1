$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# ============================================================
# CONTROL
# Set to $true to pause automatic continuation.
# Set to $false to dispatch the next state.json-assigned task.
# ============================================================
$stopExecution = $true

if ($stopExecution) {
    Write-Output '{"cancel":false}'
    return
}

$projectRoot = Split-Path -Parent (
    Split-Path -Parent $PSScriptRoot
)
$scriptPath = Join-Path $projectRoot "script\start-next-task.ps1"
$hookLogPath = Join-Path $env:TEMP "cline-task-complete-hook.log"

if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "External script not found: $scriptPath"
}

function Write-HookLog {
    param([Parameter(Mandatory = $true)][string]$Message)

    $entry = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"), $Message
    Add-Content -LiteralPath $hookLogPath -Value $entry -Encoding UTF8
}

try {
    $decisionJson = & $scriptPath -LaunchDecision
    $decision = ($decisionJson -join "`n") | ConvertFrom-Json
}
catch {
    Write-HookLog "Preflight failed: $($_.Exception.Message)"
    throw
}

if ($decision.action -in @("wait", "blocked", "complete")) {
    Write-HookLog "No task launched. action=$($decision.action) message=$($decision.message)"
    Write-Output '{"cancel":false}'
    return
}

if ($decision.action -ne "dispatch") {
    throw "Unsupported launcher decision '$($decision.action)'."
}

$delaySeconds = 10

$escapedScriptPath = $scriptPath.Replace("'", "''")

$childCommand = `
    "Start-Sleep -Seconds $delaySeconds; " +
    "& '$escapedScriptPath'"

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
    Write-HookLog "Dispatching next task. kind=$($decision.kind) id=$($decision.taskId)"
    Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList $arguments `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden
}
else {
    Write-HookLog "Launch suppressed by CLINE_TASK_COMPLETE_NO_LAUNCH=1. kind=$($decision.kind) id=$($decision.taskId)"
}

Write-Output '{"cancel":false}'
