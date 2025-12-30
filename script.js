// DOM Elements
const canvas = document.getElementById('constellation-canvas');
const ctx = canvas.getContext('2d');

// Canvas Configuration
let width, height;
let particles = [];
let particleCount;
const connectionDistance = 120; // Distance to connect particles
const mouseDistance = 250; // Grab radius

// Warp Effect State
let warpFactor = 0; // 0 = normal, 1 = full warp
let targetWarpFactor = 0;
let currentEffect = 'warp'; // 'warp', 'slide', 'twist', 'fall'
let animationDirection = 1; // 1 = forward, -1 = backward
let isTransitioning = false; // Flag to prevent particle resets during transitions

// Limit mouse connections to avoid clutter
const maxMouseConnections = 8;

// Mouse State
let mouse = { x: null, y: null };
let rawMouse = { x: null, y: null }; // Raw clientX/clientY for canvas transformations

// Resize Canvas
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    // High Density Calculation
    // Optimized: Increased divisor from 4000 to 8000 to reduce particle count for better performance
    const targetCount = Math.max(30, Math.floor((width * height) / 8000));
    
    // Smoothly adjust particle count without wiping
    if (particles.length < targetCount) {
        // Add particles
        const diff = targetCount - particles.length;
        for (let i = 0; i < diff; i++) {
            particles.push(new Particle());
        }
    } else if (particles.length > targetCount) {
        // Remove particles
        particles.splice(targetCount);
    }
    
    particleCount = targetCount;
}

// Particle Class
class Particle {
    constructor() {
        this.reset();
        // Randomize z initially to fill the volume
        this.z = Math.random() * 2.8 + 0.2;
        // Save initial state for restoration after transitions
        this.saveState();
    }

    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.z = 3.0; // Start far away
        
        // Velocity scales with depth
        const speedBase = (Math.random() - 0.5) * 0.5;
        this.vx = speedBase;
        this.vy = speedBase;
        
