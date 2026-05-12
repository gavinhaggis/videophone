# 3D Device Renderer

A browser-based tool for creating animated device mockup renders. Load a custom screenshot or video onto a 3D iPhone or MacBook model, set keyframes, and export as a PNG, PNG sequence, or WebM video — all client-side, no server required.

## Features

- Interactive 3D iPhone and MacBook models with orbit controls (drag, scroll, pinch)
- Upload an image or video to display on the device screen
- Scroll screen content with a Y-offset slider or Shift + scroll wheel
- Camera presets: Front, Side, Top, Isometric (preserves current zoom distance)
- Full position/rotation controls for the device in 3D space
- Per-mesh visibility toggles (auto-discovered from the loaded model)
- Keyframe animation: Start, optional Middle, and End states
- Boomerang loop: plays forward then reverses continuously
- Configurable easing curves: linear, easeIn, easeOut, cubic
- Preset save/load: full scene state serialised to JSON
- Export options:
  - **Single PNG** — snapshot at current camera/transform (transparent background)
  - **PNG sequence** — all frames as a ZIP archive (transparent background)
  - **WebM video** — rendered via MediaRecorder API with VP9 alpha where supported

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

Run the build script to produce a self-contained `standalone.html` with both 3D models embedded as base64:

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

Use the GUI panel (top-right) to upload media, adjust transforms, configure animation, and trigger exports.

## Animation — motion design notes

### Current implementation (Option B — global easing remap)

When a Middle keyframe is set, a single easing curve is applied to the full timeline parameter `t` before the segment split. The motion is therefore fastest at the midpoint (where the eased `t` crosses 0.5) and slowest at the start and end — producing a "spin through the middle, decelerate into the end" feel.

The easing selection in the GUI governs the whole arc. `cubic` (ease-in-out) is recommended for three-keyframe animations.

**Known limitation:** because each segment is still a linear interpolation, a directional *kink* can occur at the Middle keyframe if the two displacement vectors differ in direction (e.g. a rotation axis change). This is a geometric discontinuity, not a speed one, and is most visible when the two motion directions are very different.

### Future upgrade — Option A (Catmull-Rom spline)

To eliminate the directional kink entirely, `interpolateKeyframes` in `js/utils.js` should be upgraded to use **Catmull-Rom spline** interpolation:

- Add phantom control points before Start and after End (reflected from their neighbours, or clamped).
- At each `t`, evaluate the cubic Hermite curve defined by the four control points.
- The tangent at the Middle keyframe is automatically computed as `(end − start) / 2` in normalised time, giving C1 continuity (smooth velocity vector through every keyframe).
- Apply the selected easing curve to the global `t` before passing it to the spline evaluator.

This is the standard approach used in professional animation tools (After Effects, Blender graph editor, etc.) and would make the Middle keyframe feel like a true waypoint rather than a corner.

Implementation scope: `interpolateKeyframes` in `js/utils.js` only — no changes to callers.

## Stack

- [Three.js](https://threejs.org/) — 3D rendering
- [lil-gui](https://lil-gui.georgealways.com/) — control panel
- [JSZip](https://stuk.github.io/jszip/) — PNG sequence packaging
- MediaRecorder API — WebM video export
