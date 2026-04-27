import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const SCREEN_MESH_NAME = 'xXDHkMplTIDAXLN';

// Canvas resolution — aspect ratio should match the screen mesh's UVs
const SCREEN_CANVAS_W = 1170;
const SCREEN_CANVAS_H = 2532;

export function loadIphone(scene, onProgress) {
  return new Promise((resolve, reject) => {
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = SCREEN_CANVAS_W;
    screenCanvas.height = SCREEN_CANVAS_H;
    const ctx = screenCanvas.getContext('2d');
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, SCREEN_CANVAS_W, SCREEN_CANVAS_H);

    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    // Disable mipmaps — they blur the texture at oblique angles
    screenTexture.generateMipmaps = false;
    screenTexture.minFilter = THREE.LinearFilter;

    const draco = new DRACOLoader();
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/libs/draco/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.load(
      './scene.glb',
      (gltf) => {
        const model = gltf.scene;
        let screenFound = false;

        const meshNames = [];
        model.traverse(child => {
          if (!child.isMesh) return;
          meshNames.push(child.name);
          if (child.name === SCREEN_MESH_NAME) {
            child.material = new THREE.MeshBasicMaterial({
              map: screenTexture,
              toneMapped: false, // bypass ACESFilmic so screen colors are reproduced exactly
            });
            screenFound = true;
          }
        });

        console.log('[iPhone] All mesh names:\n' + meshNames.join('\n'));

        if (!screenFound) {
          console.warn('[iPhone] Screen mesh not found. Expected:', SCREEN_MESH_NAME);
          console.warn('[iPhone] Available meshes:', meshNames);
        }

        // Auto-scale so the iPhone is approximately 3 units tall
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const scale = 3.0 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);

        // Re-center at origin after scaling
        const box2 = new THREE.Box3().setFromObject(model);
        const center = box2.getCenter(new THREE.Vector3());
        model.position.sub(center);

        scene.add(model);
        resolve({ model, ctx, screenCanvas, screenTexture });
      },
      onProgress,
      reject
    );
  });
}

export function updateScreen(ctx, screenCanvas, screenTexture, image, yOffset) {
  ctx.clearRect(0, 0, screenCanvas.width, screenCanvas.height);
  ctx.fillStyle = '#101010';
  ctx.fillRect(0, 0, screenCanvas.width, screenCanvas.height);

  if (image) {
    const scale = screenCanvas.width / image.naturalWidth;
    const drawH = image.naturalHeight * scale;
    ctx.drawImage(image, 0, yOffset, screenCanvas.width, drawH);
  }

  screenTexture.needsUpdate = true;
}
