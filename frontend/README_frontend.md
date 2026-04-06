# Frontend JavaScript Documentation

This folder contains the JavaScript code for the Dive Log application frontend.
The code has been split into logical modules for better maintainability.

## File Structure

```
frontend/
├── index.html          # Main HTML page
├── styles.css          # Application styles
├── config.js           # API URLs and global state
├── utils.js            # Date formatting, toast notifications
├── image-utils.js      # Image compression and EXIF handling
├── dives.js            # Dive log CRUD operations
├── certifications.js   # Certification management
├── checklists.js       # Checklist management
├── ui.js               # Navigation, modals, lightbox
├── app.js              # Main entry point (initialization)
└── README.md           # This file
```

## Loading Order (index.html)

Scripts must be loaded in this order because of dependencies:

1. **config.js** - Defines global constants used by all modules
2. **utils.js** - Utility functions used by feature modules
3. **image-utils.js** - Image processing (used by dives.js)
4. **dives.js** - Dive management
5. **certifications.js** - Certification management
6. **checklists.js** - Checklist management
7. **ui.js** - UI components
8. **app.js** - Main entry point (depends on all above)

---

## config.js

**Purpose:** API configuration and global application state.

### Constants
| Constant | Description |
|----------|-------------|
| `VERCEL_BASE` | Base URL for the Vercel deployment |
| `DIVES_API` | API endpoint for dive operations |
| `CERTS_API` | API endpoint for certifications/checklists |

### Global State Variables
| Variable | Description |
|----------|-------------|
| `USER_NAME` | Display name of the logged-in user |
| `USER_ID` | User ID derived from name (lowercase, underscores) |
| `currentDives` | Array of loaded dives for the current view |
| `editingDiveId` | ID of dive being edited (null if adding new) |
| `editingPhotoIds` | Array of existing photo IDs when editing |

---

## utils.js

**Purpose:** Common utility functions used across the application.

### Functions

#### `formatDate(timestamp)`
Converts a Unix timestamp to a human-readable date string.
- **Input:** Unix timestamp in milliseconds
- **Output:** String like "Jan 15, 2024"

#### `formatDateForInput(timestamp)`
Converts a timestamp to YYYY-MM-DD format for HTML date inputs.
- **Input:** Unix timestamp in milliseconds  
- **Output:** String like "2024-01-15"

#### `showToast(message, type)`
Displays a temporary notification at the bottom of the screen.
- **Parameters:**
  - `message` - Text to display
  - `type` - 'success' (green) or 'error' (red)
- **Behavior:** Auto-removes after 3 seconds

---

## image-utils.js

**Purpose:** Handle image compression and EXIF orientation for mobile photo uploads.

**Why this is needed:** Mobile photos are often 8-15MB, but Vercel has a 4.5MB request limit. We compress images client-side before upload.

### Functions

#### `getExifOrientation(file)`
Reads EXIF data from a JPEG to determine camera orientation.
- **Input:** File object
- **Output:** Orientation number (1-8)
  - 1 = Normal
  - 6 = 90° clockwise (portrait photos from most phones)
  - 8 = 90° counter-clockwise
  - 3 = 180°

#### `compressImage(file, maxWidth, quality)`
Resizes and compresses an image for upload.
- **Parameters:**
  - `file` - Original image file
  - `maxWidth` - Maximum width in pixels (default: 1920)
  - `quality` - JPEG quality 0-1 (default: 0.85)
- **Output:** Compressed File object with .jpg extension
- **Behavior:** 
  - Files under 1MB are not compressed
  - Applies EXIF rotation during compression
  - Logs size reduction to console

---

## dives.js

**Purpose:** All dive log functionality - loading, displaying, creating, editing, and deleting dives.

### Data Loading Functions

#### `loadDiveStats()`
Fetches all dives and updates the "Total Dives" counter on the home page.

#### `loadLatestDive()`
Loads the most recent scuba dive and freedive for display on the home page.

#### `loadAllDives()`
Loads all dives and renders them as cards in the "My Dives" view.

### Rendering Functions

#### `renderDiveCard(dive, showActions)`
Renders a full dive card with photos, stats, and action buttons.
- Used for: Latest dive display, dive detail modal

#### `renderDiveMiniCard(dive)`
Renders a compact dive card for the list view.
- Shows: dive number, location, date, depth, duration

