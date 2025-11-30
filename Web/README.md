# CoST Knowledge Hub - Angular Client

Angular 21 client application for the CoST Knowledge Hub, providing access to infrastructure transparency resources with AI-powered search and translation.

## Features

- **Resource Discovery**: Browse infrastructure transparency resources by category and type
- **Smart Search**:
  - Keyword search for quick filtering
  - AI-powered semantic search (Gemini) for intelligent resource grouping
- **Multi-language Support**: AI translation for English, Spanish, and Portuguese
- **Interactive Features**:
  - Click tracking and popularity indicators
  - Multiple sort options (newest, oldest, A-Z, popular)
  - Category and type filters
  - Responsive design for all devices

## Tech Stack

- **Angular**: 21.0.0
- **TypeScript**: 5.9.2
- **Styling**: Tailwind CSS with custom CoST brand colors
- **Testing**: Jasmine + Karma (configured for 80% coverage threshold)
- **HTTP**: Angular HttpClient for API integration
- **State Management**: RxJS Observables

## Prerequisites

- Node.js >= 18.x
- npm >= 11.x
- Backend server running on port 3000

## Installation

```bash
npm install
```

## Development Server

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Running Tests

```bash
# Run tests once
npm test -- --watch=false

# Run tests with coverage
npm test -- --watch=false --code-coverage

# Run tests in watch mode
npm test
```

**Coverage Requirement**: >= 80% (enforced in karma.conf.js)

## Build

```bash
# Development build
ng build

# Production build
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   └── resource-card/       # Resource card component
│   ├── models/
│   │   ├── types.ts             # TypeScript interfaces and enums
│   │   └── constants.ts         # Resource data
│   ├── services/
│   │   ├── resource.service.ts  # Resource API integration
│   │   ├── translate.service.ts # AI translation service
│   │   └── search.service.ts    # AI semantic search service
│   ├── app.ts                   # Main app component
│   ├── app.html                 # Main app template
│   └── app.config.ts            # App configuration
├── styles.css                   # Global styles + Tailwind
└── test.ts                      # Test configuration
```

## API Integration

The Angular client connects to the Express backend (port 3000) with the following endpoints:

- `GET /api/resources` - Fetch all resources
- `POST /api/interact/:id` - Track resource interactions
- `GET /api/popular` - Get popular resource IDs
- `POST /api/search` - Semantic AI search
- `POST /api/translate` - AI translation

## Services

### ResourceService
Handles all resource-related API calls:
- Loading resources from backend
- Tracking user interactions (clicks)
- Fetching popular resources

**Tests**: `resource.service.spec.ts` - 100% coverage

### TranslateService
Provides AI-powered translation:
- Translates resource titles and descriptions
- Supports English, Spanish, and Portuguese
- Uses Google Gemini AI via backend

**Tests**: `translate.service.spec.ts` - 100% coverage

### SearchService
Enables intelligent search:
- Semantic search using AI
- Groups resources by logical workflows
- Provides contextual recommendations

**Tests**: `search.service.spec.ts` - 100% coverage

## Components

### ResourceCard
Reusable component for displaying individual resources:
- **Inputs**:
  - `resource: ResourceItem` - The resource to display
  - `isPopular: boolean` - Whether to show popular badge
- **Outputs**:
  - `interact: EventEmitter<string>` - Emits resource ID on click
- **Features**:
  - Category and type tags
  - Formatted date display
  - Popular badge (when applicable)
  - Hover animations
  - External link handling

**Tests**: `resource-card.component.spec.ts` - High coverage

## Testing Strategy

### Test-Driven Development (TDD)
All services and components follow TDD:
1. Write test first (RED)
2. Implement code to pass test (GREEN)
3. Refactor while keeping tests green (REFACTOR)

### Test Coverage
- **Target**: >= 80% coverage (enforced)
- **Services**: 100% coverage (all methods tested)
- **Components**: High coverage with behavior testing
- **Integration**: Tests use real HTTP calls via HttpTestingController

## Styling

### Tailwind CSS Configuration
Custom CoST brand colors defined in `tailwind.config.js`:

```javascript
colors: {
  'cost-blue': '#0A4A82',
  'cost-red': '#E13C3D',
  'cost-yellow': '#F9C847',
  'cost-dark': '#1A1A1A',
}
```

### Typography
- Font Family: Inter (loaded from Google Fonts)
- Responsive text sizes
- Accessibility-focused contrast ratios

## Known Issues

1. **Testing Framework**: Karma configuration needs adjustment for Angular 21
   - Alternative: Switch to Jest for faster testing

2. **Icon Library**: lucide-angular not compatible with Angular 21 yet
   - Solution: Using inline SVG icons

## Migration Notes

This application was migrated from React 19 to Angular 21 while keeping the Express backend unchanged. See `MIGRATION_REPORT.md` in the project root for full migration details.

## License

All rights reserved - Infrastructure Transparency Initiative

## Additional Resources

For more information on using the Angular CLI, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
