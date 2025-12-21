// ============================================
// BLOODLINK - MODERN AUTHENTICATION MODULE
// ============================================

class AuthManager {
    constructor() {
        this.apiBase = '/api/auth';
        this.tokenKey = 'bloodlink_token';
        this.userKey = 'bloodlink_user';
    }

    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    setUser(user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    getUser() {
        const user = localStorage.getItem(this.userKey);
        return user ? JSON.parse(user) : null;
    }

    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        window.location.href = '/';
    }

    isAuthenticated() {
        return !!this.getToken();
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
        };
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const url = `${this.apiBase}${endpoint}`;
        const options = {
            method,
            headers: this.getHeaders()
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'API Error');
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
}

const auth = new AuthManager();

// ============================================
// FORM VALIDATION UTILITIES
// ============================================

const FormValidator = {
    isEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    isPassword: (password) => password.length >= 6,
    isPhone: (phone) => /^[\+]?[0-9\s\-\(\)]{10,15}$/.test(phone),
    isNotEmpty: (value) => value && value.trim().length > 0,
    
    validateField: (fieldName, value, formData = null) => {
        switch(fieldName) {
            case 'email':
                return FormValidator.isEmail(value) ? '' : 'Please enter a valid email';
            case 'password':
                return FormValidator.isPassword(value) ? '' : 'Password must be at least 6 characters';
            case 'confirmPassword':
                if (!value) return 'Please confirm your password';
                if (formData && value !== formData.password) return 'Passwords do not match';
                return '';
            case 'phone':
                return FormValidator.isPhone(value) ? '' : 'Please enter a valid phone number';
            case 'pincode':
                return /^\d{6}$/.test(value) ? '' : 'Please enter a valid 6-digit pincode';
            case 'bloodGroup':
                return value ? '' : 'Please select a blood group';
            case 'age':
                // Age is optional for donors
                return '';
            case 'terms':
                // Terms checkbox is validated separately
                return '';
            case 'name':
            case 'hospitalName':
                return FormValidator.isNotEmpty(value) ? '' : 'This field is required';
            case 'address':
            case 'city':
            case 'state':
                return FormValidator.isNotEmpty(value) ? '' : 'This field is required';
            case 'licenseNumber':
                return FormValidator.isNotEmpty(value) ? '' : 'License number is required';
            default:
                return FormValidator.isNotEmpty(value) ? '' : 'This field is required';
        }
    }
};

// ============================================
// FORM FIELD VALIDATION HANDLER
// ============================================

function showFormError(form, message) {
    // Try to show in a modal or alert
    const modal = document.getElementById('errorModal');
    if (modal) {
        modal.querySelector('p').textContent = message;
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 3000);
    } else {
        alert(message);
    }
}

function setupFieldValidation(form) {
    const fields = form.querySelectorAll('[name]');
    
    fields.forEach(field => {
        field.addEventListener('blur', () => validateField(field));
        field.addEventListener('input', () => {
            if (field.classList.contains('error')) {
                validateField(field);
            }
        });
    });
}

function validateField(field, formData = null) {
    const fieldName = field.name;
    const value = field.value;
    
    // Find error element - check multiple possible locations
    let errorElement = field.parentElement.parentElement.querySelector('.field-error');
    if (!errorElement) {
        errorElement = field.closest('.form-field')?.querySelector('.field-error');
    }
    
    // Skip validation if no error element (like terms checkbox)
    if (!errorElement) {
        // For checkboxes without error element, just return true
        if (field.type === 'checkbox') {
            return true;
        }
        console.log('No error element for field:', fieldName);
        return true;
    }
    
    const error = FormValidator.validateField(fieldName, value, formData);
    
    if (error) {
        field.classList.add('error');
        errorElement.textContent = error;
        return false;
    } else {
        field.classList.remove('error');
        errorElement.textContent = '';
        return true;
    }
}

function validateForm(form) {
    const fields = form.querySelectorAll('[name]');
    const formData = {
        password: form.querySelector('[name="password"]')?.value || ''
    };
    let isValid = true;
    const userRole = form.querySelector('[name="userRole"]')?.value;
    
    console.log('Validating form, userRole:', userRole);
    
    fields.forEach(field => {
        const fieldName = field.name;
        
        // Skip hidden input fields (like userRole)
        if (field.type === 'hidden') {
            return;
        }
        
        // Skip all checkboxes - they're handled separately (terms checkbox)
        if (field.type === 'checkbox') {
            return;
        }
        
        // Skip conditional fields that are hidden (hospital fields when donor, vice versa)
        const parentConditional = field.closest('.conditional-fields');
        if (parentConditional && parentConditional.style.display === 'none') {
            return;
        }
        
        // Skip role-specific fields that don't apply
        if (userRole === 'donor' && (fieldName === 'hospitalName' || fieldName === 'licenseNumber')) {
            return;
        }
        if (userRole === 'hospital' && (fieldName === 'bloodGroup' || fieldName === 'age')) {
            return;
        }
        
        // Skip optional fields
        if (fieldName === 'age') {
            return;
        }
        
        // Skip userRole field
        if (fieldName === 'userRole') {
            return;
        }
        
        const fieldValid = validateField(field, formData);
        console.log(`Field ${fieldName}: ${field.value} - Valid: ${fieldValid}`);
        
        if (!fieldValid) {
            isValid = false;
        }
    });
    
    console.log('Form valid:', isValid);
    return isValid;
}

