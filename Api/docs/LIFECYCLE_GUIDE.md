# Resource Lifecycle Guide

## Content States

### 1. Discovered
**Purpose:** Auto-discovered or newly added resources awaiting initial review

**Characteristics:**
- Initial state for auto-discovered content
- Not visible to public
- Can be bulk imported

**Valid Transitions:**
- → `pending_review` (Ready for editorial review)
- → `rejected` (Not suitable for platform)

**Use Cases:**
- Web scraping results
- API imports
- User submissions

---

### 2. Pending Review
**Purpose:** Content awaiting editorial review and approval

**Characteristics:**
- Under active review by editors
- Not visible to public
- May require edits or clarification

**Valid Transitions:**
- → `approved` (Passed editorial review)
- → `rejected` (Does not meet quality standards)

**Use Cases:**
- Editorial workflow
- Quality assurance
- Content moderation

---

### 3. Approved
**Purpose:** Reviewed and approved but not yet published

**Characteristics:**
- Passed quality review
- Not yet visible to public
- Ready for publication
- Can be scheduled for future publication

**Valid Transitions:**
- → `published` (Make public)
- → `pending_review` (Needs re-review)

**Use Cases:**
- Scheduled publishing
- Content queue management
- Final approval step

---

### 4. Published
**Purpose:** Live and visible to public

**Characteristics:**
- **PUBLIC** - Visible to all users
- Indexed for search
- Included in public API responses
- `publishedAt` timestamp set

**Valid Transitions:**
- → `archived` (Remove from public view)

**Use Cases:**
- Active content library
- Public-facing resources
- Search results

**Query Example:**
```typescript
// Only show published content to public
db.collection('resources').find({
  status: ContentStatus.PUBLISHED
});
```

---

### 5. Archived
**Purpose:** Removed from public view but retained for reference

**Characteristics:**
- Not visible to public
- Retained for historical purposes
- `archivedAt` timestamp set
- `archivedReason` should be provided
- May link to newer version via `supersededBy`

**Valid Transitions:**
- → `published` (Re-publish after review)

**Use Cases:**
- Outdated content
- Superseded by newer version
- Seasonal content
- Content under review

**Example:**
```typescript
// Archive outdated resource
const update = lifecycleService.prepareStatusUpdate(
  ContentStatus.PUBLISHED,
  ContentStatus.ARCHIVED,
  userId,
  'Superseded by updated 2024 guidelines'
);

await db.collection('resources').updateOne(
  { _id: resourceId },
  {
    $set: {
      ...update,
      supersededBy: newResourceId
    }
  }
);
```

---

### 6. Rejected
**Purpose:** Content that does not meet quality or relevance standards

**Characteristics:**
- Not visible to public
- Marked as unsuitable
- Can be reconsidered

**Valid Transitions:**
- → `pending_review` (Reconsider after improvements)

**Use Cases:**
- Low-quality content
- Spam or inappropriate content
- Out-of-scope resources
- Duplicate content

---

## Lifecycle Flow Diagram

```
┌─────────────┐
│  DISCOVERED │ (Auto-import, user submission)
└──────┬──────┘
       │
       ├─→ [reject] ─→ REJECTED ─→ [reconsider] ─┐
       │                                          ↓
       └─→ [review] ─→ PENDING_REVIEW ←──────────┘
                            │
                            ├─→ [reject] ─→ REJECTED
                            │
                            └─→ [approve] ─→ APPROVED
                                                │
                                                ├─→ [needs changes] ─→ PENDING_REVIEW
                                                │
                                                └─→ [publish] ─→ PUBLISHED
                                                                      │
                                                                      └─→ [archive] ─→ ARCHIVED
                                                                                         │
                                                                                         └─→ [re-publish] ─→ PUBLISHED
```

---

## Editorial Workflow

### Standard Approval Path
1. **Discovered** - New content enters system
2. **Pending Review** - Editor reviews for quality
3. **Approved** - Editor approves, content queued
4. **Published** - Content goes live

### Fast-Track Path (Trusted Sources)
1. **Discovered** - Auto-imported from trusted source
2. **Pending Review** - Quick verification
3. **Published** - Immediate publication

### Archive Path
1. **Published** - Live content
2. **Archived** - Removed due to:
   - Outdated information
   - Superseded by newer version
   - Seasonal/time-bound content
   - Content under review

---

## Status History Tracking

Every status change is recorded:

```typescript
interface StatusChange {
  status: ContentStatus;
  changedAt: Date;
  changedBy: ObjectId;  // Admin user who made the change
  reason?: string;      // Optional explanation
}
```

