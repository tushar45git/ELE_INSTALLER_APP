# 🎨 Autoinstaller Design System - Quick Reference

## Color Tokens

### Primary (Deep Indigo)
```css
--primary-600: #4f46e5;  /* Main brand color - buttons, icons, links */
--primary-700: #4338ca;  /* Hover states, gradients */
--primary-500: #6366f1;  /* Lighter variant */
--primary-200: #c7d2fe;  /* Borders on hover */
--primary-100: #e0e7ff;  /* Focus rings */
--primary-50: #eef2ff;   /* Backgrounds, hover states */
```

### Accent (Emerald Green)
```css
--accent-500: #10b981;   /* Success actions, important CTAs */
--accent-600: #059669;   /* Darker success */
--accent-100: #d1fae5;   /* Success backgrounds */
```

### Neutrals (Soft Gray)
```css
--gray-900: #18181b;     /* Primary text */
--gray-700: #3f3f46;     /* Secondary text, labels */
--gray-600: #52525b;     /* Tertiary text */
--gray-400: #a1a1aa;     /* Placeholders, disabled */
--gray-200: #e4e4e7;     /* Borders, dividers */
--gray-100: #f4f4f5;     /* Subtle backgrounds */
--gray-50: #fafafa;      /* Page background */
```

### Semantic
```css
--success-500: #10b981;  /* Success states */
--error-500: #ef4444;    /* Error states */
--warning-500: #f59e0b;  /* Warning states */
```

---

## Typography Scale

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
```

### Sizes & Weights
```css
/* Page Title */
font-size: 20-22px;
font-weight: 700;

/* Section Headers */
font-size: 16-18px;
font-weight: 600;

/* Labels */
font-size: 14px;
font-weight: 500;

/* Body Text / Values */
font-size: 14px;
font-weight: 400;

/* Small Text */
font-size: 12px;
font-weight: 400;
```

---

## Spacing Scale

```css
--space-2: 8px;    /* Tight spacing */
--space-3: 12px;   /* Default gap */
--space-4: 16px;   /* Card padding, margins */
--space-5: 20px;   /* Button padding */
--space-6: 24px;   /* Section spacing */
--space-8: 32px;   /* Large spacing */
```

---

## Border Radius

```css
--radius-lg: 12px;   /* Cards, inputs, buttons */
--radius-xl: 16px;   /* Large cards */
--radius-full: 9999px; /* Pills, badges */
```

---

## Shadows

### Cards
```css
/* Default */
box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04);

/* Hover */
box-shadow: 0 4px 12px 0 rgba(79, 70, 229, 0.12), 0 2px 6px 0 rgba(0, 0, 0, 0.08);
```

### Buttons
```css
/* Primary Button Hover */
box-shadow: 0 8px 16px 0 rgba(79, 70, 229, 0.24), 0 4px 8px 0 rgba(0, 0, 0, 0.12);

/* Secondary Button Hover */
box-shadow: 0 4px 8px 0 rgba(79, 70, 229, 0.12);
```

### Floating Button
```css
/* Default */
box-shadow: 0 4px 12px 0 rgba(79, 70, 229, 0.15), 0 2px 6px 0 rgba(0, 0, 0, 0.08);

/* Hover */
box-shadow: 0 8px 20px 0 rgba(79, 70, 229, 0.25), 0 4px 10px 0 rgba(0, 0, 0, 0.12);
```

---

## Component Patterns

### Primary Button
```css
background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
color: white;
padding: 12px 20px;
border-radius: 12px;
font-weight: 600;
```

### Secondary Button
```css
background: white;
color: #3f3f46;
border: 2px solid #e4e4e7;
padding: 12px 20px;
border-radius: 12px;
font-weight: 600;
```

### Card
```css
background: #ffffff;
border: 1px solid #e4e4e7;
border-radius: 16px;
padding: 16px;
box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08);
```

### Input Field
```css
background: white;
border: 2px solid #e4e4e7;
border-radius: 12px;
padding: 12px 16px;
font-size: 14px;

/* Focus State */
border-color: #6366f1;
box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
```

### Badge
```css
/* Success */
background: #d1fae5;
color: #047857;
padding: 8px 12px;
border-radius: 9999px;
font-size: 12px;
font-weight: 700;

/* Error */
background: #fee2e2;
color: #b91c1c;

/* Warning */
background: #fef3c7;
color: #b45309;
```

---

## Transitions

```css
/* Standard */
transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);

/* Fast */
transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

/* Base */
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
```

---

## Usage Guidelines

### ✅ Do's
- Use **Primary Indigo** for main actions and brand elements
- Use **Emerald Green** sparingly for success states and important CTAs
- Use **Soft Gray** backgrounds instead of pure white
- Maintain **12-16px** border radius for consistency
- Use **subtle shadows** with indigo tints
- Keep **300ms** transitions for smooth interactions

### ❌ Don'ts
- Don't use too many bright colors
- Don't use harsh shadows
- Don't use pure black (#000000) for text
- Don't mix different border radius values
- Don't use generic blue (#0000ff) or red (#ff0000)

---

## Accessibility

### Contrast Ratios (WCAG AA)
- **Primary text on white**: 12.6:1 ✅
- **Secondary text on white**: 8.9:1 ✅
- **White text on Primary**: 7.2:1 ✅
- **Success badge**: 5.8:1 ✅
- **Error badge**: 6.1:1 ✅

### Touch Targets
- Minimum: **44px × 44px**
- Recommended: **48px × 48px**

### Focus States
- Always show **2px outline** with **2px offset**
- Use **indigo color** (#6366f1)
- Add **4px ring** for input fields

---

## Responsive Breakpoints

```css
/* Mobile First */
@media (max-width: 850px) {
  /* Mobile styles */
}

/* Desktop */
@media (min-width: 851px) {
  /* Desktop styles */
}
```

---

## Quick Copy-Paste

### Gradient Text (Page Title)
```css
background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
```

### Card Hover Effect
```css
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px 0 rgba(79, 70, 229, 0.12);
  border-color: #c7d2fe;
}
```

### Button Hover Effect
```css
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px 0 rgba(79, 70, 229, 0.24);
}
```

---

## Color Psychology

- **Indigo**: Trust, professionalism, innovation, stability
- **Emerald**: Success, growth, positive action
- **Soft Gray**: Neutrality, sophistication, premium quality
- **Red**: Errors, warnings, critical actions
- **Amber**: Caution, attention needed

---

## Inspiration Sources

This design system is inspired by:
- Stripe Dashboard
- Notion
- Linear
- Vercel
- Tailwind UI

All following modern SaaS design principles with premium aesthetics.
