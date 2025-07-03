# CoST Knowledge Hub Admin Module Documentation

## 🏗️ Architecture Overview

The admin module is a complete content management system built with Angular 18, providing comprehensive tools for managing resources, users, analytics, and files for the CoST Knowledge Hub platform.

### Module Structure
```
src/app/admin/
├── admin-layout.component.ts    # Main layout wrapper with sidebar/header
├── admin-layout.component.html  # Layout template
├── admin.routes.ts              # Routing configuration
├── components/                  # Feature components
│   ├── analytics/              # Analytics dashboard
│   ├── dashboard/              # Main dashboard
│   ├── file-upload/            # File upload management
│   ├── resources/              # Resource CRUD operations
│   │   ├── resource-management.component.ts
│   │   └── resource-form.component.ts
│   ├── settings/               # Settings page (pending)
│   └── users/                  # User management
└── CLAUDE_ADMIN.md             # This documentation
```

## 🔑 Key Features

### 1. **Dashboard** (`dashboard.component.ts`)
- **Real-time Statistics**: Displays live counts of resources, views, downloads, and active users
- **Resource Distribution Chart**: Doughnut chart showing resource types using Chart.js
- **Recent Activity Feed**: Shows latest user actions and resource updates
- **Quick Stats Cards**: 
  - Total Resources (with published count)
  - Total Views (with percentage change)
  - Total Downloads (with monthly count)
  - Active Users (monthly active users)

### 2. **Resource Management** (`resources/`)

#### Resource Management Component
**Purpose**: Main interface for viewing and managing all resources

**Features**:
- **Search & Filter**: Real-time search by title, description, or tags
- **Status Filter**: Filter by published/draft/unpublished
- **Type Filter**: Filter by resource type (guide, report, tool, etc.)
- **Bulk Actions**: Publish/unpublish multiple resources
- **Pagination**: Server-side pagination for performance
- **Actions per Resource**:
  - Edit resource details
  - Toggle publish status
  - Delete resource
  - View analytics

**Data Flow**:
```typescript
ResourceManagementComponent
    ↓ (uses)
ResourceService
    ↓ (communicates with)
FirestoreService
    ↓ (connects to)
Firebase Firestore
```

#### Resource Form Component
**Purpose**: Create and edit resources

**Form Fields**:
```typescript
{
  title: { en: string, es: string, pt: string },      // Multi-language
  description: { en: string, es: string, pt: string }, // Multi-language
  type: ResourceType,                                  // Dropdown selection
  topics: TopicCategory[],                            // Multi-select
  tags: string[],                                     // Tag input
  country: string,                                    // Country selector
  language: Language,                                 // Primary language
  featured: boolean,                                  // Featured toggle
  fileLinks: { en?: string, es?: string, pt?: string }, // File URLs
  externalLink?: string,                              // External URL
  thumbnailUrl?: string                               // Preview image
}
```

**Validation Rules**:
- Title required in at least English
- Description required in at least English
- Type selection required
- At least one topic required
- Valid URLs for file/external links

### 3. **Analytics Dashboard** (`analytics/analytics.component.ts`)

**Real-time Metrics**:
- **Page Views**: Total views with 30-day trend
- **Downloads**: Total downloads with monthly breakdown
- **Active Users**: Monthly active user count
- **Resource Count**: Published resources

**Visualizations**:
- **Line Chart**: Page views over time (last 30 days)
- **Doughnut Chart**: Resource type distribution
- **Top Resources Table**: Most viewed resources with metrics
- **Search Trends**: Popular search terms with frequency

**Data Sources**:
```typescript
AnalyticsService.getPageViews(30)     // 30-day page view data
AnalyticsService.getTopResources(10)  // Top 10 resources
AnalyticsService.getSearchTrends(7)   // 7-day search trends
FirestoreService.getResources()       // Resource statistics
```

### 4. **User Management** (`users/user-management.component.ts`)

**Features**:
- **User List**: Paginated table with search and filters
- **Role Management**: Admin, Editor, Viewer roles
- **Status Control**: Active, Suspended, Pending statuses
- **User Actions**:
  - Change user role (dropdown)
  - Toggle user status (suspend/activate)
  - Send password reset email
  - Delete user (with confirmation)
  - View activity log

**Add User Modal**:
```typescript
{
  email: string,        // Required, validated email
  displayName: string,  // Required, min 2 characters
  password: string,     // Required, min 6 characters
  role: 'admin' | 'editor' | 'viewer'  // Default: viewer
}
```

**Activity Tracking**:
- All user actions are logged with timestamps
- Activity includes: resource edits, user management, file uploads
- Viewable per user in activity modal

### 5. **File Upload** (`file-upload/file-upload.component.ts`)

