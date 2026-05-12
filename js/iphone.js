import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const DEVICES = {
  iphone: {
    glb: './scene.glb',
    screenMesh: 'xXDHkMplTIDAXLN',
    canvasW: 1170,
    canvasH: 2532,
    label: 'iPhone',
    // Add mesh names here to hide by default (inspect console output to find them)
    defaultHidden: ['TakBsdEjEytCAMK', 'lykfmVvLpITsTEW'],
    defaultTransform: { px: 0, py: 0, pz: 0, rx: 0, ry: Math.PI, rz: 0 },
    exportDefaults: { width: 1080, height: 1920 },
  },
  macbook: {
    glb: './macbook.glb',
    screenMesh: 'eVdSUYIqmtLvNwc',
    canvasW: 2560,
    canvasH: 1600,
    label: 'MacBook',
    defaultHidden: ['FXbqQzcfpysbCaX'],
    defaultTransform: { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 },
    exportDefaults: { width: 1920, height: 1920 },
  },
};

export function loadDevice(scene, deviceType, onProgress) {
  const config = DEVICES[deviceType];
  return new Promise((resolve, reject) => {
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = config.canvasW;
    screenCanvas.height = config.canvasH;
    const ctx = screenCanvas.getContext('2d');
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, config.canvasW, config.canvasH);

    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    screenTexture.generateMipmaps = false;
    screenTexture.minFilter = THREE.LinearFilter;

    const draco = new DRACOLoader();
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/libs/draco/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.load(
      config.glb,
      (gltf) => {
        const model = gltf.scene;
        let screenFound = false;
        const meshes = new Map();

        model.traverse(child => {
          if (!child.isMesh) return;
          meshes.set(child.name, child);
          if (child.name === config.screenMesh) {
            child.material = new THREE.MeshBasicMaterial({
              map: screenTexture,
              toneMapped: false,
            });
            screenFound = true;
          }
        });

        for (const name of config.defaultHidden) {
          const mesh = meshes.get(name);
          if (mesh) mesh.visible = false;
        }

        console.log(`[${config.label}] Mesh names:\n` + [...meshes.keys()].join('\n'));
        if (!screenFound) {
          console.warn(`[${config.label}] Screen mesh not found. Expected:`, config.screenMesh);
        }

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const scale = 3.0 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);

        const box2 = new THREE.Box3().setFromObject(model);
        const center = box2.getCenter(new THREE.Vector3());
        model.position.sub(center);

        const dt = config.defaultTransform;
        model.position.set(dt.px, dt.py, dt.pz);
        model.rotation.set(dt.rx, dt.ry, dt.rz);

        scene.add(model);
        resolve({ model, ctx, screenCanvas, screenTexture, meshes, defaultTransform: dt, exportDefaults: config.exportDefaults });
      },
      onProgress,
      reject
    );
  });
}

// source can be an HTMLImageElement or HTMLVideoElement
export function updateScreen(ctx, screenCanvas, screenTexture, source, yOffset) {
  ctx.clearRect(0, 0, screenCanvas.width, screenCanvas.height);
  ctx.fillStyle = '#101010';
  ctx.fillRect(0, 0, screenCanvas.width, screenCanvas.height);

  if (source) {
    const srcW = source.naturalWidth || source.videoWidth;
    const srcH = source.naturalHeight || source.videoHeight;
    if (srcW && srcH) {
      const scale = screenCanvas.width / srcW;
      ctx.drawImage(source, 0, yOffset, screenCanvas.width, srcH * scale);
    }
  }

  screenTexture.needsUpdate = true;
}
