# TODO - Future Improvements

A prioritized list of future enhancements and fixes.

## High Priority

### Security & Stability
- [ ] Add user authentication (JWT or session-based)
- [ ] Implement proper file upload via multipart/form-data instead of base64
- [ ] Add request logging with timestamps for debugging
- [ ] Implement automatic API key rotation reminders
- [ ] Add HTTPS support for production deployment

### Core Features
- [ ] Complete Wix integration - upload actual images to Wix Media Manager
- [ ] Session persistence - save work-in-progress to localStorage
- [ ] Edit/update existing saved artwork
- [ ] Delete artwork from local storage
- [ ] Batch operations (select multiple, bulk delete, bulk export)

### Performance
- [ ] Image compression before saving (WebP, progressive JPEG)
- [ ] Lazy loading for gallery images
- [ ] Optimize base64 encoding (use Blob URLs for preview)
- [ ] Add service worker for offline capability

## Medium Priority

### User Experience
- [ ] Search and filter in gallery view
- [ ] Sort by date, title, price, status
- [ ] Drag to reorder gallery items
- [ ] Undo/redo for edits
- [ ] Auto-save drafts every 30 seconds
- [ ] Dark/light theme toggle (beyond current retro theme)
- [ ] Image zoom and pan in editor

### AI Features
- [ ] Multi-model support (switch between Claude, Gemini, GPT-4)
- [ ] AI style transfer suggestions
- [ ] AI-powered pricing recommendations
- [ ] Bulk AI generation for multiple artworks
- [ ] Custom AI prompts/personas

### Export & Integration
- [ ] Export to multiple formats (JPEG, WebP, PDF portfolio)
- [ ] Instagram direct posting integration
- [ ] Etsy/Shopify product creation
- [ ] Email artwork directly from app
- [ ] Generate printable labels with QR codes

## Low Priority

### Architecture
- [ ] Refactor main.js into ES modules (uploader, editor, api-client, ui)
- [ ] Add TypeScript support
- [ ] Migrate to SQLite or PostgreSQL for metadata
- [ ] Add automated testing (Jest + Playwright)
- [ ] CI/CD pipeline setup
- [ ] Docker containerization

### Advanced Features
- [ ] Multi-user support with accounts
- [ ] Collaboration features (share gallery links)
- [ ] Version history for artwork edits
- [ ] Analytics dashboard (views, saves, exports)
- [ ] Payment integration (Stripe) for direct sales
- [ ] Custom domain support for public galleries
- [ ] Mobile app (React Native or PWA)

### Content
- [ ] Artwork categories/collections
- [ ] Custom tags management
- [ ] Artist bio/about section
- [ ] Portfolio themes/templates
- [ ] Social media preview cards (OpenGraph)

## Technical Debt

- [ ] Remove unused `multer` dependency (not actively used)
- [ ] Remove unused `@google/generative-ai` import in server.js
- [ ] Add ESLint and Prettier configuration
- [ ] Add pre-commit hooks (husky + lint-staged)
- [ ] Document all API endpoints with OpenAPI/Swagger
- [ ] Add unit tests for validation helpers
- [ ] Add integration tests for API endpoints
- [ ] Performance profiling and optimization

## Completed

- [x] Create .env.example templates
- [x] Fix hardcoded paths
- [x] Add input validation
- [x] Add error handling on frontend
- [x] Fix CSV escaping
- [x] Restrict CORS
- [x] Add rate limiting
- [x] Create README documentation
- [x] Create CHANGELOG
- [x] Incorporate API Vault architecture
- [x] Add toast notifications
- [x] Add responsive design
- [x] Add XSS prevention

---

*Last updated: 2024-12-13*
