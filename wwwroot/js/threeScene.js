// Golfsimz V1 - Three.js 3D Scene Manager
// Handles: terrain, ball flight arc, camera controls

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let terrain, ball, trajectoryLine;
let isInitialized = false;

// Default scene objects
let gridHelper, axesHelper, light;

/**
 * Initialize the 3D scene
 */
export function initScene(canvasId = 'three-canvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Canvas element not found:', canvasId);
        return;
    }

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.Fog(0x0a0a0f, 200, 500);

    // Camera
    camera = new THREE.PerspectiveCamera(
        50,                             // FOV
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 30, 60);
    camera.lookAt(150, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true 
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(150, 5, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.2;   // Prevent going underground
    controls.minDistance = 20;
    controls.maxDistance = 200;
    controls.update();

    // Lighting
    setupLighting();

    // Ground / Terrain
    setupTerrain();

    // Grid & Axes for reference
    gridHelper = new THREE.GridHelper(400, 40, 0x2a2a40, 0x1a1a2e);
    scene.add(gridHelper);

    axesHelper = new THREE.AxesHelper(10);
    // scene.add(axesHelper);  // Uncomment for debug

    // Ball placeholder
    setupBall();

    // Trajectory line placeholder
    setupTrajectoryLine();

    // Tee marker
    setupTee();

    // Handle window resize
    window.addEventListener('resize', onResize);

    isInitialized = true;
    animate();
}

function setupLighting() {
    // Ambient
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);

    // Directional (sun)
    light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(100, 80, 20);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 300;
    light.shadow.camera.left = -100;
    light.shadow.camera.right = 200;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -10;
    scene.add(light);

    // Hemisphere light for natural feel
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362907, 0.4);
    scene.add(hemi);
}

function setupTerrain() {
    const geometry = new THREE.PlaneGeometry(400, 200, 100, 50);
    
    // Slight undulation
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        vertices[i + 2] = Math.sin(x * 0.02) * Math.cos(y * 0.03) * 1.5;
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: 0x2d5a1e,
        roughness: 0.85,
        metalness: 0.05,
        flatShading: false,
    });

    terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(150, -0.5, 0);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Fairway strip
    const fairwayGeo = new THREE.PlaneGeometry(20, 300);
    const fairwayMat = new THREE.MeshStandardMaterial({
        color: 0x3d7a2a,
        roughness: 0.7,
        metalness: 0.02,
    });
    const fairway = new THREE.Mesh(fairwayGeo, fairwayMat);
    fairway.rotation.x = -Math.PI / 2;
    fairway.position.set(150, -0.45, 0);
    fairway.receiveShadow = true;
    scene.add(fairway);
}

function setupBall() {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.1,
    });
    ball = new THREE.Mesh(geometry, material);
    ball.position.set(0, 0.5, 0);
    ball.castShadow = true;
    ball.visible = true;
    scene.add(ball);
}

function setupTrajectoryLine() {
    const material = new THREE.LineBasicMaterial({ color: 0x00d4ff });
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    trajectoryLine = new THREE.Line(geometry, material);
    scene.add(trajectoryLine);
}

function setupTee() {
    const teeGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.6, 8);
    const teeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const tee = new THREE.Mesh(teeGeo, teeMat);
    tee.position.set(0, 0.3, 0);
    tee.castShadow = true;
    scene.add(tee);
}

/**
 * Draw a trajectory arc from simulation data points
 * @param {Array} points - Array of {x, y, z} objects
 */
export function drawTrajectory(points) {
    if (!trajectoryLine) return;

    const vec3Points = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
    
    // Update trajectory
    const geometry = new THREE.BufferGeometry().setFromPoints(vec3Points);
    trajectoryLine.geometry.dispose();
    trajectoryLine.geometry = geometry;

    // Update ball position to apex of trajectory
    if (ball && points.length > 0) {
        const apex = points.reduce((max, p) => p.y > max.y ? p : max, points[0]);
        ball.position.set(apex.x, apex.y, apex.z);
    }
}

/**
 * Clear the trajectory line
 */
export function clearTrajectory() {
    if (trajectoryLine) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0)
        ]);
        trajectoryLine.geometry.dispose();
        trajectoryLine.geometry = geometry;
    }
    if (ball) {
        ball.position.set(0, 0.5, 0);
    }
}

/**
 * Set camera to perspective view (default)
 */
export function setPerspectiveView() {
    if (!camera || !controls) return;
    controls.target.set(150, 5, 0);
    camera.position.set(0, 30, 60);
    camera.lookAt(150, 5, 0);
    controls.update();
}

/**
 * Set camera to top-down birdseye view
 */
export function setBirdseyeView() {
    if (!camera || !controls) return;
    controls.target.set(150, 0, 0);
    camera.position.set(150, 80, 0);
    camera.lookAt(150, 0, 0);
    controls.update();
}

/**
 * Set camera to behind-the-ball view
 */
export function setBehindBallView() {
    if (!camera || !controls) return;
    controls.target.set(100, 5, 0);
    camera.position.set(-10, 8, 5);
    camera.lookAt(100, 5, 0);
    controls.update();
}

function onResize() {
    const canvas = renderer.domElement;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Export for external access
export { scene, camera, renderer, controls, ball };
