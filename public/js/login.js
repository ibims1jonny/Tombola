document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Login form submission
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous messages
        loginMessage.textContent = '';
        loginMessage.className = 'message hidden';
        
        // Get form data
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Client-side validation
        if (!username || !password) {
            showMessage('Bitte geben Sie Benutzername und Passwort ein.', 'error');
            return;
        }
        
        // Submit login data
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.redirected) {
                window.location.href = response.url;
                return;
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                showMessage(data.error || 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.', 'error');
        }
    });
    
    // Helper function
    function showMessage(message, type) {
        loginMessage.textContent = message;
        loginMessage.className = `message ${type}`;
    }
});