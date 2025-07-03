# TypeScript Patterns & Solutions

> Common TypeScript issues and solutions for Angular/Firebase projects

## TypeScript Linting

```typescript
// ❌ Wrong
if (\!condition) { }  // Invalid character

// ✅ Correct
if (!condition) { }
```

## Import Conflicts

```typescript
// ❌ Wrong - Multiple imports
import { onRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';

// ✅ Correct - Combined
import { onRequest, HttpsError } from 'firebase-functions/v2/https';
```

## Observable Loading States

```typescript
// ❌ Wrong - Never completes for infinite streams
stream.pipe(
  finalize(() => this.loading = false)
)

// ✅ Correct - Handle in next/error
stream.subscribe({
  next: data => {
    this.loading = false;
    this.data = data;
  },
  error: () => this.loading = false
})
```

## Firestore Undefined Values

**CRITICAL**: Firestore rejects `undefined` values - they must be omitted or set to `null`.

```typescript
// ❌ Wrong - Causes "Unsupported field value: undefined" error
const data = {
  name: formValue.name,
  email: formValue.email || undefined,  // ← Firestore error!
  phone: formValue.phone || undefined   // ← Firestore error!
};

// ✅ Correct - Clean undefined values before save
const cleanData = (obj: any): any => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

const data = cleanData({
  name: formValue.name,
  email: formValue.email,
  phone: formValue.phone
});

// Alternative: Conditional field addition
const data: any = { name: formValue.name };
if (formValue.email) data.email = formValue.email;
if (formValue.phone) data.phone = formValue.phone;
```

## Universal Clean Helper

Reusable across projects:

```typescript
// utils/firestore.utils.ts
export function cleanFirestoreData<T>(data: T): Partial<T> {
  const cleaned: any = {};
  
  for (const [key, value] of Object.entries(data as any)) {
    // Skip undefined, null, empty strings, and empty arrays
    if (value !== undefined && 
        value !== null && 
        value !== '' && 
        !(Array.isArray(value) && value.length === 0)) {
      
      // Recursively clean nested objects
      if (typeof value === 'object' && !Array.isArray(value) && 
          !(value instanceof Date) && !value.seconds) {
        const nestedCleaned = cleanFirestoreData(value);
        if (Object.keys(nestedCleaned).length > 0) {
          cleaned[key] = nestedCleaned;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
}

// Usage:
const userData = cleanFirestoreData({
  name: 'John',
  email: undefined,    // Will be omitted
  profile: {
    age: 30,
    bio: ''            // Will be omitted
  }
});
// Result: { name: 'John', profile: { age: 30 } }
```
