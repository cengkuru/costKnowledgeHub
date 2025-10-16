# CoST Knowledge Hub - Design System
## Inspired by Jony Ive's Design Philosophy

*"Simplicity is not the absence of clutter. That's a consequence of simplicity. Simplicity is somehow essentially describing the purpose and place of an object and product."* — Jony Ive

---

## Design Principles

### 1. **Clarity Over Decoration**
- Every element has a purpose
- Visual hierarchy guides the eye naturally
- Information density balanced with breathing room

### 2. **Material Honesty**
- Visual weight matches functional importance
- Shadows and depth suggest interactivity
- Transitions communicate state changes

### 3. **Attention to Detail**
- Micro-interactions delight without distracting
- Typography scales harmoniously
- Spacing follows mathematical precision

### 4. **Progressive Disclosure**
- Show what's needed, hide complexity
- Actions reveal themselves on interaction
- Citations appear inline, contextually

---

## Visual Language

### Color Palette

**Primary (CoST Red)**
- `#DC143C` - Brand color, action items
- Used sparingly for maximum impact
- Signals interactive elements and importance

**Neutral Grays**
- `50` - Page background (subtle warmth)
- `100-200` - Borders and dividers
- `700` - Body text
- `900` - Headlines

**Accent**
- `cost-info` - Citation pills, trust indicators
- Soft, non-competing with primary

### Brand Wordmark

- Official CoST Infrastructure Transparency Initiative wordmark: `assets/cost-logo.png`
- Default render height: `40px` (auto width) with `decoding="async"` and `draggable="false"`
- Pair with uppercase descriptor “Infrastructure Transparency Initiative” on ≥640px viewports
- On smaller viewports rely on the wordmark alone for clear recognition

### Typography

**Font Stack**
```css
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue'
```

**Scale**
- Headlines: 24px, font-weight: 300 (light)
- Body: 15px, line-height: 1.7
- Metadata: 13px, line-height: 1.5
- Labels: 12px, font-weight: 500 (medium)

**Philosophy**: Light weights for large text, medium weights for small text

### Spacing System

Based on 4px grid:
- Micro: 2-4px (icon gaps)
- Small: 8-12px (element padding)
- Medium: 16-24px (component spacing)
- Large: 32-48px (section spacing)

### Radius & Depth

**Border Radius**
- Buttons: 8px (comfortable)
- Cards: 12-16px (friendly)
- Answer block: 16px (elevated)
- Pills/Badges: 6-8px (subtle)

**Shadows**
- Resting: `0 1px 3px rgba(0,0,0,0.05)`
- Hover: `0 4px 12px rgba(0,0,0,0.08)`
- Elevated: `0 8px 24px rgba(0,0,0,0.12)`

---

## Component Design

### Research Hero & Journey Timeline

**Visual Treatment**
- Oversized 36px radius card with whisper gradient wash
- Center-weighted typography and generous negative space
- Feature chips highlighting speed, AI synthesis, and provenance
- Four-step journey tiles with muted glass treatment

**Interaction Design**
- Status dot quietly indicates `active`, `complete`, or `upcoming`
- Highlight chips stay concise, reinforcing capability without copy blocks
- Journey tiles respond to search progress and hover without distracting

**Why This Works**
- Establishes confidence with minimal copy and generous calm
- Signals capability (speed, AI, provenance) without overwhelming the user
- Suggests the full workflow while letting the search bar remain the hero

### Answer Block (Primary Focus)

**Visual Treatment**
- Floating card with balanced border + 32px radius
- Vertical numeric timeline (01, 02…) guiding reading order
- Citations rendered as soft pills with directional hover affordances

**Interaction Design**
- Copy action uses restrained pill button (icon + label)
- Citation hover reveals launch arrow and recolors iconography
- Footer stamp affirms “source-integrity verified”

**Why This Works**
- Converts dense AI output into digestible, sequential points
- Keeps citations available without interrupting reading flow
- Reinforces trust through consistent micro-interactions

### Results List (Secondary Content)

**Visual Treatment**
- Airy evidence cards with 24px radii + soft hover shadow
- Result number chips act as anchors for quick reference
- Metadata presented as compact capsules (type, country, year)

**Interaction Design**
- “Quick preview” toggle reveals summaries on demand
- “Include” button morphs to “Included” with filled state + check icon
- Pagination controls live as lightweight pills above the list

**Why This Works**
- Keeps the list skimmable while hiding detail until requested
- Highlights inclusion state through color + iconography, never clutter
- Maintains rhythm with consistent vertical spacing and padding

### Advanced Filters Overlay (Contextual Refinement)

**Visual Treatment**
- Drawer presented in modal glass overlay, centred on screen
- Header badge reflects active filters; footer provides guidance
- 4px rhythm retained for toggles, selects, and microcopy

**Interaction Design**
- Locked until first query (clarity through restraint)
- Document type toggles + curated shortcuts for quick presets
- Year selector combines quick picks with precise entry
- Apply/Reset surfaces spinner + disabled states for explicit feedback

