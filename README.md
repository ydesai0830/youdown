<<<<<<< HEAD
# triptrack
=======
# TripTrack

A lightweight travel organizer that groups all confirmations by trip.

## Local setup
1. Install Node.js 20+.
2. Install dependencies.
3. Create the database.
4. Run the dev server.

```bash
cd /Users/ydesai/code/triptrack
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Open http://localhost:3000.

## Environment
Create `.env` with:

```
DATABASE_URL="file:./prisma/dev.db"
```

## Next steps
- Add edit/delete flows.
- Add upload for confirmations.
- Add email ingestion (Gmail API + cron).
>>>>>>> 6cbd172 (Initial TripTrack MVP)
