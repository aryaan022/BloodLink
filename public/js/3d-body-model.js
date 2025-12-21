// Advanced 3D Circulatory System Visualization
// Realistic anatomical blood flow with interactive features

let bodyScene, bodyCamera, bodyRenderer, bodyControls;
let bloodParticles = [];
let vesselMeshes = [];
let organMeshes = {};
let mouseX = 0, mouseY = 0;
let targetRotationX = 0, targetRotationY = 0;
let isUserInteracting = false;
let interactionTimeout;
let pulsePhase = 0;
let selectedOrgan = null;

// Vessel path definitions for realistic circulatory system
const vesselPaths = {
    // Arteries (oxygenated - bright red)
    arteries: {
        aorta: {
            points: [
                [0, 0.3, 0.15],      // Heart
                [0, 0.5, 0.12],      // Ascending aorta
                [0.1, 0.6, 0.1],     // Aortic arch start
                [0.15, 0.65, 0.05],  // Arch peak
                [0.1, 0.62, -0.05],  // Arch descending
                [0.05, 0.5, -0.08],  // Descending thoracic
                [0, 0.2, -0.05],     // Abdominal aorta
                [0, -0.3, -0.03]     // Lower aorta
            ],
            radius: 0.04,
            color: 0xff3333
        },
        carotidLeft: {
            points: [
                [0.1, 0.6, 0.1],
                [0.12, 0.75, 0.08],
                [0.1, 0.9, 0.05],
                [0.08, 1.1, 0.02],
                [0.05, 1.25, 0]
            ],
            radius: 0.025,
            color: 0xff4444
        },
        carotidRight: {
            points: [
                [0.1, 0.6, 0.1],
                [-0.05, 0.7, 0.08],
                [-0.08, 0.9, 0.05],
                [-0.06, 1.1, 0.02],
                [-0.04, 1.25, 0]
            ],
            radius: 0.025,
            color: 0xff4444
        },
        subclavianLeft: {
            points: [
                [0.1, 0.6, 0.1],
                [0.25, 0.58, 0.08],
                [0.4, 0.5, 0.05],
                [0.55, 0.35, 0.02],
                [0.65, 0.15, 0]
            ],
            radius: 0.022,
            color: 0xff5555
        },
        subclavianRight: {
            points: [
                [0.1, 0.6, 0.1],
                [-0.15, 0.55, 0.08],
                [-0.35, 0.48, 0.05],
                [-0.5, 0.35, 0.02],
                [-0.62, 0.15, 0]
            ],
            radius: 0.022,
            color: 0xff5555
        },
        iliacLeft: {
            points: [
                [0, -0.3, -0.03],
                [0.12, -0.45, -0.02],
                [0.18, -0.7, 0],
                [0.2, -1.0, 0.02],
                [0.18, -1.3, 0.03]
            ],
            radius: 0.025,
            color: 0xff4444
        },
        iliacRight: {
            points: [
                [0, -0.3, -0.03],
                [-0.12, -0.45, -0.02],
                [-0.18, -0.7, 0],
                [-0.2, -1.0, 0.02],
                [-0.18, -1.3, 0.03]
            ],
            radius: 0.025,
            color: 0xff4444
        }
    },
    // Veins (deoxygenated - dark red/blue)
    veins: {
        venaCavaInferior: {
            points: [
                [0, -0.35, 0.08],
                [-0.05, -0.1, 0.1],
                [-0.08, 0.1, 0.12],
                [-0.1, 0.25, 0.13]
            ],
            radius: 0.045,
            color: 0x4444aa
        },
        venaCavaSuperior: {
            points: [
                [-0.1, 0.25, 0.13],
                [-0.08, 0.4, 0.12],
                [-0.05, 0.55, 0.1]
            ],
            radius: 0.04,
            color: 0x4455aa
        },
        jugularLeft: {
            points: [
                [0.15, 1.2, 0.03],
                [0.12, 1.0, 0.05],
                [0.1, 0.8, 0.08],
                [0.05, 0.6, 0.1],
                [-0.05, 0.55, 0.1]
            ],
            radius: 0.02,
            color: 0x5566bb
        },
        jugularRight: {
            points: [
                [-0.12, 1.2, 0.03],
                [-0.1, 1.0, 0.05],
                [-0.08, 0.8, 0.08],
                [-0.05, 0.6, 0.1],
                [-0.05, 0.55, 0.1]
            ],
            radius: 0.02,
            color: 0x5566bb
        },
        femoralLeft: {
            points: [
                [0.22, -1.25, 0.05],
                [0.2, -1.0, 0.06],
                [0.16, -0.7, 0.07],
                [0.1, -0.4, 0.08],
                [0, -0.35, 0.08]
            ],
            radius: 0.02,
            color: 0x5566bb
        },
        femoralRight: {
            points: [
                [-0.22, -1.25, 0.05],
                [-0.2, -1.0, 0.06],
                [-0.16, -0.7, 0.07],
                [-0.1, -0.4, 0.08],
                [0, -0.35, 0.08]
            ],
            radius: 0.02,
            color: 0x5566bb
        }
    }
};

