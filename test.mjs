import assert from "node:assert/strict";
import { parseNotices } from "./prepare-feed.mjs";
import { calculate, rank } from "./model.mjs";
const baseline = { investment: 50000, customers: 90, spend: 8.5, days: 26, variable: 35, fixed: 8500 };
const model = calculate(baseline);
assert.equal(model.revenue, 19890);
assert.equal(model.profit, 4428.5);
assert.equal(model.breakEven, 60);
assert.equal(model.payback, 50000 / 4428.5);
assert.equal(model.annualRoi, 4428.5 * 12 / 50000);
assert.equal(calculate({ ...baseline, customers: 0 }).margin, null);
assert.equal(calculate({ ...baseline, variable: 100 }).breakEven, null);
assert.equal(calculate({ ...baseline, variable: 100 }).payback, null);
assert.equal(calculate({ ...baseline, investment: 0 }).annualRoi, null);
assert.equal(calculate({ ...baseline, investment: 0 }).payback, 0);
assert.equal(calculate({ ...baseline, spend: NaN }), null);
assert.equal(calculate({ ...baseline, days: 32 }), null);
assert.equal(calculate({ ...baseline, customers: 1.5 }), null);
assert.deepEqual(rank("coffee", 10000), []);
assert.equal(rank("coffee", 50000, "  Dundrum ")[0].cost, 50000);
assert.equal(rank("food", 50000, "Dundrum").length, 0);
for (const category of ["coffee", "food", "fitness", "retail"]) {
  const ranked = rank(category, 250000);
  assert.equal(ranked.length, 8);
  assert.ok(ranked.every((area, index) => area.score >= 0 && area.score <= 100 && (!index || ranked[index - 1].score >= area.score)));
}
console.log("Passed ranking, category, budget, search and finance checks.");

const card = (title, operator, start, end = "") => `<div id="service-update-heading-1"><h2>${title}</h2>${operator}<div class="validity-dates"><time datetime="${start}"></time>${end ? `<time datetime="${end}"></time>` : ""}</div></div>`;
const now = Date.parse("2026-11-24T12:00:00Z");
assert.deepEqual(parseNotices(card("Luas delays &amp; diversions", "", "2026-11-24T08:00:00Z"), now), [{title:"Luas delays & diversions",operator:""}]);
assert.deepEqual(parseNotices(card("Diversion", "Dublin Bus", "2026-11-20T08:00:00Z", "2026-11-22T08:00:00Z"), now), []);
assert.deepEqual(parseNotices(card("Diversion", "Dublin Bus", "2026-11-25T08:00:00Z"), now), []);
assert.deepEqual(parseNotices(card("Ennis diversion", "City Direct", "2026-11-23T08:00:00Z"), now), []);
assert.throws(() => parseNotices("<html>bad response</html>", now));
console.log("Passed transit parsing, date filtering and failure checks.");