        this.size = Math.random() * 1.5;
    }
    
    saveState() {
        this.savedX = this.x;
        this.savedY = this.y;
        this.savedZ = this.z;
        this.savedVx = this.vx;
        this.savedVy = this.vy;
    }
    
    restoreState() {
        this.x = this.savedX;
        this.y = this.savedY;
        this.z = this.savedZ;
        this.vx = this.savedVx;
        this.vy = this.savedVy;
    }

    update() {
        // During transitions, use temporary visual positions but don't permanently modify
        if (isTransitioning && warpFactor > 0.05) {
            // Store offset for visual effect only
            this.updateTransitionEffect();
            return;
        }
        
        // Idle State (Low Warp) - Gentle Drift
        if (warpFactor < 0.05) {
            this.z -= 0.002; // Slow forward drift
            // Wrap Z instead of resetting to prevent regeneration
            if (this.z <= 0.1) {
                this.z = 2.8;
            }
            // Standard drift
            this.x += this.vx * this.z;
            this.y += this.vy * this.z;
            
            // Wrap
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
            
            // Update saved state during idle to keep constellation stable
            this.saveState();
            return;
        }

        // Active Transition State (when not using isTransitioning flag)
        let speedMultiplier = 1 + (warpFactor * 20);
        
        if (currentEffect === 'warp') {
            this.z -= 0.01 * speedMultiplier * animationDirection;
            if (this.z <= 0.1) this.z = 2.8;
            if (this.z >= 3.0) this.z = 0.2;
            this.x += this.vx * this.z * speedMultiplier * animationDirection;
            this.y += this.vy * this.z * speedMultiplier * animationDirection;
        } 
        else if (currentEffect === 'slide') {
            this.z -= 0.01 * speedMultiplier * animationDirection;
            const time = Date.now() * 0.005;
            this.x += Math.cos(this.z * 12 + time) * 3 * speedMultiplier * animationDirection;
            this.y += Math.sin(this.z * 12 + time) * 3 * speedMultiplier * animationDirection;
            if (this.z <= 0.1) this.z = 2.8;
            if (this.z >= 3.0) this.z = 0.2;
        }
        else if (currentEffect === 'twist') {
            const cx = width / 2;
            const cy = height / 2;
            const dx = this.x - cx;
            const dy = this.y - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const angle = Math.atan2(dy, dx);
            const spinSpeed = 0.02 * speedMultiplier * (1 + (100/Math.max(dist, 50))) * animationDirection; 
            const newAngle = angle + spinSpeed;
            this.x = cx + Math.cos(newAngle) * dist;
            this.y = cy + Math.sin(newAngle) * dist;
        }
        else if (currentEffect === 'ascend') {
            this.z -= 0.002; 
            if (this.z <= 0.1) this.z = 2.8;
            this.x += this.vx * this.z;
            this.y += this.vy * this.z;
        }

        // Boundary Checks (Wrap around)
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
    }
    
    updateTransitionEffect() {
        // Visual-only effect during transitions - modifies display position temporarily
        let speedMultiplier = 1 + (warpFactor * 15);
        
        if (currentEffect === 'warp') {
            this.transitionZ = (this.transitionZ || this.z) - 0.01 * speedMultiplier * animationDirection;
            if (this.transitionZ <= 0.1) this.transitionZ = 2.8;
            if (this.transitionZ >= 3.0) this.transitionZ = 0.2;
        } 
        else if (currentEffect === 'slide') {
            this.transitionZ = (this.transitionZ || this.z) - 0.01 * speedMultiplier * animationDirection;
            if (this.transitionZ <= 0.1) this.transitionZ = 2.8;
            if (this.transitionZ >= 3.0) this.transitionZ = 0.2;
        }
        else if (currentEffect === 'twist') {
            // Just spin visually without modifying actual position
            this.transitionAngle = (this.transitionAngle || 0) + 0.02 * speedMultiplier * animationDirection;
        }
        else if (currentEffect === 'ascend') {
            this.transitionZ = (this.transitionZ || this.z) - 0.002;
            if (this.transitionZ <= 0.1) this.transitionZ = 2.8;
        }
    }

    draw() {
        ctx.beginPath();
        
        // Use transition positions if in transition mode
        let drawX = this.x;
        let drawY = this.y;
        let drawZ = this.z;
        
        if (isTransitioning && warpFactor > 0.05) {
            if (currentEffect === 'twist' && this.transitionAngle) {
                // Apply visual rotation for twist effect
                const cx = width / 2;
                const cy = height / 2;
                const dx = this.x - cx;
                const dy = this.y - cy;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const baseAngle = Math.atan2(dy, dx);
                const newAngle = baseAngle + this.transitionAngle;
                
                // Suction Effect: Pull into center based on warpFactor
                // Stars get sucked into the black hole (center)
                // ACCELERATION: Use power function so it starts slow and speeds up visibly
                const suctionProgress = Math.pow(warpFactor, 2); 
                const suctionScale = Math.max(0.01, 1 - (suctionProgress * 1.2));
                
                drawX = cx + Math.cos(newAngle) * (dist * suctionScale);
                drawY = cy + Math.sin(newAngle) * (dist * suctionScale);
            }
            if (this.transitionZ) {
                drawZ = this.transitionZ;
            }
        }
        
        // Perspective scale (only for trails/movement, not size)
        const scale = 1 / drawZ; 
        
        // Fixed size (User Request: don't expand)
        const actualSize = Math.max(0.5, this.size); 

        // Alpha based on depth
        let alpha = (1 - (drawZ / 3.0));
        if (drawZ < 0.8) alpha *= (drawZ / 0.8); 

        // Draw Trails based on Effect
        if (warpFactor > 0.1) {
             ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
             ctx.lineWidth = actualSize; 

             if (currentEffect === 'warp') {
                 const trailLen = warpFactor * 50 * scale;
                 const angle = Math.atan2(drawY - height/2, drawX - width/2);
                 
                 // Reverse trail direction if moving backward
                 const dir = animationDirection;
                 const tx = drawX - Math.cos(angle) * trailLen * dir;
                 const ty = drawY - Math.sin(angle) * trailLen * dir;
                 
                 ctx.moveTo(drawX, drawY);
                 ctx.lineTo(tx, ty);
                 ctx.stroke();
             } 
             else if (currentEffect === 'slide') {
                 // Helix - just dots
                 ctx.arc(drawX, drawY, actualSize, 0, Math.PI * 2);
                 ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                 ctx.fill();
             }
             else if (currentEffect === 'ascend') {
                 // Standard draw for ascend (no special effects)
                 ctx.arc(drawX, drawY, actualSize, 0, Math.PI * 2);
                 ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                 ctx.fill();
             }
             else {
                 // Twist - Spiral Trails (Spaghettification)
                 const cx = width / 2;
                 const cy = height / 2;
                 
                 // Calculate tail position for speed effect
                 const currentAngle = Math.atan2(drawY - cy, drawX - cx);
                 const currentDist = Math.sqrt(Math.pow(drawX - cx, 2) + Math.pow(drawY - cy, 2));
                 
                 // Tail lags behind and is further out
                 const tailLag = 0.1 + (warpFactor * 0.2);
                 const stretchFactor = 1.1 + (warpFactor * 0.8); // Stretch more as they speed up
                 
                 const tailAngle = currentAngle - (tailLag * animationDirection);
                 const tailDist = currentDist * stretchFactor;
                 
                 const tailX = cx + Math.cos(tailAngle) * tailDist;
                 const tailY = cy + Math.sin(tailAngle) * tailDist;
                 
                 ctx.beginPath();
                 ctx.moveTo(drawX, drawY);
                 ctx.lineTo(tailX, tailY);
                 ctx.stroke();
             }
        } else {
            ctx.arc(drawX, drawY, actualSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
        }
    }
}

// Initialize Particles
function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

// Planet/Celestial Logic
const planetCanvas = document.getElementById('planet-canvas');
const pCtx = planetCanvas.getContext('2d');
let planetRotation = 0;
let celestialBodyType = 'none'; // 'planet', 'blackhole'
let smoothMouse = { x: 0, y: 0 };

