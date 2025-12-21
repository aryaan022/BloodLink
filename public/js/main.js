// Utility function to fetch API
async function fetchAPI(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include',
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API Error');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 3000);
}

// ============================================
// MOBILE NAVIGATION TOGGLE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Landing page mobile nav
  const mobileNavBtn = document.getElementById('mobileNavBtn');
  const navLinks = document.getElementById('navLinks');
  
  if (mobileNavBtn && navLinks) {
    mobileNavBtn.addEventListener('click', () => {
      mobileNavBtn.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
    
    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNavBtn.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }
  
  // Dashboard mobile sidebar toggle
  const mobileSidebarBtn = document.getElementById('mobileSidebarBtn');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
  if (mobileSidebarBtn && sidebar) {
    mobileSidebarBtn.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      if (sidebarOverlay) {
        sidebarOverlay.classList.toggle('active');
      }
    });
    
    // Close sidebar when clicking overlay
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
      });
    }
    
    // Close sidebar when clicking a nav item on mobile
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('active');
          if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
          }
        }
      });
    });
  }
});

// Initialize Socket.IO connection
const socket = io();

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('urgentRequestAlert', (data) => {
  showNotification(`🚨 Urgent blood request: ${data.message}`, 'urgent');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('BloodLink app initialized');
});
