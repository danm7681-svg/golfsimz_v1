// Golfsimz V1 - Birdseye View (2D Mini-Map)
// Renders a top-down view of the shot on a separate canvas

let birdseyeCanvas;
let ctx;
let isInitialized = false;

// Config
const CONFIG = {
    scale: 0.5,          // pixels per yard
    originX: 40,         // tee position X in canvas pixels
    originY: 200,        // tee position Y in canvas pixels
    fairwayWidth: 30,    // yards
    totalDistance: 350,  // yards shown
};

/**
 * Initialize the birdseye canvas
 */
export function initBirdseye(canvasId = 'birdseye-canvas') {
    birdseyeCanvas = document.getElementById(canvasId);
    if (!birdseyeCanvas) {
        console.error('Birdseye canvas not found:', canvasId);
        return;
    }

    ctx = birdseyeCanvas.getContext('2d');
    isInitialized = true;

    // Fit canvas to container
    resizeBirdseye();
    window.addEventListener('resize', resizeBirdseye);

    drawBaseMap();
}

function resizeBirdseye() {
    if (!birdseyeCanvas) return;
    const parent = birdseyeCanvas.parentElement;
    birdseyeCanvas.width = parent.clientWidth;
    birdseyeCanvas.height = parent.clientHeight;
    drawBaseMap();
}

/**
 * Draw the static base map (fairway, markers, etc.)
 */
function drawBaseMap() {
    if (!ctx || !birdseyeCanvas) return;

    const w = birdseyeCanvas.width;
    const h = birdseyeCanvas.height;
    const scale = w / (CONFIG.totalDistance * 1.15);  // Auto-scale

    ctx.clearRect(0, 0, w, h);

    // Background grass
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(0, 0, w, h);

    const originX = 40;
    const originY = h / 2;

    // Fairway
    const fwHalf = (CONFIG.fairwayWidth / 2) * scale;
    ctx.fillStyle = '#2d5a1e';
    ctx.beginPath();
    ctx.moveTo(originX, originY - fwHalf);
    ctx.lineTo(w - 20, originY - fwHalf * 0.8);
    ctx.lineTo(w - 20, originY + fwHalf * 0.8);
    ctx.lineTo(originX, originY + fwHalf);
    ctx.closePath();
    ctx.fill();

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(w - 20, originY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Distance markers
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px sans-serif';
    for (let d = 50; d <= CONFIG.totalDistance; d += 50) {
        const x = originX + d * scale;
        ctx.fillText(`${d}y`, x - 12, originY - fwHalf - 8);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, originY - fwHalf);
        ctx.lineTo(x, originY + fwHalf);
        ctx.stroke();
    }

    // Tee box marker
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(originX - 5, originY - fwHalf, 10, fwHalf * 2);

    // Store computed values for later use
    birdseyeCanvas._scale = scale;
    birdseyeCanvas._originX = originX;
    birdseyeCanvas._originY = originY;
}

/**
 * Plot a shot trajectory and landing point
 * @param {Array} points - Array of {x, z} world-space positions (top-down)
 * @param {number} carry - Carry distance in yards
 * @param {number} lateralDeviation - Side deviation in yards (negative = left)
 */
export function plotShot(points, carry, lateralDeviation) {
    if (!isInitialized || !birdseyeCanvas) return;

    drawBaseMap();  // Clear and redraw base

    const scale = birdseyeCanvas._scale;
    const originX = birdseyeCanvas._originX;
    const originY = birdseyeCanvas._originY;

    // Draw trajectory line
    if (points && points.length > 1) {
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 212, 255, 0.6)';
        ctx.shadowBlur = 6;
        ctx.beginPath();

        const firstPoint = points[0];
        ctx.moveTo(
            originX + firstPoint.x * scale,
            originY + firstPoint.z * scale
        );

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(
                originX + points[i].x * scale,
                originY + points[i].z * scale
            );
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Landing point
        const last = points[points.length - 1];
        const landingX = originX + last.x * scale;
        const landingY = originY + last.z * scale;

        // Outer ring
        ctx.fillStyle = 'rgba(0, 212, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(landingX, landingY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Inner dot
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(landingX, landingY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Carry distance label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`${carry.toFixed(0)}y`, landingX + 12, landingY - 6);
        ctx.fillText(`${lateralDeviation > 0 ? 'R' : 'L'} ${Math.abs(lateralDeviation).toFixed(1)}y`, landingX + 12, landingY + 10);
    }
}

/**
 * Clear the shot from the map
 */
export function clearShot() {
    drawBaseMap();
}
