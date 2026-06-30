// Golfsimz V1 - Trajectory Data Bridge
// Connects Blazor (C# physics engine) to Three.js visualization

import { initScene, drawTrajectory, clearTrajectory, setPerspectiveView, setBirdseyeView, setBehindBallView } from './threeScene.js';
import { initBirdseye, plotShot, clearShot } from './birdseye.js';

let sceneReady = false;
let birdseyeReady = false;

/**
 * Initialize all visualization components
 * Called from Blazor via JS interop
 */
export function initializeVisualization() {
    try {
        initScene('three-canvas');
        sceneReady = true;
        console.log('Three.js scene initialized');
    } catch (err) {
        console.error('Failed to initialize 3D scene:', err);
    }

    try {
        initBirdseye('birdseye-canvas');
        birdseyeReady = true;
        console.log('Birdseye view initialized');
    } catch (err) {
        console.error('Failed to initialize birdseye:', err);
    }
}

/**
 * Display a full trajectory from C# simulation data
 * @param {Object} data - JSON from GolfBallEngine
 * @param {Array} data.trajectory - Array of {x, y, z} world points (3D)
 * @param {number} data.carry - Carry distance in yards
 * @param {number} data.totalDistance - Total distance
 * @param {number} data.lateralDeviation - Side deviation
 */
export function displayTrajectory(data) {
    if (!sceneReady) {
        console.warn('Scene not initialized yet');
        return;
    }

    const trajectoryData = typeof data === 'string' ? JSON.parse(data) : data;

    // 3D arc
    if (trajectoryData.trajectory && trajectoryData.trajectory.length > 0) {
        drawTrajectory(trajectoryData.trajectory);
    }

    // Birdseye (top-down: x vs z)
    if (birdseyeReady && trajectoryData.trajectory) {
        const topDownPoints = trajectoryData.trajectory.map(p => ({ x: p.x, z: p.z }));
        plotShot(
            topDownPoints,
            trajectoryData.carry,
            trajectoryData.lateralDeviation || 0
        );
    }
}

/**
 * Clear all visualizations
 */
export function clearVisualization() {
    if (sceneReady) {
        clearTrajectory();
    }
    if (birdseyeReady) {
        clearShot();
    }
}

/**
 * Change camera view
 * @param {string} view - 'perspective', 'birdseye', or 'behind'
 */
export function changeView(view) {
    if (!sceneReady) return;

    switch (view) {
        case 'perspective':
            setPerspectiveView();
            break;
        case 'birdseye':
            setBirdseyeView();
            break;
        case 'behind':
            setBehindBallView();
            break;
        default:
            setPerspectiveView();
    }
}

// Make functions globally accessible for Blazor JS interop
window.trajectoryPlot = {
    initializeVisualization,
    displayTrajectory,
    clearVisualization,
    changeView,
};