**Upload Features**:
- **Drag & Drop**: Visual drag-drop area with hover states
- **File Browser**: Click to browse files
- **Multi-file Support**: Upload multiple files simultaneously
- **Progress Tracking**: Real-time upload progress bars
- **Validation**:
  - Accepted formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG
  - Max file size: 50MB
  - File type validation before upload

**Storage Management**:
- **Storage Stats**: 
  - Total storage used (with visual progress bar)
  - Storage limit (5GB default)
  - Total files count
- **File List**: Recent uploads with metadata
- **File Actions**:
  - Copy file URL to clipboard
  - Delete file with confirmation

**Upload Process**:
```typescript
1. File Selection/Drop
2. Validation (type & size)
3. Add to upload queue
4. Upload to Firebase Storage
5. Track progress
6. Store metadata (uploader, timestamp)
7. Update file list
```

## 🔐 Security & Permissions

### Route Guards
```typescript
// All admin routes protected by authGuard
{
  path: '',
  component: AdminLayoutComponent,
  canActivate: [authGuard],
  children: [...]
}
```

### Role-Based Access
- **Admin**: Full access to all features
- **Editor**: Can manage resources, view analytics
- **Viewer**: Read-only access to dashboard and analytics

### Firebase Security Rules
```javascript
// Resources collection
match /resources/{resourceId} {
  allow read: if true;  // Public read
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'editor'];
}

// Users collection
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

## 📊 Data Models

### Resource Model
```typescript
interface Resource {
  id: string;
  title: { en: string; es: string; pt: string };
  description: { en: string; es: string; pt: string };
  type: 'guidance' | 'caseStudy' | 'report' | 'dataset' | 'tool' | 'infographic' | 'other';
  topics: TopicCategory[];
  tags: string[];
  country: string;
  language: 'en' | 'es' | 'pt';
  datePublished: Timestamp;
  fileLinks?: { en?: string; es?: string; pt?: string };
  externalLink?: string;
  thumbnailUrl?: string;
  featured: boolean;
  status: 'published' | 'draft' | 'unpublished';
  views: number;
  downloads: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### User Model
```typescript
interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'suspended' | 'pending';
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
  lastActivityAt?: Timestamp;
  metadata?: {
    department?: string;
    position?: string;
    phone?: string;
    location?: string;
  };
}
```

### Analytics Event Model
```typescript
interface AnalyticsEvent {
  type: 'page_view' | 'resource_view' | 'download' | 'search';
  resourceId?: string;
  userId?: string;
  searchQuery?: string;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}
```

## 🔄 Service Layer

### ResourceService
**Purpose**: Manages all resource CRUD operations

**Key Methods**:
```typescript
getResources(filter?: ResourceFilter): Observable<ResourceSearchResult>
getResourceById(id: string): Observable<Resource | undefined>
createResource(resource: Omit<Resource, 'id'>, userId: string): Promise<string>
updateResource(id: string, resource: Partial<Resource>, userId: string): Promise<void>
deleteResource(id: string): Promise<void>
publishResource(id: string, userId: string): Promise<void>
unpublishResource(id: string, userId: string): Promise<void>
```

### FirestoreService
**Purpose**: Low-level Firestore operations

**Key Methods**:
```typescript
getResources(filter?: ResourceFilter, pageSize?: number): Promise<{resources: Resource[], hasMore: boolean}>
createResource(resource: Partial<Resource>, userId: string): Promise<string>
updateResource(id: string, updates: Partial<Resource>, userId: string): Promise<void>
deleteResource(id: string): Promise<void>
incrementViews(id: string): Promise<void>
incrementDownloads(id: string): Promise<void>
```

### AnalyticsService
**Purpose**: Analytics tracking and reporting

**Key Methods**:
```typescript
trackPageView(path: string, title?: string): Promise<void>
trackResourceView(resourceId: string, userId?: string): Promise<void>
trackDownload(resourceId: string, userId?: string): Promise<void>
trackSearch(query: string, resultsCount: number): Promise<void>
getPageViews(days: number): Promise<AnalyticsData[]>
getTopResources(metric: 'views' | 'downloads', limit: number): Promise<ResourceMetric[]>
getSearchTrends(days: number): Promise<SearchTrend[]>
```

### UserService
**Purpose**: User management operations

**Key Methods**:
```typescript
getUsers(): Promise<User[]>
getUserById(uid: string): Promise<User | null>
createUser(email: string, password: string, displayName: string, role: string): Promise<User>
updateUserRole(uid: string, role: 'admin' | 'editor' | 'viewer'): Promise<void>
updateUserStatus(uid: string, status: 'active' | 'suspended' | 'pending'): Promise<void>
deleteUser(uid: string): Promise<void>
sendPasswordReset(email: string): Promise<void>
getUserActivity(userId: string): Promise<UserActivity[]>
logActivity(userId: string, action: string, resourceId?: string): Promise<void>
```

### StorageService
**Purpose**: Firebase Storage operations

**Key Methods**:
```typescript
uploadFile(file: File, path: string, metadata?: any, onProgress?: Function): Promise<UploadResult>
uploadFileWithUrl(file: File, folder: string, metadata?: any): Promise<{downloadUrl: string, storagePath: string}>
deleteFile(path: string): Promise<void>
getFileUrl(path: string): Promise<string>
listFiles(path?: string): Promise<StorageReference[]>
getFileMetadata(path: string): Promise<FullMetadata>
```

## 🌐 Internationalization

All admin text is internationalized with keys in `i18n/en.json`:

```json
{
  "admin": {
    "title": "Admin Dashboard",
    "menu": {
      "dashboard": "Dashboard",
      "resources": "Resources",
      "analytics": "Analytics",
      "users": "Users",
      "settings": "Settings"
    },
    "resources": {
      "title": "Manage Resources",
      "addNew": "Add Resource",
      "search": "Search",
      "status": "Status",
      "type": "Type",
      // ... more keys
    },
    "analytics": {
      "title": "Analytics Dashboard",
      "totalPageViews": "Total Page Views",
      "totalDownloads": "Total Downloads",
      // ... more keys
    },
    "users": {
      "title": "User Management",
      "addUser": "Add User",
      "searchPlaceholder": "Search by name, email...",
      // ... more keys
    },
    "fileUpload": {
      "title": "File Upload",
      "dragDropArea": "Drag and drop files here, or",
      "browseFiles": "browse files",
      // ... more keys
    }
  }
}
```

## 🎨 UI/UX Patterns

### Layout Structure
- **Fixed Header**: Logo, user menu, notifications
- **Collapsible Sidebar**: Navigation menu, quick actions
- **Main Content Area**: Feature components render here
- **Responsive Design**: Mobile-friendly with hamburger menu

### Design System
- **Color Palette**: CoST brand colors (teal, cyan, amber)
- **Typography**: Inter font family
- **Components**: Consistent card layouts, form inputs, buttons
- **Icons**: Heroicons (SVG inline)
- **Loading States**: Skeleton loaders and spinners
- **Empty States**: Helpful messages and CTAs

### Common UI Components
```typescript
// Loading spinner
<div class="animate-spin h-5 w-5 text-cost-teal">...</div>

// Status badge
<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
  Published
</span>

// Action buttons
<button class="btn-primary">Primary Action</button>
<button class="btn-secondary">Secondary Action</button>

// Cards
<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <!-- Card content -->
</div>
```

## 🚀 Performance Optimizations

### Lazy Loading
All admin components use lazy loading:
```typescript
{
  path: 'dashboard',
  loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
}
```

### Pagination
- Server-side pagination for resource lists
- Default page size: 10 items
- Load more on scroll (planned)

### Caching Strategy
- Resource list cached in service
- Refresh on CRUD operations
- Analytics data cached for 5 minutes

### Image Optimization
- Lazy load images in resource list
- Thumbnail generation for uploads
- WebP format support (planned)

## 🔧 Development Guidelines

### Component Structure
```typescript
@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `...`,
  styles: [`...`]
})
export class FeatureComponent implements OnInit {
  // Dependency injection
  private service = inject(ServiceName);
  
  // Component state
  loading = false;
  data: DataType[] = [];
  
  // Lifecycle
  ngOnInit(): void {
    this.loadData();
  }
  
  // Methods
  async loadData(): Promise<void> {
    // Implementation
  }
}
```

### Service Pattern
```typescript
@Injectable({ providedIn: 'root' })
export class FeatureService {
  private firestore = inject(Firestore);
  
  async getData(): Promise<Data[]> {
    // Firestore query
    return data;
  }
}
```

### Error Handling
```typescript
try {
  this.loading = true;
  const data = await this.service.getData();
  this.processData(data);
} catch (error) {
  console.error('Error message:', error);
  this.showError('User-friendly error message');
} finally {
  this.loading = false;
}
```

## 📝 TODO & Future Enhancements

### Pending Features
1. **Settings Page**: System configuration, email settings, API keys
2. **User Profile Page**: Edit own profile, change password, preferences
3. **Bulk Upload**: CSV import for resources
4. **Advanced Analytics**: Custom date ranges, export reports
5. **Audit Log**: Complete system activity log
6. **Email Notifications**: User actions, system alerts
7. **Backup/Restore**: Data export/import functionality

### Planned Improvements
- Real-time collaboration on resources
- Version control for resource edits
- Advanced search with filters
- Resource preview before publish
- Custom user roles and permissions
- API rate limiting
- Performance monitoring dashboard
- A/B testing for resources

## 🐛 Known Issues & Workarounds

1. **File Upload Progress**: Progress tracking needs WebSocket implementation
2. **Search Limitations**: Full-text search requires Algolia/ElasticSearch
3. **User Deletion**: Requires Cloud Functions for complete auth removal
4. **Real-time Updates**: Consider implementing Firebase real-time listeners

## 🚀 Backend Setup & Deployment

### Firebase Project Setup

1. **Access Firebase Console**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Your project `knowledgehub-2ed2f` is already created
   - Enable the following services:
     - Authentication (Email/Password provider)
     - Firestore Database
     - Storage
     - Analytics

2. **Create First Admin User**

