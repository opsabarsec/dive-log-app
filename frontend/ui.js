/**
 * ui.js - UI Components and Navigation
 * 
 * Handles application navigation, modals, lightbox for images,
 * and the delete confirmation modal.
 */

/* -------------------------------------------------
   NAVIGATION
--------------------------------------------------*/

/**
 * Set up navigation button click handlers
 */
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
    });
  });
}

/**
 * Switch between main views (home, dives, certifications, checklists)
 * @param {string} viewName - The view to switch to
 */
function switchView(viewName) {
  // Update nav button active states
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.view === viewName)
  );

  // Hide all views
  document.querySelectorAll('.view').forEach(view =>
    view.classList.remove('active')
  );

  // Show selected view
  document.getElementById(`${viewName}-view`).classList.add('active');

  // Load view-specific data
  if (viewName === 'home') loadLatestDive();
  else if (viewName === 'dives') loadAllDives();
  else if (viewName === 'certifications') loadCertifications();
  else if (viewName === 'checklists') loadChecklists();
}

/* -------------------------------------------------
   LIGHTBOX
--------------------------------------------------*/

/**
 * Open the lightbox to view a full-size image
 * @param {string} src - Image URL to display
 */
function openLightbox(src) {
  const overlay = document.getElementById('lightbox-overlay');
  document.getElementById('lightbox-img').src = src;
  overlay.style.display = 'flex';
  document.addEventListener('keydown', _lightboxEscHandler);
}

/**
 * Close the lightbox
 */
function closeLightbox() {
  document.getElementById('lightbox-overlay').style.display = 'none';
  document.getElementById('lightbox-img').src = '';
  document.removeEventListener('keydown', _lightboxEscHandler);
}

/**
 * Handle Escape key to close lightbox
 * @param {KeyboardEvent} e - Keyboard event
 */
function _lightboxEscHandler(e) {
  if (e.key === 'Escape') closeLightbox();
}

/* -------------------------------------------------
   CONFIRMATION MODAL
--------------------------------------------------*/

/**
 * Close the confirmation modal
 */
function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.remove('active');
}
