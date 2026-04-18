import Link from "next/link";

export default function NotFound() {
  return (
    <main className="entry-shell">
      <section className="entry-card">
        <span className="badge">Not found</span>
        <h1>That group or event does not exist.</h1>
        <p className="muted">Head back to your calendar and try a different invite or event.</p>
        <Link className="ghost-button back-link" href="/">
          Back to calendar
        </Link>
      </section>
    </main>
  );
}
