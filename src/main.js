import './style.css';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

// State
let images = [];
let activeImageId = null;
let cropper = null;

// DOM Elements
const app = document.querySelector('#app');

// Initial Layout
app.innerHTML = `
  <header>
    <div style="display: flex; align-items: center; gap: 1rem;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#d97706" />
            <stop offset="100%" stop-color="#74c997" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      <h1>Artist Gallery Uploader</h1>
    </div>
    <div class="user-profile">
      <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(45deg, #d97706, #74c997);"></div>
    </div>
  </header>

  <main>
    <div class="upload-zone" id="uploadZone">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      <h3 style="margin-bottom: 0.5rem;">Drag & Drop Masterpieces</h3>
      <p style="color: var(--color-text-muted); font-size: 0.9rem;">or click to browse</p>
      <input type="file" id="fileInput" multiple accept="image/*" style="display: none;">
    </div>

    <div class="gallery" id="gallery">
      <!-- Gallery Items will be injected here -->
    </div>
  </main>

  <div class="modal-overlay" id="modalOverlay">
    <div class="modal">
      <div class="editor-preview">
        <div class="img-preview-container">
           <img id="editorImage" src="" style="max-width: 100%; max-height: 80vh; display: block;">
        </div>
      </div>
      <div class="editor-sidebar">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="font-size: 1.5rem;">Edit Artwork</h2>
          <button class="btn btn-secondary" id="closeModal">✕</button>
        </div>

        <div class="form-group">
          <label>Title</label>
          <input type="text" id="editTitle" placeholder="Artwork Title">
          <button class="ai-pill" id="aiTitleBtn">✨ Generate Title</button>
        </div>

        <!-- New Core Fields -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
             <div class="form-group">
                <label>Price ($)</label>
                <input type="number" id="editPrice" placeholder="500">
             </div>
             <div class="form-group">
                <label>Status</label>
                <select id="editStatus" style="background: #000; color: var(--color-accent-green); border: 2px solid var(--color-border); padding: 0.8rem; font-family: var(--font-body);">
                    <option value="Available">Available</option>
                    <option value="Sold">Sold</option>
                    <option value="Reserved">Reserved</option>
                    <option value="NFS">Not for Sale</option>
                </select>
             </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
             <div class="form-group">
                <label>Dimensions</label>
                <input type="text" id="editDimensions" placeholder="12 x 16 in">
             </div>
             <div class="form-group">
                <label>Medium</label>
                <input type="text" id="editMedium" placeholder="Oil on Canvas">
             </div>
        </div>

        <div class="form-group">
          <label>Story / Description</label>
          <textarea id="editStory" placeholder="Tell the story behind this piece..."></textarea>
          <button class="ai-pill" id="aiStoryBtn">📝 Enhance Story</button>
        </div>
        
        <div class="form-group">
            <label>SEO Tags & Mood</label>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;" id="tagsContainer">
                <!-- Tags injected here -->
            </div>
            <button class="ai-pill" id="aiTagsBtn">🏷️ Auto-Tag & Mood</button>
        </div>

        <div style="margin-top: auto; display: flex; gap: 1rem; flex-direction: column;">
            <button class="btn btn-secondary" id="cropBtn">Crop Selection</button>
            <button class="btn btn-primary" id="saveBtn">Save Changes</button>
            <button class="btn btn-primary" style="background: linear-gradient(135deg, #000 0%, #333 100%); border: 1px solid #444;" id="wixBtn">Upload to Wix</button>
        </div>
      </div>
    </div>
  </div>
`;

// Event Listeners
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const gallery = document.getElementById('gallery');
const modalOverlay = document.getElementById('modalOverlay');
const closeModalBtn = document.getElementById('closeModal');
const editorImage = document.getElementById('editorImage');

// Upload Logic
uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

function handleFiles(files) {
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImage = {
        id: Date.now() + Math.random(),
        src: e.target.result,
        title: file.name.split('.')[0],
        description: '',
        tags: [],
        price: '',
        dimensions: '',
        medium: '',
        status: 'Available'
      };
      images.push(newImage);
      renderGallery();
    };
    reader.readAsDataURL(file);
  });
}

