# Meu Product Design System

The current system keeps Graphite neutral canvas/cards at #303438 and popovers at #34393e, with visible #24272a/#3c4146 paired shadows while restoring forest green actions and balance panels, golden snapshot/secondary actions, and red errors. Pearl retains warm stone forest/apricot. Both share matte geometry.

Canonical design documentation: [`../../../DESIGN.md`](../../../DESIGN.md). Application token authority: [`../../../src/app/globals.css`](../../../src/app/globals.css). Mode behavior: [`../../../src/features/settings/components/ui-settings.tsx`](../../../src/features/settings/components/ui-settings.tsx).

- `SKILL.md` — rules for future in-app design work.
- `tokens/colors_and_type.css` — exact palette/depth snapshot with Graphite default for standalone previews; application CSS stays authoritative.
- `brand/voice-and-tone.md` — factual interface copy guidance.
- `.impeccable/design.json` at the frontend root — schemaVersion 2 extension metadata and self-contained component snippets.
- `public/img/meu-symbol.png` at the frontend root — transparent original cube mark used by `MeuMark` as a current-color mask.

Typography is Geist Sans and Geist Mono. Panels have 20px corners, inset fields 12px corners, and buttons are pills. Balance actions are cream/forest in both modes, with #102a2340 shadow in Graphite and #102a2340 in Pearl; both hover #f0e5d3. Dark secondary actions use gold and #dfb95e hover. Stock utility status colors return; lighter green links/active text and focus remain readable on charcoal. The collapsed sidebar is a 72px rail with centered 44px square controls and visually hidden accessible labels. No decorative gloss, glow, glass blur, light streaks or pink/violet surfaces.

Documentation was extracted from the implemented CSS, shared buttons/inputs, settings presets, logo component and portfolio overview. Review PNGs in `.impeccable/review/` represent isolated fixtures of the real component at desktop/mobile sizes. They do not verify protected live accounts or every route. Archived mockups and `core-pages` preserve historical work and are not current design authority. Component sidecar snippets illustrate CSS states; they do not implement application data or navigation behavior.

The paired theme concept `.impeccable/build/paired-theme-concept.{svg,png}` is illustrative and updated to current charcoal green/gold Graphite; prior black/monochrome concepts are superseded; source CSS owns implemented tokens.