function initBodyModel() {
    const canvas = document.getElementById('bodyModelCanvas');
    if (!canvas) {
        console.log('Body model canvas not found');
        return;
    }

    console.log('Initializing Advanced Circulatory System...');

    // Scene setup
    bodyScene = new THREE.Scene();
    
    // Add subtle fog for depth
    bodyScene.fog = new THREE.FogExp2(0x0a0a15, 0.15);

    // Camera
    const containerWidth = canvas.parentElement.clientWidth || 800;
    const containerHeight = canvas.parentElement.clientHeight || 500;
    
    bodyCamera = new THREE.PerspectiveCamera(
        50,
        containerWidth / containerHeight,
        0.1,
        1000
    );
    bodyCamera.position.set(0, 0.2, 4);
    bodyCamera.lookAt(0, 0, 0);

    // Renderer with advanced settings
    bodyRenderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    bodyRenderer.setSize(containerWidth, containerHeight);
    bodyRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    bodyRenderer.setClearColor(0x000000, 0);
    bodyRenderer.shadowMap.enabled = true;
    bodyRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    bodyRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    bodyRenderer.toneMappingExposure = 1.2;

    // Advanced lighting setup
    setupLighting();

    // Create the circulatory system
    createCirculatorySystem();

    // Add interactivity
    setupInteractivity(canvas);

    // Animation loop
    animateBodyModel();

    // Handle resize
    window.addEventListener('resize', onBodyResize);
    
    console.log('Advanced Circulatory System initialized successfully');
}

function setupLighting() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x334455, 0.4);
    bodyScene.add(ambientLight);

    // Main key light (warm)
    const keyLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    keyLight.position.set(3, 5, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    bodyScene.add(keyLight);

    // Fill light (cool)
    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.4);
    fillLight.position.set(-3, 2, 3);
    bodyScene.add(fillLight);

    // Rim light for dramatic effect
    const rimLight = new THREE.DirectionalLight(0xff4444, 0.6);
    rimLight.position.set(0, -2, -5);
    bodyScene.add(rimLight);

    // Heart spotlight
    const heartSpot = new THREE.SpotLight(0xff3333, 2, 3, Math.PI / 6, 0.5, 2);
    heartSpot.position.set(0.5, 0.5, 1.5);
    heartSpot.target.position.set(0, 0.3, 0);
    bodyScene.add(heartSpot);
    bodyScene.add(heartSpot.target);
    
    // Animated point lights for pulse effect
    const pulseLight1 = new THREE.PointLight(0xff2222, 0, 2);
    pulseLight1.position.set(0, 0.3, 0.3);
    pulseLight1.userData.isPulseLight = true;
    bodyScene.add(pulseLight1);

    const pulseLight2 = new THREE.PointLight(0xff4444, 0, 3);
    pulseLight2.position.set(0, 0.3, 0.3);
    pulseLight2.userData.isPulseLight = true;
    pulseLight2.userData.delay = 0.2;
    bodyScene.add(pulseLight2);
}

function createCirculatorySystem() {
    const bodyGroup = new THREE.Group();

    // Create anatomical body silhouette
    createBodySilhouette(bodyGroup);

    // Create the heart
    createRealisticHeart(bodyGroup);

    // Create blood vessels
    createVesselNetwork(bodyGroup);

    // Create blood cells
    createBloodCellSystem(bodyGroup);

    // Add organ indicators
    createOrganIndicators(bodyGroup);

    // Add particle system for ambient effect
    createAmbientParticles(bodyGroup);

    bodyScene.add(bodyGroup);
    window.bodyGroup = bodyGroup;
}

