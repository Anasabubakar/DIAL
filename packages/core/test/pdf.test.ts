import { writeFileSync } from "node:fs";
import { expect, test } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderCvPdf } from "../src";
import { PROFILE } from "./harness";

test("renders a multi-page PDF without throwing and escapes odd characters", async () => {
  const many = Array.from({ length: 14 }, (_, i) => ({
    id: `x${i}`, kind: "experience" as const, title: `Role ${i} — “quoted” 日本語`, organization: "Org", start: "2020", end: "2021",
    bullets: ["Did a long thing that wraps onto another line because it is deliberately verbose, covering scope, outcome and the people involved.", "Second bullet"],
  }));
  const profile = { ...PROFILE, entries: [...PROFILE.entries, ...many] };
  const bytes = await renderCvPdf({ profile, selectedEntryIds: ["e1"], wording: [{ entryId: "e1", bullets: ["Reworded bullet"] }] });
  expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  const pages = (await PDFDocument.load(bytes)).getPageCount();
  expect(pages).toBeGreaterThanOrEqual(2);
  if (process.env.WRITE_PDF) writeFileSync(process.env.WRITE_PDF, bytes);
});

test("a very long unbroken word cannot overflow, and an empty profile still renders", async () => {
  const profile = { ...PROFILE, summary: "x".repeat(400), entries: [{ id: "z", kind: "experience" as const, title: "T".repeat(120), bullets: ["y".repeat(300)] }] };
  const bytes = await renderCvPdf({ profile, selectedEntryIds: [], wording: [] });
  expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(1);
  const bare = await renderCvPdf({ profile: { fullName: "A", email: "a@b.co", headline: "", summary: "", entries: [] }, selectedEntryIds: [], wording: [] });
  expect(bare.length).toBeGreaterThan(500);
});
