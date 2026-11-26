---
name: KLTZQU Portfolio
description: Portfolio for Eugene’s independent games, apps and tools.
colors:
  room: "#17141e"
  surface: "#252132"
  ink: "#f6effa"
  muted: "#c2b8ce"
  accent: "#cfb8ff"
  gallery: "#f1eaf6"
typography:
  display:
    fontFamily: "Unbounded Variable"
    fontWeight: 650
    lineHeight: 1.06
    letterSpacing: "-.047em"
  body:
    fontFamily: "Manrope Variable"
    lineHeight: 1.5
rounded:
  controls: "12px"
  media: "clamp(17px, 2.2vw, 32px)"
  pill: "999px"
spacing:
  gutter: "clamp(22px, 5vw, 96px)"
---
# KLTZQU

## Overview

The portfolio opens on a single rounded window that plays real project frames. A directional shader transitions between projects, with a small camera movement following each cut. Scrolling closes the distance to the work, then gives each project its own spread.

## Layout

Use a low-chroma plum surround, lavender paper and a brighter accent for controls. The active shot lights the first screen in dusk violet, warm amber or steel blue. Project galleries alternate image placement on desktop and put the title before the image on mobile.

## Elevation & Depth

Keep movement tied to real content. The virtual camera handles the hero, ScrollTrigger handles page movement and native view transitions handle page navigation. Pause rendering offscreen and keep the same links and preview controls available when the scene falls back to still images.

## Components

Use still-image thumbnails to switch projects, pill-shaped gallery controls and consistent rounded corners for screenshots. Keep Cyrillic and Latin on the same type system. The KLPocket image is a capture of the live web app in a clean guest profile. The Dev Blog cover is derived from the project's original file in the Lab.
