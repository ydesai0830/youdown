import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <header>
        <span className="badge">Not found</span>
        <h1>That trip does not exist.</h1>
        <p>Head back to the trip list and create a new one.</p>
      </header>
      <Link className="back-link" href="/">
        &lt; Back to trips
      </Link>
    </main>
  );
}
