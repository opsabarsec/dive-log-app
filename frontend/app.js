/**
 * app.js - Main Application Entry Point
 * 
 * This is the main entry point for the Dive Log application.
 * It handles:
 * - Session restoration on page load
 * - Application initialization
 * - Login/logout functionality
 * - User configuration loading
 * 
 * Dependencies: config.js, utils.js, image-utils.js, dives.js, 
 *               certifications.js, checklists.js, ui.js
 */

// Restore session if returning user
document.addEventListener('DOMContentLoaded', async () => {
  if (sessionStorage.getItem('authenticated') === 'true') {
    initApp();
  }
});

/**
 * Initialize the application after successful login
 * Sets up the UI and loads initial data
 */
async function initApp() {
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  await loadConfig();
  setupNavigation();
  await loadDiveStats();
  await loadLatestDive();
}

/* -------------------------------------------------
   LOGIN
--------------------------------------------------*/

/**
 * Handle login form submission
 * @param {Event} event - Form submit event
 */
async function handleLogin(event) {
  event.preventDefault();
  const password = document.getElementById('password-input').value;

  try {
    const response = await fetch(`${DIVES_API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (response.ok) {
      sessionStorage.setItem('authenticated', 'true');
      initApp();
    } else {
      alert('Invalid password');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Could not connect to server.');
  }
}

/* -------------------------------------------------
   CONFIG
--------------------------------------------------*/

/**
 * Load user configuration from the backend
 * Sets user name, ID, contact info, and emergency contact
 */
async function loadConfig() {
  try {
    const response = await fetch(`${DIVES_API}/config`);
    if (response.ok) {
      const config = await response.json();
      USER_NAME = config.name_surname ?? 'Diver';
      USER_ID = USER_NAME.toLowerCase().replace(/\s+/g, '_');

      document.getElementById('user-name').textContent = USER_NAME;
      document.getElementById('profile-name').textContent = USER_NAME;
      document.title = `Divelog ${USER_NAME}`;

      // Contact info
      const contactLines = [];
      if (config.address) contactLines.push(`<span id="profile-address">${config.address}</span>`);
      if (config.my_number) contactLines.push(`<span id="profile-number">${config.my_number}</span>`);
      if (config.my_email) contactLines.push(`<span id="profile-email">${config.my_email}</span>`);
      if (contactLines.length > 0) {
        const contactEl = document.getElementById('profile-contact');
        contactEl.innerHTML = contactLines.join('<br>');
        contactEl.style.display = 'block';
      }

      // Emergency contact
      if (config.emergency_contact || config.emergency_contact_number) {
        document.getElementById('emergency-name').textContent = config.emergency_contact;
        document.getElementById('emergency-number').textContent = config.emergency_contact_number;
        document.getElementById('emergency-section').style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}
