# CLAUDE.md - CoST Infrastructure Transparency Knowledge Hub

## Project Overview
Create a pixel-perfect clone of the C40 Knowledge Hub (https://www.c40knowledgehub.org/s/?language=en_US) but for CoST (Infrastructure Transparency Initiative). The design, layout, interactions, and user experience must be IDENTICAL to C40, only the content, branding, and data should reflect CoST's mission.

## Critical Design Requirements

### Visual Design System
- **MUST match C40 exactly**: Same spacing, typography scale, color usage patterns, card designs, hover effects
- **Primary Color**: Replace C40's green (#00B74A) with CoST blue (#0066CC)
- **Secondary Colors**: Maintain same color relationships but adjusted for CoST brand
- **Typography**: Keep same font hierarchy (weights, sizes, line-heights) as C40
- **Grid System**: 12-column responsive grid with same breakpoints as C40
- **Spacing**: Use exact same padding/margin values as C40

### Component Library (Match C40 Exactly)

#### Hero Section
- Full-width hero with gradient overlay
- Large headline with subtitle
- Search bar with same styling and functionality
- Quick filter buttons below search
- Background pattern/image with same treatment as C40

#### Navigation
- Sticky header with same behavior as C40
- Mega menu dropdowns with identical animations
- Mobile hamburger menu with slide-out panel
- Breadcrumbs with same styling

#### Content Cards
- Same card dimensions and shadow effects
- Identical hover states (slight lift + shadow)
- Image aspect ratios matching C40
- Tag/category badges in same positions
- "Read more" link styling

#### Filters & Search
- Left sidebar filters with same accordion behavior
- Multi-select checkboxes with same styling
- Search results page with same layout
- Filter tags showing active selections
- Results count and sorting options

### Page Templates to Implement

#### 1. Homepage
```
Structure:
- Hero section with search
- Featured resources carousel (3 cards visible)
- Topic grid (6 boxes with icons)
- Latest resources section
- Country showcase map
- Newsletter signup banner
```

#### 2. Browse/Search Results Page
```
Structure:
- Search bar at top
- Left sidebar (300px) with filters
- Main content area with cards grid
- Pagination at bottom
- Results count and sort dropdown
```

#### 3. Resource Detail Page
```
Structure:
- Breadcrumbs
- Title and metadata section
- Download/action buttons
- Main content area
- Related resources sidebar
- Tags and categories
```

#### 4. Topic Hub Page
```
Structure:
- Topic hero with icon
- Introduction text
- Sub-topic navigation tabs
- Resources grid
- Case studies section
```

## Representative Data Structure

### Resources Collection
```javascript
const resources = [
  {
    id: "res-001",
    title: "CoST Infrastructure Data Standard (IDS) Implementation Guide",
    description: "Comprehensive guide for implementing the 40 core data points of CoST IDS across infrastructure projects",
    type: "guide",
    category: "Data Standards",
    topics: ["Transparency", "Data Disclosure", "Implementation"],
    thumbnail: "/images/ids-guide-thumb.jpg",
    downloadUrl: "/downloads/cost-ids-guide-2024.pdf",
    fileSize: "3.2 MB",
    format: "PDF",
    language: "English",
    countries: ["Global"],
    publishDate: "2024-03-15",
    featured: true
  },
  {
    id: "res-002",
    title: "Thailand Infrastructure Transparency Success Story",
    description: "How Thailand saved $360 million through CoST implementation in highway projects",
    type: "case-study",
    category: "Impact Stories",
    topics: ["Cost Savings", "Public Procurement", "Southeast Asia"],
    thumbnail: "/images/thailand-highway.jpg",
    countries: ["Thailand"],
    impact: {
      savings: "$360 million",
      projects: 47,
      transparency: "85% disclosure rate"
    }
  },
  // Add 20+ more representative resources
];
```

### Topics/Categories
```javascript
const topics = [
  {
    id: "disclosure",
    name: "Data Disclosure",
    icon: "database",
    color: "#0066CC",
    description: "Open data and transparency in infrastructure",
    resourceCount: 45
  },
  {
    id: "assurance",
    name: "Independent Assurance",
    icon: "shield-check",
    color: "#00A651",
    description: "Third-party verification and validation",
    resourceCount: 32
  },
  {
    id: "procurement",
    name: "Public Procurement",
    icon: "clipboard-list",
    color: "#F7941D",
    description: "Transparent tendering and contracting",
    resourceCount: 68
  },
  {
    id: "monitoring",
    name: "Project Monitoring",
    icon: "chart-line",
    color: "#ED1C24",
    description: "Tracking implementation and progress",
    resourceCount: 41
  },
  {
    id: "stakeholder",
    name: "Multi-stakeholder Working",
    icon: "users",
    color: "#662D91",
    description: "Collaborative governance approaches",
    resourceCount: 29
  },
  {
    id: "accountability",
    name: "Social Accountability",
    icon: "megaphone",
    color: "#00AEEF",
    description: "Citizen engagement and oversight",
    resourceCount: 37
  }
];
```

### Countries Data
```javascript
const countries = [
  {
    code: "UG",
    name: "Uganda",
    region: "Africa",
    status: "Active Member",
    joinedYear: 2014,
    projects: 127,
    disclosureRate: 78,
    flagUrl: "/flags/ug.svg"
  },
  {
    code: "GT",
    name: "Guatemala",
    region: "Latin America",
    status: "Active Member",
    joinedYear: 2016,
    projects: 89,
    disclosureRate: 82,
    flagUrl: "/flags/gt.svg"
  },
  // Add all 20 CoST member countries
];
```

### Search Filters Structure
```javascript
const filters = {
  type: [
    { value: "guide", label: "Implementation Guides", count: 24 },
    { value: "case-study", label: "Case Studies", count: 31 },
    { value: "tool", label: "Tools & Templates", count: 18 },
    { value: "report", label: "Research Reports", count: 42 },
    { value: "policy", label: "Policy Briefs", count: 15 }
  ],
  topic: [
    { value: "disclosure", label: "Data Disclosure", count: 45 },
    { value: "assurance", label: "Independent Assurance", count: 32 },
    { value: "procurement", label: "Public Procurement", count: 68 },
    { value: "monitoring", label: "Project Monitoring", count: 41 }
  ],
  region: [
    { value: "africa", label: "Africa", count: 48 },
    { value: "asia", label: "Asia Pacific", count: 37 },
    { value: "latam", label: "Latin America", count: 29 },
    { value: "europe", label: "Europe", count: 21 }
  ],
  language: [
    { value: "en", label: "English", count: 98 },
    { value: "es", label: "Español", count: 45 },
    { value: "fr", label: "Français", count: 32 },
    { value: "ar", label: "العربية", count: 18 }
  ]
};
```

## Interactive Features to Implement

### Search Functionality
- Instant search with debouncing (300ms)
- Search suggestions dropdown
- Recent searches storage
- Search within results
- Clear search functionality

### Filter Behavior
- Multi-select with checkboxes
- Show count next to each filter
- "Clear all" option per category
- Active filters shown as removable tags
- URL updates with filter state

### Card Interactions
- Hover: Slight scale (1.02) and shadow increase
- Click: Navigate to detail page
- Bookmark icon (top right) with toggle state
- Download icon for downloadable resources
- Share dropdown (LinkedIn, Twitter, Email)

### Responsive Behavior
- Desktop: 3 cards per row
- Tablet: 2 cards per row
- Mobile: 1 card per row
- Sidebar filters collapse to modal on mobile
- Touch-friendly tap targets (44px minimum)

## Technical Implementation Notes

### Angular Components Structure
```
src/app/
├── components/
│   ├── header/
│   ├── hero-search/
│   ├── resource-card/
│   ├── filter-sidebar/
│   ├── topic-grid/
│   └── country-map/
├── pages/
│   ├── home/
│   ├── browse/
│   ├── resource-detail/
│   └── topic-hub/
├── services/
│   ├── resource.service.ts
│   ├── search.service.ts
│   └── filter.service.ts
└── models/
    ├── resource.model.ts
    └── filter.model.ts
```

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'cost-blue': '#0066CC',
        'cost-green': '#00A651',
        'cost-orange': '#F7941D',
        'cost-red': '#ED1C24',
        'cost-purple': '#662D91',
        'cost-cyan': '#00AEEF'
      },
      fontFamily: {
        'sans': ['Roboto', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0,0,0,0.1)',
        'card-hover': '0 8px 16px rgba(0,0,0,0.15)'
      }
    }
  }
}
```

### Firebase Integration
- Use Firestore for all data
- Cloud Storage for PDFs/images
- Authentication for saved resources
- Analytics for usage tracking
- Cloud Functions for search indexing

## Content Guidelines

### Hero Headlines
- Main: "Transparency in Infrastructure, Delivered"
- Sub: "Access tools, guides, and resources to implement infrastructure transparency in your country"

### Call-to-Actions
- "Explore Resources"
- "Find Your Country"
- "Get Started"
- "Download Tool"
- "Read Case Study"

### Empty States
- Search: "No resources found. Try adjusting your filters or search terms."
- Country: "This country is not yet a CoST member. Learn how to join."
- Topic: "No resources available in this topic yet."

## Accessibility Requirements
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support
- Focus indicators on all interactive elements

## Performance Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Lighthouse Score: > 90
- Bundle size: < 250KB initial
- Image optimization: WebP with fallbacks

Remember: The goal is to create an EXACT visual clone of C40 Knowledge Hub's design system while replacing the content with CoST infrastructure transparency resources. Every spacing, shadow, animation, and interaction should match C40's implementation precisely.