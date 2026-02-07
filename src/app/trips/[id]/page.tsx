import Link from "next/link";
import { notFound } from "next/navigation";
import { createReservation } from "@/app/actions";
import { db } from "@/lib/db";
import { formatDateRange } from "@/lib/format";

const reservationTypes = [
  "FLIGHT",
  "HOTEL",
  "CAR",
  "RAIL",
  "RESTAURANT",
  "ACTIVITY",
  "OTHER",
] as const;

export default async function TripPage({
  params,
}: {
  params: { id: string };
}) {
  const trip = await db.trip.findUnique({
    where: { id: params.id },
    include: { reservations: { orderBy: [{ startAt: "asc" }, { createdAt: "desc" }] } },
  });

  if (!trip) {
    notFound();
  }

  return (
    <main>
      <Link className="back-link" href="/">
        &lt; Back to trips
      </Link>

      <header>
        <span className="badge">{trip.destination ?? "Trip"}</span>
        <h1>{trip.title}</h1>
        <p>{formatDateRange(trip.startDate, trip.endDate) || "Dates TBD"}</p>
      </header>

      <div className="section-title">
        <h2>Add reservation</h2>
      </div>
      <form className="form" action={createReservation}>
        <input type="hidden" name="tripId" value={trip.id} />
        <div>
          <label htmlFor="type">Type</label>
          <select id="type" name="type" required defaultValue="FLIGHT">
            {reservationTypes.map((type) => (
              <option key={type} value={type}>
                {type.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" placeholder="Delta DL184" required />
        </div>
        <div>
          <label htmlFor="provider">Provider</label>
          <input id="provider" name="provider" placeholder="Delta" />
        </div>
        <div>
          <label htmlFor="confirmationNumber">Confirmation #</label>
          <input id="confirmationNumber" name="confirmationNumber" placeholder="H8R2LK" />
        </div>
        <div>
          <label htmlFor="startAt">Start</label>
          <input id="startAt" name="startAt" type="datetime-local" />
        </div>
        <div>
          <label htmlFor="endAt">End</label>
          <input id="endAt" name="endAt" type="datetime-local" />
        </div>
        <div className="span-2">
          <label htmlFor="location">Location</label>
          <input id="location" name="location" placeholder="JFK -> SFO" />
        </div>
        <div className="span-2">
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" placeholder="Gate info, seat, check-in time." />
        </div>
        <div>
          <label>&nbsp;</label>
          <button type="submit">Add reservation</button>
        </div>
      </form>

      <div className="section-title">
        <h2>Reservations</h2>
      </div>
      {trip.reservations.length === 0 ? (
        <div className="empty">No reservations yet for this trip.</div>
      ) : (
        <div className="list">
          {trip.reservations.map((reservation) => (
            <div key={reservation.id} className="list-item">
              <span className="badge">{reservation.type.toLowerCase()}</span>
              <h4>{reservation.title}</h4>
              <small>
                {formatDateRange(reservation.startAt, reservation.endAt) || "Time TBD"}
              </small>
              {reservation.location ? <div>{reservation.location}</div> : null}
              {reservation.provider ? <div>Provider: {reservation.provider}</div> : null}
              {reservation.confirmationNumber ? (
                <div>Confirmation: {reservation.confirmationNumber}</div>
              ) : null}
              {reservation.notes ? <div>{reservation.notes}</div> : null}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
