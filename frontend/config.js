/**
 * config.js - Application Configuration
 * 
 * This file contains API endpoints and global state variables used across the app.
 */

// ✅ Final production API URLs (your deployment)
const VERCEL_BASE = "https://opsabarsec-github-io-divelog.vercel.app";

// All endpoints are served from the root by api/main.py
const DIVES_API = VERCEL_BASE;
const CERTS_API = VERCEL_BASE;

// Global state
let USER_NAME = 'Diver';
let USER_ID = 'default_user';
let currentDives = [];
let editingDiveId = null;
let editingPhotoIds = [];
