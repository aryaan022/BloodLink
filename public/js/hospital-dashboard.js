// Hospital Dashboard JavaScript

let currentPage = 'overview';

document.addEventListener('DOMContentLoaded', () => {
    initHospitalDashboard();
    setupEventListeners();
    setupMobileSidebar();
});

// Mobile Sidebar Toggle
function setupMobileSidebar() {
    const mobileSidebarBtn = document.getElementById('mobileSidebarBtn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (mobileSidebarBtn && sidebar) {
        mobileSidebarBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.toggle('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active');
            }
            console.log('Sidebar toggled:', sidebar.classList.contains('active'));
        });
    }
    
    // Close sidebar when clicking overlay
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
}

async function initHospitalDashboard() {
    try {
        const profile = await api.getHospitalProfile();
        console.log('Hospital profile:', profile.data);
        
        // Update header
        const hospitalNameEl = document.getElementById('hospitalName');
        if (hospitalNameEl) {
            hospitalNameEl.textContent = profile.data.hospitalName || 'Hospital';
        }
        
        // Load overview data
        await loadOverviewData();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        // Show default values if API fails
        const hospitalNameEl = document.getElementById('hospitalName');
        if (hospitalNameEl) {
            hospitalNameEl.textContent = 'Hospital Dashboard';
        }
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateToPage(page);
        });
    });

    // Form handlers
    if (document.getElementById('createRequestForm')) {
        document.getElementById('createRequestForm').addEventListener('submit', handleCreateRequest);
    }

    if (document.getElementById('profileForm')) {
        document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    }

    if (document.getElementById('inventoryForm')) {
        document.getElementById('inventoryForm').addEventListener('submit', handleInventoryUpdate);
    }

    // Filters
    if (document.getElementById('statusFilter')) {
        document.getElementById('statusFilter').addEventListener('change', loadManageRequests);
    }

    if (document.getElementById('searchRequests')) {
        document.getElementById('searchRequests').addEventListener('input', debounce(loadManageRequests, 300));
    }

    // Modal close
    const modal = document.getElementById('requestModal');
    if (modal) {
        document.querySelector('.close').addEventListener('click', () => {
            modal.classList.remove('show');
        });
    }

    // Emergency request form
    if (document.getElementById('emergencyRequestForm')) {
        document.getElementById('emergencyRequestForm').addEventListener('submit', handleEmergencyRequest);
    }
}

function navigateToPage(page) {
    currentPage = page;

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show selected page
    const selectedPage = document.getElementById(page);
    if (selectedPage) {
        selectedPage.classList.add('active');
        document.getElementById('pageTitle').textContent = getPageTitle(page);
    }

    // Load page data
    loadPageData(page);

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
}

function getPageTitle(page) {
    const titles = {
        'overview': 'Dashboard Overview',
        'emergency-request': '🚨 Emergency Blood Request',
        'create-request': 'Create Blood Request',
        'manage-requests': 'Manage Requests',
        'blood-inventory': 'Blood Inventory Management',
        'profile': 'Hospital Profile',
        'analytics': 'Analytics & Reports'
    };
    return titles[page] || 'Dashboard';
}

async function loadPageData(page) {
    try {
        switch (page) {
            case 'overview':
                await loadOverviewData();
                break;
            case 'emergency-request':
                await loadHospitalEmergencies();
                break;
            case 'manage-requests':
                await loadManageRequests();
                break;
            case 'blood-inventory':
                await loadBloodInventory();
                break;
            case 'profile':
                await loadProfileData();
                break;
            case 'analytics':
                await loadAnalytics();
                break;
        }
    } catch (error) {
        console.error('Error loading page:', error);
    }
}

async function loadOverviewData() {
    try {
        const profile = await api.getHospitalProfile();
        const requests = await api.getHospitalRequests();

        const hospital = profile.data;
        
        // Update stats with null checks
        const activeRequestsEl = document.getElementById('activeRequests');
        const fulfilledRequestsEl = document.getElementById('fulfilledRequests');
        const matchedDonorsEl = document.getElementById('matchedDonors');
        
        if (activeRequestsEl) activeRequestsEl.textContent = hospital.activeRequests || 0;
        if (fulfilledRequestsEl) fulfilledRequestsEl.textContent = hospital.totalRequestsFulfilled || 0;
        if (matchedDonorsEl) matchedDonorsEl.textContent = 0; // Would be calculated

        // Display recent requests
        if (requests.data && requests.data.length > 0) {
            displayRecentRequests(requests.data.slice(0, 5));
        } else {
            displayRecentRequests([]);
        }

        // Initialize 3D charts (if not already done)
        setTimeout(() => {
            if (typeof init3DCharts === 'function') {
                init3DCharts();
            }
        }, 100);
    } catch (error) {
        console.error('Error loading overview:', error);
        // Show default values on error
        displayRecentRequests([]);
    }
}

