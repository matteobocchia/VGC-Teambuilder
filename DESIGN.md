---
name: VGC Forge
description: Evidence-first team building and matchup analysis for Pokémon Champions.
colors:
  paper: "#F5F1E4"
  paper-strong: "#FCFAF3"
  ink: "#22231F"
  muted: "#5D5F58"
  line: "#2C2E2A"
  line-soft: "#D8D2C4"
  lime: "#C9EC52"
  lime-deep: "#4F761F"
  sky: "#95CFEE"
  coral: "#FF705D"
  focus: "#8F2E20"
  yellow: "#F5C94A"
  white: "#FFFDF7"
typography:
  display:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "clamp(1.25rem, 2.4vw, 2rem)"
    fontWeight: 850
    lineHeight: 1
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1.4
  label:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "9px"
    fontWeight: 850
    lineHeight: 1.2
  body-small:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "10px"
    fontWeight: 650
    lineHeight: 1.3
  body-large:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 650
    lineHeight: 1.4
  title:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 850
    lineHeight: 1
rounded:
  xs: "5px"
  sm: "6px"
  sm-compact: "7px"
  md-compact: "8px"
  md-tight: "9px"
  md: "10px"
  field: "11px"
  lg-compact: "12px"
  lg-tight: "13px"
  lg-soft: "14px"
  xl-compact: "16px"
  lg: "16px"
  xl: "18px"
  map: "20px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "28px"
components:
  button-primary:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    rounded: "999px"
    padding: "10px 15px"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "999px"
    padding: "9px 12px"
  input-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
---

# Design System: VGC Forge

## Overview

**Creative North Star: “The Matchup Field Map”**

VGC Forge turns a Pokémon Champions matchup into a readable tactical map. The surface borrows the confidence of a folded field guide: cream stock, inked dividers, cartographic regions, and small colour-coded signals. The geometry is purposeful: attacker and defender zones, route connectors, and evidence rows make the calculation legible at a glance.

The tool is dense without feeling like a generic admin dashboard. Strong type, flat colour blocks, and explicit data labels keep the competitive task in front of the player. The confirmed anti-reference is the soft “puddle” silhouette; regions use stepped, angular coastlines instead.

**Key Characteristics:**
- Cream guide-stock canvas with flat lime, sky, coral, and yellow signals.
- Crisp black ink borders and compact, high-contrast data typography.
- Cartographic panels are functional containers, never decoration.

## Colors

The palette treats cream as the working surface, ink as the map legend, and saturated blocks as semantic state.

### Primary
- **Field-guide lime** (`#C9EC52`): selected roster and active setup surfaces.
- **Route coral** (`#FF705D`): move connector and primary action signal.

### Secondary
- **Sky matchup blue** (`#95CFEE`): defender region and defensive context.
- **Evidence yellow** (`#F5C94A`): KO result and high-priority outcome.

### Neutral
- **Ink** (`#22231F`): headings, borders, and primary values.
- **Paper** (`#F5F1E4`): global canvas.
- **Strong paper** (`#FCFAF3`): panels and input surfaces.
- **Muted ink** (`#5D5F58`): secondary labels that remain readable on paper.
- **Soft rule** (`#D8D2C4`): dividers and unselected field edges.

**The One Signal Rule.** Colour blocks must indicate selection, matchup role, or evidence priority; never add a colour only to decorate an empty surface.

## Typography

**Display Font:** Geist (with Arial fallback)
**Body Font:** Geist (with Arial fallback)

**Character:** Compact grotesk lettering with heavy, slightly tight headings and tabular numerals for competitive data.

### Hierarchy
- **Display** (850, 20–27px, line-height 1): product mark and matchup names.
- **Headline** (850, 17–22px, line-height 1): panel and route headings.
- **Body** (650, 10–12px, line-height 1.4): controls, roles, and explanations.
- **Label** (850, 9–10px, slight tracking, uppercase only for map markers): metadata and table headers.

**The Tight-But-Readable Rule.** Keep tracking near `-0.04em` for headings, but never compress tabular values or explanatory copy.

## Layout

The desktop surface uses a three-part grid: a 300px setup inspector, a flexible central route/outcomes column, and a 250px team rail. The format notice sits below the 76px top bar. At 1320px and below, the team rail moves below the main work area; at 850px, navigation becomes a second top-bar row; at 560px, the matchup regions stack vertically and the outcomes table scrolls horizontally.

Spacing follows an 8px rhythm with 18–28px separation between major work areas. The first viewport always exposes the active set, attacker-to-defender route, primary KO result, field state, outcomes evidence, and six-slot roster.

## Elevation & Depth

The system is flat by default. Depth comes from tonal layering (paper canvas, strong-paper panels, and saturated semantic regions) plus 1–1.5px ink rules. No drop shadows are used; hover states use a small translation or border emphasis instead.

**The Flat Evidence Rule.** If a value is important, give it a clear row, border, or colour role rather than a shadow.

## Shapes

Panels use restrained 6–18px radii with asymmetric corners. Buttons and language controls are pills. Map regions use stepped polygon clipping with black outlines to read like folded guide-map territories, explicitly avoiding liquid or puddle-like blobs.

## Components

### Buttons
- **Shape:** compact pills for global actions; 6–10px asymmetric corners for data rows.
- **Primary:** lime background, black ink, 10px vertical padding.
- **Hover / Focus:** one-pixel border emphasis or a 1px lift; dark coral focus ring with visible offset.
- **Secondary:** white/paper surfaces with black ink rules.

### Chips
- **Style:** small outlined pills with semantic type colours or field-state fills.
- **State:** active field chips show a check icon and `aria-pressed`; inactive chips retain a quiet paper surface.

### Cards / Containers
- **Corner Style:** asymmetric 6–18px corners; map regions use stepped clipping.
- **Background:** paper-strong for panels, lime/sky/coral/yellow for semantic regions.
- **Shadow Strategy:** no shadows; tonal layering and borders only.
- **Border:** 1–1.5px ink or soft rule.
- **Internal Padding:** 14–20px on panels, 7–10px on compact rows.

### Inputs / Fields
- **Style:** white/paper-strong fill, soft rule, 6–10px corners, compact text.
- **Focus:** 3px dark coral outline with 2px offset.
- **Disabled:** reduced opacity and `not-allowed` cursor, used when the six-slot roster is full.

### Navigation
- **Style:** pill group in the top bar, ink-filled active link, visible IT/EN pressed state.
- **Mobile:** navigation moves to its own row instead of disappearing.

### Matchup route
The signature component joins attacker and defender regions with a coral route line, a move selector, and a yellow KO result. A grouped field control panel keeps mutually exclusive weather and terrain choices separate from toggleable screens, protection, speed, and space effects. The result is always the visual center of the route; detailed evidence continues in the outcomes matrix.

## Do's and Don'ts

### Do:
- **Do** keep Pokémon names, move names, format, and KO evidence in the first viewport.
- **Do** use semantic controls and visible focus states for every editable value.
- **Do** preserve the 0–32 Stat Points / 66 total Champions constraint in copy and API metadata.
- **Do** keep locale strings in data maps so additional languages can be added without component rewrites.

### Don't:
- **Don't** use gradients, glassmorphism, ornamental shadows, or generic SaaS card stacks.
- **Don't** draw map regions as soft puddles; use stepped cartographic coastlines.
- **Don't** present illustrative damage values as verified engine output; label presets until the server-side engine is connected.
