// Admin Dashboard JavaScript
let currentHospitalId = null;
let currentUserId = null;
let dashboardCharts = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeAdminDashboard();
    setupEventListeners();
    loadDashboardData();
});

// Initialize admin dashboard
function initializeAdminDashboard() {
    // Check authentication
    const token = localStorage.getItem('bloodlink_token');
    if (!token) {
        window.location.href = '/auth/login';
        return;
    }

    // Check if user is admin
    const userData = localStorage.getItem('bloodlink_user');
    if (userData) {
        const user = JSON.parse(userData);
        if (user.userType !== 'admin') {
            showNotification('Access denied. Admin privileges required.', 'error');
            window.location.href = '/';
            return;
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToPage(item.dataset.page);
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Statistics tabs
    document.querySelectorAll('.stat-tab').forEach(tab => {
        tab.addEventListener('click', () => switchStatTab(tab.dataset.tab));
    });

    // Hospital verification buttons
    document.getElementById('verifyHospitalBtn')?.addEventListener('click', verifyHospital);
    document.getElementById('rejectHospitalBtn')?.addEventListener('click', rejectHospital);

    // User status update
    document.getElementById('updateUserStatusBtn')?.addEventListener('click', updateUserStatus);
    document.getElementById('deleteUserBtn')?.addEventListener('click', deleteUser);

    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('show');
        });
    });

    // Filters
    document.getElementById('hospitalSearch')?.addEventListener('input', filterHospitals);
    document.getElementById('verificationFilter')?.addEventListener('change', filterHospitals);
    document.getElementById('userSearch')?.addEventListener('input', filterUsers);
    document.getElementById('userTypeFilter')?.addEventListener('change', filterUsers);
    document.getElementById('userStatusFilter')?.addEventListener('change', filterUsers);
    document.getElementById('logSearch')?.addEventListener('input', filterLogs);
    document.getElementById('logTypeFilter')?.addEventListener('change', filterLogs);
}

// Navigate to page
function navigateToPage(page) {
    // Hide all pages
    document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));

    // Show selected page
    const selectedPage = document.getElementById(page);
    if (selectedPage) {
        selectedPage.classList.add('active');
        document.getElementById('pageTitle').textContent = getPageTitle(page);
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Load page data
    loadPageData(page);
}

function getPageTitle(page) {
    const titles = {
        'dashboard': 'Dashboard',
        'hospitals': 'Hospital Management',
        'users': 'User Management',
        'statistics': 'Platform Statistics',
        'logs': 'System Logs',
        'settings': 'Settings'
    };
    return titles[page] || 'Dashboard';
}

async function loadPageData(page) {
    switch (page) {
        case 'hospitals':
            await loadHospitals();
            break;
        case 'users':
            await loadUsers();
            break;
        case 'statistics':
            await loadStatistics();
            break;
        case 'logs':
            await loadLogs();
            break;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('bloodlink_token');
        const user = JSON.parse(localStorage.getItem('bloodlink_user'));
        
        console.log('[FRONTEND] LoadDashboardData called');
        console.log('[FRONTEND] Token present:', !!token);
        console.log('[FRONTEND] User:', user?.userId, 'Type:', user?.userType);
        
        const response = await fetch('/api/admin/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('[FRONTEND] Dashboard API Response:', { 
            status: response.status, 
            statusText: response.statusText,
            data: data 
        });
        
        if (!response.ok || !data.success) {
            const errorMsg = data.message || 'Unknown error';
            console.error('[FRONTEND] Dashboard load failed:', errorMsg);
            showNotification('Error: ' + errorMsg, 'error');
            return;
        }

        const result = data.data;

        // Update overview metrics
        document.getElementById('systemHealth').textContent = result.health.systemHealth + '%';
        document.getElementById('healthFill').style.width = result.health.systemHealth + '%';
        document.getElementById('activeEmergencies').textContent = result.health.activateEmergencies;
        document.getElementById('responseRate').textContent = result.health.responseRate + '%';
        document.getElementById('donorsOnline').textContent = result.overview.donorsOnline;

        // Update key metrics
        document.getElementById('totalUsers').textContent = result.overview.totalUsers;
        document.getElementById('totalDonors').textContent = result.overview.totalDonors;
        document.getElementById('totalHospitals').textContent = result.overview.totalHospitals;
        document.getElementById('donationsToday').textContent = result.overview.donationsToday;
        document.getElementById('emergenciesToday').textContent = result.overview.emergenciesToday;
        document.getElementById('avgResponseTime').textContent = result.overview.avgResponseTime;
        document.getElementById('lastUpdateTime').textContent = new Date().toLocaleTimeString();

        // Initialize 3D visualization
        try {
            if (typeof THREE !== 'undefined') {
                console.log('[FRONTEND] THREE.js is available, initializing 3D visualization');
                init3DVisualization(result.bloodTypeDistribution);
            } else {
                console.warn('[FRONTEND] THREE.js not loaded yet, skipping 3D visualization');
            }
        } catch (error) {
            console.error('[FRONTEND] Error initializing 3D visualization:', error);
            // Don't break the dashboard if 3D fails
        }

        // Initialize charts
        try {
            initializeCharts(result);
        } catch (error) {
            console.error('[FRONTEND] Error initializing charts:', error);
            // Don't break the dashboard if charts fail
        }

        // Display recent emergencies
        try {
            displayRecentEmergencies(result.recentEmergencies);
        } catch (error) {
            console.error('[FRONTEND] Error displaying emergencies:', error);
            // Don't break the dashboard if emergencies fail
        }

    } catch (error) {
        console.error('Error loading dashboard:', error);
        const errorMsg = error.message || 'Failed to load dashboard data';
        showNotification('❌ ' + errorMsg, 'error');
    }
}

