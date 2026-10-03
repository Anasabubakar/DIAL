# Component provenance

| Component | Source | License | Notes |
|---|---|---|---|
| Button, Input/Textarea/Label, Badge, Tabs, Dialog | Hand-written on Radix primitives, following the shadcn/ui pattern (https://ui.shadcn.com) | MIT (shadcn/ui, Radix) | Restyled to the Dial tokens. Not copied verbatim from a registry. |
| `@radix-ui/react-tabs`, `-dialog`, `-slot` | npm | MIT | Accessible behaviour |
| lucide-react icons | npm | ISC | |
| Dial symbol and app icon | Figma "Dial — Brand Identity" | Project-owned | See `docs/BRAND.md` |

## React Bits (https://reactbits.dev)

`SplitFlapText` (TS + Tailwind, `https://reactbits.dev/r/SplitFlapText-TS-TW`, MIT + Commons Clause) was retrieved and used in an
earlier iteration of the landing page. It was **removed** when the approved identity landed (it competed with the supplied mark and
read as obvious phone imagery). No React Bits code remains in the repository.

## 21st.dev (https://21st.dev)

Browsed through its public markdown catalog. Component source could **not** be retrieved: installs require a 21st API key
(`/r/<author>/<component>` answers 403 without one) and creating an account is outside what this build may do. Licensing was also
inconsistent (the listing for Origin UI says MIT; the upstream repository's LICENSE file is AGPL-3.0). Per the build brief, an original
substitute was written instead (underline tabs and dialog, above). Nothing from 21st.dev is used.