// ============================================
// PASSWORD TOGGLE
// ============================================

document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        const input = this.parentElement.querySelector('input');
        if (input) {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        }
    });
});

// ============================================
// ROLE SELECTOR FOR SIGNUP
// ============================================

const roleTabs = document.querySelectorAll('.role-tab');

// Initialize donor fields visibility on page load
document.addEventListener('DOMContentLoaded', () => {
    const donorFields = document.getElementById('donorFields');
    const hospitalFields = document.getElementById('hospitalFields');
    const userRole = document.getElementById('userRole');
    
    // Show donor fields by default since donor tab is active by default
    if (donorFields && userRole?.value === 'donor') {
        donorFields.style.display = 'block';
    }
    if (hospitalFields) {
        hospitalFields.style.display = 'none';
    }
});

roleTabs.forEach(tab => {
    tab.addEventListener('click', function() {
        roleTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('userRole').value = this.dataset.role;

        const role = this.dataset.role;
        const donorFields = document.getElementById('donorFields');
        const hospitalFields = document.getElementById('hospitalFields');

        if (donorFields) {
            donorFields.style.display = role === 'donor' ? 'block' : 'none';
        }
        if (hospitalFields) {
            hospitalFields.style.display = role === 'hospital' ? 'block' : 'none';
        }
    });
});

// ============================================
// LOGIN FORM HANDLER
// ============================================

if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    setupFieldValidation(loginForm);

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm(loginForm)) {
            return;
        }

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const submitBtn = loginForm.querySelector('.btn-primary');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            auth.setToken(data.token);
            auth.setUser(data.user);

            const modal = document.getElementById('successModal');
            modal.classList.remove('hidden');

            setTimeout(() => {
                let redirectUrl = '/';
                if (data.user.userType === 'admin') {
                    redirectUrl = '/admin/dashboard';
                } else if (data.user.userType === 'donor') {
                    redirectUrl = '/donor/dashboard';
                } else if (data.user.userType === 'hospital') {
                    redirectUrl = '/hospital/dashboard';
                }
                window.location.href = redirectUrl;
            }, 1500);

        } catch (error) {
            const submitBtn = loginForm.querySelector('.btn-primary');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';

            const emailError = document.querySelector('input[name="email"]').parentElement.parentElement.querySelector('.field-error');
            emailError.textContent = error.message;
            
            console.error('Login error:', error);
        }
    });
}

// ============================================
// SIGNUP FORM HANDLER
// ============================================

if (document.getElementById('signupForm')) {
    const signupForm = document.getElementById('signupForm');
    setupFieldValidation(signupForm);

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm(signupForm)) {
            showFormError(signupForm, 'Please fill all required fields correctly');
            return;
        }

        const termsCheckbox = document.getElementById('terms');
        if (!termsCheckbox.checked) {
            showFormError(signupForm, 'Please agree to Terms & Conditions');
            return;
        }

        const formData = new FormData(signupForm);
        const data = Object.fromEntries(formData);

        try {
            const submitBtn = signupForm.querySelector('.btn-primary');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

            const payload = {
                fullName: data.name,
                email: data.email,
                password: data.password,
                confirmPassword: data.confirmPassword,
                userType: data.userRole,
                address: data.address,
                city: data.city,
                state: data.state,
                pincode: data.pincode,
                phone: data.phone
            };

            if (data.userRole === 'donor') {
                payload.bloodGroup = data.bloodGroup;
                payload.age = data.age || null;
            } else {
                payload.hospitalName = data.hospitalName;
                payload.licenseNumber = data.licenseNumber;
                payload.contactPerson = data.name;
                payload.contactPhone = data.phone;
            }

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Registration failed');
            }

            auth.setToken(result.token);
            auth.setUser(result.user);

            const modal = document.getElementById('successModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.querySelector('h3').textContent = 'Account Created!';
                modal.querySelector('p').textContent = 'Redirecting to dashboard...';
            }

            setTimeout(() => {
                const redirectUrl = result.user.userType === 'donor' ? '/donor/dashboard' : '/hospital/dashboard';
                window.location.href = redirectUrl;
            }, 1500);

        } catch (error) {
            const submitBtn = signupForm.querySelector('.btn-primary');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;

            showFormError(signupForm, error.message);
            console.error('Signup error:', error);
        }
    });
}

// ============================================
// LOGOUT HANDLER
// ============================================

if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            auth.logout();
        }
    });
}

// ============================================
// PAGE LOAD
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Form is visible by default - no animation needed
    const forms = document.querySelectorAll('.modern-form');
    forms.forEach(form => {
        form.style.opacity = '1';
    });
});