function drawCelestialBody() {
    // Ensure canvas size matches
    if (planetCanvas.width !== width) {
        planetCanvas.width = width;
        planetCanvas.height = height;
    }

    if (!document.body.classList.contains('show-planet')) {
        pCtx.clearRect(0, 0, width, height);
        return;
    }

    pCtx.clearRect(0, 0, width, height);
    
    let cx = width / 2;
    const cy = height / 2;
    
    planetRotation += 0.002;

    if (celestialBodyType === 'planet') {
        // Shift planet to the right for Experience section
        cx = width * 0.75;
        const baseRadius = Math.min(width, height) * 0.28; // Slightly larger
        const time = Date.now() * 0.0008; // Slower, heavier feel
        
        // Smooth Mouse Interaction
        let targetX = 0;
        let targetY = 0;
        
        if (mouse.x != null) {
            // Normalize mouse position relative to planet center
            targetX = (mouse.x - cx) * 0.001;
            targetY = (mouse.y - cy) * 0.001;
        }
        
        // Lerp towards target (Smoothing)
        // 0.05 = very smooth/slow, 0.1 = responsive
        smoothMouse.x += (targetX - smoothMouse.x) * 0.05;
        smoothMouse.y += (targetY - smoothMouse.y) * 0.05;
        
        let mx = smoothMouse.x;
        let my = smoothMouse.y;

        // Optimized: Reduced steps from 32/48 to 16/24 to improve rendering performance
        const latSteps = 16; 
        const lonSteps = 24; 
        let points = [];

        // 1. Generate Mesh Points
        for (let i = 0; i <= latSteps; i++) {
            const lat = (i / latSteps) * Math.PI - Math.PI / 2;
            points[i] = [];
            
            for (let j = 0; j <= lonSteps; j++) {
                const lon = (j / lonSteps) * Math.PI * 2;
                
                // Base Sphere Coordinates
                let x = Math.cos(lat) * Math.cos(lon);
                let y = Math.sin(lat);
                let z = Math.cos(lat) * Math.sin(lon);
                
                // Multi-layered Noise for "Bumpy" Organic Look
                // Layer 1: Large overall shape distortion
                let noise = Math.sin(x * 2 + time) * 0.2 + Math.cos(y * 2 + time) * 0.2;
                
                // Layer 2: Medium details
                noise += Math.sin(x * 6 + time * 1.5) * 0.1 + Math.cos(z * 6 + time * 1.5) * 0.1;
                
                // Layer 3: Fine texture (The "mesh" bumps)
                noise += Math.sin(x * 15 + y * 15 + time * 2) * 0.05;

                // Mouse influence (Push/Pull)
                const distToMouse = Math.sqrt((x - mx)**2 + (y - my)**2);
                // Smoother, wider range but gentler falloff
                if (distToMouse < 1.0) {
                    noise += (1.0 - distToMouse) * 0.6;
                }

                // Apply distortion
                const r = baseRadius * (1 + noise * 0.4);
                
                // Rotate the entire blob
                const rotLon = lon + planetRotation * 0.15;
                
                let rx = r * Math.cos(lat) * Math.cos(rotLon);
                let ry = r * Math.sin(lat);
                let rz = r * Math.cos(lat) * Math.sin(rotLon);
                
                // 3D Projection
                const scale = 1000 / (1000 - rz);
                const px = cx + rx * scale;
                const py = cy + ry * scale;
                
                points[i][j] = { x: px, y: py, z: rz };
            }
        }

        // 2. Generate Faces (Quads) & Sort by Depth
        let faces = [];
        for (let i = 0; i < latSteps; i++) {
            for (let j = 0; j < lonSteps; j++) {
                const p1 = points[i][j];
                const p2 = points[i + 1][j];
                const p3 = points[i + 1][j + 1];
                const p4 = points[i][j + 1];
                
                if (!p1 || !p2 || !p3 || !p4) continue;

                // Calculate average Z depth for sorting
                const avgZ = (p1.z + p2.z + p3.z + p4.z) / 4;
                faces.push({ p1, p2, p3, p4, z: avgZ });
            }
        }

        // Sort: Furthest Z first (Painter's Algorithm)
        faces.sort((a, b) => a.z - b.z);

        // 3. Draw Faces (Point Cloud Surface)
        faces.forEach(f => {
            pCtx.beginPath();
            pCtx.moveTo(f.p1.x, f.p1.y);
            pCtx.lineTo(f.p2.x, f.p2.y);
            pCtx.lineTo(f.p3.x, f.p3.y);
            pCtx.lineTo(f.p4.x, f.p4.y);
            pCtx.closePath();

            // Solid black fill to create the "void" core and occlude back points
            pCtx.fillStyle = '#000000';
            pCtx.fill();

            // Draw glowing dots at vertices instead of grid lines
            const brightness = ((f.z + baseRadius) / (2 * baseRadius));
            const alpha = Math.max(0.1, brightness);
            
            pCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            
            // Draw a dot at the first vertex of the face
            // This creates a stippled/point-cloud texture on the surface
            pCtx.fillRect(f.p1.x, f.p1.y, 1.5, 1.5);
        });
        
        pCtx.shadowBlur = 0;
    } else if (celestialBodyType === 'blackhole') {
        // Black Hole Logic
        cx = width / 2; // Center for Skills page
        
        const radius = Math.min(width, height) * 0.15;
        const accretionRadius = radius * 2.5;
        
        // Common Transform Setup
        const wobble = Math.sin(Date.now() * 0.001) * 0.1;
        const tilt = Math.PI / 6 + wobble;

        // 1. Draw BACK half of Accretion Disk (Behind the sphere)
        pCtx.save();
        pCtx.translate(cx, cy);
        pCtx.rotate(tilt);
        pCtx.scale(1, 0.3);
        
        for (let i = 0; i < 10; i++) {
            pCtx.beginPath();
            // Top half (Back) - Math.PI to 2*Math.PI
            pCtx.arc(0, 0, accretionRadius - (i * 5), Math.PI, 2 * Math.PI);
            
            pCtx.strokeStyle = `rgba(255, 255, 255, ${0.1 + (i * 0.05)})`;
            pCtx.lineWidth = 2;
            pCtx.setLineDash([20, 15]);
            const speed = 2 + (i * 0.5);
            pCtx.lineDashOffset = -planetRotation * 1500 * speed;
            pCtx.stroke();
        }
        pCtx.restore();
        
        // 2. Draw Event Horizon (Sphere)
        pCtx.beginPath();
        const pulse = Math.sin(Date.now() * 0.002) * 2;
        pCtx.arc(cx, cy, radius + pulse, 0, Math.PI * 2);
        pCtx.fillStyle = '#000';
        pCtx.fill();
        
        // White rim (Photon sphere)
        pCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        pCtx.lineWidth = 2;
        pCtx.setLineDash([]); // Reset dash
        pCtx.stroke();
        
        // Glow
        pCtx.shadowBlur = 20 + Math.abs(pulse * 2);
        pCtx.shadowColor = 'white';
        pCtx.stroke();
        pCtx.shadowBlur = 0;

        // 3. Draw FRONT half of Accretion Disk (In front of the sphere)
        pCtx.save();
        pCtx.translate(cx, cy);
        pCtx.rotate(tilt);
        pCtx.scale(1, 0.3);
        
        for (let i = 0; i < 10; i++) {
            pCtx.beginPath();
            // Bottom half (Front) - 0 to Math.PI
            pCtx.arc(0, 0, accretionRadius - (i * 5), 0, Math.PI);
            
            pCtx.strokeStyle = `rgba(255, 255, 255, ${0.1 + (i * 0.05)})`;
            pCtx.lineWidth = 2;
            pCtx.setLineDash([20, 15]);
            const speed = 2 + (i * 0.5);
            pCtx.lineDashOffset = -planetRotation * 1500 * speed;
            pCtx.stroke();
        }
        pCtx.restore();
    }
}

