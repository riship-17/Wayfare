# Exhibition videos

Two cuts for EV World 2026, made from the real app (no generated footage):

| File | Length | Use |
|---|---|---|
| `out/wayfare-stand-loop.mp4` | 60 s | Loops on the stand screen. Starts and ends on the Wayfare brand moment |
| `out/wayfare-full.mp4` | 2:38 | The full story: problem, insight, every feature, impact, team credits |

1080p, 30 fps, H.264 + AAC, loudness normalised to −15 LUFS.

## Rebuild

With the dev servers running (`npm run dev`):

```bash
cd video
node capture.mjs                                   # real screens from the app, plus element positions for callouts
node icons.mjs                                     # Phosphor icons as SVG (NODE_PATH=../client/node_modules:../node_modules)
node render.mjs stills full 6,54,73                # preview frames into preview/
node render.mjs video loop out/loop-silent.mp4     # frames stream straight into ffmpeg, nothing written per frame
node render.mjs video full out/full-silent.mp4
python3 mix.py loop && python3 mix.py full         # music and sound effects, timed from the scene list
ffmpeg -i out/loop-silent.mp4 -i out/loop-audio.m4a -c copy -shortest out/wayfare-stand-loop.mp4
```

`capture.mjs` verifies one listing with **sample values** so the verified state can be filmed; those scenes carry a "Sample values for demonstration" label. Run `npm run seed -- --reset` afterwards (the script does not leave sample prices behind once reset).

## How it is made

`comp/comp.js` is a deterministic motion graphics engine: `render(t)` sets every element as a pure function of time, so each frame is exact. Effects: speed ramped whip, zoom and mask wipe transitions with directional motion blur driven by velocity (SVG blur), punch in zooms on recorded element positions with tracked callouts, kinetic typography that sharpens from blur, count ups, depth layers, a soft glow on the phone, and seeded film grain. Scene lengths sit on 2 second bars of the 120 BPM track.

## Credits and licences

- Music: “Inspired” by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0. Credit is on the end card of the full cut; for the loop, keep this credit on the stand signage or the screen's caption.
- Sound effects: synthesised with ffmpeg for this project.
- Map data © OpenStreetMap contributors (ODbL). Rates by Exchange Rate API. Facts from KHDA and Dubai Media Office.