// 3D Visualization
function init3DVisualization(bloodTypeData) {
    // Check if THREE is available
    if (typeof THREE === 'undefined') {
        console.warn('[3D VIZ] THREE.js not loaded, cannot initialize 3D visualization');
        return;
    }
    
    const container = document.getElementById('threeDContainer');
    if (!container || dashboardCharts.scene) return;

    try {
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f7fa);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lighting
    const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
    light1.position.set(5, 5, 5);
    light1.castShadow = true;
    scene.add(light1);

    const light2 = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(light2);

    // Create blood type bars
    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xffa502, 0x95e1d3, 0xf38181, 0xaa96da, 0xfcbad3];
    const maxCount = Math.max(...bloodTypeData.map(d => d.count));
    let offset = -(bloodTypeData.length / 2);

    bloodTypeData.forEach((data, index) => {
        const height = (data.count / maxCount) * 3;
        const geometry = new THREE.BoxGeometry(0.6, height, 0.6);
        const material = new THREE.MeshStandardMaterial({
            color: colors[index % colors.length],
            metalness: 0.3,
            roughness: 0.4
        });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.x = offset + index * 0.8;
        cube.position.y = height / 2;
        cube.castShadow = true;
        cube.receiveShadow = true;

        // Add label (using text would require additional library, so we'll add it visually)
        scene.add(cube);
    });

    // Animation
    function animate() {
        requestAnimationFrame(animate);

        // Rotate scene
        scene.children.forEach((child) => {
            if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) {
                child.rotation.y += 0.005;
            }
        });

        renderer.render(scene, camera);
    }

    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });

    dashboardCharts.scene = scene;
    } catch (error) {
        console.error('[3D VIZ] Error initializing 3D visualization:', error);
    }
}