   a. Create a regular user account:
   ```bash
   # Go to http://localhost:4200/login
   # Click "Sign Up" and create an account with your admin email
   ```

   b. Set the admin email in Firebase Functions config:
   ```bash
   firebase functions:config:set admin.email="your-admin@example.com"
   ```

   c. Deploy the functions:
   ```bash
   cd functions
   npm install
   npm run build
   firebase deploy --only functions
   ```

   d. Make the user an admin by visiting:
   ```
   https://us-central1-knowledgehub-2ed2f.cloudfunctions.net/createFirstAdmin
   ```

   e. **IMPORTANT**: After creating the first admin, disable the `createFirstAdmin` function by commenting it out in `functions/src/admin.ts` and redeploying.

3. **Deploy Security Rules**
   ```bash
   # Deploy Firestore rules
   firebase deploy --only firestore:rules

   # Deploy Storage rules
   firebase deploy --only storage:rules
   ```

### Resource Types & Additional Fields

#### Assurance Reports
Additional fields:
- Projects reviewed count
- Total investment value
- Sectors covered
- Disclosure rate percentage
- Time/cost overrun data
- Key findings
- Recommendations

#### Implementation Guides
Additional fields:
- Difficulty level
- Implementation timeframe
- Target audience
- Prerequisites

#### Case Studies
Additional fields:
- Impact metrics (savings, projects affected)
- Success factors
- Lessons learned

### Testing Procedures

#### Test Authentication Flow
1. Sign up new user
2. Sign in with email/password
3. Test "Remember Me" functionality
4. Test password reset flow
5. Sign out

#### Test Resource Management
1. Create draft resource
2. Upload file
3. Add metadata
4. Publish resource
5. View on public site
6. Track analytics

#### Test File Upload
1. Upload PDF document
2. Upload Excel spreadsheet
3. Upload image for thumbnail
4. Test file size limits
5. Verify storage organization

### Production Deployment

1. **Update environment files**:
   ```typescript
   // src/environments/environment.prod.ts
   export const environment = {
     production: true,
     firebaseConfig: { /* ... */ }
   };
   ```

2. **Build for production**:
   ```bash
   npm run build
   ```

3. **Deploy to Firebase Hosting**:
   ```bash
   firebase deploy
   ```

### Security Considerations

1. **Authentication**: Only authenticated admins can modify resources
2. **Public Access**: Only published resources are visible to public
3. **File Access**: Storage rules prevent unauthorized file access
4. **Admin Claims**: Custom claims system for admin privileges
5. **Input Validation**: All inputs validated on both frontend and backend

### Troubleshooting

#### User Can't Access Admin
- Verify user has admin claim: Check Firebase Auth console
- Re-run `setAdminClaim` function if needed

#### Files Not Uploading
- Check Storage rules are deployed
- Verify file size and type restrictions
- Check browser console for errors

#### Resources Not Showing
- Ensure resources have `status: 'published'`
- Check Firestore rules allow read access
- Verify data structure matches model

### API Endpoints (Cloud Functions)

- `setAdminClaim`: Add/remove admin privileges (admin only)
- `createFirstAdmin`: One-time setup for first admin

### Future Enhancements

1. **Bulk Operations**: Import/export multiple resources
2. **Version Control**: Track resource versions
3. **Workflow**: Approval process for publishing
4. **Collaboration**: Multiple admin roles
5. **Advanced Analytics**: Custom reports and dashboards
6. **Search**: Full-text search with Algolia/ElasticSearch
7. **CDN**: CloudFlare for global file distribution

## 🔗 Related Documentation

- [Main CLAUDE.md](../../../CLAUDE.md) - Project overview
- [Firebase Configuration](../../../firebase.json) - Firebase settings
- [Resource Model](../core/models/resource.model.ts) - Data structures
- [i18n Translations](../../assets/i18n/) - Translation files

---

*Last Updated: January 2025*
*Version: 1.1.0*