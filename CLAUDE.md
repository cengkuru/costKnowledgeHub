## 🚨 CRITICAL PATH INFORMATION - UNICODE TRAP PREVENTION

**CRITICAL RULE**: The project path contains a Unicode curly apostrophe character U+2019 (') in "cengkuru's MacBook Pro". This creates phantom folders if not handled correctly.


### ❌ NEVER DO THESE (CREATES PHANTOM FOLDERS):
1. **NEVER** use absolute paths with `/Users/cengkurumichael/Documents/Documents - cengkuru's MacBook Pro/Projects/knowledgeHub/`
2. **NEVER** copy/paste the project path from system output
3. **NEVER** assume the apostrophe is ASCII (') - it's Unicode (')
4. **NEVER** use the Write tool with absolute paths containing the Unicode apostrophe

### ✅ MANDATORY SAFE PRACTICES:
1. **ALWAYS** use relative paths: `src/app/component.ts` NOT absolute paths
2. **ALWAYS** use the current working directory (pwd shows: `/Users/cengkurumichael/Documents/Documents - cengkuru's MacBook Pro/Projects/kadppa`)
3. **ALWAYS** verify file locations with `ls` before creating files
4. **ALWAYS** use Bash commands with relative paths: `cat src/file.ts`
5. **ALWAYS** test file existence with `ls src/app/` before creating components

### 🔍 VERIFICATION PROTOCOL:
Before creating ANY file, run:
```bash
# 1. Verify current location
pwd

# 2. Check if directory exists
ls -la src/app/target-directory/

# 3. Create files with relative paths only
# GOOD: src/app/public/reports/reports.component.ts
# BAD:  /Users/cengkurumichael/Documents/Documents - cengkuru's MacBook Pro/Projects/kadppa/src/app/...
```

### 🚨 PHANTOM FOLDER DETECTION:
If you create files and they don't appear in the real project:
1. You've fallen into the Unicode trap
2. Check if files exist with: `find . -name "filename" -type f`
3. Delete phantom folders immediately
4. Recreate files using relative paths only

**REMEMBER**: When in doubt, use relative paths. NEVER trust absolute paths with Unicode characters.

## File System Permissions
This project is configured with full read/write permissions across the entire directory structure.

### Permission Settings
- **Directories**: 755 (rwxr-xr-x) - owner has read, write, execute
- **Files**: 644 (rw-r--r--) - owner has read, write

### Auto-Permission Commands
```bash
# Set permissions recursively on project start
find . -type d -exec chmod 755 {} +
find . -type f -exec chmod 644 {} +
```

### Validated Operations
- File creation/deletion ✓
- Directory navigation ✓ 
- Read/write operations ✓
- Recursive permissions ✓

### Test Commands
```bash
# Test write permissions
echo "test" > test-file.txt && rm test-file.txt

# Verify permissions
ls -la | head -10
```


## 🛑 CRITICAL: NEVER USE APP ENGINE

**ABSOLUTELY NEVER enable or use Google App Engine in this project. It will automatically spin up services that cost hundreds or thousands of dollars without clear warning.**

### ❌ What NOT to do:
1. **DO NOT** run `gcloud app create` or enable App Engine via the Google Cloud Console
2. **DO NOT** enable App Engine Flexible or Standard environment for any service
3. **DO NOT** use Firebase Hosting rewrites that default to App Engine
4. **DO NOT** use Cloud Scheduler targets that invoke App Engine endpoints
5. **DO NOT** enable the App Engine API (`appengine.googleapis.com`)

### ⚠️ Why App Engine is Dangerous:
- **Auto-provisioning**: Enabling App Engine automatically creates default services that run 24/7
- **Hidden costs**: Services continue running and billing even if you don't deploy anything
- **Elevated permissions**: App Engine default service account gets elevated permissions automatically
- **Traffic routing**: Firebase Hosting, Cloud Tasks, or Cloud Scheduler may route through App Engine
- **No clear warnings**: Google doesn't adequately warn about automatic resource creation

### ✅ Approved Architecture (Cost-Optimized)

| Feature | ✅ Use This Instead | Notes |
|---------|-------------------|-------|
| Scheduled tasks | Cloud Scheduler → HTTP → Cloud Functions | No App Engine needed |
| Background processing | Cloud Tasks → Cloud Functions or Cloud Run | Define target as function URL, not App Engine |
| Hosting | Firebase Hosting (with only Cloud Functions) | Ensure rewrites point to Cloud Functions, not App Engine |
| APIs or Webhooks | Cloud Functions / Cloud Run | Functions scale to zero; App Engine does not |
| Logs & Monitoring | Use filters + retention policies | Avoid log-based billing explosions |

### 🔒 Permanent Safeguards Applied:
- **IAM Restrictions**: Organization policies block App Engine deployment
- **API Disabled**: `appengine.googleapis.com` API disabled (verified 2025-01-08)
- **Billing Alerts**: $100 warning cap with automatic project suspension
- **Deployment Templates**: All CI/CD scripts use Cloud Function-only deployment
- **Code Reviews**: Any mention of App Engine in PRs must be rejected
- **Safety Script**: `check-app-engine-status.sh` for regular verification

### 💸 Previous Billing Incident (Never Again):
- App Engine was accidentally enabled during Cloud Scheduler setup
- Default services deployed automatically without explicit deployment
- Services ran 24/7 consuming compute, logging, and network resources
- Firebase Hosting traffic was inadvertently routed through App Engine
- Total cost: $XXX+ in unexpected charges within days

**Remember: If you need scheduled tasks, background processing, or hosting, ALWAYS use Cloud Functions or Cloud Run. They scale to zero and have predictable costs.**

### 🛡️ Quick Safety Check
Run this command anytime to verify App Engine safety:
```bash
./check-app-engine-status.sh
```

### UI/UX Design Principles (Jony Ive-Inspired)
1. **Simplicity First**: Remove unnecessary elements, focus on essential functionality
2. **Generous White Space**: Use ample padding and margins for breathing room
3. **Subtle Shadows**: Use soft, barely-visible shadows (e.g., `shadow-sm` in Tailwind)
4. **Clean Typography**: Stick to system fonts or clean sans-serif fonts
5. **Minimal Borders**: Use light borders sparingly, prefer white space for separation
6. **Smooth Transitions**: Add subtle animations (200-300ms) for interactions
7. **Consistent Radius**: Use small, consistent border radius (4-8px)
8. **Monochromatic Focus**: Let content shine, use color sparingly for emphasis

## 🎨 CoST Brand Theme & Tailwind Configuration

### CoST Color Palette
The project uses a carefully crafted color palette that reflects the CoST brand identity:

```scss
// Primary brand colors
--cost-teal: #355E69      // Primary brand teal - headers, navigation, primary CTAs
--cost-cyan: #0AAEA0      // Secondary accent - highlights, secondary buttons
--cost-amber: #F0AD4E     // Call-to-action - warnings, important buttons, badges
--cost-charcoal: #1F1F1F  // Text - primary text, dark content
--cost-gray: #F5F6F7      // Background - light surfaces, cards, sections
--cost-white: #FFFFFF     // Base - primary background, card backgrounds
```

### Tailwind CSS Classes
Use these pre-configured Tailwind classes for consistent theming:

#### Color Classes
```html
<!-- Text colors -->
<p class="text-cost-teal">Primary brand text</p>
<p class="text-cost-cyan">Secondary accent text</p>
<p class="text-cost-amber">Highlight text</p>
<p class="text-cost-charcoal">Body text</p>

<!-- Background colors -->
<div class="bg-cost-teal">Primary background</div>
<div class="bg-cost-cyan">Secondary background</div>
<div class="bg-cost-amber">Accent background</div>
<div class="bg-cost-gray">Light surface</div>
<div class="bg-cost-white">White background</div>
```

#### Component Classes
```html
<!-- Buttons -->
<button class="btn-primary">Primary Action</button>
<button class="btn-secondary">Secondary Action</button>
<button class="btn-accent">Accent Action</button>

<!-- Cards -->
<div class="card">
  <h3>Card Title</h3>
  <p>Card content with consistent styling</p>
</div>

<!-- Input fields -->
<input class="input-field" type="text" placeholder="Styled input">
```

#### Typography
- **Font Family**: Inter (loaded from Google Fonts)
- **Fallbacks**: ui-sans-serif, system-ui, sans-serif
- **Classes**: Use standard Tailwind typography classes (`text-lg`, `font-medium`, etc.)

### Design Guidelines

#### When to Use Each Color:
1. **cost-teal** (#355E69): Primary navigation, main headings, primary buttons
2. **cost-cyan** (#0AAEA0): Secondary buttons, links, active states, highlights
3. **cost-amber** (#F0AD4E): Call-to-action buttons, warnings, badges, notifications
4. **cost-charcoal** (#1F1F1F): Body text, descriptions, secondary headings
5. **cost-gray** (#F5F6F7): Page backgrounds, card backgrounds, subtle dividers
6. **cost-white** (#FFFFFF): Main content areas, overlays, dropdowns

#### Component Examples:
```html
<!-- Header with brand colors -->
<header class="bg-cost-teal text-white">
  <nav class="container mx-auto px-4 py-3">
    <h1 class="text-xl font-semibold">Knowledge Hub</h1>
  </nav>
</header>

<!-- Card component -->
<div class="card max-w-md">
  <h3 class="text-cost-teal text-lg font-medium mb-2">Feature Title</h3>
  <p class="text-cost-charcoal mb-4">Feature description using proper color hierarchy.</p>
  <button class="btn-primary">Learn More</button>
</div>

<!-- Form component -->
<form class="space-y-4">
  <div>
    <label class="block text-cost-charcoal font-medium mb-1">Email</label>
    <input class="input-field" type="email" placeholder="Enter your email">
  </div>
  <button class="btn-accent w-full">Subscribe</button>
</form>
```

### Customization Rules:
1. **NEVER modify core CoST colors** - they are brand-mandated
2. **ALWAYS use the predefined component classes** before creating custom ones
3. **MAINTAIN contrast ratios** - ensure text is readable on all backgrounds
4. **USE Inter font family** consistently across the application
5. **FOLLOW the 200-300ms transition** standard for all interactions

## 📚 CoST Knowledge Hub Architecture

### Component Structure
```
src/app/
├── core/
│   ├── services/
│   │   ├── resource.service.ts       # Firestore CRUD operations
│   │   ├── i18n.service.ts          # Internationalization wrapper
│   │   └── search.service.ts        # Search functionality
│   └── models/
│       ├── resource.model.ts        # Resource data interfaces
│       └── filter.model.ts          # Filter/search interfaces
├── shared/
│   └── components/
│       ├── search-bar/              # Reusable search component
│       ├── language-toggle/         # Language switcher
│       └── resource-card/           # Resource display card
├── features/
│   ├── home/                        # Homepage with hero + search
│   ├── resources/                   # Resource list + filters
│   └── detail/                      # Resource detail page
├── assets/
│   └── i18n/                        # Translation files
│       ├── en.json                  # English translations
│       ├── es.json                  # Spanish translations
│       └── pt.json                  # Portuguese translations
└── environments/                    # Firebase config
```

### Data Schema (Firestore Collection: `resources`)
```typescript
interface Resource {
  id: string;                        // Auto-generated document ID
  title: {en: string, es: string, pt: string};
  description: {en: string, es: string, pt: string};
  type: 'guidance' | 'caseStudy' | 'report' | 'dataset' | 'tool' | 'infographic' | 'other';
  tags: string[];                    // Free-form topic tags
  country: string;                   // ISO 3166 alpha-2 or 'global'
  language: string;                  // Primary language (en/es/pt)
  datePublished: Timestamp;
  fileLinks?: {en?: string, es?: string, pt?: string}; // Storage URLs
  externalLink?: string;             // External URL if not hosted
  thumbnailUrl?: string;             // Preview image URL
  featured: boolean;                 // Show in featured section
}
```

### Firebase Configuration
- **Firestore**: Document database for resources
- **Storage**: File hosting for PDFs, images
- **Security Rules**: Read-only public access, admin-only writes
- **Composite Indexes**: Optimized for filtering by type + tags + language

### Multi-language Strategy
- **One document per language variant** (simpler security rules)
- **Cross-references** stored in `relatedLangIds` array
- **localStorage** persistence for user language preference
- **URL routing** supports language parameter: `/en/resources`, `/es/resources`

## 🔄 Git Workflow & GitHub Integration

### 🚨 MANDATORY GITHUB PUSH RULE
**⚠️ CRITICAL REQUIREMENT**: After completing ANY successful task or feature, you MUST:

1. **ALWAYS commit changes to git**
2. **ALWAYS push to GitHub immediately**
3. **NEVER leave completed work uncommitted**

### Git Workflow Steps:
```bash
# 1. Add all changes
git add .

# 2. Commit with descriptive message
git commit -m "feat(feature): description of completed work"

# 3. Push to GitHub immediately
git push origin main

# 4. Verify push succeeded
git status
```

### Commit Message Guidelines
**IMPORTANT**: Never add the following attribution block to commit messages:
```
🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**DO USE**: Clean, professional commit messages following conventional commits:
```bash
feat(tailwind): add CoST brand theme and Tailwind CSS setup
fix(auth): resolve login redirect issue
docs(readme): update installation instructions
style(components): improve button hover animations
```

### Required After Every Success:
- ✅ Feature completed successfully
- ✅ Tests passing
- ✅ Documentation updated
- ✅ CHANGELOG.md updated
- ✅ **COMMIT AND PUSH TO GITHUB** ← MANDATORY

Keep commit messages clean and professional without any AI attribution.

## 🚨 MANDATORY CHANGELOG UPDATES

**⚠️ CRITICAL RULE - NEVER FORGET**: 
Every single change to the codebase MUST be documented in CHANGELOG.md BEFORE making any other file changes.

### Required for ALL Changes:
- ✅ Code modifications
- ✅ Configuration updates  
- ✅ New features
- ✅ Bug fixes
- ✅ Documentation changes
- ✅ Dependency updates
- ✅ Any file modifications

### CHANGELOG Format Requirements:
- Add entries with UTC timestamp: `YYYY-MM-DD HH:MM:SS UTC`
- Use categories: Added, Changed, Deprecated, Removed, Fixed, Security
- Include specific details about what changed and why
- Reference file paths and line numbers when applicable
- Keep entries in reverse chronological order (newest first)
- **UPDATE CHANGELOG.md FIRST** before any other changes



### Automated Changelog Management
Use the built-in automation scripts for better changelog management:
```bash
# Add new changelog entry
npm run changelog:add feat auth "Add password reset functionality"

# Validate changelog format
npm run changelog:validate

# View changelog statistics
npm run changelog:stats

# Generate release notes
npm run changelog:release

# Backup changelog
npm run changelog:backup
```

## Essential Commands

### Development
```bash
# Install dependencies
npm install

# Start development server (http://localhost:4200)
npm start

# Start full development environment (Angular + Firebase)
npm run dev:full

# Build for production
npm run build

# Run unit tests
npm test

# Lint TypeScript files
npm run lint

# Run e2e tests
npm run e2e
```

### Automation & Documentation
```bash
# Generate comprehensive documentation
npm run docs:generate

# Add changelog entry
npm run changelog:add <type> <scope> "description"

# Validate changelog format
npm run changelog:validate

# Verify deployment readiness
npm run verify:deployment

# Check App Engine safety
npm run verify:app-engine

# Health check
npm run health:check
```

### Deployment
```bash
# Pre-deployment checks (automatic)
npm run predeploy

# Deploy Firebase Functions only
npm run deploy:functions

# Deploy Firebase Hosting only
npm run deploy:hosting

# Full deployment
npm run deploy:full
```

### Maintenance
```bash
# Clean caches and temporary files
npm run maintenance:cleanup

# Fix file permissions
npm run maintenance:permissions

# View changelog statistics
npm run changelog:stats

# Backup changelog
npm run changelog:backup
```

### Firebase Functions
```bash
cd functions
npm install

# Start Firebase emulator
npm run serve

# Deploy functions
npm run deploy

# View function logs
npm run logs
```

## 🎨 Project Configuration

### Styling
- **Primary**: Use Tailwind CSS utility classes with CoST theme
- **Component Classes**: Use predefined `.btn-primary`, `.card`, `.input-field` classes
- **Custom Styles**: Component-specific SCSS files for complex styling
- **Global Styles**: Located in `src/styles.scss` with Tailwind directives
- **Color System**: Use `bg-cost-*`, `text-cost-*` classes for brand consistency
- **Typography**: Inter font family with Tailwind typography utilities
  
### Internationalization
- Translation keys in `assets/i18n/en.json`, `assets/i18n/es.json`, and `assets/i18n/pt.json`
- Use TranslateService in components
- Keep translations synchronized between files

## 🌐 MANDATORY TRANSLATION REQUIREMENTS

**⚠️ CRITICAL RULE**: ALL user-facing text MUST be translatable. NEVER use hardcoded strings in templates.

### ✅ REQUIRED FOR ALL NEW COMPONENTS:

#### 1. **Translation Keys in i18n Files**
Every new component MUST add translation keys to ALL three i18n files:
```bash
# Required files to update
src/assets/i18n/en.json    # English (primary)
src/assets/i18n/es.json    # Spanish
src/assets/i18n/pt.json    # Portuguese
```

#### 2. **Component Translation Integration**
```typescript
// MANDATORY: Import and inject i18n service
import { I18nService } from '../../core/services/i18n.service';

constructor(public i18nService: I18nService) {}

// Use in templates
{{ i18nService.t('component.textKey') }}
```

#### 3. **Translation Key Naming Convention**
```json
{
  "componentName": {
    "title": "Component Title",
    "subtitle": "Component subtitle",
    "buttons": {
      "save": "Save",
      "cancel": "Cancel"
    },
    "labels": {
      "email": "Email Address",
      "password": "Password"
    },
    "messages": {
      "success": "Operation successful",
      "error": "Error occurred"
    }
  }
}
```

#### 4. **FORBIDDEN Practices**
```html
<!-- ❌ NEVER DO THIS -->
<h1>Knowledge Resources</h1>
<button>Login</button>
<p>Loading...</p>

<!-- ✅ ALWAYS DO THIS -->
<h1>{{ i18nService.t('resourceList.title') }}</h1>
<button>{{ i18nService.t('header.login') }}</button>
<p>{{ i18nService.t('common.loading') }}</p>
```

### 📋 NEW COMPONENT TRANSLATION CHECKLIST

Before creating ANY new component, verify:

- [ ] ✅ **Translation keys added to en.json**
- [ ] ✅ **Translation keys added to es.json** 
- [ ] ✅ **Translation keys added to pt.json**
- [ ] ✅ **I18nService imported and injected**
- [ ] ✅ **All text uses i18nService.t() calls**
- [ ] ✅ **NO hardcoded strings in template**
- [ ] ✅ **Error messages translated**
- [ ] ✅ **Button text translated**
- [ ] ✅ **Form labels translated**
- [ ] ✅ **Placeholders translated**

### 🔄 TRANSLATION MAINTENANCE

#### When Adding New Text:
1. **Add to English first** (en.json)
2. **Translate to Spanish** (es.json) 
3. **Translate to Portuguese** (pt.json)
4. **Update component** to use i18n service
5. **Test all languages** work correctly

#### Translation Quality Standards:
- **Contextual Accuracy**: Translations fit the infrastructure/CoST domain
- **Professional Tone**: Maintain formal, professional language
- **Consistency**: Use same terms across the application
- **Cultural Adaptation**: Consider regional differences

### 🚨 ENFORCEMENT RULES

#### Build-Time Checks:
- **Linting Rule**: Components with hardcoded strings should fail lint
- **Code Review**: All PRs must verify translation completeness
- **Testing**: Language switching must be tested

#### Development Workflow:
```bash
# 1. Create component with translations
ng generate component features/my-component

# 2. Add translation keys to ALL i18n files
# 3. Use i18nService in component
# 4. Test language switching

npm run build  # Must pass with no hardcoded strings
```

### 📚 EXAMPLES

#### Component Structure:
```typescript
// my-component.component.ts
export class MyComponent {
  constructor(public i18nService: I18nService) {}
}
```

```html
<!-- my-component.component.html -->
<div class="component">
  <h2>{{ i18nService.t('myComponent.title') }}</h2>
  <p>{{ i18nService.t('myComponent.description') }}</p>
  <button>{{ i18nService.t('myComponent.actionButton') }}</button>
</div>
```

#### Translation Files:
```json
// en.json
{
  "myComponent": {
    "title": "My Component Title",
    "description": "Component description text",
    "actionButton": "Take Action"
  }
}

// es.json  
{
  "myComponent": {
    "title": "Título de Mi Componente",
    "description": "Texto de descripción del componente", 
    "actionButton": "Tomar Acción"
  }
}

// pt.json
{
  "myComponent": {
    "title": "Título do Meu Componente",
    "description": "Texto de descrição do componente",
    "actionButton": "Tomar Ação"
  }
}
```

**REMEMBER**: No exceptions - ALL user-facing text must support translation from day one!


### Update Process:
1. Make your code changes
2. **IMMEDIATELY** update CHANGELOG.md 
3. Commit both the code changes and CHANGELOG.md update together
4. Never commit code without updating the changelog
5. **PUSH TO GITHUB** - This is mandatory for all completed work

## 📋 Final Checklist

Before considering any task complete, verify:

- [ ] ✅ **Code changes implemented successfully**
- [ ] ✅ **CHANGELOG.md updated with timestamp**
- [ ] ✅ **Documentation updated if needed**
- [ ] ✅ **No linting errors**
- [ ] ✅ **Application builds successfully**
- [ ] ✅ **Changes committed to git**
- [ ] ✅ **PUSHED TO GITHUB** ← **MANDATORY**

---

**Remember**: Every successful completion MUST end with a git commit and push to GitHub. No exceptions!
