# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.1.0] - 2024-12-13

### Added
- **Universal API Vault** - Centralized API key management via local proxy
- **Rate Limiting** - 20 AI requests per minute per IP to prevent abuse
- **Input Validation** - All server endpoints now validate and sanitize input
- **Toast Notifications** - Visual feedback for all user actions
- **Error Handling** - Comprehensive error handling on frontend and backend
- **Health Check Endpoint** - `/api/health` for monitoring server status
- **Get Artworks Endpoint** - `/api/artworks` to list saved artwork
- **CORS Configuration** - Restricted to allowed origins only
- **Responsive Design** - Mobile-friendly layout adjustments
- **Keyboard Shortcuts** - Escape key closes modal
- **File Validation** - Type and size checks before upload

### Changed
- **Configurable Paths** - Storage directory now configurable via `GALLERY_DIR` env var
- **API URL Configuration** - Frontend API URL configurable via `VITE_API_URL`
- **CSV Export** - Proper escaping for quotes, commas, and newlines
- **Error Messages** - More helpful and user-friendly error messages
- **Button States** - Proper disabled states during async operations

### Fixed
- **Hardcoded Paths** - Removed `D:/the37thmover_website` hardcoding
- **XSS Vulnerability** - HTML escaping in gallery rendering
- **CSV Injection** - Proper field escaping in CSV export
- **Memory Leaks** - Better cleanup of Cropper instances
- **Double-Click Prevention** - Buttons disabled during API calls

### Security
- API keys moved to centralized vault
- Input validation on all endpoints
- CORS restricted to specific origins
- Rate limiting implemented
- File type whitelist enforced

## [1.0.0] - 2024-12-12

### Added
- Initial release
- Drag & drop image upload
- Image cropping with CropperJS
- AI-powered title generation (Claude 3.5 Sonnet)
- AI-powered story/description generation
- AI-powered tag generation
- AI-powered artistic critique
- Local filesystem storage (images + JSON metadata)
- CSV export for CMS bulk import
- Wix CMS metadata upload
- Retro-futuristic UI design
- Price, dimensions, medium, status fields
- Gallery view with cards

### Known Issues
- Wix integration only uploads metadata, not images
- No session persistence (refresh loses data)
- Single-user design (no authentication)
