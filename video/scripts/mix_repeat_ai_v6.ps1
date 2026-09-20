$ErrorActionPreference = 'Stop'
$videoRoot = Split-Path $PSScriptRoot -Parent
$projectRoot = Split-Path $videoRoot -Parent
$voicePath = Join-Path $projectRoot 'public/video/repeat-ai-v6/voice.wav'
$musicPath = Join-Path $projectRoot 'public/video/repeat-ai-storyboard/sunlit-walkthrough.mp3'
$mixPath = Join-Path $projectRoot 'public/video/repeat-ai-v6/mix.wav'
# Quiet continuous music bed; the voice controls gentle ducking. No SFX.
$audioGraph = '[0:a]aresample=48000,loudnorm=I=-16:TP=-2:LRA=9,asplit=2[voice][side];[1:a]atrim=0:48,asetpts=PTS-STARTPTS,aresample=48000,volume=0.14,afade=t=in:st=0:d=0.3,afade=t=out:st=46.5:d=1.5[music];[music][side]sidechaincompress=threshold=0.025:ratio=3:attack=80:release=650:makeup=1[bed];[voice][bed]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.891:level=false,atrim=duration=48[out]'
& ffmpeg -y -v error -i $voicePath -i $musicPath -filter_complex $audioGraph -map '[out]' -ar 48000 -ac 2 -c:a pcm_s16le $mixPath
if ($LASTEXITCODE -ne 0) { throw 'Audio mixing failed.' }
Write-Output $mixPath
