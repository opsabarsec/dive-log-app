/**
 * certifications.js - Certification Management
 * 
 * Handles loading, displaying, adding, and deleting dive certifications.
 */

/* -------------------------------------------------
   LOAD CERTIFICATIONS
--------------------------------------------------*/

/**
 * Load and display all certifications for the current user
 */
async function loadCertifications() {
  const container = document.getElementById('certifications-list');
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const response = await fetch(`${CERTS_API}/certifications?user_id=${USER_ID}`);
    if (!response.ok) throw new Error();

    const certs = await response.json();

    if (certs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No certifications</h3>
        </div>`;
      return;
    }

    container.innerHTML = certs.map(renderCertCard).join('');

  } catch (error) {
    console.error(error);
    container.innerHTML = '<div>Error loading certifications</div>';
  }
}

/**
 * Render a certification card
 * @param {Object} cert - Certification data object
 * @returns {string} HTML string
 */
function renderCertCard(cert) {
  return `
    <div class="cert-card">
      <span class="cert-agency">${cert.agency}</span>
      <h3 class="cert-name">${cert.name}</h3>
      <div class="cert-details">
        <div class="cert-detail"><span class="cert-detail-label">Date</span><span class="cert-detail-value">${formatDate(cert.certification_date)}</span></div>
        ${cert.certification_number ? `<div class="cert-detail"><span class="cert-detail-label">Number</span><span class="cert-detail-value">${cert.certification_number}</span></div>` : ''}
        ${cert.instructor_name ? `<div class="cert-detail"><span class="cert-detail-label">Instructor</span><span class="cert-detail-value">${cert.instructor_name}</span></div>` : ''}
        ${cert.dive_center ? `<div class="cert-detail"><span class="cert-detail-label">Club</span><span class="cert-detail-value">${cert.dive_center}</span></div>` : ''}
      </div>
      ${cert.photo_url ? `<img src="${cert.photo_url}" alt="${cert.name}" class="cert-badge-img" onclick="openLightbox(this.src)" style="cursor:zoom-in;">` : ''}
      <div class="cert-actions">
        <button class="btn-icon danger" onclick="confirmDeleteCert('${cert._id}')" title="Delete">🗑</button>
      </div>
    </div>
  `;
}

/* -------------------------------------------------
   ADD CERTIFICATION
--------------------------------------------------*/

/**
 * Open the add certification modal
 */
function showAddCertModal() {
  document.getElementById('add-cert-modal').classList.add('active');
}

/**
 * Close the add certification modal and reset the form
 */
function closeAddCertModal() {
  document.getElementById('add-cert-modal').classList.remove('active');
  document.getElementById('add-cert-modal').querySelector('form').reset();
}

/**
 * Handle certification form submission
 * @param {Event} event - Form submit event
 */
async function submitNewCert(event) {
  event.preventDefault();
  const dateVal = document.getElementById('cert-date').value;
  const num = document.getElementById('cert-number').value.trim();
  const instr = document.getElementById('cert-instructor').value.trim();
  const center = document.getElementById('cert-center').value.trim();
  const photo = document.getElementById('cert-photo').value.trim();
  const payload = {
    user_id: USER_ID,
    name: document.getElementById('cert-name').value.trim(),
    agency: document.getElementById('cert-agency').value.trim(),
    certification_date: new Date(dateVal).getTime(),
    ...(num && { certification_number: num }),
    ...(instr && { instructor_name: instr }),
    ...(center && { dive_center: center }),
    ...(photo && { photo_url: photo }),
  };

  try {
    const resp = await fetch(`${CERTS_API}/certifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(await resp.text());
    showToast('Certification saved!');
    closeAddCertModal();
    loadCertifications();
  } catch (err) {
    showToast('Failed to save certification', 'error');
    console.error(err);
  }
}

/* -------------------------------------------------
   DELETE CERTIFICATION
--------------------------------------------------*/

/**
 * Show confirmation dialog before deleting a certification
 * @param {string} id - Certification ID to delete
 */
function confirmDeleteCert(id) {
  document.getElementById('confirm-message').textContent =
    'Are you sure you want to delete this certification?';
  document.getElementById('confirm-delete-btn').onclick =
    () => deleteCertification(id);
  document.getElementById('confirm-modal').classList.add('active');
}

/**
 * Delete a certification from the backend
 * @param {string} id - Certification ID to delete
 */
async function deleteCertification(id) {
  try {
    const response = await fetch(`${CERTS_API}/certifications/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error();
    showToast('Certification deleted successfully');
    closeConfirmModal();
    loadCertifications();
  } catch (error) {
    showToast('Failed to delete certification', 'error');
  }
}
