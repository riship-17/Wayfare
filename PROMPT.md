# Wayfare: build prompt for your AI IDE

> **How to use this file (for the team, not the agent)**
> 1. Create an empty folder called `wayfare`, unzip this kit into it, and open it in Cursor, Claude Code, Windsurf or Codex.
> 2. Tell the agent: **"Read PROMPT.md and every file it points to, then start Phase 0. Stop and show me after each phase."**
> 3. Everything below the line is written to the agent.

---

## 0. Your role and mission

You are a senior full stack engineer and product designer. Build **Wayfare**, a mobile first MERN web app (installable PWA) that helps international students arrive in Dubai with one trusted, guided journey. The app must work as a live demo at **EV World 2026 (Smart and Sustainable Mobility)** and as a real foundation the team can keep building.

The build must show two things at once:

1. **The idea**: the problem is not the absence of services, it is the absence of coordination. Admission is connected, arrival isn't.
2. **The implementation**: a working Day Zero ecosystem with verified housing, an offline RTA transit map, a budget in the student's home currency, smart checklists that understand the Emirates ID gap, and a university portal that verifies listings live.

Work in phases (section 17). After each phase, run the app, check it at 390 × 844, and stop for review. Never rebuild everything at once.

---

## 1. Read these first

| File in this kit | What it is | How to use it |
|---|---|---|
| `reference/wayfare-brand-guidelines.png` | The brand sheet. **Highest design authority.** | Colours, type, shape, voice, do and don't |
| `assets/brand/tokens.css` | Brand sheet turned into Tailwind v4 tokens and named text styles | Copy to `client/src/styles/tokens.css` and use it everywhere |
| `.claude/skills/landing-page-design/SKILL.md` | Design skill from github.com/elayadesign/ai-design-skills (MIT) | Part A for the landing page. Part B (visual system), B8 (content realism), B9 (states), B10 (ship list) for everything |
| `reference/wayfare-poster-full.jpg` and `reference/poster-*.png` | The team's EV World 2026 poster, cropped by section | Source of truth for content, story and feature list |
| `reference/app-mockup-from-poster.png` | The first app mockup | Layout reference for Welcome, Home and Housing. Fix its issues (section 6.9) |
| `assets/illustrations/*.png` | Skyline line art and EV charging art from the poster (cream and transparent versions) | Onboarding, empty states, journey complete, landing page |
| `assets/brand/*.svg` | Pin mark, logo lockup, favicon | App icon, header, splash, PWA icons |
| `reference/inspiration/*.jpg` | Screenshots of ssgoi.dev, glass.samasante.com, 60fps.design, 21st.dev, withanimation.app, and an accent colour lesson | Motion and component inspiration (section 7) |

**Install the design skill for your tool** (it is already in `.claude/skills/` for Claude Code):

```bash
npx skills add elayadesign/ai-design-skills --skill landing-page-design -a claude-code -a cursor -y
```

**Rule priority when sources disagree:** user instructions in this prompt → brand sheet → design skill → library defaults. Section 6.1 lists every known conflict and how it is resolved. Do not re-decide them.

---

## 2. The product

### 2.1 Context (verified, see section 13 for sources)
Dubai's private higher education sector had **42,026 students at 41 institutions** in 2024–25, enrolment grew about **20%**, and **35%** of students are international. Dubai aims for international students to be 50% of the student body by 2033.

### 2.2 The problem
Students arrive with five challenges: housing uncertainty (finding verified accommodation), documentation complexity (visa, Emirates ID, formalities), financial pressure (budgeting, local costs), fragmented information (many platforms, no single guide) and adjustment (academics, culture, community).

The sharpest pain is the **Emirates ID gap**. The card is delivered only after the residence visa is issued, which can take one to three weeks after landing. Meanwhile resident SIM plans, bank accounts, Ejari tenancy registration, DEWA utilities and the student nol card all ask for it. Students fill the gap with unverified WhatsApp brokers and informal providers, and families overpay.

### 2.3 The insight
"The problem is not the absence of services. It is the absence of coordination."

### 2.4 The solution: DAY ZERO, Fully Charged
One platform, three stages, one connected journey. Each stage keeps its colour everywhere.

| Stage | When | Colour | Covers |
|---|---|---|---|
| **1 Prepare** | Before departure | Sunshine `#FEC93B` | Verified housing, personalised checklists, document guidance, budget in home currency, offline map download |
| **2 Arrive** | Day Zero to Day 6 | Lilac `#C8B7EE` | Airport to campus transit, SIM and transport card, essential services, medical and biometrics |
| **3 Settle** | Week 1 onwards | Blush `#F4B5C8` | Track progress, Emirates ID unlocks, banking, Ejari, university support, community |

Sage `#A6D6B0` means verified, success and insight. Never use it as a stage colour.

### 2.5 Key features (from the poster)
Verified accommodation · Smart checklists · Essential services guide · Offline RTA transit maps · Student community · University integration.

### 2.6 Impact story
Safer choices (verified information) · Smarter mobility (transit first journeys) · Stronger community · A global education hub for Dubai.
Mobility roadmap shown in the app as "Coming next": housing matched to metro and campus access (partly live: every listing shows its nearest station), EV, charging and shared mobility partners. Seeking partners: mobility operators, charging providers, policymakers, investors. **Never invent partner names.**

### 2.7 Team credit (footer and About screen)
In collaboration with Heriot-Watt University Dubai · Design Management Project. Supervisor Professor: Houma. Members: Vruti Lakhani, Jhanvi Bhatt, Ahmed Amr Elsaey, Sina Zendaki, Keerthana Janakiraman.

---

## 3. What to build

1. **Student app** at `/app/*`: mobile first PWA. On screens 768px and wider it renders inside a centred phone frame (390 × 844, `rounded-4xl`, 2.5px navy outline) on cream, with the skyline illustration along the bottom, so it presents well on a laptop at the stand.
2. **Landing page** at `/`: one page that tells the story and embeds the live app in a phone frame (`<iframe src="/app?embed=1">`). Built with the design skill, Part A then Part B.
3. **Family view** at `/share/:token`: read only budget and chosen listing for parents, no login.
4. **University portal** at `/admin/*`: desktop layout for institution staff to verify listings, post events, edit checklist steps and review broker reports.
5. **REST API**: Node and Express with MongoDB.

