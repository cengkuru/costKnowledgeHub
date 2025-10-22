# Changelog

All notable changes to ALFRED (formerly Knowledge Hub) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-22

### Added
- **Interactive Brand Logo**: ALFRED logo in header is now clickable and returns to landing page
- `goToHome()` method in header component that clears search results and query
- Improved logo rendering with proper aspect ratio (`h-12 w-auto object-contain`)

### Changed
- **Streamlined Empty State**: Removed verbose mission statement for cleaner, more minimal design
- **Logo Fix**: Updated logo sizing from fixed dimensions to maintain aspect ratio
- **Logo Path Fix**: Corrected logo paths to `../.././../assets/alfred.png` in both header and empty state
- **UX Improvement**: Header brand is now a button with hover opacity effect
- **Better Typography**: Full ALFRED acronym displayed in header subtitle
- **Complete Rebrand**: Changed all references from "Knowledge Hub" to "ALFRED" throughout the application
  - ALFRED stands for: **A**nalytical **L**earning **F**ramework for **R**eporting on **E**vidence and **D**isclosures
  - Updated package name from `cost-knowledge-hub` to `alfred`
  - Updated all configuration files (package.json, angular.json, firebase.json)
  - Updated HTML page title and added comprehensive meta tags
  - Updated all UI components to display "ALFRED" branding
  - Updated API endpoint reference in production environment
  - Updated all documentation files with new branding
  - Updated test expectations to match new branding

### Technical Details
- **Files Modified**: 14 files across configuration, source code, and documentation
- **Test Coverage**: Updated test files to reflect branding changes
- **API Endpoint**: Changed from `cost-knowledge-hub-api` to `alfred-api` in production config
- **Build Output**: Changed distribution path from `dist/cost-knowledge-hub` to `dist/alfred`

### Notes
- Logo assets will need to be added to `web/src/assets` directory
- Favicon will need to be updated to match new ALFRED branding
- API endpoint URL in production environment will need to be updated on the backend

---

## Previous Releases

### [0.9.0] - 2025-10-15
- Initial release as Knowledge Hub
- Full stack integration with MongoDB Atlas vector search
- AI-synthesized answers with inline citations
- Jony Ive-inspired UI design system