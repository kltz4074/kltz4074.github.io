AI generated

# KLTZQU Portfolio

A permanent, fully static portfolio for KLTZQU — an independent game developer focused on atmospheric games, psychological horror and technical gameplay systems.

The site has no backend, database, admin panel or build step. GitHub Pages serves the files directly, while all text and media can be edited from the repository.

## What is included

- dark theme by default, plus an optional light theme;
- Russian and English content;
- projects with `Released`, `In development`, `Paused` and `Prototype` statuses;
- full case-study pages for every project;
- LAB / Experiments;
- adaptive image, GIF and video gallery;
- smooth SPA navigation and GitHub Pages deep-link support;
- content stored separately from the layout and code.

## Edit the main text

Open [`content/site.json`](content/site.json). It contains the home-page text, download count and profile links.

Every translated field uses this format:

```json
{
  "en": "English text",
  "ru": "Русский текст"
}
```

## Add or edit a project

1. Copy any file inside [`content/projects`](content/projects).
2. Rename it to the new project slug, for example `my-game.json`.
3. Edit its title, descriptions, status, links and other fields.
4. Add `"my-game"` to [`content/projects/index.json`](content/projects/index.json).
5. Put the project media inside `media/projects/my-game/`.

The order in `index.json` is the order used on the Projects page.

To show a project on the home page, set:

```json
"featured": true
```

Use one of these exact status values:

```text
Released
In development
Paused
Prototype
```

## Add gallery media

1. Upload an image, GIF, MP4 or WebM into [`media/gallery`](media/gallery).
2. Add an item to [`content/gallery.json`](content/gallery.json).
3. Set `mediaType` to `image` or `video`.
4. Optionally set `projectSlug` so the file also appears on that project's page.

Example:

```json
{
  "id": "backos-window-drag",
  "title": {
    "en": "Window dragging",
    "ru": "Перетаскивание окон"
  },
  "caption": {
    "en": "BackOS running across three monitors.",
    "ru": "BackOS работает на трёх мониторах."
  },
  "imageUrl": "media/gallery/backos-window-drag.webm",
  "mediaType": "video",
  "projectSlug": "backos"
}
```

The gallery automatically adapts its composition to the number of files.

## Edit skills and experiments

- Skills: [`content/skills.json`](content/skills.json)
- LAB: [`content/experiments.json`](content/experiments.json)

Experiment media belongs in [`media/experiments`](media/experiments).

## Local preview

Because the site loads JSON with `fetch`, do not open `index.html` through `file://`. Run any small local static server in the repository folder, for example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deployment

The included GitHub Actions workflow deploys the repository to GitHub Pages after every push to `main`. Pages can also be redeployed manually from the Actions tab.

## Rights

Copyright © KLTZQU. No license is granted for reuse or redistribution of the design, code, text or media.
