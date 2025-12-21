// Mapbox Emergency Map Integration
let emergencyMap = null;
let mapboxToken = null;
let userLocation = null;
let emergencyMarkers = [];

// Initialize Mapbox token
async function initMapboxToken() {
    try {
        const response = await fetch('/api/mapbox-token');
        const data = await response.json();
        mapboxToken = data.token;
        mapboxgl.accessToken = mapboxToken;
        return true;
    } catch (error) {
        console.error('Error getting Mapbox token:', error);
        return false;
    }
}

// Initialize emergency map
async function initEmergencyMap() {
    const mapContainer = document.getElementById('emergencyMap');
    if (!mapContainer || !mapboxToken) {
        console.log('Map container not ready or token missing');
        return;
    }

    try {
        // Get user's current location
        userLocation = await getUserLocation();

        // Create map
        emergencyMap = new mapboxgl.Map({
            container: 'emergencyMap',
            style: 'mapbox://styles/mapbox/dark-v11',
            center: userLocation ? [userLocation.longitude, userLocation.latitude] : [0, 0],
            zoom: userLocation ? 12 : 2,
            pitch: 0,
            bearing: 0
        });

        // Add user location marker
        if (userLocation) {
            new mapboxgl.Marker({ color: '#3498db' })
                .setLngLat([userLocation.longitude, userLocation.latitude])
                .setPopup(new mapboxgl.Popup().setHTML('<strong>Your Location</strong>'))
                .addTo(emergencyMap);
        }

        // Add emergency markers
        await updateEmergencyMarkers();

        // Expose map to window for external access
        window.emergencyMap = emergencyMap;

        // Listen for map load
        emergencyMap.on('load', () => {
            console.log('Emergency map loaded');
        });

    } catch (error) {
        console.error('Error initializing emergency map:', error);
    }
}

// Get user's current location
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    console.warn('Geolocation error:', error);
                    // Use default location if geolocation fails
                    resolve({
                        latitude: 20.5937, // Center of world (default)
                        longitude: 78.9629,
                        accuracy: null
                    });
                }
            );
        } else {
            console.warn('Geolocation not supported');
            resolve(null);
        }
    });
}

// Update emergency markers on map
async function updateEmergencyMarkers() {
    if (!emergencyMap) return;

    try {
        const response = await fetch('/api/emergency/active', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const result = await response.json();

        if (!result.success) return;

        // Clear existing markers
        emergencyMarkers.forEach(marker => marker.remove());
        emergencyMarkers = [];

        // Add new emergency markers
        result.data.forEach((emergency) => {
            if (emergency.location && emergency.location.coordinates) {
                const [longitude, latitude] = emergency.location.coordinates;

                const levelColor = {
                    'LifeThreatening': '#e74c3c',
                    'Critical': '#e74c3c',
                    'Urgent': '#f39c12'
                }[emergency.emergencyLevel] || '#95a5a6';

                const markerHTML = `
                    <div style="
                        width: 40px;
                        height: 40px;
                        background: ${levelColor};
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 20px;
                        box-shadow: 0 0 20px ${levelColor};
                        cursor: pointer;
                        border: 3px solid white;
                        animation: pulse-marker 2s infinite;
                    ">
                        🩸
                    </div>
                `;

                const popup = new mapboxgl.Popup({
                    offset: 25,
                    closeButton: true
                }).setHTML(`
                    <div style="font-family: Arial, sans-serif; min-width: 250px;">
                        <h3 style="margin: 0 0 10px 0; color: ${levelColor};">
                            <i class="fas fa-ambulance"></i> ${emergency.bloodGroup} Blood Emergency
                        </h3>
                        <p style="margin: 5px 0;">
                            <strong>Level:</strong> ${emergency.emergencyLevel}
                        </p>
                        <p style="margin: 5px 0;">
                            <strong>Patient:</strong> ${emergency.patientName}
                        </p>
                        <p style="margin: 5px 0;">
                            <strong>Condition:</strong> ${emergency.patientCondition}
                        </p>
                        <p style="margin: 5px 0;">
                            <strong>Units Needed:</strong> ${emergency.unitsNeeded}
                        </p>
                        <p style="margin: 5px 0;">
                            <strong>Hospital:</strong> ${emergency.emergencyContact?.name || 'Contact via phone'}
                        </p>
                        <p style="margin: 5px 0;">
                            <strong>Contact:</strong> <a href="tel:${emergency.emergencyContact?.phone}" style="color: #3498db;">${emergency.emergencyContact?.phone}</a>
                        </p>
                        <p style="margin: 5px 0; color: #27ae60;">
                            <strong>${emergency.totalResponded || 0} donors responding</strong>
                        </p>
                        <button onclick="openEmergencyModal('${emergency._id}', '${emergency.bloodGroup}', '${emergency.emergencyContact?.name || 'Hospital'}')" 
                                style="width: 100%; padding: 8px; margin-top: 10px; background: ${levelColor}; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                            <i class="fas fa-ambulance"></i> Respond to Emergency
                        </button>
                    </div>
                `);

                const marker = new mapboxgl.Marker({
                    element: createMarkerElement(markerHTML),
                    anchor: 'bottom'
                })
                    .setLngLat([longitude, latitude])
                    .setPopup(popup)
                    .addTo(emergencyMap);

                emergencyMarkers.push(marker);

                // Add click handler
                marker.getElement().addEventListener('click', () => {
                    marker.togglePopup();
                });
            }
        });

        // Fit map to show all markers if we have user location and emergencies
        if (userLocation && emergencyMarkers.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            bounds.extend([userLocation.longitude, userLocation.latitude]);
            
            emergencyMarkers.forEach(marker => {
                bounds.extend(marker.getLngLat());
            });

            emergencyMap.fitBounds(bounds, { padding: 100 });
        }

    } catch (error) {
        console.error('Error updating emergency markers:', error);
    }
}

// Helper function to create marker element
function createMarkerElement(html) {
    const el = document.createElement('div');
    el.innerHTML = html;
    return el.firstChild;
}

// Add CSS animation for marker pulse
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse-marker {
        0%, 100% {
            box-shadow: 0 0 20px rgba(231, 76, 60, 0.6);
        }
        50% {
            box-shadow: 0 0 40px rgba(231, 76, 60, 1);
        }
    }
`;
document.head.appendChild(style);

// Initialize map when document is ready
document.addEventListener('DOMContentLoaded', async () => {
    const initialized = await initMapboxToken();
    if (initialized) {
        // Initialize map after a short delay to ensure DOM is ready
        setTimeout(() => {
            const mapContainer = document.getElementById('emergencyMap');
            if (mapContainer) {
                initEmergencyMap();
            }
        }, 500);
    }
});

// Export functions for use in donor-dashboard.js
window.emergencyMapFunctions = {
    initMapboxToken,
    initEmergencyMap,
    updateMarkers: updateEmergencyMarkers,
    getMap: () => emergencyMap
};
