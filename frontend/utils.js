/**
 * utils.js - Utility Functions
 * 
 * Common utility functions used throughout the application:
 * - Date formatting helpers
 * - Toast notifications for user feedback
 */

/* -------------------------------------------------
   DATE HELPERS
--------------------------------------------------*/

/**
 * Format a timestamp to a human-readable date string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date (e.g., "Jan 15, 2024")
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a timestamp to YYYY-MM-DD for date input fields
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Date string in YYYY-MM-DD format
 */
function formatDateForInput(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

/* -------------------------------------------------
   TOAST NOTIFICATIONS
--------------------------------------------------*/

/**
 * Show a toast notification message
 * @param {string} message - The message to display
 * @param {string} type - 'success' (green) or 'error' (red)
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
