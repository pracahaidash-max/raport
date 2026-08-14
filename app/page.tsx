"use client";

import { useState, type FormEvent } from "react";

interface AuditResult {
  score: number;
  counts: { critical: number; serious: number; minor: number };
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Skanowanie nie powiodło się");

      setResult({ score: data.score, counts: data.counts });

      const bytes = Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `raport-dostepnosci-${new URL(url).hostname}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-bold">
            A
          </span>
          <span className="font-semibold tracking-tight">Accessibility Compliance Radar</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-3">
          Audyt WCAG 2.1 AA · European Accessibility Act
        </p>
        <h1 className="text-4xl font-bold tracking-tight leading-tight mb-4">
          Wklej link.
          <br />
          Odbierz raport zgodności.
        </h1>
        <p className="text-foreground/60 mb-8 max-w-md">
          Automatyczny skan strony silnikiem axe-core (Playwright) i gotowy PDF z priorytetyzacją naruszeń —
          w kilkanaście sekund.
        </p>

        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-2 flex gap-2 shadow-sm">
          <input
            type="url"
            required
            placeholder="https://przyklad.pl"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-transparent focus:outline-none placeholder:text-foreground/35"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 bg-accent text-accent-foreground text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-opacity"
          >
            {loading ? "Skanuję…" : "Audytuj"}
          </button>
        </form>

        {error && (
          <p role="alert" className="text-critical text-sm mt-4">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-8 grid grid-cols-4 gap-2">
            <ScoreTile label="Wynik" value={`${result.score}`} tone="dark" />
            <ScoreTile label="Krytyczne" value={String(result.counts.critical)} tone="critical" />
            <ScoreTile label="Poważne" value={String(result.counts.serious)} tone="serious" />
            <ScoreTile label="Drobne" value={String(result.counts.minor)} tone="minor" />
          </div>
        )}
        {result && <p className="text-xs text-foreground/45 mt-3">PDF pobrany automatycznie do folderu Downloads.</p>}
      </main>

      <footer className="border-t border-border">
        <div className="max-w-2xl mx-auto px-6 py-6 text-xs text-foreground/45">
          Raport jest generowany w 100% automatycznie — przed wysłaniem klientowi zalecana ręczna weryfikacja
          pozycji krytycznych i poważnych.
        </div>
      </footer>
    </div>
  );
}

function ScoreTile({ label, value, tone }: { label: string; value: string; tone: "dark" | "critical" | "serious" | "minor" }) {
  const bg = {
    dark: "bg-[#16161a]",
    critical: "bg-critical",
    serious: "bg-serious",
    minor: "bg-minor",
  }[tone];

  return (
    <div className={`${bg} text-white rounded-lg px-3 py-3`}>
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-80 mt-1.5">{label}</div>
    </div>
  );
}
