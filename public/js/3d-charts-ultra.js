// ============================================
// BLOODLINK - 3D CHARTS VISUALIZATION
// Interactive Three.js Charts for Hospital Dashboard
// ============================================

class Charts3D {
    constructor() {
        this.charts = {};
        this.init();
    }
    
    init() {
        this.initRequestsChart();
        this.initBloodGroupChart();
        this.initUrgencyChart();
        this.initInventoryChart();
        this.initTrendChart();
    }
    
    // 3D Pie Chart for Request Status
    initRequestsChart() {
        const canvas = document.getElementById('requestsChart');
        if (!canvas) return;
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        
        renderer.setSize(300, 300);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.position.set(0, 3, 5);
        camera.lookAt(0, 0, 0);
        
        // Data
        const data = [
            { value: 30, color: 0x27ae60, label: 'Open' },
            { value: 20, color: 0xe74c3c, label: 'Emergency' },
            { value: 40, color: 0x3498db, label: 'Fulfilled' },
            { value: 10, color: 0x95a5a6, label: 'Closed' }
        ];
        
        const total = data.reduce((sum, d) => sum + d.value, 0);
        let startAngle = 0;
        
        const group = new THREE.Group();
        
        data.forEach((item, i) => {
            const angle = (item.value / total) * Math.PI * 2;
            const geometry = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 32, 1, false, startAngle, angle);
            const material = new THREE.MeshPhysicalMaterial({
                color: item.color,
                metalness: 0.3,
                roughness: 0.4,
                clearcoat: 0.5
            });
            const slice = new THREE.Mesh(geometry, material);
            slice.rotation.x = Math.PI / 2;
            group.add(slice);
            startAngle += angle;
        });
        
