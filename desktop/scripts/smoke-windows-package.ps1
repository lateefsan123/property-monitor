$ErrorActionPreference = 'Stop'

$releaseDir = Resolve-Path (Join-Path $PSScriptRoot '..\release')
$executable = Join-Path $releaseDir 'win-unpacked\Repeat AI.exe'
$workingDirectory = Split-Path -Parent $executable

if (-not (Test-Path -LiteralPath $executable)) {
  throw "Packaged desktop executable is missing: $executable"
}

$process = Start-Process `
  -FilePath $executable `
  -WorkingDirectory $workingDirectory `
  -WindowStyle Hidden `
  -PassThru

try {
  Start-Sleep -Seconds 8
  $process.Refresh()

  if ($process.HasExited) {
    $logPath = Join-Path $env:APPDATA 'repeat-ai\desktop.log'
    $debugOutput = if (Test-Path -LiteralPath $logPath) {
      Get-Content -Raw -LiteralPath $logPath
    } else {
      'No Repeat AI desktop log was created.'
    }

    throw "Packaged desktop app exited during startup with code $($process.ExitCode).`n$debugOutput"
  }

  Write-Host "Packaged Repeat AI stayed running for the startup smoke window. PID: $($process.Id)"
} finally {
  if (-not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  }
}
