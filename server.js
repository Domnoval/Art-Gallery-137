import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { createClient, ApiKeyStrategy } from '@wix/sdk';
import * as media from '@wix/media';
import { items } from '@wix/data';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ===========================================
// CORS Configuration
// ===========================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// ===========================================
// Rate Limiting (Simple in-memory)
// ===========================================
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 AI requests per minute

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  const record = rateLimitStore.get(ip);

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
    return next();
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait before making more AI requests.',
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
  }

  record.count++;
  next();
}

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// ===========================================
// AI Client Configuration
// Uses Universal API Vault (localhost:9999) when available
// Falls back to direct API if ANTHROPIC_API_KEY is set
// ===========================================
const VAULT_URL = process.env.VAULT_URL || 'http://localhost:9999/proxy/anthropic/';
const USE_VAULT = process.env.USE_VAULT !== 'false'; // Default: true

const anthropic = new Anthropic({
  apiKey: USE_VAULT ? 'vault-managed' : (process.env.ANTHROPIC_API_KEY || 'not-configured'),
  baseURL: USE_VAULT ? VAULT_URL : undefined
});

// ===========================================
// Storage Setup - Configurable via environment
// ===========================================
const GALLERY_DIR = process.env.GALLERY_DIR || './local_gallery_db';
const UPLOAD_DIR = path.resolve(__dirname, GALLERY_DIR);
const IMAGES_DIR = path.join(UPLOAD_DIR, 'images');
const DATA_DIR = path.join(UPLOAD_DIR, 'data');

// Ensure directories exist
[UPLOAD_DIR, IMAGES_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ===========================================
// Input Validation Helpers
// ===========================================
function validateString(value, fieldName, maxLength = 1000) {
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  if (value.length > maxLength) {
    return { valid: false, error: `${fieldName} exceeds maximum length of ${maxLength}` };
  }
  return { valid: true };
}

function validateImageBase64(imageData) {
  if (!imageData || typeof imageData !== 'string') {
    return { valid: false, error: 'Image data is required' };
  }

  const matches = imageData.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return { valid: false, error: 'Invalid image format. Expected base64 encoded PNG, JPEG, GIF, or WebP.' };
  }

  // Check reasonable size (max ~40MB decoded)
  if (matches[2].length > 50 * 1024 * 1024) {
    return { valid: false, error: 'Image too large. Maximum size is approximately 40MB.' };
  }

  return { valid: true, mediaType: `image/${matches[1]}`, base64Data: matches[2] };
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9_-]/gi, '_').toLowerCase().slice(0, 100);
}

// ===========================================
// CSV Helper - Proper escaping
// ===========================================
function escapeCSVField(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

// ===========================================
// Routes
// ===========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    galleryDir: UPLOAD_DIR,
    vaultEnabled: USE_VAULT,
    vaultUrl: USE_VAULT ? VAULT_URL : 'disabled'
  });
});

// 1. AI Generation (with rate limiting)
app.post('/api/ai/generate', rateLimit, async (req, res) => {
  const { type, context, image } = req.body;

  // Validate type
  const validTypes = ['title', 'story', 'tags', 'critique'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
  }

  // Validate context
  const contextValidation = validateString(context || '', 'context', 5000);
  if (!contextValidation.valid) {
    return res.status(400).json({ error: contextValidation.error });
  }

  // Validate image
  const imageValidation = validateImageBase64(image);
  if (!imageValidation.valid) {
    return res.status(400).json({ error: imageValidation.error });
  }

  try {
    const systemPrompt = "You are an expert art curator, critic, and creative companion. Your aesthetic is Retro-Futuristic, Tech-Noir, and High-Art. You provide deep, insightful, and commercially viable analysis.";

    let userPrompt = "";
    if (type === 'title') {
      userPrompt = `Looking at this image, generate 5 distinct, abstract, and poetic title options. Return them as a simple list. Context: ${context || 'None provided'}`;
    } else if (type === 'story') {
      userPrompt = `Write a compelling, mysterious backing story for this artwork. Focus on the atmosphere, the 'why', and the hidden meaning. Keep it under 150 words but make it sound like a museum placard from the year 2088. Context: ${context || 'None provided'}`;
    } else if (type === 'tags') {
      userPrompt = `Analyze the visual elements, mood, and style. Generate 15 high-impact, relevant Instagram/SEO hashtags. Be detailed and specific (e.g., #cyberpunk #neonnoir #oilpainting). Return ONLY the tags separated by spaces. Context: ${context || 'None provided'}`;
    } else if (type === 'critique') {
      userPrompt = `Provide a professional artistic critique. Analyze the Composition, Color Palette, and Emotional Impact. Be encouraging but honest, like a mentor. Also suggest 2-3 potential improvements or creative pivots for future works. Context: ${context || 'None provided'}`;
    }

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageValidation.mediaType,
                data: imageValidation.base64Data,
              },
            },
            {
              type: "text",
              text: userPrompt
            }
          ],
        }
      ],
    });

    const text = msg.content[0].text;
    res.json({ result: text });
  } catch (error) {
    console.error("AI Error:", error.message);

    // Provide helpful error messages
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('9999')) {
      return res.status(503).json({
        error: "API Vault not running. Start it with: cd tools/api-vault && npm start"
      });
    }

    res.status(500).json({ error: "AI Generation Failed. Please try again." });
  }
});

