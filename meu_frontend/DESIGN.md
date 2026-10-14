---
name: "Meu"
description: "Charcoal Graphite with visible matte neumorphic shadows, green/gold accents and unchanged Pearl."
colors:
  light-background: "#e6e3df"
  light-foreground: "#29352e"
  light-card: "#e6e3df"
  light-popover: "#eeebe6"
  light-primary: "#205a46"
  light-primary-foreground: "#ffffff"
  light-secondary: "#dedbd5"
  light-muted: "#dedbd5"
  light-muted-foreground: "#62685f"
  light-accent: "#d3ddd3"
  light-border: "#c8c8bf"
  light-input: "#c8c8bf"
  light-destructive: "#b13648"
  light-destructive-foreground: "#ffffff"
  light-success: "#237555"
  light-warning: "#8c610f"
  light-chart-2: "#798d82"
  light-chart-3: "#9b8065"
  light-chart-4: "#868599"
  light-chart-5: "#9e6d7e"
  light-surface-edge: "#ffffffb3"
  light-forest: "#205a46"
  light-forest-foreground: "#fff5e6"
  light-apricot: "#e9b47d"
  light-apricot-foreground: "#342b21"
  forest-button-hover: "#f0e5d3"
  dark-background: "#303438"
  dark-foreground: "#f2f2f2"
  dark-card: "#303438"
  dark-popover: "#34393e"
  dark-primary: "#205a46"
  dark-primary-foreground: "#ffffff"
  dark-secondary: "#383d42"
  dark-muted: "#2b2f33"
  dark-muted-foreground: "#b3b3b3"
  dark-accent: "#1b3026"
  dark-border: "#535a61"
  dark-input: "#535a61"
  dark-destructive: "#f3939f"
  dark-destructive-foreground: "#31151b"
  dark-success: "#88ceb0"
  dark-warning: "#e9c46a"
  dark-chart-2: "#a0b4a9"
  dark-chart-3: "#e9c46a"
  dark-chart-4: "#aaa9be"
  dark-chart-5: "#c799ab"
  dark-surface-edge: "#ffffff0a"
  dark-forest: "#205a46"
  dark-forest-foreground: "#fff5e6"
  dark-apricot: "#e9c46a"
  dark-apricot-foreground: "#342b21"
  dark-focus-ring: "#88ceb0"
  dark-secondary-hover: "#dfb95e"
typography:
  headline:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(1.5rem, 2.3vw, 2rem)"
    fontWeight: 500
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.875rem"
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.75rem"
  data:
    fontFamily: "Geist Mono, monospace"
    fontSize: "1.125rem"
  balance:
    fontFamily: "Geist, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  position: "14px"
  pill: "999px"
spacing:
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  7: "28px"
  8: "32px"
  desktop-gutter: "44px"
components:
  button-primary:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-primary-foreground}"
    rounded: "{rounded.pill}"
    padding: "8px 20px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-foreground}"
    rounded: "{rounded.pill}"
    padding: "8px 20px"
    height: "44px"
  button-forest:
    backgroundColor: "{colors.dark-forest-foreground}"
    textColor: "{colors.dark-forest}"
    rounded: "{rounded.pill}"
    height: "44px"
  button-forest-hover:
    backgroundColor: "{colors.forest-button-hover}"
  panel-neutral:
    backgroundColor: "{colors.dark-card}"
    textColor: "{colors.dark-foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
  panel-forest:
    backgroundColor: "{colors.dark-forest}"
    textColor: "{colors.dark-forest-foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
  panel-apricot:
    backgroundColor: "{colors.dark-apricot}"
    textColor: "{colors.dark-apricot-foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-foreground}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "44px"
  chip-side-long:
    backgroundColor: "color-mix(in srgb, var(--success) 10%, transparent)"
    textColor: "{colors.dark-success}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  sidebar-collapsed:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-success}"
    width: "72px"
  sidebar-icon-button:
    rounded: "{rounded.position}"
    width: "44px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.dark-apricot}"
    textColor: "{colors.dark-apricot-foreground}"
    rounded: "{rounded.pill}"
    height: "44px"
---

# Design System: Meu

## Overview

