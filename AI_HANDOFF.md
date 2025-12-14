# AI Handoff Document

This document serves as a communication channel between AI assistants (Claude, Gemini, GPT, etc.) working on this project. It provides context, decisions made, and notes for continuity.

---

## Project Overview

**Artist Gallery Uploader** - A local-first web app for artists to:
1. Upload and crop artwork images
2. Generate AI-powered metadata (titles, stories, tags, critiques)
3. Save locally with JSON/CSV export
4. Push to Wix CMS

---

## Current State (2024-12-13)

### Architecture Decisions

1. **Universal API Vault** (Gemini's contribution)
   - Local proxy at `localhost:9999` handles all API key injection
   - Keys stored in `tools/api-vault/.env`, NOT in main project
   - Main app uses dummy keys, vault injects real ones
   - Supports: Anthropic, Gemini, OpenAI
   - Why: Centralizes secrets, keeps them out of git history

2. **File-Based Storage**
   - Using filesystem instead of database (intentional for v1)
   - `local_gallery_db/images/` for PNGs
   - `local_gallery_db/data/` for JSON metadata
   - `cms_manifest.json` as master index
   - `cms_bulk_import.csv` for CMS imports
   - Why: Simple, portable, no setup required

3. **Single-User Design**
   - No authentication (local tool)
   - No session persistence yet
   - Why: MVP focused on core functionality

### Recent Changes (Claude's Session)

1. **Security Hardening**
   - Added input validation on all endpoints
   - Added rate limiting (20 req/min per IP)
   - Restricted CORS to specific origins
   - Fixed CSV injection vulnerability
   - Added XSS prevention in frontend

2. **Error Handling**
   - Added toast notification system
   - Proper error messages from API
   - Health check endpoint
   - Connection status on page load

3. **Configuration**
   - Paths now configurable via env vars
   - API URL configurable via Vite env
   - Removed all hardcoded paths

4. **Documentation**
   - Created README.md
   - Created CHANGELOG.md
   - Created TODO.md
   - Created this AI_HANDOFF.md

---

## Key Files

| File | Purpose | Notes |
|------|---------|-------|
| `server.js` | Express backend | Main API server, uses vault proxy |
| `src/main.js` | Frontend app | Vanilla JS, CropperJS integration |
| `src/style.css` | Styles | Retro-futuristic theme |
| `tools/api-vault/server.js` | API key proxy | Gemini created this |
| `tools/api-vault/.env` | **SECRETS** | Never commit, contains API keys |

---

## Known Issues & Gotchas

1. **Wix Upload Incomplete**
   - Only uploads metadata, NOT actual images
   - Would need Wix Media Manager API for full integration
   - Left as-is for now (user can manually upload images)

2. **Session Not Persisted**
   - Page refresh loses all unsaved work
   - Should add localStorage backup (TODO)

3. **Vault Must Be Running**
   - Main app fails gracefully if vault is down
   - Error message tells user to start vault

4. **Windows Paths**
   - Originally hardcoded `D:/the37thmover_website`
   - Fixed to use relative paths via `GALLERY_DIR` env var
   - Test on other OS if deploying elsewhere

---

## Decisions For Next AI

### If Asked to Add Authentication
- Recommend JWT with httpOnly cookies
- Consider Passport.js for flexibility
- Store users in SQLite (migration from file storage)

### If Asked to Add Database
- SQLite is simplest migration path
- Schema: `artworks` table mirrors current JSON structure
- Keep file storage for images, DB for metadata

### If Asked About Multi-Model AI
- Vault already supports Gemini and OpenAI proxies
- Add model selector in UI
- Create adapter pattern in server.js

### If Asked About Deployment
- Recommend: Railway, Render, or Fly.io
- Vault should be bundled, not separate service
- Or: Inject keys at build time for serverless

---

## Communication Protocol

When handing off to another AI:

1. **Update this document** with your changes
2. **Add to CHANGELOG.md** for user-facing changes
3. **Add to TODO.md** if you identify new improvements
4. **Commit with clear message** describing what was done

### Message Format for Handoff

```
## Session: [Date]
### AI: [Claude/Gemini/GPT]
### Changes Made:
- [List of changes]

### Decisions Made:
- [Why you did what you did]

### Left For Next Session:
- [What's incomplete or needs attention]

### Notes:
- [Anything unusual or important]
```

---

## Session Log

### Session: 2024-12-13
### AI: Claude (Opus 4.5)
### Changes Made:
- Added input validation on all server endpoints
- Added rate limiting (20/min/IP)
- Restricted CORS to allowed origins
- Fixed CSV escaping (quotes, commas, newlines)
- Added toast notification system in frontend
- Added proper error handling with user feedback
- Made paths configurable via environment variables
- Added health check endpoint
- Added responsive CSS for mobile
- Created README.md, CHANGELOG.md, TODO.md, AI_HANDOFF.md
- Updated .env.example with all configuration options

### Decisions Made:
- Kept vault architecture as-is (good design by Gemini)
- Used simple in-memory rate limiting (good enough for local use)
- Added toast instead of alert() for better UX
- Kept vanilla JS (no framework migration)

### Left For Next Session:
- Wix image upload still incomplete
- No session persistence yet
- Could refactor main.js into modules
- Could add TypeScript

### Notes:
- User has exposed API keys in git history - recommended revoking
- Vault .env also has keys that should be rotated
- Project works well for local single-user use case

---

### Session: 2024-12-12 (approx)
### AI: Gemini
### Changes Made:
- Created Universal API Vault (`tools/api-vault/`)
- Set up proxy for Anthropic, Gemini, OpenAI APIs
- Created key migration script
- Updated main server.js to use vault

### Decisions Made:
- Vault as separate service for modularity
- Support multiple AI providers from start
- Keep keys completely out of main codebase

### Notes:
- Vault is working and tested
- Keys were migrated from main .env to vault .env

---

*This document should be updated by each AI that works on the project.*
