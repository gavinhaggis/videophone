# 3D iPhone Renderer

A browser-based tool for creating animated iPhone mockup renders. Load a custom screenshot onto a 3D iPhone model, position it, set keyframes, and export as a PNG, PNG sequence, or WebM video — all client-side, no server required.

[link](https://gavinhaggis.github.io/videophone/)

## Features

- Interactive 3D iPhone model with orbit controls (drag, scroll, pinch)
- Upload any image to display on the phone screen
- Scroll screen content with a Y-offset slider or Shift + scroll wheel
- Full position/rotation controls for the iPhone in 3D space
- Keyframe animation: set a start state and an end state, preview in-browser
- Configurable easing curves: linear, easeIn, easeOut, cubic
- Export options:
  - **Single PNG** — snapshot at current camera/transform
  - **PNG sequence** — all frames as a ZIP archive
  - **WebM video** — rendered via MediaRecorder API

## Usage

### Development (multi-file)

Serve the project root with any static file server. The browser loads Three.js and other dependencies from CDN.

```bash
npx serve .
# or
python3 -m http.server
```

Then open `http://localhost:3000` (or whatever port your server uses).

### Standalone (single-file distributable)

Run the build script to produce a self-contained `standalone.html` with the 3D model embedded as base64:

```bash
node build.js
```

Open `standalone.html` directly in a browser — no server needed.

## Controls

| Control | Action |
|---|---|
| Left-drag | Orbit camera |
| Right-drag / two-finger drag | Pan |
| Scroll | Zoom |
| Shift + scroll | Scroll screen content |

Use the GUI panel (top-right) to upload images, adjust transforms, configure animation, and trigger exports.

## Stack

- [Three.js](https://threejs.org/) — 3D rendering
- [lil-gui](https://lil-gui.georgealways.com/) — control panel
- [JSZip](https://stuk.github.io/jszip/) — PNG sequence packaging
- MediaRecorder API — WebM video export
