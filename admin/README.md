# CoST Admin Dashboard

A Next.js admin dashboard for managing CoST Knowledge Hub resources.

## Features

- **Authentication**: Login with email/password, JWT token storage
- **Dashboard**: Overview stats and recent resources
- **Resources Management**: Create, read, update, delete resources with full CoST taxonomy
- **Categories**: Manage resource categories
- **Filtering & Search**: Filter by status, type, language; search by title/description
- **Pagination**: Browse resources with pagination support
- **Responsive Design**: Mobile-first Tailwind CSS design
- **WCAG 2.1 AA Accessibility**: Keyboard navigation, screen reader support, proper contrast ratios

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS 3
- **Language**: TypeScript
- **Testing**: Jest + React Testing Library

## Project Structure

```
admin/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── globals.css             # Global styles
│   ├── page.tsx                # Dashboard page
│   ├── login/
│   │   └── page.tsx            # Login page
│   ├── resources/
│   │   ├── page.tsx            # Resources list
│   │   ├── new/
│   │   │   └── page.tsx        # Create resource
│   │   └── [id]/
│   │       └── page.tsx        # Edit resource
│   └── categories/
│       └── page.tsx            # Categories management
├── components/
│   ├── Layout.tsx              # Main layout wrapper
│   ├── ResourceForm.tsx        # Reusable resource form
│   ├── LoadingSpinner.tsx      # Loading indicator
│   ├── ErrorMessage.tsx        # Error alert
│   └── SuccessMessage.tsx      # Success alert
├── lib/
│   ├── types.ts                # TypeScript types/interfaces
│   ├── api.ts                  # API client utilities
│   └── auth.ts                 # Auth helpers
└── __tests__/
    ├── lib/
    │   ├── api.test.ts
    │   └── auth.test.ts
    └── components/
        └── ErrorMessage.test.tsx
```

## Installation

```bash
cd admin
npm install
```

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Development

```bash
npm run dev
```

Visit `http://localhost:3000`

## Production Build

```bash
npm run build
npm start
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Authentication Flow

1. User logs in via `/login` page
2. JWT token stored in localStorage
3. Token sent in Authorization header for protected endpoints
4. On logout, token is cleared and user redirected to login

## API Integration

The admin dashboard integrates with the CoST API at `/api/admin/*`:

### Resources
- `GET /api/admin/resources` - List resources (paginated, filtered)
- `GET /api/admin/resources/:id` - Get single resource
- `POST /api/admin/resources` - Create resource
- `PUT /api/admin/resources/:id` - Update resource
- `POST /api/admin/resources/:id/status` - Change status
- `DELETE /api/admin/resources/:id` - Delete resource

### Categories
- `GET /api/admin/categories` - List categories
- `POST /api/admin/categories` - Create category
- `PUT /api/admin/categories/:id` - Update category
- `DELETE /api/admin/categories/:id` - Delete category

## Accessibility

All pages conform to WCAG 2.1 AA standards:

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus Indicators**: Visible blue focus outlines on all interactive elements
- **Color Contrast**: Text has minimum 4.5:1 contrast ratio
- **Semantic HTML**: Proper use of heading hierarchy, labels, and ARIA roles
- **Form Validation**: Clear error messages and validation feedback
- **Loading States**: Spinner component for async operations

## Design Principles (Jobs Method)

- **Simplicity**: Primary actions accomplished in 3 clicks or less
- **Focus**: One primary CTA per screen
- **Visual Precision**: 8pt grid spacing, Tailwind CSS only
- **Keyboard First**: All interactions work with keyboard
- **Error Prevention**: Confirmations for destructive actions
- **Progressive Disclosure**: Advanced features hidden by default

## Performance

- Server-side rendering for SEO
- Client-side state management with React hooks
- Lazy loading of resources list
- Optimized API requests with pagination

## Security

- JWT token-based authentication
- Token stored in localStorage (consider httpOnly cookies for production)
- API requests include authorization header
- Form validation on client and server

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## License

ISC
