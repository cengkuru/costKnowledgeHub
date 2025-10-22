# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (2025-10-22)
- ALFRED logo integration across all components
- ALFRED logo displayed in header with tagline "Analytical Learning Framework"
- ALFRED logo displayed in empty state hero section
- PWA icons for ALFRED branding (192x192 and 512x512)
- Favicon updated to use ALFRED icon
- Apple touch icon support

### Changed (2025-10-22)
- Complete rebrand from "Knowledge Hub" to "ALFRED"
- Project name changed to "alfred" in package.json
- Angular project name updated to "alfred"
- Build output path changed to dist/alfred/browser
- Page title updated to "ALFRED - Analytical Learning Framework"
- Meta description updated with full ALFRED acronym and description
- Header brand subtitle changed to "Analytical Learning Framework"
- Empty state mission statement updated to reflect ALFRED's purpose:
  "An AI-driven research assistant that combines intelligent search, semantic analysis, and multi-model AI orchestration to deliver comprehensive insights on infrastructure transparency data."
- Footer updated to display "ALFRED" branding
- All test expectations updated to reference "ALFRED"

### Technical
- Logo asset: `web/src/assets/alfred.png` (main logo, 1.3MB)
- Icon assets: `web/src/assets/icons/icon-192x192.png` and `icon-512x512.png`
- All TypeScript service comments updated
- Documentation files updated (UI_TRANSFORMATION.md, DESIGN_SYSTEM.md, INTEGRATION_COMPLETE.md)

## [Previous Version] - Prior to 2025-10-22
- Initial CoST Knowledge Hub implementation
