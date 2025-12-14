# Artist Gallery Uploader

A full-stack web application for artists to upload, edit, crop, and manage artwork with AI-powered metadata generation. Features integration with Wix CMS for portfolio management.

## Features

- **Drag & Drop Upload** - Upload multiple images at once
- **Image Cropping** - Built-in cropper with visual feedback
- **AI-Powered Metadata** - Generate titles, descriptions, tags, and critiques using Claude AI
- **Local Storage** - Save artwork to local filesystem with JSON metadata and CSV export
- **Wix Integration** - Push metadata to Wix CMS collections
- **Retro-Futuristic UI** - CRT scanlines, phosphor green accents, vintage aesthetic

## Architecture

```
the37thmover_website/
├── server.js              # Express backend API
├── src/
│   ├── main.js           # Frontend application
│   └── style.css         # Retro-futuristic styles
├── tools/
│   └── api-vault/        # Centralized API key management
├── local_gallery_db/     # Local artwork storage
│   ├── images/           # Saved PNG files
│   ├── data/             # JSON metadata per artwork
│   ├── cms_manifest.json # Master metadata record
│   └── cms_bulk_import.csv
└── index.html            # Entry point
```

## Quick Start

### 1. Install Dependencies

```bash
# Main app
npm install

# API Vault (handles API keys securely)
cd tools/api-vault && npm install
```

### 2. Configure API Keys

The project uses a **Universal API Vault** to manage API keys securely. Keys are stored in `tools/api-vault/.env`, not in the main project.

```bash
# Copy the example and add your keys
cp tools/api-vault/.env.example tools/api-vault/.env
```

Edit `tools/api-vault/.env`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
WIX_API_KEY=your-wix-api-key
WIX_SITE_ID=your-wix-site-id
```

### 3. Start the Services

```bash
# Terminal 1: Start the API Vault (handles API key injection)
cd tools/api-vault && npm start
# Runs on http://localhost:9999

# Terminal 2: Start the main application
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| POST | `/api/ai/generate` | Generate AI content (title/story/tags/critique) |
| POST | `/api/save` | Save artwork to local filesystem |
| POST | `/api/wix/upload` | Upload metadata to Wix CMS |
| GET | `/api/artworks` | List all saved artworks |

## Universal API Vault

The API Vault is a local proxy server that:
- Centralizes all API keys in one secure location
- Injects keys into outgoing requests automatically
- Keeps sensitive credentials out of the main codebase
- Supports Anthropic, Google Gemini, and OpenAI

```
Your App → localhost:9999/proxy/anthropic → api.anthropic.com (with key injected)
```

## Environment Variables

### Main App (.env)
```env
PORT=3000
GALLERY_DIR=./local_gallery_db
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
USE_VAULT=true
VAULT_URL=http://localhost:9999/proxy/anthropic/
```

### API Vault (tools/api-vault/.env)
```env
ANTHROPIC_API_KEY=your-key
GEMINI_API_KEY=your-key
OPENAI_API_KEY=your-key
WIX_API_KEY=your-key
WIX_SITE_ID=your-id
```

## Security Features

- **Centralized Key Management** - API keys stored only in the vault
- **CORS Restriction** - Only allowed origins can access the API
- **Rate Limiting** - 20 AI requests per minute per IP
- **Input Validation** - All endpoints validate and sanitize input
- **XSS Prevention** - HTML escaping in frontend rendering
- **File Type Validation** - Only PNG, JPEG, GIF, WebP accepted

## Tech Stack

**Frontend:**
- Vite 7.x (build tool)
- Vanilla JavaScript
- CropperJS (image cropping)
- Custom CSS (retro-futuristic theme)

**Backend:**
- Node.js with ES Modules
- Express 5.x
- Anthropic SDK (Claude AI)
- Wix SDK (CMS integration)

**Tools:**
- Universal API Vault (http-proxy-middleware)

## Development

```bash
# Run both frontend and backend
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Wix Setup

To use the Wix integration:

1. Create an API Key in Wix Dashboard → Settings → API Keys
2. Create a collection named `ArtGallery` with these fields:
   - `title` (Text)
   - `description` (Text)
   - `tags` (Text)
   - `price` (Number)
   - `dimensions` (Text)
   - `medium` (Text)
   - `status` (Text)
   - `originalId` (Text)
3. Add the credentials to `tools/api-vault/.env`

## Known Limitations

- Images are not uploaded to Wix Media Manager (only metadata)
- No user authentication (designed for single-user local use)
- Session data is not persisted (refresh loses unsaved work)
- File-based storage (not suitable for production at scale)

## License

Private project - All rights reserved.

## Credits

- Built with assistance from Claude (Anthropic) and Gemini (Google)
- Retro-futuristic design inspiration from analog tech aesthetics
