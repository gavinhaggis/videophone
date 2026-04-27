export const easing = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => 1 - (1 - t) * (1 - t),
  cubic: t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,
};

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpState(a, b, t) {
  return {
    // iPhone transform
    px: lerp(a.px, b.px, t),
    py: lerp(a.py, b.py, t),
    pz: lerp(a.pz, b.pz, t),
    rx: lerp(a.rx, b.rx, t),
    ry: lerp(a.ry, b.ry, t),
    rz: lerp(a.rz, b.rz, t),
    // Camera position
    camPx: lerp(a.camPx, b.camPx, t),
    camPy: lerp(a.camPy, b.camPy, t),
    camPz: lerp(a.camPz, b.camPz, t),
    // Orbit target (look-at point)
    tPx: lerp(a.tPx, b.tPx, t),
    tPy: lerp(a.tPy, b.tPy, t),
    tPz: lerp(a.tPz, b.tPz, t),
    // Screen content
    yOffset: lerp(a.yOffset, b.yOffset, t),
  };
}
