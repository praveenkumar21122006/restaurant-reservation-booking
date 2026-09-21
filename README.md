# Ember & Oak — Restaurant Reservation System

A premium, responsive **Single Page Application (SPA)** for restaurant table bookings. Separate flows for **Guests** and **Restaurant Admins**, with real-time availability, 2-hour table holds, double-booking prevention, and LocalStorage persistence.

**Live:**

- Vercel: https://restaurant-reservation-praveenkumar21122006s-projects.vercel.app
- GitHub Pages: https://praveenkumar21122006.github.io/restaurant-reservation-booking/
- Repo: https://github.com/praveenkumar21122006/restaurant-reservation-booking

---

## Features

### Guest / Customer

- **Landing page** — branding, dynamic operating hours (per weekday), open/closed badge, `Book a Table` CTA
- **4-step booking wizard**
  1. Party size 1–12 (10+); auto-combines adjacent tables if `party > 6`
  2. Date & time picker — past dates blocked, slots every 30 min within operating hours
  3. Real-time availability — live check, closest-fit table suggestion, alternative slots when full
  4. Guest details — first/last name, email, phone (validated), notes (occasion/dietary)
- **Confirmation page** — unique code `EO-XXXXXX`, 2-hour hold summary, Modify / Cancel

### Restaurant Admin

- **Live floor plan** — 12 tables (2-top / 4-top / 6-top / Booth / Round) across Main Hall / Patio / Booth Row; color-coded Available / Reserved / Occupied; click for detail; drag ledger row onto table to reassign
- **Reservation ledger** — searchable (name/code/phone), filter by date/status, sort by datetime/name/party, quick filters (Today/Upcoming/Past)
- **Quick actions** — walk-in, check-in, complete, cancel, change table (dropdown + drag-and-drop)
- **Analytics banner** — Total Reservations Today, Expected Guests, Peak Booking Hour, No-Show/Cancel Rate

### System Rules

- **No double-booking** — table blocked within ±120 min window (`overlaps()` guard on confirm/walk-in/reassign)
- **Table combining** — smallest single fit first, else adjacent-pair/triple search, else greedy adjacent chain
- **Validation** — email regex, phone ≥7 digits, names required, party ≥1
- **Statuses** — `Pending` → `Confirmed` → `Checked-In` → `Completed` / `Cancelled`
- **Persistence** — `localStorage` keys `rrs_reservations_v1` / `rrs_tables_v1`; seeded demo data on first load

---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS, SPA with view router (`#view-*`), Tailwind CDN, Playfair Display + Inter, mobile-first responsive grids
- **State:** In-memory + LocalStorage mock API layer (`app.js` ~480 lines)
- **No build step** — static site; `vercel.json` rewrites `/(.*)` → `/index.html` for SPA routing

## Project Structure

```
.
├── index.html  # SPA shell + all views
├── app.js      # state, availability engine, wizard, floor, ledger
├── styles.css  # warm neutrals, status pills, slots, table cards
├── vercel.json # SPA rewrite
└── .gitignore  # .vercel
```

## Local Development

```bash
# from project root
python3 -m http.server 8000
# open http://localhost:8000/index.html
# or
npx serve .
```

No install, no env vars. Data lives in browser LocalStorage — clear site data to reset, or use Admin → `↺ Reset demo data`.

## Operating Hours (config in `app.js`)

```
Sun 10:00–21:00, Mon–Thu 11:00–22:00, Fri–Sat 11:00–23:00
Hold: 120 min per booking
Slots: :00 / :30
```

## Deployment

- **Vercel:** `vercel --prod` (project `restaurant-reservation` in `praveenkumar21122006s-projects`)
- **GitHub Pages:** source `main` / root (enabled via API)

---

Built mobile-first with warm neutrals, crisp typography, and functional icons.
