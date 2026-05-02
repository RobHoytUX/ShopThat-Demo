// Authentication utilities for shopThat application

// Check if user is authenticated
async function checkAuth() {
  sessionStorage.setItem('shopThatUser', 'Demo User');
  return true;
}

// Sign out functionality
async function signOut() {
  sessionStorage.removeItem('shopThatUser');
  window.location.href = 'dashboard.html';
}

// Get current user
function getCurrentUser() {
  return sessionStorage.getItem('shopThatUser') || 'Unknown User';
}

// Initialize authentication for protected pages
async function initAuth() {
  // Check authentication
  const authenticated = await checkAuth();
  if (!authenticated) return;
  
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