function createBodySilhouette(bodyGroup) {
    // Create a ghostly body outline
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x1a1a2e,
        transparent: true,
        opacity: 0.15,
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    // Torso - elongated ellipsoid
    const torsoGeometry = new THREE.SphereGeometry(0.4, 32, 32);
    torsoGeometry.scale(1, 1.8, 0.6);
    const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
    torso.position.set(0, 0, 0);
    bodyGroup.add(torso);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0, 1.1, 0);
    bodyGroup.add(head);

    // Neck
    const neckGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.2, 16);
    const neck = new THREE.Mesh(neckGeometry, bodyMaterial);
    neck.position.set(0, 0.85, 0);
    bodyGroup.add(neck);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.9, 16);
    
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(0.55, 0.3, 0);
    leftArm.rotation.z = -0.3;
    bodyGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(-0.55, 0.3, 0);
    rightArm.rotation.z = 0.3;
    bodyGroup.add(rightArm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.08, 0.1, 1.2, 16);
    
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(0.18, -1.0, 0);
    bodyGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(-0.18, -1.0, 0);
    bodyGroup.add(rightLeg);

    // Add glowing edges
    const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x334466,
        transparent: true,
        opacity: 0.3
    });
}

function createRealisticHeart(bodyGroup) {
    // Main heart shape - using multiple spheres for anatomical shape
    const heartGroup = new THREE.Group();
    heartGroup.position.set(0, 0.3, 0.15);

    // Heart material with subsurface scattering look
    const heartMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xcc2222,
        emissive: 0x661111,
        emissiveIntensity: 0.5,
        roughness: 0.4,
        metalness: 0.1,
        clearcoat: 0.3,
        clearcoatRoughness: 0.4,
        transparent: true,
        opacity: 0.95
    });

    // Left ventricle
    const leftVentricle = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 32, 32),
        heartMaterial
    );
    leftVentricle.position.set(0.05, -0.02, 0.02);
    leftVentricle.scale.set(1, 1.2, 0.9);
    heartGroup.add(leftVentricle);

    // Right ventricle
    const rightVentricle = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 32, 32),
        heartMaterial
    );
    rightVentricle.position.set(-0.06, -0.02, 0.03);
    rightVentricle.scale.set(1, 1.1, 0.85);
    heartGroup.add(rightVentricle);

    // Left atrium
    const leftAtrium = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 32, 32),
        heartMaterial
    );
    leftAtrium.position.set(0.06, 0.1, 0);
    heartGroup.add(leftAtrium);

    // Right atrium
    const rightAtrium = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 32, 32),
        heartMaterial
    );
    rightAtrium.position.set(-0.05, 0.1, 0.02);
    heartGroup.add(rightAtrium);

    // Aorta base
    const aortaBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.04, 0.15, 16),
        heartMaterial
    );
    aortaBase.position.set(0.02, 0.18, 0);
    aortaBase.rotation.x = -0.2;
    heartGroup.add(aortaBase);

    // Pulmonary artery
    const pulmonaryArtery = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.03, 0.1, 16),
        new THREE.MeshPhysicalMaterial({
            color: 0x4455aa,
            emissive: 0x222255,
            emissiveIntensity: 0.3,
            roughness: 0.5,
            metalness: 0.1
        })
    );
    pulmonaryArtery.position.set(-0.04, 0.16, 0.03);
    pulmonaryArtery.rotation.z = 0.3;
    heartGroup.add(pulmonaryArtery);

    // Heart glow layers
    for (let i = 1; i <= 3; i++) {
        const glowGeometry = new THREE.SphereGeometry(0.15 + i * 0.03, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.08 / i,
            side: THREE.BackSide,
            depthWrite: false
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.userData.isHeartGlow = true;
        glow.userData.glowIndex = i;
        heartGroup.add(glow);
    }

    heartGroup.userData.isHeart = true;
    organMeshes.heart = heartGroup;
    bodyGroup.add(heartGroup);
}