Meu pairs a charcoal Graphite canvas with solid forest green and golden yellow accents; Pearl retains warm stone, forest green and apricot. Both modes share matte raised/inset geometry. Graphite remains the default.

The latest charcoal reference makes paired shadows visible. Preserve solid green actions, forest/gold dashboard panels and readable red errors on charcoal. Glossy gradients, colored glow, light streaks and decorative pink/violet surfaces remain rejected.

**Key Characteristics:**

- Solid forest balance and golden yellow snapshot panels on charcoal in Graphite; forest/apricot on warm stone in Pearl.
- Soft paired offset shadows on neutral surfaces, inset fields and active navigation.
- Geist Sans for interface copy and Geist Mono for precise data.
- Matching dark and light materials with visible focus and restrained state changes.

## Colors

The frontmatter preserves the exact CSS hex values; `dark-*` is Graphite and `light-*` is Pearl. Choose the mode through the application's complete look preset, then use semantic CSS variables. Frontmatter component examples describe the default dark mode.

### Primary

`--primary` is forest green with white foreground in both modes. `--forest` supplies the same forest balance panel in both modes, with cream text. In Graphite, `.text-primary`, link buttons and active sidebar labels use lighter `--success` green for legibility on charcoal. Focus uses `--focus-ring` in Graphite and falls back to primary in Pearl.

### Secondary

The legacy `--apricot` token supplies golden yellow #e9c46a in Graphite and apricot in Pearl, with dark brown text. Dark secondary buttons use this golden fill and #dfb95e hover. These fills are solid.

### Neutral

Graphite background/card use charcoal #303438; popover is #34393e, secondary neutral #383d42, muted #2b2f33 and field/divider borders #535a61. Accent hover remains dark green. Pearl keeps its existing warm stone neutrals. `--foreground` and `--muted-foreground` distinguish primary text from supporting labels; borders support fields and dividers.

### Selective card accents

Neutral surfaces remain the default. Running agent rows and the allocation detail use a muted sage surface; strategy result headings and sandbox connections use warm sand. Unread error/warning rows use red/sand with their existing icons and labels; read rows return to neutral at full text contrast. Credentials use small forest provider icons, with apricot for Bedrock. These are solid, role-based fills, never alternating decorative colors. `--surface-sage`, `--surface-sand` and `--surface-danger` have dedicated foreground and secondary text tokens for each mode. Colored list hover retains its fill.

### Semantic and chart colors

Graphite restores green success, golden warning and red #f3939f destructive feedback with dark red destructive foreground. Pair feedback with text/icons. The thirteen monochrome Tailwind utility overrides were removed; stock utility status/link hues apply again. Do not add grayscale overrides. Charts use the implemented green, gold, muted violet and muted rose auxiliary series colors; these data roles do not authorize decorative pink/violet surfaces. Pearl remains unchanged.

## Typography

**Interface Font:** Geist Sans, supplied through `--font-geist-sans`, with sans-serif fallback. The browser font family is Geist.
**Data Font:** Geist Mono, supplied through `--font-geist-mono`, with monospace fallback.

Use sentence case for headings, labels and actions. Monetary totals use tabular numerals; compact prices, quantities and supporting balances use mono where the component specifies it. Do not introduce the retired Plus Jakarta Sans, Roboto Mono or terminal typography system.

### Hierarchy

- **Headline:** `.page-title`, weight 500, `clamp(1.5rem, 2.3vw, 2rem)`, tracking `-0.03em`.
- **Title:** `.section-title`, 16px, weight 500, tracking `-0.01em`.
- **Body:** supporting copy commonly 14px; input text is 16px below the medium breakpoint and 14px above it.
- **Label:** compact financial labels use 12px; sidebar group labels use 11px.
- **Data:** supporting wallet amounts use Geist Mono at 18px. The total balance uses Geist Sans at 30px, rising to 36px at the extra-large breakpoint, weight 600.
- **Tables:** 13px overall; header weight 500 and muted foreground.

## Layout

The `.page-shell` fills available width up to 1560px and centers horizontally. Padding is 24px below 768px, 32px from 768px, and 36px vertically / 44px horizontally from 1280px. Preserve natural wrapping and minimum widths rather than truncating account values.

