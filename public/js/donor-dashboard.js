// Donor Dashboard JavaScript

let currentPage = 'overview';
let socket = null;
let currentDonorId = null;

document.addEventListener('DOMContentLoaded', () => {
    initDonorDashboard();
    loadDonorData();
    setupEventListeners();
    setupMobileSidebar();
    initSocketConnection(); // Initialize socket.io for real-time notifications
});

// =====================================================
// SOCKET.IO CONNECTION FOR REAL-TIME NOTIFICATIONS
// =====================================================

function initSocketConnection() {
    // Connect to socket.io server
    socket = io();

    socket.on('connect', () => {
        console.log('✅ Connected to real-time notification server');
        // Join room with current donor ID
        if (currentDonorId) {
            socket.emit('join', currentDonorId);
        }
    });

    socket.on('emergencyAlert', (data) => {
        console.log('🚨 Emergency Alert Received:', data);
        // Show emergency banner and refresh emergencies
        const banner = document.getElementById('emergencyAlertBanner');
        if (banner) {
            document.getElementById('emergencyAlertText').textContent = `${data.bloodGroup} blood needed at ${data.hospitalName}`;
            banner.style.display = 'flex';
        }
        // Play sound notification
        playEmergencySound();
        // Refresh emergencies
        loadEmergencyRequests();
        // Update emergency count
        updateEmergencyCount();
    });

    socket.on('requestMatched', (data) => {
        console.log('✅ Request Matched:', data);
        showDonorNotification(`${data.hospitalName} has matched your blood type!`, 'success');
    });

    socket.on('notificationUpdate', (data) => {
        console.log('📢 Notification Update:', data);
        loadEmergencyAlerts();
        updateNotificationCount();
    });

    socket.on('disconnect', () => {
        console.log('❌ Disconnected from notification server');
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
}

function playEmergencySound() {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

function showDonorNotification(message, type = 'info') {
    const notification = document.createElement('div');
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
        ${type === 'emergency' ? 'background: linear-gradient(135deg, #e74c3c, #c0392b);' : ''}
        ${type === 'info' ? 'background: linear-gradient(135deg, #3498db, #2980b9);' : ''}
    `;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'emergency' ? 'ambulance' : 'info-circle'}"></i> ${message}
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

async function updateEmergencyCount() {
    try {
        const response = await fetch('/api/emergency/active', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const result = await response.json();
        if (result.success && result.data) {
            const count = result.data.length;
            const badge = document.getElementById('emergencyCount');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            }
        }
    } catch (error) {
        console.error('Error updating emergency count:', error);
    }
}

async function updateNotificationCount() {
    try {
        const response = await fetch('/api/donor/notifications', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const result = await response.json();
        if (result.success && result.data) {
            const unreadCount = result.data.filter(n => !n.isRead).length;
            const badge = document.getElementById('notificationCount');
            if (badge) {
                badge.textContent = unreadCount;
            }
        }
    } catch (error) {
        console.error('Error updating notification count:', error);
    }
}

function updateDonorLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const response = await fetch('/api/donor/update-location', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        })
                    });

                    if (response.ok) {
                        console.log('✅ Location updated successfully');
                    }
                } catch (error) {
                    console.error('Error updating location:', error);
                }
            },
            (error) => {
                console.warn('Geolocation error:', error);
            }
        );
    }
}

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

async function initDonorDashboard() {
    // Load donor profile
    try {
        const profile = await api.getDonorProfile();
        console.log('Donor profile:', profile.data);
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function setupEventListeners() {
    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateToPage(page);
            
            // Close sidebar on mobile after navigation
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                const sidebarOverlay = document.getElementById('sidebarOverlay');
                if (sidebar) sidebar.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            }
        });
    });

    // Form handlers
    if (document.getElementById('profileForm')) {
        document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    }

    if (document.getElementById('notificationsForm')) {
        document.getElementById('notificationsForm').addEventListener('submit', handleNotificationUpdate);
    }

    // Modal close
    const modal = document.getElementById('interestModal');
    if (modal) {
        document.querySelector('.close').addEventListener('click', () => {
            modal.classList.remove('show');
        });
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

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
}

function getPageTitle(page) {
    const titles = {
        'overview': 'Welcome, Donor!',
        'available-requests': 'Available Requests',
        'emergencies': '🚨 Emergency Requests',
        'my-donations': 'My Donation History',
        'achievements': 'Achievements & Badges',
        'certificates': 'My Certificates',
        'profile': 'My Profile',
        'education': 'Blood Donation Education'
    };
    return titles[page] || 'Dashboard';
}

async function loadPageData(page) {
    try {
        switch (page) {
            case 'overview':
                await loadOverviewData();
                await loadEmergencyAlerts();
                break;
            case 'available-requests':
                await loadAvailableRequests();
                break;
            case 'emergencies':
                // Initialize map first, then load emergency requests
                if (!window.emergencyMap) {
                    // Initialize Mapbox token and map
                    if (window.emergencyMapFunctions && window.emergencyMapFunctions.initMapboxToken) {
                        await window.emergencyMapFunctions.initMapboxToken();
                    }
                    if (window.emergencyMapFunctions && window.emergencyMapFunctions.initEmergencyMap) {
                        await window.emergencyMapFunctions.initEmergencyMap();
                    }
                }
                await loadEmergencyRequests();
                break;
            case 'my-donations':
                await loadDonationHistory();
                break;
            case 'achievements':
                await loadAchievements();
                break;
            case 'certificates':
                await loadCertificates();
                break;
            case 'profile':
                await loadProfileData();
                break;
            case 'education':
                // Initialize 3D body model when Education page is shown
                // Use longer delay to ensure page animation completes and container has dimensions
                setTimeout(() => {
                    console.log('Attempting to initialize body model...');
                    if (typeof window.initBodyModel === 'function') {
                        window.initBodyModel();
                        window.bodyModelInitialized = true;
                        console.log('Body model initialization called');
                    } else {
                        console.error('initBodyModel function not found');
                    }
                }, 600);
                break;
        }
    } catch (error) {
        console.error('Error loading page data:', error);
    }
}

async function loadDonorData() {
    try {
        const profile = await api.getDonorProfile();
        const user = profile.data;

        // Store current donor ID for socket connection
        if (user._id) {
            currentDonorId = user._id;
            if (socket) {
                socket.emit('join', currentDonorId);
            }
        }

        // Update geolocation automatically
        updateDonorLocation();

        // Update header with null checks
        const userNameEl = document.getElementById('userName');
        if (userNameEl && user.userId) {
            userNameEl.textContent = user.userId.fullName || 'Donor';
        }

        // Update overview stats
        const totalDonationsEl = document.getElementById('totalDonations');
        const livesImpactedEl = document.getElementById('livesImpacted');
        
        if (totalDonationsEl) totalDonationsEl.textContent = user.totalDonations || 0;
        if (livesImpactedEl) livesImpactedEl.textContent = (user.totalDonations || 0) * 3;

        // Check eligibility
        try {
            const eligibility = await api.checkEligibility();
            const eligData = eligibility.data;
            
            const eligibilityStatusEl = document.getElementById('eligibilityStatus');
            if (eligibilityStatusEl) {
                if (eligData.isEligible) {
                    eligibilityStatusEl.textContent = 'Eligible';
                    eligibilityStatusEl.style.color = '#27ae60';
                } else {
                    eligibilityStatusEl.textContent = 'Not Eligible';
                    eligibilityStatusEl.style.color = '#e74c3c';
                }
            }

            // Update day count
            const dayCountEl = document.getElementById('dayCount');
            if (dayCountEl) {
                if (eligData.daysSinceLastDonation !== null) {
                    dayCountEl.textContent = eligData.daysSinceLastDonation;
                } else {
                    dayCountEl.textContent = 'No donations yet';
                }
            }

            // Update next donation date display in progress section
            const nextDonationDateEl = document.getElementById('nextDonationDate');
            if (nextDonationDateEl) {
                if (eligData.isEligible) {
                    nextDonationDateEl.innerHTML = 'Next eligible: <strong style="color: #27ae60;">Ready to donate now!</strong>';
                } else if (eligData.nextEligibleDate) {
                    const nextDate = new Date(eligData.nextEligibleDate);
                    const formattedDate = nextDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                    });
                    nextDonationDateEl.innerHTML = `Next eligible: <strong style="color: #e74c3c;">${formattedDate}</strong> (${eligData.daysUntilEligible} days)`;
                }
            }

            // Show next eligible date if not eligible
            const nextEligibleEl = document.getElementById('nextEligibleDate');
            if (nextEligibleEl) {
                if (!eligData.isEligible && eligData.nextEligibleDate) {
                    nextEligibleEl.textContent = new Date(eligData.nextEligibleDate).toLocaleDateString();
                    nextEligibleEl.parentElement.style.display = 'block';
                } else {
                    nextEligibleEl.parentElement.style.display = 'none';
                }
            }
            
            // Update eligibility info box if it exists
            const eligInfoEl = document.getElementById('eligibilityInfo');
            if (eligInfoEl) {
                if (eligData.isEligible) {
                    const lastDonationText = eligData.hasDonatedBefore 
                        ? `Last donation: ${eligData.daysSinceLastDonation} days ago` 
                        : 'No previous donations';
                    eligInfoEl.innerHTML = `
                        <div style="padding: 15px; background: rgba(39, 174, 96, 0.1); border-radius: 8px; border: 1px solid rgba(39, 174, 96, 0.3);">
                            <i class="fas fa-check-circle" style="color: #27ae60; font-size: 24px;"></i>
                            <p style="color: #27ae60; margin: 10px 0 0 0; font-weight: 600;">You are eligible to donate!</p>
                            <p style="color: #a0a0a0; margin: 5px 0 0 0; font-size: 0.9rem;">Total donations: ${eligData.totalDonations}</p>
                            <p style="color: #a0a0a0; margin: 5px 0 0 0; font-size: 0.9rem;">${lastDonationText}</p>
                        </div>
                    `;
                } else {
                    const nextDate = new Date(eligData.nextEligibleDate);
                    const formattedNextDate = nextDate.toLocaleDateString('en-US', { 
                        weekday: 'long',
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                    });
                    eligInfoEl.innerHTML = `
                        <div style="padding: 15px; background: rgba(231, 76, 60, 0.1); border-radius: 8px; border: 1px solid rgba(231, 76, 60, 0.3);">
                            <i class="fas fa-clock" style="color: #e74c3c; font-size: 24px;"></i>
                            <p style="color: #e74c3c; margin: 10px 0 0 0; font-weight: 600;">Cooldown Period Active</p>
                            <p style="color: #a0a0a0; margin: 5px 0 0 0; font-size: 0.9rem;">
                                <strong>${eligData.daysUntilEligible}</strong> days remaining until you can donate again.
                            </p>
                            <p style="color: #a0a0a0; margin: 5px 0 0 0; font-size: 0.9rem;">
                                Next eligible date: <strong style="color: #f39c12;">${formattedNextDate}</strong>
                            </p>
                            <p style="color: #a0a0a0; margin: 5px 0 0 0; font-size: 0.85rem;">
                                (${eligData.daysSinceLastDonation} days since last donation, cooldown is ${eligData.cooldownDays} days)
                            </p>
                        </div>
                    `;
                }
            }
        } catch (eligibilityError) {
            console.error('Error checking eligibility:', eligibilityError);
        }
    } catch (error) {
        console.error('Error loading donor data:', error);
        // Set default values on error
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = 'Donor Dashboard';
    }
}

async function loadOverviewData() {
    try {
        const requests = await api.getAvailableRequests();
        displayRecentRequests(requests.data.slice(0, 3));
    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

async function loadAvailableRequests() {
    try {
        const [requestsRes, myRequestsRes] = await Promise.all([
            api.getAvailableRequests(),
            api.getMyRequests()
        ]);
        
        // Get IDs of requests I've already expressed interest in
        const myRequestIds = (myRequestsRes.data || []).map(r => r._id);
        
        displayAvailableRequestsList(requestsRes.data, myRequestIds);
    } catch (error) {
        console.error('Error loading requests:', error);
        displayAvailableRequestsList([], []);
    }
}

function displayRecentRequests(requests) {
    const container = document.getElementById('recentRequests');
    if (!requests || requests.length === 0) {
        container.innerHTML = '<p class="loading">No recent requests available.</p>';
        return;
    }

    container.innerHTML = requests.map(req => `
        <div class="request-item">
            <div class="request-item-header">
                <h3>${req.hospitalId?.hospitalName || 'Hospital'}</h3>
                <span class="request-status ${`status-${req.status}`}">${req.status === 'emergency' ? '🚨 EMERGENCY' : req.status.toUpperCase()}</span>
            </div>
            <div class="request-meta">
                <div class="request-meta-item">
                    <i class="fas fa-droplet"></i> ${req.bloodGroup}
                </div>
                <div class="request-meta-item">
                    <i class="fas fa-vial"></i> ${req.unitsNeeded} units
                </div>
                <div class="request-meta-item">
                    <span class="urgency-${req.urgencyLevel.toLowerCase()}">${req.urgencyLevel}</span>
                </div>
            </div>
            <p><strong>Patient:</strong> ${req.patientName} | <strong>Reason:</strong> ${req.reason}</p>
            <div class="request-actions">
                <button class="btn btn-primary" onclick="expressInterest('${req._id}')">
                    <i class="fas fa-hand-holding-heart"></i> Express Interest
                </button>
                <button class="btn btn-outline" onclick="viewRequestDetails('${req._id}')">Details</button>
            </div>
        </div>
    `).join('');
}

function displayAvailableRequestsList(requests, myRequestIds = []) {
    const container = document.getElementById('availableRequestsList');
    if (!requests || requests.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #a0a0a0;">
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                <p>No available requests matching your blood type in your area.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = requests.map(req => {
        const alreadyInterested = myRequestIds.includes(req._id);
        
        return `
            <div class="request-item ${alreadyInterested ? 'already-interested' : ''}">
                <div class="request-item-header">
                    <h3>${req.hospitalId?.hospitalName || 'Hospital'}</h3>
                    <span class="request-status ${`status-${req.status}`}">${req.status === 'emergency' ? '🚨 EMERGENCY' : req.status.toUpperCase()}</span>
                </div>
                <div class="request-meta">
                    <div class="request-meta-item">
                        <i class="fas fa-droplet"></i> ${req.bloodGroup}
                    </div>
                    <div class="request-meta-item">
                        <i class="fas fa-vial"></i> ${req.unitsNeeded} units
                    </div>
                    <div class="request-meta-item">
                        <i class="fas fa-clock"></i> Required by: ${new Date(req.requiredBy).toLocaleDateString()}
                    </div>
                    <div class="request-meta-item">
                        <span class="urgency-${req.urgencyLevel.toLowerCase()}">${req.urgencyLevel}</span>
                    </div>
                </div>
                <p><strong>Patient:</strong> ${req.patientName} ${req.patientAge ? `(Age: ${req.patientAge})` : ''}</p>
                <p><strong>Reason:</strong> ${req.reason}</p>
                ${req.description ? `<p><strong>Details:</strong> ${req.description}</p>` : ''}
                <div class="request-actions">
                    ${alreadyInterested ? `
                        <button class="btn btn-secondary" disabled style="opacity: 0.7;">
                            <i class="fas fa-check"></i> Interest Expressed
                        </button>
                    ` : `
                        <button class="btn btn-primary" onclick="expressInterest('${req._id}')">
                            <i class="fas fa-hand-holding-heart"></i> Express Interest
                        </button>
                    `}
                    <button class="btn btn-outline" onclick="viewRequestDetails('${req._id}')">
                        <i class="fas fa-info-circle"></i> More Info
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function loadDonationHistory() {
    try {
        // Load both completed donations and active requests
        const [historyRes, myRequestsRes] = await Promise.all([
            api.getDonationHistory(),
            api.getMyRequests()
        ]);
        
        displayDonationHistory(historyRes.data, myRequestsRes.data);
    } catch (error) {
        console.error('Error loading donation history:', error);
        displayDonationHistory([], []);
    }
}

function displayDonationHistory(donations, myRequests) {
    const container = document.getElementById('donationHistory');
    
    // Separate active requests from completed
    const activeRequests = myRequests?.filter(r => 
        r.myStatus !== 'completed' && r.myStatus !== 'rejected'
    ) || [];
    
    let html = '';
    
    // Show active requests first
    if (activeRequests.length > 0) {
        html += `
            <div class="section-header" style="margin-bottom: 15px;">
                <h3 style="color: #f39c12; margin: 0;"><i class="fas fa-clock"></i> Active Requests</h3>
            </div>
        `;
        
        html += activeRequests.map(req => {
            const statusColors = {
                'interested': { bg: '#f39c12', text: 'Awaiting Response' },
                'accepted': { bg: '#3498db', text: 'Accepted - Visit Hospital' }
            };
            const status = statusColors[req.myStatus] || { bg: '#95a5a6', text: req.myStatus };
            
            return `
                <div class="donation-item" style="border-left: 4px solid ${status.bg};">
                    <div class="request-item-header">
                        <h3>${req.hospitalId?.hospitalName || 'Hospital'}</h3>
                        <span class="request-status" style="background: ${status.bg}; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
                            ${status.text}
                        </span>
                    </div>
                    <div class="request-meta">
                        <div class="request-meta-item">
                            <i class="fas fa-tint"></i> ${req.bloodGroup}
                        </div>
                        <div class="request-meta-item">
                            <i class="fas fa-vial"></i> ${req.unitsNeeded} units needed
                        </div>
                        <div class="request-meta-item">
                            <i class="fas fa-user"></i> Patient: ${req.patientName}
                        </div>
                    </div>
                    ${req.myStatus === 'accepted' ? `
                        <div style="margin-top: 10px; padding: 10px; background: rgba(52, 152, 219, 0.2); border-radius: 8px;">
                            <p style="margin: 0; color: #3498db;">
                                <i class="fas fa-info-circle"></i> Your donation has been accepted! Please visit the hospital to complete your donation.
                            </p>
                            ${req.contactPhone ? `<p style="margin: 5px 0 0 0;"><i class="fas fa-phone"></i> Contact: ${req.contactPhone}</p>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
    
    // Show completed donations
    if (donations && donations.length > 0) {
        html += `
            <div class="section-header" style="margin: 25px 0 15px 0;">
                <h3 style="color: #27ae60; margin: 0;"><i class="fas fa-check-circle"></i> Completed Donations</h3>
            </div>
        `;
        
        html += donations.map(donation => `
            <div class="donation-item" style="border-left: 4px solid #27ae60;">
                <div class="request-item-header">
                    <h3>${donation.hospitalId?.hospitalName || donation.donationCenter || 'Hospital'}</h3>
                    <span class="request-status status-fulfilled" style="background: #27ae60;">COMPLETED</span>
                </div>
                <div class="request-meta">
                    <div class="request-meta-item">
                        <i class="fas fa-calendar"></i> ${new Date(donation.donationDate).toLocaleDateString()}
                    </div>
                    <div class="request-meta-item">
                        <i class="fas fa-tint"></i> ${donation.bloodGroup}
                    </div>
                    <div class="request-meta-item">
                        <i class="fas fa-vial"></i> ${donation.unitsCollected || 1} unit(s)
                    </div>
                </div>
                ${donation.notes ? `<p style="margin-top: 10px; color: #a0a0a0;"><strong>Notes:</strong> ${donation.notes}</p>` : ''}
            </div>
        `).join('');
    }
    
    // Show empty state if nothing
    if (!html) {
        html = `
            <div style="text-align: center; padding: 40px; color: #a0a0a0;">
                <i class="fas fa-history" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                <p>No donation history yet.</p>
                <p>Express interest in blood requests to start helping!</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

async function loadProfileData() {
    try {
        const profile = await api.getDonorProfile();
        const user = profile.data;

        document.getElementById('profileBloodGroup').value = user.bloodGroup;
        document.getElementById('profilePhone').value = user.userId.phone;
        document.getElementById('profileAddress').value = user.userId.address;
        document.getElementById('allowContact').checked = user.notificationPreferences?.allowPublicContact || false;
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function expressInterest(requestId) {
    try {
        const response = await api.expressDonorInterest(requestId);
        alert('Interest expressed successfully! The hospital will contact you soon.');
        await loadPageData(currentPage);
    } catch (error) {
        alert('Error expressing interest: ' + error.message);
    }
}

function viewRequestDetails(requestId) {
    // Would navigate to detailed view or open modal
    console.log('View details for request:', requestId);
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        notificationPreferences: {
            email: formData.get('notifEmail') === 'on',
            sms: formData.get('notifSMS') === 'on',
            urgentRequests: formData.get('notifUrgent') === 'on'
        }
    };
    
    try {
        await api.updateDonorProfile(data);
        alert('Profile updated successfully!');
    } catch (error) {
        alert('Error updating profile: ' + error.message);
    }
}

async function handleNotificationUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        notificationPreferences: {
            email: document.getElementById('notifEmail').checked,
            sms: document.getElementById('notifSMS').checked,
            urgentRequests: document.getElementById('notifUrgent').checked
        }
    };
    
    try {
        await api.updateDonorProfile(data);
        alert('Notification preferences updated successfully!');
    } catch (error) {
        alert('Error updating preferences: ' + error.message);
    }
}

// ============================================
// EMERGENCY REQUESTS FUNCTIONALITY
// ============================================

let selectedEmergencyId = null;

async function loadEmergencyAlerts() {
    try {
        const response = await fetch('/api/emergency/active', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
            const emergencyBanner = document.getElementById('emergencyAlertBanner');
            const emergencyCount = document.getElementById('emergencyCount');
            const emergencyAlertText = document.getElementById('emergencyAlertText');
            
            if (emergencyBanner) {
                emergencyBanner.style.display = 'flex';
                emergencyAlertText.textContent = `${data.data.length} urgent blood request(s) matching your blood type need immediate response!`;
            }
            
            if (emergencyCount) {
                emergencyCount.textContent = data.data.length;
                emergencyCount.style.display = 'inline-flex';
            }
        }
    } catch (error) {
        console.error('Error loading emergency alerts:', error);
    }
}

async function loadEmergencyRequests() {
    const container = document.getElementById('emergencyRequestsList');
    container.innerHTML = '<p class="loading">Loading emergency requests...</p>';
    
    try {
        const response = await fetch('/api/emergency/active', {
            credentials: 'include'
        });
        const data = await response.json();
        
        // Update map markers
        if (window.emergencyMapFunctions && window.emergencyMapFunctions.updateMarkers) {
            await window.emergencyMapFunctions.updateMarkers();
        }
        
        if (!data.success || !data.data || data.data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #27ae60; margin-bottom: 15px;"></i>
                    <h3>No Active Emergencies</h3>
                    <p>There are currently no emergency blood requests in your area. Thank you for being ready to help!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.data.map(emergency => {
            const expiresIn = Math.max(0, Math.floor((new Date(emergency.expiresAt) - new Date()) / (1000 * 60)));
            const urgencyClass = emergency.emergencyLevel === 'LifeThreatening' ? 'life-threatening' : 
                                 emergency.emergencyLevel === 'Critical' ? 'critical' : 'urgent';
            
            const hasResponded = emergency.notifiedDonors?.some(
                d => d.responseStatus === 'responding' || d.responseStatus === 'arrived' || d.responseStatus === 'donated'
            );
            
            return `
                <div class="emergency-card ${urgencyClass}">
                    <div class="emergency-header">
                        <div class="emergency-level ${urgencyClass}">
                            <i class="fas fa-exclamation-triangle"></i>
                            ${emergency.emergencyLevel}
                        </div>
                        <div class="emergency-timer">
                            <i class="fas fa-clock"></i>
                            ${expiresIn > 0 ? `${expiresIn} min remaining` : 'Expired'}
                        </div>
                    </div>
                    
                    <div class="emergency-body">
                        <h3>${emergency.hospitalId?.hospitalName || 'Hospital'}</h3>
                        <div class="blood-group-large">${emergency.bloodGroup}</div>
                        <p><strong>${emergency.unitsNeeded}</strong> units needed urgently</p>
                        
                        <div class="emergency-details">
                            <p><i class="fas fa-user-injured"></i> Patient: ${emergency.patientName} ${emergency.patientAge ? `(Age: ${emergency.patientAge})` : ''}</p>
                            <p><i class="fas fa-notes-medical"></i> Condition: ${emergency.patientCondition}</p>
                            ${emergency.conditionDetails ? `<p><i class="fas fa-info-circle"></i> ${emergency.conditionDetails}</p>` : ''}
                            <p><i class="fas fa-phone"></i> Contact: ${emergency.emergencyContact?.phone || 'N/A'}</p>
                            ${emergency.locationAddress ? `<p><i class="fas fa-map-marker-alt"></i> ${emergency.locationAddress}</p>` : ''}
                        </div>
                        
                        <div class="emergency-stats">
                            <span><i class="fas fa-users"></i> ${emergency.totalNotified || 0} notified</span>
                            <span><i class="fas fa-running"></i> ${emergency.totalResponded || 0} responding</span>
                        </div>
                    </div>
                    
                    <div class="emergency-actions">
                        ${hasResponded ? `
                            <button class="btn btn-secondary" disabled>
                                <i class="fas fa-check"></i> You're Responding
                            </button>
                        ` : expiresIn > 0 ? `
                            <button class="btn btn-emergency" onclick="openEmergencyModal('${emergency._id}', '${emergency.bloodGroup}', '${emergency.hospitalId?.hospitalName || 'Hospital'}')">
                                <i class="fas fa-ambulance"></i> Respond Now
                            </button>
                        ` : `
                            <button class="btn btn-secondary" disabled>
                                <i class="fas fa-times"></i> Expired
                            </button>
                        `}
                        <a href="tel:${emergency.emergencyContact?.phone}" class="btn btn-outline">
                            <i class="fas fa-phone"></i> Call Hospital
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading emergencies:', error);
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #e74c3c; margin-bottom: 15px;"></i>
                <h3>Error Loading Emergencies</h3>
                <p>Unable to load emergency requests. Please try again later.</p>
            </div>
        `;
    }
}

function openEmergencyModal(emergencyId, bloodGroup, hospitalName) {
    selectedEmergencyId = emergencyId;
    const modal = document.getElementById('emergencyModal');
    const modalInfo = document.getElementById('emergencyModalInfo');
    
    modalInfo.innerHTML = `
        <div class="emergency-modal-info">
            <div class="blood-group-badge">${bloodGroup}</div>
            <p><strong>${hospitalName}</strong> needs your help immediately!</p>
            <p style="color: #f39c12;">Your response can save a life. Please only respond if you can arrive within the estimated time.</p>
        </div>
    `;
    
    modal.classList.add('show');
    
    // Set up confirm button
    document.getElementById('confirmEmergencyBtn').onclick = () => respondToEmergency(emergencyId);
}

function closeEmergencyModal() {
    const modal = document.getElementById('emergencyModal');
    modal.classList.remove('show');
    selectedEmergencyId = null;
}

async function respondToEmergency(emergencyId) {
    const estimatedArrival = document.getElementById('estimatedArrival').value;
    
    try {
        const response = await fetch(`/api/emergency/${emergencyId}/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ estimatedArrival: parseInt(estimatedArrival) })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeEmergencyModal();
            alert('Thank you! Your response has been recorded. Please head to the hospital immediately.');
            await loadEmergencyRequests();
        } else {
            alert('Error: ' + (data.message || 'Failed to respond to emergency'));
        }
    } catch (error) {
        console.error('Error responding to emergency:', error);
        alert('Error responding to emergency. Please try again.');
    }
}

// ============================================
// ACHIEVEMENTS & BADGES FUNCTIONALITY
// ============================================

async function loadAchievements() {
    try {
        // Load badges
        const badgesResponse = await fetch('/api/badges/my-badges', {
            credentials: 'include'
        });
        const badgesData = await badgesResponse.json();
        
        // Load stats
        const statsResponse = await fetch('/api/badges/stats', {
            credentials: 'include'
        });
        const statsData = await statsResponse.json();
        
        // Load leaderboard
        const leaderboardResponse = await fetch('/api/badges/leaderboard', {
            credentials: 'include'
        });
        const leaderboardData = await leaderboardResponse.json();
        
        if (badgesData.success) {
            displayBadges(badgesData.data);
        }
        
        if (statsData.success) {
            displayStats(statsData.data);
        }
        
        if (leaderboardData.success) {
            displayLeaderboard(leaderboardData.data);
        }
        
        // Also update overview stats
        if (statsData.success) {
            const totalPointsEl = document.getElementById('totalPoints');
            const donorLevelEl = document.getElementById('donorLevel');
            const levelTitleEl = document.getElementById('levelTitle');
            
            if (totalPointsEl) totalPointsEl.textContent = statsData.data.totalPoints || 0;
            if (donorLevelEl) donorLevelEl.textContent = statsData.data.level || 1;
            if (levelTitleEl) levelTitleEl.textContent = statsData.data.levelTitle || 'Newcomer';
        }
    } catch (error) {
        console.error('Error loading achievements:', error);
    }
}

function displayStats(stats) {
    // Update level display
    const achievementLevel = document.getElementById('achievementLevel');
    const achievementLevelTitle = document.getElementById('achievementLevelTitle');
    const levelProgressFill = document.getElementById('levelProgressFill');
    const currentPoints = document.getElementById('currentPoints');
    const nextLevelPoints = document.getElementById('nextLevelPoints');
    const badgeCount = document.getElementById('badgeCount');
    const donationStreak = document.getElementById('donationStreak');
    const emergencyResponseCount = document.getElementById('emergencyResponseCount');
    
    if (achievementLevel) achievementLevel.textContent = stats.level || 1;
    if (achievementLevelTitle) achievementLevelTitle.textContent = stats.levelTitle || 'Newcomer';
    if (levelProgressFill) levelProgressFill.style.width = `${stats.levelProgress || 0}%`;
    if (currentPoints) currentPoints.textContent = stats.totalPoints || 0;
    if (nextLevelPoints) nextLevelPoints.textContent = stats.nextLevelPoints || 100;
    if (badgeCount) badgeCount.textContent = stats.badgeCount || 0;
    if (donationStreak) donationStreak.textContent = stats.streak || 0;
    if (emergencyResponseCount) emergencyResponseCount.textContent = stats.emergencyResponses || 0;
}

function displayBadges(badgesData) {
    const container = document.getElementById('badgesGrid');
    
    if (!badgesData.all || badgesData.all.length === 0) {
        container.innerHTML = '<p>No badges available yet.</p>';
        return;
    }
    
    container.innerHTML = badgesData.all.map(badge => `
        <div class="badge-card ${badge.isEarned ? 'earned' : 'locked'}">
            <div class="badge-icon">${badge.icon}</div>
            <h4>${badge.name}</h4>
            <p>${badge.description}</p>
            <div class="badge-progress">
                <div class="badge-progress-bar">
                    <div class="badge-progress-fill" style="width: ${badge.progress}%"></div>
                </div>
                <span class="badge-progress-text">${badge.current}/${badge.target}</span>
            </div>
            ${badge.isEarned ? `
                <div class="badge-earned-date">
                    <i class="fas fa-check-circle"></i> Earned ${new Date(badge.earnedAt).toLocaleDateString()}
                </div>
            ` : `
                <div class="badge-points">
                    <i class="fas fa-star"></i> ${badge.points} pts
                </div>
            `}
        </div>
    `).join('');
}

function displayLeaderboard(leaderboardData) {
    const container = document.getElementById('leaderboardList');
    
    if (!leaderboardData.leaderboard || leaderboardData.leaderboard.length === 0) {
        container.innerHTML = '<p>No leaderboard data yet. Be the first!</p>';
        return;
    }
    
    let html = leaderboardData.leaderboard.map((donor, index) => {
        const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${donor.rank}`;
        
        return `
            <div class="leaderboard-item ${index < 3 ? 'top-three' : ''}">
                <div class="rank">${rankIcon}</div>
                <div class="donor-info">
                    <h4>${donor.name}</h4>
                    <span class="blood-group-badge small">${donor.bloodGroup}</span>
                </div>
                <div class="donor-stats">
                    <span><i class="fas fa-star"></i> ${donor.totalPoints} pts</span>
                    <span><i class="fas fa-tint"></i> ${donor.totalDonations} donations</span>
                    <span><i class="fas fa-medal"></i> ${donor.badgeCount} badges</span>
                </div>
            </div>
        `;
    }).join('');
    
    // Add user's rank if not in top 10
    if (leaderboardData.userRank && leaderboardData.userRank.rank > 10) {
        html += `
            <div class="leaderboard-divider">...</div>
            <div class="leaderboard-item current-user">
                <div class="rank">#${leaderboardData.userRank.rank}</div>
                <div class="donor-info">
                    <h4>You</h4>
                </div>
                <div class="donor-stats">
                    <span><i class="fas fa-star"></i> ${leaderboardData.userRank.totalPoints} pts</span>
                    <span><i class="fas fa-tint"></i> ${leaderboardData.userRank.totalDonations} donations</span>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ============================================
// CERTIFICATES FUNCTIONALITY
// ============================================

async function loadCertificates() {
    const container = document.getElementById('certificatesGrid');
    container.innerHTML = '<p class="loading">Loading certificates...</p>';
    
    try {
        const response = await fetch('/api/certificate/my-certificates', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success || !data.data || data.data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-certificate" style="font-size: 48px; color: #f39c12; margin-bottom: 15px;"></i>
                    <h3>No Certificates Yet</h3>
                    <p>Complete a blood donation to receive your certificate of appreciation!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.data.map(cert => `
            <div class="certificate-card">
                <div class="certificate-icon">
                    ${cert.isEmergency ? '⚡' : '🏅'}
                </div>
                <div class="certificate-info">
                    <h4>Donation Certificate</h4>
                    <p class="hospital-name">${cert.hospitalName}</p>
                    <div class="certificate-details">
                        <span><i class="fas fa-calendar"></i> ${new Date(cert.donationDate).toLocaleDateString()}</span>
                        <span><i class="fas fa-tint"></i> ${cert.bloodGroup}</span>
                        <span><i class="fas fa-vial"></i> ${cert.unitsCollected} unit(s)</span>
                    </div>
                    ${cert.pointsAwarded ? `<p class="points-earned"><i class="fas fa-star"></i> ${cert.pointsAwarded} points earned</p>` : ''}
                    ${cert.isEmergency ? '<span class="emergency-tag">Emergency Response</span>' : ''}
                </div>
                <div class="certificate-actions">
                    <button class="btn btn-primary" onclick="viewCertificate('${cert.donationId}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-outline" onclick="downloadCertificate('${cert.donationId}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading certificates:', error);
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #e74c3c; margin-bottom: 15px;"></i>
                <h3>Error Loading Certificates</h3>
                <p>Unable to load your certificates. Please try again later.</p>
            </div>
        `;
    }
}

async function viewCertificate(donationId) {
    try {
        const modal = document.getElementById('certificateModal');
        const frame = document.getElementById('certificateFrame');
        
        frame.src = `/api/certificate/download/${donationId}`;
        modal.classList.add('show');
    } catch (error) {
        console.error('Error viewing certificate:', error);
        alert('Error loading certificate. Please try again.');
    }
}

function closeCertificateModal() {
    const modal = document.getElementById('certificateModal');
    modal.classList.remove('show');
    document.getElementById('certificateFrame').src = '';
}

async function downloadCertificate(donationId) {
    try {
        // Open certificate in new tab for printing/downloading
        window.open(`/api/certificate/download/${donationId}`, '_blank');
    } catch (error) {
        console.error('Error downloading certificate:', error);
        alert('Error downloading certificate. Please try again.');
    }
}
