"""Final Sunlit edition of the 2:57 product walkthrough with click accents."""
from pathlib import Path
from array import array
import hashlib
import json
import re
import subprocess
import wave

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'video/review/polished-sunlit/picture-master.mp4'
ORIGINAL = ROOT / 'video/review/polished/repeat-ai-explainer-polished.mp4'
VOICE = ROOT / 'video/assets/accurate/public/workflow/polished/voice.wav'
SONG = ROOT / 'public/video/repeat-ai-storyboard/sunlit-walkthrough.mp3'
TAP = ROOT / 'video/assets/launch/audio/soft-interface-tap.wav'
OUT = ROOT / 'video/review/polished-sunlit'
OUT.mkdir(parents=True, exist_ok=True)
DURATION = 177.2
FRAMES = 5316
# Frames where an animated pointer makes a visible click in the polished edit.
CLICK_FRAMES = [484, 517, 740, 798, 951, 990, 1079, 1303, 1309, 1337,
                2323, 2329, 2357, 3048, 3073, 3229, 3388, 4456, 4743]

def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)

def loudness(stderr):
    found = re.search(r'\{\s*"input_i".*?\}', stderr, re.S)
    if not found:
        raise RuntimeError('Expected FFmpeg loudness report')
    return json.loads(found.group())

def make_click_track():
    tap_pcm = OUT / 'tap-pcm16.wav'
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(TAP),
         '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', str(tap_pcm)])
    with wave.open(str(tap_pcm), 'rb') as source:
        assert source.getframerate() == 48000 and source.getnchannels() == 2
        tap = array('h')
        tap.frombytes(source.readframes(source.getnframes()))
    samples = array('h', [0]) * (round(DURATION * 48000) * 2)
    for index, frame in enumerate(CLICK_FRAMES):
        offset = round(frame / 30 * 48000) * 2
        gain = .84 if index % 3 else 1.0
        for i, value in enumerate(tap):
            if offset + i < len(samples):
                samples[offset + i] = max(-32768, min(32767, samples[offset + i] + round(value * gain)))
    clicks = OUT / 'clicks.wav'
    with wave.open(str(clicks), 'wb') as target:
        target.setnchannels(2)
        target.setsampwidth(2)
        target.setframerate(48000)
        target.writeframes(samples.tobytes())
    return clicks

def make_mix():
    premix = OUT / 'premix.wav'
    clicks = make_click_track()
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
        '[2:a]aresample=48000,volume=1.5[clicks];'
        '[spoken][duck][clicks]amix=inputs=3:duration=first:normalize=0[a]'
    )
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(VOICE),
         '-i', str(SONG), '-i', str(clicks), '-filter_complex', graph, '-map', '[a]', '-ar', '48000',
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
         '-i', str(mix), '-i', str(ORIGINAL), '-map', '0:v:0', '-map', '1:a:0', '-map', '2:s?',
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
    assert source_video_hash == video_hash(movie), 'The rendered picture changed during remux'
    qa = {'sourceVideo': str(SOURCE.relative_to(ROOT)),
          'originalVideo': str(ORIGINAL.relative_to(ROOT)),
          'music': str(SONG.relative_to(ROOT)),
          'voice': str(VOICE.relative_to(ROOT)),
          'clickSource': str(TAP.relative_to(ROOT)), 'clickFrames': CLICK_FRAMES,
          'duration': float(probe['format']['duration']), 'frames': FRAMES,
          'resolution': '1920x1080', 'pictureHash': source_video_hash,
          'pictureMatchesNewMaster': True, 'fullDecode': 'pass', 'blackGaps': 'none',
          'audio': levels, 'mixAnalysis': measured,
          'bytes': movie.stat().st_size,
          'sha256': hashlib.sha256(movie.read_bytes()).hexdigest()}
    (OUT / 'delivery-qa.json').write_text(json.dumps(qa, indent=2), encoding='utf-8')
    print(json.dumps(qa, indent=2))

if __name__ == '__main__':
    deliver(*make_mix())
