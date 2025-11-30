# Quick Reference Card - CoST Admin Dashboard

## Project Location
```
/Users/cengkurumichael/Dev/cost-knowledge-hub/admin/
```

## Essential Commands

```bash
# Installation
npm install

# Development (http://localhost:3000)
npm run dev

# Production build
npm run build
npm start

# Testing
npm test
npm run test:watch
npm run test:coverage

# Linting
npm run lint
```

## Pages & Routes

| Route | Purpose | File |
|-------|---------|------|
| `/login` | Authentication | `app/login/page.tsx` |
| `/` | Dashboard | `app/page.tsx` |
| `/resources` | List resources | `app/resources/page.tsx` |
| `/resources/new` | Create resource | `app/resources/new/page.tsx` |
| `/resources/:id` | Edit resource | `app/resources/[id]/page.tsx` |
| `/categories` | Manage categories | `app/categories/page.tsx` |

## Key Files

### Pages
```
app/page.tsx                 → Dashboard
app/login/page.tsx          → Login
app/resources/page.tsx      → Resources list
app/resources/new/page.tsx  → Create resource
app/resources/[id]/page.tsx → Edit resource
app/categories/page.tsx     → Categories
```

### Components
```
components/Layout.tsx           → Main layout wrapper
components/ResourceForm.tsx     → Reusable resource form
components/LoadingSpinner.tsx   → Loading indicator
components/ErrorMessage.tsx     → Error alert
components/SuccessMessage.tsx   → Success notification
```

### Libraries
```
lib/api.ts   → API client methods
lib/types.ts → TypeScript definitions
lib/auth.ts  → Auth utilities
```

### Tests
```
__tests__/lib/api.test.ts
__tests__/lib/auth.test.ts
__tests__/components/ErrorMessage.test.tsx
```

## API Client Usage

### Login
```typescript
import { authApi } from '@/lib/api';

await authApi.login('email@example.com', 'password');
```

### List Resources
```typescript
import { resourcesApi } from '@/lib/api';

const { data, total, page, limit } = await resourcesApi.list(1, 20, {
  status: 'published',
  type: 'guidance'
});
```

### Create Resource
```typescript
const resource = await resourcesApi.create({
  title: 'New Resource',
  description: 'Description',
  url: 'https://example.com',
  slug: 'new-resource'
});
```

### Update Resource
```typescript
await resourcesApi.update(id, {
  title: 'Updated Title'
});
```

### Change Status
```typescript
await resourcesApi.updateStatus(id, 'published', 'Ready for publication');
```

### Delete Resource
```typescript
await resourcesApi.delete(id);
```

### List Categories
```typescript
import { categoriesApi } from '@/lib/api';

const categories = await categoriesApi.list();
```

## Component Usage

### Layout Wrapper
```typescript
import { Layout } from '@/components/Layout';

export default function MyPage() {
  return (
    <Layout userEmail="user@example.com">
      {/* Page content */}
    </Layout>
  );
}
```

### Error Message
```typescript
import { ErrorMessage } from '@/components/ErrorMessage';

<ErrorMessage
  message="Something went wrong"
  onDismiss={() => setError('')}
/>
```

### Resource Form
```typescript
import { ResourceForm } from '@/components/ResourceForm';

<ResourceForm
  initialData={resource}
  onSubmit={handleSubmit}
  isLoading={false}
/>
```

## Environment Setup

### .env.local
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Backend Requirement
API server must run on `http://localhost:3001`

## Authentication Flow

1. User visits `/login`
2. Submits email/password
3. API returns JWT token
4. Token stored in localStorage
5. Redirect to `/`
6. Token sent in `Authorization: Bearer {token}` header
7. Logout clears token

## Common Patterns

### Client-Side Auth Check
```typescript
import { isAuthenticated } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

useEffect(() => {
  if (!isAuthenticated()) {
    router.push('/login');
  }
}, [router]);
```

### API Error Handling
```typescript
try {
  await resourcesApi.create(data);
  setSuccess('Created!');
} catch (err) {
  setError(err instanceof Error ? err.message : 'Failed');
}
```