// Initialize charts
function initializeCharts(data) {
    // Emergency level chart
    const levelCtx = document.getElementById('emergencyLevelChart');
    if (levelCtx) {
        const levelData = data.recentEmergencies.reduce((acc, em) => {
            acc[em.emergencyLevel] = (acc[em.emergencyLevel] || 0) + 1;
            return acc;
        }, {});

        new Chart(levelCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(levelData),
                datasets: [{
                    data: Object.values(levelData),
                    backgroundColor: ['#e74c3c', '#f39c12', '#27ae60'],
                    borderColor: ['#c0392b', '#d68910', '#1e8449'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Blood type chart
    const bloodCtx = document.getElementById('bloodTypeChart');
    if (bloodCtx) {
        const topBloodTypes = data.bloodTypeDistribution.slice(0, 8);

        new Chart(bloodCtx, {
            type: 'bar',
            data: {
                labels: topBloodTypes.map(d => d._id),
                datasets: [{
                    label: 'Donor Count',
                    data: topBloodTypes.map(d => d.count),
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f093fb', '#f5576c',
                        '#4facfe', '#00f2fe', '#fa709a', '#fee140'
                    ],
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'x',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Load hospitals
async function loadHospitals() {
    try {
        const response = await fetch('/api/admin/hospitals', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('bloodlink_token')}`
            }
        });

        const data = await response.json();
        if (!data.success) {
            showNotification('Error loading hospitals', 'error');
            return;
        }

        const tbody = document.getElementById('hospitalsBody');
        tbody.innerHTML = data.data.map(hospital => `
            <tr>
                <td><strong>${hospital.hospitalName}</strong></td>
                <td>${hospital.userId?.email || 'N/A'}</td>
                <td>${hospital.userId?.phone || 'N/A'}</td>
                <td>
                    <span class="status-badge ${hospital.verified ? 'status-verified' : 'status-pending'}">
                        ${hospital.verified ? 'Verified' : 'Pending'}
                    </span>
                </td>
                <td>${new Date(hospital.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-view" onclick="viewHospital('${hospital._id}')">View</button>
                        ${!hospital.verified ? `<button class="btn-action btn-delete" onclick="openVerifyModal('${hospital._id}')">Verify</button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading hospitals:', error);
        showNotification('Error loading hospitals', 'error');
    }
}

// View hospital details
function viewHospital(hospitalId) {
    currentHospitalId = hospitalId;
    const modal = document.getElementById('hospitalModal');
    modal.classList.add('show');
    showNotification('Hospital details modal opened', 'info');
}

// Verify hospital
async function verifyHospital() {
    if (!currentHospitalId) return;

    try {
        const response = await fetch(`/api/admin/hospitals/${currentHospitalId}/verify`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('bloodlink_token')}`
            },
            body: JSON.stringify({ verified: true, notes: 'Verified by admin' })
        });

        const data = await response.json();
        if (data.success) {
            showNotification('Hospital verified successfully', 'success');
            document.getElementById('hospitalModal').classList.remove('show');
            loadHospitals();
        } else {
            showNotification(data.message || 'Error verifying hospital', 'error');
        }
    } catch (error) {
        console.error('Error verifying hospital:', error);
        showNotification('Error verifying hospital', 'error');
    }
}

// Reject hospital
async function rejectHospital() {
    if (!currentHospitalId) return;

    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
        const response = await fetch(`/api/admin/hospitals/${currentHospitalId}/reject`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('bloodlink_token')}`
            },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();
        if (data.success) {
            showNotification('Hospital rejected', 'success');
            document.getElementById('hospitalModal').classList.remove('show');
            loadHospitals();
        } else {
            showNotification(data.message || 'Error rejecting hospital', 'error');
        }
    } catch (error) {
        console.error('Error rejecting hospital:', error);
        showNotification('Error rejecting hospital', 'error');
    }
}

// Open verify modal
function openVerifyModal(hospitalId) {
    currentHospitalId = hospitalId;
    document.getElementById('hospitalModal').classList.add('show');
}

// Load users
async function loadUsers(page = 1, limit = 20) {
    try {
        const response = await fetch(`/api/admin/users?page=${page}&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('bloodlink_token')}`
            }
        });

        const data = await response.json();
        if (!data.success) {
            showNotification('Error loading users', 'error');
            return;
        }

        const tbody = document.getElementById('usersBody');
        tbody.innerHTML = data.data.users.map(user => `
            <tr>
                <td><strong>${user.fullName || 'N/A'}</strong></td>
                <td>${user.email}</td>
                <td>
                    <span class="status-badge">${user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}</span>
                </td>
                <td>
                    <span class="status-badge ${user.accountStatus === 'active' ? 'status-active' : 'status-suspended'}">
                        ${user.accountStatus || 'Active'}
                    </span>
                </td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-view" onclick="viewUser('${user._id}')">Manage</button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users', 'error');
    }
}

// View user
function viewUser(userId) {
    currentUserId = userId;
    document.getElementById('userModal').classList.add('show');
    showNotification('User management modal opened', 'info');
}

// Update user status
async function updateUserStatus() {
    if (!currentUserId) return;

    const status = document.getElementById('userStatusSelect').value;
    const reason = document.getElementById('reasonTextarea').value;

    if (!status) {
        showNotification('Please select a status', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${currentUserId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('bloodlink_token')}`
            },
            body: JSON.stringify({ status, reason })
        });

        const data = await response.json();
        if (data.success) {
            showNotification(`User status updated to ${status}`, 'success');
            document.getElementById('userModal').classList.remove('show');
            loadUsers();
        } else {
            showNotification(data.message || 'Error updating user status', 'error');
        }
    } catch (error) {
        console.error('Error updating user status:', error);
        showNotification('Error updating user status', 'error');
    }
}

// Delete user
async function deleteUser() {
    if (!currentUserId) return;

    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${currentUserId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('bloodlink_token')}`
            }
        });

        const data = await response.json();
        if (data.success) {
            showNotification('User deleted successfully', 'success');
            document.getElementById('userModal').classList.remove('show');
            loadUsers();
        } else {
            showNotification(data.message || 'Error deleting user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user', 'error');
    }
}

// Load statistics
async function loadStatistics() {
    try {
        // Load emergency statistics
        const emergencyRes = await fetch('/api/admin/statistics/emergencies', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('bloodlink_token')}`
            }
        });
        const emergencyData = await emergencyRes.json();

        if (emergencyData.success) {
            document.getElementById('statTotalEmergencies').textContent = emergencyData.data.summary.totalEmergencies;
            document.getElementById('statActiveEmergencies').textContent = emergencyData.data.summary.activeEmergencies;
            document.getElementById('statSuccessRate').textContent = emergencyData.data.summary.successRate + '%';
            document.getElementById('statAvgResponseTime').textContent = emergencyData.data.summary.avgResponseTimeMinutes + ' min';

            // Chart for urgency level
            const urgencyCtx = document.getElementById('urgencyLevelChart');
            if (urgencyCtx) {
                new Chart(urgencyCtx, {
                    type: 'pie',
                    data: {
                        labels: emergencyData.data.byLevel.map(d => d._id),
                        datasets: [{
                            data: emergencyData.data.byLevel.map(d => d.count),
                            backgroundColor: ['#e74c3c', '#f39c12', '#27ae60']
                        }]
                    }
                });
            }

            // Most requested blood types
            const mostRequestedCtx = document.getElementById('mostRequestedChart');
            if (mostRequestedCtx) {
                new Chart(mostRequestedCtx, {
                    type: 'bar',
                    data: {
                        labels: emergencyData.data.mostRequested.map(d => d._id),
                        datasets: [{
                            label: 'Requests',
                            data: emergencyData.data.mostRequested.map(d => d.requests),
                            backgroundColor: '#667eea'
                        }]
                    }
                });
            }
        }

        // Load donor statistics
        const donorRes = await fetch('/api/admin/statistics/donors', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('bloodlink_token')}`
            }
        });
        const donorData = await donorRes.json();

        if (donorData.success) {
            document.getElementById('statTotalDonors').textContent = donorData.data.summary.totalDonors;
            document.getElementById('statActiveDonors').textContent = donorData.data.summary.activeDonors;
            document.getElementById('statAvgDonations').textContent = donorData.data.summary.averageDonationsPerDonor;
            document.getElementById('statTotalDonations').textContent = donorData.data.summary.totalDonationsAcrossPlatform;

            // Display top donors
            const topDonorsList = document.getElementById('topDonorsList');
            topDonorsList.innerHTML = donorData.data.topDonors.map((donor, index) => `
                <div class="top-item">
                    <div style="display: flex; align-items: center; flex: 1;">
                        <div class="top-rank">${index + 1}</div>
                        <div class="top-info">
                            <div class="top-name">${donor.userId?.fullName || 'Unknown'}</div>
                            <div class="top-detail">${donor.bloodGroup} • ${donor.userId?.email}</div>
                        </div>
                    </div>
                    <div class="top-value">${donor.totalDonations} donations</div>
                </div>
            `).join('');
        }

        // Load hospital statistics
        const hospitalRes = await fetch('/api/admin/statistics/hospitals', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('bloodlink_token')}`
            }
        });
        const hospitalData = await hospitalRes.json();

        if (hospitalData.success) {
            document.getElementById('statTotalHospitals').textContent = hospitalData.data.summary.totalHospitals;
            document.getElementById('statVerifiedHospitals').textContent = hospitalData.data.summary.verifiedHospitals;
            document.getElementById('statVerificationRate').textContent = hospitalData.data.summary.verificationRate + '%';

            // Display top hospitals
            const topHospitalsList = document.getElementById('topHospitalsList');
            topHospitalsList.innerHTML = hospitalData.data.topHospitals.map((hospital, index) => `
                <div class="top-item">
                    <div style="display: flex; align-items: center; flex: 1;">
                        <div class="top-rank">${index + 1}</div>
                        <div class="top-info">
                            <div class="top-name">${hospital.hospital}</div>
                            <div class="top-detail">${hospital.city} • ${hospital.totalRequests} requests</div>
                        </div>
                    </div>
                    <div class="top-value">${hospital.successRate}%</div>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error('Error loading statistics:', error);
        showNotification('Error loading statistics', 'error');
    }
}

// Switch stat tabs
function switchStatTab(tab) {
    document.querySelectorAll('.stat-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.stat-content').forEach(c => c.classList.remove('active'));

    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(tab).classList.add('active');
}

// Load logs
async function loadLogs() {
    try {
        const response = await fetch('/api/admin/logs?limit=50', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('bloodlink_token')}`
            }
        });

        const data = await response.json();
        if (!data.success) {
            showNotification('Error loading logs', 'error');
            return;
        }

        const tbody = document.getElementById('logsBody');
        tbody.innerHTML = data.data.map(log => `
            <tr>
                <td>${new Date(log.createdAt).toLocaleString()}</td>
                <td>${log.type || 'System'}</td>
                <td>${log.userId?.fullName || 'System'}</td>
                <td>${log.message}</td>
                <td><span class="status-badge status-active">Logged</span></td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading logs:', error);
        showNotification('Error loading logs', 'error');
    }
}

// Display recent emergencies
function displayRecentEmergencies(emergencies) {
    const container = document.getElementById('recentEmergencies');
    if (!container) return;

    container.innerHTML = emergencies.slice(0, 5).map(emergency => `
        <div class="emergency-item">
            <div class="emergency-info">
                <h4>${emergency.bloodGroup} - ${emergency.unitsNeeded} units</h4>
                <div class="emergency-detail">Hospital: ${emergency.hospitalId?.hospitalName || 'Unknown'}</div>
                <div class="emergency-detail">Patient: ${emergency.patientName}</div>
                <div class="emergency-time">${new Date(emergency.createdAt).toLocaleString()}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: 700;">${emergency.emergencyLevel}</div>
            </div>
        </div>
    `).join('');
}

// Filter functions
function filterHospitals() {
    const search = document.getElementById('hospitalSearch')?.value || '';
    const status = document.getElementById('verificationFilter')?.value || '';

    // Filter table rows
    document.querySelectorAll('#hospitalsBody tr').forEach(row => {
        const name = row.cells[0]?.textContent || '';
        const rowStatus = row.cells[3]?.textContent || '';

        const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !status || rowStatus.toLowerCase().includes(status.toLowerCase());

        row.style.display = matchesSearch && matchesStatus ? '' : 'none';
    });
}

function filterUsers() {
    const search = document.getElementById('userSearch')?.value || '';
    const type = document.getElementById('userTypeFilter')?.value || '';
    const status = document.getElementById('userStatusFilter')?.value || '';

    document.querySelectorAll('#usersBody tr').forEach(row => {
        const name = row.cells[0]?.textContent || '';
        const rowType = row.cells[2]?.textContent || '';
        const rowStatus = row.cells[3]?.textContent || '';

        const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
        const matchesType = !type || rowType.toLowerCase().includes(type.toLowerCase());
        const matchesStatus = !status || rowStatus.toLowerCase().includes(status.toLowerCase());

        row.style.display = matchesSearch && matchesType && matchesStatus ? '' : 'none';
    });
}

function filterLogs() {
    const search = document.getElementById('logSearch')?.value || '';
    const type = document.getElementById('logTypeFilter')?.value || '';

    document.querySelectorAll('#logsBody tr').forEach(row => {
        const message = row.cells[3]?.textContent || '';
        const rowType = row.cells[1]?.textContent || '';

        const matchesSearch = message.toLowerCase().includes(search.toLowerCase());
        const matchesType = !type || rowType.toLowerCase().includes(type.toLowerCase());

        row.style.display = matchesSearch && matchesType ? '' : 'none';
    });
}

// Utility functions
function toggleSidebar() {
    document.querySelector('.admin-sidebar').classList.toggle('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function logout() {
    localStorage.removeItem('bloodlink_token');
    localStorage.removeItem('bloodlink_user');
    window.location.href = '/auth/login';
}
