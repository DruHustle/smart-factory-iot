# UI Styling Guide - Smart Factory IoT Dashboard

**Version:** 2.0.0
**Author:** Andrew Gotora
**Email:** andrewgotora@yahoo.com

## Overview

This document provides guidelines for maintaining consistent UI styling throughout the Smart Factory IoT Dashboard. The design system is based on the IMSOP app's modern tech aesthetic with deep space blue backgrounds and neon accent colors.

## Color Palette

### Primary Colors

The primary color scheme uses deep space blue as the main color with neon purple accents for interactive elements.

| Color | OKLCH Value | Usage |
|-------|-------------|-------|
| Primary | oklch(0.72 0.15 200) | Main buttons, links, active states |
| Primary Foreground | oklch(0.15 0.05 200) | Text on primary backgrounds |
| Accent | oklch(0.65 0.20 289) | Highlights, hover states, emphasis |
| Accent Foreground | oklch(0.95 0.02 260) | Text on accent backgrounds |

### Background Colors

| Color | OKLCH Value | Usage |
|-------|-------------|-------|
| Background | oklch(0.15 0.05 260) | Main page background |
| Foreground | oklch(0.95 0.02 260) | Primary text color |
| Card | oklch(0.20 0.05 260 / 0.6) | Card backgrounds with transparency |
| Card Foreground | oklch(0.95 0.02 200) | Text on card backgrounds |

### Semantic Colors

| Color | OKLCH Value | Usage |
|-------|-------------|-------|
| Success | oklch(0.55 0.18 145) | Success messages, online status |
| Warning | oklch(0.7 0.18 55) | Warning messages, maintenance status |
| Destructive | oklch(0.60 0.20 20) | Error messages, offline status |
| Muted | oklch(0.25 0.05 260 / 0.3) | Disabled states, secondary text |

### Sidebar Colors

| Color | OKLCH Value | Usage |
|-------|-------------|-------|
| Sidebar | oklch(0.12 0.05 260 / 0.8) | Sidebar background |
| Sidebar Primary | oklch(0.72 0.15 200) | Active menu items |
| Sidebar Accent | oklch(0.65 0.20 289) | Hover states on menu items |
| Sidebar Border | oklch(0.95 0.02 260) | Dividers and borders |

### Chart Colors

The chart colors are designed to work well together for data visualization:

| Chart | OKLCH Value | Usage |
|-------|-------------|-------|
| Chart-1 | oklch(0.72 0.15 200) | Primary data series |
| Chart-2 | oklch(0.65 0.20 289) | Secondary data series |
| Chart-3 | oklch(0.85 0.15 120) | Tertiary data series |
| Chart-4 | oklch(0.55 0.15 20) | Quaternary data series |
| Chart-5 | oklch(0.90 0.15 120) | Quinary data series |

## Typography

### Font Families

- **Sans Serif**: Roboto (primary font for UI)
- **Display**: Baydhan (for headings and emphasis)
- **Monospace**: Courier New (for code and technical content)

### Font Sizes and Weights

| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| H1 | 2rem | 600 | Page titles |
| H2 | 1.5rem | 600 | Section titles |
| H3 | 1.25rem | 600 | Subsection titles |
| Body | 1rem | 400 | Regular text |
| Small | 0.875rem | 400 | Secondary text |
| Tiny | 0.75rem | 400 | Captions and labels |

## Spacing

The design system uses a consistent 4px base unit for spacing:

| Scale | Value | Usage |
|-------|-------|-------|
| xs | 0.25rem (4px) | Minimal spacing |
| sm | 0.5rem (8px) | Compact spacing |
| md | 1rem (16px) | Standard spacing |
| lg | 1.5rem (24px) | Generous spacing |
| xl | 2rem (32px) | Large sections |
| 2xl | 3rem (48px) | Major sections |

## Border Radius

| Scale | Value | Usage |
|-------|-------|-------|
| sm | calc(0.5rem - 4px) | Small buttons, inputs |
| md | calc(0.5rem - 2px) | Medium components |
| lg | 0.5rem | Large components, cards |
| xl | calc(0.5rem + 4px) | Extra large components |

## Component Styling

### Buttons

Buttons follow a consistent styling approach with different variants:

