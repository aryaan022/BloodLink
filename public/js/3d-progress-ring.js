// 3D Progress Ring for Donor Profile

let progressScene, progressCamera, progressRenderer, progressRing;

function initProgressRing() {
    const canvas = document.getElementById('progressRingCanvas');
    if (!canvas) return;

    // Scene setup
    progressScene = new THREE.Scene();
    progressScene.background = new THREE.Color(0xffffff);

    // Camera
    progressCamera = new THREE.PerspectiveCamera(
        75,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
    );
    progressCamera.position.z = 3;

    // Renderer
    progressRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    progressRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    progressRenderer.shadowMap.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    progressScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    progressScene.add(directionalLight);

    // Create progress ring
    createProgressRing();

    // Animation loop
    animateProgressRing();

    // Handle resize
    window.addEventListener('resize', onProgressResize);
}

function createProgressRing() {
    const group = new THREE.Group();

    // Background ring
    const bgGeometry = new THREE.TorusGeometry(1.5, 0.2, 32, 100);
    const bgMaterial = new THREE.MeshPhongMaterial({
        color: 0xecf0f1,
        shininess: 30
    });
    const bgRing = new THREE.Mesh(bgGeometry, bgMaterial);
    group.add(bgRing);

    // Progress ring (animated)
    const progressGeometry = new THREE.TorusGeometry(1.5, 0.2, 32, 100);
    const progressMaterial = new THREE.MeshPhongMaterial({
        color: 0xe74c3c,
        emissive: 0xc0392b,
        shininess: 100
    });
    progressRing = new THREE.Mesh(progressGeometry, progressMaterial);
    progressRing.geometry = new THREE.TorusGeometry(1.5, 0.2, 32, 100);
    group.add(progressRing);

    // Center circle (decoration)
    const centerGeometry = new THREE.CircleGeometry(1, 32);
    const centerMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff
    });
    const centerCircle = new THREE.Mesh(centerGeometry, centerMaterial);
    centerCircle.position.z = 0.01;
    group.add(centerCircle);

    progressScene.add(group);

    // Store for animation
    window.progressGroup = group;
}

function animateProgressRing() {
    requestAnimationFrame(animateProgressRing);

    if (window.progressGroup) {
        window.progressGroup.rotation.z += 0.01;
    }

    progressRenderer.render(progressScene, progressCamera);
}

function onProgressResize() {
    const canvas = document.getElementById('progressRingCanvas');
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    progressCamera.aspect = width / height;
    progressCamera.updateProjectionMatrix();
    progressRenderer.setSize(width, height);
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProgressRing);
} else {
    initProgressRing();
}
