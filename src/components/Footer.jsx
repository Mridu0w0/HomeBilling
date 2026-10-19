// src/components/Footer.jsx
export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 sm:flex-row">
        <p>© 2026 HomeBilling. Simple shared property accounting.</p>
        <div className="flex gap-4">
          <span>5+ Owner Split</span>
          <span>•</span>
          <span>Automated Recurring</span>
          <span>•</span>
          <span>Transparent Ledgers</span>
        </div>
      </div>
    </footer>
  );
}