The portfolio overview stacks on small screens. At 1024px, its top row uses `1.05fr 0.8fr 1.35fr` columns with 24px gaps. Panel padding is 24px, increasing to 28px at 640px. Main page groups use 32px spacing. Position previews become two columns at 640px. The activity chart is 256px high below 640px and 288px above it. Detail tables scroll horizontally within their panel.

The paired theme concept in `.impeccable/build/paired-theme-concept.svg` and `.png` is illustrative, updated to charcoal with green/gold accents; older black/monochrome concepts are superseded; implemented CSS remains the authority.

These are observed portfolio patterns, not a requirement that every screen repeat that dashboard composition. Sidebar stays left. The collapsed desktop rail is 72px wide with centered 44px square icon buttons, 8px horizontal inner padding and hidden visual labels/group headings. Link/action labels remain available to screen readers; the footer status well is hidden. Keep ordinary controls at 44px minimum height; the compact period switch is an observed 36px exception. Small button variants rise to 44px below 768px.

## Elevation & Depth

Depth is structural and matte. Pearl uses paired lower-right dark and upper-left light shadows. Graphite uses charcoal surfaces with #24272a lower-right dark and #3c4146 upper-left light shadows, so raised and inset depth is visible. These neutral shadows are material cues, not colored glows. Inset pairs press fields, selected navigation and inner data wells into the material. Raised panels are borderless. Overlays use a directional floating shadow.

### Shadow Vocabulary

All exact mode values are copied into `.impeccable/design.json` and the design-system token stylesheet.

- **Raised:** `var(--neu-raised)`; Both modes use 7px / -7px offsets and 18px blur. Neutral panels and solid accent panels.
- **Control:** `var(--neu-control)`; 3px / -3px offsets, Graphite 8px blur / Pearl 7px blur. Neutral buttons and small raised items.
- **Inset:** `var(--neu-inset)`; inset 3px / -3px offsets, 7px blur. Inputs, navigation selections, inner wells and position previews.
- **Floating:** `var(--neu-floating)`; `12px 18px 40px` directional shadow. Dialogs, popovers, menus and chart tooltips.
- **Balance CTA:** Both modes use `3px 4px 8px #102a2340`. Use directional depth rather than a neutral paired highlight on this contrasting action.

Transitions use the shared 180ms control duration; sidebar background and shadow transitions use `ease-out`. Reduced-motion preference suppresses animations and transitions and disables smooth scroll.

## Shapes

Base radius is 16px in both presets. Derived radii are 8px, 12px, 16px and 20px; raised panels and overlays use 20px. Buttons and segmented selectors use full pills; inputs/selects use 12px. Sidebar actions and position previews use 14px. Round icon wells use 50% radius. Do not replace the coherent geometry with terminal square corners.

## Components

### Buttons

Shared buttons use semantic foreground/background pairs, including destructive actions; notification badges use dark ink on their light fill in Graphite. Shared buttons are pill shaped, medium-weight 14px labels, 44px tall by default, with 20px horizontal padding (12px with an immediate icon). Primary uses solid forest green and white foreground, with control depth. Outline uses the base material and raised control shadow; secondary uses the base material in Pearl and the golden contextual fill in Graphite. Ghost uses an accent hover fill; links use primary text and underline on hover. Pressed shared buttons use inset depth. Disabled controls lower opacity and block interaction.

The balance-panel “View agents” link is cream with forest text in both modes. Both use `3px 4px 8px #102a2340` depth. Both hover to `forest-button-hover`. Dark secondary buttons use gold with dark brown text and #dfb95e hover. Dark links and primary text use lighter success green, and visible focus uses the lighter green focus-ring token. Disabled and error foregrounds remain semantic and readable.

### Cards / Containers

Neutral panels share background and card color, 20px corners, paired raised depth and no border. Balance and snapshot panels use forest/gold fills in Graphite and forest/apricot fills in Pearl while retaining the panel shape. Position previews use 16px padding, 14px corners and inset depth. Empty chart wells are inset with explicit unavailable/empty copy.

### Inputs / Fields

