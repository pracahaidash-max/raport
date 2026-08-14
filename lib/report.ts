import type { AxeViolation } from "./scan";

export interface Counts {
  critical: number;
  serious: number;
  minor: number;
}

export function computeCounts(violations: AxeViolation[]): Counts {
  const counts: Counts = { critical: 0, serious: 0, minor: 0 };
  for (const v of violations) {
    if (v.impact === "critical") counts.critical += v.nodes.length;
    else if (v.impact === "serious") counts.serious += v.nodes.length;
    else counts.minor += v.nodes.length;
  }
  return counts;
}

export function computeScore(counts: Counts): number {
  const raw = 100 - counts.critical * 8 - counts.serious * 4 - counts.minor * 1;
  return Math.max(0, Math.min(100, raw));
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const IMPACT_LABEL: Record<string, string> = {
  critical: "KRYTYCZNE",
  serious: "POWAŻNE",
  moderate: "DROBNE",
  minor: "DROBNE",
};

const IMPACT_COLOR: Record<string, string> = {
  critical: "#b91c1c",
  serious: "#c2650a",
  moderate: "#a68a0d",
  minor: "#a68a0d",
};

function formatWcagTags(tags: string[]): string {
  return tags
    .map((t) => {
      const m = /^wcag(\d)(\d)(\d)$/.exec(t);
      return m ? `WCAG ${m[1]}.${m[2]}.${m[3]}` : null;
    })
    .filter((t): t is string => t !== null)
    .join(", ");
}

function sortByImpact(violations: AxeViolation[]): AxeViolation[] {
  const rank: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  return [...violations].sort((a, b) => (rank[a.impact ?? "minor"] ?? 4) - (rank[b.impact ?? "minor"] ?? 4));
}

export function buildReportHtml(params: {
  url: string;
  timestamp: Date;
  violations: AxeViolation[];
  counts: Counts;
  score: number;
}): string {
  const { url, timestamp, violations, counts, score } = params;
  const sorted = sortByImpact(violations);
  const dateStr = timestamp.toLocaleDateString("pl-PL");

  const sections = sorted
    .map((v, i) => {
      const impact = v.impact ?? "minor";
      const label = IMPACT_LABEL[impact] ?? "DROBNE";
      const color = IMPACT_COLOR[impact] ?? "#a68a0d";
      const wcagTags = formatWcagTags(v.tags);

      const nodes = v.nodes
        .slice(0, 5)
        .map(
          (n) => `
        <div class="node">
          <div class="node-selector">${escapeHtml(n.target.join(" "))}</div>
          <pre class="node-html">${escapeHtml(n.html)}</pre>
          ${n.failureSummary ? `<p class="failure">${escapeHtml(n.failureSummary)}</p>` : ""}
        </div>`
        )
        .join("");

      const more = v.nodes.length > 5 ? `<p class="more">…i ${v.nodes.length - 5} więcej wystąpień tego samego problemu.</p>` : "";

      return `
      <section class="violation">
        <div class="violation-head">
          <span class="badge" style="background:${color}">#${i + 1} ${label}</span>
          <span class="rule-id">${escapeHtml(v.id)}</span>
          ${wcagTags ? `<span class="wcag-tags">${escapeHtml(wcagTags)}</span>` : ""}
        </div>
        <p class="help"><strong>${escapeHtml(v.help)}.</strong> ${escapeHtml(v.description)}</p>
        <p class="help-url"><a href="${escapeHtml(v.helpUrl)}">${escapeHtml(v.helpUrl)}</a></p>
        ${nodes}
        ${more}
      </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px 40px; font-size: 13px; line-height: 1.5; }
  .banner { background: #b91c1c; color: #fff; font-weight: 700; font-size: 11px; letter-spacing: 0.04em; padding: 6px 12px; margin-bottom: 24px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .subtitle { color: #555; margin: 0 0 20px; }
  table.meta { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  table.meta td { padding: 6px 0; border-bottom: 1px solid #eee; vertical-align: top; }
  table.meta td:first-child { width: 160px; color: #666; }
  .scorebar { display: flex; gap: 8px; margin-bottom: 20px; }
  .scorebar > div { flex: 1; padding: 14px; color: #fff; }
  .score-total { background: #333; }
  .score-critical { background: #b91c1c; }
  .score-serious { background: #c2650a; }
  .score-minor { background: #a68a0d; }
  .scorebar .num { font-size: 24px; font-weight: 700; display: block; }
  .scorebar .label { font-size: 10px; letter-spacing: 0.04em; }
  .violation { border: 1px solid #e5e5e5; border-radius: 4px; padding: 14px 16px; margin-bottom: 14px; page-break-inside: avoid; }
  .violation-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
  .badge { color: #fff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 3px; }
  .rule-id { font-family: monospace; font-size: 12px; color: #333; }
  .wcag-tags { font-size: 10px; color: #888; }
  .help { margin: 6px 0; }
  .help-url { margin: 0 0 8px; font-size: 11px; }
  .help-url a { color: #555; }
  .node { background: #fafafa; border-left: 3px solid #ddd; padding: 8px 10px; margin-top: 8px; }
  .node-selector { font-family: monospace; font-size: 10px; color: #777; margin-bottom: 4px; }
  .node-html { font-family: monospace; font-size: 11px; white-space: pre-wrap; word-break: break-all; margin: 0 0 4px; }
  .failure { font-size: 11px; color: #444; margin: 0; white-space: pre-wrap; }
  .more { font-size: 11px; color: #888; font-style: italic; }
  .disclaimer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #999; }
</style>
</head>
<body>
  <div class="banner">RAPORT WYGENEROWANY AUTOMATYCZNIE — BEZ RĘCZNEJ WERYFIKACJI</div>
  <h1>Raport zgodności z dostępnością cyfrową</h1>
  <p class="subtitle">Audyt WCAG 2.1 AA w kontekście European Accessibility Act (EAA)</p>
  <table class="meta">
    <tr><td>Adres URL</td><td>${escapeHtml(url)}</td></tr>
    <tr><td>Zakres audytu</td><td>Jedna strona (URL powyżej)</td></tr>
    <tr><td>Metodologia</td><td>Skan automatyczny (Playwright + axe-core), bez ręcznej weryfikacji</td></tr>
    <tr><td>Standard</td><td>WCAG 2.1, zgodnie z wymogami EAA (obowiązuje od 06.2025)</td></tr>
    <tr><td>Data audytu</td><td>${dateStr}</td></tr>
  </table>
  <div class="scorebar">
    <div class="score-total"><span class="num">${score}/100</span><span class="label">WYNIK ZGODNOŚCI</span></div>
    <div class="score-critical"><span class="num">${counts.critical}</span><span class="label">KRYTYCZNE</span></div>
    <div class="score-serious"><span class="num">${counts.serious}</span><span class="label">POWAŻNE</span></div>
    <div class="score-minor"><span class="num">${counts.minor}</span><span class="label">DROBNE</span></div>
  </div>
  <h2>Szczegółowe naruszenia</h2>
  ${sections || "<p>Nie wykryto naruszeń automatycznie wykrywalnych przez axe-core.</p>"}
  <p class="disclaimer">
    Ten raport jest wygenerowany w 100% automatycznie (axe-core). Automatyczne skanery wykrywają ok. 30-50%
    typów naruszeń WCAG i mogą zawierać false positives — przed wysłaniem klientowi zalecana jest ręczna
    weryfikacja pozycji oznaczonych jako KRYTYCZNE i POWAŻNE.
  </p>
</body>
</html>`;
}
