// Authentication utilities for shopThat application

// Check if user is authenticated
function checkAuth() {
  if (localStorage.getItem('shopThatLoggedIn') !== 'true') {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// Sign out functionality
function signOut() {
  localStorage.removeItem('shopThatLoggedIn');
  localStorage.removeItem('shopThatUser');
  window.location.href = '/login.html';
}

// Get current user
function getCurrentUser() {
  return localStorage.getItem('shopThatUser') || 'Unknown User';
}

// Initialize authentication for protected pages
function initAuth() {
  // Check authentication
  checkAuth();
  
  // Add sign out handler to all sign out links
  const signOutLinks = document.querySelectorAll('#signOutLink, [data-action="signout"]');
  signOutLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      signOut();
    });
  });
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Only initialize auth if we're not on the login page
  if (!window.location.pathname.includes('login.html')) {
    initAuth();
  }
});