// Animation Loop
function animate() {
    ctx.clearRect(0, 0, width, height);

    // Smooth warp factor transition
    warpFactor += (targetWarpFactor - warpFactor) * 0.1;

    // Update and draw particles
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    // Draw Celestial Body
    drawCelestialBody();
    
    // Update Project Orbit
    updateProjectOrbit();

    // Connections (Only draw when not warping too fast AND not on Skills page AND not animating)
    if (warpFactor < 0.5 && currentSectionIndex !== 3 && !isAnimating) {
        // 1. Mouse Connections (Clutter-Free Logic)
        if (mouse.x != null) {
            // Find close particles efficiently
            let closeParticles = [];

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                // Skip background stars for mouse interaction
                if (p.z > 2.0) continue;

                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                // Quick bounding box check
                if (Math.abs(dx) > mouseDistance || Math.abs(dy) > mouseDistance) continue;

                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouseDistance) {
                    closeParticles.push({ particle: p, dist: distance });
                }
            }

            // Sort by distance and limit to local favorites
            closeParticles.sort((a, b) => a.dist - b.dist);
            const limit = Math.min(closeParticles.length, maxMouseConnections);

            for (let i = 0; i < limit; i++) {
                const { particle, dist } = closeParticles[i];
                ctx.beginPath();
                // Opacity fades with distance
                const alpha = (1 - dist / mouseDistance) * (1 - particle.z/3.0);
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }

        // 2. Inter-Particle Connections
        // Skip connections if we just finished a twist to avoid center clutter
        if (currentEffect !== 'twist' || warpFactor < 0.01) {
            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i];
                if (p1.z > 2.5) continue; // Skip faint stars

                // Optimization: fewer checks or just simple distance
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];

                    // Depth culling
                    if (Math.abs(p1.z - p2.z) > 0.5) continue;

                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;

                    if (Math.abs(dx) > connectionDistance || Math.abs(dy) > connectionDistance) continue;

                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < connectionDistance) {
                        ctx.beginPath();
                        const alpha = (1 - distance / connectionDistance) * 0.2;
                        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                        ctx.lineWidth = 0.2;
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }
        }
    }

    requestAnimationFrame(animate);
}

// Event Listeners for Canvas
window.addEventListener('resize', () => {
    resize();
    // initParticles(); // Removed to prevent regeneration on resize
});

// Event Listeners for Mouse Interactivity
document.addEventListener('mousemove', (e) => {
    // Store raw coordinates for canvas transformations
    rawMouse.x = e.clientX;
    rawMouse.y = e.clientY;
    
    // Canvas Offset Correction for main constellation
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

document.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
    rawMouse.x = null;
    rawMouse.y = null;
});


// --- NEW SCROLL LOGIC ---

let sections;
let currentSectionIndex = 0;
let isAnimating = false;
let scrollBuffer = 0;
const scrollThreshold = 200; // Increased threshold to prevent accidental scrolling
let scrollResetTimer;

// Initialize
function initScroll() {
    sections = document.querySelectorAll('section, footer');
    sections.forEach((section, index) => {
        if (index === 0) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
            section.classList.remove('past');
        }
    });
    // Set default effect
    document.body.classList.add('fx-warp');
}

function goToSection(index) {
    if (!sections || index < 0 || index >= sections.length || isAnimating) return;
    
    isAnimating = true;
    isTransitioning = true;
    const direction = index > currentSectionIndex ? 'down' : 'up';
    animationDirection = direction === 'down' ? 1 : -1;

    const currentSection = sections[currentSectionIndex];
    const nextSection = sections[index];

    // Determine Effect based on Destination
    let effect = 'warp';
    if (index <= 1) effect = 'warp';
    else if (index === 2) effect = 'slide';
    else if (index === 3) effect = 'twist';
    else if (index === 4) effect = 'ascend';

    currentEffect = effect;
    
    // Reset transition-specific properties on particles
    particles.forEach(p => {
        p.transitionZ = null;
        p.transitionAngle = null;
    });
    
    // Apply Body Class for CSS Transitions
    document.body.className = ''; 
    document.body.classList.add(`fx-${effect}`);
    
    // Celestial Body Logic
    let targetBody = 'none';
    if (index === 1) targetBody = 'planet';
    else if (index === 3) targetBody = 'blackhole';

    if (targetBody !== 'none') {
        celestialBodyType = targetBody;
        document.body.classList.add('show-planet');
    } else {
        document.body.classList.remove('show-planet');
        // Delay clearing the type so it fades out gracefully
        setTimeout(() => {
            // Only clear if we haven't switched back to a planet in the meantime
            if (!document.body.classList.contains('show-planet')) {
                celestialBodyType = 'none';
            }
        }, 1500);
    }

    // Init Contact Text if entering Contact section
    // (Handled by animateTextSystems loop now)

    // Trigger Warp
    targetWarpFactor = 1;
    setTimeout(() => { targetWarpFactor = 0; }, 800);

    if (direction === 'down') {
        // Moving Forward
        currentSection.classList.remove('active');
        currentSection.classList.add('past');
        
        nextSection.classList.add('active');
        nextSection.classList.remove('past'); 
    } else {
        // Moving Backward
        currentSection.classList.remove('active');
        
        nextSection.classList.remove('past');
        nextSection.classList.add('active');
    }

    currentSectionIndex = index;

    // Reset animation lock and restore particle states
    setTimeout(() => {
        isAnimating = false;
        isTransitioning = false;
        // Clear transition properties and let particles resume normal behavior
        particles.forEach(p => {
            p.transitionZ = null;
            p.transitionAngle = null;
        });
    }, 1200); 
}

