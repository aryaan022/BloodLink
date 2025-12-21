// ============================================
// BLOODLINK - 3D LANDING PAGE ANIMATION
// Interactive Blood Drop with Particles
// ============================================

class LandingAnimation3D {
    constructor() {
        this.canvas = document.getElementById('3d-canvas');
        if (!this.canvas) return;
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            alpha: true, 
            antialias: true 
        });
        
        this.mouseX = 0;
        this.mouseY = 0;
        this.particles = [];
        this.bloodDrops = [];
        
        this.init();
    }
    
    init() {
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.camera.position.z = 6;
        
        this.createMainBloodDrop();
        this.createOrbitingDrops();
        this.createParticleField();
        this.createDNAHelix();
        this.addLights();
        this.addEventListeners();
        this.animate();
    }
    
    createMainBloodDrop() {
        // Main blood drop using custom geometry
        const dropShape = new THREE.Shape();
        
        // Create blood drop path
        dropShape.moveTo(0, 1.2);
        dropShape.bezierCurveTo(0.6, 0.6, 0.8, 0, 0.8, -0.4);
        dropShape.bezierCurveTo(0.8, -1, 0.5, -1.3, 0, -1.3);
        dropShape.bezierCurveTo(-0.5, -1.3, -0.8, -1, -0.8, -0.4);
        dropShape.bezierCurveTo(-0.8, 0, -0.6, 0.6, 0, 1.2);
        
        const extrudeSettings = {
            depth: 0.6,
            bevelEnabled: true,
            bevelThickness: 0.2,
            bevelSize: 0.15,
            bevelOffset: 0,
            bevelSegments: 20
        };
        
        const dropGeometry = new THREE.ExtrudeGeometry(dropShape, extrudeSettings);
        dropGeometry.center();
        
        const dropMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xe74c3c,
            metalness: 0.1,
            roughness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            transmission: 0.3,
            thickness: 0.5,
            envMapIntensity: 1.5
        });
        
        this.mainDrop = new THREE.Mesh(dropGeometry, dropMaterial);
        this.mainDrop.scale.set(1.5, 1.5, 1.5);
        this.scene.add(this.mainDrop);
        
        // Glow effect
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6b6b,
            transparent: true,
            opacity: 0.15
        });
        const glowGeometry = new THREE.ExtrudeGeometry(dropShape, { ...extrudeSettings, depth: 0.8 });
        glowGeometry.center();
        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glow.scale.set(1.8, 1.8, 1.8);
        this.scene.add(this.glow);
    }
    
    createOrbitingDrops() {
        const miniDropShape = new THREE.Shape();
        miniDropShape.moveTo(0, 0.3);
        miniDropShape.bezierCurveTo(0.15, 0.15, 0.2, 0, 0.2, -0.1);
        miniDropShape.bezierCurveTo(0.2, -0.25, 0.12, -0.32, 0, -0.32);
        miniDropShape.bezierCurveTo(-0.12, -0.32, -0.2, -0.25, -0.2, -0.1);
        miniDropShape.bezierCurveTo(-0.2, 0, -0.15, 0.15, 0, 0.3);
        
        const miniExtrudeSettings = {
            depth: 0.15,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelSegments: 8
        };
        
        const dropGeometry = new THREE.ExtrudeGeometry(miniDropShape, miniExtrudeSettings);
        dropGeometry.center();
        
        for (let i = 0; i < 8; i++) {
            const material = new THREE.MeshPhysicalMaterial({
                color: i % 2 === 0 ? 0xe74c3c : 0x3498db,
                metalness: 0.2,
                roughness: 0.3,
                clearcoat: 0.8
            });
            
            const drop = new THREE.Mesh(dropGeometry, material);
            drop.userData = {
                angle: (i / 8) * Math.PI * 2,
                radius: 2.5 + (i % 3) * 0.3,
                speed: 0.3 + Math.random() * 0.2,
                yOffset: (Math.random() - 0.5) * 2
            };
            
            this.bloodDrops.push(drop);
            this.scene.add(drop);
        }
    }
    
    createParticleField() {
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        const colorRed = new THREE.Color(0xe74c3c);
        const colorBlue = new THREE.Color(0x3498db);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random positions in a sphere
            const radius = 4 + Math.random() * 3;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            // Random colors between red and blue
            const mixRatio = Math.random();
            const color = colorRed.clone().lerp(colorBlue, mixRatio);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
            
            sizes[i] = Math.random() * 3 + 1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }
    
    createDNAHelix() {
        const helixGroup = new THREE.Group();
        
        const sphereGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const redMat = new THREE.MeshPhysicalMaterial({ color: 0xe74c3c, emissive: 0xe74c3c, emissiveIntensity: 0.3 });
        const blueMat = new THREE.MeshPhysicalMaterial({ color: 0x3498db, emissive: 0x3498db, emissiveIntensity: 0.3 });
        
        for (let i = 0; i < 40; i++) {
            const t = i / 40 * Math.PI * 4;
            
            // First strand
            const sphere1 = new THREE.Mesh(sphereGeo, redMat);
            sphere1.position.x = Math.cos(t) * 0.5;
            sphere1.position.y = (i - 20) * 0.15;
            sphere1.position.z = Math.sin(t) * 0.5;
            helixGroup.add(sphere1);
            
            // Second strand
            const sphere2 = new THREE.Mesh(sphereGeo, blueMat);
            sphere2.position.x = Math.cos(t + Math.PI) * 0.5;
            sphere2.position.y = (i - 20) * 0.15;
            sphere2.position.z = Math.sin(t + Math.PI) * 0.5;
            helixGroup.add(sphere2);
            
            // Connection bars (every 4 nodes)
            if (i % 4 === 0) {
                const barGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
                const barMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
                const bar = new THREE.Mesh(barGeo, barMat);
                bar.position.y = (i - 20) * 0.15;
                bar.rotation.z = Math.PI / 2;
                bar.rotation.y = t;
                helixGroup.add(bar);
            }
        }
        
        helixGroup.position.x = 3.5;
        helixGroup.scale.set(0.8, 0.8, 0.8);
        this.dnaHelix = helixGroup;
        this.scene.add(helixGroup);
    }
    
    addLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        // Main red light
        const redLight = new THREE.PointLight(0xe74c3c, 2, 15);
        redLight.position.set(3, 3, 5);
        this.scene.add(redLight);
        
        // Blue accent light
        const blueLight = new THREE.PointLight(0x3498db, 1, 15);
        blueLight.position.set(-3, -2, 5);
        this.scene.add(blueLight);
        
        // Rim light
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
        rimLight.position.set(0, 0, -5);
        this.scene.add(rimLight);
    }
    
    addEventListeners() {
        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        });
        
        // Resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        });
        
        // Scroll effects
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            if (this.mainDrop) {
                this.mainDrop.rotation.y = scrollY * 0.002;
            }
        });
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const time = Date.now() * 0.001;
        
        // Main drop animation
        if (this.mainDrop) {
            // Heartbeat effect
            const beat = 1 + Math.sin(time * 2) * 0.03;
            this.mainDrop.scale.set(1.5 * beat, 1.5 * beat, 1.5 * beat);
            
            // Mouse interaction
            this.mainDrop.rotation.y += (this.mouseX * 0.5 - this.mainDrop.rotation.y) * 0.05;
            this.mainDrop.rotation.x += (this.mouseY * 0.3 - this.mainDrop.rotation.x) * 0.05;
            
            // Floating motion
            this.mainDrop.position.y = Math.sin(time * 0.5) * 0.2;
        }
        
        // Glow pulsing
        if (this.glow) {
            this.glow.material.opacity = 0.1 + Math.sin(time * 2) * 0.05;
            this.glow.rotation.y = this.mainDrop.rotation.y;
            this.glow.rotation.x = this.mainDrop.rotation.x;
        }
        
        // Orbiting drops
        this.bloodDrops.forEach(drop => {
            drop.userData.angle += drop.userData.speed * 0.02;
            drop.position.x = Math.cos(drop.userData.angle) * drop.userData.radius;
            drop.position.z = Math.sin(drop.userData.angle) * drop.userData.radius;
            drop.position.y = Math.sin(time + drop.userData.yOffset) * 0.5 + drop.userData.yOffset * 0.3;
            drop.rotation.y = drop.userData.angle;
            drop.rotation.z = Math.sin(time * 2) * 0.2;
        });
        
        // Particle system rotation
        if (this.particleSystem) {
            this.particleSystem.rotation.y += 0.0005;
            this.particleSystem.rotation.x += 0.0002;
        }
        
        // DNA helix rotation
        if (this.dnaHelix) {
            this.dnaHelix.rotation.y += 0.01;
            this.dnaHelix.position.y = Math.sin(time * 0.5) * 0.3;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.landingAnimation = new LandingAnimation3D();
    
    // Create floating particles in background
    const body = document.body;
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = 15 + Math.random() * 10 + 's';
        body.appendChild(particle);
    }
    
    // Mobile navigation toggle
    setupMobileNav();
});

// Mobile Navigation Toggle
function setupMobileNav() {
    const mobileNavBtn = document.getElementById('mobileNavBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (mobileNavBtn && navLinks) {
        mobileNavBtn.addEventListener('click', () => {
            mobileNavBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
            console.log('Mobile nav toggled'); // Debug
        });
        
        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileNavBtn.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileNavBtn.contains(e.target) && !navLinks.contains(e.target)) {
                mobileNavBtn.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });
    }
}
