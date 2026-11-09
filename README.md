# Wayfare

One trusted, guided journey for international students arriving in Dubai. Built for EV World 2026 (Smart and Sustainable Mobility) with Heriot-Watt University Dubai.

- **Student app** `/app`: a PWA with Home, Journey, Housing, Transit (offline), Budget, Essentials, Community and Me. Responsive: a floating liquid glass tab bar on phones, a sidebar layout on laptops.
- **Landing page** `/`: the story, with the live app embedded as a product shot.
- **Family view** `/share/:token`: a read only budget, chosen place and Day Zero plan. No login.
- **University portal** `/admin`: verify listings, post events, edit checklist steps, review broker reports.
- **API** `/api/v1`: Express 5, MongoDB, Zod.

The original kit instructions are in `docs/kit-readme.md`. The build spec is `PROMPT.md`.

## Setup

Needs Node 24 or newer and MongoDB (local, Docker or Atlas).

```bash
npm install
cp .env.example .env            # then set MONGODB_URI, JWT_SECRET and the demo passwords
npm run seed                    # content, transit network, demo accounts (when DEMO_MODE=true)
npm run dev                     # API on :4000, app on http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | API (tsx watch) and Vite together |
| `npm run seed` | Adds missing content. `npm run seed -- --reset` also resets listings to pending and the demo student to day one (use before the stand) |
| `npm run import-transit` | Rebuilds the metro and tram network from the cached OpenStreetMap data. `-- --refresh` fetches fresh data from Overpass. A GTFS zip at `server/data/gtfs/rta_gtfs.zip` is used first when present |
| `npm test` | Unit and API tests (shared, server, client) |
| `npm run e2e` | Playwright at 390 × 844 with axe, against the dev servers |
| `npm run build` / `npm start` | Production build; Express then serves `client/dist` |

Offline acceptance test (needs the service worker, so it runs on the production build):

```bash
npm run build && (cd client && npx vite preview --port 4173 &)
PREVIEW_URL=http://localhost:4173 npm run e2e
```

## Demo accounts

Only exist when `DEMO_MODE=true`. Emails and passwords come from `.env`.

- **Demo student**: Aanya Mehta, Pune, India, INR, Heriot-Watt University Dubai, arriving 12 days after the seed date. Use "Try the demo" on the Welcome screen.
- **Demo admin**: Heriot-Watt Dubai housing office (demo). Use "Use the demo housing office account" at `/admin/login`.
- **Presenter controls** in Me (demo student only): 12 days to go · Arrive today · Day 10 · Emirates ID received · Reset demo.

## Demo script (about 3 minutes)

1. Landing page on the laptop. Scroll to "Make every arrival / a better beginning.", then Open the app.
2. Try the demo: Home shows 12 days to go, an empty battery and one next step.
3. University portal (second tab, `/admin`): verify a pending listing with its price, deposit, source link, nearest station and walk time.
4. Back in the app, Housing: the place now shows Verified by Heriot-Watt University Dubai, the price in AED and rupees and "About 8 min walk to Dubai Internet City".
5. Turn on airplane mode. Transit, Airport to campus still routes Terminal 1 to campus.
6. Budget: first month in INR, Share with family, open the link on a phone.
7. Me, presenter controls: Arrive today, then Emirates ID received. Tasks unlock with one toast and the battery charges.

## Deploy (one service plus MongoDB Atlas)

Render or Railway, one web service:

- Build: `npm ci && npm run build`
- Start: `npm start`
- Env: `NODE_ENV=production`, `MONGODB_URI` (Atlas), `JWT_SECRET` (32+ random characters), `CLIENT_ORIGIN` and `PUBLIC_URL` (the service URL), `DEMO_MODE`, the demo emails and passwords, `CONTACT_EMAIL`, `HW_EMAIL_DOMAIN`
- After the first deploy run `npm run seed` once (Render shell or a one off job).

Cookies are `Secure` in production, so the site must be served over HTTPS.

## Verify before the demo

Every fact in `server/data/*.json` carries a source and a checked on date (9 Nov 2026). Unknown values stay `null` and the UI says "Ask for price" or "Not set". Before the stand, check:

- [ ] **Listings**: the four providers (The Myriad Dubai, KSK Homes, Yugo Dubailand, Makaan) come from a third party study guide. The Heriot-Watt accommodation office must confirm them, their prices, deposits, addresses and nearest stations before verifying in the portal.
- [ ] **Campus transit**: shuttle to Dubai Internet City (Red Line) and the Knowledge Village tram stop. Confirm with the university.
- [ ] **Silver nol fares** AED 3 / 5 / 7.50 and the student nol card rules and age limits on rta.ae.
- [ ] **Ejari** AED 120 online (wasl) and the Emirates ID requirement.
- [ ] **Emirates ID timing** ("usually 1 to 3 weeks", "two days up to two weeks after biometrics") and the ICP tracking link.
- [ ] **SIM**: e& Visitor Line and du Tourist plan, two Visitor Line SIMs per passport.
- [ ] **Banking**: the Emirates ID application receipt rule varies by bank.
- [ ] **Emergency numbers** 999 / 998 / 997 on u.ae.
- [ ] **KHDA and Dubai Media Office** figures on the landing page (42,026 students, 41 institutions, 35% international, 20% growth, 50% target by 2033).
- [ ] **Placeholders** in `.env`: `CONTACT_EMAIL` (the Partner with us button stays disabled until set) and `HW_EMAIL_DOMAIN` (university group joining).
- [ ] **Privacy and Terms** pages: confirm with the university and add a contact address.
- [ ] **Tram line colour**: OpenStreetMap has no official colour for the Dubai Tram, so it draws in Ink. A GTFS feed with `route_color` replaces it automatically.
- [ ] Run `npm run seed -- --reset` the morning of the demo, then `npm test` and `npm run e2e`.

## Exhibition videos

A 60 second stand loop and a 2:38 full film, built from the real app. See `video/README.md`.

## Data sources and licences

- Transit network © OpenStreetMap contributors, Open Database License (ODbL). Imported from the Dubai Metro Red and Green Line and Dubai Tram route relations.
- Exchange rates by [Exchange Rate API](https://www.exchangerate-api.com) (open.er-api.com, attribution required). Fetched by the server at most once per update window; the client never calls the provider.
- Facts: KHDA, Dubai Media Office, ICP, RTA, Dubai Land Department and wasl, Gulf News, StashAway, Bayut, GDGT ME, u.ae. Links are in the app (Me, About) and the landing footer.
- Design skill `landing-page-design` from elayadesign/ai-design-skills (MIT, licence in `.claude/skills/landing-page-design/LICENSE`).
- Video music: “Inspired” by Kevin MacLeod (incompetech.com), CC BY 4.0.
- Poppins via @fontsource (SIL Open Font License). Icons: Phosphor (MIT).

## Notes on versions

- Built and tested on Node 25.6 (Node 24 LTS is the target; npm prints engine warnings on 25 for a few dev packages, which is harmless).
- Current majors at build time: React 19.3, React Router 8 (library mode), Vite 8, Tailwind 4.3, motion 14, @ssgoi/react 7.5, vite-plugin-pwa 2, Express 5.3, Mongoose 9, Zod 4, Vitest 5, TypeScript 7. No peer conflicts needed overrides.

## Project layout

```
packages/shared   enums, Zod schemas, Day Zero logic, route planner, currency (used by server and the offline client)
server            Express API, models, seed data, transit import, tests
client            Vite app, PWA, Dexie offline store, Playwright e2e
docs              decisions.md, landing-plan.md
```
