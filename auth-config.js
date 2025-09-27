// Simple password protection for demo
// This is for demo purposes - not production-grade security

const DEMO_CONFIG = {
    // Set to true to enable password protection
    passwordProtected: true,
    
    // Demo credentials (change these!)
    credentials: {
        username: 'shopthat',
        password: 'demo2025'
    },
    
    // Session timeout (in minutes)
    sessionTimeout: 120,
    
    // Welcome message
    welcomeMessage: 'Welcome to ShopTHAT Demo - Please enter credentials to continue'
};

// Simple authentication check
function checkAuth() {
    if (!DEMO_CONFIG.passwordProtected) {
        return true;
    }
    
    const authData = sessionStorage.getItem('shopthat_demo_auth');
    if (authData) {
        const auth = JSON.parse(authData);
        const now = new Date().getTime();
        
        // Check if session is still valid
        if (now - auth.timestamp < DEMO_CONFIG.sessionTimeout * 60 * 1000) {
            return true;
        } else {
            // Session expired
            sessionStorage.removeItem('shopthat_demo_auth');
        }
    }
    
    return false;
}

// Show login form
function showLogin() {
    const loginHTML = `
        <div id="demo-login" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            <div style="
                background: white;
                padding: 2rem;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                width: 100%;
                max-width: 400px;
                margin: 1rem;
            ">
                <h2 style="text-align: center; color: #333; margin-bottom: 1rem;">
                    🔐 ShopTHAT Demo Access
                </h2>
                <p style="text-align: center; color: #666; margin-bottom: 2rem;">
                    ${DEMO_CONFIG.welcomeMessage}
                </p>
                <form id="demo-login-form">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: #333;">Username:</label>
                        <input type="text" id="demo-username" required style="
                            width: 100%;
                            padding: 0.75rem;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                            font-size: 1rem;
                            box-sizing: border-box;
                        ">
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: #333;">Password:</label>
                        <input type="password" id="demo-password" required style="
                            width: 100%;
                            padding: 0.75rem;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                            font-size: 1rem;
                            box-sizing: border-box;
                        ">
                    </div>
                    <button type="submit" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: background 0.3s;
                    ">Access Demo</button>
                    <div id="demo-error" style="
                        color: #e74c3c;
                        text-align: center;
                        margin-top: 1rem;
                        display: none;
                    "></div>
                </form>
                <div style="
                    margin-top: 2rem;
                    padding-top: 1rem;
                    border-top: 1px solid #eee;
                    text-align: center;
                    font-size: 0.875rem;
                    color: #999;
                ">
                    Demo credentials provided separately
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loginHTML);
    
    // Handle form submission
    document.getElementById('demo-login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('demo-username').value;
        const password = document.getElementById('demo-password').value;
        const errorDiv = document.getElementById('demo-error');
        
        if (username === DEMO_CONFIG.credentials.username && 
            password === DEMO_CONFIG.credentials.password) {
            
            // Store authentication
            const authData = {
                authenticated: true,
                timestamp: new Date().getTime()
            };
            sessionStorage.setItem('shopthat_demo_auth', JSON.stringify(authData));
            
            // Remove login form
            document.getElementById('demo-login').remove();
            
        } else {
            errorDiv.textContent = 'Invalid credentials. Please try again.';
            errorDiv.style.display = 'block';
        }
    });
}

// Initialize authentication
function initAuth() {
    if (!checkAuth()) {
        showLogin();
    }
}

// Run authentication check when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}
