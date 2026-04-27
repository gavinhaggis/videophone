import { lerpState } from './utils.js';
import { applyState } from './animation.js';
import { updateScreen } from './iphone.js';

export async function exportVideo(renderer, scene, camera, model, startState, endState, options) {
  const { fps, duration, easingFn, width, height, onProgress, ctx, screenCanvas, screenTexture, screenImage } = options;
  const totalFrames = Math.round(fps * duration);

  const origPixelRatio = renderer.getPixelRatio();
  const origAspect = camera.aspect;

  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // VP9 preserves alpha in WebM; fall back to plain WebM if unsupported
  const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
    ? 'video/webm; codecs=vp9'
    : 'video/webm';

  // captureStream(0) = manual frame control via requestFrame()
  const stream = renderer.domElement.captureStream(0);
  const videoTrack = stream.getVideoTracks()[0];

  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 16_000_000 });
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start();

  for (let i = 0; i <= totalFrames; i++) {
    const t = totalFrames === 0 ? 1 : i / totalFrames;
    const state = lerpState(startState, endState, easingFn(t));
    applyState(model, state, camera, null);
    if (ctx) updateScreen(ctx, screenCanvas, screenTexture, screenImage, state.yOffset);
    renderer.render(scene, camera);
    videoTrack.requestFrame();

    if (onProgress) onProgress(i, totalFrames);
    // Sleep exactly one frame duration so MediaRecorder timestamps are correct
    await new Promise(r => setTimeout(r, 1000 / fps));
  }

  recorder.stop();
  await new Promise(resolve => { recorder.onstop = resolve; });

  renderer.setPixelRatio(origPixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight, true);
  camera.aspect = origAspect;
  camera.updateProjectionMatrix();

  const blob = new Blob(chunks, { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'iphone_render.webm';
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSinglePNG(renderer, scene, camera, options) {
  const { width, height } = options;

  const origPixelRatio = renderer.getPixelRatio();
  const origAspect = camera.aspect;

  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);

  const url = renderer.domElement.toDataURL('image/png');

  renderer.setPixelRatio(origPixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight, true);
  camera.aspect = origAspect;
  camera.updateProjectionMatrix();

  const a = document.createElement('a');
  a.href = url;
  a.download = 'iphone_frame.png';
  a.click();
}

export async function exportPNGSequence(renderer, scene, camera, model, startState, endState, options) {
  const { fps, duration, easingFn, width, height, onProgress, ctx, screenCanvas, screenTexture, screenImage } = options;
  const totalFrames = Math.round(fps * duration);

  // Save current renderer state
  const origPixelRatio = renderer.getPixelRatio();
  const origW = window.innerWidth;
  const origH = window.innerHeight;
  const origAspect = camera.aspect;

  // Set exact export resolution (pixelRatio=1 ensures canvas is exactly width×height)
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // JSZip is loaded as a global from index.html
  const zip = new JSZip(); // eslint-disable-line no-undef
  const folder = zip.folder('frames');

  for (let i = 0; i <= totalFrames; i++) {
    const t = totalFrames === 0 ? 1 : i / totalFrames;
    const state = lerpState(startState, endState, easingFn(t));
    applyState(model, state, camera, null);
    if (ctx) updateScreen(ctx, screenCanvas, screenTexture, screenImage, state.yOffset);
    renderer.render(scene, camera);

    const base64 = renderer.domElement.toDataURL('image/png').split(',')[1];
    folder.file(`frame_${String(i).padStart(4, '0')}.png`, base64, { base64: true });

    if (onProgress) onProgress(i, totalFrames);
    await new Promise(r => setTimeout(r, 0)); // yield so browser stays responsive
  }

  // Restore renderer state
  renderer.setPixelRatio(origPixelRatio);
  renderer.setSize(origW, origH, true);
  camera.aspect = origAspect;
  camera.updateProjectionMatrix();

  // Trigger download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'iphone_frames.zip';
  a.click();
  URL.revokeObjectURL(url);
}