Inputs use the base background, a 1px input border, 12px corners, 44px height and inset depth. Focus changes border/ring to primary; invalid state uses destructive border/ring. Disabled state lowers opacity and changes the cursor. Select triggers use the same inset material and minimum 44px height.

### Chips

Position-side chips are compact, noninteractive pills with 12px text, 8px horizontal / 4px vertical padding, and a 12px direction icon. Long/buy uses success at 10% fill plus success text; short/sell uses destructive at 10% fill plus destructive text. Keep the written side and icon so color is not the only cue. Shared badges use medium-weight 12px text, 8px horizontal / 2px vertical padding and pill corners.

### Navigation and segmented controls

Sidebar actions are at least 44px high with 14px corners; active state is inset with primary text and weight 600. In the 72px collapsed rail, center each 44px square button, remove label gaps and hide visible labels while retaining accessible names. Tabs sit in a 48px inset pill track with 5px padding; the active tab becomes raised with primary text. The period switch uses an inset pill track and a solid primary selected button with `aria-pressed`. Keep keyboard focus visible.

### Trading activity and data

Activity is daily volume from available fills, not account equity or profit. Use the primary chart stroke at 2.5px, restrained dashed horizontal grid lines, muted labels and a rounded floating tooltip. Keep unavailable, empty and actual data states distinct. Preview data must be explicitly identified as illustrative. Preserve currency labels and exchange-specific units.

### Logo

The generated original mark is the transparent `public/img/meu-symbol.png`. `MeuMark` uses it as a current-color CSS mask at 125% scale, 28px by default, with the accessible label “MEU logo”. Preserve the rounded interlocking cube silhouette; do not substitute the older `logo1.png` asset or invent a new icon.

## Do's and Don'ts

### Do:

- **Do** use the semantic tokens from `src/app/globals.css` and the complete Graphite/Pearl presets.
- **Do** use the current charcoal Graphite surface tokens for visible paired shadows, with green/gold controls and red errors, and preserve Pearl unchanged.
- **Do** preserve the mode-specific balance-panel CTA and its directional dark shadow.
- **Do** keep data, errors, focus and action labels legible in both modes.
- **Do** retain actual routes, account state, execution guards and risk behavior during visual work.

### Don't:

- **Don't** use glossy gradients, glass blur, glowing accent fields, light streaks or pink/violet decorative surfaces.
- **Don't** return to flat terminal borders, retired fonts or purple/pink action palettes.
- **Don't** depict unsupported future capabilities as operational or label fill volume as profit/equity.
- **Don't** treat archived mockups or older core-page artifacts as current visual authority.

### Algorithm creation controls

Retain the common identity, market scope, capital and risk sections for stock and crypto algorithms. Crypto adds its available rule selection, paper/live mode, candle timeframe, ATR brackets and isolated leverage/margin controls. Use existing themed Select primitives. The primary action creates a paused agent; the optional secondary action backtests the current settings over the last 30 days. State actual runner limits (Delta India, one ticker/open position; stocks currently use Zerodha EMA). Risk labels must distinguish loss at stop from entry notional.

### Help and documentation

The authenticated `/help` route is a Read surface within the workspace. Use a searchable topic index, a sticky desktop contents navigation that highlights the section at the reading position in the workspace scroll container, mobile-stacked content, measured prose and definition lists for field meanings. Preserve the shared Graphite/Pearl tokens and existing controls; use plain reading sections instead of a grid of cards. Link directly to setup, backtesting and paper/live anchors from relevant app screens. Describe implemented behavior, separate future capabilities, and distinguish activation from recent worker execution.

### Saved algorithm settings and live activation

Agent details display saved leverage, margin budget, timeframe, direction, algorithm periods, ATR stop/target and cost assumptions in a responsive definition list using existing Card tokens. Label leverage as a saved target, not as verified current broker state. Leverage is explicitly selected; whole-contract sizing is calculated from risk and margin limits. Live Start automatically prepares the saved exchange settings without an extra confirmation dialog; the pending action reads “Preparing trading…”. The first activation action is “Start Agent”, followed by “Resume Agent” after pausing. Failed preflight remains paused and reports the reason. Preserve Graphite/Pearl and existing error treatment.