**Why This Works**
- Keeps advanced controls hidden until genuinely useful
- Honors progressive disclosure by avoiding always-on sidebars
- Provides deliberate, focused environment for refinement

### Research Companion (Selection & Export)

**Visual Treatment**
- Rounded card with gentle lift, echoing hero treatment
- Selection summary pillboard surfaces type/country balance
- Export module framed within white inset surface

**Interaction Design**
- Collapsed by default; auto-expands when selections or recs appear
- Export button reflects chosen format + loading animation
- Recommendations list behaves like mini command palette entries

**Why This Works**
- Purposeful simplicity: only appears when there’s something to do
- Guides user from curation → export without overwhelming detail
- Reinforces trust by surfacing gaps (e.g., missing complementary docs)

### Loading & Empty States

**Loading**
- Pulsing ring + spinner (dual feedback)
- Calm, centered composition
- Descriptive text below animation

**Empty State**
- Large, friendly search icon with glow
- Suggested queries as interactive pills
- Inviting, not intimidating

**Why This Works**
- Reduces perceived wait time
- Guides user toward action
- Never shows harsh "no results"

---

## Interaction Patterns

### Hover States
- Buttons: Border color change + background tint
- Links: Underline on hover (not always visible)
- Cards: Elevated shadow + border color shift
- Citations: Multi-element transition (icon, text, arrow)

### Active States
- Buttons: Filled background (primary color)
- Selected items: Left accent bar + filled button
- Checkmarks replace plus icons when added

### Focus States
- 2px ring in primary color
- 2px offset for breathing room
- Respects `:focus-visible` for keyboard users

---

## Accessibility

### Contrast Ratios
- Body text: 7:1 (AAA)
- Metadata: 4.5:1 (AA)
- Interactive elements: WCAG AAA compliant

### Keyboard Navigation
- Tab order follows visual hierarchy
- Focus states are clear and consistent
- Keyboard shortcuts indicated (⌘K)

### Screen Readers
- Semantic HTML throughout
- ARIA labels on icon-only buttons
- Skip links for main content

---

## Animation Philosophy

*"Animation is not about making things move, it's about making things feel alive."*

### Timing
- Fast: 150ms (micro-interactions)
- Standard: 200-300ms (state changes)
- Slow: 400ms+ (page transitions)

### Easing
- `ease-out` - Leaving screen (decelerating)
- `ease-in-out` - Staying on screen (smooth)
- Never linear (unnatural)

### What We Animate
✅ Opacity, transform, color
✅ Shadows (with GPU acceleration)
❌ Width/height (causes reflow)
❌ Complex properties (jank)

---

## Responsive Design

### Breakpoints
- Mobile: < 640px
- Tablet: 640-1024px
- Desktop: 1024px+

### Mobile Adaptations
- Single column layout
- Touch-friendly targets (44px min)
- Simplified navigation
- Stacked actions

### Desktop Enhancements
- Three-column layout
- Keyboard shortcuts visible
- Hover states more prominent
- Sidebar for basket/export

---

## Performance Considerations

### Visual Performance
- GPU-accelerated transitions
- Will-change hints for animations
- Lazy-load images below fold

### Perceived Performance
- Optimistic UI updates
- Skeleton screens (not spinners everywhere)
- Progressive enhancement

---

## Success Metrics

**Qualitative**
- Users describe UI as "clean", "fast", "clear"
- Zero confusion about citations
- Intuitive selection/export flow

**Quantitative**
- < 100ms UI response time
- Zero layout shifts (CLS)
- Accessible contrast ratios

---

## Implementation Notes

### Tailwind Classes Used
- Consistent spacing: `space-y-*`, `gap-*`
- Responsive design: `sm:`, `lg:` prefixes
- Transitions: `transition-all duration-*`
- Gradients: `bg-gradient-to-*`

### Custom Components
- `.card` - Base card styling
- `.btn-primary` - Primary action button
- `.badge` - Inline labels and pills
- `.input-field` - Form inputs

---

## Future Enhancements

1. **Dark Mode**
   - Invert neutral palette
   - Reduce primary color saturation
   - Increase contrast for readability

2. **Advanced Filters**
   - Slide-out panel (not drawer)
   - Visual filter pills
   - Clear all button

3. **Saved Searches**
   - Quick access dropdown
   - Keyboard shortcut to save
   - Sync across devices

4. **Export Customization**
   - Preview before export
   - Template selection
   - Drag-to-reorder citations

---

## Credits & Inspiration

**Influenced By**
- Apple's Human Interface Guidelines
- Material Design (motion principles)
- Linear (interaction patterns)
- Arc Browser (attention to detail)

**Core Philosophy**
> "The best design is invisible. The user shouldn't think about the interface - they should focus on their task."

---

**Last Updated**: October 2025
**Maintained By**: CoST Knowledge Hub Team
