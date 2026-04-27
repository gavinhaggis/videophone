import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function initScene() {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 1000);
  camera.position.set(0, 0, 8);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // PMREMGenerator gives the metallic iPhone body realistic reflections without an HDR file
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(4, 6, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-4, -2, -4);
  scene.add(fill);

  return { scene, camera, renderer };
}
