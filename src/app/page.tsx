import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateRange } from "@/lib/format";
import { createTrip } from "./actions";

export default async function HomePage() {
  const trips = await db.trip.findMany({
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { reservations: true } },
    },
  });

  return (
    <main>
      <header>
        <span className="badge">TripTrack</span>
        <h1>All your travel confirmations, organized by trip.</h1>
        <p>
          Create a trip, then add flights, hotels, reservations, and anything else
          you need to remember.
        </p>
      </header>

      <div className="section-title">
        <h2>New trip</h2>
      </div>
      <form className="form" action={createTrip}>
        <div>
          <label htmlFor="title">Trip title</label>
          <input id="title" name="title" placeholder="Tokyo work sprint" required />
        </div>
        <div>
          <label htmlFor="destination">Destination</label>
          <input id="destination" name="destination" placeholder="Tokyo, Japan" />
        </div>
        <div>
          <label htmlFor="startDate">Start date</label>
          <input id="startDate" name="startDate" type="date" />
        </div>
        <div>
          <label htmlFor="endDate">End date</label>
          <input id="endDate" name="endDate" type="date" />
        </div>
        <div className="span-2">
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" placeholder="Goals, reminders, links." />
        </div>
        <div>
          <label>&nbsp;</label>
          <button type="submit">Create trip</button>
        </div>
      </form>

      <div className="section-title">
        <h2>Upcoming trips</h2>
      </div>
      {trips.length === 0 ? (
        <div className="empty">No trips yet. Create your first one above.</div>
      ) : (
        <div className="card-grid">
          {trips.map((trip) => (
            <Link key={trip.id} className="card" href={`/trips/${trip.id}`}>
              <span className="badge">{trip.destination ?? "No destination"}</span>
              <div>
                <h3>{trip.title}</h3>
                <p>{formatDateRange(trip.startDate, trip.endDate) || "Dates TBD"}</p>
              </div>
              <p>{trip._count.reservations} reservations</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