function displayRecentRequests(requests) {
    const container = document.getElementById('recentRequests');
    if (!requests || requests.length === 0) {
        container.innerHTML = '<p class="loading">No requests yet.</p>';
        return;
    }

    container.innerHTML = requests.map(req => `
        <div class="request-item">
            <div class="request-item-header">
                <h3>${req.patientName}</h3>
                <span class="request-status ${`status-${req.status}`}">${formatStatus(req.status)}</span>
            </div>
            <div class="request-meta">
                <div class="request-meta-item">
                    <i class="fas fa-droplet"></i> ${req.bloodGroup}
                </div>
                <div class="request-meta-item">
                    <i class="fas fa-vial"></i> ${req.unitsFulfilled || 0}/${req.unitsNeeded} units
                </div>
                <div class="request-meta-item">
                    <span class="urgency-${req.urgencyLevel.toLowerCase()}">${req.urgencyLevel}</span>
                </div>
            </div>
            <p><strong>Reason:</strong> ${req.reason}</p>
            <p><strong>Interested Donors:</strong> ${(req.interestedDonors || []).length}</p>
            <div class="request-actions">
                <button class="btn btn-primary" onclick="viewInterestedDonors('${req._id}')">
                    <i class="fas fa-users"></i> Manage Donors (${(req.interestedDonors || []).length})
                </button>
                ${req.status !== 'fulfilled' && req.status !== 'closed' ? `
                    <button class="btn btn-secondary" onclick="showStatusModal('${req._id}', '${req.status}')">
                        <i class="fas fa-edit"></i> Update Status
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function loadManageRequests() {
    try {
        const status = document.getElementById('statusFilter')?.value || '';
        const search = document.getElementById('searchRequests')?.value || '';

        let requests = await api.getHospitalRequests();
        requests = requests.data;

        // Filter by status
        if (status) {
            requests = requests.filter(r => r.status === status);
        }

        // Filter by search
        if (search) {
            requests = requests.filter(r => 
                r.patientName.toLowerCase().includes(search.toLowerCase())
            );
        }

        displayManagedRequests(requests);
    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

function displayManagedRequests(requests) {
    const container = document.getElementById('managedRequests');
    if (!requests || requests.length === 0) {
        container.innerHTML = '<p class="loading">No requests found.</p>';
        return;
    }

    container.innerHTML = requests.map(req => `
        <div class="request-item ${req.status === 'fulfilled' ? 'request-fulfilled' : ''} ${req.status === 'closed' ? 'request-closed' : ''}">
            <div class="request-item-header">
                <h3>${req.patientName}</h3>
                <span class="request-status ${`status-${req.status}`}">${formatStatus(req.status)}</span>
            </div>
            <div class="request-meta">
                <div class="request-meta-item">
                    <i class="fas fa-droplet"></i> Blood Group: ${req.bloodGroup}
                </div>
                <div class="request-meta-item">
                    <i class="fas fa-vial"></i> Units: ${req.unitsFulfilled || 0}/${req.unitsNeeded}
                </div>
                <div class="request-meta-item">
                    <i class="fas fa-user"></i> Age: ${req.patientAge || 'N/A'} | ${req.patientGender || 'N/A'}
                </div>
            </div>
            <p><strong>Reason:</strong> ${req.reason}</p>
            <p><strong>Description:</strong> ${req.description || 'N/A'}</p>
            <p><strong>Required By:</strong> ${new Date(req.requiredBy).toLocaleString()}</p>
            <p><strong>Interested Donors:</strong> ${(req.interestedDonors || []).length} 
                (${(req.interestedDonors || []).filter(d => d.status === 'completed').length} completed)
            </p>
            
            <div class="request-actions">
                <button class="btn btn-primary" onclick="viewInterestedDonors('${req._id}')">
                    <i class="fas fa-users"></i> View Donors (${(req.interestedDonors || []).length})
                </button>
                
                ${req.status !== 'fulfilled' && req.status !== 'closed' ? `
                    <div class="status-actions">
                        ${req.status === 'open' || req.status === 'emergency' ? `
                            <button class="btn btn-warning" onclick="updateRequestStatus('${req._id}', 'in_progress')">
                                <i class="fas fa-spinner"></i> Mark In Progress
                            </button>
                        ` : ''}
                        
                        ${req.status === 'in_progress' ? `
                            <button class="btn btn-success" onclick="updateRequestStatus('${req._id}', 'fulfilled')">
                                <i class="fas fa-check-circle"></i> Mark Fulfilled
                            </button>
                        ` : ''}
                        
                        <button class="btn btn-outline btn-danger" onclick="updateRequestStatus('${req._id}', 'closed')">
                            <i class="fas fa-times-circle"></i> Close Request
                        </button>
                    </div>
                ` : `
                    <span class="status-complete-badge">
                        ${req.status === 'fulfilled' ? '<i class="fas fa-check-circle"></i> Request Fulfilled' : '<i class="fas fa-times-circle"></i> Request Closed'}
                    </span>
                `}
            </div>
        </div>
    `).join('');
}

async function loadBloodInventory() {
    try {
        const profile = await api.getHospitalProfile();
        const inventory = profile.data.bloodStock || {};

        // Populate form
        Object.keys(inventory).forEach(bloodType => {
            const input = document.querySelector(`input[name="${bloodType}"]`);
            if (input) {
                input.value = inventory[bloodType] || 0;
            }
        });

        // Update 3D inventory chart with real data - enhanced colors
        const colorMap = {
            'O+': { hex: 0xff4757, css: '#ff4757' },
            'O-': { hex: 0xff6b81, css: '#ff6b81' },
            'A+': { hex: 0x3742fa, css: '#3742fa' },
            'A-': { hex: 0x5352ed, css: '#5352ed' },
            'B+': { hex: 0x2ed573, css: '#2ed573' },
            'B-': { hex: 0x7bed9f, css: '#7bed9f' },
            'AB+': { hex: 0xa55eea, css: '#a55eea' },
            'AB-': { hex: 0xd1a3ff, css: '#d1a3ff' }
        };
        
        const inventoryData = Object.entries(inventory).map(([type, count]) => ({
            type,
            count: count || 0,
            color: colorMap[type]?.hex || 0x95a5a6
        }));

        // Reinitialize 3D chart with real data if Charts3D exists
        if (window.charts3D && window.charts3D.initInventoryChart) {
            window.charts3D.initInventoryChart(inventoryData);
        }
        
        // Populate legend
        const legendContainer = document.getElementById('inventoryLegend');
        if (legendContainer) {
            legendContainer.innerHTML = inventoryData.map(item => `
                <div class="legend-item">
                    <span class="legend-color" style="background: ${colorMap[item.type]?.css || '#95a5a6'}; box-shadow: 0 0 10px ${colorMap[item.type]?.css || '#95a5a6'};"></span>
                    <span class="legend-type">${item.type}</span>
                    <span class="count">${item.count}</span>
                    <span style="color: rgba(255,255,255,0.5); font-size: 0.75rem;">units</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

async function loadProfileData() {
    try {
        const profile = await api.getHospitalProfile();
        const hospital = profile.data;
        const user = hospital.userId;

        document.getElementById('hospitalNameInput').value = hospital.hospitalName;
        document.getElementById('licenseNumber').value = hospital.licenseNumber;
        document.getElementById('contactPerson').value = hospital.contactPerson;
        document.getElementById('contactPhone').value = hospital.contactPhone;
        document.getElementById('contactEmail').value = user.email;
        document.getElementById('address').value = user.address;
        document.getElementById('website').value = hospital.website || '';
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function loadAnalytics() {
    try {
        const profile = await api.getHospitalProfile();
        const hospital = profile.data;

        document.getElementById('avgResponseTime').textContent = '2.5 hours';
        document.getElementById('fulfillmentRate').textContent = '92%';
        document.getElementById('totalLivesSaved').textContent = (hospital.totalRequestsFulfilled * 3) + '+';
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

async function handleCreateRequest(e) {
    e.preventDefault();
    console.log('Form submitted');
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    console.log('Form data:', data);

    // Validate required fields
    if (!data.bloodGroup || !data.unitsNeeded || !data.patientName || !data.reason || !data.requiredBy) {
        alert('Please fill all required fields');
        return;
    }

    try {
        const response = await api.createBloodRequest(data);
        console.log('Response:', response);
        alert('Blood request created successfully!');
        e.target.reset();
        navigateToPage('manage-requests');
    } catch (error) {
        console.error('Error creating request:', error);
        alert('Error creating request: ' + error.message);
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        hospitalName: formData.get('hospitalName'),
        licenseNumber: formData.get('licenseNumber'),
        contactPerson: formData.get('contactPerson'),
        contactPhone: formData.get('contactPhone'),
        website: formData.get('website')
    };
    
    try {
        await api.updateHospitalProfile(data);
        alert('Profile updated successfully!');
    } catch (error) {
        alert('Error updating profile: ' + error.message);
    }
}

async function handleInventoryUpdate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const bloodStock = Object.fromEntries(formData);

    try {
        await api.updateBloodStock(bloodStock);
        alert('Blood inventory updated successfully!');
        navigateToPage('blood-inventory');
    } catch (error) {
        alert('Error updating inventory: ' + error.message);
    }
}

// =====================================================
// EMERGENCY REQUEST FUNCTIONS
// =====================================================

async function handleEmergencyRequest(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const emergencyLevel = document.querySelector('input[name="emergencyLevel"]:checked')?.value || 'Critical';
    
    const data = {
        bloodGroup: formData.get('bloodGroup'),
        unitsNeeded: parseInt(formData.get('unitsNeeded')) || 1,
        emergencyLevel: emergencyLevel,
        patientName: formData.get('patientName'),
        patientAge: formData.get('patientAge') || null,
        patientCondition: formData.get('patientCondition'),
        conditionDetails: formData.get('conditionDetails') || '',
        requiredWithin: parseInt(formData.get('requiredWithin')) || 60,
        contactPhone: formData.get('contactPhone'),
        contactName: formData.get('contactName') || 'Emergency Contact',
        locationAddress: formData.get('locationAddress') || ''
    };

    // Validate required fields
    if (!data.bloodGroup || !data.unitsNeeded || !data.patientName || !data.patientCondition || !data.contactPhone) {
        showNotification('Please fill all required fields', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Broadcasting Emergency...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/emergency/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to create emergency request');
        }

        // Show success message
        showNotification(`🚨 Emergency Alert Sent!\n${result.data.notifiedCount} donors have been notified.`, 'success');
        
        // Reset form
        e.target.reset();
        
        // Refresh emergency list
        await loadHospitalEmergencies();
        
    } catch (error) {
        console.error('Error creating emergency request:', error);
        showNotification('Error: ' + error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function loadHospitalEmergencies() {
    const container = document.getElementById('hospitalEmergenciesList');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading emergencies...</div>';

    try {
        const response = await fetch('/api/emergency/hospital', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to load emergencies');
        }

        displayHospitalEmergencies(result.data || []);
    } catch (error) {
        console.error('Error loading emergencies:', error);
        container.innerHTML = '<p class="error-message">Failed to load emergencies. Please try again.</p>';
    }
}

function displayHospitalEmergencies(emergencies) {
    const container = document.getElementById('hospitalEmergenciesList');
    if (!container) return;

    if (!emergencies || emergencies.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-ambulance" style="font-size: 48px; color: rgba(255,255,255,0.3); margin-bottom: 15px;"></i>
                <p>No active emergency requests</p>
                <p style="font-size: 0.9em; color: rgba(255,255,255,0.5);">Create an emergency request above to notify eligible donors</p>
            </div>
        `;
        return;
    }

    container.innerHTML = emergencies.map(emergency => {
        const statusColors = {
            'active': '#f39c12',
            'responded': '#3498db',
            'fulfilled': '#27ae60',
            'expired': '#95a5a6',
            'cancelled': '#e74c3c'
        };
        
        const levelColors = {
            'Critical': '#e74c3c',
            'LifeThreatening': '#ff6b6b',
            'Urgent': '#f39c12'
        };

        const respondedDonors = emergency.notifiedDonors?.filter(d => d.responseStatus === 'responding' || d.responseStatus === 'arrived') || [];
        const arrivedDonors = emergency.notifiedDonors?.filter(d => d.responseStatus === 'arrived' || d.donationCompleted) || [];
        
        return `
            <div class="emergency-card" style="background: linear-gradient(135deg, rgba(231, 76, 60, 0.1) 0%, rgba(0,0,0,0.3) 100%); border: 1px solid ${levelColors[emergency.emergencyLevel] || '#f39c12'}; border-radius: 12px; padding: 20px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <span class="emergency-level" style="background: ${levelColors[emergency.emergencyLevel]}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                            ${emergency.emergencyLevel === 'LifeThreatening' ? 'LIFE THREATENING' : emergency.emergencyLevel.toUpperCase()}
                        </span>
                        <h3 style="margin: 10px 0 5px 0; color: white;">${emergency.patientName || 'Patient'}</h3>
                        <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 14px;">${emergency.patientCondition}</p>
                    </div>
                    <div style="text-align: right;">
                        <span class="blood-badge" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 18px;">
                            ${emergency.bloodGroup}
                        </span>
                        <p style="color: rgba(255,255,255,0.6); margin: 5px 0 0 0; font-size: 12px;">${emergency.unitsNeeded} unit(s) needed</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                    <div style="text-align: center;">
                        <i class="fas fa-bell" style="color: #f39c12; font-size: 20px;"></i>
                        <p style="color: white; font-size: 18px; font-weight: bold; margin: 5px 0;">${emergency.totalNotified || emergency.notifiedDonors?.length || 0}</p>
                        <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">Notified</p>
                    </div>
                    <div style="text-align: center;">
                        <i class="fas fa-hand-holding-heart" style="color: #3498db; font-size: 20px;"></i>
                        <p style="color: white; font-size: 18px; font-weight: bold; margin: 5px 0;">${respondedDonors.length}</p>
                        <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">Responding</p>
                    </div>
                    <div style="text-align: center;">
                        <i class="fas fa-hospital" style="color: #27ae60; font-size: 20px;"></i>
                        <p style="color: white; font-size: 18px; font-weight: bold; margin: 5px 0;">${arrivedDonors.length}</p>
                        <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">Arrived</p>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                    <span style="color: rgba(255,255,255,0.5); font-size: 12px;">
                        <i class="fas fa-clock"></i> Created ${formatTimeAgo(emergency.createdAt)}
                    </span>
                    <div style="display: flex; gap: 10px;">
                        ${emergency.status === 'active' || emergency.status === 'responded' ? `
                            <button class="btn btn-sm btn-primary" onclick="viewEmergencyResponders('${emergency._id}')" style="padding: 8px 16px; font-size: 12px;">
                                <i class="fas fa-users"></i> View Responders
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="cancelEmergency('${emergency._id}')" style="padding: 8px 16px; font-size: 12px; border-color: #e74c3c; color: #e74c3c;">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        ` : `
                            <span style="padding: 8px 16px; background: ${statusColors[emergency.status]}; color: white; border-radius: 6px; font-size: 12px;">
                                ${emergency.status.toUpperCase().replace('_', ' ')}
                            </span>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

async function viewEmergencyResponders(emergencyId) {
    try {
        const response = await fetch(`/api/emergency/${emergencyId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        const emergency = result.data;
        const responders = emergency.notifiedDonors?.filter(d => d.responseStatus === 'responding' || d.responseStatus === 'arrived') || [];

        // Create or get modal
        let modal = document.getElementById('emergencyRespondersModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'emergencyRespondersModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <span class="close" onclick="closeEmergencyRespondersModal()">&times;</span>
                <h2 style="margin-bottom: 20px; color: white;">
                    <i class="fas fa-users" style="color: #e74c3c;"></i> Emergency Responders
                </h2>
                <div style="background: rgba(231, 76, 60, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: white;"><strong>${emergency.bloodGroup}</strong> - ${emergency.patientCondition}</p>
                    <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.7); font-size: 14px;">${responders.length} donor(s) responding</p>
                </div>
                ${responders.length === 0 ? `
                    <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                        <i class="fas fa-hourglass-half" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p>No donors have responded yet.</p>
                        <p style="font-size: 14px;">Donors have been notified and may respond soon.</p>
                    </div>
                ` : responders.map(donor => {
                    const userInfo = donor.donorUserId || {};
                    const donorInfo = donor.donorId || {};
                    const hasArrived = donor.responseStatus === 'arrived' || donor.actualArrivalTime;
                    return `
                        <div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 15px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <h4 style="color: white; margin: 0 0 5px 0;">${userInfo.fullName || 'Anonymous Donor'}</h4>
                                    <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: 14px;">
                                        <i class="fas fa-phone"></i> ${userInfo.phone || 'N/A'}
                                    </p>
                                </div>
                                <div style="text-align: right;">
                                    ${hasArrived ? `
                                        <span style="background: #27ae60; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
                                            <i class="fas fa-check"></i> Arrived
                                        </span>
                                    ` : `
                                        <span style="background: #3498db; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
                                            <i class="fas fa-car"></i> On the way
                                        </span>
                                    `}
                                </div>
                            </div>
                            ${!hasArrived ? `
                                <div style="margin-top: 10px; display: flex; gap: 10px;">
                                    <button class="btn btn-sm btn-success" onclick="markDonorArrived('${emergencyId}', '${donorInfo._id || donor.donorId}')" style="flex: 1;">
                                        <i class="fas fa-check"></i> Mark Arrived
                                    </button>
                                    <button class="btn btn-sm btn-primary" onclick="completeEmergencyDonation('${emergencyId}', '${donorInfo._id || donor.donorId}')" style="flex: 1;">
                                        <i class="fas fa-tint"></i> Complete Donation
                                    </button>
                                </div>
                            ` : `
                                <div style="margin-top: 10px;">
                                    <button class="btn btn-sm btn-success" onclick="completeEmergencyDonation('${emergencyId}', '${donorInfo._id || donor.donorId}')" style="width: 100%;">
                                        <i class="fas fa-check-double"></i> Record Donation Completed
                                    </button>
                                </div>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error loading responders:', error);
        showNotification('Error loading responders', 'error');
    }
}

function closeEmergencyRespondersModal() {
    const modal = document.getElementById('emergencyRespondersModal');
    if (modal) modal.style.display = 'none';
}

async function markDonorArrived(emergencyId, donorId) {
    try {
        const response = await fetch(`/api/emergency/${emergencyId}/arrived`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ donorId })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        showNotification('Donor marked as arrived!', 'success');
        viewEmergencyResponders(emergencyId); // Refresh modal
        loadHospitalEmergencies(); // Refresh list
    } catch (error) {
        console.error('Error marking donor arrived:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

async function completeEmergencyDonation(emergencyId, donorId) {
    const unitsCollected = prompt('Enter units collected (default: 1):', '1');
    if (unitsCollected === null) return;

    try {
        const response = await fetch(`/api/emergency/${emergencyId}/complete-donation`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
                donorId, 
                unitsCollected: parseInt(unitsCollected) || 1 
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        showNotification('🎉 Donation completed! Donor has earned points and badges.', 'success');
        closeEmergencyRespondersModal();
        loadHospitalEmergencies();
    } catch (error) {
        console.error('Error completing donation:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

async function cancelEmergency(emergencyId) {
    if (!confirm('Are you sure you want to cancel this emergency request? This will notify all responding donors.')) {
        return;
    }

    try {
        const response = await fetch(`/api/emergency/${emergencyId}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        showNotification('Emergency request cancelled', 'success');
        loadHospitalEmergencies();
    } catch (error) {
        console.error('Error cancelling emergency:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        ${type === 'success' ? 'background: linear-gradient(135deg, #27ae60, #2ecc71);' : ''}
        ${type === 'error' ? 'background: linear-gradient(135deg, #e74c3c, #c0392b);' : ''}
        ${type === 'info' ? 'background: linear-gradient(135deg, #3498db, #2980b9);' : ''}
    `;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// =====================================================
// END EMERGENCY REQUEST FUNCTIONS
// =====================================================

async function closeRequest(requestId) {
    if (!confirm('Are you sure you want to close this request?')) return;

    try {
        await api.closeBloodRequest(requestId);
        alert('Request closed successfully');
        await loadManageRequests();
    } catch (error) {
        alert('Error closing request: ' + error.message);
    }
}

function viewRequestDetail(requestId) {
    console.log('View request detail:', requestId);
}

function editRequest(requestId) {
    console.log('Edit request:', requestId);
}

async function viewInterestedDonors(requestId) {
    try {
        const response = await api.getBloodRequest(requestId);
        const request = response.data;
        const donors = request.interestedDonors || [];
        
        const modal = document.getElementById('donorsModal');
        const donorsList = document.getElementById('donorsList');
        
        // Store current request ID for later use
        window.currentRequestId = requestId;
        
        if (donors.length === 0) {
            donorsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #a0a0a0;">
                    <i class="fas fa-user-clock" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                    <p>No donors have expressed interest yet.</p>
                </div>
            `;
        } else {
            donorsList.innerHTML = donors.map(donor => {
                const donorUser = donor.donorUserId || {};
                const statusColor = {
                    'interested': '#f39c12',
                    'accepted': '#3498db',
                    'rejected': '#e74c3c',
                    'completed': '#27ae60'
                };
                const statusIcon = {
                    'interested': 'clock',
                    'accepted': 'check',
                    'rejected': 'times',
                    'completed': 'check-double'
                };
                const currentStatus = donor.status || 'interested';
                
                return `
                    <div class="donor-card" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1); ${currentStatus === 'completed' ? 'border-color: #27ae60;' : ''}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h3 style="color: #fff; margin: 0;">${donorUser.fullName || 'Anonymous Donor'}</h3>
                            <span class="status-badge" style="padding: 5px 12px; border-radius: 20px; font-size: 12px; background: ${statusColor[currentStatus]}; color: white;">
                                <i class="fas fa-${statusIcon[currentStatus]}"></i> ${currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                            </span>
                        </div>
                        <div style="color: #a0a0a0; font-size: 14px;">
                            <p style="margin: 5px 0;"><i class="fas fa-tint" style="color: #e74c3c; width: 20px;"></i> Blood Group: <strong style="color: #fff;">${donorUser.bloodGroup || request.bloodGroup || 'N/A'}</strong></p>
                            <p style="margin: 5px 0;"><i class="fas fa-phone" style="color: #3498db; width: 20px;"></i> Phone: <strong style="color: #fff;">${donorUser.phone || 'N/A'}</strong></p>
                            <p style="margin: 5px 0;"><i class="fas fa-envelope" style="color: #9b59b6; width: 20px;"></i> Email: <strong style="color: #fff;">${donorUser.email || 'N/A'}</strong></p>
                            ${donor.donationDate ? `<p style="margin: 5px 0;"><i class="fas fa-calendar-check" style="color: #27ae60; width: 20px;"></i> Donated on: <strong style="color: #27ae60;">${new Date(donor.donationDate).toLocaleDateString()}</strong></p>` : ''}
                        </div>
                        
                        ${currentStatus === 'completed' ? `
                            <div style="margin-top: 15px; padding: 10px; background: rgba(39, 174, 96, 0.2); border-radius: 8px; text-align: center;">
                                <i class="fas fa-check-circle" style="color: #27ae60; font-size: 24px;"></i>
                                <p style="color: #27ae60; margin: 5px 0 0 0;">Donation Completed</p>
                            </div>
                        ` : currentStatus === 'rejected' ? `
                            <div style="margin-top: 15px; padding: 10px; background: rgba(231, 76, 60, 0.2); border-radius: 8px; text-align: center;">
                                <i class="fas fa-times-circle" style="color: #e74c3c; font-size: 24px;"></i>
                                <p style="color: #e74c3c; margin: 5px 0 0 0;">Rejected</p>
                            </div>
                        ` : `
                            <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                                ${currentStatus === 'interested' ? `
                                    <button class="btn btn-primary" onclick="updateDonorStatus('${requestId}', '${donorUser._id}', 'accepted')" style="flex: 1; min-width: 120px;">
                                        <i class="fas fa-check"></i> Accept
                                    </button>
                                    <button class="btn btn-outline" onclick="updateDonorStatus('${requestId}', '${donorUser._id}', 'rejected')" style="flex: 1; min-width: 120px; border-color: #e74c3c; color: #e74c3c;">
                                        <i class="fas fa-times"></i> Reject
                                    </button>
                                ` : ''}
                                ${currentStatus === 'accepted' ? `
                                    <button class="btn btn-success" onclick="showCompleteDonationModal('${requestId}', '${donorUser._id}', '${donorUser.fullName || 'Donor'}')" style="flex: 1; background: #27ae60;">
                                        <i class="fas fa-check-double"></i> Mark Donation Complete
                                    </button>
                                    <button class="btn btn-outline" onclick="updateDonorStatus('${requestId}', '${donorUser._id}', 'rejected')" style="flex: 1; border-color: #e74c3c; color: #e74c3c;">
                                        <i class="fas fa-times"></i> Cancel
                                    </button>
                                ` : ''}
                            </div>
                        `}
                    </div>
                `;
            }).join('');
        }
        
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error fetching donors:', error);
        alert('Error loading donor information');
    }
}

function closeDonorsModal() {
    document.getElementById('donorsModal').style.display = 'none';
}

async function updateDonorStatus(requestId, donorUserId, status) {
    try {
        await api.updateDonorStatus(requestId, donorUserId, status);
        alert(`Donor ${status === 'accepted' ? 'accepted' : 'rejected'} successfully!`);
        viewInterestedDonors(requestId); // Refresh the list
        loadManageRequests(); // Refresh the main list too
    } catch (error) {
        console.error('Error updating donor status:', error);
        alert('Error updating donor status');
    }
}

// Format status for display
function formatStatus(status) {
    const statusMap = {
        'open': 'OPEN',
        'in_progress': 'IN PROGRESS',
        'fulfilled': 'FULFILLED',
        'closed': 'CLOSED',
        'emergency': 'EMERGENCY'
    };
    return statusMap[status] || status.toUpperCase();
}

// Update request status
async function updateRequestStatus(requestId, status) {
    const confirmMessages = {
        'in_progress': 'Mark this request as In Progress?',
        'fulfilled': 'Mark this request as Fulfilled? This indicates all blood units have been collected.',
        'closed': 'Close this request? This will notify all interested donors.'
    };
    
    if (!confirm(confirmMessages[status] || 'Update request status?')) return;

    try {
        await api.updateRequestStatus(requestId, status);
        alert(`Request ${formatStatus(status).toLowerCase()} successfully!`);
        await loadManageRequests();
        await loadOverviewData();
    } catch (error) {
        console.error('Error updating request status:', error);
        alert('Error updating request status: ' + error.message);
    }
}

// Show complete donation modal
function showCompleteDonationModal(requestId, donorUserId, donorName) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('completeDonationModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'completeDonationModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <span class="close" onclick="closeCompleteDonationModal()">&times;</span>
                <h2 style="margin-bottom: 20px;"><i class="fas fa-check-double" style="color: #27ae60;"></i> Complete Donation</h2>
                <p id="completeDonorName" style="color: #a0a0a0; margin-bottom: 20px;"></p>
                <form id="completeDonationForm">
                    <input type="hidden" id="completeRequestId">
                    <input type="hidden" id="completeDonorUserId">
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label for="unitsCollected" style="display: block; margin-bottom: 5px; color: #fff;">Units Collected</label>
                        <input type="number" id="unitsCollected" name="unitsCollected" value="1" min="1" max="5" 
                            style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: #fff;">
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="donationNotes" style="display: block; margin-bottom: 5px; color: #fff;">Notes (Optional)</label>
                        <textarea id="donationNotes" name="notes" rows="3" placeholder="Any notes about the donation..."
                            style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: #fff; resize: vertical;"></textarea>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button type="submit" class="btn btn-success" style="flex: 1; background: #27ae60;">
                            <i class="fas fa-check"></i> Confirm Donation
                        </button>
                        <button type="button" class="btn btn-outline" onclick="closeCompleteDonationModal()" style="flex: 1;">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add form submit handler
        document.getElementById('completeDonationForm').addEventListener('submit', handleCompleteDonation);
    }
    
    // Set values
    document.getElementById('completeRequestId').value = requestId;
    document.getElementById('completeDonorUserId').value = donorUserId;
    document.getElementById('completeDonorName').textContent = `Recording donation for: ${donorName}`;
    document.getElementById('unitsCollected').value = 1;
    document.getElementById('donationNotes').value = '';
    
    modal.style.display = 'flex';
}

function closeCompleteDonationModal() {
    const modal = document.getElementById('completeDonationModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function handleCompleteDonation(e) {
    e.preventDefault();
    
    const requestId = document.getElementById('completeRequestId').value;
    const donorUserId = document.getElementById('completeDonorUserId').value;
    const unitsCollected = parseInt(document.getElementById('unitsCollected').value) || 1;
    const notes = document.getElementById('donationNotes').value;
    
    try {
        const result = await api.completeDonation(requestId, donorUserId, unitsCollected, notes);
        
        closeCompleteDonationModal();
        closeDonorsModal();
        
        // Show success message with details
        alert(`✅ Donation recorded successfully!\n\nDonor's total donations: ${result.data.totalDonations}\nNext eligible date: ${new Date(result.data.nextEligibleDate).toLocaleDateString()}`);
        
        // Refresh data
        await loadManageRequests();
        await loadOverviewData();
    } catch (error) {
        console.error('Error completing donation:', error);
        alert('Error recording donation: ' + error.message);
    }
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const donorsModal = document.getElementById('donorsModal');
    if (e.target === donorsModal) {
        donorsModal.style.display = 'none';
    }
});

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
