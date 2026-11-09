# Decisions

Short records of choices not fixed by PROMPT.md. Date of all entries: 9 Nov 2026.

**D-001 Palette.** The brand sheet in `reference/wayfare-brand-guidelines.png` was replaced by the Paper White #FFFFFF / Ink Black #050505 / Cornflower Blue #548CFF sheet, and the user asked for it. Roles: cream → paper (background), navy → ink (text, outlines, panels), sunshine as highlight and click accent → cornflower. The four pastels stay **only** as stage and status meaning (Prepare, Arrive, Settle, Verified) because the journey depends on telling stages apart. White on cornflower is 3.2:1, so cornflower buttons carry ink labels (6.4:1). All tokens live in `client/src/styles/tokens.css`; dropping the pastels is a four line change. The kit's `assets/` stay untouched; recoloured copies of the SVGs and illustrations (navy → ink) are in `client/public/`. *Alternatives:* a strict three colour UI (stages become indistinguishable), keeping the old palette (ignores the request).

**D-002 Desktop layout.** First built as the spec says (the app inside a phone frame on wide screens). The user asked for a real website layout instead, so from 768px the app uses an ink sidebar and multi column grids, and the floating tab bar is phone only. The landing page keeps the live app in a phone frame as a hero product shot.

**D-003 Day Zero logic in `packages/shared`.** `buildJourney`, availability, battery and next step are pure functions shared by the server and the offline client, so a task ticked offline recomputes the battery exactly as the server will. `server/src/services/journey.ts` loads data and re-exports them. Tests: `packages/shared/test/journey.test.ts`.

**D-004 Requirements.** `passport` and `enrolment_letter` count as met for every student (no documents are collected). `entry_permit` from `entry_permit_issued`, `residence_issued` from `residence_issued`, `emirates_id` at `card_received`, `ejari` when the Ejari task is done. Days are counted in Dubai time (UTC+4). Next step: earliest open available task, earlier phases first.

**D-005 Institution overrides.** An admin edit to a global task creates an institution copy with the same key; deleting the copy reverts. Admins edit wording, steps, links, where and bridge, not requirements, so the Emirates ID logic cannot be broken from the portal.

**D-006 Prices only after verification.** The API hides prices on pending listings (students see "Ask for price"); the portal shows them. Verification may also record the nearest station, walk minutes and campus distance, entered by staff from the provider's published address, because coordinates must never be guessed. Seeded listings have no location.

**D-007 Transit import.** OpenStreetMap relations Red1 (Expo City Dubai branch), Red2 (Life Pharmacy branch), Green and Tram, one direction each; the tram loop is cut at its first repeated stop. Same named metro platforms merge into one station. Metro to tram walking links are derived for stations within 450 m (found: DMCC ↔ Jumeirah Lakes Towers, Sobha Realty ↔ Dubai Marina). The tram has no colour in OSM or Wikidata, so it draws in Ink. Times use distance at 45 km/h metro and 18 km/h tram plus dwell, labelled "about". OSM has no fare zones, so fares show the AED 3 to 7.50 range; GTFS `zone_id` switches on zone fares. The schematic map is rotated onto the network's principal axis (PCA).

**D-008 Offline.** Precached: app shell, fonts, illustrations, `offline/transit.json`, `offline/essentials.json`. Route planning always runs on the device. Dexie mirrors me, journey, listings, budget, rates and events. Task changes made offline go to a Dexie outbox (`networkMode: 'always'` on the mutation, otherwise TanStack pauses it in memory) and flush on the `online` event and on app start. Background Sync would need a custom service worker (injectManifest) and is left for later.

**D-009 Sheets.** Filters, Share with family and Emirates ID status are vaul bottom sheets, not routes, so the SSGOI `sheet()` rule is not needed; the sheet motion comes from vaul. SSGOI handles slide (tabs, set up), drill (journey, essentials), zoom (housing) and fade. Under reduced motion every SSGOI rule is `fade()`.

**D-010 Budget totals.** Totals add the student's numbers, rent and deposit from the chosen verified listing (lowest room price and deposit), and sourced one off fees (Ejari AED 120). The metro fare is a price per trip, so it is shown with its source but left out of totals unless the student types an amount.

**D-011 Server runtime.** The server runs TypeScript through tsx in development and production (no separate compile step) so the shared package can be consumed as source. Fine for one small service; switch to a bundle if cold start matters.

**D-012 Share token index.** `shareToken` uses a partial unique index on string values. A sparse index still indexes explicit nulls and blocked every second budget (caught in dev, covered by a test now). `syncIndexes()` runs on start and seed.

**D-013 Rate limits.** Auth: 30 per 15 minutes in production, relaxed outside production for rehearsals and E2E. Reports: 10 per hour. Writes: 120 per minute.

**D-014 Community.** University group joining checks the email domain from `HW_EMAIL_DOMAIN` (no verification email loop yet). Members can post; posts can be reported and moderated in the portal. No direct messages. No seeded posts or events, so nothing is invented.
