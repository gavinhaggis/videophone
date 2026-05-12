export const easing = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => 1 - (1 - t) * (1 - t),
  cubic: t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,
};

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Interpolate angle via shortest arc, handling ±π wrap
function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff >  Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}

function cartesianToSpherical(x, y, z) {
  const r = Math.sqrt(x * x + y * y + z * z);
  return {
    r,
    theta: Math.atan2(z, x),       // azimuth [-π, π]
    phi:   r > 0 ? Math.acos(Math.max(-1, Math.min(1, y / r))) : 0, // polar [0, π]
  };
}

function sphericalToCartesian(r, theta, phi) {
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * Math.sin(phi) * Math.sin(theta),
  };
}

// Drive animation through 2 or 3 keyframes.
// With a middle keyframe, a single easing curve is applied to the full timeline parameter
// before the segment split. This means the easing shape (e.g. cubic) governs the whole
// arc — fastest at the midpoint, slowest at start and end — with no per-segment velocity
// manipulation. A directional kink can still occur at the midpoint if the two displacement
// vectors differ in direction; see README for the planned Catmull-Rom upgrade (Option A).
export function interpolateKeyframes(start, middle, end, t, easingFn) {
  if (!middle) return lerpState(start, end, easingFn(t));
  const te = easingFn(t);
  if (te < 0.5) return lerpState(start, middle, te * 2);
  return lerpState(middle, end, (te - 0.5) * 2);
}

export function lerpState(a, b, t) {
  // Lerp the orbit target first
  const tPx = lerp(a.tPx, b.tPx, t);
  const tPy = lerp(a.tPy, b.tPy, t);
  const tPz = lerp(a.tPz, b.tPz, t);

  // Express camera positions as spherical offsets relative to their own targets,
  // then interpolate in spherical space so radius never fluctuates mid-animation.
  const sA = cartesianToSpherical(a.camPx - a.tPx, a.camPy - a.tPy, a.camPz - a.tPz);
  const sB = cartesianToSpherical(b.camPx - b.tPx, b.camPy - b.tPy, b.camPz - b.tPz);

  const cam = sphericalToCartesian(
    lerp(sA.r, sB.r, t),
    lerpAngle(sA.theta, sB.theta, t),
    lerp(sA.phi, sB.phi, t),
  );

  return {
    px: lerp(a.px, b.px, t),
    py: lerp(a.py, b.py, t),
    pz: lerp(a.pz, b.pz, t),
    rx: lerp(a.rx, b.rx, t),
    ry: lerp(a.ry, b.ry, t),
    rz: lerp(a.rz, b.rz, t),
    camPx: tPx + cam.x,
    camPy: tPy + cam.y,
    camPz: tPz + cam.z,
    tPx, tPy, tPz,
    yOffset: lerp(a.yOffset, b.yOffset, t),
  };
}
