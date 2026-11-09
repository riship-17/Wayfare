"""Mixes music and sound effects for a cut, timed from the scene list in comp/comp.js.
   python3 mix.py loop|full  -> out/<cut>-audio.m4a"""
import json, re, subprocess, sys
cut = sys.argv[1]
src = open('comp/comp.js').read()
block = re.search(cut + r": \[(.*?)\]\],", src, re.S).group(1) + ']'
scenes = json.loads('[' + block.replace("'", '"') + ']')
T = 0.6
cues = []  # (time, sfx, gain)
start = 0.0
total = sum(d for _, d, _ in scenes)
# scene specific beats, seconds after the scene starts (match the animation times in comp.js)
BEATS = {
    'open': [(3.6, 'boom', 0.8), (4.6, 'pop', 0.7)],
    'problem': [(1.0 + i * 0.12, 'pop', 0.45) for i in range(5)],
    'gap': [(1.6 + i * 0.35, 'pop', 0.5) for i in range(4)] + [(3.0, 'ding', 0.35)],
    'stats': [(0.9 + i * 0.15, 'pop', 0.45) for i in range(4)],
    'insight': [(0.2, 'riser', 0.35)],
    'brand': [(0.95, 'boom', 0.9), (1.9, 'pop', 0.7)],
    'stages': [(0.8 + i * 0.25, 'whoosh', 0.35) for i in range(3)],
    'home': [(1.6, 'pop', 0.6), (2.2, 'pop', 0.6), (2.9, 'pop', 0.6), (3.5, 'whoosh', 0.25)],
    'checklist': [(1.6, 'pop', 0.6), (2.3, 'pop', 0.6), (3.0, 'pop', 0.6), (3.6, 'whoosh', 0.25)],
    'verify': [(2.4, 'pop', 0.7), (3.1, 'ding', 0.6), (3.6, 'pop', 0.55), (4.3, 'pop', 0.55), (5.0, 'pop', 0.55)],
    'listing': [(1.3, 'pop', 0.4)],
    'transit': [(1.9, 'pop', 0.8), (2.7, 'pop', 0.55), (3.4, 'pop', 0.55)],
    'budget': [(1.8, 'pop', 0.6), (2.6, 'pop', 0.6), (3.3, 'whoosh', 0.25)],
    'family': [(1.2, 'pop', 0.6), (1.4, 'whoosh', 0.45)],
    'essentials': [(1.8, 'pop', 0.6)],
    'unlock': [(1.6, 'pop', 0.4), (2.4, 'pop', 0.7), (2.5, 'ding', 0.8)],
    'charged': [(0.9 + i * 0.45, 'pop', 0.55) for i in range(4)] + [(2.9, 'boom', 0.9), (3.2, 'whoosh', 0.45)],
    'community': [(1.3, 'pop', 0.4)],
    'desktop': [(3.0, 'pop', 0.5)],
    'impact': [(0.6 + i * 0.12, 'pop', 0.4) for i in range(4)] + [(1.4, 'whoosh', 0.45)],
    'tagline': [(0.2, 'riser', 0.3)],
    'outro': [(0.2, 'boom', 0.7)],
}
for i, (name, dur, tin) in enumerate(scenes):
    if tin in ('whip', 'zoom') and not (i == 0 and cut == 'full'):
        cues.append((start - T / 2 - 0.25, 'whoosh', 0.75 if tin == 'whip' else 0.5))
    if tin == 'wipe':
        cues.append((start - T / 2 - 0.2, 'whoosh', 0.4))
    for (t, fx, g) in BEATS.get(name, []):
        cues.append((start + t, fx, g))
    start += dur
cues = [((t + total) % total if cut == 'loop' else max(0, t), fx, g) for t, fx, g in cues]

inputs = ['-i', 'audio/inspired.mp3']
filters = []
fade = f"afade=t=in:st=0:d=0.6,afade=t=out:st={total-1.2}:d=1.2" if cut == 'loop' else f"afade=t=in:st=0:d=0.4,afade=t=out:st={total-4}:d=4"
filters.append(f"[0]atrim=0:{total},asetpts=N/SR/TB,volume=0.62,{fade}[m]")
labels = ['[m]']
for n, (t, fx, g) in enumerate(cues):
    inputs += ['-i', f'audio/sfx/{fx}.wav']
    ms = int(t * 1000)
    filters.append(f"[{n+1}]volume={g},adelay={ms}|{ms}[s{n}]")
    labels.append(f'[s{n}]')
filters.append(''.join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=first,alimiter=limit=0.95,loudnorm=I=-15:TP=-1.5:LRA=11[out]")
cmd = ['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filters), '-map', '[out]', '-t', str(total), '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', f'out/{cut}-audio.m4a']
subprocess.run(cmd, check=True)
print(cut, 'audio:', total, 's,', len(cues), 'sound effects')
