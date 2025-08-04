document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Form submission
    const participantForm = document.getElementById('participantForm');
    const formMessage = document.getElementById('formMessage');
    
    participantForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous messages
        formMessage.textContent = '';
        formMessage.className = 'message hidden';
        
        // Get form data
        const firstname = document.getElementById('firstname').value.trim();
        const lastname = document.getElementById('lastname').value.trim();
        const email = document.getElementById('email').value.trim();
        const consent = document.getElementById('consent').checked;
        
        // Client-side validation
        if (!firstname || !lastname || !email || !consent) {
            showMessage('Bitte füllen Sie alle Pflichtfelder aus.', 'error');
            return;
        }
        
        if (!isValidEmail(email)) {
            showMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein.', 'error');
            return;
        }
        
        // Submit form data
        try {
            const response = await fetch('/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ firstname, lastname, email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage('Vielen Dank für Ihre Teilnahme! Sie nehmen nun an der Tombola teil und werden über kommende Touren informiert.', 'success');
                participantForm.reset();
            } else {
                showMessage(data.error || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.', 'error');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            showMessage('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.', 'error');
        }
    });
    
    // Helper functions
    function showMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = `message ${type}`;
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
});