---
name: meu-product
description: Current matte Meu product UI rules for dashboard, agents, exchanges, credentials, notifications and settings.
---

Design Meu with **charcoal Graphite neutral surfaces, solid green/gold actions and panels, red errors, and unchanged forest/apricot Pearl**. Share matte raised/inset geometry.

Read `../../../DESIGN.md` for normative tokens and component rules, then `tokens/colors_and_type.css` for a standalone preview snapshot. Actual application authority is `src/app/globals.css` and `src/components/ui-settings.tsx`.

1. Use dark background/card #303438, popover #34393e, secondary #383d42, muted #2b2f33, border/input #535a61. Paired #24272a/#3c4146 shadows make depth visible. Use forest #205a46 buttons with white text, forest balance and golden #e9c46a snapshot/secondary actions. Errors are #f3939f with semantic dark-red foreground. Remove the prior monochrome rule; stock status/link utility hues are restored. Dark text-primary/links/active navigation use lighter success green, and focus uses --focus-ring #88ceb0. Pearl is unchanged.
2. Geist Sans for interface text; Geist Mono for precise supporting numeric data. Large totals use Geist Sans with tabular numerals. Use sentence case.
3. Use paired offset raised/control shadows and inset wells. Panels are borderless. Floating overlays have directional shadows. No glossy gradients, glowing colors, glass blur, light streaks or pink/violet decorative surfaces.
4. Panels/overlays use 20px corners; base radius 16px; fields use 12px; sidebar and position wells 14px; buttons and segmented controls are pills.
5. Cream/forest balance CTA in both modes: Graphite #102a2340 directional shadow, Pearl #102a2340; both hover #f0e5d3. Dark secondary gold buttons hover #dfb95e.
6. Preserve visible focus, readable disabled/error states, keyboard access and reduced motion. Shared controls use 180ms state transitions.
7. Use the original transparent `public/img/meu-symbol.png` as a current-color mask. Retain the rounded interlocking cube silhouette.
8. Preserve live account data, exchange units, routing, authentication and execution/risk behavior. Explicitly label sample preview data. Fill volume is not profit/equity; future capabilities are not operational.

Archived `core-pages` and older mockups are historical artifacts. Their terminal, pink/purple, flat-border or retired-font guidance must not direct new work. Pearl’s muted auxiliary chart and semantic destructive colors are data roles, not permission to create pink/violet decorative surfaces.

Collapsed desktop sidebar: fixed 72px rail, centered 44px square buttons, 8px horizontal inner padding, hidden visual labels/group headings. Preserve screen-reader action names and hide the footer status well when collapsed.
