# YouDown

YouDown is a group-first social calendar. Users create or join a group by invite code, then land directly in that group’s week view to propose plans and respond with `Interested`, `Down`, or `Out`.

## What it does
- Creates a lightweight local profile with just a name.
- Lets users create a group or join one with an invite code.
- Shows one active group calendar at a time with a top-bar switcher.
- Supports previous/current/next week navigation in the calendar.
- Supports tap-to-create and drag-to-create event proposals on the week calendar.
- Lets each event carry multiple custom tags instead of fixed categories.
- Opens event details in a right drawer with one-tap RSVP chips and optional notes.

## Local setup
```bash
cd /Users/ydesai/code/youdown
npm install
cp .env.example .env
npx prisma generate
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) or the next available port shown by Next.js.

## Dev reset
If Next.js gets stuck with stale hot-reload chunks or missing module errors, run:

```bash
cd /Users/ydesai/code/youdown
npm run dev:restart
```

This script:
- kills whatever is currently listening on port `3000`
- deletes `.next`
- restarts YouDown cleanly on `3000`

## Environment
Create `.env` with:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```