// Wheel Event
window.addEventListener('wheel', (e) => {
    if (!sections) return;
    if (isAnimating) return;

    const currentSection = sections[currentSectionIndex];
    const contentWrapper = currentSection.querySelector('.section-content-wrapper');
    
    // Reset buffer if scrolling stops
    clearTimeout(scrollResetTimer);
    scrollResetTimer = setTimeout(() => {
        scrollBuffer = 0;
    }, 150);

    if (contentWrapper) {
        const scrollTop = contentWrapper.scrollTop;
        const scrollHeight = contentWrapper.scrollHeight;
        const clientHeight = contentWrapper.clientHeight;
        const isScrollable = scrollHeight > clientHeight;

        if (isScrollable) {
            if (e.deltaY > 0) {
                // Scrolling Down
                // Only accumulate buffer if we are AT THE BOTTOM
                if (scrollTop + clientHeight >= scrollHeight - 5) {
                    scrollBuffer += e.deltaY;
                } else {
                    scrollBuffer = 0; // Reset buffer if we are in the middle of content
                    return; // Let native scroll happen
                }
            } else {
                // Scrolling Up
                // Only accumulate buffer if we are AT THE TOP
                if (scrollTop <= 5) {
                    scrollBuffer += e.deltaY;
                } else {
                    scrollBuffer = 0;
                    return; // Let native scroll happen
                }
            }
        } else {
            // Not scrollable, accumulate immediately
            scrollBuffer += e.deltaY;
        }
    } else {
        scrollBuffer += e.deltaY;
    }

    // Trigger Navigation if Threshold Met
    // Dynamic threshold: Require more effort to leave scrollable sections (like Experience)
    let effectiveThreshold = scrollThreshold;
    if (contentWrapper && contentWrapper.scrollHeight > contentWrapper.clientHeight) {
        effectiveThreshold = 800; // 4x normal threshold for scrollable content
    }

    if (scrollBuffer > effectiveThreshold) {
        goToSection(currentSectionIndex + 1);
        scrollBuffer = 0;
    } else if (scrollBuffer < -effectiveThreshold) {
        goToSection(currentSectionIndex - 1);
        scrollBuffer = 0;
    }
}, { passive: true });

// Keyboard Navigation
window.addEventListener('keydown', (e) => {
    if (!sections) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        goToSection(currentSectionIndex + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        goToSection(currentSectionIndex - 1);
    }
});

// Navigation Links
document.querySelectorAll('nav a, .btn').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        if (!sections || isAnimating) return;
        
        const targetId = link.getAttribute('href').substring(1);
        
        // Find index of target section
        let targetIndex = -1;
        sections.forEach((sec, index) => {
            if (sec.id === targetId) targetIndex = index;
        });

        if (targetIndex !== -1) {
            if (targetIndex === currentSectionIndex) return;

            if (targetIndex > currentSectionIndex) {
                for (let i = currentSectionIndex; i < targetIndex; i++) {
                    sections[i].classList.add('past');
                    sections[i].classList.remove('active');
                }
            } else {
                for (let i = targetIndex + 1; i <= currentSectionIndex; i++) {
                    sections[i].classList.remove('past');
                    sections[i].classList.remove('active');
                }
            }
            
            goToSection(targetIndex);
        }
    });
});


// --- SKILLS CLOUD LOGIC ---

const skillsData = [
    { name: "Java", desc: "Enterprise-grade application development and backend systems." },
    { name: "Python", desc: "Data science, AI, automation, and backend development." },
    { name: "JavaScript / TypeScript", desc: "Modern frontend and backend web development." },
    { name: "C# / .NET", desc: "Enterprise software, game development, and web services." },
    { name: "C++", desc: "High-performance system programming and game engines." },
    { name: "React", desc: "Building interactive user interfaces and single-page applications." },
    { name: "Angular", desc: "Comprehensive framework for dynamic web apps." },
    { name: "Spring Boot", desc: "Rapid development of production-ready Java applications." },
    { name: "JSP", desc: "JavaServer Pages for dynamic web content generation." },
    { name: "OpenLiberty", desc: "Lightweight, open-source Java EE/Jakarta EE server." },
    { name: "WebSphere", desc: "Enterprise-level application server for secure, scalable apps." },
    { name: "Docker / Kubernetes", desc: "Containerization and orchestration for scalable deployments." },
    { name: "AWS / Azure", desc: "Cloud computing services and infrastructure management." },
    { name: "SQL / NoSQL", desc: "Relational and non-relational database management." },
    { name: "CI/CD", desc: "Continuous Integration and Deployment pipelines." },
    { name: "REST / GraphQL", desc: "API design and implementation for data exchange." },
    { name: "Microservices", desc: "Distributed architecture for scalable and maintainable systems." },
    { name: "Git", desc: "Version control and collaborative code management." }
];

const cloudContainer = document.getElementById('skills-cloud');
const detailOverlay = document.getElementById('skill-detail-overlay');
const skillTitle = document.getElementById('skill-title');
const skillDesc = document.getElementById('skill-desc');

