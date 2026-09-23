---
version: alpha
name: Landscape Desktop
description: An authored desktop shell over moving landscapes; project worlds retain their own visual identities.
colors:
  primary: "#0B0F0C"
  secondary: "#A9B0A7"
  tertiary: "#C8FF43"
  neutral: "#E9E8DF"
  window: "rgba(10, 14, 11, 0.88)"
  windowSolid: "#111510"
  muted: "#B8BDB5"
typography:
  display:
    fontFamily: Helvetica Neue, Helvetica, Arial, sans-serif
    fontSize: 4rem
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: "-0.055em"
  body:
    fontFamily: Helvetica Neue, Helvetica, Arial, sans-serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
  interface:
    fontFamily: SFMono-Regular, Roboto Mono, Consolas, monospace
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0em"
  metadata:
    fontFamily: SFMono-Regular, Roboto Mono, Consolas, monospace
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  window: 0px
  control: 3px
  circular: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
components:
  window-shell:
    backgroundColor: "{colors.window}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.window}"
    padding: 0px
  window-control:
    backgroundColor: "{colors.windowSolid}"
    textColor: "{colors.neutral}"
    typography: "{typography.interface}"
    rounded: "{rounded.control}"
    size: 44px
  metadata:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.muted}"
    typography: "{typography.metadata}"
    rounded: "{rounded.window}"
    padding: 0px
---

## Overview

The index is a landscape desktop. Inner routes are windows opened over that landscape. The shell provides orientation and controls; project content supplies personality. A shared component must never make unrelated projects look like one software product.

7.css is a reference for semantic window anatomy and explicit controls, not a visual theme or global dependency. No Windows branding, wallpaper, Segoe UI, glossy buttons, or nostalgic imitation enters the site.

## Colors

The shell uses deep moss-black, warm mineral white, and muted green-grey derived from the landscape films. Lime is reserved for the Hermes system where it already carries project meaning. Project palettes override the shell inside their own worlds.

Cream paper is not a default canvas. Light surfaces may appear only when a project asset or reading task calls for them.

## Typography

Navigation and controls never fall below 14px. Meaningful metadata never falls below 12px. Uppercase and wide tracking are exceptional treatments, not a default hierarchy.

Helvetica Neue remains the reading face. Monospace marks real interface context, file-like information, or technical structure. Project title treatments may use supplied artwork or project-specific typography.

## Layout

One window equals one spatial layer. The landscape remains visible around inner routes. Content inside a window is organized with alignment, spacing, and rules instead of nested cards.

Negative space is intentional, but an empty first viewport must still show either the work, a useful action, or a project-specific artifact.

## Elevation & Depth

The main window may use backdrop blur because it genuinely overlaps video. Nested cards, title bars, lists, and widgets do not add independent blur. Use either a border or a shadow to define an edge, not both. Shadows are restrained and never glow.

## Shapes

Windows and content sheets are square. Small controls may use a 3px radius. Circles are reserved for objects that are genuinely circular, including the constellation stars—not generic icon buttons.

## Components

A window contains a title bar, one orientation label, explicit actions, a flat content area, and optional status only when real state exists. Minimize and close controls use familiar symbols with accessible names. Decorative numbering is prohibited.

Current-work rows are ordinary links. Architecture diagrams show relationships rather than equal-weight feature cards. Labels above headings remain only when they add information the heading cannot carry.

## Do's and Don'ts

- Do preserve the crest, constellation, landscape films, artwork viewers, and project-specific worlds.
- Do let real media or system artifacts enter the first viewport.
- Do distinguish navigation, metadata, and prose by function.
- Do support keyboard, touch, reduced motion, no-JS archives, root hosting, and `/main/` hosting.
- Don't use cream editorial styling as a neutral fallback.
- Don't use fake operational language, decorative live dots, meaningless numbers, pills, gradient text, or nested glass.
- Don't import a UI kit globally.
- Don't flatten project identities into the desktop shell.
