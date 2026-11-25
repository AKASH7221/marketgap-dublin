import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const source = "https://www.transportforireland.ie/plan-a-journey/service-updates/";
const entities = { amp: "&", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’" };
function plain(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, key) => {
    if (!key.startsWith("#")) return entities[key] ?? match;
    const code = key.startsWith("#x") ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return code <= 0x10ffff ? String.fromCodePoint(code) : match;
  }).replace(/\s+/g, " ").trim();
}

export function parseNotices(html, now = Date.now()) {
  const cards = html.split(/\bid=["']service-update-heading-\d+["'][^>]*>/i).slice(1);
  if (!cards.length) throw Error("TFI service notice markup was not found.");
  const parsed = cards.map(card => {
    const heading = card.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    const validity = card.match(/class=["'][^"']*\bvalidity-dates\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (!heading || !validity) return null;
    const operator = plain(card.slice(heading.index + heading[0].length, validity.index).replace(/<div\b[^<>]*$/i, ""));
    const times = [...validity[1].matchAll(/<time\b[^>]*\bdatetime=["']([^"']+)["']/gi)].map(match => Date.parse(match[1]));
    return { title: plain(heading[1]), operator, start: times[0], end: times[1] };
  }).filter(Boolean);
  if (!parsed.length || parsed.length < cards.length * 0.8) throw Error("TFI service notice format changed.");
  const unique = new Map();
  for (const entry of parsed) {
    const dublin = /\b(dublin bus|go-ahead ireland \(dublin|luas|dart)\b/i.test(entry.operator)
      || /\b(luas|dart|dublin|red line|green line)\b/i.test(entry.title);
    if (!dublin || !entry.title || !Number.isFinite(entry.start) || entry.start > now
        || (Number.isFinite(entry.end) && entry.end < now)) continue;
    unique.set(entry.title, { title: entry.title, operator: entry.operator });
  }
  return [...unique.values()].slice(0, 12);
}

async function main() {
  const output = process.argv[2];
  if (!output) throw Error("Provide an output JSON path.");
  const response = await fetch(source, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw Error("TFI returned HTTP " + response.status);
  const now = Date.now();
  const notices = parseNotices(await response.text(), now);
  await writeFile(output, JSON.stringify({ checkedAt: new Date(now).toISOString(), notices }) + "\n");
  console.log("Prepared " + notices.length + " Dublin-related notices.");
}
if (typeof process !== "undefined" && process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
