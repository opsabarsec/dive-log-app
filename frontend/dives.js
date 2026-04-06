/**
 * dives.js - Dive Log Management
 * 
 * Handles all dive-related functionality:
 * - Loading and displaying dives (latest, all, detail view)
 * - Creating and editing dives with photo uploads
 * - Fish identification from photos
 * - Deleting dives
 */

/* -------------------------------------------------
   LOAD DIVES
--------------------------------------------------*/

/**
 * Load and display dive statistics on the home page
 */
async function loadDiveStats() {
  try {
    const response = await fetch(`${DIVES_API}/dives?user_id=${USER_ID}`);
    if (response.ok) {
      const dives = await response.json();
      const scubaDives = dives.filter(d => d.mode !== 'freediving');
      const total = scubaDives.length > 0 ? Math.max(...scubaDives.map(d => d.dive_number || 0)) : 0;
      document.getElementById('total-dives').textContent =
        `${total} dive${total !== 1 ? 's' : ''}`;
    }
  } catch (error) {
    console.error('Failed to load dive stats:', error);
  }
}

/**
 * Load and display the latest dive on the home page
 */
async function loadLatestDive() {
  const container = document.getElementById('latest-dive-container');
  container.innerHTML = '<div class="loading">Loading latest dive...</div>';

  try {
    const [latestResp, latestFreediveResp] = await Promise.all([
      fetch(`${DIVES_API}/dives/latest?user_id=${USER_ID}`),
      fetch(`${DIVES_API}/dives/latest-freedive?user_id=${USER_ID}`),
    ]);

    if (latestResp.status === 404) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No dives logged yet</h3>
          <p>Start by logging your first dive!</p>
        </div>`;
      return;
    }

    if (!latestResp.ok) throw new Error();
    const dive = await latestResp.json();

    let html = renderDiveCard(dive, true);

    if (latestFreediveResp.ok) {
      const freedive = await latestFreediveResp.json();
      // Only show freedive section if it's a different dive than the latest
      if (freedive && freedive._id !== dive._id) {
        html += `<h2 class="section-title" style="margin-top:30px;">Latest Freedive</h2>`;
        html += renderDiveCard(freedive, true);
      }
    }

    container.innerHTML = html;

  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Could not load dive</h3>
        <p>Backend might be unavailable</p>
      </div>`;
  }
}

/**
 * Load and display all dives in the dives list view
 */