**Primary Button**
- Background: Primary color
- Text: Primary foreground
- Hover: Accent color
- Disabled: Muted color

**Secondary Button**
- Background: Secondary color
- Text: Secondary foreground
- Hover: Accent color
- Disabled: Muted color

**Destructive Button**
- Background: Destructive color
- Text: Destructive foreground
- Hover: Darker destructive
- Disabled: Muted color

### Cards

Cards use a glassmorphism effect with semi-transparent backgrounds:

```css
.card {
  background: oklch(0.20 0.05 260 / 0.6);
  border: 1px solid oklch(0.95 0.02 260);
  border-radius: 0.5rem;
  backdrop-filter: blur(10px);
}
```

### Inputs

Input fields maintain consistency with the design system:

```css
.input {
  background: oklch(0.95 0.02 260 / 0.1);
  border: 1px solid oklch(0.95 0.02 260);
  color: oklch(0.95 0.02 260);
  border-radius: 0.5rem;
}

.input:focus {
  outline: none;
  ring: 2px oklch(0.72 0.15 200);
  ring-offset: 2px oklch(0.15 0.05 260);
}
```

### Status Indicators

Status indicators use semantic colors for quick visual feedback:

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| Online | Success/20% | Success | Success/30% |
| Offline | Muted/20% | Muted | Muted/30% |
| Maintenance | Warning/20% | Warning | Warning/30% |
| Error | Destructive/20% | Destructive | Destructive/30% |

## Animations

### Transitions

All interactive elements use smooth transitions:

```css
.transition-smooth {
  transition: all 300ms ease-out;
}
```

### Keyframe Animations

| Animation | Duration | Usage |
|-----------|----------|-------|
| fadeIn | 300ms | Element appearance |
| slideInUp | 300ms | Bottom-up entrance |
| slideInDown | 300ms | Top-down entrance |
| pulseGlow | 2s | Attention-grabbing effects |

## Dark Mode

The entire application uses dark mode by default. All colors are optimized for dark backgrounds with high contrast ratios for accessibility.

### Accessibility Considerations

- All text meets WCAG AA contrast ratios (minimum 4.5:1 for body text)
- Interactive elements have clear focus indicators
- Status information is not conveyed by color alone
- Animations respect `prefers-reduced-motion` preference

## CSS Custom Properties

All colors are defined as CSS custom properties for easy maintenance and theming:

```css
:root {
  --primary: oklch(0.72 0.15 200);
  --primary-foreground: oklch(0.15 0.05 200);
  --accent: oklch(0.65 0.20 289);
  /* ... more properties ... */
}
```

## Best Practices

1. **Use CSS Custom Properties**: Always reference color variables instead of hardcoding values
2. **Maintain Consistency**: Use the predefined spacing and sizing scales
3. **Respect Accessibility**: Ensure sufficient contrast and clear focus states
4. **Optimize Performance**: Use CSS variables and avoid unnecessary reflows
5. **Document Changes**: Update this guide when making design system changes

## Utility Classes

The application provides several utility classes for common styling patterns:

| Class | Purpose |
|-------|---------|
| `.transition-smooth` | Smooth transitions for all properties |
| `.glass-effect` | Glassmorphism effect with backdrop blur |
| `.glow-effect` | Shadow glow effect for emphasis |
| `.gradient-primary` | Gradient from primary to accent |
| `.text-gradient` | Gradient text effect |
| `.focus-ring` | Standard focus ring styling |
| `.status-online` | Online status styling |
| `.status-offline` | Offline status styling |
| `.severity-critical` | Critical alert styling |
| `.severity-warning` | Warning alert styling |

## Implementation Examples

### Creating a New Component

```tsx
import { cn } from "@/lib/utils";

export function MyComponent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg bg-card text-card-foreground p-4 border border-border",
        "transition-smooth hover:bg-card/80",
        className
      )}
      {...props}
    />
  );
}
```

### Using Status Colors

```tsx
<div className={cn(
  "px-3 py-1 rounded-full text-sm font-medium",
  status === "online" && "bg-success/20 text-success border border-success/30",
  status === "offline" && "bg-muted/20 text-muted border border-muted/30"
)}>
  {status}
</div>
```

### Creating Responsive Layouts

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```