// 2. Save to Local Drive
app.post('/api/save', async (req, res) => {
  try {
    const { id, title, description, tags, imageBase64, price, dimensions, medium, status } = req.body;

    // Validate required fields
    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    const titleValidation = validateString(title || '', 'title', 200);
    if (!titleValidation.valid) {
      return res.status(400).json({ error: titleValidation.error });
    }

    const descValidation = validateString(description || '', 'description', 5000);
    if (!descValidation.valid) {
      return res.status(400).json({ error: descValidation.error });
    }

    const imageValidation = validateImageBase64(imageBase64);
    if (!imageValidation.valid) {
      return res.status(400).json({ error: imageValidation.error });
    }

    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    const validStatuses = ['Available', 'Sold', 'Reserved', 'NFS'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Save Image
    const safeTitle = sanitizeFilename(title || 'untitled');
    const imageFilename = `${id}_${safeTitle}.png`;
    const imagePath = path.join(IMAGES_DIR, imageFilename);

    fs.writeFileSync(imagePath, imageValidation.base64Data, 'base64');

    // Save Metadata
    const metadata = {
      id,
      title: title || 'Untitled',
      description: description || '',
      tags: tags || [],
      price: price || '',
      dimensions: dimensions || '',
      medium: medium || '',
      status: status || 'Available',
      imagePath: imagePath,
      fileName: imageFilename,
      lastUpdated: new Date().toISOString()
    };

    const jsonPath = path.join(DATA_DIR, `${id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));

    updateCMSManifest(metadata);

    res.json({ success: true, path: imagePath });
  } catch (error) {
    console.error("Save Error:", error.message);
    res.status(500).json({ error: "Failed to save locally" });
  }
});

// 3. Wix Upload
app.post('/api/wix/upload', async (req, res) => {
  try {
    const { id, title, description, tags, price, dimensions, medium, status } = req.body;

    // Get Wix credentials from Vault's .env or local .env
    const WIX_API_KEY = process.env.WIX_API_KEY;
    const WIX_SITE_ID = process.env.WIX_SITE_ID;

    if (!WIX_API_KEY || !WIX_SITE_ID) {
      return res.status(503).json({
        error: "Wix not configured. Add WIX_API_KEY and WIX_SITE_ID to the API Vault .env"
      });
    }

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    const titleValidation = validateString(title || '', 'title', 200);
    if (!titleValidation.valid) {
      return res.status(400).json({ error: titleValidation.error });
    }

    const wixClient = createClient({
      modules: { media, items },
      auth: ApiKeyStrategy({
        siteId: WIX_SITE_ID,
        apiKey: WIX_API_KEY
      })
    });

    const galleryItem = {
      title: title || 'Untitled',
      description: description || '',
      tags: Array.isArray(tags) ? tags.join(', ') : (tags || ''),
      price: price ? parseFloat(price) : null,
      dimensions: dimensions || '',
      medium: medium || '',
      status: status || 'Available',
      originalId: String(id)
    };

    const result = await wixClient.items.insert('ArtGallery', galleryItem);

    res.json({
      success: true,
      message: "Uploaded to Wix 'ArtGallery' collection",
      wixId: result._id
    });

  } catch (error) {
    console.error("Wix Error:", error.message);
    res.status(500).json({
      error: "Wix upload failed. Ensure 'ArtGallery' collection exists and API Key has permissions."
    });
  }
});

// 4. Get saved artworks
app.get('/api/artworks', (req, res) => {
  try {
    const manifestPath = path.join(UPLOAD_DIR, 'cms_manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return res.json({ artworks: [] });
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    res.json({ artworks: manifest });
  } catch (error) {
    console.error("Read Error:", error.message);
    res.status(500).json({ error: "Failed to read artworks" });
  }
});

// ===========================================
// Helper: CMS Manifest Updater
// ===========================================
function updateCMSManifest(newEntry) {
  const manifestPath = path.join(UPLOAD_DIR, 'cms_manifest.json');
  let db = [];

  if (fs.existsSync(manifestPath)) {
    try {
      db = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (e) {
      console.error("Error reading manifest, starting fresh:", e.message);
      db = [];
    }
  }

  const docIndex = db.findIndex(d => d.id === newEntry.id);
  if (docIndex >= 0) {
    db[docIndex] = newEntry;
  } else {
    db.push(newEntry);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(db, null, 2));

  // CSV with proper escaping
  const csvHeader = "ID,Title,Description,Tags,Price,Dimensions,Medium,Status,ImageFileName\n";
  const csvRows = db.map(d => [
    escapeCSVField(d.id),
    escapeCSVField(d.title),
    escapeCSVField(d.description),
    escapeCSVField(Array.isArray(d.tags) ? d.tags.join(' ') : d.tags),
    escapeCSVField(d.price),
    escapeCSVField(d.dimensions),
    escapeCSVField(d.medium),
    escapeCSVField(d.status),
    escapeCSVField(d.fileName)
  ].join(',')).join('\n');

  fs.writeFileSync(path.join(UPLOAD_DIR, 'cms_bulk_import.csv'), csvHeader + csvRows);
}

// ===========================================
// Error handling middleware
// ===========================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ===========================================
// Start Server
// ===========================================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║       Artist Gallery Uploader - Server                 ║
╠════════════════════════════════════════════════════════╣
║  Server:      http://localhost:${String(PORT).padEnd(4)}                    ║
║  Gallery DB:  ${GALLERY_DIR.padEnd(40)} ║
║  API Vault:   ${USE_VAULT ? 'Enabled (localhost:9999)'.padEnd(40) : 'Disabled'.padEnd(40)} ║
╚════════════════════════════════════════════════════════╝
  `);

  if (USE_VAULT) {
    console.log(`  Ensure the API Vault is running: cd tools/api-vault && npm start\n`);
  }
});