let cloudRadius = 250;
let cloudRotation = { x: 0, y: 0 };
let isDragging = false;
let lastMouse = { x: 0, y: 0 };
let rotationMomentum = { x: 0, y: 0.002 }; // Start with passive rotation
let isHoveringSkill = false;

function initSkillsCloud() {
    if (!cloudContainer) return;

    // Fibonacci Sphere Algorithm for even distribution
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    skillsData.forEach((skill, i) => {
        const y = 1 - (i / (skillsData.length - 1)) * 2; // y goes from 1 to -1
        const radius = Math.sqrt(1 - y * y); // radius at y
        const theta = phi * i; // golden angle increment

        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;

        const el = document.createElement('div');
        el.className = 'skill-item';
        el.textContent = skill.name;
        
        // Store 3D coordinates
        el.dataset.x = x * cloudRadius;
        el.dataset.y = y * cloudRadius;
        el.dataset.z = z * cloudRadius;

        el.addEventListener('mouseenter', () => {
            isHoveringSkill = true;
            showSkillDetail(skill);
            el.classList.add('active');
        });

        el.addEventListener('mouseleave', () => {
            isHoveringSkill = false;
            hideSkillDetail();
            el.classList.remove('active');
        });

        cloudContainer.appendChild(el);
    });

    // Drag Events
    cloudContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouse.x = e.clientX;
        lastMouse.y = e.clientY;
        // Reset momentum so we have full control
        rotationMomentum = { x: 0, y: 0 };
        cloudContainer.style.cursor = 'grabbing';
        e.preventDefault(); // Prevent text selection
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - lastMouse.x;
        const deltaY = e.clientY - lastMouse.y;
        
        lastMouse.x = e.clientX;
        lastMouse.y = e.clientY;

        // Rotate based on drag
        // Sensitivity factor
        const sensitivity = 0.005;
        cloudRotation.y += deltaX * sensitivity;
        cloudRotation.x -= deltaY * sensitivity;

        // Keep track of momentum for release
        rotationMomentum.y = deltaX * sensitivity;
        rotationMomentum.x = -deltaY * sensitivity;
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            cloudContainer.style.cursor = 'grab';
        }
    });
    
    // Set initial cursor
    cloudContainer.style.cursor = 'grab';
}

function showSkillDetail(skill) {
    skillTitle.textContent = skill.name;
    skillDesc.textContent = skill.desc;
    detailOverlay.classList.add('visible');
}

function hideSkillDetail() {
    detailOverlay.classList.remove('visible');
}

function updateSkillsCloud() {
    if (!cloudContainer) return;

    if (!isDragging && !isHoveringSkill) {
        // Apply momentum
        cloudRotation.x += rotationMomentum.x;
        cloudRotation.y += rotationMomentum.y;

        // Friction
        rotationMomentum.x *= 0.95;
        rotationMomentum.y *= 0.95;

        // Return to passive rotation if slow
        const minSpeed = 0.002;
        if (Math.abs(rotationMomentum.y) < minSpeed && Math.abs(rotationMomentum.x) < minSpeed) {
             // Smoothly blend to passive Y rotation
             rotationMomentum.y += (minSpeed - rotationMomentum.y) * 0.05;
             rotationMomentum.x *= 0.9; // Kill X tilt
        }
    }

    const items = document.querySelectorAll('.skill-item');
    
    items.forEach(item => {
        const x = parseFloat(item.dataset.x);
        const y = parseFloat(item.dataset.y);
        const z = parseFloat(item.dataset.z);

        // Rotate around Y axis
        let rx = x * Math.cos(cloudRotation.y) - z * Math.sin(cloudRotation.y);
        let rz = x * Math.sin(cloudRotation.y) + z * Math.cos(cloudRotation.y);

        // Rotate around X axis
        let ry = y * Math.cos(cloudRotation.x) - rz * Math.sin(cloudRotation.x);
        rz = y * Math.sin(cloudRotation.x) + rz * Math.cos(cloudRotation.x);

        // Apply transform
        // Scale based on depth (z)
        const scale = (rz + cloudRadius * 2) / (cloudRadius * 2); // Simple depth scale
        const alpha = (rz + cloudRadius) / (cloudRadius * 2); // Fade back items

        item.style.transform = `translate(-50%, -50%) translate3d(${rx}px, ${ry}px, ${rz}px) scale(${scale})`;
        item.style.opacity = Math.max(0.2, alpha);
        item.style.zIndex = Math.floor(rz);
    });

    requestAnimationFrame(updateSkillsCloud);
}


// --- PROJECT ORBIT LOGIC ---
let orbitRotation = 0;
let orbitSpeed = 0.05; // Slow auto-rotation
let isOrbitDragging = false;
let lastOrbitMouseX = 0;
let orbitMomentum = 0;
let orbitDragStartX = 0; // Track start position to distinguish click vs drag

function initProjectOrbit() {
    const wrapper = document.querySelector('.orbit-wrapper');
    
    if (!wrapper) return;

    wrapper.addEventListener('mousedown', (e) => {
        isOrbitDragging = true;
        lastOrbitMouseX = e.clientX;
        orbitDragStartX = e.clientX;
        // Stop momentum on grab
        orbitMomentum = 0;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isOrbitDragging) return;
        const delta = e.clientX - lastOrbitMouseX;
        lastOrbitMouseX = e.clientX;
        
        // Drag sensitivity
        orbitRotation -= delta * 0.5;
        orbitMomentum = -delta * 0.5;
    });

    window.addEventListener('mouseup', () => {
        isOrbitDragging = false;
    });
    
    // Prevent native drag and accidental clicks on links
    const links = wrapper.querySelectorAll('a');
    links.forEach(link => {
        link.setAttribute('draggable', 'false');
        
        link.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });

        link.addEventListener('click', (e) => {
            // If moved more than 5 pixels, treat as drag, not click
            if (Math.abs(e.clientX - orbitDragStartX) > 5) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    });
    
    // Touch support
    wrapper.addEventListener('touchstart', (e) => {
        isOrbitDragging = true;
        lastOrbitMouseX = e.touches[0].clientX;
        orbitDragStartX = e.touches[0].clientX;
        orbitMomentum = 0;
    });
    
    window.addEventListener('touchmove', (e) => {
        if (!isOrbitDragging) return;
        const delta = e.touches[0].clientX - lastOrbitMouseX;
        lastOrbitMouseX = e.touches[0].clientX;
        orbitRotation -= delta * 0.5;
        orbitMomentum = -delta * 0.5;
    });
    
    window.addEventListener('touchend', () => {
        isOrbitDragging = false;
    });
}

