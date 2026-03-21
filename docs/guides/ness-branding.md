---
description: ness. brand guidelines — typography, colors, product naming, and usage rules
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

## Product Naming Convention

Todos os produtos da ness. seguem o padrão **`n.<nome do produto>`**:

- Mesma fonte: **Montserrat Medium 500**
- Mesmo case: **sempre lowercase**
- Mesmo dot: **`.` em `#00ade8`**
- O `n` representa a ness.

### Exemplos de produtos

| Produto | Escrita correta | Errado |
|---------|----------------|--------|
| GRC | `n.grc` | N.GRC, n.GRC, N.grc |
| Privacy | `n.privacy` | N.Privacy, n.Privacy |
| Risk | `n.risk` | N.Risk, n.RISK |
| Pentest | `n.pentest` | N.Pentest |
| Training | `n.training` | N.Training |
| SOC | `n.soc` | N.SOC, nSOC |
| 360 | `n.360` | N.360 |

### Regra geral

```
n.<nome>
│ │
│ └─ nome do produto, sempre lowercase
└─── prefixo ness., sempre lowercase
      o "." é sempre na cor #00ade8
```

## Usage Rules

1. **Always lowercase** — `ness.` nunca `Ness` ou `NESS`
2. **Dot is part of the brand** — sempre incluir o `.` após `ness` e após `n`
3. **Dot color is fixed** — sempre `#00ade8` independente do fundo
4. **Font is fixed** — sempre Montserrat Medium 500
5. **No logo image** — the brand mark is typographic only
6. **Products follow the same rules** — `n.<product>` usa mesma fonte, cor e case

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
- Product names: `n.grc`, `n.privacy`, `n.soc`, etc.
