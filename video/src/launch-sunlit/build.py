"""Retain the original launch film's picture with the checked female read and Sunlit music."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'video/review/launch-sunlit'
OUT.mkdir(parents=True, exist_ok=True)
OLD = ROOT / 'video/review/launch/repeat-ai-launch.mp4'
VOICE = ROOT / 'video/assets/launch-refined/public/voice.wav'
MUSIC = ROOT / 'public/video/repeat-ai-storyboard/sunlit-walkthrough.mp3'
OLD_EDIT = json.loads((ROOT / 'video/src/launch/timeline.json').read_text(encoding='utf-8'))
NEW_EDIT = json.loads((ROOT / 'video/src/launch-refined/timeline.json').read_text(encoding='utf-8'))
FRAMES = NEW_EDIT['frames']
assert [s['id'] for s in OLD_EDIT['scenes']] == [s['id'] for s in NEW_EDIT['scenes']]

def run(args):
    subprocess.run(args, check=True)

def report(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stderr

def loudnorm_values(stderr):
    match = re.search(r'\{\s*"input_i".*?\}', stderr, flags=re.S)
    if not match:
        raise RuntimeError('FFmpeg did not report loudness values')
    return json.loads(match.group())

def picture():
    target = OUT / 'picture.mp4'
    pieces = []
    for index, (old, new) in enumerate(zip(OLD_EDIT['scenes'], NEW_EDIT['scenes'])):
        rate = new['frames'] / old['frames']
        pieces.append(
            f"[0:v]trim=start_frame={old['fromFrame']}:end_frame={old['fromFrame']+old['frames']},"
            f"setpts=(PTS-STARTPTS)*{rate:.12f},fps=30:round=near,"
            f"tpad=stop_mode=clone:stop_duration=1,trim=end_frame={new['frames']},"
            f"setpts=N/(30*TB),setsar=1[v{index}]"
        )
    labels = ''.join(f'[v{i}]' for i in range(len(pieces)))
    filt = ';'.join(pieces) + f';{labels}concat=n={len(pieces)}:v=1:a=0[out]'
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(OLD),
         '-filter_complex', filt, '-map', '[out]', '-an', '-c:v', 'libx264',
         '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
         '-r', '30', '-movflags', '+faststart', str(target)])
    return target

def soundtrack():
    premix = OUT / 'premix.wav'
    duration = FRAMES / 30
    # Sunlit Walkthrough is a project-owned 110 s track. Keep music below speech,
    # with gentle ducking and a clean tail; preserve every prepared voice sample.
    filt = (
        f'[0:a]aresample=48000,atrim=duration={duration:.9f},asetpts=PTS-STARTPTS[v];'
        f'[1:a]aresample=48000,atrim=duration={duration:.9f},asetpts=PTS-STARTPTS,'
        f'volume=0.16,afade=t=in:st=0:d=0.8,'
        f'afade=t=out:st={duration-2.4:.3f}:d=2.4[m];'
        '[v]asplit=2[sidechain][spoken];'
        '[m][sidechain]sidechaincompress=threshold=0.012:ratio=4:attack=30:release=350[duck];'
        '[spoken][duck]amix=inputs=2:duration=first:normalize=0[a]'
    )
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(VOICE),
         '-i', str(MUSIC), '-filter_complex', filt, '-map', '[a]', '-ar', '48000',
         '-c:a', 'pcm_s24le', str(premix)])
    measured = loudnorm_values(report(['ffmpeg', '-hide_banner', '-nostats',
        '-i', str(premix), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json',
        '-f', 'null', 'NUL']))
    normalise = (
        f"loudnorm=I=-16:TP=-1.5:LRA=9:measured_I={measured['input_i']}:"
        f"measured_TP={measured['input_tp']}:measured_LRA={measured['input_lra']}:"
        f"measured_thresh={measured['input_thresh']}:offset={measured['target_offset']}:"
        'linear=true'
    )
    mix = OUT / 'mix.wav'
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(premix),
         '-af', normalise, '-ar', '48000', '-c:a', 'pcm_s24le', str(mix)])
    (OUT / 'mix-analysis.json').write_text(json.dumps(measured, indent=2), encoding='utf-8')
    return mix

def finish(picture_file, mix):
    movie = OUT / 'repeat-ai-launch-sunlit.mp4'
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(picture_file),
         '-i', str(mix), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
         '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart',
         '-metadata', 'title=Repeat AI - Sunlit launch', str(movie)])
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error',
        '-show_streams', '-show_format', '-of', 'json', str(movie)]))
    video = next(stream for stream in probe['streams'] if stream['codec_type'] == 'video')
    assert (int(video['nb_frames']), video['width'], video['height']) == (FRAMES, 1920, 1080)
    assert abs(float(probe['format']['duration']) - FRAMES / 30) < .08
    run(['ffmpeg', '-v', 'error', '-i', str(movie), '-f', 'null', 'NUL'])
    check = report(['ffmpeg', '-hide_banner', '-nostats', '-i', str(movie),
        '-vf', 'blackdetect=d=0.08:pix_th=0.04',
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json', '-f', 'null', 'NUL'])
    assert 'black_start:' not in check, 'Unexpected black picture interval'
    levels = loudnorm_values(check)
    assert -18 < float(levels['input_i']) < -14, levels
    assert float(levels['input_tp']) <= -.9, levels
    subtitles = OUT / 'repeat-ai-launch-sunlit.srt'
    shutil.copy2(ROOT / 'video/review/launch-refined/repeat-ai-refined.srt', subtitles)
    qa = {
        'sourcePicture': str(OLD.relative_to(ROOT)),
        'narration': str(VOICE.relative_to(ROOT)),
        'music': str(MUSIC.relative_to(ROOT)),
        'frames': FRAMES, 'duration': float(probe['format']['duration']),
        'resolution': '1920x1080', 'fps': 30, 'fullDecode': 'pass',
        'blackGaps': 'none', 'audio': levels, 'bytes': movie.stat().st_size,
        'sha256': hashlib.sha256(movie.read_bytes()).hexdigest(),
    }
    (OUT / 'delivery-qa.json').write_text(json.dumps(qa, indent=2), encoding='utf-8')
    print(json.dumps(qa, indent=2))

if __name__ == '__main__':
    finish(picture(), soundtrack())
