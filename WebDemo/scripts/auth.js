// Authentication utilities for shopThat application

// Check if user is authenticated
async function checkAuth() {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Unauthenticated');
    }

    const session = await response.json();
    if (!session.authenticated) {
      throw new Error('Unauthenticated');
    }

    sessionStorage.setItem('shopThatUser', session.user || 'Authenticated User');
    return true;
  } catch (error) {
    sessionStorage.removeItem('shopThatUser');
    window.location.href = 'login.html';
    return false;
  }
}

// Sign out functionality
async function signOut() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
  } finally {
    sessionStorage.removeItem('shopThatUser');
    window.location.href = 'login.html';
  }
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
