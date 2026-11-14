import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Basic setup
 */
const canvas = document.querySelector("canvas.webgl");
const scene = new THREE.Scene();

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Use lighter rendering settings on small screens or touch devices.
const lightweight = window.matchMedia(
  "(max-width: 760px), (pointer: coarse)"
).matches;

/**
 * Camera
 */
const cameraGroup = new THREE.Group();
scene.add(cameraGroup);

const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  100
);

camera.position.z = 6;
cameraGroup.add(camera);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: !lightweight,
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio || 1, lightweight ? 1 : 1.5)
);

renderer.setSize(sizes.width, sizes.height);

/**
 * Lighting
 */
const directionalLight = new THREE.DirectionalLight("#ffffff", 3);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight("#ffffff", 1.5);
scene.add(ambientLight);

/**
 * Model settings
 *
 * Each model occupies the center of one third of the page.
 * Change size to adjust its relative diameter.
 * Change horizontal to shift it left (-) or right (+).
 */
const models = [
  {
    name: "Moon",
    path: "./moon_model/scene.gltf",
    pageFraction: 1 / 6,
    horizontal: 0.18,
    size: 0.8,
    group: null,
  },
  {
    name: "Earth",
    path: "./earth_model/scene.gltf",
    pageFraction: 1 / 2,
    horizontal: -0.18,
    size: 0.9,
    group: null,
  },
  {
    name: "Sun",
    path: "./sun_model/scene.gltf",
    pageFraction: 5 / 6,
    horizontal: 0.18,
    size: 1,
    group: null,
  },
];

/**
 * Stars
 */
const particlesCount = lightweight ? 180 : 400;
const positions = new Float32Array(particlesCount * 3);

// Store random values once so stars do not jump around on resize.
const starSeeds = Array.from({ length: particlesCount }, () => ({
  x: Math.random(),
  y: Math.random(),
  z: Math.random(),
}));

const particlesGeometry = new THREE.BufferGeometry();
particlesGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(positions, 3)
);

const particlesMaterial = new THREE.PointsMaterial({
  color: "#ffeded",
  size: 0.025,
  sizeAttenuation: true,
});

const particles = new THREE.Points(
  particlesGeometry,
  particlesMaterial
);

// Positions change when the document changes size.
particles.frustumCulled = false;
scene.add(particles);

/**
 * Page layout
 */
let worldUnitsPerPixel = 1;

function updateLayout() {
  // Visible world dimensions at the models' depth (z = 0).
  const visibleHeight =
    2 *
    Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
    camera.position.z;

  const visibleWidth = visibleHeight * camera.aspect;

  worldUnitsPerPixel = visibleHeight / sizes.height;

  const pageHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
    sizes.height
  );

  for (const model of models) {
    if (!model.group) continue;

    // Translate a location in the document into a world position.
    const documentY = pageHeight * model.pageFraction;

    model.group.position.set(
      visibleWidth * model.horizontal,
      -(documentY - sizes.height / 2) * worldUnitsPerPixel,
      0
    );

    // Limit size by both screen width and height to fit phones.
    const diameter =
      Math.min(visibleWidth * 0.52, visibleHeight * 0.65) *
      model.size;

    // Loaded models are normalized to a radius of 1.
    model.group.scale.setScalar(diameter / 2);
  }

  // Spread stars across the entire page, with some extra at each end.
  const worldPageHeight = pageHeight * worldUnitsPerPixel;

  for (let i = 0; i < particlesCount; i++) {
    const seed = starSeeds[i];

    positions[i * 3] = (seed.x - 0.5) * visibleWidth * 1.5;

    positions[i * 3 + 1] =
      visibleHeight -
      seed.y * (worldPageHeight + visibleHeight);

    positions[i * 3 + 2] = -seed.z * 3;
  }

  particlesGeometry.attributes.position.needsUpdate = true;

  camera.position.y = -window.scrollY * worldUnitsPerPixel;
}

/**
 * Load the models
 */
const loader = new GLTFLoader();

// Model credits:
// Moon: Akshat — https://skfb.ly/6TwGU
// Earth ("Hello World!"): Mateusz Kołakowski — https://skfb.ly/oSGTw
// Sun: SebastianSosnowski — https://skfb.ly/6yGSx
// All licensed under CC BY 4.0:
// https://creativecommons.org/licenses/by/4.0/

async function loadModels() {
  // Load one at a time to reduce simultaneous loading work.
  for (const model of models) {
    try {
      const gltf = await loader.loadAsync(model.path);
      const object = gltf.scene;

      object.updateMatrixWorld(true);

      // Different models use very different original scales.
      // Find each model's center and normalize its size.
      const bounds = new THREE.Box3().setFromObject(object);
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());

      if (
        !Number.isFinite(sphere.radius) ||
        sphere.radius <= 0
      ) {
        throw new Error("Model has invalid or empty bounds.");
      }

      const centered = new THREE.Group();
      centered.add(object);
      object.position.sub(sphere.center);

      const normalized = new THREE.Group();
      normalized.add(centered);
      normalized.scale.setScalar(1 / sphere.radius);

      // Rotate this outer group around the model's center.
      const group = new THREE.Group();
      group.add(normalized);

      model.group = group;
      scene.add(group);

      updateLayout();

      console.info(`${model.name} loaded successfully.`);
    } catch (error) {
      console.error(
        `Could not load ${model.name} from ${model.path}:`,
        error
      );
    }
  }
}

/**
 * Resizing and content changes
 */
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);

  updateLayout();
});

// Images and fonts can change the document height after it opens.
let layoutFrame = 0;

function scheduleLayout() {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(updateLayout);
}

const layoutObserver = new ResizeObserver(scheduleLayout);
layoutObserver.observe(document.body);

const container = document.querySelector(".container");

if (container) {
  layoutObserver.observe(container);
}

window.addEventListener("load", scheduleLayout);

if (document.fonts) {
  document.fonts.ready.then(scheduleLayout);
}

/**
 * Mouse parallax
 */
const cursor = { x: 0, y: 0 };

if (!lightweight) {
  window.addEventListener("mousemove", (event) => {
    cursor.x = event.clientX / sizes.width - 0.5;
    cursor.y = event.clientY / sizes.height - 0.5;
  });

  document.addEventListener("mouseleave", () => {
    cursor.x = 0;
    cursor.y = 0;
  });
}

/**
 * Animation
 */
let previousTime = null;
let lastRenderTime = -Infinity;

function tick(time) {
  requestAnimationFrame(tick);

  // Render at approximately 30 FPS on smaller/touch devices.
  if (lightweight && time - lastRenderTime < 1000 / 30) {
    return;
  }

  lastRenderTime = time;

  const deltaTime =
    previousTime === null
      ? 0
      : Math.min((time - previousTime) / 1000, 0.05);

  previousTime = time;

  // Scroll the camera through the full background.
  camera.position.y = -window.scrollY * worldUnitsPerPixel;

  // Gentle desktop parallax.
  const smoothing = 1 - Math.exp(-5 * deltaTime);

  cameraGroup.position.x +=
    (cursor.x * 0.15 - cameraGroup.position.x) * smoothing;

  cameraGroup.position.y +=
    (-cursor.y * 0.15 - cameraGroup.position.y) * smoothing;

  for (const model of models) {
    if (!model.group) continue;

    model.group.rotation.x += deltaTime * 0.08;
    model.group.rotation.y += deltaTime * 0.16;
  }

  renderer.render(scene, camera);
}

updateLayout();
loadModels();
requestAnimationFrame(tick);