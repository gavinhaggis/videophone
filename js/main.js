import { initScene } from './scene.js';
import { loadDevice, updateScreen } from './iphone.js';
import { AnimationController, applyState } from './animation.js';
import { exportSinglePNG, exportPNGSequence, exportVideo } from './export.js';
import { initGUI } from './controls.js';
import { easing } from './utils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

async function main() {
  const { scene, camera, renderer } = initScene();
  document.body.appendChild(renderer.domElement);

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.05;

  const loadingEl = document.getElementById('loading');
  const loadingText = document.getElementById('loading-text');

  let dev = await loadDevice(scene, 'iphone', (e) => {
    if (e.lengthComputable) {
      loadingText.textContent = `Loading... ${Math.round((e.loaded / e.total) * 100)}%`;
    }
  });

  loadingEl.classList.add('hidden');

  // ── File inputs ────────────────────────────────────────────────────────────
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  const videoInput = document.createElement('input');
  videoInput.type = 'file'; videoInput.accept = 'video/*'; videoInput.style.display = 'none';
  document.body.appendChild(videoInput);

  const presetInput = document.createElement('input');
  presetInput.type = 'file'; presetInput.accept = '.json'; presetInput.style.display = 'none';
  document.body.appendChild(presetInput);

  let screenImage = null;
  let screenVideo = null;

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      if (screenVideo) { screenVideo.pause(); screenVideo.src = ''; screenVideo = null; }
      screenImage = img;
      yOffsetController.min(-(img.naturalHeight + dev.screenCanvas.height)).max(dev.screenCanvas.height);
      updateScreen(dev.ctx, dev.screenCanvas, dev.screenTexture, img, params.yOffset);
    };
    img.src = URL.createObjectURL(file);
    fileInput.value = '';
  });

  videoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    screenImage = null;
    if (screenVideo) screenVideo.src = '';
    const vid = document.createElement('video');
    vid.src = URL.createObjectURL(file);
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.play();
    screenVideo = vid;
    videoInput.value = '';
  });

  // ── Params ─────────────────────────────────────────────────────────────────
  const params = {
    device: 'iphone',
    yOffset: 0,
    scrollSpeed: 1,
    duration: 2,
    fps: 30,
    easing: 'cubic',
    exportWidth: dev.exportDefaults.width,
    exportHeight: dev.exportDefaults.height,
    loop: false,
  };

  const transform = { ...dev.defaultTransform };

  let startState  = null;
  let middleState = null;
  let endState    = null;
  const anim = new AnimationController();

  // ── Status bar ─────────────────────────────────────────────────────────────
  const statusBar = document.getElementById('status-bar');
  let statusTimeout;
  function showStatus(msg) {
    statusBar.textContent = msg;
    statusBar.classList.add('visible');
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => statusBar.classList.remove('visible'), 3000);
  }

  // ── GUI / mesh folder (assigned after initGUI) ─────────────────────────────
  let gui;
  let meshFolder = null;
  let currentDevice = 'iphone';

  function rebuildMeshFolder(meshes) {
    if (meshFolder) meshFolder.destroy();
    meshFolder = gui.addFolder('Mesh Visibility');
    meshFolder.close();
    for (const [name, mesh] of meshes) {
      if (!name) continue;
      const state = { visible: mesh.visible };
      meshFolder.add(state, 'visible').name(name).onChange(v => { mesh.visible = v; });
    }
  }

  // ── Device switch ──────────────────────────────────────────────────────────
  async function switchDevice(deviceType) {
    if (deviceType === currentDevice) return;
    anim.isPlaying = false;
    orbit.enabled = false;
    loadingEl.classList.remove('hidden');
    loadingText.textContent = `Loading ${deviceType}...`;

    try {
      scene.remove(dev.model);
      dev.screenTexture.dispose();
      if (screenVideo) { screenVideo.pause(); screenVideo.src = ''; screenVideo = null; }
      screenImage = null;

      dev = await loadDevice(scene, deviceType, null);

      Object.assign(transform, dev.defaultTransform);
      params.exportWidth  = dev.exportDefaults.width;
      params.exportHeight = dev.exportDefaults.height;
      params.yOffset = 0;
      startState = null; middleState = null; endState = null;
      currentDevice = deviceType;

      yOffsetController.min(-dev.screenCanvas.height).max(dev.screenCanvas.height);
      rebuildMeshFolder(dev.meshes);
      if (gui) gui.controllersRecursive().forEach(c => c.updateDisplay());
      showStatus(`Switched to ${deviceType}`);
    } catch (err) {
      console.error('[switchDevice]', err);
      params.device = currentDevice;
      if (gui) gui.controllersRecursive().forEach(c => c.updateDisplay());
      showStatus('Failed to load device — see console');
    } finally {
      orbit.enabled = true;
      loadingEl.classList.add('hidden');
    }
  }

  // ── State capture helper ───────────────────────────────────────────────────
  function captureState() {
    return {
      ...transform,
      yOffset: params.yOffset,
      camPx: camera.position.x, camPy: camera.position.y, camPz: camera.position.z,
      tPx: orbit.target.x, tPy: orbit.target.y, tPz: orbit.target.z,
    };
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const actions = {
    uploadImage: () => fileInput.click(),
    uploadVideo: () => videoInput.click(),

    onYOffsetChange: () => {
      updateScreen(dev.ctx, dev.screenCanvas, dev.screenTexture, screenVideo || screenImage, params.yOffset);
    },

    onTransformChange: () => applyState(dev.model, transform),

    // Camera presets — preserve current orbit distance
    cameraFront: () => {
      const d = camera.position.distanceTo(orbit.target);
      camera.position.set(orbit.target.x, orbit.target.y, orbit.target.z + d);
      orbit.update();
    },
    cameraSide: () => {
      const d = camera.position.distanceTo(orbit.target);
      camera.position.set(orbit.target.x + d, orbit.target.y, orbit.target.z);
      orbit.update();
    },
    cameraTop: () => {
      const d = camera.position.distanceTo(orbit.target);
      camera.position.set(orbit.target.x, orbit.target.y + d, orbit.target.z);
      orbit.update();
    },
    cameraIsometric: () => {
      const d = camera.position.distanceTo(orbit.target) / Math.sqrt(3);
      camera.position.set(orbit.target.x + d, orbit.target.y + d, orbit.target.z + d);
      orbit.update();
    },

    setStart:    () => { startState  = captureState(); showStatus('Start state saved'); },
    setMiddle:   () => { middleState = captureState(); showStatus('Middle state saved'); },
    clearMiddle: () => { middleState = null;           showStatus('Middle state cleared'); },
    setEnd:      () => { endState    = captureState(); showStatus('End state saved'); },

    preview: () => {
      if (!startState || !endState) { showStatus('Set start and end states first'); return; }
      orbit.enabled = false;
      anim.loop = params.loop;
      anim.play(startState, middleState, endState, params.duration, params.easing);
    },

    stopPreview: () => { anim.isPlaying = false; },

    doExportSinglePNG: () => {
      exportSinglePNG(renderer, scene, camera, { width: params.exportWidth, height: params.exportHeight });
      showStatus('PNG saved');
    },

    doExportVideo: async () => {
      if (!startState || !endState) { showStatus('Set start and end states first'); return; }
      orbit.enabled = false;
      loadingEl.classList.remove('hidden');
      loadingText.textContent = 'Preparing video export...';
      try {
        await exportVideo(renderer, scene, camera, dev.model, startState, endState, {
          fps: params.fps, duration: params.duration, easingFn: easing[params.easing],
          width: params.exportWidth, height: params.exportHeight, middleState,
          ctx: dev.ctx, screenCanvas: dev.screenCanvas, screenTexture: dev.screenTexture,
          screenImage: screenVideo || screenImage,
          onProgress: (i, total) => { loadingText.textContent = `Recording frame ${i + 1} of ${total + 1}...`; },
        });
        showStatus('Video export complete — check downloads');
      } catch (err) {
        console.error('[Video Export]', err);
        showStatus('Video export failed — see console');
      } finally {
        orbit.enabled = true;
        loadingEl.classList.add('hidden');
      }
    },

    doExport: async () => {
      if (!startState || !endState) { showStatus('Set start and end states first'); return; }
      orbit.enabled = false;
      loadingEl.classList.remove('hidden');
      loadingText.textContent = 'Preparing export...';
      try {
        await exportPNGSequence(renderer, scene, camera, dev.model, startState, endState, {
          fps: params.fps, duration: params.duration, easingFn: easing[params.easing],
          width: params.exportWidth, height: params.exportHeight, middleState,
          ctx: dev.ctx, screenCanvas: dev.screenCanvas, screenTexture: dev.screenTexture,
          screenImage: screenVideo || screenImage,
          onProgress: (i, total) => { loadingText.textContent = `Exporting frame ${i + 1} of ${total + 1}...`; },
        });
        showStatus('Export complete — check your Downloads');
      } catch (err) {
        console.error('[Export]', err);
        showStatus('Export failed — see console');
      } finally {
        orbit.enabled = true;
        loadingEl.classList.add('hidden');
      }
    },

    savePreset: () => {
      const preset = {
        device: currentDevice,
        transform: { ...transform },
        params: {
          yOffset: params.yOffset, duration: params.duration, fps: params.fps,
          easing: params.easing, exportWidth: params.exportWidth, exportHeight: params.exportHeight,
        },
        camera: { px: camera.position.x, py: camera.position.y, pz: camera.position.z },
        target: { x: orbit.target.x, y: orbit.target.y, z: orbit.target.z },
        startState, middleState, endState,
        meshVisibility: Object.fromEntries([...dev.meshes].map(([n, m]) => [n, m.visible])),
      };
      const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `preset_${currentDevice}.json`; a.click();
      URL.revokeObjectURL(url);
      showStatus('Preset saved');
    },

    loadPreset: () => presetInput.click(),

    switchDevice,
  };

  // ── Init GUI ───────────────────────────────────────────────────────────────
  const result = initGUI({ transform, params, actions });
  gui = result.gui;
  const { yOffsetController } = result;

  rebuildMeshFolder(dev.meshes);

  // ── Preset load ────────────────────────────────────────────────────────────
  presetInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    presetInput.value = '';
    try {
      const preset = JSON.parse(await file.text());

      if (preset.device && preset.device !== currentDevice) {
        params.device = preset.device;
        await switchDevice(preset.device);
      }

      if (preset.transform) Object.assign(transform, preset.transform);
      if (preset.params)    Object.assign(params, preset.params);
      applyState(dev.model, transform);

      if (preset.camera) camera.position.set(preset.camera.px, preset.camera.py, preset.camera.pz);
      if (preset.target) orbit.target.set(preset.target.x, preset.target.y, preset.target.z);

      if (preset.meshVisibility) {
        for (const [name, visible] of Object.entries(preset.meshVisibility)) {
          const mesh = dev.meshes.get(name);
          if (mesh) mesh.visible = visible;
        }
        rebuildMeshFolder(dev.meshes);
      }

      startState  = preset.startState  ?? null;
      middleState = preset.middleState ?? null;
      endState    = preset.endState    ?? null;

      updateScreen(dev.ctx, dev.screenCanvas, dev.screenTexture, screenVideo || screenImage, params.yOffset);
      gui.controllersRecursive().forEach(c => c.updateDisplay());
      showStatus('Preset loaded');
    } catch (err) {
      console.error('[Load Preset]', err);
      showStatus('Failed to load preset — see console');
    }
  });

  // ── Scroll wheel ───────────────────────────────────────────────────────────
  renderer.domElement.addEventListener('wheel', (e) => {
    if (!e.shiftKey) return;
    e.preventDefault();
    const source = screenVideo || screenImage;
    const srcH = source ? (source.naturalHeight || source.videoHeight || dev.screenCanvas.height) : dev.screenCanvas.height;
    const yMax = dev.screenCanvas.height;
    const yMin = -(srcH + yMax);
    params.yOffset = Math.max(yMin, Math.min(yMax, params.yOffset - e.deltaY * params.scrollSpeed));
    updateScreen(dev.ctx, dev.screenCanvas, dev.screenTexture, source, params.yOffset);
    yOffsetController.updateDisplay();
  }, { passive: false });

  window.addEventListener('keydown', (e) => { if (e.key === 'Shift') orbit.enableZoom = false; });
  window.addEventListener('keyup',   (e) => { if (e.key === 'Shift') orbit.enableZoom = true; });

  // ── Render loop ────────────────────────────────────────────────────────────
  function animate(timestamp) {
    requestAnimationFrame(animate);
    orbit.update();

    const wasPlaying = anim.isPlaying;

    if (anim.isPlaying) {
      const state = anim.tick(timestamp);
      if (state) {
        applyState(dev.model, state, camera, null);
        Object.assign(transform, state);
        params.yOffset = state.yOffset;
        // During animation use video frame (if active) at the animated yOffset
        updateScreen(dev.ctx, dev.screenCanvas, dev.screenTexture, screenVideo || screenImage, state.yOffset);
        gui.controllersRecursive().forEach(c => c.updateDisplay());
      }
    } else if (screenVideo && !screenVideo.paused) {
      // Keep video frame live when not animating
      updateScreen(dev.ctx, dev.screenCanvas, dev.screenTexture, screenVideo, params.yOffset);
    }

    if (wasPlaying && !anim.isPlaying) {
      orbit.enabled = true;
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

main().catch(err => {
  console.error('[main]', err);
  document.getElementById('loading-text').textContent = 'Failed to load. Check console.';
});