### Form Functions

#### `suggestNextDiveNumber()`
Automatically suggests the next dive number based on existing dives.
- Considers dive type (scuba vs freediving)

#### `showAddDiveModal()` / `closeAddDiveModal()`
Opens/closes the dive form modal. Resets form state when closing.

#### `showDiveDetail(id)` / `closeDiveDetailModal()`
Opens/closes the read-only dive detail modal.

#### `editDive(id)`
Populates the dive form with existing dive data for editing.

### Submission Function

#### `submitNewDive(event)`
Main form submission handler. This is the most complex function:

1. **Photo Processing:**
   - Limits to 5 photos max
   - Compresses each photo using `compressImage()`

2. **Fish Identification:**
   - Sends photos (except cover) to `/identify-fish` endpoint
   - Collects identified species with confidence scores

3. **Photo Upload:**
   - Uploads compressed photos to `/upload-photos`
   - Handles partial failures (HTTP 207)

4. **Save Dive:**
   - Builds payload with dive data + photo storage IDs
   - Prepends fish identification results to notes
   - Posts to `/dives/upsert`

### Delete Functions

#### `confirmDeleteDive(id)` / `deleteDive(id)`
Shows confirmation dialog and deletes the dive.

---

## certifications.js

**Purpose:** Manage dive certifications (PADI, SSI, etc.).

### Functions

#### `loadCertifications()`
Fetches and displays all certifications for the user.

#### `renderCertCard(cert)`
Renders a certification card with agency, name, date, number, instructor, and badge image.

#### `showAddCertModal()` / `closeAddCertModal()`
Opens/closes the certification form modal.

#### `submitNewCert(event)`
Submits a new certification to the backend.

#### `confirmDeleteCert(id)` / `deleteCertification(id)`
Shows confirmation and deletes the certification.

---

## checklists.js

**Purpose:** Manage links to dive checklists (Google Docs/Sheets).

### Functions

#### `loadChecklists()`
Fetches and displays all checklists.

#### `renderChecklistItem(item)`
Renders a checklist item with name and "Open" button.

#### `showAddChecklistModal()` / `closeAddChecklistModal()`
Opens/closes the checklist form modal.

#### `submitNewChecklist(event)`
Submits a new checklist link to the backend.

---

## ui.js

**Purpose:** UI navigation and shared components (lightbox, modals).

### Navigation Functions

#### `setupNavigation()`
Attaches click handlers to navigation buttons.

#### `switchView(viewName)`
Switches between main views (home, dives, certifications, checklists).
- Updates nav button active states
- Shows/hides view containers
- Triggers data loading for the selected view

### Lightbox Functions

#### `openLightbox(src)`
Opens a full-screen image viewer.
- Click image or press Escape to close

#### `closeLightbox()`
Closes the lightbox and clears the image.

#### `_lightboxEscHandler(e)`
Internal handler for Escape key to close lightbox.

### Modal Functions

#### `closeConfirmModal()`
Closes the delete confirmation modal.

---

## app.js

**Purpose:** Main application entry point. Handles initialization and login.

### Event Listeners

#### `DOMContentLoaded`
Checks session storage on page load. If user was previously authenticated, initializes the app directly.

### Functions

#### `initApp()`
Initializes the application after login:
1. Hides login overlay, shows main app
2. Loads user configuration
3. Sets up navigation
4. Loads dive stats and latest dive

#### `handleLogin(event)`
Authenticates the user:
1. Sends password to `/login` endpoint
2. On success: stores auth flag and initializes app
3. On failure: shows alert

#### `loadConfig()`
Loads user profile configuration:
- User name and derived ID
- Contact information (address, phone, email)
- Emergency contact info

---

## Key Concepts

### Global Functions
All functions are defined in global scope (not ES modules) so they can be called from HTML `onclick` handlers.

### State Management
Simple global variables are used instead of a framework:
- `currentDives` - cache of loaded dives
- `editingDiveId` - tracks if we're adding or editing
- `editingPhotoIds` - preserves existing photos during edit

### Error Handling
Functions use try/catch with console.error logging and toast notifications for user feedback.

### Mobile Considerations
- Image compression reduces 8-15MB photos to ~1-2MB
- EXIF orientation ensures photos display correctly
- File input is explicitly cleared (needed for mobile browsers)
