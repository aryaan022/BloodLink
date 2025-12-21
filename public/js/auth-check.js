// Authentication Check for Dashboard Pages

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if user is authenticated
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });

        if (!response.ok) {
            // Redirect to login if not authenticated
            window.location.href = '/auth/login';
            return;
        }

        const data = await response.json();
        const user = data.user;

        // Check if user is on correct dashboard
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('/admin/') && user.userType !== 'admin') {
            window.location.href = user.userType === 'donor' ? '/donor/dashboard' : (user.userType === 'hospital' ? '/hospital/dashboard' : '/');
            return;
        }
        
        if (currentPath.includes('/hospital/') && user.userType !== 'hospital') {
            window.location.href = user.userType === 'donor' ? '/donor/dashboard' : (user.userType === 'admin' ? '/admin/dashboard' : '/');
            return;
        }
        
        if (currentPath.includes('/donor/') && user.userType !== 'donor') {
            window.location.href = user.userType === 'hospital' ? '/hospital/dashboard' : (user.userType === 'admin' ? '/admin/dashboard' : '/');
            return;
        }

        // Store user data globally
        window.currentUser = user;
        
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/auth/login';
    }
});

// Logout functionality
document.addEventListener('click', async (e) => {
    if (e.target.id === 'logoutBtn' || e.target.closest('#logoutBtn')) {
        e.preventDefault();
        
        if (confirm('Are you sure you want to logout?')) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                
                window.location.href = '/';
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = '/';
            }
        }
    }
});