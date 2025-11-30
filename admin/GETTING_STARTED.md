# Getting Started with CoST Admin Dashboard

## Quick Start

### 1. Installation

```bash
cd /Users/cengkurumichael/Dev/cost-knowledge-hub/admin
npm install
```

### 2. Ensure Backend is Running

The admin dashboard requires the CoST API server running:

```bash
cd /Users/cengkurumichael/Dev/cost-knowledge-hub/Api
npm install
npm run dev
```

The API should be running on `http://localhost:3001`

### 3. Start Development Server

```bash
cd /Users/cengkurumichael/Dev/cost-knowledge-hub/admin
npm run dev
```

Visit `http://localhost:3000` in your browser.

### 4. Login

Use your API admin credentials:
- Email: (as configured in your API)
- Password: (as configured in your API)

## Pages Overview

### Dashboard (`/`)
- Overview statistics
- Recent resources list
- Quick action buttons

### Resources (`/resources`)
- List all resources with pagination
- Filter by status, type
- Search by title/description
- Create new resource
- Edit/delete existing resources

### Create Resource (`/resources/new`)
- Form for creating new resources
- All CoST taxonomy fields
- Status starts as "pending_review"

### Edit Resource (`/resources/[id]`)
- Edit existing resource
- View resource metadata (ID, dates, status)
- Update all fields

### Categories (`/categories`)
- View all categories
- Create new category
- Edit/delete categories

### Login (`/login`)
- Email/password authentication
- JWT token storage
- Redirect to dashboard on success

## Development Tasks

### Run Tests

```bash
npm test                    # Run all tests once
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Build for Production

```bash
npm run build              # Build Next.js project
npm start                  # Start production server
```

### Lint Code

```bash
npm run lint               # Run ESLint
```

## API Integration Details

The dashboard communicates with the backend API:

**Base URL**: `http://localhost:3001/api`

**Required Endpoints**:
- `POST /auth/login` - User login
- `GET /admin/resources` - List resources
- `GET /admin/resources/:id` - Get resource
- `POST /admin/resources` - Create resource
- `PUT /admin/resources/:id` - Update resource
- `POST /admin/resources/:id/status` - Change status
- `DELETE /admin/resources/:id` - Delete resource
- `GET /admin/categories` - List categories
- `POST /admin/categories` - Create category
- `PUT /admin/categories/:id` - Update category
- `DELETE /admin/categories/:id` - Delete category

**Authentication**: JWT token in `Authorization: Bearer {token}` header

## Common Issues

### CORS Errors
Ensure the API has CORS enabled for `http://localhost:3000`

### 404 Resources
Ensure the API is running and `/api/admin/*` endpoints exist

### Token Expiration
Tokens are stored in localStorage. Clear localStorage if login fails:
```javascript
// In browser console
localStorage.clear()
```

### Port Already in Use
If port 3000 is taken, use:
```bash
npm run dev -- -p 3001
```

## File Structure Quick Reference

```
admin/
├── app/                    # Next.js pages
├── components/             # Reusable components
├── lib/                    # Utilities & API client
├── __tests__/              # Test files
├── public/                 # Static assets
└── package.json
```

## Accessibility Features

All pages include:
- Keyboard navigation (Tab, Enter, Escape)
- Focus indicators on all interactive elements
- WCAG 2.1 AA color contrast (4.5:1+)
- Semantic HTML with proper heading hierarchy
- Form labels and validation messages
- Screen reader support with ARIA labels

## Performance Notes

- Next.js 14 with App Router for optimal performance
- Tailwind CSS for minimal CSS overhead
- Client-side state with React hooks (no Redux needed)
- Lazy loading for resource lists

## Next Steps

1. Create some test resources via the API
2. Visit the dashboard to see stats
3. Test create/edit/delete flows
4. Try filtering and searching
5. Review accessibility with keyboard navigation

## Support

For issues or questions:
1. Check API logs: `/Users/cengkurumichael/Dev/cost-knowledge-hub/Api`
2. Review browser console for client errors
3. Verify API endpoints exist and respond correctly
