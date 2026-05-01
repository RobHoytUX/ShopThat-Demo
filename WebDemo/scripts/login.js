(function () {
  'use strict';

  var form = document.getElementById('loginForm');
  var errorMessage = document.getElementById('errorMessage');
  var successMessage = document.getElementById('successMessage');

  function showError(message) {
    errorMessage.textContent = message || 'Invalid credentials. Please try again.';
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
  }

  function showSuccess() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'block';
  }

  function redirectToDashboard() {
    window.location.href = 'dashboard.html';
  }

  async function redirectIfAuthenticated() {
    try {
      var response = await fetch('/api/auth/session', {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (response.ok) {
        var session = await response.json();
        if (session.authenticated) {
          redirectToDashboard();
        }
      }
    } catch (error) {
      // Stay on the sign-in form when the auth API is unavailable.
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    try {
      var response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: email, password: password })
      });

      if (!response.ok) {
        showError(response.status === 500
          ? 'Authentication is not configured for this deployment.'
          : 'Invalid credentials. Please try again.');
        return;
      }

      showSuccess();
      setTimeout(redirectToDashboard, 500);
    } catch (error) {
      showError('Authentication service is unavailable. Please try again later.');
    }
  });

  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }

  redirectIfAuthenticated();
}());