function createVesselNetwork(bodyGroup) {
    const vesselGroup = new THREE.Group();

    // Create arteries
    Object.entries(vesselPaths.arteries).forEach(([name, vessel]) => {
        const curve = new THREE.CatmullRomCurve3(
            vessel.points.map(p => new THREE.Vector3(p[0], p[1], p[2]))
        );
        
        const geometry = new THREE.TubeGeometry(curve, 64, vessel.radius, 12, false);
        
        // Artery material with pulsing capability
        const material = new THREE.MeshPhysicalMaterial({
            color: vessel.color,
            emissive: vessel.color,
            emissiveIntensity: 0.3,
            roughness: 0.5,
            metalness: 0.2,
            transparent: true,
            opacity: 0.85,
            clearcoat: 0.2
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.isArtery = true;
        mesh.userData.vesselName = name;
        mesh.userData.baseCurve = curve;
        vesselMeshes.push(mesh);
        vesselGroup.add(mesh);

        // Add inner glow
        const innerGlowGeometry = new THREE.TubeGeometry(curve, 64, vessel.radius * 0.6, 8, false);
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6666,
            transparent: true,
            opacity: 0.4,
            depthWrite: false
        });
        const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        innerGlow.userData.isVesselGlow = true;
        vesselGroup.add(innerGlow);
    });

    // Create veins
    Object.entries(vesselPaths.veins).forEach(([name, vessel]) => {
        const curve = new THREE.CatmullRomCurve3(
            vessel.points.map(p => new THREE.Vector3(p[0], p[1], p[2]))
        );
        
        const geometry = new THREE.TubeGeometry(curve, 64, vessel.radius, 12, false);
        
        const material = new THREE.MeshPhysicalMaterial({
            color: vessel.color,
            emissive: vessel.color,
            emissiveIntensity: 0.2,
            roughness: 0.6,
            metalness: 0.15,
            transparent: true,
            opacity: 0.75
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.isVein = true;
        mesh.userData.vesselName = name;
        mesh.userData.baseCurve = curve;
        vesselMeshes.push(mesh);
        vesselGroup.add(mesh);
    });

    bodyGroup.add(vesselGroup);
}

function createBloodCellSystem(bodyGroup) {
    bloodParticles = [];

    // Create blood cells for each vessel path
    const allPaths = [...Object.entries(vesselPaths.arteries), ...Object.entries(vesselPaths.veins)];
    
    allPaths.forEach(([name, vessel]) => {
        const isArtery = vesselPaths.arteries[name] !== undefined;
        const cellCount = Math.ceil(vessel.points.length * 4);
        
        for (let i = 0; i < cellCount; i++) {
            createBloodCell(bodyGroup, vessel, isArtery, i / cellCount);
        }
    });
}

function createBloodCell(bodyGroup, vessel, isArtery, initialProgress) {
    // Red blood cell - biconcave disc shape
    const cellGroup = new THREE.Group();

    // Main cell body
    const cellGeometry = new THREE.TorusGeometry(0.015, 0.006, 8, 16);
    const cellMaterial = new THREE.MeshPhysicalMaterial({
        color: isArtery ? 0xff4444 : 0x994444,
        emissive: isArtery ? 0xff2222 : 0x662222,
        emissiveIntensity: isArtery ? 0.6 : 0.3,
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9
    });
    
    const cell = new THREE.Mesh(cellGeometry, cellMaterial);
    cell.rotation.x = Math.PI / 2;
    cellGroup.add(cell);

    // Cell glow
    const glowGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: isArtery ? 0xff6666 : 0x886666,
        transparent: true,
        opacity: 0.3,
        depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    cellGroup.add(glow);

    // Store path data
    const curve = new THREE.CatmullRomCurve3(
        vessel.points.map(p => new THREE.Vector3(p[0], p[1], p[2]))
    );
    
    cellGroup.userData = {
        curve: curve,
        progress: initialProgress,
        speed: (0.002 + Math.random() * 0.002) * (isArtery ? 1 : 0.8),
        isArtery: isArtery,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.5 + Math.random() * 0.5,
        scale: 0.8 + Math.random() * 0.4
    };

    bloodParticles.push(cellGroup);
    bodyGroup.add(cellGroup);
}

function createOrganIndicators(bodyGroup) {
    // Brain indicator
    const brainGlow = createOrganGlow(0, 1.1, 0, 0.2, 0x9966ff);
    brainGlow.userData.organName = 'Brain';
    organMeshes.brain = brainGlow;
    bodyGroup.add(brainGlow);

    // Lungs indicators
    const leftLung = createOrganGlow(0.2, 0.35, -0.05, 0.15, 0x66aaff);
    leftLung.userData.organName = 'Left Lung';
    organMeshes.leftLung = leftLung;
    bodyGroup.add(leftLung);

    const rightLung = createOrganGlow(-0.2, 0.35, -0.05, 0.15, 0x66aaff);
    rightLung.userData.organName = 'Right Lung';
    organMeshes.rightLung = rightLung;
    bodyGroup.add(rightLung);

    // Liver indicator
    const liver = createOrganGlow(-0.15, -0.05, 0.05, 0.12, 0xaa6633);
    liver.userData.organName = 'Liver';
    organMeshes.liver = liver;
    bodyGroup.add(liver);

    // Kidneys
    const leftKidney = createOrganGlow(0.18, -0.15, -0.05, 0.08, 0xcc8844);
    leftKidney.userData.organName = 'Left Kidney';
    organMeshes.leftKidney = leftKidney;
    bodyGroup.add(leftKidney);

    const rightKidney = createOrganGlow(-0.18, -0.15, -0.05, 0.08, 0xcc8844);
    rightKidney.userData.organName = 'Right Kidney';
    organMeshes.rightKidney = rightKidney;
    bodyGroup.add(rightKidney);
}

function createOrganGlow(x, y, z, size, color) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Core
    const coreGeometry = new THREE.SphereGeometry(size * 0.5, 16, 16);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.4,
        roughness: 0.5
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    // Outer glow
    const glowGeometry = new THREE.SphereGeometry(size, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
        depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    group.userData.isOrgan = true;
    group.userData.baseScale = size;

    return group;
}

function createAmbientParticles(bodyGroup) {
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 3;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 1;

        const color = new THREE.Color();
        color.setHSL(0.95 + Math.random() * 0.1, 0.8, 0.5 + Math.random() * 0.3);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        sizes[i] = Math.random() * 3 + 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.02,
        vertexColors: true,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData.isAmbientParticles = true;
    bodyGroup.add(particles);
}

function setupInteractivity(canvas) {
    // Mouse move for rotation
    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        targetRotationY = mouseX * 0.5;
        targetRotationX = mouseY * 0.3;
    });

    // Touch support
    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault();
        const touch = event.touches[0];
        const rect = canvas.getBoundingClientRect();
        mouseX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        mouseY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        
        targetRotationY = mouseX * 0.5;
        targetRotationX = mouseY * 0.3;
    }, { passive: false });

    // Interaction detection
    canvas.addEventListener('mouseenter', () => {
        isUserInteracting = true;
        clearTimeout(interactionTimeout);
    });

    canvas.addEventListener('mouseleave', () => {
        interactionTimeout = setTimeout(() => {
            isUserInteracting = false;
        }, 2000);
    });

    // Click for organ info (could be expanded)
    canvas.addEventListener('click', handleOrganClick);
}

