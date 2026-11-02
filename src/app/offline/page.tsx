import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <div className="offline-card">
        <span className="offline-mark" aria-hidden="true">↗</span>
        <p className="eyebrow">INVSTOCK · OFFLINE</p>
        <h1>You’re currently offline</h1>
        <p>Your saved simulator data stays on this device. Reconnect to refresh the application and receive the latest updates.</p>
        <Link href="/">Try again</Link>
      </div>
    </main>
  );
}