function updateProjectOrbit() {
    const orbitContainer = document.querySelector('.orbit-container');
    const projectCards = document.querySelectorAll('.project-card');
    
    if (!orbitContainer) return;

    if (!isOrbitDragging) {
        orbitRotation += orbitSpeed;
        // Apply momentum
        orbitRotation += orbitMomentum;
        orbitMomentum *= 0.95; // Friction
    }

    // Apply transforms
    // Container: rotateX(60deg) rotateZ(orbitRotation)
    orbitContainer.style.transform = `rotateX(60deg) rotateZ(${orbitRotation}deg)`;

    projectCards.forEach((card, index) => {
        // Calculate total angle for this card
        const nodeAngle = 90 * index;
        const totalAngle = nodeAngle + orbitRotation;
        
        // Counter rotate to keep upright
        // translate(-50%, -50%) centers the card on the node
        // rotateZ(-totalAngle) counters the ring rotation
        // rotateX(-60deg) counters the ring tilt
        card.style.transform = `translate(-50%, -50%) rotateZ(${-totalAngle}deg) rotateX(-60deg)`;
    });
}


document.addEventListener('DOMContentLoaded', () => {
    // Start Canvas Animation
    resize();
    initParticles();
    animate();
    initScroll();
    
    // Init Skills
    initSkillsCloud();
    updateSkillsCloud();
    
    // Init Projects
    initProjectOrbit();
    
    // Init Particle Text Systems
    initAllTextSystems();

    // Init Contact Interactions
    initContactInteractions();
});

function initContactInteractions() {
    const emailLink = document.querySelector('.node-email');
    if (emailLink) {
        emailLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = 'gabrielsmith1874@gmail.com';
            
            // Try to copy to clipboard
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(email).then(() => {
                    const valueSpan = emailLink.querySelector('.holo-value');
                    const originalText = valueSpan.textContent;
                    
                    // Visual Feedback
                    valueSpan.textContent = 'COPIED TO CLIPBOARD';
                    valueSpan.style.color = '#4ade80'; // Green success color
                    valueSpan.style.textShadow = '0 0 10px #4ade80';
                    
                    setTimeout(() => {
                        valueSpan.textContent = originalText;
                        valueSpan.style.color = '';
                        valueSpan.style.textShadow = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                    // Fallback to default mailto if copy fails
                    window.location.href = emailLink.href;
                });
            } else {
                // Fallback for older browsers
                window.location.href = emailLink.href;
            }
        });
    }
}


// --- PARTICLE TEXT SYSTEM ---
class ParticleTextSystem {
    constructor(canvasId, text, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.text = text;
        this.particles = [];
        this.isActive = false;
        
        // Options
        this.fontSize = options.fontSize || 100;
        this.fontFamily = options.fontFamily || 'Inter, sans-serif';
        this.fontWeight = options.fontWeight || '900';
        this.density = options.density || 6; // Lower is denser
        this.mouseRadius = options.mouseRadius || 80;
        this.mouseForce = options.mouseForce || 15;
        this.returnEase = options.returnEase || 0.1;
        this.friction = options.friction || 0.9;
        this.color = options.color || '#ffffff';
        this.alignment = options.alignment || 'center'; // 'center' or 'left'
        this.padding = options.padding || 100; // Extra space around text for particles to move
        
        // Wave State
        this.waveRadius = -100;
        this.waveActive = true;
        this.waveSpeed = 4;
        this.waveDelay = 200; // Frames between waves
        this.waveTimer = 0;
        
        // Initial Setup
        this.resize();
        this.initParticles();
        
        // Bind resize
        window.addEventListener('resize', () => {
            this.resize();
            this.initParticles();
        });
    }
    
    resize() {
        // Get parent dimensions and add padding for particle overflow
        const parent = this.canvas.parentElement;
        this.parentWidth = parent.clientWidth;
        this.parentHeight = parent.clientHeight;
        
        // Canvas is larger than parent to allow particles to move outside visible area
        this.canvas.width = this.parentWidth + this.padding * 2;
        this.canvas.height = this.parentHeight + this.padding * 2;
        
        // Offset canvas position so it's centered on the parent
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = `-${this.padding}px`;
        this.canvas.style.top = `-${this.padding}px`;
    }
    
