// threeScene.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let trajectoryLine, ballMesh;
let debugEl = null;

function debug(msg) {
    console.log(msg);
    if (!debugEl) {
        debugEl = document.getElementById('debugLog');
        if (debugEl) debugEl.style.display = 'block';
    }
    if (debugEl) {
        debugEl.innerHTML += new Date().toLocaleTimeString() + ' - ' + msg + '<br>';
        debugEl.scrollTop = debugEl.scrollHeight;
    }
}

export function initScene(canvasId) {
    try {
        debug('initScene called');
        const canvas = document.getElementById(canvasId);
        if (!canvas) { debug('ERROR: Canvas not found'); return; }
        const container = canvas.parentElement;
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        canvas.width = width;
        canvas.height = height;
        debug(`Canvas size: ${width}x${height}`);

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a141d);

        // Camera
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(30, 25, -50);
        camera.lookAt(0, 5, 150);

        // Renderer
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 5, 150);
        controls.update();

        // Lights
        const ambient = new THREE.AmbientLight(0x404060);
        scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(10, 20, 10);
        scene.add(dir);

        // Ground grid
        const grid = new THREE.GridHelper(800, 80, 0x33663b, 0x224428);
        grid.position.set(0, 0, 200);
        scene.add(grid);

        // TEST: Red sphere to confirm rendering works
        const sphereGeo = new THREE.SphereGeometry(3, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const testSphere = new THREE.Mesh(sphereGeo, sphereMat);
        testSphere.position.set(0, 3, 50);
        scene.add(testSphere);
        debug('Added red test sphere at (0,3,50)');

        renderer.render(scene, camera);
        debug('Scene initialized successfully!');

        // Handle resize
        window.addEventListener('resize', () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w > 0 && h > 0) {
                canvas.width = w;
                canvas.height = h;
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
                renderer.render(scene, camera);
            }
        });
    } catch (e) {
        debug('ERROR in initScene: ' + e.message);
        console.error(e);
    }
}

export function updateTrajectory(points) {
    try {
        debug('updateTrajectory called with ' + (points ? points.length : 0) + ' points');
        if (!scene) { debug('ERROR: Scene not initialized'); return; }
        if (!points || points.length === 0) { debug('No points to display'); return; }

        if (trajectoryLine) { scene.remove(trajectoryLine); }
        if (ballMesh) { scene.remove(ballMesh); }

        // Build trajectory line
        const pts = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        const geometry = new THREE.BufferGeometry().setFromPoints(pts);
        const material = new THREE.LineBasicMaterial({ color: 0xffaa00, linewidth: 2 });
        trajectoryLine = new THREE.Line(geometry, material);
        scene.add(trajectoryLine);

        // Ball at end
        const last = pts[pts.length - 1];
        const sphereGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const sphereMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
        ballMesh = new THREE.Mesh(sphereGeo, sphereMat);
        ballMesh.position.copy(last);
        scene.add(ballMesh);

        // Auto-zoom
        const maxZ = Math.max(...pts.map(p => p.z)) || 10;
        const maxX = Math.max(...pts.map(p => p.x)) || 10;
        const dist = Math.max(maxX, maxZ, 30) * 1.2;
        camera.position.set(dist * 0.8, dist * 0.6, -dist * 0.8);
        controls.target.set(0, 0, maxZ * 0.5);
        controls.update();

        renderer.render(scene, camera);
        debug('Trajectory updated successfully!');
    } catch (e) {
        debug('ERROR in updateTrajectory: ' + e.message);
        console.error(e);
    }
}

export function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}