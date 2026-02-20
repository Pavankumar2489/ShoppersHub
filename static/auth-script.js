// API Base URL
const API_URL = '';

// Show Login Form
function showLogin() {
    document.getElementById('login-form').classList.add('active');
    document.getElementById('register-form').classList.remove('active');
    clearMessages();
}

// Show Register Form
function showRegister() {
    document.getElementById('register-form').classList.add('active');
    document.getElementById('login-form').classList.remove('active');
    clearMessages();
}

// Clear all error/success messages
function clearMessages() {
    document.getElementById('login-error').classList.remove('show');
    document.getElementById('register-error').classList.remove('show');
    document.getElementById('register-success').classList.remove('show');
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
    document.getElementById('register-success').textContent = '';
}

// Handle Registration
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');
    
    // Clear previous messages
    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');
    
    // Validate passwords match
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match!';
        errorDiv.classList.add('show');
        return;
    }
    
    // Validate password length
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters long!';
        errorDiv.classList.add('show');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Success
            successDiv.textContent = 'Registration successful! Please login.';
            successDiv.classList.add('show');
            
            // Clear form
            document.getElementById('register-name').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
            document.getElementById('register-confirm-password').value = '';
            
            // Switch to login after 2 seconds
            setTimeout(() => {
                showLogin();
            }, 2000);
            
        } else {
            // Error from server
            errorDiv.textContent = data.detail || 'Registration failed. Please try again.';
            errorDiv.classList.add('show');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        errorDiv.textContent = 'Network error. Please check your connection.';
        errorDiv.classList.add('show');
    }
}

// Handle Login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const errorDiv = document.getElementById('login-error');
    errorDiv.classList.remove('show');
    
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Success - save user data and redirect
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('isLoggedIn', 'true');
            
            // Redirect to main shop
            window.location.replace('/shop');
            
        } else {
            // Error from server
            errorDiv.textContent = data.detail || 'Invalid email or password.';
            errorDiv.classList.add('show');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Network error. Please check your connection.';
        errorDiv.classList.add('show');
    }
}

// Check if user is already logged in on page load
window.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        // Already logged in, redirect to main page
        window.location.replace('/shop');
    }
});