function renderGallery() {
  gallery.innerHTML = images.map(img => `
    <div class="card" onclick="openEditor(${img.id})">
      <div class="card-image-container">
        <img src="${img.src}" alt="${img.title}">
      </div>
      <div class="card-content">
        <h3 class="card-title">${img.title}</h3>
        <p class="card-desc" style="color: var(--color-accent-orange); font-weight: bold;">
             ${img.status === 'Available' && img.price ? '$' + img.price : img.status}
        </p>
        <p class="card-desc">${img.description || 'No description yet...'}</p>
        <div class="card-actions">
           <span class="chip" style="font-size: 0.7rem;">Edit</span>
           <span class="chip" style="font-size: 0.7rem;">SEO Ready</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Global scope specific for inline onclick handlers (cleaner would be event delegation)
window.openEditor = (id) => {
  activeImageId = id;
  const img = images.find(i => i.id === id);
  if (!img) return;

  editorImage.src = img.src;
  document.getElementById('editTitle').value = img.title;
  document.getElementById('editStory').value = img.description;

  // New Fields
  document.getElementById('editPrice').value = img.price || '';
  document.getElementById('editDimensions').value = img.dimensions || '';
  document.getElementById('editMedium').value = img.medium || '';
  document.getElementById('editStatus').value = img.status || 'Available';

  renderTags(img.tags);

  modalOverlay.classList.add('active');

  // Init Cropper
  if (cropper) cropper.destroy();
  cropper = new Cropper(editorImage, {
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 0.8,
    restore: false,
    guides: true,
    center: true,
    highlight: false,
    cropBoxMovable: true,
    cropBoxResizable: true,
    toggleDragModeOnDblclick: false,
  });
};

function closeEditor() {
  modalOverlay.classList.remove('active');
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}

closeModalBtn.addEventListener('click', closeEditor);

// Backend API URL
const API_URL = 'http://localhost:3000/api';

// --- AI Integration ---
async function generateAI(type) {
  const titleVal = document.getElementById('editTitle').value;
  const storyVal = document.getElementById('editStory').value;

  // UI Loading State
  const btn = document.getElementById(type === 'title' ? 'aiTitleBtn' : (type === 'story' ? 'aiStoryBtn' : 'aiTagsBtn'));
  const originalText = btn.innerHTML;
  btn.innerHTML = '👁️ Vision Analysis...';
  btn.disabled = true;

  try {
    // Get current image from Cropper (or raw source if cropper not ready)
    let imageBase64 = editorImage.src;
    if (cropper) {
      imageBase64 = cropper.getCroppedCanvas().toDataURL('image/png');
    }

    const res = await fetch(`${API_URL}/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        context: storyVal, // Optional text context 
        image: imageBase64   // Send the actual image!
      })
    });
    const data = await res.json();

    if (type === 'title') document.getElementById('editTitle').value = data.result.replace(/"/g, '');
    if (type === 'story') document.getElementById('editStory').value = data.result;
    if (type === 'tags') {
      // Parse space separated tags
      const tags = data.result.split(' ').filter(t => t.startsWith('#'));
      const currentImage = images.find(i => i.id === activeImageId);
      if (currentImage) currentImage.tags = tags;
      renderTags(tags);
    }

  } catch (e) {
    alert("AI Offline: Check server logs");
    console.error(e);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

document.getElementById('aiTitleBtn').addEventListener('click', () => generateAI('title'));
document.getElementById('aiStoryBtn').addEventListener('click', () => generateAI('story'));
document.getElementById('aiTagsBtn').addEventListener('click', () => generateAI('tags'));

function renderTags(tags) {
  const container = document.getElementById('tagsContainer');
  container.innerHTML = tags.map(t => `<span class="chip">${t}</span>`).join('');
}

// --- Save & Wix Logic ---
document.getElementById('saveBtn').addEventListener('click', async () => {
  const btn = document.getElementById('saveBtn');
  btn.innerHTML = "Saving...";

  const imgIndex = images.findIndex(i => i.id === activeImageId);
  if (imgIndex > -1) {
    const img = images[imgIndex];
    // Gather all data
    img.title = document.getElementById('editTitle').value;
    img.description = document.getElementById('editStory').value;
    img.price = document.getElementById('editPrice').value;
    img.dimensions = document.getElementById('editDimensions').value;
    img.medium = document.getElementById('editMedium').value;
    img.status = document.getElementById('editStatus').value;

    // Apply Crop if active
    let finalImageSrc = img.src;
    if (cropper) {
      finalImageSrc = cropper.getCroppedCanvas().toDataURL('image/png');
      img.src = finalImageSrc;
      editorImage.src = finalImageSrc;
      cropper.replace(finalImageSrc);
    }

    try {
      const res = await fetch(`${API_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...img, // Send all fields
          imageBase64: finalImageSrc
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Saved locally to: ${data.path}`);
      }
    } catch (e) {
      alert('Failed to save to disk.');
    }
  }
  btn.innerHTML = "Save Changes";
  renderGallery();
});

document.getElementById('wixBtn').addEventListener('click', async () => {
  const btn = document.getElementById('wixBtn');
  btn.innerHTML = "Uploading...";

  const imgIndex = images.findIndex(i => i.id === activeImageId);
  if (imgIndex === -1) return; // Corrected condition
  const img = images[imgIndex];

  try {
    const res = await fetch(`${API_URL}/wix/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: img.id,
        title: document.getElementById('editTitle').value,
        description: document.getElementById('editStory').value,
        tags: img.tags,
        price: document.getElementById('editPrice').value,
        dimensions: document.getElementById('editDimensions').value,
        medium: document.getElementById('editMedium').value,
        status: document.getElementById('editStatus').value
      })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
    } else {
      alert(data.error);
    }
  } catch (e) {
    alert("Wix Upload Failed");
  }
  btn.innerHTML = "Upload to Wix";
});
