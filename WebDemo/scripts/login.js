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
    sessionStorage.setItem('shopThatUser', 'Demo User');
    redirectToDashboard();
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    sessionStorage.setItem('shopThatUser', 'Demo User');
    showSuccess();
    setTimeout(redirectToDashboard, 250);
  });

  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }

  redirectIfAuthenticated();
}());
