import { easing, interpolateKeyframes } from './utils.js';

export function captureState(model) {
  return {
    px: model.position.x,
    py: model.position.y,
    pz: model.position.z,
    rx: model.rotation.x,
    ry: model.rotation.y,
    rz: model.rotation.z,
  };
}

export function applyState(model, state, camera = null, orbit = null) {
  model.position.set(state.px, state.py, state.pz);
  model.rotation.set(state.rx, state.ry, state.rz);
  if (camera) {
    camera.position.set(state.camPx, state.camPy, state.camPz);
    camera.lookAt(state.tPx, state.tPy, state.tPz);
  }
  if (orbit) {
    orbit.target.set(state.tPx, state.tPy, state.tPz);
  }
}

export class AnimationController {
  constructor() {
    this.isPlaying = false;
    this.loop = false;
    this._start = null;
    this._middle = null;
    this._end = null;
    this._duration = 2;
    this._easingKey = 'cubic';
    this._t0 = null;
  }

  play(startState, middleState, endState, duration, easingKey) {
    this._start = startState;
    this._middle = middleState;
    this._end = endState;
    this._duration = duration;
    this._easingKey = easingKey;
    this._t0 = null;
    this.isPlaying = true;
  }

  // Call each frame. Returns interpolated state, or null when done.
  tick(timestamp) {
    if (!this.isPlaying) return null;
    if (this._t0 === null) this._t0 = timestamp;

    const t = Math.min((timestamp - this._t0) / (this._duration * 1000), 1);
    const state = interpolateKeyframes(this._start, this._middle, this._end, t, easing[this._easingKey]);

    if (t >= 1) {
      if (this.loop) {
        // Boomerang: swap start ↔ end (middle stays, works naturally in reverse)
        [this._start, this._end] = [this._end, this._start];
        this._t0 = timestamp;
      } else {
        this.isPlaying = false;
      }
    }
    return state;
  }
}
