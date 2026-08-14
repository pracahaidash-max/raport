import { NextRequest, NextResponse } from "next/server";
import { launchBrowser } from "@/lib/browser";
import { assertPublicHost, scanUrl } from "@/lib/scan";
import { buildReportHtml, computeCounts, computeScore } from "@/lib/report";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const rawUrl = body?.url;

  if (!rawUrl || typeof rawUrl !== "string") {
    return NextResponse.json({ error: "Podaj adres URL" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy adres URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Dozwolone są tylko adresy http/https" }, { status: 400 });
  }

  try {
    await assertPublicHost(parsed.hostname);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const browser = await launchBrowser();
  const context = await browser.newContext();
  try {
    const violations = await scanUrl(context, parsed.toString());
    const counts = computeCounts(violations);
    const score = computeScore(counts);
    const html = buildReportHtml({ url: parsed.toString(), timestamp: new Date(), violations, counts, score });

    const pdfPage = await context.newPage();
    await pdfPage.setContent(html, { waitUntil: "networkidle" });
    const pdf = await pdfPage.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });
    await pdfPage.close();

    return NextResponse.json({
      score,
      counts,
      pdfBase64: Buffer.from(pdf).toString("base64"),
    });
  } catch (err) {
    return NextResponse.json({ error: `Skanowanie nie powiodło się: ${(err as Error).message}` }, { status: 500 });
  } finally {
    await context.close();
    await browser.close();
  }
}
