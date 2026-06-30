// --- Start of tracer.js ---

// Global state variables
window.scene = null;
window.camera = null;
window.renderer = null;
window.controls = null;
window.line = null;
window.ballMesh = null;
let shotHistory = [];

window.init3DTracer = function(canvasId) {
    console.log("init3DTracer: Attempting to initialize...");

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Canvas element not found: " + canvasId);
        return;
    }

    const container = canvas.parentElement;
    window.scene = new THREE.Scene();
    window.scene.background = new THREE.Color(0x87CEEB); // Blue sky fallback

    window.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    window.camera.position.set(20, 5, 0); // Side-on view

    window.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    window.renderer.setSize(container.clientWidth, container.clientHeight);
    window.renderer.setPixelRatio(window.devicePixelRatio);

    window.controls = new THREE.OrbitControls(window.camera, window.renderer.domElement);
    window.controls.target.set(0, 1, 40); // Looking at the range
    window.controls.update();

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    window.scene.add(ambient);

    // Texture Loader
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/images/range.jpg', (texture) => {
        window.scene.background = texture;
        window.scene.environment = texture;
        window.renderer.render(window.scene, window.camera);
    });

    window.renderer.render(window.scene, window.camera);
    console.log("init3DTracer: Success.");
};

window.update3DTracer = function(pointsJson) {
    if (!window.scene) { console.error("Scene not initialized"); return; }

    try {
        const points = JSON.parse(pointsJson);
        const threePoints = points.map(p => new THREE.Vector3(p.OfflineYds, (p.AltitudeFt / 3.28084) + 0.1, p.DownrangeYds));

        const geometry = new THREE.BufferGeometry().setFromPoints(threePoints);
        window.line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 }));
        window.scene.add(window.line);

        window.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(1.0), new THREE.MeshStandardMaterial({ color: 0x0000ff }));
        window.ballMesh.position.copy(threePoints[threePoints.length - 1]);
        window.scene.add(window.ballMesh);

        window.renderer.render(window.scene, window.camera);
    } catch(e) { console.error("Update Error:", e); }
};

// --- End of tracer.js ---