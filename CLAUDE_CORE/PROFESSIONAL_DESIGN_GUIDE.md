# CoST Knowledge Hub Professional Design Guide

> "This is a serious infrastructure transparency platform, not a consumer app."

## Design Philosophy

The CoST Knowledge Hub is a professional platform serving government officials, infrastructure professionals, and transparency advocates. Our design approach reflects the gravity and importance of our mission.

## Core Principles

### 1. **Professional Over Playful**
- No bouncing animations or floating elements
- Subtle hover states (1-2px movement maximum)
- Clean, functional transitions (200-250ms)
- No decorative gradients or effects

### 2. **Clarity Over Cleverness**
- Clear visual hierarchy
- High contrast for readability
- Simple, functional shadows (1-3px depth)
- Solid backgrounds, no glass morphism

### 3. **Function Over Form**
- Every design element serves a purpose
- No purely decorative components
- Interactions provide clear feedback
- Performance over visual effects

## Implementation Standards

### Colors
```scss
// Maintain CoST brand colors - they're already professional
--cost-teal: #355E69;      // Primary - serious, trustworthy
--cost-cyan: #0AAEA0;      // Secondary - modern, clean
--cost-amber: #F0AD4E;     // Accent - calls to action only
--cost-charcoal: #1F1F1F;  // Text - high readability
--cost-gray: #F5F6F7;      // Backgrounds - subtle
--cost-white: #FFFFFF;     // Base - clean, professional
```

### Typography
- **Font**: Inter (professional, highly readable)
- **Weights**: 400 (regular), 500 (medium), 600 (semibold)
- **Sizes**: Limited to 3-4 sizes for clear hierarchy
- **Line Height**: 1.6 for optimal readability

### Spacing
- Consistent 8px grid system
- Generous white space for breathing room
- Clear content grouping through proximity
- Professional padding: 16px, 24px, 32px

### Components

#### Buttons
```scss
.btn-primary {
  // Simple color transition, no transforms
  transition: background-color 200ms ease;
  
  &:hover {
    // Subtle 1px lift, no scaling
    transform: translateY(-1px);
  }
}
```

#### Cards
```scss
.card {
  // Clean borders and subtle shadows
  border: 1px solid #e5e5e5;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  
  &:hover {
    // Shadow change only, no movement
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
}
```

#### Forms
```scss
.input-field {
  // Solid backgrounds, clear borders
  background: white;
  border: 1px solid #d1d5db;
  
  &:focus {
    // Color change, no blur effects
    border-color: var(--cost-cyan);
  }
}
```

### Animations

#### Approved Animations
- **Fade**: opacity transitions (200ms)
- **Slide**: translateY for dropdowns (250ms)
- **Color**: background/border changes (200ms)

#### Forbidden Animations
- ❌ Bounce effects
- ❌ Floating/levitation
- ❌ Scale transforms on hover
- ❌ Rotation effects
- ❌ Gradient animations
- ❌ Parallax scrolling

### Interaction Feedback

#### Hover States
- Subtle color darkening (10-20%)
- 1px translateY maximum
- Shadow depth increase (1-2px)
- Border color emphasis

#### Active States
- Return to original position
- Slight color darkening
- No "pressed" effects

#### Focus States
- Clear 2px outline
- High contrast colors
- Consistent across all elements

## Accessibility Standards

### Contrast Ratios
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum
- Focus indicators: 3:1 minimum

### Motion Preferences
```scss
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

### Keyboard Navigation
- All interactive elements keyboard accessible
- Clear focus indicators
- Logical tab order
- Skip links for main content

## Component Examples

### Professional Card
```html
<div class="card">
  <h3 class="text-lg font-semibold text-cost-charcoal">Resource Title</h3>
  <p class="text-cost-charcoal/80 mt-2">Clear, professional description.</p>
  <button class="btn-primary mt-4">View Details</button>
</div>
```

### Data Table
```html
<table class="w-full border border-gray-200">
  <thead class="bg-gray-50">
    <tr>
      <th class="px-4 py-3 text-left font-semibold">Column</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-t hover:bg-gray-50">
      <td class="px-4 py-3">Data</td>
    </tr>
  </tbody>
</table>
```

### Form Elements
```html
<div class="mb-4">
  <label class="block text-sm font-medium text-cost-charcoal mb-1">
    Field Label
  </label>
  <input type="text" class="input-field" placeholder="Professional placeholder">
  <p class="text-sm text-gray-600 mt-1">Helper text with clear guidance.</p>
</div>
```

## Do's and Don'ts

### Do's ✅
- Use subtle shadows for depth
- Maintain consistent spacing
- Provide clear visual feedback
- Use color purposefully
- Keep animations minimal
- Ensure high readability

### Don'ts ❌
- Add decorative animations
- Use gradient text effects
- Implement parallax scrolling
- Add unnecessary visual effects
- Use playful micro-interactions
- Sacrifice clarity for aesthetics

## Testing Checklist

Before implementing any design:
- [ ] Is it professional and serious?
- [ ] Does it enhance functionality?
- [ ] Is it accessible?
- [ ] Does it follow the 250ms animation rule?
- [ ] Are transforms limited to 1-2px?
- [ ] Is the contrast ratio sufficient?
- [ ] Does it work without animations?

## Conclusion

The CoST Knowledge Hub deserves a design that matches its importance. Every pixel should convey professionalism, trustworthiness, and clarity. When in doubt, choose the simpler, more functional option.

Remember: **This platform handles critical infrastructure transparency data that affects millions of people. Our design must reflect that responsibility.**