---

## 4. Tech stack

Use current stable versions. If a peer dependency conflict appears, choose versions that satisfy peers and note it in the README.

**Monorepo** with npm workspaces: `client`, `server`, `packages/shared`. TypeScript everywhere. One root `npm run dev` that starts both (use `concurrently`).

**Client**
- Vite + React 19 + TypeScript
- Tailwind CSS v4 via `@tailwindcss/vite`, configured CSS first with `tokens.css`
- React Router (library mode, import from `react-router`)
- TanStack Query for server state, Zustand for small UI state
- `motion` (`motion/react`) for micro interactions
- `@ssgoi/react` for native style page transitions (section 7.2). Read https://ssgoi.dev/llms.txt and the installed README before wiring. Current versions use `framework.useRoute` plus `SsgoiLayoutBoundary`; do not use the deprecated `SsgoiTransition` wrapper
- `@samasante/liquid-glass` for the floating tab bar only (section 6.7)
- `@phosphor-icons/react` for icons
- shadcn/ui primitives (Radix) restyled to tokens, `vaul` for bottom sheets, `sonner` for toasts. Components from 21st.dev are allowed only after restyling to tokens (section 7.4)
- `vite-plugin-pwa` (Workbox) and `@vite-pwa/assets-generator` for icons from `assets/brand/favicon.svg`
- Dexie for IndexedDB (offline data and the sync outbox)
- react-i18next with English strings in one file. Use logical CSS properties (`ms`, `me`, `ps`, `pe`, `start`, `end`) so Arabic RTL can be added later

**Server**
- Node 24 LTS, Express 5, Mongoose, Zod (schemas shared from `packages/shared`)
- Auth: email and password with bcrypt, JWT in an httpOnly, Secure, SameSite=Lax cookie. Roles: `student`, `institution_admin`, `platform_admin`
- helmet, CORS allowlist, express-rate-limit on auth and write routes, pino-http logging
- In production Express serves `client/dist` so the whole thing deploys as one service
- MongoDB Atlas (free tier is fine). Local dev may use a local MongoDB

**Testing**: Vitest + React Testing Library, Supertest, Playwright (viewport 390 × 844) with `@axe-core/playwright`.

---

## 5. Repository structure

```
wayfare/
  package.json            # workspaces + root scripts: dev, build, start, seed, test, e2e
  .env.example            # MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN, DEMO_STUDENT_EMAIL/PASSWORD, DEMO_ADMIN_EMAIL/PASSWORD
  PROMPT.md               # this file
  README.md               # setup, scripts, deploy, data sources, what to verify before the demo
  .claude/skills/landing-page-design/
  assets/ reference/      # from this kit, untouched
  packages/shared/src/    # zod schemas, enums (Stage, Phase, Requirement, EidStatus), shared types
  server/src/
    app.ts  index.ts  env.ts
    models/  routes/  middleware/  services/ (journey.ts, rates.ts, transit.ts)
    seed/   data/*.json   # seed content, every fact carries source + checkedOn
    scripts/import-transit.ts
  client/src/
    main.tsx  router.tsx  ssgoi.ts  i18n/en.json
    styles/index.css  styles/tokens.css
    components/ (ui/, brand/, journey/, housing/, transit/, budget/)
    features/   (onboarding, home, journey, housing, transit, budget, essentials, community, me, share, admin, landing)
    lib/        (api.ts, db.ts dexie, offline.ts, currency.ts, geo.ts)
  client/public/offline/  # transit.json, essentials.json generated by scripts, precached
```

---

## 6. Design system

### 6.1 Resolved conflicts (brand sheet vs design skill)

| Topic | Decision |
|---|---|
| Font | Poppins only (allowed by both). Load 400, 600, 700 from Google Fonts or self host. No italics anywhere |
| Headline weight | Bold 700 (brand). Labels SemiBold 600, body Regular 400 |
| Type sizes | Tailwind scale steps only (skill). Brand sizes snap down: H1 56 → `text-5xl` 48 (landing hero only), H2 32 → `text-3xl` 30, H3 20, Body 16, Caption 12 stay. In the app use the named styles in `tokens.css` |
| Hero heading colour | Solid navy (brand: text is always navy on cream). **Do not** use the skill's gradient heading text. Emphasis = a phrase on a Sunshine pill, like "before you land." on the brand sheet |
| Dark mode | None. Light cream app with navy panels as accents (brand: never mix in dark palettes). Ignore the skill's dark backgrounds |
| Spacing | Skill scale only: 0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96px (Tailwind steps 0, 0.5, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24). Generous padding: cards `p-6`, screen gutters `px-4` (`px-6` from 768px) |
| Radius | Cards 24px `rounded-3xl`, buttons and chips `rounded-full`, phone frame `rounded-4xl`. Nested shapes follow the skill's formula: inner = outer minus gap, when gap < 32px |
| Buttons | Landing page: skill padding 8px × 12px. In the app, primary buttons are 48px tall and full width (touch target), `px-6` |
| Copy | No hyphens in UI copy and no orphans (skill), except the fixed brand line "Trusted. Simplified. Student-Centric." Sentence case for headings and buttons. Overlines and stage labels use the caps style |
| Icons | Phosphor (allowed by skill). Match the brand's 2px rounded line: `weight="bold"` at 20px for inline and nav, `weight="regular"` at 32px for feature tiles. Navy, never filled colour icons, never emoji |
| Gradients | None, anywhere |