        scene.add(group);
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 1, 20);
        pointLight.position.set(5, 5, 5);
        scene.add(pointLight);
        
        // Animate
        const animate = () => {
            requestAnimationFrame(animate);
            group.rotation.y += 0.005;
            renderer.render(scene, camera);
        };
        animate();
        
        this.charts.requests = { scene, camera, renderer, group };
    }
    
    // 3D Bar Chart for Blood Groups
    initBloodGroupChart() {
        const canvas = document.getElementById('bloodGroupChart');
        if (!canvas) return;
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        
        renderer.setSize(300, 300);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.position.set(4, 4, 6);
        camera.lookAt(0, 0, 0);
        
        // Data
        const bloodGroups = [
            { label: 'O+', value: 45, color: 0xe74c3c },
            { label: 'O-', value: 20, color: 0xc0392b },
            { label: 'A+', value: 35, color: 0x3498db },
            { label: 'A-', value: 15, color: 0x2980b9 },
            { label: 'B+', value: 25, color: 0x27ae60 },
            { label: 'B-', value: 10, color: 0x1e8449 },
            { label: 'AB+', value: 8, color: 0x9b59b6 },
            { label: 'AB-', value: 5, color: 0x8e44ad }
        ];
        
        const maxValue = Math.max(...bloodGroups.map(b => b.value));
        const group = new THREE.Group();
        
        bloodGroups.forEach((bg, i) => {
            const height = (bg.value / maxValue) * 3;
            const geometry = new THREE.BoxGeometry(0.5, height, 0.5);
            const material = new THREE.MeshPhysicalMaterial({
                color: bg.color,
                metalness: 0.2,
                roughness: 0.3,
                clearcoat: 0.8
            });
            const bar = new THREE.Mesh(geometry, material);
            bar.position.x = (i - 3.5) * 0.7;
            bar.position.y = height / 2;
            group.add(bar);
        });
        
        // Base plate
        const baseGeometry = new THREE.BoxGeometry(7, 0.1, 1.5);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = -0.05;
        group.add(base);
        
        scene.add(group);
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 1, 20);
        pointLight.position.set(5, 8, 5);
        scene.add(pointLight);
        
        // Animate
        let targetRotation = 0;
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            targetRotation = ((e.clientX - rect.left) / rect.width - 0.5) * 0.5;
        });
        
        const animate = () => {
            requestAnimationFrame(animate);
            group.rotation.y += (targetRotation - group.rotation.y) * 0.05;
            renderer.render(scene, camera);
        };
        animate();
        
        this.charts.bloodGroup = { scene, camera, renderer, group };
    }
    
    // 3D Donut Chart for Urgency Levels
    initUrgencyChart() {
        const canvas = document.getElementById('urgencyChart');
        if (!canvas) return;
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        
        renderer.setSize(300, 300);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.position.set(0, 2, 4);
        camera.lookAt(0, 0, 0);
        
        const data = [
            { value: 15, color: 0xe74c3c, label: 'Critical' },
            { value: 35, color: 0xf39c12, label: 'Urgent' },
            { value: 50, color: 0x27ae60, label: 'Normal' }
        ];
        
        const total = data.reduce((sum, d) => sum + d.value, 0);
        let startAngle = 0;
        
        const group = new THREE.Group();
        
        data.forEach((item) => {
            const angle = (item.value / total) * Math.PI * 2;
            const geometry = new THREE.RingGeometry(0.8, 1.5, 32, 1, startAngle, angle);
            const material = new THREE.MeshPhysicalMaterial({
                color: item.color,
                side: THREE.DoubleSide,
                metalness: 0.2,
                roughness: 0.3
            });
            const ring = new THREE.Mesh(geometry, material);
            group.add(ring);
            startAngle += angle;
        });
        
        // Extrude for 3D effect
        data.forEach((item, i) => {
            const innerRadius = 0.8;
            const outerRadius = 1.5;
            const angle = (item.value / total) * Math.PI * 2;
            const midAngle = startAngle - angle / 2;
            
            for (let j = 0; j < 5; j++) {
                const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 32, 1, startAngle - angle, angle);
                const ringMat = new THREE.MeshPhysicalMaterial({
                    color: item.color,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 1 - j * 0.15
                });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.z = -j * 0.08;
                group.add(ring);
            }
        });
        
        scene.add(group);
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 0.8, 15);
        pointLight.position.set(3, 3, 3);
        scene.add(pointLight);
        
        // Animate
        const animate = () => {
            requestAnimationFrame(animate);
            group.rotation.z += 0.003;
            renderer.render(scene, camera);
        };
        animate();
        
        this.charts.urgency = { scene, camera, renderer, group };
    }
    
    // 3D Inventory Visualization - Professional Blood Bank Display
    initInventoryChart(inventoryData = null) {
        const canvas = document.getElementById('inventoryChart');
        if (!canvas) return;
        
        // Clear previous if exists
        if (this.charts.inventory) {
            if (this.charts.inventory.animationId) {
                cancelAnimationFrame(this.charts.inventory.animationId);
            }
            if (this.charts.inventory.renderer) {
                this.charts.inventory.renderer.dispose();
            }
        }
        
        const scene = new THREE.Scene();
        
        // Add subtle fog for depth
        scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);
        
        const width = canvas.clientWidth || 600;
        const height = 400;
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        
        camera.position.set(12, 8, 14);
        camera.lookAt(0, 1, 0);
        
        // Use provided inventory data or default
        const inventory = inventoryData || [
            { type: 'O+', count: 25, color: 0xff4757 },
            { type: 'O-', count: 12, color: 0xff6b81 },
            { type: 'A+', count: 18, color: 0x3742fa },
            { type: 'A-', count: 8, color: 0x5352ed },
            { type: 'B+', count: 15, color: 0x2ed573 },
            { type: 'B-', count: 6, color: 0x7bed9f },
            { type: 'AB+', count: 10, color: 0xa55eea },
            { type: 'AB-', count: 4, color: 0xd1a3ff }
        ];
        
        const mainGroup = new THREE.Group();
        const bloodBags = [];
        const particles = [];
        const maxCount = Math.max(...inventory.map(i => i.count), 30);
        
        // Create professional medical storage unit
        this.createStorageUnit(mainGroup);
        
        // Create blood bags for each type
        inventory.forEach((item, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const xPos = (col - 1.5) * 2.8;
            const zPos = row * 3.5 - 1.75;
            
            // Create professional blood bag
            const bagGroup = this.createBloodBag(item, maxCount);
            bagGroup.position.set(xPos, 0.5, zPos);
            mainGroup.add(bagGroup);
            bloodBags.push({ mesh: bagGroup, data: item, baseY: 0.5 });
            
            // Add floating label
            this.createFloatingLabel(mainGroup, item, xPos, zPos, maxCount);
            
            // Add particle effects for each bag
            const particleSystem = this.createBloodParticles(item.color, xPos, zPos);
            mainGroup.add(particleSystem);
            particles.push(particleSystem);
        });
        
        // Add holographic display ring
        const holoRing = this.createHolographicRing();
        mainGroup.add(holoRing);
        
        // Add ambient particles
        const ambientParticles = this.createAmbientParticles();
        mainGroup.add(ambientParticles);
        
        scene.add(mainGroup);
        
        // Professional lighting setup
        const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
        scene.add(ambientLight);
        
        // Main spotlight
        const mainLight = new THREE.SpotLight(0xffffff, 2);
        mainLight.position.set(0, 20, 10);
        mainLight.angle = Math.PI / 4;
        mainLight.penumbra = 0.5;
        mainLight.decay = 1;
        mainLight.distance = 50;
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        scene.add(mainLight);
        
        // Colored accent lights
        const redLight = new THREE.PointLight(0xff4757, 1.5, 20);
        redLight.position.set(-8, 5, 0);
        scene.add(redLight);
        
        const blueLight = new THREE.PointLight(0x3742fa, 1.5, 20);
        blueLight.position.set(8, 5, 0);
        scene.add(blueLight);
        
        // Rim light for professional look
        const rimLight = new THREE.DirectionalLight(0x6c5ce7, 0.5);
        rimLight.position.set(-5, 3, -5);
        scene.add(rimLight);
        
        // Interactive controls
        let targetRotationX = 0;
        let targetRotationY = 0;
        let currentRotationX = 0;
        let currentRotationY = 0;
        let isHovering = false;
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            targetRotationY = ((e.clientX - rect.left) / rect.width - 0.5) * 0.6;
            targetRotationX = ((e.clientY - rect.top) / rect.height - 0.5) * 0.3;
            isHovering = true;
        });
        
        canvas.addEventListener('mouseleave', () => {
            isHovering = false;
            targetRotationX = 0;
            targetRotationY = 0;
        });
        
        // Animation
        let time = 0;
        let animationId;
        
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            time += 0.016;
            
            // Smooth rotation with easing
            currentRotationY += (targetRotationY - currentRotationY) * 0.05;
            currentRotationX += (targetRotationX - currentRotationX) * 0.05;
            
            mainGroup.rotation.y = currentRotationY + (isHovering ? 0 : Math.sin(time * 0.3) * 0.1);
            mainGroup.rotation.x = currentRotationX;
            
            // Animate blood bags with floating effect
            bloodBags.forEach((bag, i) => {
                const floatOffset = Math.sin(time * 1.5 + i * 0.5) * 0.05;
                bag.mesh.position.y = bag.baseY + floatOffset;
                
                // Gentle rotation
                bag.mesh.rotation.y = Math.sin(time * 0.5 + i) * 0.1;
            });
            
            // Animate particles
            particles.forEach((p, i) => {
                p.rotation.y += 0.01;
                p.children.forEach((child, j) => {
                    if (child.material && child.material.opacity !== undefined) {
                        child.material.opacity = 0.3 + Math.sin(time * 2 + j) * 0.2;
                    }
                });
            });
            
            // Animate holographic ring
            if (holoRing) {
                holoRing.rotation.y += 0.005;
                holoRing.rotation.z = Math.sin(time * 0.5) * 0.05;
            }
            
            // Animate ambient particles
            if (ambientParticles) {
                ambientParticles.rotation.y += 0.002;
                const positions = ambientParticles.geometry.attributes.position.array;
                for (let i = 1; i < positions.length; i += 3) {
                    positions[i] += Math.sin(time + i) * 0.002;
                }
                ambientParticles.geometry.attributes.position.needsUpdate = true;
            }
            
            // Animate lights
            redLight.intensity = 1.5 + Math.sin(time * 2) * 0.3;
            blueLight.intensity = 1.5 + Math.cos(time * 2) * 0.3;
            
            renderer.render(scene, camera);
        };
        
        animate();
        
        this.charts.inventory = { scene, camera, renderer, group: mainGroup, animationId };
    }
    
    // Create professional blood bag mesh
    createBloodBag(item, maxCount) {
        const group = new THREE.Group();
        const fillLevel = Math.max(0.1, item.count / maxCount);
        const bagHeight = 2.5;
        
        // Outer bag container (medical IV bag style)
        const bagShape = new THREE.Shape();
        bagShape.moveTo(-0.8, -1.2);
        bagShape.quadraticCurveTo(-0.9, -0.8, -0.85, 0);
        bagShape.quadraticCurveTo(-0.8, 0.8, -0.6, 1.1);
        bagShape.lineTo(-0.3, 1.3);
        bagShape.lineTo(0.3, 1.3);
        bagShape.lineTo(0.6, 1.1);
        bagShape.quadraticCurveTo(0.8, 0.8, 0.85, 0);
        bagShape.quadraticCurveTo(0.9, -0.8, 0.8, -1.2);
        bagShape.lineTo(-0.8, -1.2);
        
        const extrudeSettings = {
            steps: 1,
            depth: 0.4,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelSegments: 3
        };
        
        // Outer transparent bag
        const bagGeo = new THREE.ExtrudeGeometry(bagShape, extrudeSettings);
        const bagMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 0.1,
            transmission: 0.9,
            thickness: 0.5,
            transparent: true,
            opacity: 0.3,
            clearcoat: 1,
            clearcoatRoughness: 0.1
        });
        const bag = new THREE.Mesh(bagGeo, bagMat);
        bag.position.z = -0.2;
        bag.castShadow = true;
        group.add(bag);
        
        // Blood liquid inside
        const liquidHeight = bagHeight * fillLevel * 0.8;
        const liquidShape = new THREE.Shape();
        const liquidScale = 0.85;
        liquidShape.moveTo(-0.7 * liquidScale, -1.1);
        liquidShape.quadraticCurveTo(-0.8 * liquidScale, -0.7, -0.75 * liquidScale, 0);
        liquidShape.quadraticCurveTo(-0.7 * liquidScale, liquidHeight - 1.2, -0.5 * liquidScale, liquidHeight - 1.1);
        liquidShape.lineTo(0.5 * liquidScale, liquidHeight - 1.1);
        liquidShape.quadraticCurveTo(0.7 * liquidScale, liquidHeight - 1.2, 0.75 * liquidScale, 0);
        liquidShape.quadraticCurveTo(0.8 * liquidScale, -0.7, 0.7 * liquidScale, -1.1);
        liquidShape.lineTo(-0.7 * liquidScale, -1.1);
        
        const liquidGeo = new THREE.ExtrudeGeometry(liquidShape, { ...extrudeSettings, depth: 0.3 });
        const liquidMat = new THREE.MeshPhysicalMaterial({
            color: item.color,
            metalness: 0.1,
            roughness: 0.2,
            transmission: 0.3,
            thickness: 1,
            transparent: true,
            opacity: 0.9,
            clearcoat: 0.5,
            emissive: item.color,
            emissiveIntensity: 0.1
        });
        const liquid = new THREE.Mesh(liquidGeo, liquidMat);
        liquid.position.z = -0.15;
        group.add(liquid);
        
        // Top port/cap
        const portGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 16);
        const portMat = new THREE.MeshStandardMaterial({ 
            color: 0x2c3e50,
            metalness: 0.8,
            roughness: 0.2
        });
        const port = new THREE.Mesh(portGeo, portMat);
        port.position.y = 1.4;
        group.add(port);
        
        // Hanging hook
        const hookGeo = new THREE.TorusGeometry(0.12, 0.03, 8, 16, Math.PI);
        const hookMat = new THREE.MeshStandardMaterial({ 
            color: 0x95a5a6,
            metalness: 0.9,
            roughness: 0.1
        });
        const hook = new THREE.Mesh(hookGeo, hookMat);
        hook.position.y = 1.65;
        hook.rotation.x = Math.PI;
        group.add(hook);
        
        // Tube at bottom
        const tubeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
        const tubeMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.5
        });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.y = -1.45;
        group.add(tube);
        
        // Roller clamp
        const clampGeo = new THREE.BoxGeometry(0.15, 0.1, 0.15);
        const clampMat = new THREE.MeshStandardMaterial({ 
            color: 0xe74c3c,
            metalness: 0.3,
            roughness: 0.5
        });
        const clamp = new THREE.Mesh(clampGeo, clampMat);
        clamp.position.y = -1.5;
        group.add(clamp);
        
        // Glow effect ring
        const glowGeo = new THREE.RingGeometry(0.9, 1.1, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: item.color,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = -1.15;
        group.add(glow);
        
        return group;
    }
    
    // Create floating label with blood type and count
    createFloatingLabel(parent, item, x, z, maxCount) {
        // Create a group for the label
        const labelGroup = new THREE.Group();
        
        // Base platform for label
        const platformGeo = new THREE.CylinderGeometry(0.6, 0.7, 0.1, 6);
        const platformMat = new THREE.MeshStandardMaterial({
            color: item.color,
            metalness: 0.5,
            roughness: 0.3,
            emissive: item.color,
            emissiveIntensity: 0.2
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.y = -0.6;
        labelGroup.add(platform);
        
        // Count indicator ring
        const fillAngle = (item.count / maxCount) * Math.PI * 2;
        const ringGeo = new THREE.RingGeometry(0.65, 0.8, 32, 1, 0, fillAngle);
        const ringMat = new THREE.MeshBasicMaterial({
            color: item.color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.54;
        labelGroup.add(ring);
        
        // Background ring
        const bgRingGeo = new THREE.RingGeometry(0.65, 0.8, 32);
        const bgRingMat = new THREE.MeshBasicMaterial({
            color: 0x333344,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const bgRing = new THREE.Mesh(bgRingGeo, bgRingMat);
        bgRing.rotation.x = -Math.PI / 2;
        bgRing.position.y = -0.55;
        labelGroup.add(bgRing);
        
        labelGroup.position.set(x, 0, z);
        parent.add(labelGroup);
    }
    
    // Create storage unit
    createStorageUnit(parent) {
        // Main platform with gradient effect
        const platformGeo = new THREE.BoxGeometry(14, 0.3, 10);
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            metalness: 0.8,
            roughness: 0.2
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.y = -0.9;
        platform.receiveShadow = true;
        parent.add(platform);
        
        // Glowing edge lines
        const edgeGeo = new THREE.BoxGeometry(14.1, 0.05, 0.05);
        const edgeMat = new THREE.MeshBasicMaterial({
            color: 0x6c5ce7,
            transparent: true,
            opacity: 0.8
        });
        
        [-5, 5].forEach(z => {
            const edge = new THREE.Mesh(edgeGeo, edgeMat);
            edge.position.set(0, -0.73, z);
            parent.add(edge);
        });
        
        // Side edges
        const sideEdgeGeo = new THREE.BoxGeometry(0.05, 0.05, 10.1);
        [-7, 7].forEach(x => {
            const edge = new THREE.Mesh(sideEdgeGeo, edgeMat);
            edge.position.set(x, -0.73, 0);
            parent.add(edge);
        });
        
        // Corner accents
        const cornerGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 16);
        const cornerMat = new THREE.MeshStandardMaterial({
            color: 0x6c5ce7,
            emissive: 0x6c5ce7,
            emissiveIntensity: 0.5,
            metalness: 0.9,
            roughness: 0.1
        });
        
        [[-6.8, -4.8], [-6.8, 4.8], [6.8, -4.8], [6.8, 4.8]].forEach(([x, z]) => {
            const corner = new THREE.Mesh(cornerGeo, cornerMat);
            corner.position.set(x, -0.7, z);
            parent.add(corner);
        });
        
        // Grid pattern on platform
        const gridHelper = new THREE.GridHelper(12, 12, 0x333355, 0x222233);
        gridHelper.position.y = -0.74;
        parent.add(gridHelper);
    }
    
    // Create blood particles effect
    createBloodParticles(color, x, z) {
        const particleGroup = new THREE.Group();
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const geo = new THREE.SphereGeometry(0.03, 8, 8);
            const mat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.5
            });
            const particle = new THREE.Mesh(geo, mat);
            
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 0.8 + Math.random() * 0.3;
            particle.position.set(
                Math.cos(angle) * radius,
                Math.random() * 2,
                Math.sin(angle) * radius
            );
            particleGroup.add(particle);
        }
        
        particleGroup.position.set(x, 0, z);
        return particleGroup;
    }
    
    // Create holographic ring effect
    createHolographicRing() {
        const group = new THREE.Group();
        
        // Outer ring
        const ringGeo = new THREE.TorusGeometry(8, 0.03, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.4
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 3;
        group.add(ring);
        
        // Inner ring
        const innerRingGeo = new THREE.TorusGeometry(6, 0.02, 16, 80);
        const innerRingMat = new THREE.MeshBasicMaterial({
            color: 0xff4757,
            transparent: true,
            opacity: 0.3
        });
        const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
        innerRing.rotation.x = Math.PI / 2;
        innerRing.position.y = 3.2;
        group.add(innerRing);
        
        // Vertical scan lines
        for (let i = 0; i < 4; i++) {
            const lineGeo = new THREE.BoxGeometry(0.02, 4, 0.02);
            const lineMat = new THREE.MeshBasicMaterial({
                color: 0x00d4ff,
                transparent: true,
                opacity: 0.2
            });
            const line = new THREE.Mesh(lineGeo, lineMat);
            const angle = (i / 4) * Math.PI * 2;
            line.position.set(Math.cos(angle) * 7, 1, Math.sin(angle) * 7);
            group.add(line);
        }
        
        return group;
    }
    
    // Create ambient floating particles
    createAmbientParticles() {
        const geometry = new THREE.BufferGeometry();
        const particleCount = 100;
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 20;
            positions[i + 1] = Math.random() * 8;
            positions[i + 2] = (Math.random() - 0.5) * 15;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0x6c5ce7,
            size: 0.05,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        return new THREE.Points(geometry, material);
    }
    
    // Trend Line Chart with 3D Effect
    initTrendChart() {
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / 300, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        
        renderer.setSize(canvas.clientWidth, 300);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.position.set(0, 2, 8);
        camera.lookAt(0, 0, 0);
        
        // Monthly data
        const months = [25, 32, 28, 45, 52, 48, 60, 55, 62, 70, 65, 75];
        const maxVal = Math.max(...months);
        
        const group = new THREE.Group();
        
        // Create 3D line with tubes
        const points = months.map((val, i) => 
            new THREE.Vector3((i - 5.5) * 0.8, (val / maxVal) * 2 - 1, 0)
        );
        
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.08, 8, false);
        const tubeMat = new THREE.MeshPhysicalMaterial({
            color: 0xe74c3c,
            metalness: 0.3,
            roughness: 0.2,
            clearcoat: 1
        });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        group.add(tube);
        
        // Data points
        months.forEach((val, i) => {
            const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
            const sphereMat = new THREE.MeshPhysicalMaterial({
                color: 0x3498db,
                emissive: 0x3498db,
                emissiveIntensity: 0.3
            });
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.x = (i - 5.5) * 0.8;
            sphere.position.y = (val / maxVal) * 2 - 1;
            group.add(sphere);
        });
        
        // Grid
        const gridGeo = new THREE.PlaneGeometry(10, 4, 10, 4);
        const gridMat = new THREE.MeshBasicMaterial({
            color: 0x333344,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        const grid = new THREE.Mesh(gridGeo, gridMat);
        grid.position.z = -0.5;
        group.add(grid);
        
        scene.add(group);
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const pointLight = new THREE.PointLight(0xe74c3c, 0.5, 15);
        pointLight.position.set(0, 3, 3);
        scene.add(pointLight);
        
        // Animate
        const animate = () => {
            requestAnimationFrame(animate);
            group.rotation.y = Math.sin(Date.now() * 0.0005) * 0.1;
            renderer.render(scene, camera);
        };
        animate();
        
        this.charts.trend = { scene, camera, renderer, group };
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.charts3D = new Charts3D();
});
