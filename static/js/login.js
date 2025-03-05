document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#login-form');
    const errorMessage = document.querySelector('#error-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Extract form data
        const email = document.querySelector('#email-input').value;
        const password = document.querySelector('#password-input').value;

        // Send data to Flask backend
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Server response:', data);
                if (data.status === 'success') {
                    window.location.href = "/dashboard";  // Redirect after successful login
                }
            } else {
                errorMessage.style.display = 'block';  // Show error message
            }
        } catch (error) {
            console.error('Error:', error);
            errorMessage.style.display = 'block';  // Show error message in case of a fetch error
        }
    });
});
