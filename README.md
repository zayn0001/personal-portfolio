# Mishal's Portfolio

**Live:** [personal-portfolio-tc9w.onrender.com](https://personal-portfolio-tc9w.onrender.com/) · **Valley:** [/valley](https://personal-portfolio-tc9w.onrender.com/valley/)

> Hosted on Render's free tier: if it's been idle, the first load can take up to a minute while the server wakes up.

My personal portfolio, in two flavours built from the same project data:

- **`/`**: a minimal, typewriter-style page listing my work.
- **`/valley/`**: a multiplayer pixel-art town in the spirit of Stardew Valley. Every house is a project; walk up to its signpost and a book opens with the write-up and a demo video. Other visitors walk around with you in real time.

<p align="center">
  <img src="docs/home.jpg" alt="Minimal portfolio page" width="32%">
  <img src="docs/valley.jpg" alt="The valley: a pixel-art town where each house is a project" width="66%">
</p>
<p align="center">
  <img src="docs/valley-book.jpg" alt="Reading a project's book in the valley" width="80%">
</p>

## Features

**Home page**
- Typewriter heading, monospace type, light and dark themes that follow the system
- Project videos stay still until you hover; click to watch full-size in a lightbox

**The valley**
- Top-down town drawn entirely in code: no image assets, every sprite is `fillRect` plus an outline pass
- One house per project, generated from its title (walls, windows, shutters, door, awning, chimney, roof pitch, ivy...), so it looks the same for every visitor
- Signpost at each door opens a book: scrollable description on the left, demo video on the right, "Visit site" button
- Live multiplayer over WebSocket: visitor count, name tags, minimap, smooth movement
- Random characters built from 15 traits (skin, hair style and colour, eyes, facial hair, clothes, accessories...), with a reroll button on the title screen
- Loading screen that waits for the backend (handles free-tier cold starts)

## Tech stack

| | |
|---|---|
| Frontend | [Vite](https://vite.dev), TypeScript, Canvas 2D (no framework, no game engine) |
| Backend | Node.js `http` + [`ws`](https://github.com/websockets/ws), one process serving the site and the live socket |
| Content | One JSON file per project, loaded at build time with `import.meta.glob` |

Runtime dependencies: just `ws`.

## Getting started

Requires Node.js 20.11 or newer.

```bash
npm install
npm run dev        # http://localhost:5173 (live socket runs inside Vite)
```

Production:

```bash
npm run build      # type-check + bundle to dist/
npm start          # serves dist/ and the socket on $PORT (default 8080)
```

| Script | |
|---|---|
| `npm run dev` | Dev server with hot reload and the multiplayer socket |
| `npm run build` | Type-check and build both pages |
| `npm start` | Production server |
| `npm test` | Unit tests for the server's HTTP range handling |

## Adding a project

Drop a JSON file in `content/projects/`. Both pages pick it up, and the town grows by one house.

```json
{
  "title": "My App",
  "description": ["First paragraph.", "Second paragraph."],
  "url": "https://my-app.example.com",
  "video": "/projects/my-app/demo.mp4",
  "order": 2,
  "roof": "#4f7fc0"
}
```

| Field | Required | |
|---|---|---|
| `title` | yes | Also seeds the house's look; rename to get a different house |
| `description` | yes | A string, or an array of paragraphs |
| `url` | yes | Opened by "visit" / "Visit site" |
| `video` | no | Path to a file in `public/` (mp4 or webm). Keep it small, a few MB |
| `order` | no | Lower comes first |
| `roof` | no | Roof colour; defaults to one picked from the title |

Videos live in `public/projects/<name>/`, e.g. `public/projects/my-app/demo.mp4` → `"video": "/projects/my-app/demo.mp4"`.

## Project structure

```
content/projects/   one JSON per project (the only thing you edit to add work)
public/projects/    demo videos
index.html          home page          → src/home.ts, src/home.css
valley/index.html   the valley         → src/valley.ts (+ world.ts, sprites.ts, book.ts, live.ts, style.css)
src/projects.ts     loads + sorts the JSON, shared by both pages
server/             production server: static files (with range requests), live socket, tests
```

## Deployment

The valley's multiplayer needs a running Node process, so deploy to something like Render, Railway or Fly.io:

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`

- **Health check path:** `/healthz` (returns `{"status":"ok"}`)

The server reads `$PORT`. Visitor state is in memory, so a restart just makes everyone reconnect.

To host the pages statically elsewhere (e.g. Netlify) and run only the socket on a Node host, build with
`VITE_WS_URL=wss://your-node-host/live npm run build`.

## License

[MIT](LICENSE)
