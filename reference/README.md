# Design reference

These files are the working HTML/React prototype for the Relay Customer Hub UI.
They are **read-only design reference** for the production Next.js build — not
files that ship in the production app.

The MVP build plan (`Relay_MVP_Build_Plan.xlsx`) references these as the source
of truth for visual style, layout, and design tokens. Claude Code should `view`
them when building UI components.

## Files

- **`design.md`** — full design brief: tech stack, design tokens, layout specs
  per screen, interaction details, accessibility requirements.
- **`styles.css`** — every CSS variable, channel color, gradient, layout rule,
  and component style used by the prototype. Port these tokens into the Next.js
  app's Tailwind config + globals.css.
- **`Relay_Customer_Hub.html`** — entry point; shows how the React scripts are
  wired together.
- **`shell.jsx`** — Sidebar and Topbar components.
- **`dashboard.jsx`** — Dashboard screen with stat cards, charts, world map,
  agent performance, channel mix donut, latest activity feed.
- **`conversations.jsx`** — Conversations screen: channel rail, conversation
  list, thread view, message bubbles, composer, contact panel.
- **`icons.jsx`** — Inline SVG Lucide-style icons + channel glyphs.
- **`mock-data.js`** — Shape of every data structure the UI consumes
  (conversations, messages, contacts, stats, channels). Useful when defining
  TypeScript types in `src/types/`.
- **`app.jsx`** — Root component, routing between Dashboard and Conversations.

## Viewing the prototype locally

The prototype runs from any static file server:

```bash
cd reference
python3 -m http.server 8080
# Open http://localhost:8080/Relay_Customer_Hub.html
```

## Don't edit these

If the design needs to change, update the production code in `src/` — these
files freeze the original spec for diffing against later work.