    initParticles() {
        if (!this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw Text (centered within the padded canvas)
        let fontSize = this.fontSize;
        // Responsive font scaling based on parent width (not padded canvas)
        if (this.parentWidth < 600) fontSize *= 0.6;
        
        this.ctx.font = `${this.fontWeight} ${fontSize}px ${this.fontFamily}`;
        this.ctx.fillStyle = 'white';
        this.ctx.textBaseline = 'middle';
        
        // Text position accounts for padding offset
        let xPos = this.padding + this.parentWidth / 2;
        const textPadding = 20; // Small padding to prevent edge cutoff
        if (this.alignment === 'left') {
            xPos = this.padding + textPadding;
            this.ctx.textAlign = 'left';
        } else {
            this.ctx.textAlign = 'center';
        }
        
        this.ctx.fillText(this.text, xPos, this.padding + this.parentHeight / 2);
        
        // Get Data with extended sampling area to catch edge pixels
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles = [];
        const fixedSize = 1.5; // Uniform size for all particles
        
        for (let y = 0; y < this.canvas.height; y += this.density) {
            for (let x = 0; x < this.canvas.width; x += this.density) {
                const index = (y * this.canvas.width + x) * 4;
                const alpha = imageData.data[index + 3];
                
                if (alpha > 128) {
                    this.particles.push({
                        x: Math.random() * this.canvas.width,
                        y: Math.random() * this.canvas.height,
                        originX: x,
                        originY: y,
                        vx: 0,
                        vy: 0,
                        size: fixedSize,
                        baseSize: fixedSize
                    });
                }
            }
        }
    }
    
    update() {
        if (!this.isActive) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Wave Logic
        if (this.waveActive) {
            this.waveRadius += this.waveSpeed;
            const maxRadius = Math.max(this.canvas.width, this.canvas.height) * 1.5;
            
            if (this.waveRadius > maxRadius) {
                this.waveTimer++;
                if (this.waveTimer > this.waveDelay) {
                    this.waveRadius = -100;
                    this.waveTimer = 0;
                }
            }
        }
        
        // Center for wave (accounting for padding)
        const centerX = this.padding + this.parentWidth / 2;
        const centerY = this.padding + this.parentHeight / 2;
        
        // Mouse Position relative to this canvas
        let localMx = null;
        let localMy = null;
        
        if (rawMouse.x != null) {
            const rect = this.canvas.getBoundingClientRect();
            localMx = rawMouse.x - rect.left;
            localMy = rawMouse.y - rect.top;
        }

        this.particles.forEach(p => {
            // 1. Return to Origin
            const dx = p.originX - p.x;
            const dy = p.originY - p.y;
            p.vx += dx * this.returnEase;
            p.vy += dy * this.returnEase;
            
            // 2. Mouse Repulsion
            if (localMx != null) {
                const distMouse = Math.hypot(localMx - p.x, localMy - p.y);
                if (distMouse < this.mouseRadius) {
                    const angle = Math.atan2(localMy - p.y, localMx - p.x);
                    const force = (this.mouseRadius - distMouse) / this.mouseRadius;
                    const push = force * this.mouseForce;
                    p.vx -= Math.cos(angle) * push;
                    p.vy -= Math.sin(angle) * push;
                }
            }
            
            // 3. Wave Repulsion
            const distCenter = Math.hypot(centerX - p.x, centerY - p.y);
            const waveWidth = 60;
            const waveDist = Math.abs(distCenter - this.waveRadius);
            
            if (waveDist < waveWidth) {
                const angle = Math.atan2(p.y - centerY, p.x - centerX);
                const force = (waveWidth - waveDist) / waveWidth;
                const push = force * 1.5;
                
                p.vx += Math.cos(angle) * push;
                p.vy += Math.sin(angle) * push;
                p.size = p.baseSize + force * 2;
            } else {
                p.size = Math.max(p.baseSize, p.size * 0.9);
            }
            
            // 4. Idle Drift (The "Alive" feel)
            // Add slight noise
            p.vx += (Math.random() - 0.5) * 0.05;
            p.vy += (Math.random() - 0.5) * 0.05;

            // Physics
            p.vx *= this.friction;
            p.vy *= this.friction;
            p.x += p.vx;
            p.y += p.vy;
            
            // Draw with uniform opacity
            this.ctx.fillStyle = this.color;
            this.ctx.globalAlpha = 1.0; // Full opacity for all dots
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.globalAlpha = 1.0; // Reset
    }
}

// Manager for all text systems
const textSystems = [];

function initAllTextSystems() {
    // 1. Hero
    textSystems.push(new ParticleTextSystem('hero-text-canvas', 'GABRIEL SMITH', {
        fontSize: 100,
        density: 5, // Optimized: Increased from 3
        mouseForce: 20
    }));
    
    // 2. Experience
    textSystems.push(new ParticleTextSystem('experience-text-canvas', 'EXPERIENCE', {
        fontSize: 80,
        density: 5, // Optimized: Increased from 3
        alignment: 'left'
    }));
    
    // 3. Projects
    textSystems.push(new ParticleTextSystem('projects-text-canvas', 'PROJECTS', {
        fontSize: 60,
        density: 5 // Optimized: Increased from 3
    }));
    
    // 4. Skills
    textSystems.push(new ParticleTextSystem('skills-text-canvas', 'SKILLS', {
        fontSize: 80,
        density: 5 // Optimized: Increased from 3
    }));
    
    // 5. Contact
    textSystems.push(new ParticleTextSystem('contact-text-canvas', 'CONTACT', {
        fontSize: 120,
        density: 5 // Optimized: Increased from 3
    }));

    // 6. Contact Labels (Removed - using Holographic CSS)
    
    // Start loop
    animateTextSystems();
}

function animateTextSystems() {
    // Determine which section is active to optimize
    // Map section index to text system index
    // 0: Hero -> 0
    // 1: Experience -> 1
    // 2: Projects -> 2
    // 3: Skills -> 3
    // 4: Contact -> 4
    
    textSystems.forEach((sys, i) => {
        if (sys) {
            // Only activate if it's the current section
            // Or if we are transitioning (maybe keep both active for a moment?)
            // For simplicity, just check currentSectionIndex
            sys.isActive = (i === currentSectionIndex);
            sys.update();
        }
    });
    
    requestAnimationFrame(animateTextSystems);
}

// --- OLD CONTACT TEXT CODE REMOVED (Replaced by Class) ---
// (The previous initContactText and animateContact functions are deleted)


