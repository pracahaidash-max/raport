import dns from "node:dns/promises";
import type { BrowserContext } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";

export interface AxeNode {
  html: string;
  target: string[];
  failureSummary?: string;
}

export interface AxeViolation {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical" | null;
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: AxeNode[];
}

export async function assertPublicHost(hostname: string) {
  const { address } = await dns.lookup(hostname);
  const isPrivateV4 =
    address === "0.0.0.0" ||
    address.startsWith("127.") ||
    address.startsWith("10.") ||
    address.startsWith("192.168.") ||
    address.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address);
  const isPrivateV6 = address === "::1" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80");
  if (isPrivateV4 || isPrivateV6) {
    throw new Error("Adres prywatny/wewnętrzny jest zablokowany");
  }
}

export async function scanUrl(context: BrowserContext, url: string): Promise<AxeViolation[]> {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    return results.violations as AxeViolation[];
  } finally {
    await page.close();
  }
}
