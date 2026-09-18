param(
    [long]$OldWindowHandle = 0,
    [switch]$ValidateOnly,
    [switch]$LaunchDecision
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $projectRoot "state.json"
$subjectPath = Join-Path $projectRoot ".clinerules\subject.md"
$planningLogPath = Join-Path $projectRoot "research_output.md"
$sharedProtocolPath = Join-Path $projectRoot ".clinerules\00-shared-protocol.md"
$lifecyclePath = Join-Path $projectRoot ".clinerules\research-lifecycle.mmd"
$personalityRoot = Join-Path $projectRoot "personalities"
$currentTaskPath = Join-Path $projectRoot ".ai-guide\CURRENT-TASK.md"
$frontendCurrentTaskPath = Join-Path $projectRoot ".frontend-guide\CURRENT-TASK.md"
$frontendExporterPath = Join-Path $projectRoot "scripts\export-frontend-guide.ps1"
$frontendValidatorPath = Join-Path $projectRoot "scripts\validate-frontend-guide.ps1"
$guideExporterPath = Join-Path $projectRoot "scripts\export-ai-guide.ps1"
$guideValidatorPath = Join-Path $projectRoot "scripts\validate-ai-guide.ps1"
$logPath = Join-Path $env:TEMP "cline-start-next-task.log"
$legacyClineTasksPath = Join-Path $env:APPDATA "Code\User\globalStorage\saoudrizwan.claude-dev\tasks"
$vscodeLogsPath = Join-Path $env:APPDATA "Code\logs"

function Write-LaunchLog {
    param([Parameter(Mandatory = $true)][string]$Message)

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    $entry = "[$timestamp] $Message"

    for ($attempt = 1; $attempt -le 10; $attempt++) {
        try {
            Add-Content -LiteralPath $logPath -Value $entry -Encoding UTF8
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

function Assert-FileExists {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Description
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Description not found: $Path"
    }
}

function Get-PersonalityPath {
    param([Parameter(Mandatory = $true)][string]$AgentId)

    $agentFileNames = @{
        "requirements_architect" = "01-requirements-architect.md"
        "system_architect" = "02-system-architect.md"
        "data_api_architect" = "03-data-api-architect.md"
        "frontend_design_system_engineer" = "04-frontend-design-system-engineer.md"
        "page_ux_composer" = "05-page-ux-composer.md"
        "frontend_prototype_content_curator" = "06-frontend-prototype-content-curator.md"
        "frontend_prototype_implementation_planner" = "14-frontend-prototype-implementation-planner.md"
        "frontend_guide_compiler" = "13-frontend-guide-compiler.md"
        "trading_quant_specialist" = "06-trading-quant-specialist.md"
        "testing_validation_specialist" = "07-testing-validation-specialist.md"
        "devops_specialist" = "08-devops-specialist.md"
        "security_auth_specialist" = "09-security-auth-specialist.md"
        "implementation_planner" = "10-implementation-planner.md"
        "cline_context_engineer" = "11-cline-context-engineer.md"
        "final_reviewer_guide_compiler" = "12-final-reviewer-guide-compiler.md"
    }

    if (-not $agentFileNames.ContainsKey($AgentId)) {
        throw "Unknown planning agent in state.json: $AgentId"
    }

    return Join-Path $personalityRoot $agentFileNames[$AgentId]
}

function Get-CompleteContribution {
    param(
        [Parameter(Mandatory = $true)][string]$Log,
        [Parameter(Mandatory = $true)][int]$Cycle,
        [Parameter(Mandatory = $true)][int]$Turn,
        [Parameter(Mandatory = $true)][string]$AgentId
    )

    $pattern = '(?ms)^={50}\r?\nCYCLE:\s*' + [regex]::Escape([string]$Cycle) +
        '\r?\nTURN:\s*' + [regex]::Escape([string]$Turn) +
        '\r?\nAGENT:\s*' + [regex]::Escape($AgentId) +
        '\s*\r?\n.*?^STATUS:\s*COMPLETE\s*$\r?\nNEXT_AGENT:\s*(?<next>[a-z_]+|none)\s*$\r?\n={50}'
    $matches = [regex]::Matches($Log, $pattern)

    if ($matches.Count -gt 1) {
        throw "Duplicate complete contributions found for cycle $Cycle, turn $Turn, agent $AgentId."
    }

    if ($matches.Count -eq 1) {
        return $matches[0]
    }

    return $null
}

function Invoke-PendingLifecycleExport {
    if (-not (Test-Path -LiteralPath $statePath -PathType Leaf)) {
        return
    }

    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    if ($state.status -ne 'active' -or $state.currentAgent -notin @(
        'frontend_guide_compiler',
        'final_reviewer_guide_compiler'
    )) {
        return
    }

    Assert-FileExists -Path $planningLogPath -Description "Planning log"
    $log = Get-Content -LiteralPath $planningLogPath -Raw
    $contribution = Get-CompleteContribution `
        -Log $log `
        -Cycle ([int]$state.cycle) `
        -Turn ([int]$state.currentTurn) `
        -AgentId ([string]$state.currentAgent)

    if ($null -eq $contribution) {
        return
    }

    if ($contribution.Groups['next'].Value -ne 'none') {
        throw "Persisted compiler contribution for '$($state.currentAgent)' must hand off to none."
    }

    if ($state.currentAgent -eq 'frontend_guide_compiler') {
        Assert-FileExists -Path $frontendExporterPath -Description "Frontend guide exporter"
        Write-LaunchLog "Recovering persisted frontend compiler transaction through the canonical exporter."
        $exportOutput = @(& $frontendExporterPath -ProjectRoot $projectRoot -RequireExportContract 2>&1)
        Write-LaunchLog "Frontend exporter completed: $($exportOutput -join ' ')"
        return
    }

    Assert-FileExists -Path $guideExporterPath -Description "AI guide exporter"
    Write-LaunchLog "Recovering persisted final compiler transaction through the canonical exporter."
    $exportOutput = @(& $guideExporterPath -ProjectRoot $projectRoot -RequireExportContract 2>&1)
    Write-LaunchLog "AI guide exporter completed: $($exportOutput -join ' ')"
}

function Get-NextTaskPrompt {
    Assert-FileExists -Path $statePath -Description "Workflow state"

    try {
        $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    }
    catch {
        throw "Workflow state is not valid JSON: $statePath. $($_.Exception.Message)"
    }

    if ($state.status -eq "active") {
        foreach ($requiredPath in @(
            $subjectPath,
            $planningLogPath,
            $sharedProtocolPath,
            $lifecyclePath
        )) {
            Assert-FileExists -Path $requiredPath -Description "Required planning workflow file"
        }

        if ([string]::IsNullOrWhiteSpace([string]$state.currentAgent)) {
            throw "Active workflow state does not define currentAgent: $statePath"
        }

        $activeTeam = @($state.activeTeam)
        if ($state.currentAgent -notin $activeTeam) {
            throw "Current agent '$($state.currentAgent)' is not present in state.json.activeTeam."
        }

        $personalityPath = Get-PersonalityPath -AgentId $state.currentAgent
        Assert-FileExists -Path $personalityPath -Description "Current agent personality"

        $relativePersonalityPath = Join-Path `
            "personalities" `
            (Split-Path -Leaf $personalityPath)

        return @"
Continue the state-driven planning workflow in a fresh Cline task.

The persisted workflow state assigns exactly one contribution:
- cycle: $($state.cycle)
- turn: $($state.currentTurn)
- agent: $($state.currentAgent)
- personality: $relativePersonalityPath

Follow .clinerules\00-shared-protocol.md exactly. Before acting, read the complete .clinerules\subject.md, research_output.md, state.json, .clinerules\research-lifecycle.mmd, and the assigned personality file. Reconcile persisted state with the latest complete contribution, perform at most this one role contribution, preserve the append-only log, validate persisted content and the exact handoff, and update state.json last. Do not run another role in this task.
"@
    }

    if ($state.status -eq "guidance_ready") {
        Assert-FileExists -Path $currentTaskPath -Description "Current implementation task"
        Assert-FileExists -Path $guideValidatorPath -Description "AI guide validator"
        $validationOutput = @(& $guideValidatorPath -ProjectRoot $projectRoot 2>&1)
        Write-LaunchLog "AI guide implementation preflight completed: $($validationOutput -join ' ')"
        $currentTask = Get-Content -LiteralPath $currentTaskPath -Raw

        if ($currentTask -match '(?im)^\s*STATUS\s*:\s*APPLICATION_COMPLETE\s*$') {
            return $null
        }

        return @"
Continue application implementation in a fresh Cline task using the compiled guidance package.

Read .ai-guide\CURRENT-TASK.md first. Then read only the guide headings and source files referenced by that task. Implement exactly that one [ ] task, preserve existing work, and run its listed verification. Change its canonical checkbox to [x] only when DONE_WHEN is verified, set STATUS: COMPLETE with evidence in .ai-guide\IMPLEMENTATION-PLAN.md, mark the next dependency-ready [ ] task READY, and replace .ai-guide\CURRENT-TASK.md for the next fresh bot exactly as required by .ai-guide\EXECUTION-CHECKLIST.md. If blocked, keep the same task [ ], record the blocker, and do not skip dependencies.
"@
    }

    if ($state.status -eq "awaiting_user_frontend_prototype") {
        $guidePath = if ($null -ne $state.PSObject.Properties['frontendGuidePath']) { [string]$state.frontendGuidePath } else { Join-Path $projectRoot '.frontend-guide' }
        Assert-FileExists -Path (Join-Path $guidePath 'USER-HANDOFF.md') -Description "Frontend user handoff"
        Assert-FileExists -Path $frontendCurrentTaskPath -Description "Current frontend prototype task"
        Assert-FileExists -Path $frontendValidatorPath -Description "Frontend guide validator"
        $validationOutput = @(& $frontendValidatorPath -ProjectRoot $projectRoot -GuideRoot $guidePath 2>&1)
        Write-LaunchLog "Frontend guide task preflight completed: $($validationOutput -join ' ')"
        $frontendCurrentTask = Get-Content -LiteralPath $frontendCurrentTaskPath -Raw
        if ($frontendCurrentTask -match '(?im)^\s*STATUS\s*:\s*PROTOTYPE_IMPLEMENTATION_COMPLETE\s*$') {
            return @"
USER_ACTION_REQUIRED: REVIEW_AND_DECIDE_STATIC_HTML_PROTOTYPE

All planned static-prototype implementation tasks are complete. No LLM task will be launched. Inspect the prototype against:
$guidePath

When the prototype is acceptable, continue with its existing path:
powershell -ExecutionPolicy Bypass -File .\scripts\record-frontend-decision.ps1 -Decision CONTINUE -PrototypePath "<absolute-or-relative-path>" -Notes "Reviewed against the frontend acceptance checklist."

Request a revision:
powershell -ExecutionPolicy Bypass -File .\scripts\record-frontend-decision.ps1 -Decision REVISION_REQUIRED -ResponsibleArea <REQUIREMENTS|ARCHITECTURE|DESIGN_SYSTEM|PAGE_UX|CONTENT_MEDIA|IMPLEMENTATION_PLAN> -Notes "<required explanation>"
"@
        }
        return @"
USER_ACTION_REQUIRED: BUILD_CURRENT_STATIC_HTML_PROTOTYPE_TASK

No LLM task will be launched. Build exactly the task projected in:
$frontendCurrentTaskPath

Use the static-only contract in:
$guidePath

After the task's VERIFY and DONE_WHEN are satisfied, record evidence and advance one task:
powershell -ExecutionPolicy Bypass -File .\scripts\complete-frontend-task.ps1 -Evidence "<verification evidence>" -PrototypePath "<absolute-or-relative-prototype-path>"

Request a revision:
powershell -ExecutionPolicy Bypass -File .\scripts\record-frontend-decision.ps1 -Decision REVISION_REQUIRED -ResponsibleArea <REQUIREMENTS|ARCHITECTURE|DESIGN_SYSTEM|PAGE_UX|CONTENT_MEDIA|IMPLEMENTATION_PLAN> -Notes "<required explanation>"
"@
    }

    throw "Unsupported workflow status '$($state.status)' in $statePath. Expected 'active', 'awaiting_user_frontend_prototype', or 'guidance_ready'."
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
            Get-ChildItem -LiteralPath $vscodeLogsPath -Recurse -File -Filter "*-Cline.log" -ErrorAction SilentlyContinue |
                Where-Object { $_.LastWriteTime -ge (Get-Date).AddDays(-1) }
        )

        foreach ($clineLog in $clineLogs) {
            $matches = Select-String `
                -LiteralPath $clineLog.FullName `
                -Pattern 'Task initialized:\s+(?<taskId>\S+)' `
                -AllMatches `
                -ErrorAction SilentlyContinue

            foreach ($match in $matches.Matches) {
                $taskIds += $match.Groups["taskId"].Value
            }
        }
    }

    return @($taskIds | Sort-Object -Unique)
}

function Get-VSCodeCommand {
    $command = Get-Command "code.cmd" -ErrorAction SilentlyContinue
    if ($null -ne $command) {
        return $command.Source
    }

    $defaultCommand = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\bin\code.cmd"
    if (Test-Path -LiteralPath $defaultCommand -PathType Leaf) {
        return $defaultCommand
    }

    throw "VS Code command-line launcher not found. Expected code.cmd on PATH or at: $defaultCommand"
}

if (-not ("ClineLauncherWindowNative" -as [type])) {
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
        param([IntPtr]$windowHandle, [IntPtr]$lParam)

        if (-not [ClineLauncherWindowNative]::IsWindowVisible($windowHandle)) {
            return $true
        }

        [uint32]$processId = 0
        [void][ClineLauncherWindowNative]::GetWindowThreadProcessId($windowHandle, [ref]$processId)
        if ($processId -eq 0) {
            return $true
        }

        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($null -ne $process -and $process.ProcessName -eq "Code") {
            $handles.Add($windowHandle.ToInt64())
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
        Write-LaunchLog "WARNING Old VS Code window handle was unavailable; leaving existing windows open."
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

    $wmClose = 0x0010
    if ([ClineLauncherWindowNative]::PostMessage(
        [IntPtr]$WindowHandle,
        $wmClose,
        [IntPtr]::Zero,
        [IntPtr]::Zero
    )) {
        Write-LaunchLog "Requested graceful close of old VS Code window: $WindowHandle"
    }
    else {
        Write-LaunchLog "WARNING Failed to request close of old VS Code window: $WindowHandle"
    }
}

Write-LaunchLog "Launcher started. projectRoot=$projectRoot oldWindowHandle=$OldWindowHandle"

Invoke-PendingLifecycleExport
$prompt = Get-NextTaskPrompt

if ($null -eq $prompt) {
    Write-LaunchLog "Application complete; CURRENT-TASK.md has terminal status."
    if ($LaunchDecision) {
        Write-Output ([ordered]@{
            action = 'complete'
            message = 'Application complete.'
        } | ConvertTo-Json -Compress)
        exit 0
    }
    Write-Host "Application complete."
    exit 0
}

Write-LaunchLog "Validated next task prompt from workflow state."

if ($ValidateOnly) {
    Write-Output $prompt
    exit 0
}

if ($prompt -match '(?m)^USER_ACTION_REQUIRED:\s*(?:BUILD_REVIEW_AND_CONTINUE_STATIC_HTML_PROTOTYPE|BUILD_CURRENT_STATIC_HTML_PROTOTYPE_TASK|REVIEW_AND_DECIDE_STATIC_HTML_PROTOTYPE)\s*$') {
    Write-LaunchLog "Workflow is waiting for the user-built frontend prototype; no LLM task was dispatched."
    if ($LaunchDecision) {
        Write-Output ([ordered]@{
            action = 'user_action'
            message = $prompt
        } | ConvertTo-Json -Compress)
        exit 0
    }
    Write-Host $prompt
    exit 0
}

if ($LaunchDecision) {
    Write-Output ([ordered]@{
        action = 'dispatch'
        message = 'A fresh Cline task is required.'
    } | ConvertTo-Json -Compress)
    exit 0
}

$encoded = [System.Uri]::EscapeDataString($prompt)
$uri = "vscode://saoudrizwan.claude-dev/task?prompt=$encoded"
$vscodeCommand = Get-VSCodeCommand

$initialTaskIds = @(Get-ClineTaskIds)
$initialWindowHandles = @(Get-VSCodeWindowHandles)
$maximumAttempts = 6
$waitAfterLaunchSeconds = 10
$dispatchSucceeded = $false

for ($attempt = 1; $attempt -le $maximumAttempts; $attempt++) {
    if (-not $dispatchSucceeded) {
        try {
            Write-LaunchLog "Attempt $attempt/${maximumAttempts}: opening project and Cline task URI in a new VS Code window."
            $dispatchOutput = @(& $vscodeCommand --new-window $projectRoot --open-url -- $uri 2>&1)
            if ($LASTEXITCODE -ne 0) {
                throw "VS Code URI dispatch exited with code $LASTEXITCODE. Output: $($dispatchOutput -join ' ')"
            }
            $dispatchSucceeded = $true
            Write-LaunchLog "Attempt ${attempt}: VS Code accepted the URI dispatch; later attempts will verify without opening additional windows."
        }
        catch {
            Write-LaunchLog "Attempt ${attempt} ERROR: $($_.Exception.Message)"
        }
    }

    Start-Sleep -Seconds $waitAfterLaunchSeconds

    $currentTaskIds = @(Get-ClineTaskIds)
    $newTaskIds = @($currentTaskIds | Where-Object { $_ -notin $initialTaskIds })
    $currentWindowHandles = @(Get-VSCodeWindowHandles)
    $newWindowHandles = @($currentWindowHandles | Where-Object { $_ -notin $initialWindowHandles })
    # Cline 4.x's SDK bundle no longer writes the legacy "Task initialized"
    # marker or task directory immediately, so requiring both signals causes a
    # false failure after VS Code has already accepted the task URI. Either a
    # new VS Code window or a newly persisted Cline task is a valid success
    # signal; only close the old window when a distinct new handle is known.
    if ($newWindowHandles.Count -gt 0) {
        if ($newTaskIds.Count -gt 0) {
            Write-LaunchLog "SUCCESS New VS Code window and Cline task detected. taskIds=$($newTaskIds -join ', ') windowHandles=$($newWindowHandles -join ', ')"
        }
        else {
            Write-LaunchLog "SUCCESS New VS Code window detected after accepted Cline task URI. Cline SDK task persistence is not yet externally visible. windowHandles=$($newWindowHandles -join ', ')"
        }

        Close-OldVSCodeWindow `
            -WindowHandle $OldWindowHandle `
            -InitialWindowHandles $initialWindowHandles `
            -NewWindowHandles $newWindowHandles
        exit 0
    }

    if ($newTaskIds.Count -gt 0) {
        # A newly persisted Cline task is a compatible success signal even when
        # VS Code reuses an existing window or Windows does not expose the new
        # top-level handle. Do not keep retrying: that delay makes a successful
        # launch look stalled and can encourage duplicate manual launches.
        Write-LaunchLog "SUCCESS New Cline task detected without a safely identifiable new VS Code window. Leaving all existing windows open. taskIds=$($newTaskIds -join ', ')"
        exit 0
    }

    Write-LaunchLog "Verification $attempt/${maximumAttempts} did not detect a new VS Code window or Cline task yet; the old window remains open."
}

$dispatchAcceptedWithoutNewWindow = $dispatchSucceeded
if ($dispatchAcceptedWithoutNewWindow) {
    Write-LaunchLog "SUCCESS VS Code accepted the Cline task URI, but reused an existing window or did not expose a new window handle. Leaving all existing windows open so the dispatched task can continue the workflow."
    exit 0
}

$message = "New VS Code window for the Cline task was not detected after $maximumAttempts attempts. See $logPath"
Write-LaunchLog "FAILED $message"
throw $message