async function loadAllDives() {
  const container = document.getElementById('dives-list');
  container.innerHTML = '<div class="loading">Loading dives...</div>';

  try {
    const response = await fetch(`${DIVES_API}/dives?user_id=${USER_ID}`);
    if (!response.ok) throw new Error();

    const dives = await response.json();
    if (dives.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No dives logged yet</h3>
          <button class="btn btn-primary" onclick="showAddDiveModal()">Log New Dive</button>
        </div>`;
      return;
    }

    currentDives = dives;
    container.innerHTML = dives.map(d => renderDiveMiniCard(d)).join('');

  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Error loading dives</h3>
        <p>Backend unreachable.</p>
      </div>`;
  }
}

/* -------------------------------------------------
   RENDER DIVE CARDS
--------------------------------------------------*/

/**
 * Render a full dive card with all details
 * @param {Object} dive - Dive data object
 * @param {boolean} showActions - Whether to show edit/delete buttons
 * @returns {string} HTML string
 */
function renderDiveCard(dive, showActions = true) {
  const photoHtml = dive.photo_storage_ids && dive.photo_storage_ids.length > 0
    ? `<div class="dive-card-photos">
        ${dive.photo_storage_ids.map(id =>
          `<img src="${DIVES_API}/download-photo/${id}" alt="Dive photo" class="dive-photo" onclick="openLightbox(this.src)" onerror="this.style.display='none'">`
        ).join('')}
      </div>`
    : '';

  const osmLinkHtml = dive.osm_link
    ? `<a href="${dive.osm_link}" target="_blank" class="osm-link">View on Map</a>`
    : '';

  const actionsHtml = showActions
    ? `<div class="dive-card-actions">
         <button class="btn btn-secondary btn-sm" onclick="editDive('${dive._id}')">Edit</button>
         <button class="btn btn-danger btn-sm" onclick="confirmDeleteDive('${dive._id}')">Delete</button>
       </div>`
    : '';

  return `
    <div class="dive-card">
      <div class="dive-card-header">
        <div class="dive-info">
          <div class="dive-number">Dive #${dive.mode === 'freediving' ? dive.freedive_number : dive.dive_number}${dive.mode === 'freediving' ? ' <span class="freedive-badge">freedive</span>' : ''}</div>
          <div class="dive-location">${dive.location}</div>
          ${dive.site ? `<div class="dive-site">${dive.site}</div>` : ''}
          ${osmLinkHtml}
        </div>
        <div class="dive-date">${formatDate(dive.dive_date)}</div>
      </div>

      <div class="dive-card-stats">
        <div class="stat-item"><div class="stat-value">${dive.max_depth}m</div><div class="stat-label">Max Depth</div></div>
        <div class="stat-item"><div class="stat-value">${dive.duration}min</div><div class="stat-label">Duration</div></div>
        <div class="stat-item"><div class="stat-value">${dive.temperature ?? '-'}°C</div><div class="stat-label">Temp</div></div>
        <div class="stat-item"><div class="stat-value">${dive.suit_thickness != null ? dive.suit_thickness + 'mm' : '-'}</div><div class="stat-label">Suit</div></div>
      </div>

      ${photoHtml}

      <div class="dive-card-details">
        <div class="detail-item"><span class="detail-label">Club</span><span class="detail-value">${dive.club_name}${dive.club_website ? ` &nbsp;<a href="${dive.club_website}" target="_blank" rel="noopener" style="font-size:0.82rem;color:var(--accent);">website</a>` : ''}</span></div>
        <div class="detail-item"><span class="detail-label">Instructor</span><span class="detail-value">${dive.instructor_name}</span></div>
        <div class="detail-item"><span class="detail-label">Weights</span><span class="detail-value">${dive.lead_weights != null ? dive.lead_weights + ' kg' : '-'}</span></div>
      </div>

      ${dive.notes ? `<div class="dive-card-notes"><div class="notes-label" style="font-size:0.8rem;color:var(--text-muted);margin-bottom:5px;">Comments</div><div class="notes-text">${dive.notes}</div></div>` : ''}

      ${actionsHtml}
    </div>
  `;
}

/**
 * Render a compact dive card for the list view
 * @param {Object} dive - Dive data object
 * @returns {string} HTML string
 */
function renderDiveMiniCard(dive) {
  return `
    <div class="dive-card-mini" onclick="showDiveDetail('${dive._id}')" style="cursor:pointer;">
      <div class="dive-card-mini-header">
        <div>
          <div class="dive-number">Dive #${dive.mode === 'freediving' ? dive.freedive_number : dive.dive_number}${dive.mode === 'freediving' ? ' <span class="freedive-badge">freedive</span>' : ''}</div>
          <div class="dive-location">${dive.location}</div>
          ${dive.site ? `<div class="dive-site">${dive.site}</div>` : ''}
        </div>
        <div class="dive-date">${formatDate(dive.dive_date)}</div>
      </div>

      <div class="dive-card-mini-stats">
        <div class="mini-stat"><span class="mini-stat-value">${dive.max_depth}m</span><span class="mini-stat-label">Depth</span></div>
        <div class="mini-stat"><span class="mini-stat-value">${dive.duration}min</span><span class="mini-stat-label">Duration</span></div>
      </div>

      <div class="dive-card-mini-footer">
        <span style="color: var(--text-muted); font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 55%;">${dive.club_name}${dive.club_website ? ` &nbsp;<a href="${dive.club_website}" target="_blank" rel="noopener" style="font-size:0.8rem;color:var(--accent);" onclick="event.stopPropagation()">website</a>` : ''}</span>
        <div>
          <button class="btn-icon" onclick="event.stopPropagation(); editDive('${dive._id}')" title="Edit">✎</button>
          <button class="btn-icon danger" onclick="event.stopPropagation(); confirmDeleteDive('${dive._id}')" title="Delete">🗑</button>
        </div>
      </div>
    </div>
  `;
}

/* -------------------------------------------------
   DIVE MODAL & FORM
--------------------------------------------------*/

/**
 * Calculate and suggest the next dive number based on existing dives
 */
function suggestNextDiveNumber() {
  const isFreedive = document.getElementById('dive-freedive').checked;
  if (isFreedive) {
    const freedives = currentDives.filter(d => d.mode === 'freediving');
    const max = freedives.length > 0 ? Math.max(...freedives.map(d => d.freedive_number || 0)) : 0;
    document.getElementById('dive-number').value = max + 1;
  } else {
    const scuba = currentDives.filter(d => d.mode !== 'freediving');
    const max = scuba.length > 0 ? Math.max(...scuba.map(d => d.dive_number || 0)) : 0;
    document.getElementById('dive-number').value = max + 1;
  }
}

/**
 * Open the add dive modal
 */
function showAddDiveModal() {
  editingDiveId = null;
  editingPhotoIds = [];
  document.getElementById('add-dive-modal-title').textContent = 'Log New Dive';
  suggestNextDiveNumber();
  document.getElementById('dive-freedive').addEventListener('change', suggestNextDiveNumber);
  document.getElementById('add-dive-modal').classList.add('active');
}

/**
 * Close the add dive modal and reset the form
 */
function closeAddDiveModal() {
  editingDiveId = null;
  editingPhotoIds = [];
  document.getElementById('add-dive-modal-title').textContent = 'Log New Dive';
  document.getElementById('add-dive-modal').classList.remove('active');
  document.getElementById('add-dive-modal').querySelector('form').reset();
  // Clear file input explicitly (needed for mobile browsers)
  document.getElementById('dive-photos').value = '';
}

/**
 * Show dive details in a modal
 * @param {string} id - Dive ID
 */
function showDiveDetail(id) {
  const dive = currentDives.find(d => d._id === id);
  if (!dive) return;
  document.getElementById('dive-detail-content').innerHTML = renderDiveCard(dive, false);
  document.getElementById('dive-detail-modal').classList.add('active');
}

/**
 * Close the dive detail modal
 */
function closeDiveDetailModal() {
  document.getElementById('dive-detail-modal').classList.remove('active');
}

/**
 * Populate the edit form with existing dive data
 * @param {string} id - Dive ID to edit
 */
async function editDive(id) {
  let dive = currentDives.find(d => d._id === id);
  if (!dive) {
    try {
      const resp = await fetch(`${DIVES_API}/dives/${id}`);
      if (resp.ok) dive = await resp.json();
    } catch (e) {}
  }
  if (!dive) { showToast('Could not load dive', 'error'); return; }

  editingDiveId = id;
  editingPhotoIds = dive.photo_storage_ids || [];

  document.getElementById('add-dive-modal-title').textContent = 'Edit Dive';
  document.getElementById('dive-number').value = dive.mode === 'freediving' ? (dive.freedive_number ?? '') : (dive.dive_number ?? '');
  document.getElementById('dive-date').value = formatDateForInput(dive.dive_date);
  document.getElementById('dive-location').value = dive.location;
  document.getElementById('dive-depth').value = dive.max_depth;
  document.getElementById('dive-duration').value = dive.duration;
  document.getElementById('dive-club').value = dive.club_name;
  document.getElementById('dive-instructor').value = dive.instructor_name;
  document.getElementById('dive-club-website').value = dive.club_website || '';
  document.getElementById('dive-site').value = dive.site || '';
  document.getElementById('dive-temp').value = dive.temperature ?? '';
  document.getElementById('dive-suit').value = dive.suit_thickness ?? '';
  document.getElementById('dive-weights').value = dive.lead_weights ?? '';
  document.getElementById('dive-notes').value = dive.notes || '';
  document.getElementById('dive-buddy-check').checked = dive.Buddy_check ?? true;
  document.getElementById('dive-briefed').checked = dive.Briefed ?? true;
  document.getElementById('dive-freedive').checked = dive.mode === 'freediving';

  // Close detail modal if open, then open edit form
  closeDiveDetailModal();
  document.getElementById('add-dive-modal').classList.add('active');
}

/* -------------------------------------------------
   SUBMIT DIVE
--------------------------------------------------*/

/**
 * Handle dive form submission - compress photos, identify fish, upload, and save
 * @param {Event} event - Form submit event
 */
async function submitNewDive(event) {
  event.preventDefault();

  const submitBtn = event.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  let photoStorageIds = [];
  let fishNotes = '';
  const photoFiles = document.getElementById('dive-photos').files;

  if (photoFiles.length > 0) {
    // Limit to 5 photos to prevent timeouts and memory issues on mobile
    if (photoFiles.length > 5) {
      showToast('Maximum 5 photos allowed. Only the first 5 will be uploaded.', 'error');
    }
    const filesToProcess = Array.from(photoFiles).slice(0, 5);
    
    showToast(`Processing ${filesToProcess.length} photo(s)...`);
    
    // Compress all photos first (mobile photos are often too large)
    const compressedFiles = [];
    for (const file of filesToProcess) {
      try {
        const compressed = await compressImage(file, 1920, 0.85);
        compressedFiles.push(compressed);
      } catch (err) {
        console.warn(`[compress] Failed to compress ${file.name}, using original:`, err);
        compressedFiles.push(file);
      }
    }
    
    // Log total size for debugging
    const totalSize = compressedFiles.reduce((sum, f) => sum + f.size, 0);
    console.log(`[upload] Total compressed size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

    // Step 1: Fish identification on files[1..n] (file[0] is the dive cover photo, not a fish)
    const fishFiles = compressedFiles.slice(1);
    if (fishFiles.length > 0) {
      showToast(`Identifying fish in ${fishFiles.length} photo(s)...`);
      const fishResults = [];
      for (let i = 0; i < fishFiles.length; i++) {
        const fd = new FormData();
        fd.append('file', fishFiles[i]);
        try {
          const fishResp = await fetch(`${DIVES_API}/identify-fish`, { method: 'POST', body: fd });
          const fishData = await fishResp.json();
          console.log(`[fish_finder] file ${i + 1} response:`, fishData);
          if (fishResp.ok && fishData.success && fishData.species && fishData.species.length > 0) {
            const top = fishData.species[0];
            fishResults.push(`fish${i + 1}: ${top.name} (${Math.round(top.accuracy * 100)}%)`);
          } else {
            console.warn(`[fish_finder] file ${i + 1}: no species found`);
          }
        } catch (err) {
          console.error(`[fish_finder] file ${i + 1} network error:`, err);
        }
      }
      if (fishResults.length > 0) {
        fishNotes = fishResults.join(', ');
        showToast(`Fish identified: ${fishNotes}`);
      } else {
        showToast('No fish identified in uploaded photos');
      }
    }

    // Step 2: Upload all photos to Convex storage (first file becomes cover photo)
    showToast('Uploading photos...');
    const formData = new FormData();
    for (const file of compressedFiles) {
      formData.append('files', file);
    }
    try {
      const uploadResp = await fetch(`${DIVES_API}/upload-photos`, { method: 'POST', body: formData });
      
      console.log('[upload-photos] Status:', uploadResp.status, uploadResp.statusText);
      
      if (uploadResp.ok || uploadResp.status === 207) {
        const uploadData = await uploadResp.json();
        console.log('[upload-photos] Success response:', uploadData);
        photoStorageIds = uploadData.photo_storage_ids || [];
        if (uploadData.failed_files && uploadData.failed_files.length > 0) {
          console.warn('[upload-photos] some files failed:', uploadData.failed_files);
          showToast(`${photoStorageIds.length} photo(s) uploaded, ${uploadData.failed_files.length} failed`, 'error');
        }
      } else {
        let errData = {};
        try {
          errData = await uploadResp.json();
        } catch (e) {
          console.error('[upload-photos] Failed to parse error response:', e);
          errData = { error: `HTTP ${uploadResp.status}: ${uploadResp.statusText}` };
        }
        
        photoStorageIds = errData.photo_storage_ids || [];
        console.error('[upload-photos] failed:', errData);
        
        const errorMsg = errData.error || errData.failed_files?.map(f => `${f.file}: ${f.error}`).join(', ') || 'Unknown error';
        showToast(`Photo upload failed: ${errorMsg}`, 'error');
      }
    } catch (err) {
      console.error('[upload-photos] network error:', err);
      showToast(`Photo upload error: ${err.message}`, 'error');
    }
  }

  // Step 3: Build payload — prepend fish identification results to any manual notes
  const dateVal = document.getElementById('dive-date').value;
  const manualNotes = document.getElementById('dive-notes').value.trim();
  const combinedNotes = [fishNotes, manualNotes].filter(Boolean).join('\n');

  const isFreedive = document.getElementById('dive-freedive').checked;
  const diveNumVal = parseInt(document.getElementById('dive-number').value);

  const payload = {
    user_id: USER_ID,
    dive_date: new Date(dateVal).getTime(),
    location: document.getElementById('dive-location').value.trim(),
    max_depth: parseFloat(document.getElementById('dive-depth').value),
    duration: parseFloat(document.getElementById('dive-duration').value),
    club_name: document.getElementById('dive-club').value.trim(),
    instructor_name: document.getElementById('dive-instructor').value.trim(),
    photo_storage_ids: photoFiles.length > 0 ? photoStorageIds : editingPhotoIds,
    buddy_check: document.getElementById('dive-buddy-check').checked,
    briefed: document.getElementById('dive-briefed').checked,
    mode: isFreedive ? 'freediving' : 'scubadiving',
  };
  if (isFreedive) {
    payload.freedive_number = diveNumVal;
  } else {
    payload.dive_number = diveNumVal;
  }
  const clubWebsite = document.getElementById('dive-club-website').value.trim();
  if (clubWebsite) payload.club_website = clubWebsite;
  const site = document.getElementById('dive-site').value.trim();
  if (site) payload.site = site;
  const temp = document.getElementById('dive-temp').value;
  if (temp !== '') payload.temperature = parseFloat(temp);
  const suit = document.getElementById('dive-suit').value;
  if (suit !== '') payload.suit_thickness = parseFloat(suit);
  const weights = document.getElementById('dive-weights').value;
  if (weights !== '') payload.lead_weights = parseFloat(weights);
  if (combinedNotes) payload.notes = combinedNotes;

  // Step 4: Save dive
  try {
    const resp = await fetch(`${DIVES_API}/dives/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(await resp.text());
    showToast('Dive saved!');
    closeAddDiveModal();
    loadAllDives();
  } catch (err) {
    showToast('Failed to save dive', 'error');
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Dive';
  }
}

/* -------------------------------------------------
   DELETE DIVE
--------------------------------------------------*/

/**
 * Show confirmation dialog before deleting a dive
 * @param {string} id - Dive ID to delete
 */
function confirmDeleteDive(id) {
  document.getElementById('confirm-message').textContent =
    'Are you sure you want to delete this dive?';
  document.getElementById('confirm-delete-btn').onclick =
    () => deleteDive(id);
  document.getElementById('confirm-modal').classList.add('active');
}

/**
 * Delete a dive from the backend
 * @param {string} id - Dive ID to delete
 */
async function deleteDive(id) {
  try {
    const response = await fetch(`${DIVES_API}/dives/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error();
    showToast('Dive deleted successfully');
    closeConfirmModal();
    loadAllDives();
  } catch (error) {
    showToast('Failed to delete dive', 'error');
  }
}
