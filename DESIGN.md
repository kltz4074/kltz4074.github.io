---
name: KLTZQU Portfolio
description: Portfolio for Eugene’s independent games, apps and tools.
colors:
  room: "#171816"
  surface: "#24251f"
  ink: "#f0eddf"
  muted: "#bdb9ab"
  accent: "#dce697"
  gallery: "#e9e6d8"
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
  controls: "2px"
spacing:
  gutter: "clamp(22px, 5vw, 96px)"
---
# KLTZQU

## Overview

The portfolio opens on an editing table made of real project frames. Selecting a project changes the camera’s subject. Scrolling closes the distance to the work, then gives each project its own spread.

## Layout

Use a dark surround at the entrance, light paper for the gallery and clear section boundaries. Project galleries alternate image placement on desktop and put the title before the image on mobile.

## Elevation & Depth

Keep movement tied to real content. The virtual camera handles the hero, ScrollTrigger handles page movement and native view transitions handle page navigation. Pause rendering offscreen and keep the same links and preview controls available when the scene falls back to still images.

## Components

Use square editing controls for gallery frames. Keep Cyrillic and Latin on the same type system. The KLPocket image is a capture of the live web app in a clean guest profile. The Dev Blog cover is derived from the project's original file in the Lab.
