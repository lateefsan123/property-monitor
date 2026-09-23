"""Audio-only Sunlit edition of the existing 2:57 product walkthrough."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'video/review/polished/repeat-ai-explainer-polished.mp4'
VOICE = ROOT / 'video/assets/accurate/public/workflow/polished/voice.wav'
SONG = ROOT / 'public/video/repeat-ai-storyboard/sunlit-walkthrough.mp3'
OUT = ROOT / 'video/review/polished-sunlit'
OUT.mkdir(parents=True, exist_ok=True)
DURATION = 177.2
FRAMES = 5316

def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)

def loudness(stderr):
    found = re.search(r'\{\s*"input_i".*?\}', stderr, re.S)
    if not found:
        raise RuntimeError('Expected FFmpeg loudness report')
    return json.loads(found.group())

def make_mix():
    premix = OUT / 'premix.wav'
    # Two copies crossfade for a smooth 2:57 bed from the 1:50 source track.
    # The voice stem is continuous: no narration samples are cut or shifted.
    graph = (
        '[1:a]aresample=48000,asplit=2[song1][song2];'
        '[song1]atrim=duration=110,asetpts=PTS-STARTPTS[m1];'
        '[song2]atrim=duration=70.2,asetpts=PTS-STARTPTS[m2];'
        '[m1][m2]acrossfade=d=3:c1=tri:c2=tri,atrim=duration=177.2,'
        'volume=0.12,afade=t=in:st=0:d=1,afade=t=out:st=174.2:d=3[music];'
        '[0:a]aresample=48000,atrim=duration=177.2,asetpts=PTS-STARTPTS,'
        'highpass=f=75,equalizer=f=2900:t=q:w=1.2:g=1.5,'
        'acompressor=threshold=0.15:ratio=1.8:attack=8:release=150[voice];'
        '[voice]asplit=2[sidechain][spoken];'
        '[music][sidechain]sidechaincompress=threshold=0.012:ratio=4:attack=30:release=350[duck];'
        '[spoken][duck]amix=inputs=2:duration=first:normalize=0[a]'
    )
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(VOICE),
         '-i', str(SONG), '-filter_complex', graph, '-map', '[a]', '-ar', '48000',
         '-c:a', 'pcm_s24le', str(premix)])
    measured = loudness(run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(premix),
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json', '-f', 'null', 'NUL']).stderr)
    normalise = (
        f"loudnorm=I=-16:TP=-1.5:LRA=8:measured_I={measured['input_i']}:"
        f"measured_TP={measured['input_tp']}:measured_LRA={measured['input_lra']}:"
        f"measured_thresh={measured['input_thresh']}:offset={measured['target_offset']}:"
        'linear=true'
    )
    mix = OUT / 'mix.wav'
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(premix),
         '-af', normalise, '-ar', '48000', '-c:a', 'pcm_s24le', str(mix)])
    return mix, measured

def deliver(mix, measured):
    movie = OUT / 'repeat-ai-explainer-sunlit.mp4'
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(SOURCE),
         '-i', str(mix), '-map', '0:v:0', '-map', '1:a:0', '-map', '0:s?',
         '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-c:s', 'copy',
         '-map_metadata', '-1', '-metadata', 'title=Repeat AI - Product walkthrough',
         '-metadata', 'artist=Repeat AI',
         '-metadata', 'comment=Music: Sunlit Walkthrough by lateefsanusifgc',
         '-movflags', '+faststart', str(movie)])
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error',
        '-show_streams', '-show_format', '-of', 'json', str(movie)]))
    video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    assert (int(video['nb_frames']), video['width'], video['height']) == (FRAMES, 1920, 1080)
    assert abs(float(probe['format']['duration']) - DURATION) < .08
    run(['ffmpeg', '-v', 'error', '-i', str(movie), '-f', 'null', 'NUL'])
    check = run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(movie),
        '-vf', 'blackdetect=d=0.1:pix_th=0.04',
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json', '-f', 'null', 'NUL']).stderr
    assert 'black_start:' not in check
    levels = loudness(check)
    assert -18 < float(levels['input_i']) < -14
    assert float(levels['input_tp']) <= -.9
    def video_hash(path):
        output = run(['ffmpeg', '-v', 'error', '-i', str(path), '-map', '0:v:0',
            '-c:v', 'copy', '-f', 'md5', '-'])
        return output.stdout.strip()
    source_video_hash = video_hash(SOURCE)
    assert source_video_hash == video_hash(movie), 'The picture changed'
    qa = {'sourceVideo': str(SOURCE.relative_to(ROOT)),
          'music': str(SONG.relative_to(ROOT)),
          'voice': str(VOICE.relative_to(ROOT)),
          'duration': float(probe['format']['duration']), 'frames': FRAMES,
          'resolution': '1920x1080', 'pictureHash': source_video_hash,
          'pictureUnchanged': True, 'fullDecode': 'pass', 'blackGaps': 'none',
          'audio': levels, 'mixAnalysis': measured,
          'bytes': movie.stat().st_size,
          'sha256': hashlib.sha256(movie.read_bytes()).hexdigest()}
    (OUT / 'delivery-qa.json').write_text(json.dumps(qa, indent=2), encoding='utf-8')
    print(json.dumps(qa, indent=2))

if __name__ == '__main__':
    deliver(*make_mix())