**Example:**
```typescript
resource.statusHistory = [
  {
    status: 'discovered',
    changedAt: '2024-01-01T10:00:00Z',
    changedBy: ObjectId('system'),
    reason: 'Auto-imported from World Bank API'
  },
  {
    status: 'pending_review',
    changedAt: '2024-01-02T09:00:00Z',
    changedBy: ObjectId('editor123'),
    reason: 'Queued for editorial review'
  },
  {
    status: 'approved',
    changedAt: '2024-01-02T14:30:00Z',
    changedBy: ObjectId('editor123'),
    reason: 'Quality verified, content accurate'
  },
  {
    status: 'published',
    changedAt: '2024-01-03T08:00:00Z',
    changedBy: ObjectId('publisher456'),
    reason: 'Published as part of climate finance collection'
  }
]
```

---

## Best Practices

### 1. Always Provide Reasons
```typescript
// Good
lifecycleService.prepareStatusUpdate(
  current,
  next,
  userId,
  'Content meets quality standards and is relevant to current priorities'
);

// Avoid
lifecycleService.prepareStatusUpdate(current, next, userId);
```

### 2. Check Validity Before Transition
```typescript
const nextStatuses = lifecycleService.getValidNextStatuses(currentStatus);
// Show only valid options in UI

if (!lifecycleService.isValidTransition(current, next)) {
  throw new Error(`Cannot transition from ${current} to ${next}`);
}
```

### 3. Archive Instead of Delete
```typescript
// Never permanently delete published content
// Archive with reason and link to replacement

await archiveResource(oldResourceId, {
  reason: 'Updated guidelines published',
  supersededBy: newResourceId
});
```

### 4. Query by Status
```typescript
// Public API - only published
const publicResources = await db.collection('resources').find({
  status: ContentStatus.PUBLISHED
});

// Admin panel - show pending review
const pendingReview = await db.collection('resources').find({
  status: ContentStatus.PENDING_REVIEW
}).sort({ createdAt: 1 });

// Editorial queue - approved awaiting publish
const readyToPublish = await db.collection('resources').find({
  status: ContentStatus.APPROVED
}).sort({ createdAt: 1 });
```

### 5. Track Metrics
```typescript
// Editorial performance
const avgReviewTime = db.collection('resources').aggregate([
  {
    $match: { status: 'published' }
  },
  {
    $project: {
      reviewTime: {
        $subtract: ['$publishedAt', '$createdAt']
      }
    }
  },
  {
    $group: {
      _id: null,
      avgMs: { $avg: '$reviewTime' }
    }
  }
]);

// Content freshness
const staleContent = await db.collection('resources').find({
  status: ContentStatus.PUBLISHED,
  publishedAt: { $lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
});
```

---

## API Examples

### Transition Resource Status
```typescript
POST /api/admin/resources/:id/status

{
  "status": "published",
  "reason": "Content approved for publication"
}

// Response
{
  "success": true,
  "resource": {
    "_id": "...",
    "status": "published",
    "publishedAt": "2024-01-03T08:00:00Z",
    "statusHistory": [...]
  }
}
```

### Get Editorial Queue
```typescript
GET /api/admin/resources/queue?status=pending_review

// Response
{
  "resources": [
    {
      "_id": "...",
      "title": "Climate Risk Framework",
      "status": "pending_review",
      "createdAt": "2024-01-01T10:00:00Z",
      "statusHistory": [...]
    }
  ],
  "total": 15
}
```

### Archive Resource
```typescript
POST /api/admin/resources/:id/archive

{
  "reason": "Superseded by updated guidelines",
  "supersededBy": "new_resource_id"
}

// Response
{
  "success": true,
  "resource": {
    "status": "archived",
    "archivedAt": "2024-06-01T10:00:00Z",
    "archivedReason": "Superseded by updated guidelines",
    "supersededBy": "new_resource_id"
  }
}
```

---

## Common Queries

```typescript
// Recently published
db.collection('resources').find({
  status: 'published'
}).sort({ publishedAt: -1 }).limit(10);

// Needs review
db.collection('resources').find({
  status: 'pending_review'
}).sort({ createdAt: 1 });

// Ready to publish
db.collection('resources').find({
  status: 'approved'
});

// Archived in last 30 days
db.collection('resources').find({
  status: 'archived',
  archivedAt: {
    $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  }
});

// Resources by specific editor
db.collection('resources').find({
  'statusHistory.changedBy': editorId
});
```

---

Generated: 2025-11-29