function handleOrganClick(event) {
    // Could implement raycasting to detect organ clicks
    // and show information tooltips
}

function updateBloodParticles() {
    const time = Date.now() * 0.001;
    
    bloodParticles.forEach(cell => {
        const { curve, speed, isArtery, wobble, wobbleSpeed, scale } = cell.userData;
        
        // Update progress along the path
        cell.userData.progress += speed * (1 + Math.sin(pulsePhase) * 0.3);
        if (cell.userData.progress > 1) {
            cell.userData.progress = 0;
        }

        // Get position on curve
        const point = curve.getPoint(cell.userData.progress);
        const tangent = curve.getTangent(cell.userData.progress);
        
        // Add wobble for organic movement
        const wobbleOffset = Math.sin(time * wobbleSpeed + wobble) * 0.01;
        
        cell.position.set(
            point.x + tangent.z * wobbleOffset,
            point.y,
            point.z - tangent.x * wobbleOffset
        );

        // Rotate to face direction of travel
        cell.lookAt(point.x + tangent.x, point.y + tangent.y, point.z + tangent.z);

        // Pulse scale
        const pulseScale = scale * (1 + Math.sin(pulsePhase * 2 + wobble) * 0.1);
        cell.scale.setScalar(pulseScale);

        // Update opacity based on pulse
        cell.children.forEach(child => {
            if (child.material && child.material.opacity !== undefined) {
                const baseOpacity = child.material === child.children?.[0]?.material ? 0.9 : 0.3;
                child.material.opacity = baseOpacity + Math.sin(pulsePhase * 2) * 0.1;
            }
        });
    });
}

