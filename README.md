# Aleksandr Kandakov — Portfolio

Personal portfolio site of **Aleksandr Kandakov**, Senior Unity Developer.
Live at **https://sankaaa62.github.io** (goes live after deployment is wired up).

Built with [Astro 7](https://astro.build), a dark game-style theme, and full **EN/RU** localization.

## Structure

- `src/content/projects/en/*.md`, `src/content/projects/ru/*.md` — featured project case studies (one Markdown file per locale per project, matched by filename/slug).
- `src/content/prototypes/prototypes.json` — metadata for the prototype grid (id, title, genre per locale, year, whether a video clip exists).
- `public/media/prototypes/<id>/` — prototype media: `icon.webp` and optional `clip.webm` per prototype, plus a `poster.jpg` fallback frame.
- `src/components/` — Astro components: `Hero`, `FeaturedCard`, `ProjectPage`, `PrototypeGrid`, `Skills`, `Metrics`, `Contact`, `MiniGame`, `HomePage`.
- `src/layouts/Base.astro` — shared HTML shell (meta tags, favicon, fonts).
- `scripts/` — content/media tooling (see below).

## Commands

```bash
npm run dev        # start local dev server
npm run build      # production build to dist/
npm run preview    # preview the production build
npm run validate   # validate content collections (scripts/validate-content.mjs)
```

`npx astro check` runs the TypeScript/Astro type checker.

## Adding a featured project

1. Create a Markdown file in **both** `src/content/projects/en/<slug>.md` and `src/content/projects/ru/<slug>.md` with matching filenames.
2. Fill in the frontmatter (see `src/content.config.ts` for the schema):

   ```yaml
   ---
   title: "Project Name"
   tagline: "One-line pitch"
   role: "Your role"
   period: "2024 — 2025"
   genre: "Genre"
   platforms: ["Android", "iOS"]
   metrics: ["1M+ installs", "Team of 5"]
   stack: ["Unity", "C#", "..."]
   links:
     - { label: "Google Play", url: "https://..." }
   youtube: "VIDEO_ID"   # optional
   order: 1              # sort order on the homepage
   ---
   ```
3. Body text below the frontmatter is the project description shown on the project page.
4. Run `npm run validate` to confirm the content collection is well-formed.

## Refreshing prototype media

1. `node scripts/harvest-media.mjs` — scans the local project archive (hardcoded path inside the script) and copies candidate icons/videos into `media-staging/<id>/icons/` and `media-staging/<id>/videos/`.
2. Curate the best candidates: pick one icon and one video per prototype and place them as `media-staging/<id>/chosen-icon.png` and `media-staging/<id>/chosen-video.mp4`.
3. `node scripts/compress-videos.mjs` — transcodes/compresses the chosen media into `public/media/prototypes/<id>/` (requires `ffmpeg` on `PATH`).

## Deploy

Deployment is automated via **GitHub Actions**, building the site and publishing `dist/` to **GitHub Pages** on every push to `main`.

## Docs

- Design spec: [`docs/superpowers/specs/2026-07-02-portfolio-site-design.md`](docs/superpowers/specs/2026-07-02-portfolio-site-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-07-02-portfolio-site.md`](docs/superpowers/plans/2026-07-02-portfolio-site.md)
