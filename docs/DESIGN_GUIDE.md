# CoST Voting App - UI Design Guide
> "Simplicity is not the absence of clutter, that's a consequence of simplicity. Simplicity is somehow essentially describing the purpose and place of an object and product." - Jony Ive

## Core Philosophy
Our design language is built on **clarity**, **deference**, and **depth**. The UI should recede, allowing the content (the election, the candidates, the act of voting) to be the absolute focus.

### 1. Typography as Interface
We rely heavily on typography to create hierarchy and structure, minimizing the need for heavy borders or containers.
- **Font Family**: `Inter`, system-ui, sans-serif.
- **Weights**:
    - `Regular (400)`: Body text.
    - `Medium (500)`: Interactive elements, emphasis.
    - `Semibold (600)`: Headings.
- **Scale**: Large, readable type. We default to slightly larger sizes for accessibility and impact.

### 2. Color System: "Essential & Intentional"
Colors are used sparingly and with great intent. We avoid "decorative" color.
- **Canvas**: `cost-offwhite` (#F5F5F5) for the page, `cost-white` (#FFFFFF) for elevated surfaces.
- **Ink**: `cost-dark` (#2C2C2C) for primary text, `cost-medium` (#6B6B6B) for secondary.
- **Action**: `cost-blue` (#5B9FB5) is the *only* primary action color.
- **Destructive**: `cost-red` (#C41E3A) is reserved strictly for dangerous actions.
- **Success/Highlight**: `cost-yellow` (#F4C542) is used for success states and highlighting active elements.

### 3. Spacing & Layout
- **Whitespace**: Generous. It is an active design element, not just empty space.
- **Grid**: Fluid, responsive, but centered.
- **Radius**: Soft, organic corners (`rounded-2xl` or `rounded-3xl`) to feel friendly and human.

### 4. Motion
- **Physics**: Transitions should feel natural, not mechanical.
- **Duration**: `duration-300` or `duration-500` with `ease-out`.

## Component Guidelines

### Buttons
- **Primary**: `bg-cost-blue-500 text-white rounded-full`. No shadows unless hovering.
- **Secondary**: `bg-cost-light/20 text-cost-dark rounded-full`.
- **Ghost**: `text-cost-blue-500 hover:bg-cost-blue-50 rounded-full`.

### Cards
- **Surface**: `bg-white`.
- **Elevation**: Flat by default, soft `shadow-xl` on hover/lift.
- **Borders**: Minimal `border border-cost-light/50`.

### Inputs
- **Style**: Minimalist. `bg-transparent border-b-2 border-cost-light focus:border-cost-blue-500`.
- **Labels**: Small, uppercase, tracking-wide `text-cost-medium`.

## Prohibited
- ❌ Drop shadows that are dark or harsh.
- ❌ Gradients (unless subtle and purposeful).
- ❌ 100% Black (#000000). Always use `cost-dark`.
- ❌ Boxy, sharp corners (unless for specific data tables).
