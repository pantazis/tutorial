param(
    [switch]$ValidateOnly,
    [switch]$LaunchDecision,
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = [IO.Path]::GetFullPath($ProjectRoot)
$statePath = Join-Path $ProjectRoot "state.json"
$currentTaskPath = Join-Path $ProjectRoot ".ai-guide\CURRENT-TASK.md"
$logPath = Join-Path $env:TEMP "cline-start-next-task.log"

function Write-LaunchLog {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    $entry = "[{0}] {1}" -f (
        Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    ), $Message

    Add-Content `
        -LiteralPath $logPath `
        -Value $entry `
        -Encoding UTF8
}

function Assert-FileExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Description not found: $Path"
    }
}

function Get-PersonalityPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$AgentId
    )

    $fileNames = @{
        requirements_architect = "01-requirements-architect.md"
        solution_architect = "02-solution-architect.md"
        frontend_ux_designer = "03-frontend-ux-designer.md"
        implementation_planner = "04-implementation-planner.md"
        guide_reviewer_compiler = "05-guide-reviewer-compiler.md"
    }

    if (-not $fileNames.ContainsKey($AgentId)) {
        throw "Unknown planning agent in state.json: $AgentId"
    }

    return Join-Path `
        (Join-Path $ProjectRoot "personalities") `
        $fileNames[$AgentId]
}

function New-Decision {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Action,

        [Parameter(Mandatory = $true)]
        [string]$Message,

        [string]$Kind = "none",

        [string]$TaskId = "none",

        [AllowNull()]
        [string]$Prompt = $null
    )

    return [pscustomobject][ordered]@{
        action  = $Action
        kind    = $Kind
        taskId  = $TaskId
        message = $Message
        prompt  = $Prompt
    }
}

function Get-ImplementationDecision {

    Assert-FileExists `
        -Path $currentTaskPath `
        -Description "Current implementation task"

    $currentTask = Get-Content `
        -LiteralPath $currentTaskPath `
        -Raw

    if (
        $currentTask -match
        '(?im)^\s*STATUS\s*:\s*APPLICATION_COMPLETE\s*$'
    ) {
        return New-Decision `
            -Action "complete" `
            -Message "CURRENT-TASK.md records application completion."
    }

    if (
        $currentTask -match
        '(?im)^\s*STATUS\s*:\s*BLOCKED\s*$'
    ) {
        return New-Decision `
            -Action "blocked" `
            -Message "CURRENT-TASK.md is blocked and must not be advanced."
    }

    $taskMatches = [regex]::Matches(
        $currentTask,
        '(?im)^\s*(?:#{1,6}\s*)?\[ \]\s+(?<id>[A-Za-z][A-Za-z0-9_-]*)\b'
    )

    if ($taskMatches.Count -ne 1) {
        throw "CURRENT-TASK.md does not contain exactly one identifiable unchecked task."
    }

    $taskId = $taskMatches[0].Groups["id"].Value

    $prompt = @"
Continue application implementation in a fresh Cline task.

Treat .clinerules\rules.md as the first policy layer. Read .ai-guide\CURRENT-TASK.md first, then only the guide headings and source files listed by that task. Implement exactly task $taskId, run every VERIFY step, and preserve uncommitted work. On success, mark the canonical task [x] with evidence, project exactly one next dependency-ready task into CURRENT-TASK.md, and update workflow state last only if such storage exists. On failure or missing authority, keep this task unchecked, record STATUS: BLOCKED with evidence and a recovery condition, and do not promote another task.
"@

    return New-Decision `
        -Action "dispatch" `
        -Kind "implementation_task" `
        -TaskId $taskId `
        -Message "Dispatch current implementation task." `
        -Prompt $prompt
}

function Get-WorkflowDecision {

    if (-not (Test-Path -LiteralPath $statePath -PathType Leaf)) {
        return Get-ImplementationDecision
    }

    try {
        $state = Get-Content `
            -LiteralPath $statePath `
            -Raw |
            ConvertFrom-Json
    }
    catch {
        throw "Workflow state is not valid JSON: $statePath. $($_.Exception.Message)"
    }

    $status = [string]$state.status

    switch ($status) {

        "awaiting_subject" {

            return New-Decision `
                -Action "wait" `
                -Message "The workflow is waiting for an actionable subject."
        }

        "blocked" {

            $reason = [string]$state.blockedReason

            if ([string]::IsNullOrWhiteSpace($reason)) {
                $reason = "No blockedReason was recorded."
            }

            return New-Decision `
                -Action "blocked" `
                -Message $reason
        }

        "application_complete" {

            return New-Decision `
                -Action "complete" `
                -Message "All planned application tasks are complete."
        }

        "planning" {

            $agentId = [string]$state.currentAgent

            if (
                [string]::IsNullOrWhiteSpace($agentId) -or
                $agentId -eq "none"
            ) {
                throw "Planning state must assign state.json.currentAgent."
            }

            $activeTeam = @($state.activeTeam)

            if ($agentId -notin $activeTeam) {
                throw "Current agent '$agentId' is not present in state.json.activeTeam."
            }

            $personalityPath = Get-PersonalityPath `
                -AgentId $agentId

            Assert-FileExists `
                -Path $personalityPath `
                -Description "Assigned personality"

            $relativePersonality = "personalities\$(Split-Path -Leaf $personalityPath)"

            $prompt = @"
Continue the state-driven planning workflow in a fresh Cline task.

Handle at most this one assigned role contribution:
- cycle: $($state.cycle)
- turn: $($state.currentTurn)
- agent: $agentId
- personality: $relativePersonality

Treat .clinerules\rules.md as the first policy layer. Follow .clinerules\00-shared-protocol.md and .clinerules\research-lifecycle.mmd exactly. Read the complete .clinerules\subject.md, state.json, research_output.md, and the assigned personality before acting. Reconcile any already-complete contribution, otherwise perform only this role's contribution. Append and validate the contribution before updating state.json last. Do not run the next role in this task.
"@

            return New-Decision `
                -Action "dispatch" `
                -Kind "planning_role" `
                -TaskId $agentId `
                -Message "Dispatch assigned planning role." `
                -Prompt $prompt
        }

        "guidance_ready" {
            return Get-ImplementationDecision
        }

        default {

            throw "Unsupported state.json status '$status'."
        }
    }
}

function Get-VSCodeCommand {

    $command = Get-Command `
        "code.cmd" `
        -ErrorAction SilentlyContinue

    if ($null -ne $command) {
        return $command.Source
    }

    $defaultCommand = Join-Path `
        $env:LOCALAPPDATA `
        "Programs\Microsoft VS Code\bin\code.cmd"

    if (
        Test-Path `
            -LiteralPath $defaultCommand `
            -PathType Leaf
    ) {
        return $defaultCommand
    }

    throw "VS Code command-line launcher not found."
}


# ============================================================
# WORKFLOW DECISION
# ============================================================

$decision = Get-WorkflowDecision


# ============================================================
# RETURN DECISION AS JSON
# ============================================================

if ($LaunchDecision) {

    $decision |
        ConvertTo-Json -Compress

    exit 0
}


# ============================================================
# VALIDATION MODE
# ============================================================

if ($ValidateOnly) {

    if ($decision.action -eq "dispatch") {
        Write-Output $decision.prompt
    }
    else {
        Write-Output "$($decision.action.ToUpperInvariant()): $($decision.message)"
    }

    exit 0
}


# ============================================================
# NO DISPATCH REQUIRED
# ============================================================

if ($decision.action -ne "dispatch") {

    Write-LaunchLog `
        "No dispatch. action=$($decision.action) message=$($decision.message)"

    exit 0
}


# ============================================================
# LAUNCH NEXT CLINE TASK
#
# IMPORTANT / UNBREAKABLE RULE:
#
# - NEVER close an existing VS Code window.
# - NEVER terminate an existing VS Code process.
# - NEVER send WM_CLOSE to an existing window.
# - NEVER use Stop-Process or taskkill here.
# - NEVER reuse OldWindowHandle closing logic.
#
# The current VS Code window MUST remain open.
# The next Cline task is launched in a NEW VS Code window.
# ============================================================

$encodedPrompt = [Uri]::EscapeDataString(
    $decision.prompt
)

$uri = "vscode://saoudrizwan.claude-dev/task?prompt=$encodedPrompt"

$vscodeCommand = Get-VSCodeCommand

Write-LaunchLog `
    "Dispatching kind=$($decision.kind) id=$($decision.taskId). Existing VS Code windows will remain open."


# ============================================================
# OPEN NEW VS CODE WINDOW
# ============================================================

$output = @(
    & $vscodeCommand `
        --new-window `
        $ProjectRoot `
        --open-url `
        -- `
        $uri `
        2>&1
)


# ============================================================
# CHECK LAUNCH RESULT
# ============================================================

if ($LASTEXITCODE -ne 0) {

    throw "VS Code task dispatch exited with code $LASTEXITCODE. Output: $($output -join ' ')"
}


# ============================================================
# SUCCESS
#
# DO NOT add window-closing logic after this point.
# The previous VS Code window intentionally stays open.
# ============================================================

Write-LaunchLog `
    "Next Cline task launched successfully. Previous VS Code window remains open."

exit 0