function animateBodyModel() {
    requestAnimationFrame(animateBodyModel);

    const time = Date.now() * 0.001;
    pulsePhase += 0.05; // Heartbeat timing

    if (window.bodyGroup) {
        // Smooth rotation following mouse or auto-rotate
        if (isUserInteracting) {
            window.bodyGroup.rotation.y += (targetRotationY - window.bodyGroup.rotation.y) * 0.05;
            window.bodyGroup.rotation.x += (targetRotationX - window.bodyGroup.rotation.x) * 0.05;
        } else {
            // Auto rotation
            window.bodyGroup.rotation.y += 0.002;
            window.bodyGroup.rotation.x = Math.sin(time * 0.2) * 0.1;
        }

        // Subtle breathing motion
        const breathe = 1 + Math.sin(time * 0.8) * 0.02;
        window.bodyGroup.scale.set(breathe, 1, breathe);

        // Update heart animation
        if (organMeshes.heart) {
            const heartbeat = Math.sin(pulsePhase * 2);
            const heartScale = 1 + (heartbeat > 0.7 ? 0.15 : heartbeat * 0.05);
            organMeshes.heart.scale.setScalar(heartScale);

            // Update heart glow
            organMeshes.heart.children.forEach(child => {
                if (child.userData.isHeartGlow) {
                    const glowIntensity = 0.1 + (heartbeat > 0.7 ? 0.15 : 0) / child.userData.glowIndex;
                    child.material.opacity = glowIntensity;
                    child.scale.setScalar(1 + (heartbeat > 0.7 ? 0.2 : 0) * child.userData.glowIndex);
                }
            });

            // Update heart material emissive
            organMeshes.heart.children.forEach(child => {
                if (child.material && child.material.emissiveIntensity !== undefined) {
                    child.material.emissiveIntensity = 0.3 + (heartbeat > 0.7 ? 0.5 : heartbeat * 0.2);
                }
            });
        }

        // Update vessel pulse
        vesselMeshes.forEach(mesh => {
            if (mesh.userData.isArtery) {
                const pulseIntensity = Math.sin(pulsePhase * 2 - mesh.position.y) * 0.5 + 0.5;
                mesh.material.emissiveIntensity = 0.2 + pulseIntensity * 0.3;
            }
        });

        // Update pulse lights
        bodyScene.children.forEach(child => {
            if (child.userData && child.userData.isPulseLight) {
                const delay = child.userData.delay || 0;
                const intensity = Math.max(0, Math.sin(pulsePhase * 2 - delay * Math.PI * 2));
                child.intensity = intensity * 2;
            }
        });

        // Update organ glows
        Object.values(organMeshes).forEach(organ => {
            if (organ.userData && organ.userData.isOrgan) {
                const pulse = 1 + Math.sin(time * 2 + organ.position.x) * 0.1;
                organ.scale.setScalar(pulse);
            }
        });

        // Update ambient particles
        window.bodyGroup.children.forEach(child => {
            if (child.userData && child.userData.isAmbientParticles) {
                const positions = child.geometry.attributes.position.array;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] += Math.sin(time + positions[i]) * 0.001;
                }
                child.geometry.attributes.position.needsUpdate = true;
                child.rotation.y += 0.001;
            }
        });

        // Update blood flow
        updateBloodParticles();
    }

    if (bodyRenderer && bodyScene && bodyCamera) {
        bodyRenderer.render(bodyScene, bodyCamera);
    }
}

function onBodyResize() {
    const canvas = document.getElementById('bodyModelCanvas');
    if (!canvas || !canvas.parentElement) return;

    const width = canvas.parentElement.clientWidth;
    const height = canvas.parentElement.clientHeight;

    if (width === 0 || height === 0) return;

    bodyCamera.aspect = width / height;
    bodyCamera.updateProjectionMatrix();
    bodyRenderer.setSize(width, height);
}

// Initialize when called
window.initBodyModel = initBodyModel;
window.onBodyResize = onBodyResize;
