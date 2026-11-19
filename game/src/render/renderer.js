// Renderer, scene and camera. Pixel ratio is pinned to 1: the screenshots are judged at
// 1280x720 and software rendering cannot afford more. No post-processing, no MSAA.
import * as THREE from '../../vendor/three.module.min.js';

export function createRenderer(canvas) {
  // preserveDrawingBuffer keeps the last frame readable after compositing: without it a headless
  // capture of a stopped loop comes back as a black canvas with only the DOM HUD on top.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance',
    stencil: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.autoClear = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.3, 1700);
  camera.position.set(0, 12, 40);

  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);

  return { renderer, scene, camera, resize };
}