### 6.2 Colour rules
- Ratio: about **60% cream, 25% pastels, 15% navy** on every screen.
- Text is navy on cream or pastel. Text is white or Sunshine on navy. **Never put pastel text on cream** (contrast is 1.4 to 1.7:1).
- Secondary text: `navy-muted #626086` on cream only (5.5:1).
- Pastels mean things: Sunshine = Prepare and highlights, Lilac = Arrive and accommodation, Blush = Settle and community, Sage = verified and success. Do not use a pastel decoratively where it would contradict that meaning.
- Checked contrast: navy on cream 12.8:1, on Sunshine 9.0:1, Lilac 7.6:1, Blush 8.1:1, Sage 8.5:1. White on navy 13.8:1. Sunshine on navy 9.0:1.
- **Accent rule** (from `reference/inspiration/accent-colour-lesson.jpg`): a restrained base plus one accent tells people exactly where to click. In Wayfare the click accent is the **navy pill** on cream and the **Sunshine pill** on navy. One primary action per screen, never two (brand don't).
- Transit lines are the only non brand colours allowed: use each line's official colour from the data (`route_color`) so the map matches station signage.

### 6.3 Type
Use only the named utilities from `tokens.css`: `type-display`, `type-heading-1/2/3`, `type-title`, `type-body`, `type-body-sm`, `type-label`, `type-caption`, `type-overline`, `type-button`, `type-button-sm`, and `type-hero` on the landing page. They are prefixed `type-` so shadcn's `cn()` (tailwind-merge) never strips them against `text-navy`. Never set a loose size and weight on an element.

### 6.4 Shape and components (brand sheet section 06)
- White cards: `bg-white rounded-3xl card-outline p-6`. Coloured cards: pastel background, no outline.
- Buttons: Primary (navy fill, white label), Highlight (Sunshine fill, navy label), Chip (cream or white, 2.5px navy outline). All `rounded-full`.
- Every interactive element ships hover, active (`scale-[0.98]`), focus visible, loading (skeletons shaped like the content, no spinners), empty, error, disabled (skill B9).
- No drop shadows on cards. Floating surfaces (tab bar, sheets) may use one soft shadow `0 8px 24px rgb(37 38 94 / 0.08)`.

### 6.5 Brand components to build
- `<WayfarePin/>` from `assets/brand/wayfare-pin.svg` and `<WayfareLogo/>` (pin + "Wayfare" in Poppins Bold). Clear space equal to the pin width, minimum 24px high, only navy, white or Sunshine (brand section 05).
- `<StageChip stage>`: "1 Prepare", "2 Arrive", "3 Settle" in stage colours.
- `<JourneyBattery value phases>`: a navy outlined battery with four cells (Before arrival, Arrival Day 0 to 7, Initial settlement Day 7 to 30, Adjustment Month 1 to 6) filled in stage colours, a bolt icon, and a percent label. At 100% it turns Sage and shows the EV charging illustration with "Fully charged".
- `<VerifiedBadge institution>`: Sage chip with a shield check icon, "Verified by Heriot-Watt University Dubai". Pending state: outlined chip "Not verified yet".
- `<NeedsChip requirement>`: Passport · Entry permit · Emirates ID · Enrolment letter · Ejari. Emirates ID chips show a lock icon while the card is not received.
- `<OfflineChip>`: "Saved for offline" with a check, or "Offline. Showing info saved on 9 Nov".
- `<PhoneFrame>`: wraps the app at 768px and wider.

### 6.6 Navigation
Floating tab bar, bottom centre, `rounded-full`, five tabs: **Home, Journey, Housing, Transit, Me**. Icons Phosphor bold 20px, labels `type-caption`. Active tab: Sunshine pill behind icon and label. Budget, Essentials and Community open from Home tiles and keep the tab bar.

### 6.7 Liquid glass (glass.samasante.com)
Use `<Glass>` from `@samasante/liquid-glass` for the floating tab bar only, tinted navy (`rgba(37,38,94,0.84)`) with white and Sunshine content. In Chrome and Edge it bends the live page; Safari and Firefox get frost and tint, which is expected. If `prefers-reduced-transparency: reduce` or the component fails, render a solid navy pill. Never put body text on glass. Keep it out of the landing page except the embedded app.

### 6.8 Illustrations and imagery
- `dubai-skyline-line` along the bottom of Welcome, the phone frame stage, empty states and the landing footer.
- `ev-charging` on the journey complete state, the "Charged by Wayfare" moments and the landing hero and impact section.
- Use the `-transparent` versions on white cards, the cream versions on cream.
- Listing photos: provider supplied only, with alt text and credit. Until then show a branded placeholder (Lilac card, building icon, provider name). **Never use stock photos that pretend to be a real property.**

### 6.9 Fix these issues from the first mockup
The mockup in `reference/app-mockup-from-poster.png` is a layout reference, not a spec. Change: the house emoji and coloured emoji style icons (use navy Phosphor line icons), the star rating and "120 reviews" (brand: never invent reviews; use the verified badge), the gradient photo banner (flat colour plus skyline art), "Hello, Student!" (no exclamation marks; use the student's name), the brick toy mascot (do not reuse it; the pin and the EV illustration are the brand characters), and the crowded tile grid with several equal calls to action (one primary action per screen).

---

## 7. Motion system

### 7.1 Base rules (skill B7)
- Base curve `ease-wayfare` = `cubic-bezier(0.22, 1, 0.36, 1)`, 500ms for layout and position, 300ms for colour and opacity, never under 200ms. Never `ease`, `linear` or `ease-in-out`.
- Animate only `transform` and `opacity`.
- Reduced motion: use `useReducedMotion()` from `motion/react` and an equivalent flag in the SSGOI config. Movement becomes a plain opacity change.
- Scroll reveals on the landing page: rise 32px and fade over 600 to 800ms, once, with `whileInView` or IntersectionObserver. No unthrottled scroll listeners.

### 7.2 Page transitions with SSGOI (ssgoi.dev)
Wire `<Ssgoi config framework>` inside the router, `framework = { useRoute: () => useLocation() }`, and a `SsgoiLayoutBoundary` around the `<Outlet/>` of the app layout. The outer shell needs `relative z-0 overflow-x-clip`. Map:

| Navigation | Transition |
|---|---|
| Between the five tabs (ordered) | `slide()` |
| Onboarding and profile setup steps (ordered) | `slide()` |
| Journey list → task detail, Essentials list → service | `drill()` |
| Housing card image → listing detail | `zoom()` (shared keys on the card image and the detail hero) |
| Filters, share with family, EID status update | `sheet()` |
| Everything else | `fade()` |

### 7.3 Signature moments (study 60fps.design and withanimation.app for feel)
1. **Charging battery**: when a task is marked done, a charge pulse runs along the battery and the next cell fills; the bolt scales 0.9 → 1.
2. **Checklist tick**: the check path draws (`pathLength`), then the row moves to "Done" with a layout animation.
3. **Countdown roll**: "12 days to go" rolls digit by digit when the day changes.
4. **Route draw**: on the transit map the route stroke draws from origin to destination; station dots appear 60ms apart, capped at 400ms total.
5. **Currency tween**: totals count to the new value when the home currency changes.
6. **Unlock**: when the Emirates ID is marked received, locked tasks shake off their lock icon and slide into "Do now", with one calm toast: "Emirates ID received. 5 tasks are ready."
7. **Landing tagline reveal** (skill B11): "Make every arrival / a better beginning." words move from 30% to full navy one at a time.

withanimation.app is SwiftUI: borrow timing and choreography only, never its code. 60fps.design has an optional MCP server that needs a license; if the team has one, use it to search shots for "progress charging", "checklist complete", "bottom sheet", "onboarding carousel", "map route".

### 7.4 Components from 21st.dev (optional)
If the team adds the 21st.dev Magic MCP (`npx @21st-dev/cli@latest install <client> --api-key <key>`), you may fetch component ideas. Every imported component must be restyled to tokens: Poppins, brand colours, no gradients, no glow, no dark or neon surfaces, Phosphor icons, full state set. If restyling would change its character, rebuild it.

---

## 8. Screens

One primary action per screen (marked ★). Every screen has loading, empty, error and offline states.

### 8.1 Welcome `/app/welcome`
Three slides, one per stage, stage colour block, skyline art at the bottom.
- "Feel at home before you land." / "One trusted journey for students arriving in Dubai."
- Prepare: "Sort housing, documents and money before you fly."
- Arrive: "Get from the airport to campus on Day Zero."
- Settle: "Track what is left and meet your people."
★ "Get started". Secondary text link: "I already have an account". Footer link: "Try the demo".

### 8.2 Set up `/app/setup/:step`
One question per screen, battery at the top fills as they go: university (search verified institutions), arrival date, home country and currency, housing need (need a place / university residence / sorted), Emirates ID status (default: not started). ★ "Continue".

### 8.3 Home `/app`
- Greeting: "Hi Aanya" and a stage aware line: before arrival "12 days to go", Day 0 to 6 "Day 2 in Dubai", later "Week 3 in Dubai".
- `<JourneyBattery>` card with the current phase name.
- **Your next step** card ★ (the single highest priority available task, one button).
- **Emirates ID card**: status, "usually 1 to 3 weeks after you land", and "Here is what works today" linking to Day Zero ready tasks.
- Tiles (secondary): Budget, Essentials, Community, Checklist. Navy line icons on white outlined cards.
- Upcoming events from the student's university (empty state: "No events yet. Your university posts them here.").
- Brand line somewhere calm: "You're never alone here."

### 8.4 Journey `/app/journey` and `/app/journey/:key`
Tabs Prepare, Arrive, Settle (stage colours). Groups: **Do now**, **Unlocks with your Emirates ID** (locked rows show the bridge option), **Done**. Detail: why it matters, steps, documents needed (`NeedsChip`s), where to go, cost if known, official links, bridge option. ★ "Mark as done".

### 8.5 Housing `/app/housing` and `/app/housing/:id`
- List of listings linked to the student's university. Card: photo or placeholder, provider and area, `VerifiedBadge`, price "AED {price} a month" with "≈ {home currency amount}" underneath when verified, otherwise "Ask for price", transit chip "About 8 min walk to {station} ({line})", distance to campus.
- Filter sheet: budget (in home currency), room type, near metro or tram, women only, bills included.
- Detail: gallery, what is included, house rules, location card with nearest station and campus distance, **Before you pay** card ("See the contract before you pay a deposit." / "Check the agent's licence on the Dubai Land Department site." / "Report anything that feels wrong."), and an Ejari note ("Ejari needs your Emirates ID. Ask the provider how they handle your first weeks."). ★ "Request a viewing". Secondary: Save, "Use this in my budget".
- Broker report form (from detail and from Me): contact, what happened. Goes to the admin queue.

### 8.6 Transit `/app/transit` (works fully offline)
- Schematic map generated from the transit data: Red and Green metro lines and the tram, stations in order, interchanges marked. Pinch zoom and pan with transforms only.
- `<OfflineChip>` always visible.
- Preset card ★ "Airport to campus" (DXB Terminal 1 or 3 → the student's campus stations). Search from and to.
- Route result: steps (walk, line and direction, change at, tram), approximate time (label it "about"), fare estimate for a Silver nol card by zones crossed when zone data exists, otherwise show the range AED 3 to 7.50 and link to RTA.
- Cards: "Buy a Silver nol card at the airport metro station", "Student nol card: 50% off, needs your Emirates ID", "Terminal 2 has no metro station".

### 8.7 Budget `/app/budget`
- Items grouped: Before you fly, First month, Every month. Each shows AED, home currency, a `NeedsChip` if it needs the Emirates ID, and its source.
- Rent and deposit come from the chosen verified listing; other unknown amounts ask the student to type their quote ("Use the number from your offer letter. We never guess your rent.").
- Totals in AED and home currency with the rate date and "Rates by Exchange Rate API" link.
- ★ "Share with family" opens a sheet that creates a read only link.

### 8.8 Essentials `/app/essentials`
Service cards with a clear tag: **Day Zero ready** (works with your passport) or **After your Emirates ID**. Seed services in section 13.3. Each detail drills in with steps, documents, bridge, official links, source and "checked on" date.

### 8.9 Community `/app/community`
Verified groups (my university, my home country) with announcements and events. Joining needs an email on the university's domain (configurable per institution). Event RSVP. Report button on every post. No private messages between strangers in v1.

### 8.10 Me `/app/me`
Profile, arrival date, home currency, Emirates ID status (sheet with the steps in 9.2), offline downloads with sizes and "last saved", language, report a broker, About (team credit, data sources, licences), sign out. **Never ask for a passport or Emirates ID number, and never accept document uploads in v1.**

### 8.11 Family view `/share/:token`
Wayfare logo, "Aanya's first month in Dubai", the budget in the family's currency, the chosen listing with its verified badge, and the Day Zero plan. No login, no personal contact details, link can be revoked from Me.

### 8.12 University portal `/admin`
Desktop layout. Login as `institution_admin`. Pages: Listings (queue Pending / Verified / Rejected; verifying requires price per room type, deposit, source URL and date, then the badge shows), Events (create, edit), Checklist (edit steps and links of tasks for this institution), Broker reports (review, mark handled). This is the live "University integration" moment in the demo.

### 8.13 Landing page `/`
Follow the skill's Part A output format first (outline, hero copy, benefits, how it works, FAQ, SEO, layout choice), then build section by section:
1. Floating nav: logo, How it works, Features, For universities, ★ "Open the app".
2. Hero (layout A): "Feel at home" + Sunshine pill "before you land." · sub: "Wayfare is one trusted, guided journey for international students arriving in Dubai. Verified housing, an offline transit map and real costs in your home currency, ready before Day Zero." · ★ "Open the app" · proof line "42,026 students now study in Dubai. 35% are international. Source: KHDA, 2024–25." · visual: live app in `<PhoneFrame>` plus the EV charging art. Heading and sub max width 680px, meaningful line breaks.
3. Problem: "Admission is connected. Arrival isn't." five challenge cards.
4. Insight (Sage card): the research quote.
5. Tagline reveal (B11): "Make every arrival / a better beginning."
6. How it works: Prepare, Arrive, Settle cards in stage colours.
7. Features: the six key features with navy line icons.
8. The Emirates ID gap: two columns, "Works on Day Zero" (Sage) and "After your Emirates ID" (Lilac), from the essentials data.
9. Impact: four impact cards and the navy "Driving smart and sustainable student mobility" panel with the roadmap and "Seeking partners".
10. For universities: what the portal does. ★ secondary CTA "Partner with us" (mailto `{{contact_email}}`).
11. FAQ (six to eight, factual only): Who verifies listings? Does the transit map work offline? Do I need an Emirates ID to use Wayfare? Which currencies can I see? What data do you keep? Is Wayfare a government service? (No, it links to official sources.) Which universities are on Wayfare?
12. Final CTA identical to the hero. Footer: team credit, EV World 2026 mark, data source credits, privacy, terms.
SEO: index it. Title "Wayfare: feel at home in Dubai before you land". Write a meta description, og:image (make one from the brand), favicon, skip link, custom 404 in brand.

---

## 9. Day Zero logic (the heart of the app)

### 9.1 Stage and phase
- `phase` (four, for the battery): `before_arrival` (today < arrivalDate), `arrival` (Day 0 to 6), `initial_settlement` (Day 7 to 30), `adjustment` (Month 1 to 6).
- `stage` (three, for colour and copy): before_arrival → Prepare, arrival → Arrive, initial_settlement and adjustment → Settle.
- Battery: each cell = completed / applicable tasks of that phase; total = average of cells. Put this in `server/src/services/journey.ts` and unit test it.

### 9.2 Emirates ID status (entered by the student; never claim live government tracking)
`not_started → entry_permit_issued → arrived → medical_done → biometrics_done → residence_issued → card_received`
Link to the official ICP site for tracking. Show the estimate "usually 1 to 3 weeks after you land" as an estimate.

### 9.3 Requirements and unlocks
Each task template has `requires: Requirement[]` from: `passport`, `entry_permit`, `enrolment_letter`, `residence_issued`, `emirates_id`, `ejari`.
- `emirates_id` unlocks at `card_received`.
- Banking uses `residence_issued` with the note "Many banks accept the Emirates ID application receipt once your visa is issued. Ask your bank first."
- DEWA requires `ejari`.
- A task is **available** when every requirement is met, **locked** otherwise. Locked tasks show the requirement and, where one exists, a **bridge** (what to do meanwhile).

### 9.4 Seed task templates (global; institutions can edit steps and links)

| Phase | Task | Requires | Bridge while locked |
|---|---|---|---|
| before_arrival | Choose a verified place to live | passport | |
| before_arrival | Confirm your entry permit with your university | | |
| before_arrival | Get your documents ready (passport validity, offer letter, entry permit, photos) | | |
| before_arrival | Plan your first month budget | | |
| before_arrival | Save the transit map for offline | | |
| before_arrival | Plan airport to campus | | |
| arrival | Get a visitor SIM at the airport | passport, entry_permit | |
| arrival | Buy a Silver nol card at the airport metro station | | |
| arrival | Get to your residence | | |
| arrival | Do your medical fitness test (your university guides you) | entry_permit | |
| arrival | Register your biometrics for the Emirates ID | entry_permit | |
| arrival | Visit student services on campus | enrolment_letter | |
| initial_settlement | Open a bank account | residence_issued | Keep using your home card for now |
| initial_settlement | Register your tenancy (Ejari) if you rent privately | emirates_id | Ask your provider how they handle your first weeks |
| initial_settlement | Connect DEWA utilities if your contract needs it | ejari | |
| initial_settlement | Move to a resident SIM plan | emirates_id | Your visitor line works meanwhile |
| initial_settlement | Apply for the student nol card (50% off) | emirates_id, enrolment_letter | Use your Silver nol card |
| adjustment | Join your university community | | |
| adjustment | Find study and wellbeing support on campus | | |
| adjustment | Explore the city by metro and tram | | |

---

## 10. Data model (Mongoose)

- **User**: name, email, passwordHash, role, institutionId, homeCountry, homeCurrency (ISO 4217), arrivalDate, eidStatus, eidStatusUpdatedAt, savedListingIds, chosenListingId, language, isDemo, timestamps. No document numbers.
- **Institution**: name, slug, area, location (GeoJSON Point), emailDomains[], nearestTransit[{ stationId, mode, note }], website, adminIds[].
- **Listing**: institutionIds[], providerName, title, area, location (Point, 2dsphere index), roomTypes[{ type, priceAedMonthly|null, depositAed|null }], billsIncluded[], amenities[], womenOnly, photos[{ url, alt, credit }], contact { website, phone? }, transit { stationId, walkMinutesApprox }, campusDistanceKm, verification { status: pending|verified|rejected, verifiedBy, verifiedAt, sourceUrl, notes }.
- **TaskTemplate**: key, phase, title, summary, steps[], requires[], bridge?, officialLinks[{ label, url }], costItemKeys[], institutionId|null, order.
- **UserTask**: userId, key, status (todo|done|skipped), doneAt. Unique on (userId, key).
- **CostItem**: key, label, timing (before|first_month|monthly), amountAed|null, needsEmiratesId, source { label, url, checkedOn }.
- **Budget**: userId, items[{ key, amountAed }], homeCurrency, shareToken, shareRevokedAt.
- **ExchangeRates**: base 'AED', rates, fetchedAt, nextUpdateAt, provider.
- **TransitStation**: stationId, name, nameAr?, mode (metro|tram), lineIds[], location, zone?.
- **TransitLine**: lineId, name, mode, color, stationIds[] (ordered).
- **Event**: institutionId, title, startsAt, place, description, createdBy, rsvpUserIds[].
- **Group**: institutionId, name, kind (university|home_country|interest), posts[{ authorId, body, createdAt, reported }].
- **ServiceGuide**: key, title, dayZeroReady, needs[], steps[], bridge?, links[], source { label, url, checkedOn }.
- **BrokerReport**: reporterId, listingId?, contact, description, status (new|handled).

---

## 11. API (`/api/v1`, Zod validated, JSON errors `{ error: { code, message } }`)

- `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `POST /auth/demo` (body `{ as: "student" | "admin" }`, only when `DEMO_MODE=true`)
- `GET /institutions` · `GET /institutions/:slug`
- `PATCH /me` · `PATCH /me/eid-status`
- `GET /journey` (phase, stage, battery, tasks with availability) · `PATCH /journey/tasks/:key`
- `GET /listings` (filters: institution, maxPriceAed, roomType, nearTransit, womenOnly, sort) · `GET /listings/:id` · `POST /listings/:id/viewing-requests` · `POST /me/saved-listings/:id`
- `GET /transit/network` (ETag, cached) · `GET /transit/route?from&to`
- `GET /essentials` · `GET /costs` · `GET /budget/me` · `PUT /budget/me` · `POST /budget/share` · `DELETE /budget/share` · `GET /share/:token`
- `GET /rates` (server fetches `https://open.er-api.com/v6/latest/AED` at most once per update window, stores it, serves the cached copy; the client never calls the provider)
- `GET /groups` · `POST /groups/:id/join` · `GET /events` · `POST /events/:id/rsvp`
- `POST /broker-reports`
- Admin (role guarded): `GET /admin/listings?status` · `PATCH /admin/listings/:id/verification` · CRUD `/admin/events` · CRUD `/admin/tasks` · `GET /admin/broker-reports` · `PATCH /admin/broker-reports/:id`
- `GET /health`

---

## 12. Offline first (the "Offline RTA transit maps" promise must be real)

- `vite-plugin-pwa`: precache the app shell, fonts, illustrations, `/offline/transit.json`, `/offline/essentials.json`. Runtime caching: listings and journey `StaleWhileRevalidate`, images `CacheFirst` with a cap, rates `NetworkFirst` falling back to the last copy.
- Dexie mirrors the user's journey, saved listings, budget and latest rates. Task changes made offline go into an outbox and sync on reconnect (Background Sync where supported, otherwise the `online` event). Show sync state calmly.
- Manifest: name "Wayfare", short name "Wayfare", `background_color #FEF5EC`, `theme_color #25265E`, icons generated from `assets/brand/favicon.svg`, `display: standalone`.
- Acceptance: with the network off in DevTools, Transit routes DXB Terminal 1 → the campus stations, Essentials opens, Journey can be ticked and syncs when back online.

---

## 13. Content and seed data

**Rules (brand don't + skill B8):** never invent stats, prices, reviews, partners or events. Every fact in seed data carries `source.url` and `source.checkedOn`. Unknown values stay `null` and the UI says so ("Ask for price"). Anything time sensitive also shows "Check the official site before you go". Write this list into the README as "Verify before the demo".

### 13.1 Verified facts to use (checked on 9 Nov 2026)

| Fact | Use it in | Source |
|---|---|---|
| 42,026 students at 41 private higher education institutions in Dubai, 2024–25; enrolment up 20%; international students 35% of the total, up 29% | Landing hero proof and Opportunity section | KHDA: https://web.khda.gov.ae/en/About-Us/Whats-New/Dubais-private-higher-education-sector-continues |
| Dubai aims for international students to be 50% of the student body by 2033 | Landing Opportunity | Dubai Media Office: https://www.mediaoffice.ae/en/news/2025/may/19-05/dubais-private-higher-education |
| Emirates ID card is delivered only after the residence is issued | EID card, Essentials | ICP: https://icp.gov.ae/en/media-center/filling-out-registration-form-precedes-medical-examination-emirates-id/ |
| Processing after biometrics can take two days up to two weeks | EID estimate copy | Gulf News: https://gulfnews.com/living-in-uae/visa-immigration/uae-how-long-does-it-take-to-get-your-emirates-id-after-the-medical-fitness-test-1.1688480502727 |
| New arrivals whose residency is in process can get a visitor or tourist line with a passport (e& Visitor Line, du Tourist plan) and convert it once the Emirates ID arrives; residents need an Emirates ID for regular lines | SIM task and service | Gulf News: https://gulfnews.com/living-in-uae/telephone-internet/new-to-the-uae--what-are-my-sim-card-options-1.1656337696506 |
| Maximum of two Visitor Line SIMs per passport | SIM service detail | GDGT ME: https://www.gdgtme.com/guides/how-to-register-a-new-sim-card-in-the-uae/ |
| Opening a personal account needs a residence visa and Emirates ID; most banks accept the Emirates ID application receipt once the visa is issued | Bank task | StashAway: https://www.stashaway.ae/r/complete-guide-opening-bank-account-uae |
| Ejari cannot be registered without the tenant's Emirates ID | Ejari task, listing note | Bayut: https://www.bayut.com/mybayut/ejari-faqs/ |
| Ejari online via Dubai Land Department costs AED 120 in government fees (100 + 10 + 10) | Budget item | wasl: https://www.wasl.ae/en/node/632 |
| Dubai Metro Red Line stops at DXB Terminal 1 and Terminal 3; Terminal 2 has no metro station | Transit preset and cards | Visit Dubai: https://visitdubai.com/cs/articles/guide-to-dubai-metro · Gulf News: https://gulfnews.com/living-in-uae/transport/uae-planning-to-use-the-metro-at-dubai-international-airport-dxb-all-you-need-to-know-about-the-timings-baggage-policy-and-routes-1.1681826461878 |
| Silver nol fares AED 3 (one zone), AED 5 (two zones), AED 7.50 (more than two zones) | Fare estimate | Reported from RTA's nol fare schedule; confirm at https://www.rta.ae |
| Student nol card: 50% off RTA bus, metro and tram; apply through the nol Pay app with an enrolment letter, a photo and a valid Emirates ID; age limits apply | Student nol task | Gulf News: https://gulfnews.com/living-in-uae/transport/how-uae-students-can-save-on-public-transport-discounts-passes-and-more-1.500039865 |
| Heriot-Watt University Dubai is in Dubai Knowledge Park, with metro and tram links nearby | Institution seed | https://hw.ac.uk/dubai/campus/the-dubai-campus |
| Exchange rates: open.er-api.com, no key, updated daily, attribution required | Rates service | https://www.exchangerate-api.com/docs/free |
| UAE emergency numbers: Police 999, Ambulance 998, Fire 997 | Essentials | Confirm on https://u.ae |

The poster says 20.6% annual growth; KHDA's own release says 20%. **Use 20%.**

### 13.2 Institution and listings seed
- Institution: Heriot-Watt University Dubai, Dubai Knowledge Park. Nearest transit (same study guide, confirm with the university): campus shuttle to Dubai Internet City metro station (Red Line), Knowledge Village tram stop within walking distance. Coordinates come from the transit import, not by hand. Email domain: `{{hw_email_domain}}`.
- Listings: create four **pending** listings for providers that a third party study guide names as working with Heriot-Watt Dubai (https://gostudyin.com/uk/study-in-dubai/institutes/universities/heriot-watt-dubai/): The Myriad Dubai, KSK Homes, Yugo Dubailand, Makaan. The university's accommodation office must confirm them. Prices `null`, photos empty, `verification.status = "pending"`. The team verifies them in the portal (or live in the demo). Coordinates come from the provider's published address, never guessed; if unknown, leave location empty and hide the transit chip.

### 13.3 Essentials seed (ServiceGuide)
Mobile SIM (Day Zero ready) · Transport card (Day Zero ready) · Emirates ID and residence visa (the steps in 9.2) · Bank account (after Emirates ID) · Housing, Ejari and DEWA (after Emirates ID) · Medical test and health insurance (with your university) · Emergency numbers (Day Zero ready).

### 13.4 Costs seed (CostItem)
Ejari online AED 120 (sourced) · Metro trip AED 3 / 5 / 7.50 (sourced) · Emirates ID card fee `null` with the ICP link (confirm the amount with the university) · Visitor SIM pack `null` (packs vary; link e& and du) · Rent, deposit (from the chosen verified listing) · Groceries, health insurance, other `null` (student enters).

### 13.5 Transit data
Write `server/scripts/import-transit.ts`:
1. Preferred: if `data/gtfs/rta_gtfs.zip` exists (the RTA GTFS feed from Dubai Pulse, dataset `rta_gtfs-open`, may need a Dubai Pulse access request), read `routes`, `stops`, `stop_times`, `trips` and fare zones.
2. Fallback: query the OpenStreetMap Overpass API for the Dubai Metro and Dubai Tram route relations (`route=subway`, `route=tram`) and take the ordered stop members and their coordinates. Credit "© OpenStreetMap contributors (ODbL)".
3. Write TransitStation and TransitLine documents and export `client/public/offline/transit.json`. Never hand type station coordinates.

### 13.6 Demo persona and accounts
Demo student "Aanya Mehta", Pune, India, home currency INR, starting at Heriot-Watt University Dubai, arriving 12 days after the demo date. Label the account "Demo student" in Me. Demo admin "Heriot-Watt Dubai housing office (demo)". Both come from `.env`, created by `npm run seed`, and only exist when `DEMO_MODE=true`. Indian students are the largest group of international students in Dubai, so this persona is representative; still never show invented testimonials from her.

---

## 14. Voice and copy deck

Voice (brand sheet section 02): **Warm, not chatty. Clear, not clever. Reassuring, not salesy.** Short sentences, one idea per line, plain words. Lead with reassurance and one clear next step. No exclamation marks. No banned filler words from skill B8.

| Moment | Copy |
|---|---|
| App tagline | Feel at home before you land. |
| Brand line | You're never alone here. |
| Locked task | Unlocks with your Emirates ID |
| EID waiting | Waiting for your Emirates ID. Most of Day Zero works with your passport. Here is what you can do today. |
| EID received toast | Emirates ID received. 5 tasks are ready. |
| Offline | You're offline. Your transit map still works. |
| Saved offline | Saved for offline |
| Price unknown | Ask for price |
| Verified | Verified by Heriot-Watt University Dubai |
| Not verified | Not verified yet |
| Before you pay | See the contract before you pay a deposit. |
| Budget rent prompt | Use the number from your offer letter. We never guess your rent. |
| Empty events | No events yet. Your university posts them here. |
| Load error | Could not load places to live. Check your connection and try again. |
| Journey complete | Fully charged. You're settled in. |
| Share link created | Link ready. Anyone with it can see this budget. You can turn it off in Me. |
| Closing line (landing) | Let's make every arrival a better beginning. · Wayfare. Study. Live. Belong. |

---

## 15. Accessibility, security, privacy

- WCAG 2.1 AA. All text pairs from 6.2. Touch targets at least 44px. Focus visible on every control (navy ring on cream, Sunshine ring on navy). Labels on all inputs. Semantic landmarks. Alt text on every meaningful image. Charts and the battery have text equivalents. Route steps are a list, not only a drawing.
- No passport or Emirates ID numbers, no document uploads, no precise live location storage. Location is used on device only for "near me".
- Share links are random 32 byte tokens, revocable, and show no contact details.
- Rate limit auth and report endpoints. Validate everything with Zod. Escape user content. Admin routes check role and institution.
- Wayfare is not a government service: say so in About and the FAQ, and always link official sources.

---

## 16. Testing and QA

- Unit: journey availability, phase and stage, battery maths, fare estimate, walk time, currency conversion, outbox sync.
- API: auth, journey, listings filters, verification flow, share links, admin guards.
- E2E (Playwright, 390 × 844): onboarding → home; mark task done → battery fills; open listing via zoom; go offline → route DXB Terminal 1 to campus; budget → share link opens family view; admin verifies a listing → student sees the badge. Run axe on every screen.
- Visual pass at 390px and 1280px: no horizontal overflow, primary action visible in the first screen, 60/25/15 colour balance, no pastel text on cream, no orphans.

---

## 17. Build order (stop for review after each phase)

**Phase 0 · Foundation**: monorepo, env, Express health route, Mongo connection, Vite app, Tailwind v4 with `tokens.css`, Poppins, brand components (Logo, Pin, StageChip, Battery, badges, buttons, chips, cards), PhoneFrame, tab bar with liquid glass, SSGOI wired with placeholder screens. *Done when* the five tabs slide, the frame shows on desktop, and a `/dev/kit` page shows every component in every state.

**Phase 1 · Story you can click**: seed script, demo login, Welcome, Set up, Home, Journey with availability logic and the battery, Essentials. *Done when* the demo student sees 12 days to go, a single next step, and locked Emirates ID tasks with bridges.

**Phase 2 · Housing and money**: listings, filters, detail with zoom, viewing request, rates service, Budget, share link, family view. *Done when* prices show in AED and INR with the rate date, and the share link opens without login.

**Phase 3 · Transit offline**: import script, schematic map, route planner, fare estimate, PWA and Dexie outbox. *Done when* the offline acceptance test in section 12 passes.

**Phase 4 · University integration and community**: admin portal, verification flow, events, groups, broker reports. *Done when* verifying a listing in the portal updates the student app within one refresh.

**Phase 5 · Landing page**: skill Part A outputs first, then sections in the order of 8.13, tagline reveal, SEO and ship list (B10). *Done when* the skill's quick checklist passes.

**Phase 6 · Polish**: signature moments (7.3), skeletons, empty and error states, reduced motion, axe clean, Lighthouse PWA and accessibility above 90, README with deploy steps (one Render or Railway service plus MongoDB Atlas).

---

## 18. Demo script for the stand (about 3 minutes)

1. Landing page on the laptop. Scroll to the tagline reveal, then "Open the app".
2. Try the demo as Aanya: Home shows 12 days to go, battery at the start, one next step.
3. Housing: a verified place, price in rupees, about 8 minutes to the metro.
4. Turn on airplane mode. Transit still routes DXB Terminal 1 to campus. "Offline RTA maps from Day Zero."
5. Budget: first month in INR, "Share with family", open the family view on a phone.
6. Switch to the university portal, verify a pending listing, back in the app the Sage badge appears.
7. Fast forward: set arrival to today (Arrive, lilac), then mark the Emirates ID received. Tasks unlock, the battery charges. "Fully charged by Wayfare."

Add a hidden presenter control in Me (only in demo mode) to shift the date and EID status for steps 7.

---

## 19. Definition of done

- [ ] Every screen follows the brand sheet; no gradients, no emoji icons, no pastel text on cream, one primary action per screen
- [ ] Named text styles only; spacing and radius from the scales; Phosphor icons at the agreed weights
- [ ] Stage colours consistent across app, landing page and portal
- [ ] Day Zero logic unit tested; Emirates ID unlocks and bridges work
- [ ] Offline acceptance test passes; sync outbox works
- [ ] Every fact has a source and a checked date; unknown prices show "Ask for price"
- [ ] Landing page passes the skill's quick checklist, including the tagline reveal and B10 ship list
- [ ] Full state set on every interactive element; skeletons not spinners
- [ ] axe clean, keyboard usable, reduced motion respected, 390px with no overflow
- [ ] README explains setup, seed, demo accounts, data sources, licences (OSM ODbL, Exchange Rate API attribution, ai-design-skills MIT) and the "Verify before the demo" list

## 20. Never do this

- Invent statistics, prices, reviews, testimonials, partners, events or coordinates
- Store passport or Emirates ID numbers, or accept document uploads
- Claim live government tracking or official status
- Use dark or neon themes, gradients, emoji icons or the brick mascot
- Put two primary actions on one screen
- Call the exchange rate provider from the client
- Ship placeholder Latin, dead links or `window.alert()`
