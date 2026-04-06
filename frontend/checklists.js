/**
 * checklists.js - Checklist Management
 * 
 * Handles loading, displaying, adding dive-related checklists.
 * Checklists are links to Google Docs/Sheets with equipment or travel checklists.
 */

/* -------------------------------------------------
   LOAD CHECKLISTS
--------------------------------------------------*/

/**
 * Load and display all checklists
 */
async function loadChecklists() {
  const container = document.getElementById('checklists-list');
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const response = await fetch(`${CERTS_API}/checklists`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const checklists = await response.json();

    if (checklists.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No checklists</h3>
        </div>`;
      return;
    }

    container.innerHTML = checklists.map(renderChecklistItem).join('');

  } catch (error) {
    console.error('Checklists fetch error:', error);
    container.innerHTML = `<div style="color:var(--danger-color);padding:20px;">Error: ${error.message}</div>`;
  }
}

/**
 * Render a checklist item
 * @param {Object} item - Checklist data object
 * @returns {string} HTML string
 */
function renderChecklistItem(item) {
  return `
    <div class="checklist-item">
      <span class="checklist-name">${item.name}</span>
      <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">Open</a>
    </div>
  `;
}

/* -------------------------------------------------
   ADD CHECKLIST
--------------------------------------------------*/

/**
 * Open the add checklist modal
 */
function showAddChecklistModal() {
  document.getElementById('add-checklist-modal').classList.add('active');
}

/**
 * Close the add checklist modal and reset the form
 */
function closeAddChecklistModal() {
  document.getElementById('add-checklist-modal').classList.remove('active');
  document.getElementById('add-checklist-modal').querySelector('form').reset();
}

/**
 * Handle checklist form submission
 * @param {Event} event - Form submit event
 */
async function submitNewChecklist(event) {
  event.preventDefault();
  const payload = {
    name: document.getElementById('checklist-name').value.trim(),
    link: document.getElementById('checklist-link').value.trim(),
  };

  try {
    const resp = await fetch(`${CERTS_API}/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(await resp.text());
    showToast('Checklist saved!');
    closeAddChecklistModal();
    loadChecklists();
  } catch (err) {
    showToast('Failed to save checklist', 'error');
    console.error(err);
  }
}
