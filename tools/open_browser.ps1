param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Profile,
    [string]$Browser = "",
    [int]$TimeoutSec = 40
)

$ErrorActionPreference = "Stop"

$uri = [Uri]$Url
$deadline = (Get-Date).AddSeconds($TimeoutSec)
$ready = $false
while ((Get-Date) -lt $deadline) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect("127.0.0.1", $uri.Port)
        $ready = $true
        break
    } catch {
        Start-Sleep -Milliseconds 300
    } finally {
        $client.Close()
    }
}
if (-not $ready) {
    exit 2
}

if (-not $Browser -or -not (Test-Path -LiteralPath $Browser)) {
    $candidates = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
            $Browser = $candidate
            break
        }
    }
}

if (-not $Browser -or -not (Test-Path -LiteralPath $Browser)) {
    exit 1
}

New-Item -ItemType Directory -Force -Path $Profile | Out-Null

# Start-Process detaches the browser from this helper process. A plain
# subprocess.Popen from Python is killed by the launcher's job object before
# Chrome can create its window.
$profileArgument = '--user-data-dir="' + $Profile + '"'
Start-Process -FilePath $Browser -ArgumentList @(
    $profileArgument,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-crash-restore-bubble",
    "--new-window",
    $Url
)
exit 0
