---
description: ness. brand guidelines — typography, colors, and usage rules
---

# ness. Branding Guidelines

## Brand Mark

The brand mark is always written as **`ness.`** — lowercase with a colored dot.

## Typography

- **Font**: Montserrat
- **Weight**: Medium (500)
- **Case**: Always lowercase — **never** capitalize to "Ness" or "NESS"
- **Tracking**: -0.01em (slightly tight)

## Colors

| Element | Color | Hex |
|---------|-------|-----|
| Text (dark background) | White | `#ffffff` |
| Text (light background) | Black | `#0a0a0a` |
| Dot (`.`) | ness. blue | `#00ade8` |

## Usage Rules

1. **Always lowercase** — `ness.` never `Ness` or `NESS`
2. **Dot is part of the brand** — always include the `.` after `ness`
3. **Dot color is fixed** — always `#00ade8` regardless of background
4. **Font is fixed** — always Montserrat Medium 500
5. **No logo image** — the brand mark is typographic only

## React Component

Use `<NessBrand />` from `@/components/ness-brand.tsx`:

```tsx
import { NessBrand } from "@/components/ness-brand"

// Default (white text for dark backgrounds)
<NessBrand />

// Dark text for light backgrounds
<NessBrand variant="dark" />

// Custom size
<NessBrand size="text-lg" />
```

## Where It Appears

- Sidebar footer: `por ness.`
- Documentation: all references use `ness.` (lowercase)
- Module footers: `Desenvolvido por ness.`
- FAQ: "Quem desenvolveu a Gabi? → ness."
