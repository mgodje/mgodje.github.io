import * as THREE from "three";
import GUI from "lil-gui";
import gsap from "gsap";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Debug
 */
// const gui = new GUI()

const parameters = {
  materialColor: "#ffeded",
};

// gui
//     .addColor(parameters, 'materialColor')
//     .onChange(() =>
//     {
//         material.color.set(parameters.materialColor)
//         particlesMaterial.color.set(parameters.materialColor)
//     })
//     // hide controls display entirely
//     .hide()

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Objects
 */
// Texture
const textureLoader = new THREE.TextureLoader();
const gradientTexture = textureLoader.load("textures/gradients/3.jpg");
gradientTexture.magFilter = THREE.NearestFilter;

// Material
const material = new THREE.MeshToonMaterial({
  color: parameters.materialColor,
  gradientMap: gradientTexture,
});

let sectionMeshes = [];

// Objects
const objectsDistance = 4;

const loader = new GLTFLoader();

// Load Moon Model
// "Moon" (https://skfb.ly/6TwGU) by Akshat is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
let moon; // Variable to store moon object
loader.load(
  "./moon_model/scene.gltf",
  (gltf) => {
    moon = gltf.scene;
    moon.scale.set(0.009, 0.009, 0.009); // Adjust size
    moon.position.set(0, 0, 2); // Adjust position

    scene.add(moon);
    sectionMeshes.push(moon); // Add the Moon to sectionMeshes after loading
  },
  undefined,
  (error) => {
    console.error("Error loading Moon model:", error);
  }
);

// Load Earth Model
// "Hello World!" (https://skfb.ly/oSGTw) by Mateusz Kołakowski is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
let earth; // Variable to store earth object
loader.load(
  "./earth_model/scene.gltf",
  (gltf) => {
    earth = gltf.scene;
    earth.scale.set(0.00001, 0.00001, 0.00001); // Adjust size
    earth.position.set(0, -2.5, 2); // Adjust position

    scene.add(earth);
    sectionMeshes.push(earth); // Add the Earth to sectionMeshes after loading
  },
  undefined,
  (error) => {
    console.error("Error loading Earth model:", error);
  }
);

// Load Sun model
// "Sun" (https://skfb.ly/6yGSx) by SebastianSosnowski is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
let sun; // Variable to store sun object
loader.load(
  "./sun_model/scene.gltf",
  (gltf) => {
    sun = gltf.scene;
    sun.scale.set(0.09, 0.09, 0.09); // Adjust size
    //Adjust this based on the width of the screen
    sun.position.set(0, -6, 2); // Adjust position

    scene.add(sun);
    sectionMeshes.push(sun); // Add the Sun to sectionMeshes after loading
  },
  undefined,
  (error) => {
    console.error("Error loading Sun model:", error);
  }
);

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight("#ffffff", 3);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight("#ffffff", 1.5);
scene.add(ambientLight);

/**
 * Particles
 */
// Geometry
const particlesCount = 400;
const positions = new Float32Array(particlesCount * 3);

for (let i = 0; i < particlesCount; i++) {
  positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
  positions[i * 3 + 1] =
    objectsDistance * 0.5 -
    Math.random() * objectsDistance * (sectionMeshes.length + 5.75);
  positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
}

const particlesGeometry = new THREE.BufferGeometry();
particlesGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(positions, 3)
);

// Material
const particlesMaterial = new THREE.PointsMaterial({
  color: parameters.materialColor,
  sizeAttenuation: true,
  size: 0.03,
});

// Points
const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Group
const cameraGroup = new THREE.Group();
scene.add(cameraGroup);

// Base camera
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
  canvas: canvas,
  alpha: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Scroll
 */
let scrollY = window.scrollY;
let currentSection = 0;

window.addEventListener("scroll", () => {
  scrollY = window.scrollY;
  const newSection = Math.round(scrollY / sizes.height);

  if (newSection !== currentSection) {
    currentSection = newSection;

    const targetMesh = sectionMeshes[currentSection]; // Get the current mesh

    if (targetMesh) {
      // Check if the mesh exists
      gsap.to(targetMesh.rotation, {
        duration: 1.5,
        ease: "power2.inOut",
        x: "+=6",
        y: "+=3",
        z: "+=1.5",
      });
    }
  }
});

/**
 * Cursor
 */
const cursor = {};
cursor.x = 0;
cursor.y = 0;

window.addEventListener("mousemove", (event) => {
  cursor.x = event.clientX / sizes.width - 0.7;
  cursor.y = event.clientY / sizes.height - 0.7;
});

/**
 * Animate
 */
const clock = new THREE.Clock();
let previousTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousTime;
  previousTime = elapsedTime;

  // Animate camera
  camera.position.y = (-scrollY / sizes.height) * objectsDistance;

  const parallaxX = cursor.x * 0.7;
  const parallaxY = -cursor.y * 0.7;
  cameraGroup.position.x +=
    (parallaxX - cameraGroup.position.x) * 7 * deltaTime;
  cameraGroup.position.y +=
    (parallaxY - cameraGroup.position.y) * 7 * deltaTime;

  // Animate meshes
  for (const mesh of sectionMeshes) {
    mesh.rotation.x += deltaTime * 0.1;
    mesh.rotation.y += deltaTime * 0.12;
  }

  // animate moon
  if (moon) {
    moon.rotation.x += deltaTime * 0.09;
    moon.rotation.y += deltaTime * 0.06;
  }

  // animate earth
  if (earth) {
    earth.rotation.x += deltaTime * 0.09;
    earth.rotation.y += deltaTime * 0.06;
  }

  // animate sun
  if (sun) {
    sun.rotation.x += deltaTime * 0.09;
    sun.rotation.y += deltaTime * 0.06;
  }

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
