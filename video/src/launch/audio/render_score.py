"""Render the original Repeat AI launch-film score and sound effects.

No sample libraries or third-party recordings. Deterministic procedural synthesis.
Run with Python 3.12, NumPy, SciPy and SoundFile installed.
"""
from pathlib import Path
import json
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
BPM = 100
BEAT = 60 / BPM
BAR = BEAT * 4
DURATION = 70.0
ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'assets' / 'launch' / 'audio'
OUT.mkdir(parents=True, exist_ok=True)
RNG = np.random.default_rng(4291)
N = int(SR * DURATION)
stems = {name: np.zeros((N, 2), dtype=np.float64) for name in ('harmony', 'pulse', 'percussion', 'motif')}


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def filt(x, cutoff, kind='lowpass', order=2):
    return sosfilt(butter(order, cutoff, btype=kind, fs=SR, output='sos'), x, axis=0)


def pan(x, pos):
    if x.ndim == 2:
        return x
    theta = (pos + 1) * np.pi / 4
    return np.column_stack((x * np.cos(theta), x * np.sin(theta)))


def place(stem, x, sec, gain=1, pos=0):
    x = pan(x, pos)
    start = int(sec * SR)
    if start < 0:
        x = x[-start:]
        start = 0
    end = min(N, start + len(x))
    if end > start:
        stems[stem][start:end] += x[:end-start] * gain


