import { initScene } from './scene.js';
import { loadIphone, updateScreen } from './iphone.js';
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

  const { model, ctx, screenCanvas, screenTexture } = await loadIphone(scene, (e) => {
    if (e.lengthComputable) {
      loadingText.textContent = `Loading... ${Math.round((e.loaded / e.total) * 100)}%`;
    }
  });

  loadingEl.classList.add('hidden');

  // Hidden file input — lil-gui has no native file picker
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  let screenImage = null;
  let yOffsetMin = -3000;
  const yOffsetMax = 2532;

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      screenImage = img;
      yOffsetMin = -(img.naturalHeight + 2532);
      yOffsetController.min(yOffsetMin).max(yOffsetMax);
      updateScreen(ctx, screenCanvas, screenTexture, img, params.yOffset);
    };
    img.src = URL.createObjectURL(file);
    fileInput.value = '';
  });

  // Params bound to GUI controls
  const params = {
    yOffset: 0,
    scrollSpeed: 1,
    duration: 2,
    fps: 30,
    easing: 'cubic',
    exportWidth: 1080,
    exportHeight: 1920,
  };

  // iPhone transform — sliders write here, applyState reads here
  const transform = {
    px: model.position.x,
    py: model.position.y,
    pz: model.position.z,
    rx: model.rotation.x,
    ry: model.rotation.y,
    rz: model.rotation.z,
  };

  let startState = null;
  let endState = null;
  const anim = new AnimationController();

  // Status bar
  const statusBar = document.getElementById('status-bar');
  let statusTimeout;
  function showStatus(msg) {
    statusBar.textContent = msg;
    statusBar.classList.add('visible');
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => statusBar.classList.remove('visible'), 3000);
  }

  const actions = {
    uploadImage: () => fileInput.click(),

    onYOffsetChange: () => {
      updateScreen(ctx, screenCanvas, screenTexture, screenImage, params.yOffset);
    },

    onTransformChange: () => {
      applyState(model, transform);
    },

    setStart: () => {
      startState = {
        ...transform,
        yOffset: params.yOffset,
        camPx: camera.position.x, camPy: camera.position.y, camPz: camera.position.z,
        tPx: orbit.target.x, tPy: orbit.target.y, tPz: orbit.target.z,
      };
      showStatus('Start state saved');
    },

    setEnd: () => {
      endState = {
        ...transform,
        yOffset: params.yOffset,
        camPx: camera.position.x, camPy: camera.position.y, camPz: camera.position.z,
        tPx: orbit.target.x, tPy: orbit.target.y, tPz: orbit.target.z,
      };
      showStatus('End state saved');
    },

    preview: () => {
      if (!startState || !endState) {
        showStatus('Set start and end states first');
        return;
      }
      orbit.enabled = false;
      anim.play(startState, endState, params.duration, params.easing);
    },

    doExportSinglePNG: () => {
      exportSinglePNG(renderer, scene, camera, {
        width: params.exportWidth,
        height: params.exportHeight,
      });
      showStatus('PNG saved');
    },

    doExportVideo: async () => {
      if (!startState || !endState) {
        showStatus('Set start and end states first');
        return;
      }
      orbit.enabled = false;
      loadingEl.classList.remove('hidden');
      loadingText.textContent = 'Preparing video export...';
      try {
        await exportVideo(renderer, scene, camera, model, startState, endState, {
          fps: params.fps,
          duration: params.duration,
          easingFn: easing[params.easing],
          width: params.exportWidth,
          height: params.exportHeight,
          ctx, screenCanvas, screenTexture, screenImage,
          onProgress: (i, total) => {
            loadingText.textContent = `Recording frame ${i + 1} of ${total + 1}...`;
          },
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
      if (!startState || !endState) {
        showStatus('Set start and end states first');
        return;
      }

      orbit.enabled = false;
      loadingEl.classList.remove('hidden');
      loadingText.textContent = 'Preparing export...';

      try {
        await exportPNGSequence(renderer, scene, camera, model, startState, endState, {
          fps: params.fps,
          duration: params.duration,
          easingFn: easing[params.easing],
          width: params.exportWidth,
          height: params.exportHeight,
          ctx, screenCanvas, screenTexture, screenImage,
          onProgress: (i, total) => {
            loadingText.textContent = `Exporting frame ${i + 1} of ${total + 1}...`;
          },
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
  };

  const { gui, yOffsetController } = initGUI({ transform, params, actions });

  renderer.domElement.addEventListener('wheel', (e) => {
    if (!e.shiftKey) return;
    e.preventDefault();
    params.yOffset = Math.max(yOffsetMin, Math.min(yOffsetMax, params.yOffset - e.deltaY * params.scrollSpeed));
    updateScreen(ctx, screenCanvas, screenTexture, screenImage, params.yOffset);
    yOffsetController.updateDisplay();
  }, { passive: false });

  window.addEventListener('keydown', (e) => { if (e.key === 'Shift') orbit.enableZoom = false; });
  window.addEventListener('keyup', (e) => { if (e.key === 'Shift') orbit.enableZoom = true; });

  // Render loop
  function animate(timestamp) {
    requestAnimationFrame(animate);
    orbit.update();

    if (anim.isPlaying) {
      const state = anim.tick(timestamp);
      if (state) {
        applyState(model, state, camera, null);
        Object.assign(transform, state);
        params.yOffset = state.yOffset;
        updateScreen(ctx, screenCanvas, screenTexture, screenImage, state.yOffset);
        gui.controllersRecursive().forEach(c => c.updateDisplay());
      }
      if (!anim.isPlaying) {
        // Sync orbit target to end state so user can resume orbiting naturally
        orbit.target.set(endState.tPx, endState.tPy, endState.tPz);
        orbit.enabled = true;
      }
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