### Form State
```typescript
const [formData, setFormData] = useState<Partial<Resource>>({
  title: '',
  description: ''
});

const handleChange = (e) => {
  setFormData(prev => ({
    ...prev,
    [e.target.name]: e.target.value
  }));
};
```

## Styling with Tailwind

### Common Classes
```
bg-primary-600      → Primary button blue
text-gray-900       → Dark text
border-gray-300     → Light borders
rounded-md          → Medium border radius
hover:bg-primary-700 → Hover state
focus:ring-2        → Focus ring for accessibility
disabled:opacity-50 → Disabled state
transition-colors   → Smooth color transitions
```

### Responsive Design
```
flex            → Flexbox container
grid            → CSS Grid
md:grid-cols-2  → 2 columns on medium+ screens
gap-4           → 16px gap between items
p-6             → 24px padding
```

## Accessibility Shortcuts

### Focus Indicator
Already implemented in `globals.css`:
```css
:focus-visible {
  outline: 2px solid #0284c7;
  outline-offset: 2px;
}
```

### Required Field Indicator
```html
<label>
  Title <span aria-label="required">*</span>
</label>
```

### ARIA Label
```html
<button aria-label="Close menu">×</button>
```

### Form Validation
```html
<input
  required
  aria-invalid={error ? 'true' : 'false'}
  aria-describedby={error ? 'error-msg' : undefined}
/>
{error && <p id="error-msg" role="alert">{error}</p>}
```

## Debugging Tips

### View API Requests
DevTools > Network tab > Filter by Fetch/XHR

### Check Auth Token
Console: `localStorage.getItem('token')`

### View Form Data
Console: `console.log(formData)`

### Clear All Data
Console: `localStorage.clear()`

### Test API Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/admin/resources
```

## Performance Tips

- Keep components small and focused
- Use pagination for large lists
- Debounce search input
- Memoize expensive computations
- Lazy load images
- Use production build for testing

## Testing Patterns

### Component Test
```typescript
import { render, screen } from '@testing-library/react';
import { ErrorMessage } from '@/components/ErrorMessage';

test('renders error message', () => {
  render(<ErrorMessage message="Error" />);
  expect(screen.getByRole('alert')).toBeInTheDocument();
});
```

### API Test
```typescript
test('login stores token', async () => {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ tokens: { accessToken: 'token' } })
  }));

  await authApi.login('user@example.com', 'pass');
  expect(localStorage.getItem('token')).toBe('token');
});
```

## File Size Reference

Typical bundle sizes:
- HTML: ~3KB (gzipped)
- CSS: ~15KB (Tailwind, gzipped)
- JS: ~80KB (Next.js + React, gzipped)
- **Total**: ~100KB (fully gzipped)

## Version Reference

| Package | Version |
|---------|---------|
| Next.js | 14.1.0 |
| React | 18.3.1 |
| TypeScript | 5.3.3 |
| Tailwind | 3.4.1 |
| Jest | 29.7.0 |

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| CORS errors | Ensure API has CORS for localhost:3000 |
| 404 errors | API must be running on port 3001 |
| Token expired | Clear localStorage, login again |
| Build fails | `rm -rf .next && npm run build` |
| Tests fail | `npm install && npm test` |
| Styles missing | Rebuild: `npm run build` |

## Quick Development Checklist

- [ ] API running on `http://localhost:3001`
- [ ] `.env.local` configured with API URL
- [ ] Dev server running: `npm run dev`
- [ ] Can access `http://localhost:3000/login`
- [ ] Can login with valid credentials
- [ ] Dashboard loads with stats
- [ ] Resources list shows data
- [ ] Tests pass: `npm test`

## Next Steps After Setup

1. Verify backend API is working
2. Test login with valid credentials
3. Create a test resource
4. Verify stats update on dashboard
5. Edit the resource
6. Delete the resource
7. Test all filters on resources list
8. Create/edit/delete a category
9. Review accessibility with keyboard (Tab, Enter, Escape)
10. Run tests to ensure all pass

## Useful Links

- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Testing Library**: https://testing-library.com/react
- **MDN Web Docs**: https://developer.mozilla.org
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/

---

**Last Updated**: November 29, 2025
**Status**: Ready for Development