def fade_env(length, attack, release):
    env = np.ones(length)
    a, r = min(length, int(attack * SR)), min(length, int(release * SR))
    if a:
        env[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if r:
        env[-r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return env


def pad(notes, length=5.8):
    t = np.arange(int(length * SR)) / SR
    out = np.zeros((len(t), 2))
    for i, note in enumerate(notes):
        f = hz(note)
        x = np.zeros(len(t))
        for detune in (-3.7, 3.7):
            for harmonic, amp in ((1, 1), (2, .17), (3, .055)):
                x += amp * np.sin(2*np.pi*f*(2**(detune/1200))*harmonic*t + i*.63)
        x *= (.87 + .13*np.sin(2*np.pi*(.14+i*.013)*t+i))
        out += pan(x, np.linspace(-.65, .65, len(notes))[i]) / len(notes)
    out = filt(out, 2100)
    return out * fade_env(len(t), .8, 1.9)[:, None]


def tine(note, length=2.9, velocity=.7):
    """Soft struck tine: rounded fundamental with short, inharmonic attack."""
    t = np.arange(int(length * SR)) / SR
    f = hz(note)
    phase = 2*np.pi*f*t + .3*velocity*np.sin(2*np.pi*f*2*t)*np.exp(-t/.16)
    x = np.sin(phase)*np.exp(-t/1.15)
    x += .21*np.sin(2*np.pi*f*2.003*t)*np.exp(-t/.36)
    x += .055*np.sin(2*np.pi*f*3.98*t)*np.exp(-t/.1)
    return filt(x, 3200) * fade_env(len(t), .009, .35)


def bass(note, length=.62):
    t = np.arange(int(length * SR)) / SR
    f = hz(note)
    x = np.sin(2*np.pi*f*t) + .13*np.sin(2*np.pi*2*f*t)
    return x*np.exp(-t/1.0)*fade_env(len(t), .022, .14)


def kick():
    t = np.arange(int(.34 * SR)) / SR
    freq = 46 + 67*np.exp(-t/.021)
    phase = 2*np.pi*np.cumsum(freq)/SR
    return np.sin(phase)*np.exp(-t/.082)*fade_env(len(t), .003, .035)


def shaker(length=.065):
    t = np.arange(int(length * SR)) / SR
    noise = filt(RNG.normal(0, 1, len(t)), [4700, 10200], 'bandpass')
    return noise*np.exp(-t/.017)*fade_env(len(t), .003, .012)


def rim():
    t = np.arange(int(.18*SR)) / SR
    noise = filt(RNG.normal(0, 1, len(t)), [950, 4300], 'bandpass')
    resonant = .14*np.sin(2*np.pi*1730*t)*np.exp(-t/.009)
    x = noise*np.exp(-t/.018)+resonant
    return filt(x, 4700)*fade_env(len(t), .001, .025)


def space(x, wet=.15):
    """Asymmetric early reflections and a quiet multi-tap diffused tail."""
    out = x.copy()
    for delay, gain in ((.047, .35), (.073, .28), (.119, .25), (.163, .20), (.229, .18), (.311, .14), (.419, .105), (.557, .074), (.701, .047)):
        samples = int(delay * SR)
        reflection = x[:-samples, ::-1] if int(delay*1000) % 2 else x[:-samples]
        out[samples:] += filt(reflection, 3400) * gain * wet
    return out


# 28 bars: sparse entrance, rhythmic body, breathing space, and a settled close.
chords = {
    'Dm9': ([53, 57, 60, 64, 69], 38),
    'Bbmaj9': ([53, 57, 60, 62, 65], 34),
    'Fmaj9': ([53, 57, 60, 64, 67], 41),
    'Cadd9': ([52, 55, 60, 62, 67], 36),
}
sequence = ['Dm9', 'Bbmaj9', 'Dm9', 'Bbmaj9', 'Fmaj9', 'Cadd9', 'Dm9', 'Bbmaj9', 'Fmaj9', 'Cadd9', 'Bbmaj9', 'Cadd9', 'Dm9', 'Fmaj9']
events = []
for slot, name in enumerate(sequence):
    notes, low = chords[name]
    bar = slot * 2
    start = bar * BAR
    pad_gain = .105 if bar < 4 else .095
    place('harmony', pad(notes), start, pad_gain)
    events.append({'time': round(start, 3), 'bar': bar+1, 'chord': name})
    # A short, spacious phrase; variations keep it away from an endless arpeggio.
    if bar < 4:
        motif = [(1.0, notes[2]+12, .32), (4.5, notes[1]+12, .24)]
    elif 20 <= bar < 24:
        motif = [(0.5, notes[3]+12, .32), (5.0, notes[2]+12, .27)]
    elif bar >= 26:
        motif = [(0.0, 72, .4), (1.5, 69, .3), (3.0, 67, .23)]
    else:
        motif = [(0.5, notes[2]+12, .35), (2.0, notes[3]+12, .26), (3.5, notes[1]+12, .30), (5.0, notes[2]+12, .29), (6.5, notes[4], .22)]
    for j, (beat, note, velocity) in enumerate(motif):
        x = tine(note, velocity=velocity)
        p = -.22 if j % 2 == 0 else .25
        place('motif', x, start + beat*BEAT, .058*velocity/.35, p)
        place('motif', filt(x, 2100), start + (beat+.75)*BEAT, .009, -p)
    for offset in range(2):
        b = bar + offset
        at = b * BAR
        if b < 4:
            place('pulse', bass(low, 1.25), at+.03, .08)
            continue
        if b >= 27:
            place('pulse', bass(low, 1.8), at, .085)
            continue
        if 20 <= b < 22:
            place('pulse', bass(low, 1.0), at, .075)
            continue
        # Slightly behind the beat and quieter upbeat notes provide momentum.
        for beat, strength in ((0, 1), (1.75, .5), (2.5, .7), (3.5, .35)):
            place('pulse', bass(low, .52 if beat else .69), at+beat*BEAT+.007, .10*strength)
        for beat, strength in ((0, 1), (2, .84)):
            place('percussion', kick(), at+beat*BEAT, .13*strength)
        for beat in (1, 3):
            place('percussion', rim(), at+beat*BEAT+.012, .027, .14)
        for eighth in range(8):
            swing = .012 if eighth % 2 else 0
            strength = .013 if eighth % 2 else .008
            place('percussion', shaker(), at+eighth*.5*BEAT+swing, strength, -.25 if eighth%2 else .2)

stems['harmony'] = space(stems['harmony'], .24)
stems['motif'] = space(stems['motif'], .42)
stems['percussion'] = space(stems['percussion'], .09)
master_env = fade_env(N, .09, 3.1)[:, None]
for name in stems:
    stems[name] = filt(stems[name], 28, 'highpass') * master_env
mix = sum(stems.values())
# Leave generous mastering headroom. Apply the same gain to stems for exact sum.
gain = 10**(-7/20) / max(np.abs(mix).max(), 1e-12)
for name, x in stems.items():
    sf.write(OUT / f'launch-{name}.wav', x*gain, SR, subtype='PCM_24')
sf.write(OUT / 'repeat-launch-original-score.wav', mix*gain, SR, subtype='PCM_24')


def effect_file(name, x, peak_db):
    x = pan(x, 0)
    x = x / max(np.abs(x).max(), 1e-12) * 10**(peak_db/20)
    sf.write(OUT/name, x, SR, subtype='PCM_24')


# Soft air transition: no rising alarm tone, only shaped broad-band air.
t = np.arange(int(.62*SR))/SR
air = filt(RNG.normal(0, 1, len(t)), [450, 4400], 'bandpass')
air *= np.sin(np.pi*t/t[-1])**2 * np.exp(-((t-.36)/.19)**2)
effect_file('soft-air-transition.wav', pan(air, -.2), -16)

t = np.arange(int(.14*SR))/SR
wood = (.65*np.sin(2*np.pi*790*t)+.22*np.sin(2*np.pi*1137*t))*np.exp(-t/.009)
wood += filt(RNG.normal(0, 1, len(t)), 2200)*np.exp(-t/.006)*.09
wood *= fade_env(len(t), .001, .04)
effect_file('soft-interface-tap.wav', wood, -19)

t = np.arange(int(1.2*SR))/SR
chime = np.zeros((len(t), 2))
for note, delay, pos in ((76, 0, -.18), (79, .105, .18)):
    tone = tine(note, length=1.0, velocity=.22)
    offset = int(delay*SR)
    chime[offset:offset+len(tone)] += pan(tone, pos)*.6
chime *= fade_env(len(t), .006, .36)[:, None]
effect_file('soft-confirmation.wav', chime, -20)

report = {
    'title': 'Close to the Market', 'composer': 'Original procedural composition for Repeat AI',
    'duration_seconds': DURATION, 'bpm': BPM, 'sample_rate': SR,
    'channels': 2, 'format': '24-bit PCM WAV', 'peak_dbfs': -7,
    'musical_events': events,
    'structure': [
        {'start': 0, 'end': 9.6, 'role': 'spacious opening'},
        {'start': 9.6, 'end': 48, 'role': 'gentle rhythmic body'},
        {'start': 48, 'end': 52.8, 'role': 'breathing space'},
        {'start': 52.8, 'end': 64.8, 'role': 'final lift'},
        {'start': 64.8, 'end': 70, 'role': 'settled close and tail'},
    ],
    'rights': 'No external samples, compositions, recordings, or licensed sample libraries used.',
    'audition': 'Not perceptually auditioned by the generating agent; measurable QA only.',
}
(OUT/'score-manifest.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'output': str(OUT), 'peak_dbfs': float(20*np.log10(np.max(np.abs(mix*gain)))), 'duration': DURATION, 'gain': float(gain)}, indent=2))
